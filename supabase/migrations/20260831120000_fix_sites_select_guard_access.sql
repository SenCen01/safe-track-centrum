-- Bug found while building the Guard mobile app: sites_select only granted
-- Admin and the assigned Operations Manager, never the Guard — even though
-- routes_select and checkpoints_select already correctly included "any
-- Guard with a Shift at that Site". A Guard's own Shift query embeds
-- sites(name, address), which silently came back null under RLS. Bringing
-- sites_select in line with the routes/checkpoints policies already in the
-- init migration.

drop policy "sites_select" on sites;

create policy "sites_select" on sites for select to authenticated using (
  is_admin()
  or om_covers_site(id)
  or exists (select 1 from shifts where shifts.site_id = sites.id and shifts.guard_id = auth.uid())
);
