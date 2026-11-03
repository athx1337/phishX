# Free monitoring on existing platforms

Investigated and live-tested 3 November 2026. **Recommended: GitHub Actions for basic availability alerts on the existing public `athx1337/phishX` repository.** Configuration was published in source release `dc1b315`. Its repository metrics secret and notification delivery remain unverified; publication alone does not establish working alerts.

## Verified platform fit

| Option | Finding | Decision |
| --- | --- | --- |
| Vercel | Current team is Hobby. Runtime/error anomaly alerts require Pro or Enterprise with Observability Plus. Ordinary deployment/usage notifications are separate | Keep existing account notifications; not the free provider-health monitor |
| Cloudflare standalone Health Checks | Free has zero checks | No paid upgrade |
| Cloudflare Cron plus email | Sending to verified account destinations can be free. Email Service requires a domain on Cloudflare DNS. Accessible account has zero zones and zero verified email destinations; notification-policy API access returned 403 with the current OAuth scope | Not ready on this account; do not invent a sender or recipient |
| GitHub Actions | Existing repository is public. Standard hosted runners in public repositories are free. Workflow failures can use the owner's existing email/web notification preferences | Prepare a lightweight scheduled check with no third-party account, notification credential, package install or retained artifact |

Primary sources: [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [workflow notifications](https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs), [schedule limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [Vercel Alerts](https://vercel.com/docs/alerts), [Cloudflare Health Checks availability](https://developers.cloudflare.com/health-checks/), [Cloudflare Email pricing](https://developers.cloudflare.com/email-service/platform/pricing/), [email domain setup](https://developers.cloudflare.com/email-service/get-started/send-emails/). Pricing/availability must be rechecked if plans or repository visibility change.

## Prepared implementation and actual checks

`.github/workflows/monitor.yml` runs `scripts/monitor-production.mjs` every 15 minutes at minutes 7/22/37/52 and supports a manual run. It uses a standard Ubuntu runner, Node 24, read-only repository permissions, no persisted checkout credential, a three-minute timeout and no cache/artifact storage. It runs only for the intended repository and never on pull requests.

Four checks verify the public frontend HTML/security headers, the API's schema-v2 ping, anonymous metrics rejection and an authenticated OpenMetrics response with coordinator lease gauges. A failure is confirmed once after five seconds, then the run fails. Requests have 12-second timeouts, bounded bodies and disabled redirect following. The bearer token goes only to the fixed production metrics endpoint; output contains check labels, never response bodies, headers or secret values. No scan submission or reputation/browser lookup is performed. A healthy run makes three Worker requests and one frontend request: approximately 288 Worker requests/day at the nominal schedule.

Ten regression tests cover health, missing secrets, outages, header/contract drift, accidentally public metrics, authenticated redirects, incomplete/oversized responses and secret-safe errors. The script also passed all four checks against the actual production deployment with its real metrics token.

## Activation still required

1. The workflow and script were reviewed and published to `main` in user-authorized source release `dc1b315`. Verify that revision or a later reviewed update remains on the default branch.
2. Add the independent production metrics token as the repository Actions secret `PHISHX_METRICS_TOKEN`. Use the value already held in the ignored private `backend-worker/.dev.vars.production` file or rotate it deliberately. Do not put it in Git, workflow YAML, repository variables or a URL. Repository administrators and default-branch workflow code can access this secret; it grants aggregate metrics access only.
3. The owner who creates/enables the schedule must enable GitHub Actions email/web notifications, optionally failures only, in [notification settings](https://github.com/settings/notifications). Scheduled notifications follow the cron author or the user who re-enables it; they are not automatically sent to every collaborator.
4. Run **Production availability** manually in [repository Actions](https://github.com/athx1337/phishX/actions), verify success, then perform an agreed controlled failure test and confirm receipt. Delivery has not been tested and no message has been sent by this task.

Git source publication is now authenticated and verified. Repository-secret configuration and personal notification settings have not been verified; Git push access alone does not prove either is configured.

## Limits and full provider alerts

This is a basic availability/configuration monitor. It does not evaluate the six Prometheus rate/histogram rules, test external providers by submitting URLs, replace a persistent time-series database, measure detection accuracy, verify remaining account quota or promise an availability SLO. GitHub schedules can be delayed or dropped and public-repository schedules are disabled after 60 days without repository activity. Keep an independent reminder/activity review; do not treat silence as proof of health. Repeated failures can generate repeated run notifications according to personal preferences.

The six rules in `ops/alerts.yml` are syntax/behavior tested and were loaded into a real Prometheus 3.15.1 process that successfully scraped production (0.596 seconds, no scrape error). That temporary process was stopped. Continuous provider-rate alerts still need a persistent Prometheus/Alertmanager host and a verified delivery route; there is no such host established on the accessible accounts. See [OPERATIONS.md](OPERATIONS.md).
