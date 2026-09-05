---
name: playwright-screenshots
description: >-
  Capture and review Seedarr UI via Playwright MCP screenshots on localhost.
  Use when the user asks to screenshot, visually verify, QA UI, compare before/after,
  or validate a redesign against the running app (default http://localhost:3000).
---

# Playwright Screenshots (Seedarr)

## Prerequisites

- App running: `pnpm --filter @seedarr/web dev` → `http://localhost:3000`
- Playwright MCP enabled (project `.cursor/mcp.json` and root `.mcp.json` for Claude)

## Workflow

1. Confirm the page is reachable.
2. Prefer **Playwright MCP** tools (`browser_navigate`, `browser_snapshot`, `browser_take_screenshot`). If Playwright MCP is unavailable, fall back to **cursor-ide-browser**.
3. Navigate → snapshot (a11y tree) → screenshot for visual evidence.
4. Report what you see (layout issues, contrast, missing labels) with route + viewport.

## Default Seedarr routes

| Route | Why |
| --- | --- |
| `/login` | Auth form polish / a11y |
| `/movies` | Cinema browse density |
| `/tv` | Same as movies |
| `/downloads` | Dense table / library |
| `/settings/modules` | Admin forms |
| `/onboarding` | Atmospheric branded flow |

Always include **dark** mode (default). Add light only if theme tokens changed.

## Screenshot checklist

```
- [ ] Navigate to target URL
- [ ] Wait for main content (not just loader)
- [ ] Accessibility snapshot
- [ ] Full-page or viewport screenshot
- [ ] Note issues vs seedarr-ui brand rules
```

## Notes

- Auth-gated routes need an existing session cookie / logged-in state.
- Do not invent credentials. Ask the user if login is required and none is available.
- Prefer evidence (screenshot + snapshot) over speculative UI claims.
