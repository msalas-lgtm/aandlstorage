"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { adminConfigured, checkAdminLogin, currentAdmin, endSession, generatePassword, requireAdmin, startSession } from "@/lib/admin/auth";
import { CONTENT_TAG, type HoursRow, type SiteSettings } from "@/lib/content";
import { IMAGE_BUCKET, db } from "@/lib/db";
import { entityFor, parseEntity } from "@/lib/admin/entities";
import { addCharge, applyPayment, voidCharge } from "@/lib/billing";
import { applyLateFees, runRentBilling } from "@/lib/billing-run";
import { hashPassword, passwordProblem } from "@/lib/tenant/password";

export type ActionState = { status: "idle" | "ok" | "error"; message: string };
const ok = (message: string): ActionState => ({ status: "ok", message });
const fail = (message: string): ActionState => ({ status: "error", message });

const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
};

// Refresh every public page after a content change (the "content" tag covers all cached reads).
function publish() {
  updateTag(CONTENT_TAG);
  revalidatePath("/", "layout");
  // The RSS feeds and sitemap are route handlers, so they are refreshed by their own paths.
  for (const route of ["/blog", "/blog.rss", "/sitemap.xml"]) revalidatePath(route);
}

/* ---------- Session ---------- */

export async function loginAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  if (!adminConfigured()) {
    return fail("Admin login is not set up. Add ADMIN_SECRET (32+ characters) to .env.local.");
  }
  const result = await checkAdminLogin(text(data, "email"), String(data.get("password") ?? ""));
  if (!result.ok) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return fail(result.message);
  }
  await startSession(result.subject);
  const next = text(data, "next");
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin/reports/dashboard");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

/* ---------- Website > Pages ---------- */

export async function savePageAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const path = text(data, "path");
  const title = text(data, "title");
  if (!title) return fail("Please include a page title.");

  const update: Record<string, unknown> = {
    title,
    description: text(data, "description"),
    tab_visible: text(data, "tabVisible") !== "hide",
    updated_at: new Date().toISOString(),
  };
  if (text(data, "tabName")) update.tab_name = text(data, "tabName");
  if (path === "/pages/rent") {
    update.footer_link_text = text(data, "footerLinkText");
    update.login_link_text = text(data, "loginLinkText");
    const steps = String(data.get("c_steps") ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
    if (!steps.length) return fail("Please include at least one step.");
    const why = [0, 1, 2]
      .map((i) => ({ title: text(data, `c_why_${i}_title`), html: String(data.get(`c_why_${i}_html`) ?? "").trim() }))
      .filter((block) => block.title);
    update.content = {
      bannerTitle: text(data, "c_bannerTitle"),
      steps,
      heading: text(data, "c_heading"),
      introHtml: String(data.get("c_introHtml") ?? "").trim(),
      whyHeading: text(data, "c_whyHeading"),
      why,
    };
  }

  const { data: rows, error } = await db().from("pages").update(update).eq("path", path).select("path");
  if (error) return fail(`Couldn't save the page: ${error.message}`);
  if (!rows?.length) return fail("That page no longer exists.");
  publish();
  return ok("Page saved. The public site is updated.");
}

/* ---------- Website > Blog ---------- */

const SLUG = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

// Posts are stored at noon Eastern (17:00 UTC) so the date never shifts across time zones.
const publishedAt = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 17, 0, 0)).toISOString();
};

