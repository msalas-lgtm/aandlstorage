"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { addCharge } from "@/lib/billing";
import { bookingWindow } from "@/lib/booking";
import { CONTENT_TAG, getRules, getSettings, getUnitTypes } from "@/lib/content";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notify";
import { tooManyRequests } from "@/lib/rate-limit";
import { claimVacantUnit, releaseUnit } from "@/lib/rentals";
import { requireTenant } from "@/lib/tenant/session";

export type RentState = { status: "idle" | "error"; message: string };

// A signed-in customer rents another unit. Who they are comes from their session, so there is no
// name, username or password to fill in. The rental waits for the office to confirm, like online rentals do.
export async function rentAsCustomerAction(_prev: RentState, data: FormData): Promise<RentState> {
  const tenant = await requireTenant();
  const moveIn = String(data.get("moveIn") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(moveIn)) return { status: "error", message: "Please choose your move-in date." };

  const [rules, settings, types] = await Promise.all([getRules(), getSettings(), getUnitTypes()]);
  if (!rules.onlineRentals) return { status: "error", message: `Online rentals are paused. Please call ${settings.phone}.` };
  const { minDate, maxDate } = bookingWindow(rules.moveInWindowDays);
  if (moveIn < minDate || moveIn > maxDate) {
    return { status: "error", message: `Please choose a move-in date within the next ${rules.moveInWindowDays} days.` };
  }
  if (await tooManyRequests("rent-signed-in", 10)) {
    return { status: "error", message: "Too many attempts. Please try again later or call the office." };
  }

  const typeId = Number(String(data.get("unitTypeId") ?? ""));
  const type = types.find((entry) => entry.id === typeId && entry.onWebsite);
  if (!type) return { status: "error", message: `That unit size isn't available online. Please call ${settings.phone}.` };

  const unit = await claimVacantUnit(type.id);
  if (!unit) {
    updateTag(CONTENT_TAG);
    return { status: "error", message: "Sorry, that size was just rented. Please join the waiting list or pick another size." };
  }

  const client = db();
  const { data: rental, error } = await client
    .from("rentals")
    .insert({
      customer_id: tenant.id,
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
    ? (await addCharge(tenant.id, { item: "Rent", description: `First month's rent, unit ${unit.name} (${type.name})`, amountCents: type.priceCents, date: moveIn, rentalId: rental.id, kind: "rent" })).error
    : null;
  if (error || chargeError) {
    if (rental) await client.from("rentals").delete().eq("id", rental.id);
    await releaseUnit(unit.id);
    return { status: "error", message: `Sorry, we couldn't finish your rental. Please call ${settings.phone}.` };
  }

  updateTag(CONTENT_TAG);
  revalidatePath("/pages/rent");
  revalidatePath("/rentals");

  await sendEmail({
    subject: `Another online rental: ${type.name}, unit ${unit.name} (${tenant.fullName})`,
    replyTo: tenant.email || undefined,
    text: `An existing customer rented another unit online and is waiting for confirmation.\n\nUnit: ${unit.name} (${type.name}, ${type.price} / month)\nMove-in: ${moveIn}\nName: ${tenant.fullName}\nEmail: ${tenant.email || "-"}\nPhone: ${tenant.phone || "-"}\nUsername: ${tenant.username}\n\nConfirm it in Admin > Customers > Reservations.`,
  });

  redirect("/dashboard?rented=1");
}
