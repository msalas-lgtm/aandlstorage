"use server";

import { getSettings } from "@/lib/content";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notify";
import { tooManyRequests } from "@/lib/rate-limit";

export type ContactState = {
  status: "idle" | "success" | "error";
  message: string;
};

function field(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// Every message is saved to the contact_messages table (visible in the admin dashboard).
// If Gmail is set up (GMAIL_USER and GMAIL_APP_PASSWORD), it is also emailed to CONTACT_TO_EMAIL or the notifications email.
export async function sendContactMessage(
  _previous: ContactState,
  data: FormData,
): Promise<ContactState> {
  // Hidden field that only bots fill in.
  if (field(data, "website")) return { status: "success", message: "" };

  if (await tooManyRequests("contact")) {
    return { status: "error", message: "Too many messages. Please try again later or call the office." };
  }

  const name = field(data, "name");
  const email = field(data, "email");
  const phone = field(data, "phone");
  const message = field(data, "message");

  if (!name) return { status: "error", message: "Please include your name" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Please include your email" };
  }
  if (!message) return { status: "error", message: "Please include a message" };
  if (message.length > 5000) {
    return { status: "error", message: "Your message is too long" };
  }

  const settings = await getSettings();
  const saved = await db().from("contact_messages").insert({ name, email, phone, message });
  const emailed = await sendEmail({
    subject: `Website message from ${name}`,
    replyTo: email,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "-"}\n\n${message}`,
  });

  if (saved.error && !emailed) {
    return {
      status: "error",
      message: `Sorry, we couldn't send your message from this page. Please call ${settings.phone} or email ${settings.email}.`,
    };
  }
  return {
    status: "success",
    message: "Thank you. Your message was sent and we will get back to you soon.",
  };
}
