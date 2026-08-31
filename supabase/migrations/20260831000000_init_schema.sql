-- Safe Track Centrum: initial schema
-- Vocabulary: see /CONTEXT.md. Architecture rationale: see /docs/adr/0001-0003.
--
-- Write-path design (see conversation record / to become an ADR once implement
-- starts): Guards get read-only RLS access to their own rows. Every audit-
-- critical write (clocking in/out, starting a patrol, scanning a checkpoint,
-- logging an incident, recording a location ping) goes through a
-- SECURITY DEFINER function below, never a raw table INSERT/UPDATE. Those
-- tables deliberately have NO insert/update grant for `authenticated` at all,
-- so even a mistake in a future RLS policy can't open a raw write path —
-- the function is the only door in.

create extension if not exists pgcrypto;

-- =========================================================================
-- Tables
-- =========================================================================

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'operations_manager', 'guard')),
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now()
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references clients (id) on delete restrict,
  name text not null,
  address text not null,
  created_at timestamptz not null default now()
);

create table routes (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null unique references sites (id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

create table checkpoints (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes (id) on delete cascade,
  sequence_number int not null check (sequence_number > 0),
  name text not null,
  qr_code text not null unique,
  created_at timestamptz not null default now(),
  unique (route_id, sequence_number)
);

create table operations_manager_sites (
  operations_manager_id uuid not null references profiles (id) on delete cascade,
  site_id uuid not null references sites (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (operations_manager_id, site_id)
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  guard_id uuid not null references profiles (id) on delete restrict,
  site_id uuid not null references sites (id) on delete restrict,
  assigned_by uuid not null references profiles (id) on delete restrict,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  actual_start timestamptz,
  actual_end timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed')),
  created_at timestamptz not null default now()
);

create table patrols (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts (id) on delete cascade,
  route_id uuid not null references routes (id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'complete', 'incomplete')),
  ended_early_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table checkpoint_scans (
  id uuid primary key default gen_random_uuid(),
  patrol_id uuid not null references patrols (id) on delete cascade,
  checkpoint_id uuid not null references checkpoints (id) on delete restrict,
  sequence_number int not null,
  scanned_at timestamptz not null,
  latitude double precision,
  longitude double precision,
  client_scan_id uuid not null unique,
  created_at timestamptz not null default now()
);

create table incidents (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts (id) on delete cascade,
  patrol_id uuid references patrols (id) on delete set null,
  guard_id uuid not null references profiles (id) on delete restrict,
  description text not null,
  occurred_at timestamptz not null,
  latitude double precision,
  longitude double precision,
  client_incident_id uuid not null unique,
  created_at timestamptz not null default now()
);

create table incident_photos (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table guard_location_pings (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts (id) on delete cascade,
  guard_id uuid not null references profiles (id) on delete restrict,
  recorded_at timestamptz not null,
  latitude double precision not null,
  longitude double precision not null,
  client_ping_id uuid not null unique,
  created_at timestamptz not null default now()
);

create index shifts_guard_id_idx on shifts (guard_id);
create index shifts_site_id_idx on shifts (site_id);
create index patrols_shift_id_idx on patrols (shift_id);
create index checkpoint_scans_patrol_id_idx on checkpoint_scans (patrol_id);
create index incidents_shift_id_idx on incidents (shift_id);
create index guard_location_pings_shift_id_recorded_at_idx on guard_location_pings (shift_id, recorded_at);

-- =========================================================================
-- Daily Activity Report: purely derived, no state of its own (per CONTEXT.md).
-- `security_invoker = true` is essential here: without it, a view runs with
-- the privileges of its owner (the migration role) and would silently bypass
-- RLS on shifts/patrols/incidents for every caller. With it, the view
-- defers to the querying user's own RLS — an Operations Manager only ever
-- sees DARs for their assigned Sites, exactly as if they'd queried the
-- underlying tables directly.
-- =========================================================================

create view daily_activity_reports
with (security_invoker = true) as
select
  s.id as shift_id,
  s.guard_id,
  s.site_id,
  s.scheduled_start,
  s.scheduled_end,
  s.actual_start,
  s.actual_end,
  s.status as shift_status,
  coalesce(
    (select json_agg(p.* order by p.started_at) from patrols p where p.shift_id = s.id),
    '[]'::json
  ) as patrols,
  coalesce(
    (select json_agg(i.* order by i.occurred_at) from incidents i where i.shift_id = s.id),
    '[]'::json
  ) as incidents
from shifts s;

-- =========================================================================
-- New user -> profile. Admin always passes role/full_name explicitly via
-- the Supabase Admin API (server-side, service-role) when provisioning a
-- Guard or Operations Manager account; there is no public self-signup path.
-- Fail loudly rather than silently defaulting a role if that contract is
-- ever violated.
-- =========================================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text := new.raw_user_meta_data ->> 'role';
begin
  if v_role is null or v_role not in ('admin', 'operations_manager', 'guard') then
    raise exception 'missing_or_invalid_role_in_user_metadata';
  end if;

  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- RLS helper functions. SECURITY DEFINER so they can read `profiles` /
-- `operations_manager_sites` regardless of the caller's own row-level
-- access — they only ever return a boolean or the caller's own scoped ids,
-- never arbitrary rows, so this doesn't leak anything.
-- =========================================================================

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create function public.om_covers_site(p_site_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from operations_manager_sites
    where operations_manager_id = auth.uid() and site_id = p_site_id
  );
$$;

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table profiles enable row level security;
alter table clients enable row level security;
alter table sites enable row level security;
alter table routes enable row level security;
alter table checkpoints enable row level security;
alter table operations_manager_sites enable row level security;
alter table shifts enable row level security;
alter table patrols enable row level security;
alter table checkpoint_scans enable row level security;
alter table incidents enable row level security;
alter table incident_photos enable row level security;
alter table guard_location_pings enable row level security;

-- profiles: internal directory, low-sensitivity fields (name/role/phone) —
-- readable by any authenticated user. Only Admin manages accounts;
-- there is deliberately no self-service update (would need column-level
-- restrictions to stop a Guard granting themselves 'admin', which RLS can't
-- express directly, so it's simplest and safest to not offer it in v1).
grant select on profiles to authenticated;
grant update, delete on profiles to authenticated;
create policy "profiles_select_all" on profiles for select to authenticated using (true);
create policy "profiles_admin_write" on profiles for update to authenticated using (is_admin());
create policy "profiles_admin_delete" on profiles for delete to authenticated using (is_admin());

-- clients: Admin manages; an Operations Manager can see the Client behind
-- any Site they're assigned to.
grant select, insert, update, delete on clients to authenticated;
create policy "clients_select" on clients for select to authenticated using (
  is_admin() or exists (select 1 from sites where sites.client_id = clients.id and om_covers_site(sites.id))
);
create policy "clients_admin_write" on clients for insert to authenticated with check (is_admin());
create policy "clients_admin_update" on clients for update to authenticated using (is_admin());
create policy "clients_admin_delete" on clients for delete to authenticated using (is_admin());

-- sites: Admin unrestricted; Operations Manager scoped to assigned Sites.
grant select, insert, update, delete on sites to authenticated;
create policy "sites_select" on sites for select to authenticated using (
  is_admin() or om_covers_site(id)
);
create policy "sites_admin_write" on sites for insert to authenticated with check (is_admin());
create policy "sites_admin_update" on sites for update to authenticated using (is_admin());
create policy "sites_admin_delete" on sites for delete to authenticated using (is_admin());

-- routes: Admin manages (physical QR layout changes are deliberate,
-- infrequent). Readable by the assigned OM and by any Guard with a Shift at
-- that Site (they need it to know what they're walking).
grant select, insert, update, delete on routes to authenticated;
create policy "routes_select" on routes for select to authenticated using (
  is_admin()
  or om_covers_site(site_id)
  or exists (select 1 from shifts where shifts.site_id = routes.site_id and shifts.guard_id = auth.uid())
);
create policy "routes_admin_write" on routes for insert to authenticated with check (is_admin());
create policy "routes_admin_update" on routes for update to authenticated using (is_admin());
create policy "routes_admin_delete" on routes for delete to authenticated using (is_admin());

-- checkpoints: same visibility rule as their parent Route.
grant select, insert, update, delete on checkpoints to authenticated;
create policy "checkpoints_select" on checkpoints for select to authenticated using (
  is_admin()
  or exists (
    select 1 from routes r
    where r.id = checkpoints.route_id
      and (
        om_covers_site(r.site_id)
        or exists (select 1 from shifts where shifts.site_id = r.site_id and shifts.guard_id = auth.uid())
      )
  )
);
create policy "checkpoints_admin_write" on checkpoints for insert to authenticated with check (is_admin());
create policy "checkpoints_admin_update" on checkpoints for update to authenticated using (is_admin());
create policy "checkpoints_admin_delete" on checkpoints for delete to authenticated using (is_admin());

-- operations_manager_sites: Admin manages the assignments; an OM can see
-- their own coverage list.
grant select, insert, update, delete on operations_manager_sites to authenticated;
create policy "om_sites_select" on operations_manager_sites for select to authenticated using (
  is_admin() or operations_manager_id = auth.uid()
);
create policy "om_sites_admin_write" on operations_manager_sites for insert to authenticated with check (is_admin());
create policy "om_sites_admin_update" on operations_manager_sites for update to authenticated using (is_admin());
create policy "om_sites_admin_delete" on operations_manager_sites for delete to authenticated using (is_admin());

-- shifts: Admin unrestricted. OM can create/manage shifts at their Sites
-- (per CONTEXT.md, both Admin and OM can assign a Guard to a Shift). Guard
-- can only ever SELECT their own — clock-in/out goes through
-- start_shift/end_shift below, never a raw UPDATE.
grant select on shifts to authenticated;
grant insert, update, delete on shifts to authenticated;
create policy "shifts_select" on shifts for select to authenticated using (
  is_admin() or om_covers_site(site_id) or guard_id = auth.uid()
);
create policy "shifts_write" on shifts for insert to authenticated with check (
  is_admin() or om_covers_site(site_id)
);
create policy "shifts_update" on shifts for update to authenticated using (
  is_admin() or om_covers_site(site_id)
);
create policy "shifts_delete" on shifts for delete to authenticated using (is_admin());

-- patrols: read-only for OM/Guard. All creation/progression happens via
-- start_patrol/scan_checkpoint/end_shift (SECURITY DEFINER), so there is
-- deliberately NO insert/update grant here for `authenticated` at all —
-- not even Admin gets a raw write path, since a patrol's integrity as an
-- audit trail matters more than any convenience editing it would offer.
grant select on patrols to authenticated;
create policy "patrols_select" on patrols for select to authenticated using (
  is_admin()
  or exists (select 1 from shifts where shifts.id = patrols.shift_id and om_covers_site(shifts.site_id))
  or exists (select 1 from shifts where shifts.id = patrols.shift_id and shifts.guard_id = auth.uid())
);

-- checkpoint_scans: read-only; all writes via scan_checkpoint().
grant select on checkpoint_scans to authenticated;
create policy "checkpoint_scans_select" on checkpoint_scans for select to authenticated using (
  is_admin()
  or exists (
    select 1 from patrols p join shifts s on s.id = p.shift_id
    where p.id = checkpoint_scans.patrol_id and (om_covers_site(s.site_id) or s.guard_id = auth.uid())
  )
);

-- incidents: read-only; all writes via log_incident().
grant select on incidents to authenticated;
create policy "incidents_select" on incidents for select to authenticated using (
  is_admin()
  or exists (select 1 from shifts where shifts.id = incidents.shift_id and om_covers_site(shifts.site_id))
  or guard_id = auth.uid()
);

-- incident_photos: same visibility as the parent incident; writes via
-- attach_incident_photo().
grant select on incident_photos to authenticated;
create policy "incident_photos_select" on incident_photos for select to authenticated using (
  is_admin()
  or exists (
    select 1 from incidents i
    where i.id = incident_photos.incident_id
      and (
        exists (select 1 from shifts where shifts.id = i.shift_id and om_covers_site(shifts.site_id))
        or i.guard_id = auth.uid()
      )
  )
);

-- guard_location_pings: read-only; all writes via record_location_ping().
grant select on guard_location_pings to authenticated;
create policy "guard_location_pings_select" on guard_location_pings for select to authenticated using (
  is_admin()
  or exists (select 1 from shifts where shifts.id = guard_location_pings.shift_id and om_covers_site(shifts.site_id))
  or guard_id = auth.uid()
);

-- =========================================================================
-- Guard write-path functions. Each is SECURITY DEFINER (so it can write to
-- tables the caller has no direct grant on) and re-validates ownership
-- itself rather than trusting RLS — since RLS is intentionally absent on
-- the insert/update side for these tables.
-- =========================================================================

create function public.start_shift(p_shift_id uuid)
returns shifts
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_shift shifts;
begin
  select * into v_shift from shifts where id = p_shift_id for update;
  if not found then raise exception 'shift_not_found'; end if;
  if v_shift.guard_id <> auth.uid() then raise exception 'not_your_shift'; end if;
  if v_shift.status <> 'scheduled' then raise exception 'shift_already_started'; end if;

  update shifts set actual_start = now(), status = 'in_progress'
    where id = p_shift_id
    returning * into v_shift;

  return v_shift;
end;
$$;
grant execute on function public.start_shift(uuid) to authenticated;

create function public.end_shift(p_shift_id uuid, p_confirm_incomplete boolean default false)
returns shifts
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_shift shifts;
  v_open_patrol patrols;
begin
  select * into v_shift from shifts where id = p_shift_id for update;
  if not found then raise exception 'shift_not_found'; end if;
  if v_shift.guard_id <> auth.uid() then raise exception 'not_your_shift'; end if;
  if v_shift.status <> 'in_progress' then raise exception 'shift_not_in_progress'; end if;

  select * into v_open_patrol from patrols
    where shift_id = p_shift_id and status = 'in_progress'
    order by started_at desc limit 1;

  if found then
    if not p_confirm_incomplete then
      raise exception 'patrol_not_finished';
    end if;

    update patrols set status = 'incomplete', ended_at = now(), ended_early_confirmed = true
      where id = v_open_patrol.id;
  end if;

  update shifts set actual_end = now(), status = 'completed'
    where id = p_shift_id
    returning * into v_shift;

  return v_shift;
end;
$$;
grant execute on function public.end_shift(uuid, boolean) to authenticated;

create function public.start_patrol(p_shift_id uuid)
returns patrols
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_shift shifts;
  v_route_id uuid;
  v_patrol patrols;
begin
  select * into v_shift from shifts where id = p_shift_id;
  if not found then raise exception 'shift_not_found'; end if;
  if v_shift.guard_id <> auth.uid() then raise exception 'not_your_shift'; end if;
  if v_shift.status <> 'in_progress' then raise exception 'shift_not_active'; end if;

  if exists (select 1 from patrols where shift_id = p_shift_id and status = 'in_progress') then
    raise exception 'patrol_already_in_progress';
  end if;

  select id into v_route_id from routes where site_id = v_shift.site_id;
  if v_route_id is null then raise exception 'no_route_for_site'; end if;

  insert into patrols (shift_id, route_id, started_at, status)
    values (p_shift_id, v_route_id, now(), 'in_progress')
    returning * into v_patrol;

  return v_patrol;
end;
$$;
grant execute on function public.start_patrol(uuid) to authenticated;

create function public.scan_checkpoint(
  p_patrol_id uuid,
  p_checkpoint_id uuid,
  p_client_scan_id uuid,
  p_scanned_at timestamptz,
  p_lat double precision default null,
  p_lng double precision default null
)
returns checkpoint_scans
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_patrol patrols;
  v_shift shifts;
  v_checkpoint checkpoints;
  v_next_seq int;
  v_max_seq int;
  v_existing checkpoint_scans;
  v_scan checkpoint_scans;
begin
  -- Idempotent replay: an offline-queued scan synced twice returns the
  -- original row instead of erroring or double-inserting.
  select * into v_existing from checkpoint_scans where client_scan_id = p_client_scan_id;
  if found then
    return v_existing;
  end if;

  select * into v_patrol from patrols where id = p_patrol_id for update;
  if not found then raise exception 'patrol_not_found'; end if;

  select * into v_shift from shifts where id = v_patrol.shift_id;
  if v_shift.guard_id <> auth.uid() then raise exception 'not_your_patrol'; end if;
  if v_patrol.status <> 'in_progress' then raise exception 'patrol_not_active'; end if;

  select * into v_checkpoint from checkpoints
    where id = p_checkpoint_id and route_id = v_patrol.route_id;
  if not found then raise exception 'checkpoint_not_on_route'; end if;

  select coalesce(max(sequence_number), 0) + 1 into v_next_seq
    from checkpoint_scans where patrol_id = p_patrol_id;

  if v_checkpoint.sequence_number <> v_next_seq then
    raise exception 'checkpoint_out_of_order'
      using detail = format('expected sequence %s, got %s', v_next_seq, v_checkpoint.sequence_number);
  end if;

  insert into checkpoint_scans
    (patrol_id, checkpoint_id, scanned_at, latitude, longitude, sequence_number, client_scan_id)
    values (p_patrol_id, p_checkpoint_id, p_scanned_at, p_lat, p_lng, v_checkpoint.sequence_number, p_client_scan_id)
    returning * into v_scan;

  select max(sequence_number) into v_max_seq from checkpoints where route_id = v_patrol.route_id;

  if v_checkpoint.sequence_number = v_max_seq then
    update patrols set status = 'complete', ended_at = now() where id = p_patrol_id;
  end if;

  return v_scan;
end;
$$;
grant execute on function public.scan_checkpoint(uuid, uuid, uuid, timestamptz, double precision, double precision) to authenticated;

create function public.log_incident(
  p_shift_id uuid,
  p_description text,
  p_client_incident_id uuid,
  p_occurred_at timestamptz,
  p_patrol_id uuid default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns incidents
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_shift shifts;
  v_existing incidents;
  v_incident incidents;
begin
  select * into v_existing from incidents where client_incident_id = p_client_incident_id;
  if found then
    return v_existing;
  end if;

  select * into v_shift from shifts where id = p_shift_id;
  if not found then raise exception 'shift_not_found'; end if;
  if v_shift.guard_id <> auth.uid() then raise exception 'not_your_shift'; end if;

  if p_patrol_id is not null and not exists (
    select 1 from patrols where id = p_patrol_id and shift_id = p_shift_id
  ) then
    raise exception 'patrol_not_in_shift';
  end if;

  insert into incidents
    (shift_id, patrol_id, guard_id, description, occurred_at, latitude, longitude, client_incident_id)
    values (p_shift_id, p_patrol_id, auth.uid(), p_description, p_occurred_at, p_lat, p_lng, p_client_incident_id)
    returning * into v_incident;

  return v_incident;
end;
$$;
grant execute on function public.log_incident(uuid, text, uuid, timestamptz, uuid, double precision, double precision) to authenticated;

create function public.attach_incident_photo(p_incident_id uuid, p_storage_path text)
returns incident_photos
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_incident incidents;
  v_photo incident_photos;
begin
  select * into v_incident from incidents where id = p_incident_id;
  if not found then raise exception 'incident_not_found'; end if;
  if v_incident.guard_id <> auth.uid() then raise exception 'not_your_incident'; end if;

  insert into incident_photos (incident_id, storage_path)
    values (p_incident_id, p_storage_path)
    returning * into v_photo;

  return v_photo;
end;
$$;
grant execute on function public.attach_incident_photo(uuid, text) to authenticated;

create function public.record_location_ping(
  p_shift_id uuid,
  p_client_ping_id uuid,
  p_recorded_at timestamptz,
  p_lat double precision,
  p_lng double precision
)
returns guard_location_pings
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_shift shifts;
  v_existing guard_location_pings;
  v_ping guard_location_pings;
begin
  select * into v_existing from guard_location_pings where client_ping_id = p_client_ping_id;
  if found then
    return v_existing;
  end if;

  select * into v_shift from shifts where id = p_shift_id;
  if not found then raise exception 'shift_not_found'; end if;
  if v_shift.guard_id <> auth.uid() then raise exception 'not_your_shift'; end if;
  if v_shift.status <> 'in_progress' then raise exception 'shift_not_active'; end if;

  insert into guard_location_pings (shift_id, guard_id, recorded_at, latitude, longitude, client_ping_id)
    values (p_shift_id, auth.uid(), p_recorded_at, p_lat, p_lng, p_client_ping_id)
    returning * into v_ping;

  return v_ping;
end;
$$;
grant execute on function public.record_location_ping(uuid, uuid, timestamptz, double precision, double precision) to authenticated;

-- =========================================================================
-- Realtime: Incident alerts (ADR-0003) and the live guard map both depend
-- on Postgres Changes being broadcast for these tables.
-- =========================================================================

alter publication supabase_realtime add table incidents;
alter publication supabase_realtime add table guard_location_pings;
