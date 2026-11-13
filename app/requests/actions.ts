"use server";

import { getSettings, getUnitTypes } from "@/lib/content";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notify";
import { tooManyRequests } from "@/lib/rate-limit";

export type RequestState = { status: "idle" | "success" | "error"; message: string };

const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
};

// Saves a waiting-list sign-up to Supabase, then emails the office if email is set up.
// (Renting a unit is handled by app/pages/rent/reserve/actions.ts.)
export async function submitWaitingList(_prev: RequestState, data: FormData): Promise<RequestState> {
  // Hidden field that only bots fill in.
  if (text(data, "website")) return { status: "success", message: "" };

  if (await tooManyRequests("waiting-list")) return { status: "error", message: "Too many requests. Please try again later or call the office." };

  const name = text(data, "name");
  const email = text(data, "email");
  const phone = text(data, "phone");
  const notes = text(data, "notes");
  const when = text(data, "date");

  if (!name) return { status: "error", message: "Please include your name" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: "Please include a valid email" };
  if (when && !/^\d{4}-\d{2}-\d{2}$/.test(when)) return { status: "error", message: "Please choose a valid date" };
  if (notes.length > 2000) return { status: "error", message: "Your note is too long" };

  const unitTypeId = Number(text(data, "unitTypeId"));
  const unit = (await getUnitTypes()).find((type) => type.id === unitTypeId && type.onWebsite);
  const settings = await getSettings();
  if (!unit) return { status: "error", message: "That unit size isn't available online. Please call the office." };

  const saved = await db().from("waiting_list").insert({
    unit_type_id: unit.id,
    unit_type_name: unit.name,
    name,
    email,
    phone,
    notes,
    requested_move_in: when || null,
  });

  const emailed = await sendEmail({
    subject: `Waiting list sign-up: ${unit.name} (${name})`,
    replyTo: email,
    text: `Waiting list sign-up\n\nUnit size: ${unit.name} (${unit.price} / month)\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "-"}\nDate: ${when || "-"}\n\n${notes || ""}`,
  });

  if (saved.error && !emailed) {
    return { status: "error", message: `Sorry, we couldn't send your request. Please call ${settings.phone}.` };
  }
  return {
    status: "success",
    message: "Thank you. You're on the waiting list, and we'll contact you as soon as this size is available.",
  };
}
