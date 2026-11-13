-- Stripe card payments. Run this once in Supabase > SQL Editor (safe to run again).
-- The unique index makes it impossible to record the same Stripe payment twice, even if Stripe
-- sends its confirmation more than once.
alter table public.payments add column if not exists stripe_session_id text;
alter table public.payments add column if not exists stripe_payment_intent text;
create unique index if not exists payments_stripe_session_idx
  on public.payments (stripe_session_id) where stripe_session_id is not null;
