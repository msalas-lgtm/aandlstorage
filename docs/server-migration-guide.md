# Moving A&L Self Storage from Vercel + Supabase to your own server (SQLite)

This is the step-by-step guide. For background on how the SQLite option works, see
[self-hosting-sqlite.md](./self-hosting-sqlite.md).

**What you end up with:** the same website and admin, running on your own server, keeping its data in one SQLite file
(`data/aandlstorage.db`) and its uploaded images in a folder (`data/uploads/`). Vercel and Supabase stay untouched
until you decide to shut them down, so you can go back at any time.

The commands assume an **Ubuntu 22.04 / 24.04** server (any VPS works). Windows notes are at the end.

---

## 0. Before you start

You need:

- A server with **2 GB of RAM or more** (building the site needs it), about 5 GB of free disk, and a permanent
  disk. Serverless hosts (Vercel, Netlify and similar) can't run SQLite.
- A **domain name** you control (for example `www.aandlstorage.com`), so you can point it at the server.
- Access to: the Stripe dashboard, your Vercel project (environment variables), and your Supabase project.
- About 1 hour for the first run-through. The actual switch-over (step 10) takes about 15 minutes.

**Golden rule:** do steps 1 to 9 first, using a temporary address (the server's IP, or a test subdomain). Nothing
changes for your customers until step 10.

---

## 1. Prepare the server

Log in as an admin user and run:

```bash
# Update, and add a basic firewall that only allows SSH + web traffic
sudo apt update && sudo apt upgrade -y
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw --force enable

# Node.js 24 (needs 22.5 or newer), git and the SQLite command-line tool (handy for checks)
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs git sqlite3
node -v        # should print v24.x

# A dedicated user with no login, so the site never runs as root
sudo adduser --system --group --home /srv/aandlstorage aandl
```

If the server has little memory (1 GB), add swap so the build doesn't fail:
`sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`

---

## 2. Get the code onto the server

```bash
sudo -u aandl git clone https://github.com/msalas-lgtm/aandlstorage.git /srv/aandlstorage/app
cd /srv/aandlstorage/app
```

The repository is private, so git will ask you to sign in. Use a GitHub **personal access token** as the password
(GitHub > Settings > Developer settings > Personal access tokens, with read access to this repository), or add a
read-only deploy key to the repository.

```bash
sudo -u aandl npm ci
```

---

## 3. Create the settings file (`.env.local`)

Create `/srv/aandlstorage/app/.env.local` (it is private and never committed):

```bash
sudo -u aandl nano /srv/aandlstorage/app/.env.local
sudo chmod 600 /srv/aandlstorage/app/.env.local
```

Paste this and fill in the values. **Copy the same values you use in Vercel** (Vercel > your project > Settings >
Environment Variables) so logins and payments keep working:

```ini
# --- Database: this is what switches the site from Supabase to SQLite ---
DATABASE_DRIVER=sqlite
SQLITE_PATH=/srv/aandlstorage/data/aandlstorage.db
UPLOADS_DIR=/srv/aandlstorage/data/uploads

# --- Admin login (use the SAME ADMIN_SECRET as Vercel, or everyone is signed out once) ---
ADMIN_PASSWORD=...
ADMIN_SECRET=...

# --- Public address (no trailing slash). Stripe sends customers back here ---
SITE_URL=https://www.aandlstorage.com

# --- Stripe ---
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...      # the NEW endpoint's secret, see step 8 (leave the old one for now)

# --- Protects the daily billing job. Any 32+ random characters ---
CRON_SECRET=...

# --- Email (optional) ---
GMAIL_USER=
GMAIL_APP_PASSWORD=
CONTACT_TO_EMAIL=

# --- Only needed for step 4 (copying data out of Supabase). Remove these two lines afterwards ---
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

Make a random secret with: `openssl rand -hex 32`

Notes:
- Using the **same `ADMIN_SECRET`** as Vercel keeps customers' and staff's current login sessions valid.
- Keep `STRIPE_SECRET_KEY` as it is today. Switching Stripe from test to live keys is a separate decision (see step 9).
- Create the data folder with the right owner: `sudo mkdir -p /srv/aandlstorage/data && sudo chown -R aandl:aandl /srv/aandlstorage && sudo chmod 700 /srv/aandlstorage/data`

---

## 4. Copy your data out of Supabase

```bash
cd /srv/aandlstorage/app
sudo -u aandl node scripts/migrate-supabase-to-sqlite.mjs --check   # compares columns, copies nothing
sudo -u aandl node scripts/migrate-supabase-to-sqlite.mjs           # copies every table and the uploaded images
```

You should see `Columns match` and a list of tables with `ok` beside each, ending in `Done`. Supabase is only
read, never changed.

Check it: the customer count should equal what the admin panel shows.

```bash
sqlite3 /srv/aandlstorage/data/aandlstorage.db "select count(*) from customers; select count(*) from units;"
```

You can run this step as many times as you like: add `--replace` to throw the SQLite copy away and copy fresh data.
**You will do it once more at switch-over (step 10)**, because customers keep using the old site until then.

> Prefer to run it on your own PC? That works too: run it there, then copy the `data/` folder to the server
> (`scp -r data/ you@server:/srv/aandlstorage/`) and fix ownership with `chown -R aandl:aandl`.

---

## 5. Build and test it

Do the data copy **before** building: the build bakes some pages in from the database.

```bash
cd /srv/aandlstorage/app
sudo -u aandl npm run build
sudo -u aandl npm run start -- -p 3000
```

In a second terminal: `curl -I http://localhost:3000` should show `200`. Stop it again with Ctrl+C.

---

## 6. Keep it running (systemd)

Create `/etc/systemd/system/aandlstorage.service`:

```ini
[Unit]
Description=A&L Self Storage website
After=network.target

[Service]
Type=simple
User=aandl
Group=aandl
WorkingDirectory=/srv/aandlstorage/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -- -H 127.0.0.1 -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now aandlstorage
sudo systemctl status aandlstorage          # should say "active (running)"
journalctl -u aandlstorage -f               # live log (Ctrl+C to leave)
```

The site only listens on `127.0.0.1`, so nobody can reach it directly. The next step puts a web server in front.

> Run **only one** copy of the site per database file.

---

## 7. Domain and HTTPS (Caddy)

**HTTPS is required**, not optional: the login cookies are marked secure, so over plain `http://` nobody can sign in,
and Stripe needs HTTPS too. Caddy gets and renews a free certificate by itself.

```bash
sudo apt install -y caddy
sudo nano /etc/caddy/Caddyfile
```

```
www.aandlstorage.com {
    reverse_proxy 127.0.0.1:3000
}

aandlstorage.com {
    redir https://www.aandlstorage.com{uri} permanent
}
```

```bash
sudo systemctl reload caddy
```

Caddy passes the visitor's real address to the site (`X-Forwarded-For`), which the login lockouts and spam limits
rely on.

**Testing before the switch:** use a test subdomain such as `new.aandlstorage.com`. Add a DNS **A record** for it
pointing at the server's IP, use that name in the Caddyfile, and set `SITE_URL=https://new.aandlstorage.com` while
you test. Change both back at switch-over (step 10).

---

## 8. Scheduled jobs

Vercel's built-in scheduler (`vercel.json`) does not exist on your server, so set up two jobs.

**a) Daily billing** (adds the month's rent charge and runs autopay). Vercel ran it at 14:00 UTC (about 10:00 in New
York in summer, 09:00 in winter). Edit the root crontab with `sudo crontab -e`. The job calls the site on the server
itself (`127.0.0.1`), so it doesn't depend on DNS:

