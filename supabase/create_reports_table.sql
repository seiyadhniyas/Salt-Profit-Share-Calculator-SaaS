-- Create SaaS-ready schema for Salt Profit Share Calculator
-- Run this in the Supabase SQL editor

-- SAFETY: Drop and recreate for clean state (safe if you've migrated data elsewhere)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.consume_trial_use(uuid);
drop index if exists idx_payment_requests_status;
drop index if exists idx_payment_requests_user_id;
drop index if exists idx_saved_files_user_id;
drop index if exists idx_saved_files_created_at;
drop index if exists idx_reports_user_id;
drop index if exists idx_reports_created_at;
drop table if exists payment_requests cascade;
drop table if exists billing_profiles cascade;
drop table if exists saved_files cascade;
drop table if exists reports cascade;
drop table if exists profiles cascade;

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  company_name text,
  phone text,
  is_admin boolean not null default false,
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

create table if not exists saved_files (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  user_email text,
  report_id bigint references reports(id) on delete set null,
  bucket text not null default 'saved-files',
  file_name text not null,
  file_path text not null unique,
  mime_type text not null default 'application/pdf',
  file_size bigint,
  storage_url text,
  payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists billing_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trial_limit integer not null default 3,
  trial_uses integer not null default 0,
  payment_status text not null default 'trial' check (payment_status in ('trial', 'payment_pending_verification', 'active', 'payment_failed')),
  full_access_enabled boolean not null default false,
  last_payment_reference text,
  last_payment_method text,
  last_payment_amount numeric(12,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists payment_requests (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  user_email text,
  amount_lkr numeric(12,2) not null default 30000,
  currency text not null default 'lkr',
  payment_method text not null check (payment_method in ('card', 'cash')),
  stripe_session_id text,
  stripe_payment_intent text,
  status text not null default 'pending' check (status in ('pending', 'paid_pending_verification', 'verified_active', 'rejected', 'failed')),
  verified_by_admin uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  admin_note text,
  metadata jsonb,
  admin_notified boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into storage.buckets (id, name, public)
values ('saved-files', 'saved-files', true)
on conflict (id) do nothing;

alter table profiles enable row level security;
alter table reports enable row level security;
alter table saved_files enable row level security;
alter table billing_profiles enable row level security;
alter table payment_requests enable row level security;

drop policy if exists "Profiles can read own row" on profiles;
drop policy if exists "Profiles can insert own row" on profiles;
drop policy if exists "Profiles can update own row" on profiles;
drop policy if exists "Reports can read own rows" on reports;
drop policy if exists "Reports can insert own rows" on reports;
drop policy if exists "Reports can update own rows" on reports;
drop policy if exists "Saved files can read own rows" on saved_files;
drop policy if exists "Saved files can insert own rows" on saved_files;
drop policy if exists "Saved files can update own rows" on saved_files;
drop policy if exists "Saved files can delete own rows" on saved_files;
drop policy if exists "Billing profiles can read own row" on billing_profiles;
drop policy if exists "Billing profiles can insert own row" on billing_profiles;
drop policy if exists "Billing profiles can update own row" on billing_profiles;
drop policy if exists "Payment requests can read own rows" on payment_requests;
drop policy if exists "Payment requests can insert own rows" on payment_requests;

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

create policy "Saved files can read own rows"
  on saved_files for select
  using (auth.uid() = user_id);

create policy "Saved files can insert own rows"
  on saved_files for insert
  with check (auth.uid() = user_id);

create policy "Saved files can update own rows"
  on saved_files for update
  using (auth.uid() = user_id);

create policy "Saved files can delete own rows"
  on saved_files for delete
  using (auth.uid() = user_id);

create policy "Billing profiles can read own row"
  on billing_profiles for select
  using (auth.uid() = user_id);

create policy "Billing profiles can insert own row"
  on billing_profiles for insert
  with check (auth.uid() = user_id);

create policy "Billing profiles can update own row"
  on billing_profiles for update
  using (auth.uid() = user_id);

create policy "Payment requests can read own rows"
  on payment_requests for select
  using (auth.uid() = user_id);

create policy "Payment requests can insert own rows"
  on payment_requests for insert
  with check (auth.uid() = user_id);

create index if not exists idx_reports_created_at on reports (created_at desc);
create index if not exists idx_reports_user_id on reports (user_id, created_at desc);
create index if not exists idx_saved_files_created_at on saved_files (created_at desc);
create index if not exists idx_saved_files_user_id on saved_files (user_id, created_at desc);
create index if not exists idx_payment_requests_user_id on payment_requests (user_id, created_at desc);
create index if not exists idx_payment_requests_status on payment_requests (status, created_at desc);

create policy "Storage files can read own objects"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'saved-files' and owner = auth.uid());

create policy "Storage files can insert own objects"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'saved-files' and owner = auth.uid());

create policy "Storage files can update own objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'saved-files' and owner = auth.uid());

create policy "Storage files can delete own objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'saved-files' and owner = auth.uid());

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

  insert into public.billing_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.consume_trial_use(p_user_id uuid)
returns table (
  allowed boolean,
  trial_uses integer,
  trial_limit integer,
  remaining integer,
  full_access_enabled boolean,
  payment_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile billing_profiles%rowtype;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;

  insert into billing_profiles (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_profile
  from billing_profiles
  where user_id = p_user_id
  for update;

  if v_profile.full_access_enabled then
    return query
      select true, v_profile.trial_uses, v_profile.trial_limit,
             greatest(0, v_profile.trial_limit - v_profile.trial_uses),
             v_profile.full_access_enabled, v_profile.payment_status;
    return;
  end if;

  if v_profile.trial_uses < v_profile.trial_limit then
    update billing_profiles
      set trial_uses = v_profile.trial_uses + 1,
          updated_at = now()
      where user_id = p_user_id
      returning * into v_profile;

    return query
      select true, v_profile.trial_uses, v_profile.trial_limit,
             greatest(0, v_profile.trial_limit - v_profile.trial_uses),
             v_profile.full_access_enabled, v_profile.payment_status;
    return;
  end if;

  return query
    select false, v_profile.trial_uses, v_profile.trial_limit,
           0, v_profile.full_access_enabled, v_profile.payment_status;
end;
$$;

grant execute on function public.consume_trial_use(uuid) to authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
