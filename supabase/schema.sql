-- Barber Room: database for live mode. Paste into Supabase → SQL editor → Run, once.
-- With settings.chairs = 1 (the default) two appointments can never overlap: book() refuses the second one.
-- Visitors can read the opening settings and the busy times (no names, no numbers) and can book only through book(),
-- which re-checks the slot under a lock. Everything else is for the signed-in owner.

create extension if not exists pgcrypto;

create table if not exists settings (
  id   int primary key default 1 check (id = 1),
  data jsonb not null
);

create table if not exists bookings (
  id         uuid primary key default gen_random_uuid(),
  code       text not null default upper(substr(md5(gen_random_uuid()::text), 1, 5)),
  day        date not null,
  start_min  int  not null check (start_min between 0 and 1440),
  end_min    int  not null check (end_min > start_min and end_min <= 1440),
  services   jsonb not null default '[]',
  name       text not null default '',
  phone      text not null default '',
  email      text not null default '',
  note       text not null default '',
  lang       text not null default 'it',
  status     text not null default 'confirmed' check (status in ('confirmed', 'completed', 'no_show', 'cancelled', 'blocked')),
  source     text not null default 'web',
  created_at timestamptz not null default now()
);
create index if not exists bookings_day on bookings (day, start_min);

alter table settings enable row level security;
alter table bookings enable row level security;

-- Anyone may read the settings (services, hours); only the owner may change them.
drop policy if exists settings_read on settings;
create policy settings_read on settings for select using (true);
drop policy if exists settings_owner on settings;
create policy settings_owner on settings for all to authenticated using (true) with check (true);

-- Bookings: the owner sees and edits everything; visitors get nothing directly.
drop policy if exists bookings_owner on bookings;
create policy bookings_owner on bookings for all to authenticated using (true) with check (true);

-- Busy times for the booking calendar: no personal data leaves the database.
create or replace function busy(d1 date, d2 date)
returns table (day date, start_min int, end_min int, status text)
language sql security definer set search_path = public as $$
  select b.day, b.start_min, b.end_min, b.status from bookings b
  where b.day between d1 and d2 and b.status in ('confirmed', 'completed', 'blocked');
$$;

-- Create a booking if the slot is still free. p = { day, start, services[], name, phone, email, note, lang }.
create or replace function book(p jsonb)
returns table (id uuid, code text, error text)
language plpgsql security definer set search_path = public as $$
declare
  s jsonb := (select data from settings where settings.id = 1);
  d date := (p->>'day')::date;
  t int := (p->>'start')::int;
  len int := 0;
  e int;
  chairs int := coalesce((s->>'chairs')::int, 1);
  ranges jsonb;
  inside boolean := false;
  r jsonb;
  peak int;
  now_rome timestamp := (now() at time zone 'Europe/Rome');
  sid text;
begin
  if s is null then return query select null::uuid, null::text, 'no-settings'; return; end if;
  if coalesce(trim(p->>'name'), '') = '' or coalesce(trim(p->>'phone'), '') = '' then return query select null::uuid, null::text, 'missing-details'; return; end if;
  for sid in select jsonb_array_elements_text(p->'services') loop
    len := len + coalesce((select (x->>'min')::int from jsonb_array_elements(s->'services') x where x->>'id' = sid and coalesce((x->>'active')::boolean, true)), 0);
  end loop;
  if len = 0 then return query select null::uuid, null::text, 'no-service'; return; end if;
  e := t + len;

  -- Inside opening hours, ahead of the minimum notice, within the booking horizon.
  ranges := s->'hours'->(extract(dow from d)::int);
  for r in select * from jsonb_array_elements(coalesce(ranges, '[]'::jsonb)) loop
    if t >= split_part(r->>0, ':', 1)::int * 60 + split_part(r->>0, ':', 2)::int
       and e <= split_part(r->>1, ':', 1)::int * 60 + split_part(r->>1, ':', 2)::int then inside := true; end if;
  end loop;
  if not inside then return query select null::uuid, null::text, 'closed'; return; end if;
  if (d + make_interval(mins => t)) < now_rome + make_interval(mins => coalesce((s->>'minNotice')::int, 0)) then return query select null::uuid, null::text, 'too-late'; return; end if;
  if d > now_rome::date + coalesce((s->>'horizon')::int, 30) then return query select null::uuid, null::text, 'too-far'; return; end if;

  -- One booking at a time per day, then count the chairs in use at the busiest moment of the span.
  perform pg_advisory_xact_lock(hashtext('book-' || d::text));
  if exists (select 1 from bookings b where b.day = d and b.status = 'blocked' and b.start_min < e and b.end_min > t) then
    return query select null::uuid, null::text, 'slot-taken'; return;
  end if;
  select coalesce(max(c), 0) into peak from (
    select (select count(*) from bookings b2 where b2.day = d and b2.status in ('confirmed', 'completed') and b2.start_min <= m and b2.end_min > m) c
    from (select t as m union select b.start_min from bookings b where b.day = d and b.start_min > t and b.start_min < e) pts
  ) x;
  if peak >= chairs then return query select null::uuid, null::text, 'slot-taken'; return; end if;

  return query
    insert into bookings (day, start_min, end_min, services, name, phone, email, note, lang, source)
    values (d, t, e, p->'services', trim(p->>'name'), trim(p->>'phone'), coalesce(trim(p->>'email'), ''), coalesce(trim(p->>'note'), ''), coalesce(p->>'lang', 'it'), 'web')
    returning bookings.id, bookings.code, null::text;
end;
$$;

-- The same rule for everything else (the owner's own entries, a cancelled booking brought back): no overlaps.
create or replace function no_overlap() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  chairs int := coalesce((select (data->>'chairs')::int from settings where id = 1), 1);
  peak int;
begin
  if new.status not in ('confirmed', 'completed') then return new; end if;
  perform pg_advisory_xact_lock(hashtext('book-' || new.day::text));
  if exists (select 1 from bookings b where b.id <> new.id and b.day = new.day and b.status = 'blocked' and b.start_min < new.end_min and b.end_min > new.start_min) then
    raise exception 'slot-taken';
  end if;
  select coalesce(max(c), 0) into peak from (
    select (select count(*) from bookings b2 where b2.id <> new.id and b2.day = new.day and b2.status in ('confirmed', 'completed') and b2.start_min <= m and b2.end_min > m) c
    from (select new.start_min as m union select b.start_min from bookings b where b.id <> new.id and b.day = new.day and b.start_min > new.start_min and b.start_min < new.end_min) pts
  ) x;
  if peak >= chairs then raise exception 'slot-taken'; end if;
  return new;
end;
$$;
drop trigger if exists bookings_no_overlap on bookings;
create trigger bookings_no_overlap before insert or update of day, start_min, end_min, status on bookings
  for each row execute function no_overlap();

revoke all on function book(jsonb) from public;
grant execute on function book(jsonb) to anon, authenticated;
grant execute on function busy(date, date) to anon, authenticated;

-- Live updates for the admin panel.
alter publication supabase_realtime add table bookings;
