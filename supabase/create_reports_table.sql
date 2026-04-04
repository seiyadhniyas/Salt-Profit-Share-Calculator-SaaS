-- Create SaaS-ready schema for Salt Profit Share Calculator
-- Run this in the Supabase SQL editor

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  company_name text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists reports (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  user_email text,
  payload jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;
alter table reports enable row level security;

drop policy if exists "Profiles can read own row" on profiles;
drop policy if exists "Profiles can insert own row" on profiles;
drop policy if exists "Profiles can update own row" on profiles;
drop policy if exists "Reports can read own rows" on reports;
drop policy if exists "Reports can insert own rows" on reports;
drop policy if exists "Reports can update own rows" on reports;

create policy "Profiles can read own row"
  on profiles for select
  using (auth.uid() = id);

create policy "Profiles can insert own row"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Profiles can update own row"
  on profiles for update
  using (auth.uid() = id);

create policy "Reports can read own rows"
  on reports for select
  using (auth.uid() = user_id);

create policy "Reports can insert own rows"
  on reports for insert
  with check (auth.uid() = user_id);

create policy "Reports can update own rows"
  on reports for update
  using (auth.uid() = user_id);

create index if not exists idx_reports_created_at on reports (created_at desc);
create index if not exists idx_reports_user_id on reports (user_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
