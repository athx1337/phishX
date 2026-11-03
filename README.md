# phishX

Evidence-driven, free educational URL threat analysis with React and Cloudflare Workers. phishX combines genuine trained XGBoost inference and explainable URL rules with optional Google Safe Browsing, URLhaus, VirusTotal and Cloudflare URL Scanner evidence.

**A missing detection is not proof of safety.** Reports show what was checked, what failed, when observations were made and why a verdict was reached. Model output is separate supporting evidence, with its version and threshold; there is no numerical website safety probability.

## Verdicts

| Outcome | Meaning |
| --- | --- |
| Malicious URL | Strong threat-intelligence evidence; avoid interacting with the URL. |
| Suspicious URL | Explainable deception, weaker/stale positive intelligence or conflicting findings warrant caution. |
| No known threats detected | Sufficient fresh reputation checks returned no known threat or warning. This does not establish legitimacy or safety. |
| Unable to determine | Evidence is insufficient, unknown, unavailable, failed or pending. |

Errors never become clean findings. Unresolved shortener destinations remain unverified. Missing reports remain absent. A raw GitHub Gist is not automatically malicious; an ordinary `/login` path is not independently a phishing finding. Explanations are derived from recorded evidence, without ungrounded generative prose.

## Architecture

```text
React client → Hono Worker → validation, explainable heuristics and XGBoost trees
                         → distributed budgets/concurrency/circuits/metrics
                         → RDAP and bounded destination reassessment
                         → concurrent reputation providers
                         → evidence/coverage policy → versioned report
                         → optional unlisted Cloudflare scan jobs
Client polls short-lived job → updated authoritative report
Optional KV → scope-aware cache and bounded active-scan jobs
Per-scan Durable Object → revisioned canonical job state and fixed deletion alarm
Optional browser storage → redacted, expiring history
```

The Worker calls fixed provider endpoints; it does not crawl submitted websites itself. Cloudflare performs optional remote active inspection. New `ml/` and `model/` artifacts train, evaluate and serve actual XGBoost trees; archived `repo/` research is separate. Optional Gemini selects recorded evidence for deterministic explanation and cannot change the verdict.

| Location | Responsibility |
| --- | --- |
| `shared/scan.ts` | v2 types, verdict labels, runtime validation and privacy helpers |
| `backend-worker/src/` | Validation, heuristics, adapters, policy, cache/jobs and routes |
| `frontend/src/` | Scanner, evidence report, coverage, actual domain and history |
| `frontend/test/`, `tests/` | Component/workflow and shared contract/privacy regressions |
| `frontend/e2e/` | Controlled browser tests with mocked API responses |
| `ml/`, `model/` | Reproducible training, native/edge parity, heldout evaluation and model artifacts |
| `ops/`, `scripts/` | Aggregate monitoring, tested alerts and real secret/artifact checks |
| `.planning/` | Audit-derived requirements, plan review and verification records |
| `repo/` | Archived research; never loaded by the production scanner |

## Local setup

Use **Node.js 22.12+**; Node 24 is the development/CI default (`.nvmrc`). Install each application from its lockfile:

```powershell
npm ci --prefix backend-worker
npm ci --prefix frontend
Copy-Item backend-worker/.dev.vars.example backend-worker/.dev.vars
Copy-Item frontend/.env.example frontend/.env
```

Start these in separate terminals:

```powershell
npm run dev:api
```

```powershell
npm run dev:web
```

The API defaults to `http://localhost:8787`; Vite defaults to `http://localhost:5173`. `VITE_API_URL` changes the API target and is embedded at **build time**.

No provider key is required to start development. Without reputation credentials, ordinary URLs return **Unable to determine**; suspicious structures can still produce explainable warnings. Health checks demonstrate API reachability, not provider health.

### Configuration

