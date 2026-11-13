"use server";

import { updateTag, revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { addCharge } from "@/lib/billing";
import { bookingWindow } from "@/lib/booking";
import { CONTENT_TAG, getRules, getSettings, getUnitTypes } from "@/lib/content";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notify";
import { hashPassword, passwordProblem } from "@/lib/tenant/password";
import { startTenantSession } from "@/lib/tenant/session";

export type RentState = { status: "idle" | "error"; message: string };

const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
};

// Best-effort brake on abuse: 5 rental attempts per hour per visitor on this server.
const attempts = new Map<string, number[]>();

const USERNAME = /^[a-z0-9][a-z0-9._-]{2,39}$/;

// Rents a unit online: claims a vacant unit of the chosen size, creates the customer's account with
// their login, records the rental (waiting for the office to confirm), and signs them in.
export async function rentUnitAction(_prev: RentState, data: FormData): Promise<RentState> {
  // Hidden field that only bots fill in.
  if (text(data, "website")) return { status: "idle", message: "" };

  const name = text(data, "name");
  const email = text(data, "email");
  const phone = text(data, "phone");
  const moveIn = text(data, "moveIn");
  const username = text(data, "username").toLowerCase();
  const password = String(data.get("password") ?? "");

  if (!name) return { status: "error", message: "Please include your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: "Please include a valid email." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(moveIn)) return { status: "error", message: "Please choose your move-in date." };
  const rules = await getRules();
  if (!rules.onlineRentals) return { status: "error", message: "Online rentals are paused. Please call the office." };
  const { minDate: today, maxDate: latest } = bookingWindow(rules.moveInWindowDays);
  if (moveIn < today || moveIn > latest) {
    return { status: "error", message: `Please choose a move-in date within the next ${rules.moveInWindowDays} days.` };
  }
  if (!USERNAME.test(username)) {
    return { status: "error", message: "Choose a username with 3 to 40 letters, numbers, dots, dashes or underscores." };
  }
  const problem = passwordProblem(password);
  if (problem) return { status: "error", message: problem };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const recent = (attempts.get(ip) ?? []).filter((time) => Date.now() - time < 3600000);
  if (recent.length >= 5) return { status: "error", message: "Too many attempts. Please try again later or call the office." };
  attempts.set(ip, [...recent, Date.now()]);

  const unitTypeId = Number(text(data, "unitTypeId"));
  const type = (await getUnitTypes()).find((entry) => entry.id === unitTypeId && entry.onWebsite);
  const settings = await getSettings();
  if (!type) return { status: "error", message: `That unit size isn't available online. Please call ${settings.phone}.` };

  const client = db();
  const release = (unitId: number) =>
    client.from("units").update({ status: "vacant", updated_at: new Date().toISOString() }).eq("id", unitId);

  // 1. Claim a vacant unit. The update only succeeds while the unit is still vacant, so two people
  //    renting at the same moment can never get the same unit.
  const { data: candidates } = await client
    .from("units")
    .select("id,name")
    .eq("unit_type_id", type.id)
    .eq("status", "vacant")
    .order("name")
    .limit(10);
  let unit: { id: number; name: string } | null = null;
  for (const candidate of candidates ?? []) {
    const { data: claimed } = await client
      .from("units")
      .update({ status: "reserved", updated_at: new Date().toISOString() })
      .eq("id", candidate.id)
      .eq("status", "vacant")
      .select("id,name");
    if (claimed?.length) {
      unit = claimed[0];
      break;
    }
  }
  if (!unit) {
    updateTag(CONTENT_TAG);
    return { status: "error", message: "Sorry, that size was just rented. Please join the waiting list or pick another size." };
  }

  // 2. Create the customer account.
  const { data: customer, error: customerError } = await client
    .from("customers")
    .insert({
      full_name: name,
      username,
      password_hash: hashPassword(password),
      email,
      phone,
    })
    .select("id")
    .single();
  if (customerError || !customer) {
    await release(unit.id);
    return {
      status: "error",
      message:
        customerError?.code === "23505"
          ? "That username is already taken. Please choose another."
          : `Sorry, we couldn't finish your rental. Please call ${settings.phone}.`,
    };
  }

  // 3. Record the rental, waiting for the office to confirm it.
  const { data: rental, error: rentalError } = await client
    .from("rentals")
    .insert({
      customer_id: customer.id,
      unit_name: unit.name,
      unit_id: unit.id,
      unit_type_id: type.id,
      monthly_rent_cents: type.priceCents,
      started_on: moveIn,
      confirmed: false,
    })
    .select("id")
    .single();
  // The first month's rent shows on their statement as the amount due to complete the rental.
  const chargeError = rental
    ? (await addCharge(customer.id, { item: "Rent", description: `First month's rent, unit ${unit.name} (${type.name})`, amountCents: type.priceCents, date: moveIn, rentalId: rental.id, kind: "rent" })).error
    : null;
  if (rentalError || chargeError) {
    await client.from("customers").delete().eq("id", customer.id);
    await release(unit.id);
    return { status: "error", message: `Sorry, we couldn't finish your rental. Please call ${settings.phone}.` };
  }

  // Availability on the Rent page changes right away.
  updateTag(CONTENT_TAG);
  revalidatePath("/pages/rent");

  await sendEmail({
    subject: `New online rental: ${type.name}, unit ${unit.name} (${name})`,
    replyTo: email,
    text: `A customer rented a unit online and is waiting for confirmation.\n\nUnit: ${unit.name} (${type.name}, ${type.price} / month)\nMove-in: ${moveIn}\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "-"}\nUsername: ${username}\n\nConfirm it in Admin > Customers > Reservations.`,
  });

  await startTenantSession(customer.id);
  redirect("/dashboard?rented=1");
}