export async function savePostAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const original = text(data, "originalSlug");
  const slug = original || text(data, "slug");
  const title = text(data, "title");
  const html = String(data.get("html") ?? "").trim();
  const published = text(data, "publishedOn");

  if (!title) return fail("Please include a title.");
  if (!SLUG.test(slug)) return fail("The URL slug may only use letters, numbers, hyphens and underscores.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(published)) return fail("Please choose a published date.");
  if (!html) return fail("Please add the post body.");

  const { data: existing, error: lookup } = await db()
    .from("blog_posts")
    .select("slug,published_at")
    .eq("slug", slug)
    .maybeSingle();
  if (lookup) return fail(`Couldn't check the post: ${lookup.message}`);
  if (!original && existing) return fail("A post with that slug already exists.");
  if (original && !existing) return fail("That post no longer exists.");

  // Keep the original time of day when the date itself did not change.
  const keepDate = existing && existing.published_at.slice(0, 10) === published;
  const row = {
    slug,
    title,
    published_at: keepDate ? existing.published_at : publishedAt(published),
    meta_title: text(data, "metaTitle") || `A&L Self Storage: ${title}`,
    meta_description: text(data, "metaDescription"),
    html,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db().from("blog_posts").upsert(row, { onConflict: "slug" });
  if (error) return fail(`Couldn't save the post: ${error.message}`);
  publish();

  if (!original) redirect(`/admin/blog_posts/${slug}/edit?created=1`);
  return ok("Post saved. The public site is updated.");
}

export async function deletePostAction(data: FormData) {
  await requireAdmin();
  await db().from("blog_posts").delete().eq("slug", text(data, "slug"));
  publish();
  redirect("/admin/blog_posts?deleted=1");
}

/* ---------- Settings (website, contact, notifications) ---------- */

export async function saveSettingsAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const section = text(data, "section");
  const client = db();
  const { data: row, error: readError } = await client.from("site_settings").select("data").eq("id", 1).single();
  if (readError) return fail(`Couldn't load settings: ${readError.message}`);
  const settings = row.data as SiteSettings;
  const urlOk = (value: string) => !value || /^https?:\/\/\S+$/.test(value);
  const emailOk = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  if (section === "website") {
    if (!emailOk(text(data, "email"))) return fail("Please include a valid website contact email.");
    for (const key of ["facebook", "twitter", "linkedin", "instagram", "youtube", "yelp", "reviewUrl"]) {
      if (!urlOk(text(data, key))) return fail("Social and review links must start with http:// or https://.");
    }
    Object.assign(settings, {
      headerPhone: text(data, "headerPhone"),
      phone: text(data, "phone"),
      email: text(data, "email"),
      street: text(data, "street"),
      city: text(data, "city"),
      state: text(data, "state"),
      zip: text(data, "zip"),
      facebook: text(data, "facebook"),
      twitter: text(data, "twitter"),
      linkedin: text(data, "linkedin"),
      instagram: text(data, "instagram"),
      youtube: text(data, "youtube"),
      yelp: text(data, "yelp"),
      reviewUrl: text(data, "reviewUrl"),
      loginButtonText: text(data, "loginButtonText") || settings.loginButtonText,
    });
    settings.hours = settings.hours.map((hours, i): HoursRow => ({
      day: hours.day,
      status: text(data, `hours_${i}_status`) === "Closed" ? "Closed" : "Open",
      open: text(data, `hours_${i}_open`) || hours.open,
      close: text(data, `hours_${i}_close`) || hours.close,
    }));
  } else if (section === "contact") {
    Object.assign(settings, {
      facilityName: text(data, "facilityName") || settings.facilityName,
      websiteAddress: text(data, "websiteAddress") || settings.websiteAddress,
      street: text(data, "street"),
      city: text(data, "city"),
      state: text(data, "state"),
      zip: text(data, "zip"),
      phone: text(data, "phone"),
    });
  } else if (section === "notifications") {
    if (!emailOk(text(data, "notificationsEmail")) || !emailOk(text(data, "replyToEmail"))) {
      return fail("Please include valid email addresses.");
    }
    Object.assign(settings, {
      notificationsEmail: text(data, "notificationsEmail"),
      replyToEmail: text(data, "replyToEmail"),
    });
  } else if (section === "rules") {
    const days = Number(text(data, "moveInWindowDays"));
    const low = Number(text(data, "lowStockThreshold"));
    if (!Number.isInteger(days) || days < 1 || days > 365) return fail("The move-in window must be 1 to 365 days.");
    if (!Number.isInteger(low) || low < 0 || low > 50) return fail("The low-stock number must be 0 to 50.");
    settings.rules = {
      ...(settings.rules ?? {}),
      onlineRentals: data.get("onlineRentals") === "on",
      moveInWindowDays: days,
      lowStockThreshold: low,
      customersCanEditProfile: data.get("customersCanEditProfile") === "on",
    };
  } else if (section === "payments") {
    const methods = ["cash", "check", "card", "ach", "other"].filter((method) => data.get(`method_${method}`) === "on");
    if (!methods.length) return fail("Choose at least one payment method.");
    settings.paymentMethods = methods;
  } else {
    return fail("Unknown settings section.");
  }

  const { error } = await client
    .from("site_settings")
    .update({ data: settings, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return fail(`Couldn't save settings: ${error.message}`);
  publish();
  return ok("Settings saved. The public site is updated.");
}

/* ---------- Units > Unit Types ---------- */

export async function saveUnitTypeAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = Number(text(data, "id"));
  const price = Number(text(data, "price").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(price) || price <= 0) return fail("Please include a monthly price.");
  const total = Number(text(data, "units") || 0);
  if (!Number.isInteger(total) || total < 0) return fail("Total units must be a whole number.");

  const client = db();
  const { data: current, error: readError } = await client.from("unit_types").select("image_path").eq("id", id).maybeSingle();
  if (readError) return fail(`Couldn't load the unit type: ${readError.message}`);
  if (!current) return fail("That unit type no longer exists.");

  const image = text(data, "image");
  if (image && !/^\/(uploads|assets)\/[\w./-]+$/.test(image)) return fail("Choose a photo from the list.");
  const onWebsite = text(data, "onWebsite") === "yes";
  if (onWebsite && !(image || current.image_path)) return fail("Add a photo for this unit type before showing it on the website.");

  const { error } = await client
    .from("unit_types")
    .update({
      price_cents: Math.round(price * 100),
      description: text(data, "description"),
      on_website: onWebsite,
      units_count: total,
      ...(image ? { image_path: image } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return fail(`Couldn't save the unit type: ${error.message}`);
  publish();
  return ok("Unit type saved. The Rent page is updated.");
}

/* ---------- Website > Image Library ---------- */

const IMAGE_TYPES: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif" };

export async function uploadImageAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const file = data.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Please choose an image to upload.");
  const extension = IMAGE_TYPES[file.type];
  if (!extension) return fail("Images must be PNG, JPG, WebP or GIF.");
  if (file.size > 5 * 1024 * 1024) return fail("Images must be 5 MB or smaller.");

  const base = (file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "image").slice(0, 50);
  const name = `${base}-${Math.random().toString(36).slice(2, 7)}${extension}`;
  const client = db();
  const { error } = await client.storage.from(IMAGE_BUCKET).upload(name, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    upsert: false,
  });
  if (error) return fail(`Couldn't upload the image: ${error.message}`);

  await client.from("images").upsert({ key: `library/${name}`, kind: "library", title: text(data, "title") || base, alt: text(data, "alt") }, { onConflict: "key" });
  updateTag(CONTENT_TAG);
  revalidatePath("/admin/widget_images");
  return ok(`Uploaded. Use /uploads/library/${name} to add it to a blog post.`);
}

export async function deleteImageAction(data: FormData) {
  await requireAdmin();
  const name = text(data, "name").split("/").pop() ?? "";
  const client = db();
  if (name) {
    await client.storage.from(IMAGE_BUCKET).remove([name]);
    await client.from("images").delete().eq("key", `library/${name}`);
  }
  updateTag(CONTENT_TAG);
  revalidatePath("/admin/widget_images");
}

export async function saveImageMetaAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const key = text(data, "key");
  if (!/^[\w./-]+$/.test(key) || key.includes("..")) return fail("Unknown image.");
  const { error } = await db()
    .from("images")
    .upsert({ key, kind: key.split("/")[0], title: text(data, "title"), alt: text(data, "alt") }, { onConflict: "key" });
  if (error) return fail(`Couldn't save the image details: ${error.message}`);
  updateTag(CONTENT_TAG);
  revalidatePath("/admin/widget_images");
  return ok("Image details saved.");
}

/* ---------- Website > Messages (contact form) ---------- */

export async function setMessageStatusAction(data: FormData) {
  await requireAdmin();
  const status = text(data, "status");
  if (!["new", "read", "archived"].includes(status)) return;
  await db().from("contact_messages").update({ status }).eq("id", Number(text(data, "id")));
  revalidatePath("/admin/contact_messages");
}

/* ---------- Customers and rentals ---------- */

const USERNAME = /^[a-z0-9][a-z0-9._-]{2,39}$/;
const dollarsToCents = (value: string) => Math.round(Number(value.replace(/[^0-9.-]/g, "")) * 100);

export async function saveCustomerAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = text(data, "id");
  const fullName = text(data, "fullName");
  const username = text(data, "username").toLowerCase();
  const password = String(data.get("password") ?? "");

  if (!fullName) return fail("Please include the customer's full name.");
  if (!USERNAME.test(username)) return fail("The username needs 3 to 40 letters, numbers, dots, dashes or underscores.");
  if (!id && !password) return fail("Please set a password for the customer.");
  if (password && passwordProblem(password)) return fail(passwordProblem(password)!);

  const row: Record<string, unknown> = {
    full_name: fullName,
    username,
    email: text(data, "email"),
    phone: text(data, "phone"),
    cell_phone: text(data, "cellPhone"),
    address: text(data, "address"),
    city: text(data, "city"),
    state: text(data, "state"),
    zip: text(data, "zip"),
    notes: String(data.get("notes") ?? "").trim(),
    login_disabled: data.get("loginDisabled") === "on",
    archived: data.get("archived") === "on",
    updated_at: new Date().toISOString(),
  };
  if (password) row.password_hash = hashPassword(password);

  const client = db();
  if (!id) {
    const { data: created, error } = await client.from("customers").insert(row).select("id").single();
    if (error) {
      return fail(error.code === "23505" ? "That username is already taken." : `Couldn't create the customer: ${error.message}`);
    }
    redirect(`/admin/customers/${created.id}/edit?created=1`);
  }
  const { error } = await client.from("customers").update(row).eq("id", Number(id));
  if (error) {
    return fail(error.code === "23505" ? "That username is already taken." : `Couldn't save the customer: ${error.message}`);
  }
  revalidatePath("/admin/customers");
  return ok("Customer saved.");
}

