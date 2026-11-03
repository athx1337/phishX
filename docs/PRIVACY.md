# URL sharing and retention

Submitting a URL can disclose its path/query to Google Safe Browsing, URLhaus, VirusTotal and Cloudflare. Reset tokens, email addresses and session data can occur in URLs. Sensitive parameter keys/fragments trigger an acknowledgement requirement; this heuristic cannot recognize every secret. Do not submit confidential links.

After acknowledgement the lookup is not silently stripped of all parameters: path/query differences can identify malicious resources. HTTP user information is rejected. Fragment handling follows backend normalization.

## Application storage

RDAP registration lookups send only the registrable domain to the IANA-listed registry; they do not send the path or query. The report's `third_party_submission` flag conservatively includes attempted registration lookups as well as configured full-URL reputation/active checks. The IANA bootstrap request itself uses a fixed URL.

- Optional KV report keys are hashed by scope/policy/configuration; values still contain the URL/report. Hashing keys is not anonymizing stored values.
- Active scans require short-lived job state. Production uses per-scan Durable Objects with fixed-expiry deletion alarms; local tests can use KV. KV also holds bounded submission reservations/provider/report caches. Random job IDs are temporary read capabilities.
- Job objects retain URL/report payloads until the three-minute scan deadline plus sixty seconds. Admission/metrics objects are separate and retain no submitted URLs. Full-report caching is capped at120seconds; source-specific GSB cache entries honor returned validity, bounded to24hours.
- Reports/status/errors use `Cache-Control: no-store`.
- Browser history is opt-in, limited to 50 entries/seven days, redacts query values and removes fragments. Clear it in the history drawer. Paths may remain sensitive.
- Old raw history is not silently migrated into the new opt-in format.
- No application account, permanent scan-history database or analytics identity is required.

## External retention

Cloudflare submissions explicitly request **Unlisted**. This removes normal listings/search visibility, but does not make a report confidential; someone who obtains its identifier may be able to access it. Providers have independent logging/retention policies.

Clearing browser history or expiring KV does not delete external copies. Cancelling a request cannot undo an accepted provider submission. phishX cannot promise universal transient processing or third-party deletion.

Gemini is optional and disabled by default. If explicitly enabled by the operator, it receives the official verdict and bounded evidence IDs/titles rather than submitted URLs, path/query or page content. It can select only existing evidence IDs; text is rendered from validated stored observations and deterministic templates. Failed/invalid selection falls back to deterministic explanation. Existing evidence descriptions in the final report may still contain domains/URLs; this does not imply those descriptions were sent to Gemini.

## Operations

Use independent minimally scoped production secrets, separate environments and exact permitted origins. Do not add full URLs/report payloads to analytics or raw provider errors to logs. Platform request logs can record metadata; operators must configure access/retention. Review [Cloudflare visibility/retention](https://developers.cloudflare.com/radar/investigate/url-scanner/) and each provider's terms.

The coordinator uses a daily HMAC of the trusted Cloudflare client address for anonymous budgets and stores aggregate counters/short-lived concurrency leases. Raw IPs are not stored in application coordinator state. Protected metrics expose bounded provider/status/route labels, not URLs or client identifiers. Local XGBoost feature extraction/inference does not submit the URL to another ML service. See [operations](OPERATIONS.md) for token rotation and environment separation.
