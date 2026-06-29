-- ============================================================
-- Society Expense Tracker — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. CATEGORIES TABLE
-- Pre-seeded with common society expense categories, but committee
-- members can add their own custom ones too.
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

insert into categories (name) values
  ('Electricity'),
  ('Water'),
  ('Security Staff'),
  ('Maintenance Staff'),
  ('Cleaning'),
  ('Repairs'),
  ('Gardening'),
  ('Lift/Elevator'),
  ('Insurance'),
  ('Events'),
  ('Other');

-- 2. EXPENSES TABLE
create table expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  amount numeric(10, 2) not null check (amount > 0),
  category_id uuid references categories(id) not null,
  vendor text,
  paid_by text not null,           -- name of who paid (free text, since not all payers may have logins)
  notes text,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_expenses_date on expenses(expense_date desc);
create index idx_expenses_category on expenses(category_id);

-- 3. BILL FILES TABLE
-- One expense can have multiple attached files (bill photo, receipt, etc.)
create table bill_files (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade not null,
  storage_path text not null,      -- path inside the 'bills' storage bucket
  file_name text not null,
  uploaded_by uuid references auth.users(id) not null,
  uploaded_at timestamptz not null default now()
);

create index idx_bill_files_expense on bill_files(expense_id);

-- 4. AUTO-UPDATE updated_at ON EXPENSES
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_expenses_updated_at
before update on expenses
for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Everyone who is logged in (committee members) has equal access:
-- read/insert/update/delete on expenses, categories, bill_files.
-- No public (anonymous) access at all — must be authenticated.
-- ============================================================

alter table categories enable row level security;
alter table expenses enable row level security;
alter table bill_files enable row level security;

-- Categories: any logged-in user can read and add new categories
create policy "Authenticated users can read categories"
  on categories for select
  to authenticated
  using (true);

create policy "Authenticated users can add categories"
  on categories for insert
  to authenticated
  with check (true);

-- Expenses: any logged-in user can read, insert, update, delete
create policy "Authenticated users can read expenses"
  on expenses for select
  to authenticated
  using (true);

create policy "Authenticated users can insert expenses"
  on expenses for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update expenses"
  on expenses for update
  to authenticated
  using (true);

create policy "Authenticated users can delete expenses"
  on expenses for delete
  to authenticated
  using (true);

-- Bill files: same equal-access pattern
create policy "Authenticated users can read bill files"
  on bill_files for select
  to authenticated
  using (true);

create policy "Authenticated users can insert bill files"
  on bill_files for insert
  to authenticated
  with check (true);

create policy "Authenticated users can delete bill files"
  on bill_files for delete
  to authenticated
  using (true);

-- ============================================================
-- STORAGE BUCKET for bill photos/PDFs
-- Run this part too — creates a private bucket named 'bills'
-- ============================================================

insert into storage.buckets (id, name, public)
values ('bills', 'bills', false)
on conflict (id) do nothing;

create policy "Authenticated users can upload bills"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'bills');

create policy "Authenticated users can read bills"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'bills');

create policy "Authenticated users can delete bills"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'bills');

-- ============================================================
-- 5. PROFILES TABLE (display_name → auth_email mapping)
-- Used at login time to find the auth email for a given display
-- name, so users who changed their display name can still log in
-- with it. Populated by settings.tsx whenever display_name changes.
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text unique,
  auth_email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Anyone (even unauthenticated) can read profiles — needed during login
-- to look up which auth email corresponds to a display name.
create policy "Anyone can read profiles for login"
  on profiles for select
  using (true);

-- Authenticated users can upsert their own profile row
create policy "Users can manage their own profile"
  on profiles for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- NOTE ON ADMIN ROLES
-- The `role` column on `profiles` (admin/member) is enforced
-- server-side by the user-management Edge Function. RLS on
-- expenses/categories/bill_files remains unchanged — everyone
-- has equal access there regardless of role.
-- ============================================================
