import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { SESSION_SECONDS, TENANT_COOKIE, createToken, readSession, sessionVersion, tenantSecret } from "@/lib/admin/token";

const secret = () => tenantSecret(process.env.ADMIN_SECRET);

export type Tenant = {
  id: number;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  cellPhone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  textingConsent: boolean;
};

// Signs a customer in. Pass their password hash so the session ends when the password changes.
export async function startTenantSession(customerId: number, passwordHash?: string) {
  const key = secret();
  if (!key) throw new Error("ADMIN_SECRET is not set.");
  let hash = passwordHash;
  if (hash === undefined) {
    const { data } = await db().from("customers").select("password_hash").eq("id", customerId).maybeSingle();
    hash = data?.password_hash;
  }
  (await cookies()).set(TENANT_COOKIE, createToken(key, `tenant:${customerId}`, Date.now(), sessionVersion(key, hash)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function endTenantSession() {
  (await cookies()).delete({ name: TENANT_COOKIE, path: "/" });
}

async function tenantSession() {
  await connection();
  const session = readSession((await cookies()).get(TENANT_COOKIE)?.value, secret());
  const id = session?.sub.startsWith("tenant:") ? Number(session.sub.slice(7)) : NaN;
  return Number.isInteger(id) ? { id, version: session!.v } : null;
}

export async function tenantIdFromSession() {
  return (await tenantSession())?.id ?? null;
}

// Current tenant, or null when signed out, disabled or archived.
export async function getCurrentTenant(): Promise<Tenant | null> {
  const session = await tenantSession();
  if (!session) return null;
  const { data } = await db().from("customers").select("*").eq("id", session.id).maybeSingle();
  if (!data || data.login_disabled || data.archived) return null;
  // A changed or reset password signs out every older session.
  if (session.version !== sessionVersion(secret(), data.password_hash)) return null;
  return {
    id: data.id,
    fullName: data.full_name,
    username: data.username,
    email: data.email,
    phone: data.phone,
    cellPhone: data.cell_phone,
    address: data.address,
    city: data.city,
    state: data.state,
    zip: data.zip,
    textingConsent: Boolean(data.texting_consent),
  };
}

export async function requireTenant() {
  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/login");
  return tenant;
}
