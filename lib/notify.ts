import "server-only";
import nodemailer from "nodemailer";
import { getSettings } from "@/lib/content";

// Office notification email through Gmail (an app password, not the normal Gmail password).
// Everything important is saved in Supabase first, so a failed or unconfigured email never loses a request.
// Notices go to the office only (CONTACT_TO_EMAIL or the notifications email in Setup), never to customers.
export function emailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export async function sendEmail(options: { to?: string; subject: string; text: string; replyTo?: string }) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) return false;
  const settings = await getSettings();
  try {
    const transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    await transport.sendMail({
      from: `A&L Self Storage <${user}>`,
      to: options.to || process.env.CONTACT_TO_EMAIL || settings.notificationsEmail,
      replyTo: options.replyTo,
      subject: options.subject.replace(/\s+/g, " ").trim(),
      text: options.text,
    });
    return true;
  } catch (error) {
    console.error("Gmail notification failed:", error instanceof Error ? error.message : error);
    return false;
  }
}
