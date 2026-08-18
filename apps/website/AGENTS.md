## Development

```bash
pnpm --filter @seedarr/website dev
```

Landing lives at `/`. Starlight docs are under `/introduction/`, `/guides/`, and `/reference/`.

Feature mockups on the landing page live in `public/assets/` (`movie.png`, `player-series.png`, `modules.png`, …). Keep copy aligned with **Settings → Modules** (not the old Indexers / Storage tabs).

UI primitives for this app stay local under `src/components/ui` (not shared with `apps/web`). Theme tokens live in `src/styles/global.css` and also style Starlight.
