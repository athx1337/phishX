---
last_mapped_commit: 6b0b48330bd22f86345b3e61ece953daf2e521fb
last_mapped_at: 2026-11-03
---
# Stack
Analysis date: 2026-11-03

## Runtime
- Node 22.12+; CI Node 24.
- Cloudflare Workers with nodejs_compat.
- Backend TypeScript compiled/bundled by Wrangler.
- Frontend React 19 with Vite 7.
- Tailwind 3/PostCSS styling.
- Motion animation library.
- Optional Three.js visual loaded on explicit user action.

## Packages
- Hono routing and body-limit middleware.
- tldts Public Suffix List domain parsing.
- ipaddr.js public/reserved IP parsing.
- punycode Unicode hostname display.
- Shared dependency-free TypeScript API contract.

## Tooling
- Separate npm lockfiles for frontend and backend.
- Root package orchestrates commands with npm --prefix.
- Vitest 5 in both packages.
- Testing Library/jsdom frontend suite.
- Playwright desktop/mobile Chromium suite.
- Native Node contract tests.
- ESLint frontend; TypeScript backend/shared checks.
- GitHub Actions CI and Dependabot.
- Archived Python research is not required for application builds.

## Model and operations
- Genuine XGBoost3.2/Python training, sklearn Platt calibration, NumPy/Pandas and projected Parquet metadata acquisition; pinned `ml/requirements.txt`. Python is not needed for serving or normal frontend/backend builds.
- `ml/features.mjs` and bounded numeric-tree evaluator are shared with TypeScript Worker inference; JSON artifacts replace unsafe pickle serving.
- SQLite Durable Objects plus optional KV; no relational user/account database.
- Gitleaks8.30.1 and Prometheus3.15.1 binaries are pinned and checksummed; CI runs full dependency audits and axe/browser checks.
