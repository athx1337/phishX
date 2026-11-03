# Phase research — 2026-11-03

## Inputs reconciled
The prior local audit inspected sources/notebooks/data and ran read-only probes. The supplied pasted audit examined older public code. Its missing-cache/missing-timeout claims do not apply to the current local baseline, but its trust failures do. Preserve those mechanisms and correct scope, freshness and failure handling.

## Primary provider contracts
- Cloudflare URL Scanner v2 submits POST /urlscanner/v2/scan and polls GET /urlscanner/v2/result/:id. Explicit Unlisted visibility; report verdicts.overall.malicious, task success/scope, page/lists/data. Poll at least ten seconds apart. https://developers.cloudflare.com/radar/investigate/url-scanner/
- GSB v5 GET /v5/urls:search returns threats and cacheDuration, including negative-result validity. Independent API credential, no Gemini key substitution. https://developers.google.com/safe-browsing/reference/rest/v5/urls/search
- VirusTotal URL objects expose vendor counts/date/categories; domain objects expose registrar/creation/WHOIS observation. Unknown/empty/stale responses cannot establish fresh coverage. https://docs.virustotal.com/reference/url-object and https://docs.virustotal.com/reference/domains-object
- Managed Worker rate-limit bindings provide approximate per-location counters, not atomic global billing limits. https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- KV keys are bounded, TTL has a minimum, and storage is eventually consistent. Hash scope/policy keys; enforce logical expiry independently. https://developers.cloudflare.com/kv/api/write-key-value-pairs/

## Implementation choices
tldts for registrable-domain boundaries, ipaddr.js for prohibited IP ranges, punycode for Unicode display. Remote browsing stays delegated to Cloudflare; fixed DoH preflight is not a guarantee about the provider's later DNS/redirect behavior. No trained model or generative narrative is needed to explain deterministic evidence faithfully.

## Review feedback applied
Explicit coverage semantics, strict nested/runtime freshness validation, job expiry and budgets, malformed provider/cache gates, VT empty evidence, official-domain exclusions and result-scope correlation are verification requirements.
