# UI-SPEC — phishX scan workspace

Status: implementation contract · 2026-11-03 · quick task 261103-rkk.

## Visual direction
Keep the original dark purple identity, atmospheric white/purple waves, gothic display headings and ASCII X on the idle home. The user's complaint concerns report organization. Do not recolor the application or replace the restored hero. Remove the visible pause/resume button and App's manual animation state. OS reduced motion, save-data/low-power and hidden-document suspension continue automatically.

Report changes from left-column content beside the hero into a centered full-width workspace (max-width about 1240px, 24px desktop/16px mobile gutters). Hero/HUD composition belongs to idle; do not repeat it beside results. Use the current sans body, mono for technical values, gothic for the principal verdict only. Plain readable headings for tabs/cards. Compact 16–20px panel padding, 12–16px gaps, 1px quiet borders, 8–12px radii; avoid oversized nested glass panels. No safety gauge, invented risk score or big success-green treatment.

## Report anatomy
```text
phishX                                                   Recent scans
REPORT · observed time · cached/current/expired        Refresh  New scan
┌───────────────────────────────────┬─────────────────────────────────┐
│ Verdict + short recommendation    │ actual-domain.example  [Copy]  │
│ Recorded summary                  │ requested URL / full hostname   │
│ [partial/expiry warning if needed]│ remote coverage + status counts │
└───────────────────────────────────┴─────────────────────────────────┘
  Overview       Sources (7)       Browser       Model & AI
┌───────────────────────────────────┬─────────────────────────────────┐
│ Why this assessment               │ Evidence assistant             │
│ Recorded reasons/provenance       │ true status + concise text     │
│                                   │ registration / observed targets│
└───────────────────────────────────┴─────────────────────────────────┘
Snapshot observed / expires / policy · caveat
```

The header and verdict/domain/coverage remain outside tab panels, with a short recommendation; overall report data is not copied into every tab. Full submitted URL wraps as text; registrable domain is prominent and selectable. Show hostname and Unicode difference when relevant. Copy has a polite announced outcome. Refresh and check-another actions remain visible. Repeated provider errors are summarized once with details in the source inspector.

### Overview
Two columns at ≥900px, one column below. Main column: recorded reasons with title, description, source, threat type, observed time and stable evidence IDs. Supporting column: concise grounded Gemini explanation/status (keep recognizably visible), registration source/registrar/creation/age/observed time, and requested protocol variants. Long reasons may be grouped with an explicit “Show all findings (N)” action, with all content reachable and evidence links resolving. Do not silently truncate evidence or explanation text. Observed destination summary is compact here with a route to complete destination assessments under Browser.

### Sources
Responsive source-card grid: four columns on wide screens and two on smaller screens. Render the engines returned by the scan. Cards are native buttons with a minimum interaction area of 44px, a readable name and status badge, a kind label, and a short message. The inspector shows the full message. Status is conveyed in text. Registration context has richer fields in the inspector and Overview and is counted separately from remote providers.

Click opens existing focus-managed Dialog titled with source name; card retains visible focus on close. Inspector contains engine status/type/message/error/observation timestamp, engine evidence and every requested target's URL/status/message/error/timestamps/expiry/evidence. Local model source also shows model/feature version, raw/calibrated output, threshold, promotion/shadow status and safety-probability limitation. Retain all valid source fields currently displayed. No nested source accordions required.

### Browser
Top line explains active-browser provenance, observation time and unavailable state. For multiple requested targets use explicit target selection; retain accessible target labels. Compact fact strip: IP, ASN, country, final observed URL. Focused subviews/selector for Navigation, Certificates, HTTP transactions, Reported risks and Observed links, with counts and real empty states. Scroll long tables/lists within readable bounds and keep headers visible if useful; do not impose whole-page horizontal scrolling. Navigation includes ordered redirect chain plus complete observed destination assessments: actual domain, verdict, summary, coverage, reasons and observed/expiry metadata. Keep requested schemes distinct from observed TLS/certificate facts. Links and transaction URLs are copyable/selectable text, never automatic links into an untrusted site. Certificates do not establish trust; empty risks do not establish safety.

