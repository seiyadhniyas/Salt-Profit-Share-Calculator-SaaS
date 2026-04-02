-- Create reports table for Salt Profit Share Calculator
-- Run this in Supabase SQL editor

create table if not exists reports (
  id bigserial primary key,
  payload jsonb,
  created_at timestamptz default now()
);

-- Optional: create an index on created_at for faster queries
create index if not exists idx_reports_created_at on reports (created_at desc);
