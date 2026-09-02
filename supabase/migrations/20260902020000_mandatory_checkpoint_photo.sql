-- Checkpoint photo becomes mandatory, supplied atomically with the scan
-- itself — a Guard cannot advance to the next Checkpoint without capturing
-- evidence for the current one. Previously the photo was an optional,
-- after-the-fact attach (attach_checkpoint_photo), which meant a scan could
-- be recorded — and the next Checkpoint unlocked — with no photo at all.
--
-- Since the photo must now exist before scan_checkpoint can be called, its
-- storage path can no longer be keyed by the scan's own id (that row
-- doesn't exist yet at upload time) — rekeyed by patrol_id instead, which
-- is stable and known before the scan happens.

drop policy "checkpoint_photos_insert" on storage.objects;
drop policy "checkpoint_photos_select" on storage.objects;

create policy "checkpoint_photos_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'checkpoint-photos'
  and exists (
    select 1 from patrols p join shifts s on s.id = p.shift_id
    where p.id = public.safe_cast_uuid((storage.foldername(name))[1])
      and s.guard_id = auth.uid()
  )
);

create policy "checkpoint_photos_select" on storage.objects for select to authenticated using (
  bucket_id = 'checkpoint-photos'
  and (
    is_admin()
    or exists (
      select 1 from patrols p join shifts s on s.id = p.shift_id
      where p.id = public.safe_cast_uuid((storage.foldername(name))[1])
        and (om_covers_site(s.site_id) or s.guard_id = auth.uid())
    )
  )
);

-- No longer part of the write path — a scan always carries its photo now.
drop function public.attach_checkpoint_photo(uuid, text);

drop function public.scan_checkpoint(uuid, uuid, uuid, timestamptz, double precision, double precision);

create function public.scan_checkpoint(
  p_patrol_id uuid,
  p_checkpoint_id uuid,
  p_client_scan_id uuid,
  p_scanned_at timestamptz,
  p_photo_storage_path text default null,
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

  if p_photo_storage_path is null then
    raise exception 'photo_required';
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
    (patrol_id, checkpoint_id, scanned_at, latitude, longitude, sequence_number, client_scan_id, photo_storage_path)
    values (p_patrol_id, p_checkpoint_id, p_scanned_at, p_lat, p_lng, v_checkpoint.sequence_number, p_client_scan_id, p_photo_storage_path)
    returning * into v_scan;

  select max(sequence_number) into v_max_seq from checkpoints where route_id = v_patrol.route_id;

  if v_checkpoint.sequence_number = v_max_seq then
    update patrols set status = 'complete', ended_at = now() where id = p_patrol_id;
  end if;

  return v_scan;
end;
$$;
grant execute on function public.scan_checkpoint(uuid, uuid, uuid, timestamptz, text, double precision, double precision) to authenticated;
