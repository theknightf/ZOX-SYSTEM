-- ════════════════════════════════════════════════════════════════════
-- ZOX operational hardening
--   1. Customer phone → account history linking (with safeguards)
--   2. notifications table (real notify-customer infrastructure)
--   3. adjust_inventory: staff may only INCREASE stock (server-enforced)
--   4. room_slot_conflict(): capacity/overlap helper for reservations
--   5. Safe uniqueness for well-formed customer phone numbers
-- All changes are additive; no existing data is modified or dropped.
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1a. Find a single customer by exact phone match
-- ─────────────────────────────────────────────────────────────
create or replace function public.find_customer_by_phone(p_phone text)
returns table (id uuid, name text, phone text, email text, tier loyalty_tier,
               loyalty_points int, visits int, total_spent numeric)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.phone, c.email, c.tier, c.loyalty_points, c.visits, c.total_spent
  from public.customers c
  where c.phone = nullif(trim(p_phone), '')
  order by c.visits desc
  limit 2;
$$;

-- ─────────────────────────────────────────────────────────────
-- 1b. History linking: when a customer row gains an auth account,
--     attach orphan records that share the same phone number.
--     Safeguards:
--       • phone must be non-empty
--       • only rows with customer_id IS NULL are claimed
--       • another active customer with the same phone blocks the link
-- ─────────────────────────────────────────────────────────────
create or replace function public.link_history_by_phone()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_phone text := nullif(trim(new.phone), '');
  v_other uuid;
begin
  if new.auth_user_id is null or v_phone is null then
    return new;
  end if;

  select c.id into v_other
  from public.customers c
  where c.phone = v_phone and c.id <> new.id and c.auth_user_id is not null
  limit 1;
  if v_other is not null then
    raise notice 'phone-history link skipped: another account already owns phone %', v_phone;
    return new;
  end if;

  update public.reservations r
     set customer_id = new.id
   where r.phone = v_phone and r.customer_id is null;

  update public.live_sessions s
     set customer_id = new.id
   where s.phone = v_phone and s.customer_id is null and s.status = 'completed';

  update public.sales sl
     set customer_id = new.id
   where sl.customer_id is null
     and exists (
       select 1 from public.live_sessions ls
       where ls.id = sl.session_id and ls.phone = v_phone
     );

  return new;
end;
$$;

drop trigger if exists trg_customers_link_history on public.customers;
create trigger trg_customers_link_history
after insert or update of auth_user_id, phone on public.customers
for each row execute function public.link_history_by_phone();

-- ─────────────────────────────────────────────────────────────
-- 2. notifications — real infrastructure for "Notify Customer"
-- ─────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  phone text not null default '',
  title text not null,
  body text not null default '',
  kind text not null default 'info'
    check (kind in ('info','lost-found','reservation','session')),
  room_id uuid references public.rooms(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                 where tablename='notifications' and policyname='notifications_staff_all') then
    create policy notifications_staff_all on public.notifications
      for all to authenticated
      using (public.is_staff_plus())
      with check (public.is_staff_plus());
  end if;
  if not exists (select 1 from pg_policies
                 where tablename='notifications' and policyname='notifications_customer_read') then
    create policy notifications_customer_read on public.notifications
      for select to authenticated
      using (customer_id = public.own_customer_id());
  end if;
end $$;

-- realtime push for staff dashboards
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3. adjust_inventory — server-side role enforcement:
--    staff may only INCREASE stock; manager/owner unrestricted.
--    (Keeps the existing signature + audit trigger behaviour.)
-- ─────────────────────────────────────────────────────────────
create or replace function public.adjust_inventory(
  p_item_id uuid,
  p_delta int,
  p_reason text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_role app_role;
begin
  select coalesce(public.current_app_role(), 'customer') into v_role;

  if v_role = 'staff' and p_delta < 0 then
    raise exception 'Staff can only increase stock. Ask a manager for decreases.';
  end if;
  if v_role not in ('staff','manager','owner') then
    raise exception 'Not permitted';
  end if;

  update public.inventory_items
     set stock = greatest(0, stock + p_delta),
         status = case
           when greatest(0, stock + p_delta) <= 0 then 'Out of Stock'
           when greatest(0, stock + p_delta) <= reorder_level then 'Low Stock'
           else 'In Stock'
         end,
         last_restocked = case when p_delta > 0 then now() else last_restocked end
   where id = p_item_id;

  if p_reason is not null and p_reason <> '' then
    insert into public.inventory_movements (item_id, delta, reason, actor_id)
    values (p_item_id, p_delta, p_reason, auth.uid());
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. room_slot_conflict — overlap check for reservations
--    Considers Reserved/Arrived/Active reservations on the room
--    for the same date whose time window overlaps the request.
-- ─────────────────────────────────────────────────────────────
create or replace function public.room_slot_conflict(
  p_room_id uuid,
  p_date date,
  p_time time,
  p_duration_minutes int,
  p_exclude_reservation uuid default null
) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.reservations r
    where r.room_id = p_room_id
      and r.res_date = p_date
      and r.status in ('Reserved','Arrived','Active','Waiting','Late')
      and r.id is distinct from p_exclude_reservation
      and (p_duration_minutes is null
           or r.duration_minutes is null
           or (r.res_time < (p_time + make_interval(mins => p_duration_minutes))
               and (r.res_time + make_interval(mins => r.duration_minutes)) > p_time))
  );
$$;

grant execute on function public.find_customer_by_phone(text) to authenticated;
grant execute on function public.room_slot_conflict(uuid, date, time, int, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. Prevent duplicate real customers by phone (well-formed only,
--    so legacy placeholder values like '—' are unaffected).
-- ─────────────────────────────────────────────────────────────
create unique index if not exists customers_phone_unique_fmt
  on public.customers (phone)
  where phone ~ '^01[0-9]{9}$';

-- ─────────────────────────────────────────────────────────────
-- 6. Waiting list ↔ customer linking
-- ─────────────────────────────────────────────────────────────
alter table public.waiting_list
  add column if not exists customer_id uuid references public.customers(id) on delete set null;
