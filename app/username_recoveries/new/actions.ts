"use server";

import { getSettings } from "@/lib/content";
import { db } from "@/lib/db";
import { emailConfigured, sendEmail } from "@/lib/notify";
import { tooManyRequests } from "@/lib/rate-limit";

export type RecoveryState = { status: "idle" | "done" | "error"; message: string };

// Emails the username to the address on file. The reply is always the same, so nobody can use this
// form to find out which email addresses have accounts.
export async function recoverUsernameAction(_prev: RecoveryState, data: FormData): Promise<RecoveryState> {
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Please include a valid email address." };
  }

  if (await tooManyRequests("username-recovery", 3)) {
    return { status: "error", message: "Too many requests. Please try again later or call the office." };
  }

  const settings = await getSettings();
  const { data: customers } = await db()
    .from("customers")
    .select("username,login_disabled,archived")
    .ilike("email", email.replace(/[%_]/g, (c) => `\\${c}`));
  const found = (customers ?? []).filter((customer) => !customer.login_disabled && !customer.archived);

  if (found.length > 0 && emailConfigured()) {
    await sendEmail({
      to: email,
      subject: "Your A&L Self Storage username",
      text: `Hello,\n\nYour A&L Self Storage username${found.length > 1 ? "s are" : " is"}: ${found.map((c) => c.username).join(", ")}\n\nIf you didn't ask for this, you can ignore this email.\n\nA&L Self Storage\n${settings.phone}`,
    });
  }

  return {
    status: "done",
    message: emailConfigured()
      ? "If an account matches that email address, we've sent the username to it."
      : `Online username recovery isn't available yet. Please call the office at ${settings.phone} and we'll help you.`,
  };
}