export async function addRentalAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const customerId = Number(text(data, "customerId"));
  const unitId = Number(text(data, "unitId"));
  const startedOn = text(data, "startedOn");
  if (!unitId) return fail("Please choose a vacant unit.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startedOn)) return fail("Please choose the start date.");

  const client = db();
  // The update only succeeds while the unit is still vacant.
  const { data: claimed } = await client
    .from("units")
    .update({ status: "rented", updated_at: new Date().toISOString() })
    .eq("id", unitId)
    .eq("status", "vacant")
    .select("id,name,unit_type_id");
  const unit = claimed?.[0];
  if (!unit) return fail("That unit is no longer vacant. Pick another one.");

  let rent = text(data, "rent") ? dollarsToCents(text(data, "rent")) : NaN;
  if (!Number.isFinite(rent) && unit.unit_type_id) {
    const { data: type } = await client.from("unit_types").select("price_cents").eq("id", unit.unit_type_id).maybeSingle();
    rent = type?.price_cents ?? NaN;
  }
  if (!Number.isFinite(rent) || rent < 0) {
    await client.from("units").update({ status: "vacant" }).eq("id", unit.id);
    return fail("Please include the monthly rent.");
  }

  const { error } = await client.from("rentals").insert({
    customer_id: customerId,
    unit_name: unit.name,
    unit_id: unit.id,
    unit_type_id: unit.unit_type_id,
    monthly_rent_cents: rent,
    started_on: startedOn,
    confirmed: true,
  });
  if (error) {
    await client.from("units").update({ status: "vacant" }).eq("id", unit.id);
    return fail(`Couldn't add the rental: ${error.message}`);
  }
  publish();
  revalidatePath(`/admin/customers/${customerId}/edit`);
  return ok(`Rental added. Unit ${unit.name} is now rented.`);
}

