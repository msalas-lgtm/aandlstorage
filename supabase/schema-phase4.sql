-- A&L Self Storage: database changes, phase 4 (admin tools: tasks, fees, taxes, promotions, retail products,
-- letter templates, late-fee rules, charge types). Run once in Supabase: SQL Editor > New query > paste > Run.
-- Run schema.sql, schema-phase2.sql and schema-phase3.sql first. Safe to run again.

create table if not exists public.tasks (
  id           bigint generated always as identity primary key,
  title        text not null,
  description  text not null default '',
  due_on       date,
  assigned_to  text not null default '',
  recurrence   text not null default 'none' check (recurrence in ('none', 'weekly', 'monthly')),
  done_at      timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.fees (
  id           bigint generated always as identity primary key,
  name         text not null,
  amount_cents int not null default 0 check (amount_cents >= 0),
  description  text not null default '',
  created_at   timestamptz not null default now()
);

create table if not exists public.tax_rates (
  id           bigint generated always as identity primary key,
  name         text not null,
  rate_percent numeric(6, 3) not null check (rate_percent >= 0),
  created_at   timestamptz not null default now()
);

create table if not exists public.promotions (
  id             bigint generated always as identity primary key,
  name           text not null,
  code           text not null,
  discount_type  text not null default 'percent' check (discount_type in ('percent', 'amount')),
  discount_value numeric(10, 2) not null check (discount_value >= 0),
  active         boolean not null default true,
  description    text not null default '',
  created_at     timestamptz not null default now()
);
create unique index if not exists promotions_code_key on public.promotions (lower(code));

create table if not exists public.products (
  id           bigint generated always as identity primary key,
  name         text not null,
  sku          text not null default '',
  price_cents  int not null default 0 check (price_cents >= 0),
  stock        int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.letter_templates (
  id          bigint generated always as identity primary key,
  name        text not null,
  subject     text not null default '',
  body        text not null,
  created_at  timestamptz not null default now()
);

-- Late fees: a charge that is this many days overdue gets this fee (applied by Monthly Billing).
create table if not exists public.late_rules (
  id             bigint generated always as identity primary key,
  name           text not null,
  days_past_due  int not null check (days_past_due > 0),
  fee_cents      int not null default 0 check (fee_cents >= 0),
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- What kind of charge this is (used by reports): rent, fee, late_fee, retail or other.
alter table public.ledger_entries add column if not exists kind text not null default 'other';

alter table public.tasks            enable row level security;
alter table public.fees             enable row level security;
alter table public.tax_rates        enable row level security;
alter table public.promotions       enable row level security;
alter table public.products         enable row level security;
alter table public.letter_templates enable row level security;
alter table public.late_rules       enable row level security;
