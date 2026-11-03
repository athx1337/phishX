/** Build and package only public static assets using Vercel Build Output API v3. */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const api = new URL(process.env.VITE_API_URL || 'https://backend-worker.phish-x.workers.dev');
if (api.protocol !== 'https:' || api.username || api.password || api.pathname !== '/' || api.search || api.hash) throw Error('Use an HTTPS API origin without credentials, path or parameters.');
const hosting = JSON.parse(await readFile(path.join(root, 'frontend/vercel.json'), 'utf8'));
const headers = Object.fromEntries(hosting.headers[0].headers.map(item => [item.key, item.value]));
if (!headers['Content-Security-Policy'].split(';').find(rule => rule.trim().startsWith('connect-src '))?.split(/\s+/).includes(api.origin)) throw Error('Review the hosting CSP for this API origin before packaging.');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw Error('Run through npm run package:web so the selected package manager is explicit.');
const build = spawnSync(process.execPath, [npmCli, '--prefix', 'frontend', 'run', 'build'], { cwd: root, stdio: 'inherit', env: { ...process.env, VITE_API_URL: api.origin }, windowsHide: true });
if (build.status !== 0) throw Error('Frontend build failed; no deployment artifact was packaged.');
const output = path.resolve(root, '.vercel/output');
// This exact generated directory is the only recursive cleanup target.
if (path.dirname(output) !== path.join(root, '.vercel') || path.basename(output) !== 'output') throw Error('Unexpected output directory; cleanup refused.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, 'frontend/dist'), path.join(output, 'static'), { recursive: true });
const routes = hosting.headers.map(rule => ({ src: rule.source, headers: Object.fromEntries(rule.headers.map(item => [item.key, item.value])), continue: true }));
await writeFile(path.join(output, 'config.json'), JSON.stringify({ version: 3, routes: [...routes, { handle: 'filesystem' }] }, null, 2) + '\n');
console.log(`Packaged public static assets for ${api.origin}; provider credentials and repository source are excluded.`);