// Ending or deleting a rental puts its unit back on the market.
export async function endRentalAction(data: FormData) {
  await requireAdmin();
  const id = Number(text(data, "id"));
  const client = db();
  const { data: rental } = await client.from("rentals").select("unit_id").eq("id", id).maybeSingle();
  if (text(data, "mode") === "delete") await client.from("rentals").delete().eq("id", id);
  else await client.from("rentals").update({ ended_on: new Date().toISOString().slice(0, 10) }).eq("id", id);
  if (rental?.unit_id) await client.from("units").update({ status: "vacant", updated_at: new Date().toISOString() }).eq("id", rental.unit_id);
  publish();
  revalidatePath(`/admin/customers/${text(data, "customerId")}/edit`);
}

/* ---------- Reservations and waiting list ---------- */

// Confirms an online rental: the office has the first month's rent and the unit is now rented.
export async function confirmRentalAction(data: FormData) {
  await requireAdmin();
  const id = Number(text(data, "id"));
  const client = db();
  const { data: rental } = await client.from("rentals").update({ confirmed: true }).eq("id", id).select("unit_id").maybeSingle();
  if (rental?.unit_id) await client.from("units").update({ status: "rented", updated_at: new Date().toISOString() }).eq("id", rental.unit_id);
  publish();
  revalidatePath("/admin/reservations");
}

// Cancels an online rental: the unit goes back on the market and the first month's charge is removed
// (anything already paid toward it goes back to the customer as credit).
export async function cancelReservationAction(data: FormData) {
  await requireAdmin();
  const id = Number(text(data, "id"));
  const client = db();
  const { data: rental } = await client.from("rentals").select("unit_id").eq("id", id).maybeSingle();
  if (!rental) return;
  const { data: charges } = await client.from("ledger_entries").select("id").eq("rental_id", id);
  for (const charge of charges ?? []) await voidCharge(charge.id);
  await client.from("rentals").delete().eq("id", id);
  if (rental.unit_id) await client.from("units").update({ status: "vacant", updated_at: new Date().toISOString() }).eq("id", rental.unit_id);
  publish();
  revalidatePath("/admin/reservations");
}

