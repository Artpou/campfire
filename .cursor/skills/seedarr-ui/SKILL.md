---
name: seedarr-ui
description: >-
  Preserve and extend Seedarr's existing UI identity (dark cinema, lime accent,
  Montserrat, shadcn/Radix). Use when building, redesigning, restyling, auditing,
  or reviewing UI in apps/web or apps/website — screens, components, landing,
  onboarding, settings, or visual polish.
---

# Seedarr UI

Seedarr already has a design system. **Improve in place. Do not invent a new brand.**

## Surfaces

| App | Role | Density dial |
| --- | --- | --- |
| `apps/web` | Product (catalog, downloads, settings, player) | High (6–8) |
| `apps/website` | Marketing + Starlight docs | Medium (3–5) |

Tokens live in:

- `apps/web/src/styles.css`
- `apps/website/src/styles/global.css`

Keep both aligned when changing brand colors.

## Brand tokens (do not replace)

- **Font**: Montserrat (`--font-sans`). Never switch to Inter / Roboto as primary.
- **Primary (lime)**: `oklch(0.63 0.13 135)` — signature accent.
- **Dark default**: background ~`oklch(0.22 0.004 240)`, cards slightly lighter.
- **Radius**: `--radius: 0.45rem`.
- **Icons**: Lucide React with `Icon` suffix (`HomeIcon`, `SettingsIcon`).
- **Primitives**: existing shadcn/Radix under `apps/web/src/shared/ui/*`.

## Two UI modes

1. **Cinema browse** — posters, carousels, hover previews, sticky filters, bottom mobile nav. Atmospheric but product-first.
2. **Admin / dense** — tables, modules settings, forms, torrents. Flat, compact, clear hierarchy. Do not "marketing-ify" these screens.

## Hard rules

- Prefer Tailwind utilities + existing CSS variables over new one-off color systems.
- Match dark **and** light when touching theme tokens.
- Reuse `Button`, `Card`, `Badge`, `Input`, `Container`, `cn()`.
- Preserve Lingui (`Trans` / `t` / `msg`) — no hard-coded user-facing English/French strings without i18n.
- Do not add purple AI gradients, Inter, glassmorphism everywhere, or decorative card grids.
- Do not rewrite global layout unless asked. Targeted upgrades only.
- Motion: subtle (`transition-colors`, sticky blur). No GSAP/magnetic cursors unless explicitly requested.
- Logo glow (`drop-shadow` lime) is brand-OK in moderation; do not multiply glows on every control.

## When paired with other skills

- **`redesign-existing-projects`**: run audit first, then fix — but **preserve** Montserrat + lime + dark cinema. Skip advice that replaces the brand font/accent.
- **`web-design-guidelines`**: use for a11y / forms / focus / UX compliance audits.
- **Playwright / browser MCP**: after UI changes, screenshot `http://localhost:3000` key routes (login, movies, downloads, settings/modules) in dark mode at minimum.

## High-ROI polish targets

Login, empty states, onboarding, modules settings — not a full catalog redesign.

## Pre-flight checklist

- [ ] Still looks like Seedarr after the change (lime + dark cinema)
- [ ] Used existing primitives / tokens
- [ ] i18n preserved
- [ ] Dark mode verified; light checked if tokens changed
- [ ] No new generic AI aesthetic patterns
