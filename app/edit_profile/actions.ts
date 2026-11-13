"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { passwordProblem, hashPassword, verifyPassword } from "@/lib/tenant/password";
import { requireTenant } from "@/lib/tenant/session";

export type ProfileState = { status: "idle" | "ok" | "error"; message: string };

const USERNAME = /^[a-z0-9][a-z0-9._-]{2,39}$/;

export async function saveProfileAction(_prev: ProfileState, data: FormData): Promise<ProfileState> {
  const tenant = await requireTenant();
  const username = String(data.get("username") ?? "").trim().toLowerCase();
  const email = String(data.get("email") ?? "").trim();

  if (!USERNAME.test(username)) {
    return { status: "error", message: "Your username needs 3 to 40 letters, numbers, dots, dashes or underscores." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: "Please include a valid email." };

  const { error } = await db()
    .from("customers")
    .update({
      username,
      email,
      texting_consent: data.get("textingConsent") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenant.id);
  if (error) {
    return { status: "error", message: error.code === "23505" ? "That username is already taken." : "Sorry, we couldn't save your profile." };
  }
  revalidatePath("/dashboard");
  return { status: "ok", message: "Your profile was saved." };
}

export async function changePasswordAction(_prev: ProfileState, data: FormData): Promise<ProfileState> {
  const tenant = await requireTenant();
  const current = String(data.get("current") ?? "");
  const next = String(data.get("next") ?? "");
  const confirm = String(data.get("confirm") ?? "");

  const { data: customer } = await db().from("customers").select("password_hash").eq("id", tenant.id).maybeSingle();
  if (!verifyPassword(current, customer?.password_hash)) {
    return { status: "error", message: "Your current password isn't right." };
  }
  const problem = passwordProblem(next);
  if (problem) return { status: "error", message: problem };
  if (next !== confirm) return { status: "error", message: "The new passwords don't match." };

  const { error } = await db()
    .from("customers")
    .update({ password_hash: hashPassword(next), updated_at: new Date().toISOString() })
    .eq("id", tenant.id);
  if (error) return { status: "error", message: "Sorry, we couldn't change your password." };
  return { status: "ok", message: "Your password was changed." };
}
