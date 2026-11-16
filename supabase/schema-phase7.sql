-- Failed sign-in attempts, so the lockout on the admin and customer logins survives server restarts
-- and works across every server instance. Run this once in the Supabase SQL editor.
create table if not exists public.login_attempts (
  id          bigint generated always as identity primary key,
  key         text not null,
  created_at  timestamptz not null default now()
);
create index if not exists login_attempts_key_idx on public.login_attempts (key, created_at desc);
alter table public.login_attempts enable row level security;  -- no policies: only the server's secret key can use it
