# Dependency review — 2026-11-03

The frontend lockfile received compatible patch/minor updates for Vite, PostCSS-related packages, source-map-js and other transitive fixes. Newly added test tooling uses Vitest 5.1, compatible with Vite 7 and the supported Node versions, avoiding the vulnerable older Vitest/tinypool tree.

The full frontend audit now returns **zero advisories**, including development dependencies. ESLint was upgraded to 10.14 with supported hooks/refresh plugins; the older React plugin only supplied two JSX reference-bookkeeping rules, which were replaced with a small local lexical-reference rule. Normal unused-variable and Hooks checks remain enabled. An explicit `minimatch ^11.0.1` override removes the glob-amplification advisory throughout the tooling tree. Compatibility tests verify JSX member references, real unused variables, nested source/test config matching and ignored build output; actual lint, component and browser checks are also required.

See the official [ESLint 10 migration](https://eslint.org/docs/latest/use/migrate-to-10.0.0) and [minimatch 11.0.1 release](https://github.com/isaacs/minimatch/releases/tag/v11.0.1). Re-run the complete audits after every dependency change; production-only checks do not cover tooling.

The backend has a separate lockfile and audit recorded in the phase verification. CI audits both complete trees at moderate severity, runs real Gitleaks with redacted findings, and checks committed model/parity hashes and Prometheus rules. Dependabot watches packages/actions. Registry advisory state changes; this is a dated observation, not an ongoing guarantee.
