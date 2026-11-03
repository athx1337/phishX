import { defineConfig } from 'vitest/config';

// Provider tests run with controlled fetch/KV fixtures, never production credentials.
// Real Workers compatibility is checked separately by Wrangler dry-run/runtime smoke.
export default defineConfig({ test: { environment: 'node', include: ['test/**/*.spec.ts'], restoreMocks: true } });
