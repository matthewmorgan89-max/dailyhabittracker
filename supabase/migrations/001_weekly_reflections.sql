-- Run this in Supabase SQL Editor after the initial schema.sql

create table if not exists public.weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  week_start date not null,
  social_done boolean default false not null,
  reflection text,
  created_at timestamptz default now() not null,
  unique(user_id, week_start)
);

alter table public.weekly_reflections enable row level security;

create policy "Users can manage own weekly reflections" on public.weekly_reflections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
