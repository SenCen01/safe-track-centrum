# Centrum brand tokens

Sourced from the `Centrum booking` (Centrum 2.0) project's
`packages/web/src/app/globals.css` and `layout.tsx` — the authoritative source
for Centrum Concierge & Security's brand identity, not a project-specific
choice for safe-track-centrum.

## Colors

| Token | Value | Use |
|---|---|---|
| `--centrum-green` | `#0a6d3c` | Primary brand color |
| `--centrum-green-light` | `#00a651` | Accent |
| `--centrum-dark` / `--centrum-text` | `#1e2a27` | Body text |
| `--centrum-mint` | `#eef7f1` | Light surface tint |
| `--centrum-mint-deep` | `#d4ede0` | Deeper surface tint |
| `--centrum-muted` | `#4a6358` | Secondary/muted text |
| Page background | `#f4faf7` | Mint-white |

## Typography

- **Manrope** — body text (`next/font/google`)
- **Playfair Display** — headings
- **Geist Mono** — monospace (already in use for this project)

## Logo

`icon_logo.png` — the shield emblem (green outline, silver/green buildings) —
copied into `apps/web/public/images/logos/` and `apps/mobile/assets/`.
`new_cen_logo.png` is a white/transparent wordmark meant for dark backgrounds.

## Component structure

The `Button`/`Badge` variant-map pattern (a single component, `variant` ×
`size` props mapping to Tailwind class strings) is adapted from
`resolve-combat-next`'s `apps/web/src/components/ui/`, another
Centrum-family internal tool. Same reasoning: one component per UI primitive
makes the design consistent by construction — there's no way to accidentally
introduce a one-off button style.