```cron
# DISABLED until switch-over day (step 10). Remove the leading "#" then.
#0 14 * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" http://127.0.0.1:3000/api/cron/billing >> /var/log/aandl-billing.log 2>&1
```

> **Keep this line commented out until step 10.** Until then the old Vercel site is still the one that bills
> customers. If both ran, customers could be billed from two different copies of the data.

You can still try the job once by hand to see that it works: run the same `curl` command without the `#`. It prints JSON
like `{"month":"2026-11","rent":...}`, **and it really does run billing against the server's copy of the data**, so
only do it once you are happy with that (with `sk_test_` keys no real money moves). A `401` means the secret doesn't
match `CRON_SECRET`. It is safe to run more than once a day: rent is never charged twice for a month, and a customer is
charged at most once per day.

**b) Nightly backup** (`sudo crontab -u aandl -e`):

```cron
30 3 * * * cd /srv/aandlstorage/app && /usr/bin/node scripts/backup-sqlite.mjs /srv/aandlstorage/backups >> /srv/aandlstorage/backup.log 2>&1
```

It writes a verified copy and keeps the newest 14. See "Backups" below for copying them **off the server**.

---

## 9. Stripe

1. Stripe dashboard > Developers > Webhooks > **Add endpoint**:
   `https://www.aandlstorage.com/api/stripe/webhook`
   Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