const WAITING_STATUSES = ["waiting", "notified", "removed"];

export async function setRequestStatusAction(data: FormData) {
  await requireAdmin();
  const status = text(data, "status");
  if (!WAITING_STATUSES.includes(status)) return;
  await db().from("waiting_list").update({ status }).eq("id", Number(text(data, "id")));
  revalidatePath("/admin/waiting_customers");
}

/* ---------- Units ---------- */

const UNIT_STATUSES = ["vacant", "reserved", "rented", "unavailable"];

export async function saveUnitAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = text(data, "id");
  const name = text(data, "name");
  const status = text(data, "status");
  if (!name || name.length > 40) return fail("Please include the unit number or name (up to 40 characters).");
  if (!UNIT_STATUSES.includes(status)) return fail("Please choose a status.");

  const row = {
    name,
    unit_type_id: text(data, "unitTypeId") ? Number(text(data, "unitTypeId")) : null,
    status,
    gate_key: text(data, "gateKey"),
    notes: String(data.get("notes") ?? "").trim(),
    updated_at: new Date().toISOString(),
  };
  const client = db();
  if (!id) {
    const { data: created, error } = await client.from("units").insert(row).select("id").single();
    if (error) return fail(error.code === "23505" ? "A unit with that number already exists." : `Couldn't create the unit: ${error.message}`);
    publish();
    redirect(`/admin/units/${created.id}/edit?created=1`);
  }
  const { error } = await client.from("units").update(row).eq("id", Number(id));
  if (error) return fail(error.code === "23505" ? "A unit with that number already exists." : `Couldn't save the unit: ${error.message}`);
  publish();
  revalidatePath("/admin/units/list");
  return ok("Unit saved. Availability on the Rent page is updated.");
}

// Names can be listed one per line or as ranges, for example: 101-120
export async function massCreateUnitsAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const status = text(data, "status");
  if (!UNIT_STATUSES.includes(status)) return fail("Please choose a status.");
  const names: string[] = [];
  for (const token of String(data.get("names") ?? "").split(/[\n,]+/).map((part) => part.trim()).filter(Boolean)) {
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const [from, to] = [Number(range[1]), Number(range[2])];
      if (to < from || to - from > 200) return fail("Ranges can't be backwards or longer than 200 units.");
      for (let n = from; n <= to; n += 1) names.push(String(n));
    } else names.push(token.slice(0, 40));
  }
  if (!names.length) return fail("Please list the unit numbers to create.");
  if (names.length > 300) return fail("Create up to 300 units at a time.");

  const client = db();
  const { data: existing } = await client.from("units").select("name");
  const taken = new Set((existing ?? []).map((unit) => unit.name.toLowerCase()));
  const fresh = [...new Set(names)].filter((name) => !taken.has(name.toLowerCase()));
  if (!fresh.length) return fail("Those units already exist.");

  const typeId = text(data, "unitTypeId") ? Number(text(data, "unitTypeId")) : null;
  const { error } = await client.from("units").insert(fresh.map((name) => ({ name, unit_type_id: typeId, status })));
  if (error) return fail(`Couldn't create the units: ${error.message}`);
  publish();
  return ok(`Created ${fresh.length} ${fresh.length === 1 ? "unit" : "units"}${fresh.length < names.length ? ` (${names.length - fresh.length} already existed)` : ""}.`);
}

export async function deleteUnitAction(data: FormData) {
  await requireAdmin();
  const id = Number(text(data, "id"));
  const client = db();
  const { count } = await client.from("rentals").select("id", { count: "exact", head: true }).eq("unit_id", id).is("ended_on", null);
  if ((count ?? 0) === 0) await client.from("units").delete().eq("id", id);
  publish();
  redirect("/admin/units/list");
}

