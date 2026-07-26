-- UFK SHARED SUPABASE UPGRADE
-- Safe to run on the existing UFK Supabase project.
-- Adds live support, manual/admin orders, and the public approved-order log.

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

alter table public.orders add column if not exists payment_method text not null default 'Stripe';
alter table public.orders add column if not exists source text not null default 'website';
alter table public.orders add column if not exists public_log boolean not null default false;
alter table public.orders add column if not exists approved_at timestamptz;
alter table public.orders add column if not exists admin_note text;

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  subject text not null default 'Kit discussion',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('client', 'admin')),
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_public_log_idx on public.orders(public_log, approved_at desc);
create index if not exists support_threads_updated_idx on public.support_threads(updated_at desc);
create index if not exists support_messages_thread_idx on public.support_messages(thread_id, created_at);

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and revoked = false
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
    select 1 from public.profiles
    where id = auth.uid() and revoked = false
  );
$$;

create or replace function public.touch_support_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_threads set updated_at = now() where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists on_support_message_created on public.support_messages;
create trigger on_support_message_created
after insert on public.support_messages
for each row execute procedure public.touch_support_thread();

drop policy if exists "Clients read own profile" on public.profiles;
create policy "Clients read own profile" on public.profiles
for select to authenticated
using ((id = auth.uid() and revoked = false) or public.is_admin());

drop policy if exists "Admins update profiles" on public.profiles;
create policy "Admins update profiles" on public.profiles
for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Clients read own orders" on public.orders;
create policy "Clients read own orders" on public.orders
for select to authenticated
using ((user_id = auth.uid() and public.current_account_active()) or public.is_admin() or public_log = true);

drop policy if exists "Public reads approved order log" on public.orders;
create policy "Public reads approved order log" on public.orders
for select to anon
using (public_log = true);

drop policy if exists "Clients create own orders" on public.orders;
create policy "Clients create own orders" on public.orders
for insert to authenticated
with check (
  user_id = auth.uid()
  and customer_email = (auth.jwt() ->> 'email')
  and source <> 'admin_override'
  and public.current_account_active()
);

drop policy if exists "Admins create all orders" on public.orders;
create policy "Admins create all orders" on public.orders
for insert to authenticated
with check (public.is_admin());

drop policy if exists "Admins update all orders" on public.orders;
create policy "Admins update all orders" on public.orders
for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Clients read own support thread" on public.support_threads;
create policy "Clients read own support thread" on public.support_threads
for select to authenticated
using ((user_id = auth.uid() and public.current_account_active()) or public.is_admin());

drop policy if exists "Clients create own support thread" on public.support_threads;
create policy "Clients create own support thread" on public.support_threads
for insert to authenticated
with check (user_id = auth.uid() and public.current_account_active());

drop policy if exists "Admins update support threads" on public.support_threads;
create policy "Admins update support threads" on public.support_threads
for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Participants read support messages" on public.support_messages;
create policy "Participants read support messages" on public.support_messages
for select to authenticated
using (
  public.is_admin() or exists (
    select 1 from public.support_threads t
    where t.id = thread_id and t.user_id = auth.uid() and public.current_account_active()
  )
);

drop policy if exists "Participants send support messages" on public.support_messages;
create policy "Participants send support messages" on public.support_messages
for insert to authenticated
with check (
  sender_id = auth.uid()
  and (
    (sender_role = 'admin' and public.is_admin())
    or
    (sender_role = 'client' and exists (
      select 1 from public.support_threads t
      where t.id = thread_id and t.user_id = auth.uid() and public.current_account_active()
    ))
  )
);

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
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('ufk-deliveries', 'ufk-deliveries', false)
on conflict (id) do update set public = false;

drop policy if exists "Admins manage UFK deliveries" on storage.objects;
create policy "Admins manage UFK deliveries" on storage.objects
for all to authenticated
using (bucket_id = 'ufk-deliveries' and public.is_admin())
with check (bucket_id = 'ufk-deliveries' and public.is_admin());

drop policy if exists "Clients download own UFK deliveries" on storage.objects;
create policy "Clients download own UFK deliveries" on storage.objects
for select to authenticated
using (
  bucket_id = 'ufk-deliveries'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_account_active()
);

-- Enable realtime updates. Duplicate-object errors are avoided by checking the publication first.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_messages'
  ) then
    alter publication supabase_realtime add table public.support_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- Keep your existing admin role. To promote an account manually, run:
-- update public.profiles set role = 'admin', revoked = false
-- where lower(email) = lower('admin@undisputedfightkit.com');


-- STORE CREDIT UPGRADE
alter table public.profiles add column if not exists store_credit_cents bigint not null default 0 check (store_credit_cents >= 0);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents bigint not null,
  balance_after_cents bigint not null,
  transaction_type text not null,
  note text,
  order_id uuid references public.orders(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_topup_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_email text not null,
  amount_cents bigint not null check (amount_cents > 0),
  payment_method text not null,
  payment_reference text,
  status text not null default 'Waiting for admin approval',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.credit_transactions enable row level security;
alter table public.credit_topup_requests enable row level security;

drop policy if exists "credit transactions own or admin" on public.credit_transactions;
create policy "credit transactions own or admin" on public.credit_transactions for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "topups own or admin select" on public.credit_topup_requests;
create policy "topups own or admin select" on public.credit_topup_requests for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "clients create own topups" on public.credit_topup_requests;
create policy "clients create own topups" on public.credit_topup_requests for insert with check (user_id = auth.uid() and public.current_account_active());
drop policy if exists "admins update topups" on public.credit_topup_requests;
create policy "admins update topups" on public.credit_topup_requests for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.purchase_with_store_credit(p_item_name text, p_price_cents bigint, p_price_label text)
returns setof public.orders
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_email text; v_balance bigint; v_order public.orders;
begin
  if v_uid is null or p_price_cents <= 0 then raise exception 'Invalid purchase'; end if;
  select email, store_credit_cents into v_email, v_balance from public.profiles where id=v_uid and revoked=false for update;
  if not found then raise exception 'Account unavailable'; end if;
  if v_balance < p_price_cents then raise exception 'Insufficient store credit'; end if;
  update public.profiles set store_credit_cents=store_credit_cents-p_price_cents where id=v_uid returning store_credit_cents into v_balance;
  insert into public.orders(invoice_id,user_id,customer_email,item_name,price,order_type,status,payment_method,source,public_log,approved_at,admin_note)
  values ('UFK-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),v_uid,v_email,p_item_name,p_price_label,'paid','Admin approved','Store credit','store_credit',true,now(),'Automatically approved using store credit') returning * into v_order;
  insert into public.credit_transactions(user_id,amount_cents,balance_after_cents,transaction_type,note,order_id,created_by)
  values(v_uid,-p_price_cents,v_balance,'purchase','Store-credit purchase: '||p_item_name,v_order.id,v_uid);
  return next v_order;
end $$;

create or replace function public.admin_adjust_store_credit(p_user_id uuid,p_amount_cents bigint,p_note text)
returns bigint language plpgsql security definer set search_path=public as $$
declare v_balance bigint;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.profiles set store_credit_cents=store_credit_cents+p_amount_cents where id=p_user_id and store_credit_cents+p_amount_cents>=0 returning store_credit_cents into v_balance;
  if not found then raise exception 'Invalid adjustment or insufficient balance'; end if;
  insert into public.credit_transactions(user_id,amount_cents,balance_after_cents,transaction_type,note,created_by) values(p_user_id,p_amount_cents,v_balance,'admin_adjustment',p_note,auth.uid());
  return v_balance;
end $$;

create or replace function public.approve_credit_topup(p_request_id uuid)
returns bigint language plpgsql security definer set search_path=public as $$
declare r public.credit_topup_requests; v_balance bigint;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into r from public.credit_topup_requests where id=p_request_id for update;
  if not found or r.status <> 'Waiting for admin approval' then raise exception 'Request is not pending'; end if;
  update public.profiles set store_credit_cents=store_credit_cents+r.amount_cents where id=r.user_id returning store_credit_cents into v_balance;
  update public.credit_topup_requests set status='Approved',approved_by=auth.uid(),approved_at=now() where id=p_request_id;
  insert into public.credit_transactions(user_id,amount_cents,balance_after_cents,transaction_type,note,created_by) values(r.user_id,r.amount_cents,v_balance,'topup',coalesce(r.payment_method,'Other')||' top-up: '||coalesce(r.payment_reference,'No reference'),auth.uid());
  return v_balance;
end $$;

grant execute on function public.purchase_with_store_credit(text,bigint,text) to authenticated;
grant execute on function public.admin_adjust_store_credit(uuid,bigint,text) to authenticated;
grant execute on function public.approve_credit_topup(uuid) to authenticated;