2. Copy that endpoint's **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` in `.env.local`, then
   `sudo systemctl restart aandlstorage`.
3. Leave the **old Vercel webhook endpoint in place** until the switch-over, then delete it (step 10).
4. Test with a small payment (Stripe's minimum is $0.50) from a customer account, and confirm it appears under
   the customer in the admin. In test mode use card `4242 4242 4242 4242`.

Your Stripe key today starts with `sk_test_`, so **no real money moves yet**. When you are ready to take real
payments, replace `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` and `STRIPE_WEBHOOK_SECRET` with the **live** versions
together (they must all be live or all be test), and restart.

---

## 10. Switch-over day

Pick a quiet time and tell staff not to use the admin during it. Anything entered on the old site after the final copy
in step 3 below is **not** carried over.

1. **Make a safety copy of Supabase** (Supabase dashboard > Database > Backups, or note that it keeps its own).
2. **Disable the old site's automatic jobs first**, otherwise both sites could bill customers:
   - Remove the `crons` line from `vercel.json` and redeploy, or pause the project's cron under Vercel > Settings >
     Cron Jobs.
   - In Stripe, **delete or disable the old Vercel webhook endpoint** after the new one works.
3. **Final data copy:** `sudo -u aandl node scripts/migrate-supabase-to-sqlite.mjs --replace`
4. Rebuild and restart so the pre-built pages match the fresh data:
   `cd /srv/aandlstorage/app && sudo -u aandl npm run build && sudo systemctl restart aandlstorage`
5. Set `SITE_URL=https://www.aandlstorage.com` (if you were testing on a subdomain) and restart.
   **Turn on the daily billing job** now: remove the `#` from the billing line in `sudo crontab -e` (step 8a).
6. **Point DNS at the server:** change the `www` (and apex) **A record** to the server's IP. Lower the record's TTL a
   day earlier (to 300 seconds) so the change spreads quickly.
7. Verify (checklist below).
8. Remove `SUPABASE_URL` and `SUPABASE_SECRET_KEY` from `.env.local` and restart. The site no longer needs them.

### Verify checklist
- [ ] Home page, Rent, Contact, Map and Blog load over `https://` with a padlock
- [ ] Admin login works (your existing admin accounts were copied across); Admin > Customers shows the right count
- [ ] A customer can sign in and sees their statement and balance
- [ ] A small test payment appears in the admin, and **the customer's balance goes down**
- [ ] Contact form message appears under Admin > Contact Messages
- [ ] Upload a test image in Admin > Image Library and see it on the site; delete it
- [ ] The billing line in the crontab is switched on, and `curl -H "Authorization: Bearer ..." http://127.0.0.1:3000/api/cron/billing` returns JSON (not 401)
- [ ] `sudo systemctl restart aandlstorage` brings it back; `sudo reboot` too

---

## Backups and restore

Everything that matters is in `/srv/aandlstorage/data/`: the database file and the `uploads/` folder.

- The nightly job (step 8b) makes verified copies in `/srv/aandlstorage/backups`.
- **A backup on the same disk is not enough.** Copy them off the server regularly, for example to another machine
  with `rsync -a /srv/aandlstorage/backups/ you@other-machine:aandl-backups/`, or to cloud storage. Also copy
  `/srv/aandlstorage/data/uploads/`. These files contain customer data: store them privately.
- Manual backup any time: `sudo -u aandl node scripts/backup-sqlite.mjs`

**Restore:**
```bash
sudo systemctl stop aandlstorage
sudo -u aandl cp /srv/aandlstorage/backups/aandlstorage-2026-11-20-033000.db /srv/aandlstorage/data/aandlstorage.db
sudo rm -f /srv/aandlstorage/data/aandlstorage.db-wal /srv/aandlstorage/data/aandlstorage.db-shm
sudo systemctl start aandlstorage
```
Try a restore on a spare copy once, so you know it works before you need it.

---

## Updating the site later

```bash
cd /srv/aandlstorage/app
sudo -u aandl node scripts/backup-sqlite.mjs                  # always back up first
sudo -u aandl git pull
sudo -u aandl npm ci
sudo -u aandl npm run build
sudo systemctl restart aandlstorage
```

**If an update adds a new database column:** SQLite creates missing *tables* by itself, but it does **not** add new
*columns* to tables that already exist. When a change adds a column, the update notes (and `sqlite/schema.sql`) will
include a line to run once, for example:
`sqlite3 /srv/aandlstorage/data/aandlstorage.db "alter table customers add column nickname text not null default ''"`
(stop the site first, start it after).

---

## Going back to Vercel + Supabase

Nothing in Supabase or Vercel was changed by this guide, so you can return:
1. Re-enable the cron job on Vercel and the old Stripe webhook (and disable them on the server).
2. Point DNS back at Vercel.

Anything customers or staff entered **on the server after the switch-over** (new payments, new customers) lives only
in SQLite, so it would have to be re-entered or copied back by hand. Keep the old setup for a couple of weeks before
cancelling anything.

---

## Troubleshooting

| What you see | Likely cause and fix |
|---|---|
| Can't sign in (admin or customer), page just reloads | You are on `http://`, not `https://`. Secure cookies need HTTPS (step 7). |
| `SQLite needs Node.js 22.5 or newer` | `node -v` is too old. Install Node 24 (step 1) and make sure the systemd unit uses it. |
| `unable to open database file` | The `data` folder doesn't exist or isn't owned by `aandl`: `sudo chown -R aandl:aandl /srv/aandlstorage`. |
| `database is locked` | Two copies of the site are running against one file. Run exactly one. |
| Site shows old Supabase data / empty site | `DATABASE_DRIVER=sqlite` isn't set in `.env.local`, or the site wasn't **rebuilt** after the data copy. |
| Admin can't sign in after the move | Check the email exists: `sqlite3 data/aandlstorage.db "select email from admin_users"`. Create or reset one: `sudo -u aandl node scripts/create-admin-user.mjs you@example.com "Your Name"` (it prints a new password). |
| Payments succeed in Stripe but aren't recorded | Webhook problem: wrong `STRIPE_WEBHOOK_SECRET` (Stripe shows `400` for the endpoint), or the endpoint URL is wrong. Stripe retries, so fix it and re-send the events from the Stripe dashboard. |
| `/api/cron/billing` returns 401 | The `Authorization: Bearer ...` value doesn't match `CRON_SECRET`. |
| `502 Bad Gateway` from Caddy | The site isn't running: `sudo systemctl status aandlstorage` and `journalctl -u aandlstorage -n 50`. |
| Uploaded images missing | `UPLOADS_DIR` is wrong, or the `uploads/library` folder wasn't copied (re-run step 4). |
| Customers get "Too many attempts" | Intentional lockout (15 minutes). To clear it: `sqlite3 data/aandlstorage.db "delete from login_attempts"` |

---

## Windows server

Everything above works on Windows Server too (install Node 24 from nodejs.org, Git, and run the same npm and node
commands in PowerShell). The differences:

- Run the site as a service with [NSSM](https://nssm.cc) (`nssm install aandlstorage` and point it at `npm.cmd run start`
  in the app folder, with `NODE_ENV=production`).
- Use **Task Scheduler** instead of cron for the two jobs: a daily task running
  `curl.exe -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" http://127.0.0.1:3000/api/cron/billing`, and one
  running `node scripts\backup-sqlite.mjs D:\backups`.
- For HTTPS, put Caddy (Windows build) or IIS with the URL Rewrite/ARR modules in front of port 3000.
