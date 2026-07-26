-- UFK SHARED SUPABASE SETUP
-- Run this entire file once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'UFK Client',
  email text not null,
  role text not null default 'client' check (role in ('client', 'admin')),
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  invoice_id text unique not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_email text not null,
  item_name text not null,
  price text not null,
  order_type text not null check (order_type in ('free', 'paid')),
  status text not null default 'Order created',
  stripe_session_id text,
  delivery_path text,
  delivery_filename text,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

alter table public.profiles enable row level security;
alter table public.orders enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and revoked = false
  );
$$;

create or replace function public.current_account_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and revoked = false
  );
$$;

drop policy if exists "Clients read own profile" on public.profiles;
create policy "Clients read own profile"
on public.profiles for select
to authenticated
using ((id = auth.uid() and revoked = false) or public.is_admin());

drop policy if exists "Admins update profiles" on public.profiles;
create policy "Admins update profiles"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Clients read own orders" on public.orders;
create policy "Clients read own orders"
on public.orders for select
to authenticated
using (
  (user_id = auth.uid() and public.current_account_active())
  or public.is_admin()
);

drop policy if exists "Clients create own orders" on public.orders;
create policy "Clients create own orders"
on public.orders for insert
to authenticated
with check (
  user_id = auth.uid()
  and customer_email = (auth.jwt() ->> 'email')
  and public.current_account_active()
);

drop policy if exists "Admins update all orders" on public.orders;
create policy "Admins update all orders"
on public.orders for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'UFK Client'),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Create the private delivery bucket.
insert into storage.buckets (id, name, public)
values ('ufk-deliveries', 'ufk-deliveries', false)
on conflict (id) do update set public = false;

drop policy if exists "Admins manage UFK deliveries" on storage.objects;
create policy "Admins manage UFK deliveries"
on storage.objects
for all
to authenticated
using (bucket_id = 'ufk-deliveries' and public.is_admin())
with check (bucket_id = 'ufk-deliveries' and public.is_admin());

drop policy if exists "Clients download own UFK deliveries" on storage.objects;
create policy "Clients download own UFK deliveries"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ufk-deliveries'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_account_active()
);

-- AFTER registering your own account, replace the email below and run only this statement:
-- update public.profiles set role = 'admin' where email = 'YOUR-ADMIN-EMAIL@example.com';