### Model & AI
Show the trained XGBoost model's actual per-target provenance/output/threshold/shadow status and explanation of its supporting role. Show complete Gemini provenance, real model ID, referenced evidence and truthful deterministic fallback/status. Gemini is an evidence assistant; it cannot change the official verdict or independently browse/detect threats. Overview may show a compact instance of this explanation; avoid duplicate DOM anchors. Cross-tab evidence links must activate Overview and focus/scroll the mounted observation; a normal link must never point into an unmounted panel.

## Progress screen and lifecycle
```text
                         Inspecting example.com
                   Waiting for scan service · 00:04
                  No percentage available · Cancel request

After first validated response:
  Collecting browser observations                     elapsed 00:17
  Google Safe Browsing  No detection     URLhaus       Unavailable
  VirusTotal            Check failed     Cloudflare    Pending
  URL rules             No detection     XGBoost       No detection
  Registration          Context ready
  Remote coverage: 1/4 completed · 1 pending · 1 unavailable · 1 failed
  Next status check in 8s · active inspection deadline 02:43 remaining
                       Stop waiting and view partial report
```

Do not display final verdict, full report details or a fake progress bar before completion. Before the first POST response no provider completion is known; use submission/waiting text and elapsed time only. After first response show actual source statuses and meaningful real task facts; display terminal/completed remote counts separately. Text should explain updates are checked approximately every 10s, governed by the provider schedule; elapsed clock is not progress. Pending job holds the report until all target jobs are done and deep_scan is absent. Errors/unavailable/unknown are terminal outcomes, not indefinite blockers and not completed reputation coverage.

Normal finish moves focus to the published verdict heading. Explicit stop, fixed deadline or terminal polling failure reveals the last accepted snapshot with a persistent “Partial report” reason, pending/unverified warning and fresh-scan action. An untrackable pending response also exits as partial with an explanation. Before any response, cancel/error returns to scanner and an announced message. Providers may finish already-submitted work; preserve that cancellation limitation. Reset/rescan never lets a late old response replace the new state.

## Truth, privacy and expiry
Use current verdict/status labels and policy. “No known threats detected” is qualified by completed evidence and never promises safety. Error/unavailable/unknown/local contexts stay visibly distinct. Coverage denominator counts remote reputation/active sources only, not heuristics/model/registration. Missing checks do not establish safety. Preserve checked URLs, destination-specific assessments, timestamps, report cache provenance and policy version. Expired negative is neutral “Report expired”; historical malicious/suspicious warning remains. Expiry warning sits above tab content and refresh remains operable.

Preserve pre-submit third-party sharing/unlisted-not-private disclosure, sensitive-parameter acknowledgement, legal modal and off-by-default redacted history. No new Gemini payload fields or page/URL sharing. New report layout must retain access to existing privacy/terms.

## Accessibility and responsive acceptance
- Native buttons and semantic sections/headings; tablist/tab/tabpanel with unique IDs, aria-selected/controls, roving tab focus and ArrowLeft/Right/Home/End support. Four tab labels fit 390px through compact type/padding or a discoverable tablist-only overflow.
- Focus on progress heading when it replaces the form, on verdict at final publish, and restore focus to source button after Dialog Escape/close. No focus jumps on each elapsed tick/poll. Dialog uses existing trap/inert/body-scroll behavior.
- Announce source transitions/phase/retry/partial result in one polite live region, not elapsed/next-poll countdown every second. Use alert for blocking errors/expiry as existing policy requires. Status is understandable without color. Visible focus and minimum 44px action target.
- Long URLs wrap; tables may have their own labeled horizontal overflow. At 390px no page overflow; at 1440px report uses the available workspace, not the old seven-column slot. At 200% zoom content reflows and tabs/inspector remain usable.
- Static reduced-motion presentation retains all data and actions. No entrance sequence delays access to report data. Verify automated axe plus manual keyboard flow, meaningful screenshots and zero runtime errors.

## Evidence checklist
Root captures idle home, first-response progress, desktop Overview, mobile report and source Dialog. Tests use rich valid fixtures covering dual protocols, all statuses, registration, model shadow/promoted data, Gemini complete/fallback, redirects/destinations/certificates/transactions/risks/links and expiry. Synthetic tests and actual public scan evidence are labeled separately.
