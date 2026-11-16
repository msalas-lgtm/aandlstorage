-- A&L Self Storage: SQLite schema (used when DATABASE_DRIVER=sqlite).
-- This is the same data model as supabase/schema*.sql, all phases combined, written for SQLite.
-- The site creates these tables by itself the first time it starts, so you normally never run this by hand.
-- Safe to run again: every statement uses "if not exists".
--
-- Conventions the site's SQLite layer relies on:
--   BOOLEAN   columns hold 0/1 and are returned as true/false.
--   JSON_TEXT columns hold JSON text and are returned as objects.
--   Timestamps are ISO-8601 UTC text (for example 2026-11-17T09:30:00.000Z); dates are YYYY-MM-DD text.

create table if not exists site_settings (
  id          integer primary key default 1 check (id = 1),
  data        json_text not null,
  updated_at  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists pages (
  path              text primary key,
  title             text not null,
  description       text not null default '',
  tab_name          text,
  tab_visible       boolean not null default 1,
  footer_link_text  text not null default '',
  login_link_text   text not null default '',
  priority          numeric,
  updated_at        text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  content           json_text not null default '{}'
);

create table if not exists blog_posts (
  slug              text primary key check (slug not glob '*[^A-Za-z0-9_-]*' and slug glob '[A-Za-z0-9]*'),
  title             text not null,
  published_at      text not null,
  meta_title        text not null default '',
  meta_description  text not null default '',
  html              text not null,
  created_at        text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists unit_types (
  id            integer primary key autoincrement,
  name          text not null unique,
  units_count   integer not null default 0,
  price_cents   integer not null check (price_cents >= 0),
  description   text not null default '',
  image_path    text not null default '',
  on_website    boolean not null default 0,
  availability  text not null default 'rent' check (availability in ('rent', 'waiting')),
  note          text not null default '',
  sort_order    integer not null default 0,
  updated_at    text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists images (
  key         text primary key,
  kind        text not null default 'library',
  title       text not null default '',
  alt         text not null default '',
  created_at  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists contact_messages (
  id          integer primary key autoincrement,
  name        text not null,
  email       text not null,
  phone       text not null default '',
  message     text not null,
  status      text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists customers (
  id                      integer primary key autoincrement,
  full_name               text not null,
  username                text not null,
  password_hash           text not null,
  email                   text not null default '',
  phone                   text not null default '',
  cell_phone              text not null default '',
  address                 text not null default '',
  city                    text not null default '',
  state                   text not null default '',
  zip                     text not null default '',
  notes                   text not null default '',
  balance_cents           integer not null default 0,
  login_disabled          boolean not null default 0,
  archived                boolean not null default 0,
  credit_cents            integer not null default 0 check (credit_cents >= 0),
  texting_consent         boolean not null default 0,
  stripe_customer_id      text,
  autopay_payment_method  text,
  autopay_brand           text not null default '',
  autopay_last4           text not null default '',
  autopay_enabled         boolean not null default 0,
  autopay_failures        integer not null default 0,
  autopay_last_error      text not null default '',
  autopay_last_attempt    text,
  created_at              text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at              text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create unique index if not exists customers_username_key on customers (lower(username));
create index if not exists customers_email_idx on customers (lower(email));
create unique index if not exists customers_stripe_customer_idx on customers (stripe_customer_id) where stripe_customer_id is not null;

create table if not exists units (
  id            integer primary key autoincrement,
  name          text not null,
  unit_type_id  integer references unit_types (id) on delete set null,
  status        text not null default 'vacant' check (status in ('vacant', 'reserved', 'rented', 'unavailable')),
  gate_key      text not null default '',
  notes         text not null default '',
  created_at    text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create unique index if not exists units_name_key on units (lower(name));
create index if not exists units_type_status_idx on units (unit_type_id, status);

create table if not exists rentals (
  id                  integer primary key autoincrement,
  customer_id         integer not null references customers (id) on delete cascade,
  unit_name           text not null,
  unit_type_id        integer references unit_types (id) on delete set null,
  unit_id             integer references units (id) on delete set null,
  monthly_rent_cents  integer not null check (monthly_rent_cents >= 0),
  started_on          text not null default (date('now')),
  ended_on            text,
  confirmed           boolean not null default 1,
  created_at          text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists rentals_customer_idx on rentals (customer_id);

create table if not exists rental_requests (
  id                 integer primary key autoincrement,
  unit_type_id       integer references unit_types (id) on delete set null,
  unit_type_name     text not null default '',
  name               text not null,
  email              text not null,
  phone              text not null default '',
  desired_move_in    text,
  notes              text not null default '',
  status             text not null default 'new' check (status in ('new', 'contacted', 'converted', 'declined')),
  created_at         text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists waiting_list (
  id                 integer primary key autoincrement,
  unit_type_id       integer references unit_types (id) on delete set null,
  unit_type_name     text not null default '',
  name               text not null,
  email              text not null,
  phone              text not null default '',
  requested_move_in  text,
  notes              text not null default '',
  status             text not null default 'waiting' check (status in ('waiting', 'notified', 'removed')),
  created_at         text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists admin_users (
  id             integer primary key autoincrement,
  email          text not null,
  name           text not null default '',
  password_hash  text not null,
  disabled       boolean not null default 0,
  created_at     text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at  text
);
create unique index if not exists admin_users_email_key on admin_users (email);

create table if not exists ledger_entries (
  id           integer primary key autoincrement,
  customer_id  integer not null references customers (id) on delete cascade,
  rental_id    integer references rentals (id) on delete set null,
  entry_date   text not null default (date('now')),
  item         text not null,
  description  text not null default '',
  amount_cents integer not null check (amount_cents >= 0),
  tax_cents    integer not null default 0 check (tax_cents >= 0),
  paid_cents   integer not null default 0 check (paid_cents >= 0),
  kind         text not null default 'other',
  created_at   text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists ledger_customer_idx on ledger_entries (customer_id, entry_date);

create table if not exists payments (
  id                     integer primary key autoincrement,
  customer_id            integer not null references customers (id) on delete cascade,
  amount_cents           integer not null check (amount_cents > 0),
  method                 text not null default 'other' check (method in ('cash', 'check', 'card', 'ach', 'other')),
  note                   text not null default '',
  stripe_session_id      text,
  stripe_payment_intent  text,
  created_at             text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists payments_customer_idx on payments (customer_id, created_at);
-- A Stripe payment can only be recorded once, even if Stripe sends its confirmation more than once.
create unique index if not exists payments_stripe_session_idx on payments (stripe_session_id) where stripe_session_id is not null;
create unique index if not exists payments_stripe_intent_idx on payments (stripe_payment_intent) where stripe_payment_intent is not null and stripe_payment_intent <> '';

create table if not exists tasks (
  id           integer primary key autoincrement,
  title        text not null,
  description  text not null default '',
  due_on       text,
  assigned_to  text not null default '',
  recurrence   text not null default 'none' check (recurrence in ('none', 'weekly', 'monthly')),
  done_at      text,
  created_at   text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists fees (
  id           integer primary key autoincrement,
  name         text not null,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  description  text not null default '',
  created_at   text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists tax_rates (
  id           integer primary key autoincrement,
  name         text not null,
  rate_percent numeric not null check (rate_percent >= 0),
  created_at   text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists promotions (
  id             integer primary key autoincrement,
  name           text not null,
  code           text not null,
  discount_type  text not null default 'percent' check (discount_type in ('percent', 'amount')),
  discount_value numeric not null check (discount_value >= 0),
  active         boolean not null default 1,
  description    text not null default '',
  created_at     text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create unique index if not exists promotions_code_key on promotions (lower(code));

create table if not exists products (
  id           integer primary key autoincrement,
  name         text not null,
  sku          text not null default '',
  price_cents  integer not null default 0 check (price_cents >= 0),
  stock        integer not null default 0,
  active       boolean not null default 1,
  created_at   text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists letter_templates (
  id          integer primary key autoincrement,
  name        text not null,
  subject     text not null default '',
  body        text not null,
  created_at  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists late_rules (
  id             integer primary key autoincrement,
  name           text not null,
  days_past_due  integer not null check (days_past_due > 0),
  fee_cents      integer not null default 0 check (fee_cents >= 0),
  active         boolean not null default 1,
  created_at     text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Failed sign-ins and form submissions, for the lockouts and spam limits (lib/rate-limit.ts).
create table if not exists login_attempts (
  id          integer primary key autoincrement,
  key         text not null,
  created_at  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists login_attempts_key_idx on login_attempts (key, created_at desc);