/* ---------- Users & Roles (admin accounts) ---------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Creates an admin login with a generated password. The password is shown once and never stored in plain text.
export async function createAdminUserAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const email = text(data, "email").toLowerCase();
  const name = text(data, "name");
  if (!EMAIL.test(email)) return fail("Please include a valid email address.");

  const password = generatePassword();
  const { error } = await db().from("admin_users").insert({ email, name, password_hash: hashPassword(password) });
  if (error) {
    return fail(error.code === "23505" ? "An admin with that email already exists." : `Couldn't create the admin: ${error.message}`);
  }
  revalidatePath("/admin/users");
  return ok(`Created ${email}. Password: ${password}   (copy it now, it won't be shown again)`);
}

export async function resetAdminPasswordAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = Number(text(data, "id"));
  const password = generatePassword();
  const { data: rows, error } = await db()
    .from("admin_users")
    .update({ password_hash: hashPassword(password) })
    .eq("id", id)
    .select("email");
  if (error || !rows?.length) return fail("Couldn't reset the password.");
  return ok(`New password for ${rows[0].email}: ${password}   (copy it now, it won't be shown again)`);
}

export async function setAdminUserDisabledAction(data: FormData) {
  await requireAdmin();
  await db().from("admin_users").update({ disabled: text(data, "disabled") === "yes" }).eq("id", Number(text(data, "id")));
  revalidatePath("/admin/users");
}

export async function deleteAdminUserAction(data: FormData) {
  await requireAdmin();
  const me = await currentAdmin();
  const id = Number(text(data, "id"));
  if (me?.id === id) return; // you can't delete the account you're using
  await db().from("admin_users").delete().eq("id", id);
  revalidatePath("/admin/users");
}

/* ---------- Billing (charges and payments on a customer) ---------- */

const METHODS = ["cash", "check", "card", "ach", "other"];

export async function addChargeAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const customerId = Number(text(data, "customerId"));
  const item = text(data, "item");
  const amount = dollarsToCents(text(data, "amount"));
  const tax = text(data, "tax") ? dollarsToCents(text(data, "tax")) : 0;
  const date = text(data, "date");
  if (!item) return fail("Please include what the charge is for.");
  if (!Number.isFinite(amount) || amount <= 0) return fail("Please include the amount.");
  if (!Number.isFinite(tax) || tax < 0) return fail("The tax must be zero or more.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Please choose the charge date.");

  const { error } = await addCharge(customerId, { item, description: text(data, "description"), amountCents: amount, taxCents: tax, date, kind: text(data, "kind") === "fee" ? "fee" : "other" });
  if (error) return fail(`Couldn't add the charge: ${error.message}`);
  revalidatePath(`/admin/customers/${customerId}/edit`);
  return ok("Charge added. It shows on the customer's statement.");
}

export async function recordPaymentAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const customerId = Number(text(data, "customerId"));
  const amount = dollarsToCents(text(data, "amount"));
  const method = text(data, "method");
  if (!Number.isFinite(amount) || amount <= 0) return fail("Please include the amount received.");
  if (!METHODS.includes(method)) return fail("Please choose how it was paid.");

  const result = await applyPayment(customerId, amount, method, text(data, "note"));
  if (result.error) return fail(`Couldn't record the payment: ${result.error}`);
  revalidatePath(`/admin/customers/${customerId}/edit`);
  revalidatePath("/admin/customers");
  return ok("Payment recorded. It was applied to the oldest charges first.");
}

export async function voidChargeAction(data: FormData) {
  await requireAdmin();
  await voidCharge(Number(text(data, "id")));
  revalidatePath(`/admin/customers/${text(data, "customerId")}/edit`);
}

// Switches on a customer's online login with a generated password. The password is shown once, to you only.
// Nothing is emailed or texted to the customer: you pass the password on yourself.
export async function setCustomerAccessAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = Number(text(data, "id"));
  const password = generatePassword();
  const { data: rows, error } = await db()
    .from("customers")
    .update({ password_hash: hashPassword(password), login_disabled: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("username");
  if (error || !rows?.length) return fail("Couldn't set up online access.");
  revalidatePath(`/admin/customers/${id}/edit`);
  return ok(`Online access is on for username "${rows[0].username}". Temporary password: ${password}   (copy it now, it won't be shown again. No email was sent.)`);
}

/* ---------- Simple lists (fees, taxes, promotions, products, templates, late rules) ---------- */

export async function saveEntityAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const config = entityFor(text(data, "entity"));
  if (!config) return fail("Unknown list.");
  const parsed = parseEntity(config, data);
  if ("error" in parsed) return fail(parsed.error);

  const id = text(data, "id");
  const client = db();
  const { error } = id
    ? await client.from(config.table).update(parsed.row).eq("id", Number(id))
    : await client.from(config.table).insert(parsed.row);
  if (error) return fail(error.code === "23505" ? "That one already exists." : `Couldn't save: ${error.message}`);
  revalidatePath(config.path);
  return ok(id ? "Saved." : `Added the ${config.singular}.`);
}

export async function deleteEntityAction(data: FormData) {
  await requireAdmin();
  const config = entityFor(text(data, "entity"));
  if (!config) return;
  await db().from(config.table).delete().eq("id", Number(text(data, "id")));
  revalidatePath(config.path);
}

