-- Run once in Supabase Dashboard → SQL Editor.

create table if not exists public.attempts (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  quiz_key      text not null,              -- "physics", "maths-2026", "power_drive_vol_3"
  subject       text not null,              -- "physics"
  year          int,                        -- 2026, or null for chapter practice
  total         int  not null,
  attempted     int  not null,
  correct       int  not null,
  wrong         int  not null,
  skipped       int  not null,
  percentage    int  not null,
  chapter_stats jsonb not null default '{}', -- {"Optics": {"total": 20, "attempted": 15, "correct": 12}}
  created_at    timestamptz not null default now()
);

create index if not exists attempts_user_created_idx on public.attempts (user_id, created_at desc);

alter table public.attempts enable row level security;

drop policy if exists "read own attempts" on public.attempts;
create policy "read own attempts" on public.attempts
  for select using (auth.uid() = user_id);

drop policy if exists "insert own attempts" on public.attempts;
create policy "insert own attempts" on public.attempts
  for insert with check (auth.uid() = user_id);

drop policy if exists "delete own attempts" on public.attempts;
create policy "delete own attempts" on public.attempts
  for delete using (auth.uid() = user_id);
