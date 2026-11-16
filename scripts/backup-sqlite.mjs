// Makes a safe, consistent copy of the SQLite database (even while the site is running) and removes old copies.
// Usage: node scripts/backup-sqlite.mjs                 -> data/backups/aandlstorage-YYYY-MM-DD-HHMMSS.db
//        node scripts/backup-sqlite.mjs /mnt/backups    -> same, in another folder
// Keeps the newest 14 copies in that folder (change with KEEP_BACKUPS=30). Uploaded images are plain files in
// UPLOADS_DIR: copy that folder too (for example with rsync or tar).
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const env = {
  ...(fs.existsSync(".env.local")
    ? Object.fromEntries(
        fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
          .map((l) => [l.split("=")[0].trim(), l.slice(l.indexOf("=") + 1).trim()]),
      )
    : {}),
  ...process.env,
};
const source = path.resolve(env.SQLITE_PATH || "data/aandlstorage.db");
if (!fs.existsSync(source)) {
  console.error(`No database found at ${source}`);
  process.exit(1);
}
const folder = path.resolve(process.argv[2] || path.join(path.dirname(source), "backups"));
fs.mkdirSync(folder, { recursive: true });

const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
const target = path.join(folder, `${path.basename(source, path.extname(source))}-${stamp}.db`);

const db = new DatabaseSync(source);
db.exec("PRAGMA busy_timeout = 10000");
db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`); // a clean, complete copy, safe while the site is writing
db.close();

// Check the copy before trusting it.
const copy = new DatabaseSync(target, { readOnly: true });
const check = copy.prepare("pragma integrity_check").get().integrity_check;
const customers = copy.prepare("select count(*) as n from customers").get().n;
copy.close();
if (check !== "ok") {
  console.error(`Backup was written to ${target} but failed its integrity check: ${check}`);
  process.exit(1);
}

const keep = Number(env.KEEP_BACKUPS || 14);
const old = fs.readdirSync(folder).filter((f) => /\.db$/.test(f)).sort().reverse().slice(keep);
for (const file of old) fs.rmSync(path.join(folder, file));
console.log(`Backup saved: ${target} (${(fs.statSync(target).size / 1024).toFixed(0)} KB, ${customers} customers, integrity ok)${old.length ? `, removed ${old.length} old` : ""}`);
