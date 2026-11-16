# Running the site on your own server with SQLite

> **Doing the move?** Follow the step-by-step [server-migration-guide.md](./server-migration-guide.md). This page is the short overview.

The site can use either **Supabase** (what Vercel uses today) or a **SQLite file** on your own server.
Which one is chosen by one setting, `DATABASE_DRIVER`. Nothing else in the site changes.

| | Supabase (Vercel) | SQLite (own server) |
|---|---|---|
| Setting | `DATABASE_DRIVER` empty | `DATABASE_DRIVER=sqlite` |
| Data | Supabase tables | `SQLITE_PATH` file (default `data/aandlstorage.db`) |
| Uploaded images | Supabase Storage bucket `library` | `UPLOADS_DIR/library/` folder (default `data/uploads/library/`) |

## Requirements
- A server that keeps running (a VPS, a Windows/Linux machine). **SQLite does not work on Vercel or other serverless
  hosts**, because they have no permanent disk. Keep using Supabase there.
- **Node.js 22.5 or newer** (SQLite is built in, there is nothing to install). Node 24 is recommended.
- Run **one** copy of the site per database file (a single `next start` process).

## Move to SQLite
1. Put these in `.env.local` on the server (copy the rest of the values from Vercel): `ADMIN_SECRET`, `ADMIN_PASSWORD`,
   the Stripe keys, `SITE_URL`, `CRON_SECRET`, Gmail values, and
   ```
   DATABASE_DRIVER=sqlite
   SQLITE_PATH=./data/aandlstorage.db
   UPLOADS_DIR=./data/uploads
   ```
2. Copy your live data across (needs `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local` just for this step):
   ```
   node scripts/migrate-supabase-to-sqlite.mjs --check     # compares columns only, copies nothing
   node scripts/migrate-supabase-to-sqlite.mjs             # copies every table and the uploaded images
   ```
   Supabase is only read, never changed. Run it again with `--replace` to throw the SQLite copy away and start over.
   Do the copy right before you switch, because changes made on the old site afterwards are not carried over.
3. Build and start with SQLite selected, so the pre-built pages also come from SQLite:
   ```
   npm install
   npm run build
   npm run start
   ```
   (Set `DATABASE_DRIVER=sqlite` in the environment for both `build` and `start`.)
4. Point your domain at the server (HTTPS is needed for Stripe and for the login cookies).

A brand new, empty SQLite database is created automatically on first start. Add your first admin with
`node scripts/create-admin-user.mjs you@example.com "Your Name"` (it uses SQLite when `DATABASE_DRIVER=sqlite`).

## Things that change when you leave Vercel
- **Daily billing job.** Vercel Cron (`vercel.json`) does not exist on your server. Run this once a day from the
  server's scheduler (cron on Linux, Task Scheduler on Windows), using your `CRON_SECRET`:
  ```
  curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" http://127.0.0.1:3000/api/cron/billing
  ```
- **Stripe webhook.** In the Stripe dashboard, point the webhook endpoint at `https://www.yoursite.com/api/stripe/webhook`
  and use its signing secret as `STRIPE_WEBHOOK_SECRET`.
- **Backups.** Everything lives in `data/`. Run `npm run db:backup` for a verified copy of the database (safe while the
  site is running; keeps the newest 14 in `data/backups/`), and copy `data/uploads/` too. **The folder holds customer data: keep it private, never put it in git** (it is already in `.gitignore`).
- **Supabase's SQL files** (`supabase/*.sql`) are not used with SQLite. The tables come from `sqlite/schema.sql`,
  which the site applies by itself on start. When you add a column to the Supabase schema, add it there too.

## Move back to Supabase
Remove `DATABASE_DRIVER` (or leave it empty). The Supabase data is untouched by anything above. Changes made only in
SQLite are not copied back automatically.
