-- A&L Self Storage: database tables, phase 2 (tenants, rentals, requests, admin users).
-- Run once in Supabase: SQL Editor > New query > paste > Run. Run schema.sql first.
-- Safe to run again: every statement uses "if not exists".

-- Customers (tenants). Passwords are stored only as salted scrypt hashes, never as plain text.
create table if not exists public.customers (
  id              bigint generated always as identity primary key,
  full_name       text not null,
  username        text not null,
  password_hash   text not null,
  email           text not null default '',
  phone           text not null default '',
  cell_phone      text not null default '',
  address         text not null default '',
  city            text not null default '',
  state           text not null default '',
  zip             text not null default '',
  notes           text not null default '',
  balance_cents   int not null default 0,
  login_disabled  boolean not null default false,
  archived        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- Usernames are unique regardless of capitalization.
create unique index if not exists customers_username_key on public.customers (lower(username));
create index if not exists customers_email_idx on public.customers (lower(email));

-- Units rented by a customer.
create table if not exists public.rentals (
  id                  bigint generated always as identity primary key,
  customer_id         bigint not null references public.customers (id) on delete cascade,
  unit_name           text not null,
  unit_type_id        bigint references public.unit_types (id) on delete set null,
  monthly_rent_cents  int not null check (monthly_rent_cents >= 0),
  started_on          date not null default current_date,
  ended_on            date,
  created_at          timestamptz not null default now()
);
create index if not exists rentals_customer_idx on public.rentals (customer_id);

-- "Rent Now" requests from the Rent page.
create table if not exists public.rental_requests (
  id                 bigint generated always as identity primary key,
  unit_type_id       bigint references public.unit_types (id) on delete set null,
  unit_type_name     text not null default '',
  name               text not null,
  email              text not null,
  phone              text not null default '',
  desired_move_in    date,
  notes              text not null default '',
  status             text not null default 'new' check (status in ('new', 'contacted', 'converted', 'declined')),
  created_at         timestamptz not null default now()
);

-- "Waiting List" sign-ups from the Rent page.
create table if not exists public.waiting_list (
  id                 bigint generated always as identity primary key,
  unit_type_id       bigint references public.unit_types (id) on delete set null,
  unit_type_name     text not null default '',
  name               text not null,
  email              text not null,
  phone              text not null default '',
  requested_move_in  date,
  notes              text not null default '',
  status             text not null default 'waiting' check (status in ('waiting', 'notified', 'removed')),
  created_at         timestamptz not null default now()
);

-- People who can sign in to the admin dashboard (each with their own email and password).
create table if not exists public.admin_users (
  id             bigint generated always as identity primary key,
  email          text not null,
  name           text not null default '',
  password_hash  text not null,
  disabled       boolean not null default false,
  created_at     timestamptz not null default now(),
  last_login_at  timestamptz
);
create unique index if not exists admin_users_email_key on public.admin_users (email);  -- emails are always stored in lowercase

-- Lock every table. No policies means browser keys can't read or write anything;
-- the site's server uses the secret key, so all access stays behind the admin and tenant logins.
alter table public.customers        enable row level security;
alter table public.rentals          enable row level security;
alter table public.rental_requests  enable row level security;
alter table public.waiting_list     enable row level security;
alter table public.admin_users      enable row level security;
