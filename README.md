# gemsweeper

Minesweeper at its core, wrapped in a small roguelike RPG: four themed floors,
monsters where the mines are, gear that rewrites the rules, floor checkpoints,
two retries. Static Svelte SPA, no backend, saves in `localStorage`.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # vitest
npm run check    # svelte-check
npm run build    # static build into dist/
```

## Deploy

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. Set Pages source to "GitHub Actions" in repo
settings. The app is served from `/gemsweeper/` (see `vite.config.ts` `base`).

## Design docs

- Spec: `docs/superpowers/specs/2026-09-09-gemsweeper-design.md`
- Plan: `docs/superpowers/plans/2026-09-10-gemsweeper.md`
