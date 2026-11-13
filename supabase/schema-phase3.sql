-- A&L Self Storage: database changes, phase 3 (units inventory, online rentals, editable Rent page text).
-- Run once in Supabase: SQL Editor > New query > paste > Run. Run schema.sql and schema-phase2.sql first.
-- Safe to run again: every statement uses "if not exists".

-- Individual storage units. A unit type's availability on the Rent page is counted from these rows.
create table if not exists public.units (
  id            bigint generated always as identity primary key,
  name          text not null,
  unit_type_id  bigint references public.unit_types (id) on delete set null,
  status        text not null default 'vacant' check (status in ('vacant', 'reserved', 'rented', 'unavailable')),
  gate_key      text not null default '',
  notes         text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- Unit numbers are unique regardless of capitalization.
create unique index if not exists units_name_key on public.units (lower(name));
create index if not exists units_type_status_idx on public.units (unit_type_id, status);

-- Link a rental to the unit it rents, and mark online rentals as waiting for the office to confirm.
alter table public.rentals add column if not exists unit_id bigint references public.units (id) on delete set null;
alter table public.rentals add column if not exists confirmed boolean not null default true;

-- Editable text blocks for a page (used by the Rent page: heading, intro, steps, "why rent" blocks).
alter table public.pages add column if not exists content jsonb not null default '{}'::jsonb;

-- Lock the table. No policies means browser keys can't read or write anything;
-- the site's server uses the secret key, so all access stays behind the admin and tenant logins.
alter table public.units enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Billing (powers the customer Statement and Dashboard balance, and the admin billing tools).
-- ---------------------------------------------------------------------------------------------

-- A charge on a customer's account (rent, late fee, ...). paid_cents is how much of it has been paid.
create table if not exists public.ledger_entries (
  id           bigint generated always as identity primary key,
  customer_id  bigint not null references public.customers (id) on delete cascade,
  rental_id    bigint references public.rentals (id) on delete set null,
  entry_date   date not null default current_date,
  item         text not null,
  description  text not null default '',
  amount_cents int not null check (amount_cents >= 0),
  tax_cents    int not null default 0 check (tax_cents >= 0),
  paid_cents   int not null default 0 check (paid_cents >= 0),
  created_at   timestamptz not null default now()
);
create index if not exists ledger_customer_idx on public.ledger_entries (customer_id, entry_date);

-- Payments received (cash, check, card, ...). Applied to the oldest charges first; any extra becomes credit.
create table if not exists public.payments (
  id           bigint generated always as identity primary key,
  customer_id  bigint not null references public.customers (id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  method       text not null default 'other' check (method in ('cash', 'check', 'card', 'ach', 'other')),
  note         text not null default '',
  created_at   timestamptz not null default now()
);
create index if not exists payments_customer_idx on public.payments (customer_id, created_at);

-- Customer credit, and the "I agree to receive text messages" choice from Edit Profile.
alter table public.customers add column if not exists credit_cents int not null default 0 check (credit_cents >= 0);
alter table public.customers add column if not exists texting_consent boolean not null default false;

alter table public.ledger_entries enable row level security;
alter table public.payments       enable row level security;
