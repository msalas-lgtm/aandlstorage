// Seeds the units inventory and the Rent page text. Run after schema-phase3.sql. Safe to run again.
// The vacant unit numbers below are the ones the live Rent page offered for each size.
// Occupied units aren't listed there, so add them under Admin > Units when you're ready.
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.split("=")[0].trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const base = env.SUPABASE_URL.replace(/\/$/, "");
const headers = { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, "Content-Type": "application/json" };

const VACANT = {
  "5 x 10": [7, 8, 9, 23, 24, 26, 28, 33, 34, 36, 59],
  "10 x 10": [13, 14, 15, 21, 53, 54, 57, 58],
  "10 x 15": [4, 44, 46, 49],
  "10 x 25": [74, 75],
};

const types = await (await fetch(`${base}/rest/v1/unit_types?select=id,name`, { headers })).json();
if (!Array.isArray(types)) throw new Error(`Couldn't read unit types: ${JSON.stringify(types)}`);
const idByName = Object.fromEntries(types.map((t) => [t.name, t.id]));

const rows = Object.entries(VACANT).flatMap(([typeName, numbers]) =>
  numbers.map((n) => ({ name: String(n), unit_type_id: idByName[typeName], status: "vacant" })),
);
// Unit numbers are unique ignoring capitalization, so skip the ones that already exist.
const existing = await (await fetch(`${base}/rest/v1/units?select=name`, { headers })).json();
const taken = new Set(existing.map((unit) => unit.name.toLowerCase()));
const fresh = rows.filter((row) => !taken.has(row.name.toLowerCase()));
if (fresh.length) {
  const units = await fetch(`${base}/rest/v1/units`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(fresh),
  });
  console.log("units:", units.ok ? `${fresh.length} added (${rows.length - fresh.length} already existed)` : `ERROR ${units.status} ${await units.text()}`);
} else {
  console.log(`units: all ${rows.length} already exist`);
}

const content = JSON.parse(fs.readFileSync("content/rent-page-content.json", "utf8"));
const page = await fetch(`${base}/rest/v1/pages?path=eq./pages/rent`, {
  method: "PATCH",
  headers: { ...headers, Prefer: "return=minimal" },
  body: JSON.stringify({ content }),
});
console.log("rent page text:", page.ok ? "saved" : `ERROR ${page.status} ${await page.text()}`);
