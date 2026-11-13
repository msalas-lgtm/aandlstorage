import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { SESSION_SECONDS, TENANT_COOKIE, createToken, readToken, tenantSecret } from "@/lib/admin/token";

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

export async function startTenantSession(customerId: number) {
  const key = secret();
  if (!key) throw new Error("ADMIN_SECRET is not set.");
  (await cookies()).set(TENANT_COOKIE, createToken(key, `tenant:${customerId}`), {
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

export async function tenantIdFromSession() {
  await connection();
  const sub = readToken((await cookies()).get(TENANT_COOKIE)?.value, secret());
  const id = sub?.startsWith("tenant:") ? Number(sub.slice(7)) : NaN;
  return Number.isInteger(id) ? id : null;
}

// Current tenant, or null when signed out, disabled or archived.
export async function getCurrentTenant(): Promise<Tenant | null> {
  const id = await tenantIdFromSession();
  if (!id) return null;
  const { data } = await db().from("customers").select("*").eq("id", id).maybeSingle();
  if (!data || data.login_disabled || data.archived) return null;
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
