# safe-track-centrum

Security guard patrol management platform. See `CONTEXT.md` for domain vocabulary and `docs/adr/` for architecture decisions.

## Layout

```
apps/
  web/       Next.js app — Operations Manager & Admin (web dashboard)
  mobile/    Expo app — Guard (mobile)
packages/
  types/     Shared TypeScript types (Supabase-generated types land here)
```

## Getting started

Requires Node >=22.20.0 (an `.nvmrc` is provided — `nvm use` if you have nvm installed).

```
npm install
```

Each app needs its own Supabase credentials in a gitignored `.env.local` — copy from that app's `.env.example`:

- `apps/web/.env.example` → `apps/web/.env.local`
- `apps/mobile/.env.example` → `apps/mobile/.env.local`

Then, from the repo root:

```
npm run dev:web      # Next.js dev server
npm run dev:mobile    # Expo dev server
```