| Binding | Purpose |
| --- | --- |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Safe Browsing v5 reputation, independently configured |
| `URLHAUS_API_KEY` | Malware-distribution lookup |
| `VIRUSTOTAL_API_KEY` | Existing URL intelligence and actual domain metadata |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | URL Scanner v2; token needs Scanner read/write permissions |
| `SCAN_CACHE` | Optional KV for reports and active-scan jobs |
| `ALLOWED_ORIGINS` | Comma-separated exact permitted frontend origins |
| `CACHE_CONFIG_VERSION` | Operator-controlled cache generation when provider configuration changes |
| `SCAN_RATE_LIMITER`, `POLL_RATE_LIMITER` | Managed creation/poll rate-limit bindings in Wrangler |
| `SCAN_COORDINATOR`, `CLIENT_ID_SECRET` | Durable Object budgets, concurrency and privacy-safe client identity |
| `METRICS_TOKEN` | Independent bearer token for aggregate metrics |
| `GEMINI_ENABLED`, `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional bounded evidence selection; disabled by default |

Managed limiters and production coordination are required for scan routes; missing required infrastructure fails closed with HTTP 503. Follow `.dev.vars.example` for localhost-only development. Local Wrangler supplies configured bindings. KV is optional: without it, reputation/heuristic results still work, but Cloudflare jobs are unavailable. Store production credentials as Cloudflare secrets. A Gemini key never substitutes for a Safe Browsing key.

Safe Browsing is intended for non-commercial use; evaluate [Google Web Risk](https://cloud.google.com/web-risk) or a suitable licensed alternative before commercial deployment. Review all provider terms and quotas.

## Checks

```powershell
npm run check
```

This runs backend type checking, frontend lint, shared/backend/frontend tests and a production build. Individual commands include `npm run test:contract`, `npm run test:api`, `npm run test:web`, `npm run lint` and `npm run build`.

Browser checks:

```powershell
cd frontend
npx playwright install chromium
npm run test:e2e
```

Tests use synthetic fixtures and do not call live scanners. The verification records under `.planning/phases/02-complete-audit/` record the expanded checks and live-provider observations; phase01 records the earlier baseline. Mocked tests do not prove live account permissions or detection accuracy.

Run `npm audit --prefix frontend` and `npm audit --prefix backend-worker` for dependency review. CI gates full dependency trees, model parity, real secret scanning and alert rules. Run `npm run test:model`, `npm run scan:secrets` and `npm run check:ops`. Development-tool advisories must be evaluated separately from shipped code; an audit pass is not a security certification.

## API, deployment and privacy

See [API v2](docs/API.md), [privacy/retention](docs/PRIVACY.md), [threat model](docs/THREAT-MODEL.md), [deployment](docs/DEPLOYMENT.md), [operations](docs/OPERATIONS.md), [complete technical audit](docs/TECHNICAL-AUDIT.md) and [concern traceability](docs/AUDIT-TRACEABILITY.md). The matching client/API are live at [phish-x.vercel.app](https://phish-x.vercel.app) and [backend-worker.phish-x.workers.dev](https://backend-worker.phish-x.workers.dev). The client rejects legacy binary responses. Local tests alone do not publish or provision resources.

A [free GitHub Actions availability monitor](docs/FREE-MONITORING.md) is prepared and live-tested. Source publication, a repository metrics secret and verified notification delivery are still required; a temporary successful Prometheus scrape does not establish ongoing alerting.

## Research and limitations

No held-out benchmark establishes that phishX outperforms SENTINEL-X or another scanner. The comparison audit supplied requirements, not comparative detection measurements. URLhaus covers malware distribution rather than all phishing; VirusTotal supplies historical vendor intelligence rather than fresh independent scans of every submitted URL. Explainable heuristics are not calibrated probabilities.

The new model has an executed temporal/domain-disjoint heldout evaluation with documented false positives and substantial false negatives in `model/`. Archived notebook accuracy does not apply to this scanner. [Research limitations](docs/RESEARCH.md) describe duplicate rows, leakage risk, extractor defects and environment gaps. Newly created, targeted, compromised or cloaked sites can evade both reputation and URL-only analysis. A report says **No known threats detected**, never “safe to visit.”

## Credits and license

Historical research was adapted from [Shreya Gopal's project](https://github.com/shreyagopal/Phishing-Website-Detection-by-Machine-Learning-Techniques). MIT license; see [LICENSE](LICENSE).

Unicode confusables carry their [Unicode V3 notice](backend-worker/src/data/UNICODE-LICENSE.txt). Training datasets/model derivatives have separate [attribution and terms](model/LICENSE-DATA.md); the code's MIT license does not replace those terms.
