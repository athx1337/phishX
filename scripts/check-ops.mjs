import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = '3.15.1';
const os = { win32: 'windows', linux: 'linux', darwin: 'darwin' }[process.platform];
const arch = { x64: 'amd64', arm64: 'arm64' }[process.arch];
if (!os || !arch) throw new Error('Unsupported promtool platform');
const name = `prometheus-${version}.${os}-${arch}`;
const archive = `${name}.tar.gz`;
const cache = resolve(root, '.cache/tools/prometheus', version);
const binary = resolve(cache, name, `promtool${os === 'windows' ? '.exe' : ''}`);
await mkdir(cache, { recursive: true });
if (!existsSync(binary)) {
  const base = `https://github.com/prometheus/prometheus/releases/download/v${version}`;
  const [release, checksums] = await Promise.all([fetch(`${base}/${archive}`), fetch(`${base}/sha256sums.txt`)]);
  if (!release.ok || !checksums.ok) throw new Error('Official promtool release download failed');
  const bytes = Buffer.from(await release.arrayBuffer());
  const expected = (await checksums.text()).split('\n').find(line => line.trim().endsWith(archive))?.split(/\s+/)[0];
  if (!expected || createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error('promtool checksum mismatch');
  const file = resolve(cache, archive); await writeFile(file, bytes);
  const unpack = spawnSync('tar', ['-xzf', file, '-C', cache, `${name}/${os === 'windows' ? 'promtool.exe' : 'promtool'}`], { encoding: 'utf8' });
  if (unpack.status !== 0) throw new Error('Cannot extract verified promtool');
  if (os !== 'windows') await chmod(binary, 0o755);
}
for (const args of [['check', 'rules', 'alerts.yml'], ['test', 'rules', 'alerts.test.yml'], ['check', 'config', '--syntax-only', 'prometheus.yml']]) {
  const result = spawnSync(binary, args, { cwd: resolve(root, 'ops'), encoding: 'utf8' });
  process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
  if (result.status !== 0) process.exit(result.status || 1);
}
const dashboard = JSON.parse(await readFile(resolve(root, 'ops/dashboard.json'), 'utf8'));
if (!dashboard.panels.length) throw new Error('Empty monitoring dashboard');
console.log(`Prometheus ${version}: syntax, alert behavior and dashboard JSON passed. Live scrape/alert routing requires operator configuration.`);
