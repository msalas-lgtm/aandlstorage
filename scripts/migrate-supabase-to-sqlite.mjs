// Copies everything from your Supabase project into the local SQLite file the site uses with DATABASE_DRIVER=sqlite:
// every table, plus the images uploaded in the admin Image Library.
//
// Usage:   node scripts/migrate-supabase-to-sqlite.mjs            (refuses to overwrite a database that already has data)
//          node scripts/migrate-supabase-to-sqlite.mjs --replace   (empties the SQLite tables first, then copies)
//          node scripts/migrate-supabase-to-sqlite.mjs --check     (only compares columns, copies nothing)
//
// It reads SUPABASE_URL and SUPABASE_SECRET_KEY from .env.local, and writes to SQLITE_PATH (default data/aandlstorage.db)
// and UPLOADS_DIR (default: an "uploads" folder next to the database). Supabase itself is only ever read, never changed.
// Customer data is copied as-is, so keep the data/ folder private and out of git (it is in .gitignore).
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const args = new Set(process.argv.slice(2));
const readEnv = (file) =>
  fs.existsSync(file)
    ? Object.fromEntries(
        fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
          .map((l) => [l.split("=")[0].trim(), l.slice(l.indexOf("=") + 1).trim()]),
      )
    : {};
const env = { ...readEnv(".env.local"), ...process.env };
if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}
const base = env.SUPABASE_URL.replace(/\/$/, "");
const headers = { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` };

const dbFile = path.resolve(env.SQLITE_PATH || "data/aandlstorage.db");
const uploads = path.resolve(env.UPLOADS_DIR || path.join(path.dirname(dbFile), "uploads"));
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = new DatabaseSync(dbFile);
db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
db.exec(fs.readFileSync(path.join("sqlite", "schema.sql"), "utf8"));

// What Supabase says its tables and columns are (PostgREST publishes this as an OpenAPI document).
const openapi = await (await fetch(`${base}/rest/v1/`, { headers: { ...headers, Accept: "application/openapi+json" } })).json();
const remote = openapi.definitions ?? {};
const localTables = db.prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name").all().map((r) => r.name);

let problems = 0;
const plan = [];
for (const table of Object.keys(remote).sort()) {
  if (!localTables.includes(table)) {
    console.log(`! Supabase table "${table}" has no SQLite table (skipped)`);
    problems++;
    continue;
  }
  const localCols = new Map(db.prepare(`pragma table_info("${table}")`).all().map((c) => [c.name, c.type.toUpperCase()]));
  const remoteCols = remote[table].properties ?? {};
  for (const name of Object.keys(remoteCols)) {
    if (!localCols.has(name)) {
      console.log(`! ${table}.${name} exists in Supabase but not in SQLite (add it to sqlite/schema.sql)`);
      problems++;
    }
  }
  for (const name of localCols.keys()) {
    if (!(name in remoteCols)) console.log(`  note: ${table}.${name} exists in SQLite only (fine if it is new)`);
  }
  plan.push({ table, localCols, remoteCols });
}
for (const table of localTables) if (!remote[table]) console.log(`  note: SQLite table "${table}" is not in Supabase yet (fine for login_attempts before its SQL was run)`);
console.log(problems ? `\n${problems} difference(s) above need attention.` : "\nColumns match: every Supabase column has a SQLite column.");
if (args.has("--check")) { process.exitCode = problems ? 1 : 0; await new Promise((r) => setTimeout(r, 100)); process.exit(); }

const hasData = plan.some(({ table }) => db.prepare(`select 1 from "${table}" limit 1`).get());
if (hasData && !args.has("--replace")) {
  console.error(`\n${dbFile} already has data. Run again with --replace to empty it and copy fresh data from Supabase.`);
  process.exit(1);
}

const convert = (value, localType, remoteFormat) => {
  if (value === null || value === undefined) return null;
  if (localType === "BOOLEAN") return value ? 1 : 0;
  if (localType === "JSON_TEXT") return JSON.stringify(value);
  if (typeof remoteFormat === "string" && remoteFormat.startsWith("timestamp")) return new Date(value).toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
};

db.exec("PRAGMA foreign_keys = OFF");
db.exec("begin");
try {
  if (args.has("--replace")) for (const { table } of plan) db.exec(`delete from "${table}"`);
  console.log("\nCopying tables...");
  for (const { table, localCols, remoteCols } of plan) {
    let copied = 0;
    for (let offset = 0; ; offset += 1000) {
      const res = await fetch(`${base}/rest/v1/${table}?select=*&limit=1000&offset=${offset}`, { headers });
      if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
      const rows = await res.json();
      for (const row of rows) {
        const names = Object.keys(row).filter((name) => localCols.has(name));
        const values = names.map((name) => convert(row[name], localCols.get(name), remoteCols[name]?.format));
        db.prepare(`insert into "${table}" (${names.map((n) => `"${n}"`).join(", ")}) values (${names.map(() => "?").join(", ")})`).run(...values);
      }
      copied += rows.length;
      if (rows.length < 1000) break;
    }
    const local = db.prepare(`select count(*) as n from "${table}"`).get().n;
    const flag = local === copied ? "ok" : "MISMATCH";
    if (local !== copied) problems++;
    console.log(`  ${table.padEnd(20)} ${String(copied).padStart(6)} rows  ${flag}`);
  }
  db.exec("commit");
} catch (error) {
  db.exec("rollback");
  console.error("\nCopy failed, nothing was changed in SQLite:", error.message);
  process.exit(1);
}
const broken = db.prepare("pragma foreign_key_check").all();
if (broken.length) {
  console.log(`! ${broken.length} row(s) point at a row that doesn't exist (first: ${JSON.stringify(broken[0])})`);
  problems++;
}
db.exec("PRAGMA foreign_keys = ON");

// The images uploaded in the admin Image Library.
console.log("\nCopying uploaded images...");
const listed = await fetch(`${base}/storage/v1/object/list/library`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({ prefix: "", limit: 1000, offset: 0 }),
});
if (!listed.ok) {
  console.log(`  (couldn't list the "library" bucket: ${listed.status}; skipping images)`);
} else {
  const files = (await listed.json()).filter((f) => f.id);
  fs.mkdirSync(path.join(uploads, "library"), { recursive: true });
  let saved = 0;
  for (const file of files) {
    const res = await fetch(`${base}/storage/v1/object/library/${encodeURIComponent(file.name)}`, { headers });
    if (!res.ok) {
      console.log(`  ! couldn't download ${file.name}: ${res.status}`);
      problems++;
      continue;
    }
    fs.writeFileSync(path.join(uploads, "library", path.basename(file.name)), Buffer.from(await res.arrayBuffer()));
    saved++;
  }
  console.log(`  ${saved} of ${files.length} image(s) saved to ${path.join(uploads, "library")}`);
}

console.log(`\nDone. Database: ${dbFile}`);
console.log("Use it with:  DATABASE_DRIVER=sqlite   (see .env.example)");
process.exitCode = problems ? 1 : 0;
await new Promise((r) => setTimeout(r, 100));
process.exit();
