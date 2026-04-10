-- Multi-tenant and RBAC schema for Supabase
-- Tenants table
create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default now()
);

-- User-Tenant Memberships with Role
create table if not exists tenant_memberships (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'manager', 'user')),
  created_at timestamp with time zone default now(),
  unique (tenant_id, user_id)
);

-- Add organization_id to reports for tenant isolation
alter table if exists reports add column if not exists tenant_id uuid references tenants(id) on delete cascade;
