## Development

```bash
pnpm --filter @seedarr/website dev
```

Landing lives at `/`. Starlight docs are under `/introduction/`, `/guides/`, and `/reference/`.

UI primitives for this app stay local under `src/components/ui` (not shared with `apps/web`). Theme tokens live in `src/styles/global.css` and also style Starlight.
