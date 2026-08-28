---
status: accepted
---

# Web + mobile stack on Supabase, single-tenant with per-Site RLS scoping

This is an internal patrol platform for one security company, not a multi-tenant SaaS product today. Operations Managers must only see the Sites they're assigned to, while Admins need unrestricted company-wide visibility. We're building a Next.js web app (Operations Manager + Admin) and a React Native/Expo mobile app (Guard), both backed by Supabase (Postgres, Auth, Storage, Realtime). We chose React Native/Expo over Flutter specifically to share TypeScript types and business logic with the Next.js app.

We modeled this as single-tenant (no Organization/company entity) rather than building a full multi-tenant schema up front, and instead enforce Operations Manager visibility through Postgres RLS keyed off a many-to-many Operations-Manager-to-Site assignment table; Admin bypasses that scoping entirely.

## Considered Options

Full multi-tenant SaaS schema (`org_id` on every table) was rejected for now — there's only one company today, and the per-Site RLS scoping gives most of the enforcement discipline of multi-tenancy without the schema overhead. An Organization layer can be introduced later without discarding this scoping.

## Consequences

Every table Operations Managers touch (Guards, Shifts, Patrols, Incidents, DARs) needs a resolvable path to `Site.id`, directly or transitively, for RLS to apply.
