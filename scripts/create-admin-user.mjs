// Creates (or resets) an admin login and prints a generated password.
// Usage: node scripts/create-admin-user.mjs someone@example.com "Their Name"
// Run supabase/schema-phase2.sql in Supabase first (it creates the admin_users table).
import fs from "node:fs";
import { randomBytes, randomInt, scryptSync } from "node:crypto";

const email = (process.argv[2] ?? "").trim().toLowerCase();
const name = (process.argv[3] ?? "").trim();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: node scripts/create-admin-user.mjs someone@example.com "Their Name"');
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.split("=")[0].trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const base = env.SUPABASE_URL.replace(/\/$/, "");
const headers = { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, "Content-Type": "application/json" };

// Same format the website uses to check passwords: scrypt$<salt>$<hash>.
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const password = Array.from({ length: 16 }, () => alphabet[randomInt(alphabet.length)]).join("");
const salt = randomBytes(16).toString("hex");
const passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;

const res = await fetch(`${base}/rest/v1/admin_users?on_conflict=email`, {
  method: "POST",
  headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
  body: JSON.stringify([{ email, name, password_hash: passwordHash, disabled: false }]),
});
if (!res.ok) {
  console.error(`Couldn't create the account: ${res.status} ${await res.text()}`);
  process.exit(1);
}
console.log(`Admin account ready for ${email}`);
console.log(`Password: ${password}`);
console.log("Sign in at /admin/login with that email and password. Keep the password private.");