/* ---------- Retail sale ---------- */

export async function sellProductAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const productId = Number(text(data, "productId"));
  const customerId = Number(text(data, "customerId"));
  const quantity = Number(text(data, "quantity") || 1);
  const taxId = text(data, "taxRateId");
  if (!productId) return fail("Please choose a product.");
  if (!customerId) return fail("Please choose a customer.");
  if (!Number.isInteger(quantity) || quantity < 1) return fail("Quantity must be 1 or more.");

  const client = db();
  const { data: product } = await client.from("products").select("*").eq("id", productId).maybeSingle();
  if (!product || !product.active) return fail("That product isn't for sale.");
  if (product.stock < quantity) return fail(`Only ${product.stock} in stock.`);

  let tax = 0;
  if (taxId) {
    const { data: rate } = await client.from("tax_rates").select("rate_percent").eq("id", Number(taxId)).maybeSingle();
    tax = Math.round(product.price_cents * quantity * (Number(rate?.rate_percent ?? 0) / 100));
  }
  // Take the stock first (only succeeds if enough is left), then charge the customer.
  const { data: updated } = await client
    .from("products")
    .update({ stock: product.stock - quantity })
    .eq("id", productId)
    .gte("stock", quantity)
    .select("id");
  if (!updated?.length) return fail("That product just sold out. Please check the stock.");

  const { error } = await addCharge(customerId, {
    item: product.name,
    description: `Retail sale, quantity ${quantity}`,
    amountCents: product.price_cents * quantity,
    taxCents: tax,
    kind: "retail",
  });
  if (error) {
    await client.from("products").update({ stock: product.stock }).eq("id", productId);
    return fail(`Couldn't add the charge: ${error.message}`);
  }
  revalidatePath("/admin/products");
  return ok(`Sold ${quantity} x ${product.name}. It was added to the customer's statement.`);
}

/* ---------- Task manager ---------- */

export async function saveTaskAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const title = text(data, "title");
  if (!title) return fail("Please include a task name.");
  const due = text(data, "dueOn");
  const recurrence = ["none", "weekly", "monthly"].includes(text(data, "recurrence")) ? text(data, "recurrence") : "none";
  const { error } = await db().from("tasks").insert({
    title,
    description: text(data, "description"),
    due_on: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
    assigned_to: text(data, "assignedTo"),
    recurrence,
  });
  if (error) return fail(`Couldn't create the task: ${error.message}`);
  revalidatePath("/admin/tasks");
  return ok("Task created.");
}

// Completing a repeating task also creates the next one.
export async function completeTaskAction(data: FormData) {
  await requireAdmin();
  const id = Number(text(data, "id"));
  const client = db();
  const { data: task } = await client.from("tasks").select("*").eq("id", id).maybeSingle();
  if (!task || task.done_at) return;
  await client.from("tasks").update({ done_at: new Date().toISOString() }).eq("id", id);
  if (task.recurrence !== "none" && task.due_on) {
    const next = new Date(`${task.due_on}T00:00:00Z`);
    if (task.recurrence === "weekly") next.setUTCDate(next.getUTCDate() + 7);
    else next.setUTCMonth(next.getUTCMonth() + 1);
    await client.from("tasks").insert({
      title: task.title, description: task.description, assigned_to: task.assigned_to, recurrence: task.recurrence,
      due_on: next.toISOString().slice(0, 10),
    });
  }
  revalidatePath("/admin/tasks");
}

export async function deleteTaskAction(data: FormData) {
  await requireAdmin();
  await db().from("tasks").delete().eq("id", Number(text(data, "id")));
  revalidatePath("/admin/tasks");
}

/* ---------- Monthly billing ---------- */

export async function runRentBillingAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const month = text(data, "month");
  if (!/^\d{4}-\d{2}$/.test(month)) return fail("Please choose a month.");
  const result = await runRentBilling(month);
  revalidatePath("/admin/billing_run");
  return result.created === 0
    ? ok("Nothing to bill. Every active rental already has this month's rent charge.")
    : ok(`Created ${result.created} rent ${result.created === 1 ? "charge" : "charges"} totaling $${(result.totalCents / 100).toFixed(2)}. No emails or texts were sent.`);
}

export async function applyLateFeesAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  if (text(data, "confirm") !== "yes") return fail("Please try again.");
  const result = await applyLateFees(new Date().toISOString().slice(0, 10));
  revalidatePath("/admin/billing_run");
  return result.created === 0
    ? ok("No late fees are due.")
    : ok(`Added ${result.created} late ${result.created === 1 ? "fee" : "fees"} totaling $${(result.totalCents / 100).toFixed(2)}. No emails or texts were sent.`);
}

