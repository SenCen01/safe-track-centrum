-- Optional photo evidence per Checkpoint scan. 1:1 (nullable column, not a
-- join table like incident_photos, which is 1:many) — one photo per scan.
-- Non-blocking, after-the-fact add-on: a Guard's checkpoint_scans row
-- already exists by upload time, since the photo is attached separately
-- from scan_checkpoint() itself (see attach_checkpoint_photo below).

alter table checkpoint_scans add column photo_storage_path text;

insert into storage.buckets (id, name, public)
values ('checkpoint-photos', 'checkpoint-photos', false)
on conflict (id) do nothing;

-- Path convention `{scan_id}/{filename}` — mirrors incident-photos'
-- `{incident_id}/{filename}`, one join level deeper (scan -> patrol ->
-- shift -> guard) since checkpoint_scans has no guard_id of its own.
create policy "checkpoint_photos_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'checkpoint-photos'
  and exists (
    select 1 from checkpoint_scans cs
    join patrols p on p.id = cs.patrol_id
    join shifts s on s.id = p.shift_id
    where cs.id = public.safe_cast_uuid((storage.foldername(name))[1])
      and s.guard_id = auth.uid()
  )
);

create policy "checkpoint_photos_select" on storage.objects for select to authenticated using (
  bucket_id = 'checkpoint-photos'
  and (
    is_admin()
    or exists (
      select 1 from checkpoint_scans cs
      join patrols p on p.id = cs.patrol_id
      join shifts s on s.id = p.shift_id
      where cs.id = public.safe_cast_uuid((storage.foldername(name))[1])
        and (om_covers_site(s.site_id) or s.guard_id = auth.uid())
    )
  )
);

-- Mirrors attach_incident_photo, but UPDATEs the existing scan row instead
-- of inserting into a join table. Rejects if a photo is already attached —
-- silently overwriting evidence is worse than a client-visible error here;
-- the mobile client treats the whole call as best-effort/non-fatal anyway.
create function public.attach_checkpoint_photo(p_scan_id uuid, p_storage_path text)
returns checkpoint_scans
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_scan checkpoint_scans;
  v_guard_id uuid;
begin
  select cs.* into v_scan from checkpoint_scans cs where cs.id = p_scan_id for update;
  if not found then raise exception 'checkpoint_scan_not_found'; end if;

  select s.guard_id into v_guard_id
    from patrols p join shifts s on s.id = p.shift_id
    where p.id = v_scan.patrol_id;
  if v_guard_id <> auth.uid() then raise exception 'not_your_checkpoint_scan'; end if;

  if v_scan.photo_storage_path is not null then
    raise exception 'photo_already_attached';
  end if;

  update checkpoint_scans set photo_storage_path = p_storage_path
    where id = p_scan_id
    returning * into v_scan;

  return v_scan;
end;
$$;
grant execute on function public.attach_checkpoint_photo(uuid, text) to authenticated;
