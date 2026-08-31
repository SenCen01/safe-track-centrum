-- Storage for Incident evidence photos. Private bucket — access is governed
-- entirely by RLS on storage.objects, mirroring the incident_photos table's
-- own visibility rule (Admin, the assigned Operations Manager, or the
-- reporting Guard). Path convention: `{incident_id}/{filename}`.
--
-- No update/delete policy is granted — once uploaded, a photo is immutable
-- evidence, same tamper-evidence philosophy as checkpoint_scans/incidents.

insert into storage.buckets (id, name, public)
values ('incident-photos', 'incident-photos', false)
on conflict (id) do nothing;

-- The first path segment (incident_id) is attacker-controlled input from the
-- client's upload path. Casting straight to uuid inside a policy would throw
-- on a malformed value, turning what should be a clean permission denial
-- into a confusing 500. This returns null instead, so an invalid segment
-- just fails the ownership check like any other non-match.
create function public.safe_cast_uuid(p_text text)
returns uuid
language plpgsql immutable
as $$
begin
  return p_text::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create policy "incident_photos_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'incident-photos'
  and exists (
    select 1 from incidents
    where id = public.safe_cast_uuid((storage.foldername(name))[1])
      and guard_id = auth.uid()
  )
);

create policy "incident_photos_select" on storage.objects for select to authenticated using (
  bucket_id = 'incident-photos'
  and (
    is_admin()
    or exists (
      select 1 from incidents i
      join shifts s on s.id = i.shift_id
      where i.id = public.safe_cast_uuid((storage.foldername(name))[1])
        and (om_covers_site(s.site_id) or i.guard_id = auth.uid())
    )
  )
);