/* ---------- Mass edit rental prices ---------- */

export async function applyRateChangeAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const typeId = Number(text(data, "typeId"));
  const mode = text(data, "mode") === "amount" ? "amount" : "percent";
  const value = Number(text(data, "value"));
  if (!typeId) return fail("Please choose a unit type.");
  if (!Number.isFinite(value) || value === 0) return fail("Please enter the increase (it can be negative to lower prices).");
  if (data.get("confirm") !== "on") return fail("Please tick the box to confirm the change.");

  const client = db();
  const change = (current: number) => Math.max(0, Math.round(mode === "percent" ? current * (1 + value / 100) : current + value * 100));
  const { data: rentals } = await client.from("rentals").select("id,monthly_rent_cents").eq("unit_type_id", typeId).is("ended_on", null);
  for (const rental of rentals ?? []) {
    await client.from("rentals").update({ monthly_rent_cents: change(rental.monthly_rent_cents) }).eq("id", rental.id);
  }
  let typeNote = "";
  if (data.get("updateListPrice") === "on") {
    const { data: type } = await client.from("unit_types").select("price_cents").eq("id", typeId).maybeSingle();
    if (type) {
      await client.from("unit_types").update({ price_cents: change(type.price_cents), updated_at: new Date().toISOString() }).eq("id", typeId);
      typeNote = " The price shown on the Rent page was updated too.";
      publish();
    }
  }
  revalidatePath("/admin/rental_rate_change_batches/new");
  return ok(`Updated ${rentals?.length ?? 0} active ${rentals?.length === 1 ? "rental" : "rentals"}.${typeNote} Customers are not notified automatically. Existing charges are unchanged.`);
}

/* ---------- Import customers from a CSV ---------- */

function parseCsv(textValue: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < textValue.length; i += 1) {
    const ch = textValue[i];
    if (quoted) {
      if (ch === '"' && textValue[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && textValue[i + 1] === "\n") i += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

// Creates customers from a CSV. They get login switched off and no password; nothing is emailed.
export async function importCustomersAction(_prev: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  const file = data.get("file");
  const pasted = String(data.get("csv") ?? "");
  const content = file instanceof File && file.size > 0 ? await file.text() : pasted;
  if (!content.trim()) return fail("Choose a CSV file or paste the rows.");
  if (content.length > 2_000_000) return fail("That file is too large. Import up to about 5,000 customers at a time.");

  const rows = parseCsv(content);
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const idx = { name: col("name", "full name", "full_name"), email: col("email"), phone: col("phone"), cell: col("cell", "cell phone", "mobile"), address: col("address", "street"), city: col("city"), state: col("state"), zip: col("zip", "zip code", "postal code") };
  if (idx.name < 0) return fail('The first row must have headings, including a "Name" column.');

  const client = db();
  const { data: existing } = await client.from("customers").select("email");
  const haveEmail = new Set((existing ?? []).map((c) => c.email.toLowerCase()).filter(Boolean));
  const pick = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  const stamp = Date.now().toString(36);
  const records = [];
  let skipped = 0;
  for (const [n, r] of rows.slice(1).entries()) {
    const name = pick(r, idx.name);
    const email = pick(r, idx.email);
    if (!name) { skipped += 1; continue; }
    if (email && haveEmail.has(email.toLowerCase())) { skipped += 1; continue; }
    if (email) haveEmail.add(email.toLowerCase());
    records.push({
      full_name: name.slice(0, 120), username: `imp-${stamp}-${n + 1}`, password_hash: "login-not-set", login_disabled: true,
      email, phone: pick(r, idx.phone), cell_phone: pick(r, idx.cell), address: pick(r, idx.address), city: pick(r, idx.city),
      state: pick(r, idx.state), zip: pick(r, idx.zip), notes: "Imported from CSV",
    });
  }
  if (records.length === 0) return fail(`Nothing to import (${skipped} rows were skipped as blank or already existing).`);
  for (let i = 0; i < records.length; i += 200) {
    const { error } = await client.from("customers").insert(records.slice(i, i + 200));
    if (error) return fail(`Couldn't import: ${error.message}`);
  }
  revalidatePath("/admin/customers");
  return ok(`Imported ${records.length} ${records.length === 1 ? "customer" : "customers"}${skipped ? ` (${skipped} skipped)` : ""}. Their online login is off and no emails were sent. Use "Set up online access" on a customer when you want them to sign in.`);
}
