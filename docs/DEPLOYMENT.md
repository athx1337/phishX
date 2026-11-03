# Deployment

Local checks do not publish or provision production resources.

## Worker

1. Use Node 22.12+ (CI uses 24); install with `npm ci --prefix backend-worker`.
2. Review the required `SCAN_COORDINATOR` Durable Object binding and migration; keep `REQUIRE_COORDINATOR=true` and never enable `DEV_MODE` publicly. Set independent random `CLIENT_ID_SECRET` and `METRICS_TOKEN` through secret bindings. Review Wrangler's Worker name, exact `ALLOWED_ORIGINS`, `CACHE_CONFIG_VERSION` and both managed limiter namespaces. Limiters are required; missing bindings fail scan routes closed with HTTP 503.
3. Configure optional real KV as `SCAN_CACHE`. Where supported, Wrangler provisions an ID-less binding; otherwise create a namespace and insert its returned ID. Never use mock IDs. Without KV, reputation/heuristic checks still work but active jobs are unavailable.
4. From `backend-worker/`, configure independent secrets:

```powershell
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
npx wrangler secret put URLHAUS_API_KEY
npx wrangler secret put VIRUSTOTAL_API_KEY
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put CLIENT_ID_SECRET
npx wrangler secret put METRICS_TOKEN
```

5. Regenerate binding types after changes with `npm run cf-typegen`.
6. Run root `npm run check`, `npm run test:model`, `npm run scan:secrets`, `npm run check:ops` and review verification limits.
7. Deploy deliberately from `backend-worker/` with `npm run deploy`.

Cloudflare active scans need Scanner read/write permissions and working KV. Verify vendor terms, quotas and unlisted mode on a controlled public URL before public exposure.

## Frontend

Set `VITE_API_URL` to the Worker origin in the build environment. Run `npm ci --prefix frontend` and root `npm run build`; publish `frontend/dist/` to your static host. Add that exact host origin to Worker CORS configuration.

Deploy contract changes together. The client rejects legacy binary responses. Configure hosting security headers/CSP for the actual font/asset origins.

The current Vercel project is `phish-x`, with root directory `frontend`, Node24 and source files outside that directory enabled for `shared/scan.ts`. `frontend/vercel.json` defines the CSP and browser security headers. `npm run package:web` builds against the reviewed HTTPS API origin and packages only public assets into ignored `.vercel/output/` (Build Output APIv3); `vercel deploy --prebuilt` prepares a preview. The API origin must also be allowed by CSP. `.vercelignore` excludes backend, research, training data, tools and local secret files from source uploads. Platform CLIs/MCP/plugin setup is user-scoped, not an application dependency.

Gemini requires its own key and `GEMINI_ENABLED=true`. The current production configuration enables this bounded evidence-selection integration at the user's request; an operator can disable it explicitly. Validate a real `source: gemini` / `ai_status: complete` response after deployment rather than inferring success from a flag. No model API key is needed for local trained XGBoost inference. See [operations](OPERATIONS.md) for monitoring tokens, quotas, environment separation and rotation.

## Operational validation

The matching production release was deployed and verified on 3 November 2026. Release IDs, real provider/browser checks and exact operational followups are recorded in `.planning/phases/02-complete-audit/02-VERIFICATION.md`. Source remains uncommitted/unpushed. See [FREE-MONITORING.md](FREE-MONITORING.md) for the prepared free availability workflow and pending activation.

Verify reachability, no-key unknown behavior, provider failure states, consent, rate limits, refresh/expiry, private-target rejection, separate protocol checks and absent fake telemetry. Review logging retention, spending alerts, credentials rotation and full dependency audits. Mocked tests do not validate provider permissions or live API availability.
