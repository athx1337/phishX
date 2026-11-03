# phishX client

React 19/Vite 7 client for the versioned phishX evidence API. See the [project README](../README.md) for architecture, setup, provider configuration and limitations.

Use Node 22.12+ (Node 24 recommended), `npm ci`, copy `.env.example` to `.env` and run `npm run dev`. `VITE_API_URL` is embedded at build time.

Commands:

- `npm run lint` — source/config/test linting.
- `npm test` — Vitest component, API, privacy/history and workflow regressions.
- `npm run test:e2e` — Playwright controlled browser checks (install Chromium first).
- `npm run build` — static production bundle.
- `npm run preview` — local production preview.

Tests use synthetic fixtures. Unknown/failed/pending results must remain unverified; neither the UI nor the shared contract adapts an old binary result into a safe verdict. History is opt-in, redacted, bounded and clearable. The optional Three.js visualization loads only after an explicit user action and is disabled for reduced motion/low-core devices.

The root CI runs the shared/backend tests as well; frontend tests alone do not prove provider integration or detection accuracy. See [privacy](../docs/PRIVACY.md), [API](../docs/API.md) and [dependency review](../docs/DEPENDENCIES.md).
