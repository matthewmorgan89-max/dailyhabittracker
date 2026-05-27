-- ─── Profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamptz default now() not null
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Signal Items ─────────────────────────────────────────────────────────────
create table if not exists public.signal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  title text not null,
  completed boolean default false not null,
  completed_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists signal_items_user_date on public.signal_items(user_id, date);

-- ─── Habit Completions ────────────────────────────────────────────────────────
create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  habit_key text not null,
  date date not null,
  completed_at timestamptz default now() not null,
  unique(user_id, habit_key, date)
);

create index if not exists habit_completions_user_date on public.habit_completions(user_id, date);

-- ─── Vouch Outreach ───────────────────────────────────────────────────────────
create table if not exists public.vouch_outreach (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  mass_count integer default 0 not null,
  personalised_name text,
  updated_at timestamptz default now() not null,
  unique(user_id, date)
);

create index if not exists vouch_outreach_user_date on public.vouch_outreach(user_id, date);

-- ─── Evening Reflections ──────────────────────────────────────────────────────
create table if not exists public.evening_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  frog_eaten boolean not null,
  wins text,
  tomorrow_signal text[] default '{}',
  created_at timestamptz default now() not null,
  unique(user_id, date)
);

-- ─── Push Subscriptions ───────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  subscription jsonb not null,
  updated_at timestamptz default now() not null,
  unique(user_id)
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.signal_items enable row level security;
alter table public.habit_completions enable row level security;
alter table public.vouch_outreach enable row level security;
alter table public.evening_reflections enable row level security;
alter table public.push_subscriptions enable row level security;

-- Profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Signal items
create policy "Users can manage own signal items" on public.signal_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Habit completions
create policy "Users can manage own completions" on public.habit_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Vouch outreach
create policy "Users can manage own outreach" on public.vouch_outreach
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Evening reflections
create policy "Users can manage own reflections" on public.evening_reflections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Push subscriptions
create policy "Users can manage own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
