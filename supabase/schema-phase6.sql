-- Recurring billing (autopay) with Stripe. Run this once in Supabase > SQL Editor (safe to run again).
-- Only Stripe's ids and the card's brand and last 4 digits are stored. Card numbers never reach this site.
alter table public.customers add column if not exists stripe_customer_id text;
alter table public.customers add column if not exists autopay_payment_method text;
alter table public.customers add column if not exists autopay_brand text not null default '';
alter table public.customers add column if not exists autopay_last4 text not null default '';
alter table public.customers add column if not exists autopay_enabled boolean not null default false;
alter table public.customers add column if not exists autopay_failures int not null default 0;
alter table public.customers add column if not exists autopay_last_error text not null default '';
alter table public.customers add column if not exists autopay_last_attempt date;

create unique index if not exists customers_stripe_customer_idx
  on public.customers (stripe_customer_id) where stripe_customer_id is not null;

-- A Stripe payment can only be recorded once, even if it is retried.
create unique index if not exists payments_stripe_intent_idx
  on public.payments (stripe_payment_intent) where stripe_payment_intent is not null and stripe_payment_intent <> '';
