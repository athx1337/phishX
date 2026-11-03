import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = '8.30.1';
const platform = { win32: 'windows', linux: 'linux', darwin: 'darwin' }[process.platform];
const arch = { x64: 'x64', arm64: 'arm64' }[process.arch];
if (!platform || !arch) throw new Error('Install Gitleaks 8.30.1 manually on this platform; scanner has not run.');
const cache = path.join(root, '.cache', 'tools', 'gitleaks', version);
await mkdir(cache, { recursive: true });
const name = `gitleaks_${version}_${platform}_${arch}.${platform === 'windows' ? 'zip' : 'tar.gz'}`;
const base = `https://github.com/gitleaks/gitleaks/releases/download/v${version}/`;
async function download(name) {
  const destination = path.join(cache, name);
  try { return await readFile(destination); } catch { /* Download only pinned official release artifacts. */ }
  const response = await fetch(base + name, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Gitleaks download failed (HTTP ${response.status}); scanner has not run.`);
  const data = Buffer.from(await response.arrayBuffer()); await writeFile(destination, data); return data;
}
const checksums = (await download(`gitleaks_${version}_checksums.txt`)).toString('utf8');
const archive = await download(name);
const expected = checksums.split(/\r?\n/).find(line => line.trim().endsWith(name))?.split(/\s+/)[0];
const actual = createHash('sha256').update(archive).digest('hex');
if (!expected || actual !== expected) throw new Error('Gitleaks archive checksum mismatch; refusing to execute.');
const executable = platform === 'windows' ? 'gitleaks.exe' : 'gitleaks';
const extraction = spawnSync('tar', ['-xf', path.join(cache, name), '-C', cache, executable], { encoding: 'utf8', windowsHide: true });
if (extraction.status !== 0) throw new Error('Could not extract the verified scanner archive.');
const scanner = path.join(cache, executable);
const temporary = await mkdtemp(path.join(os.tmpdir(), 'phishx-secret-scan-'));
let failed = false;
try {
  const input = path.join(temporary, 'input'); await mkdir(input);
  const gitFiles = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (gitFiles.status !== 0) throw new Error('Cannot enumerate repository files; scanner has not run.');
  const files = [...new Set(gitFiles.stdout.split('\0').filter(Boolean))].filter(file => !file.startsWith('.agents/') && file !== 'repo');
  for (const file of files) {
    const source = path.resolve(root, file);
    if (!source.startsWith(root + path.sep)) throw new Error('Unexpected repository path.');
    try {
      const info = await stat(source); if (!info.isFile()) continue;
      const destination = path.join(input, file); await mkdir(path.dirname(destination), { recursive: true });
      await cp(source, destination);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const modes = [['working tree', ['dir', input]], ['Git history', ['git', root, '--log-opts=--all']]];
  for (const [label, args] of modes) {
    const report = path.join(temporary, `${label.replaceAll(' ', '-')}.json`);
    const result = spawnSync(scanner, [...args, '--no-banner', '--redact=100', '--log-level=error', '--report-format=json', `--report-path=${report}`], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    if (result.status !== 0 && result.status !== 1) throw new Error(`Gitleaks ${label} could not complete (exit ${result.status}).`);
    const findings = JSON.parse(await readFile(report, 'utf8')) || [];
    if (findings.length) {
      failed = true;
      // Intentionally never echo scanner output, Secret, Match or Line fields.
      console.error(JSON.stringify({ mode: label, findings: findings.map(finding => ({ rule: finding.RuleID, file: finding.File.replace(input, ''), line: finding.StartLine })) }));
    } else console.log(`Gitleaks ${version}: ${label} passed (${label === 'working tree' ? files.length + ' source paths' : 'all available history'}).`);
  }
} finally {
  // Only remove this exact verified temporary directory, never a derived repository path.
  if (path.dirname(temporary) !== path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith('phishx-secret-scan-')) throw new Error('Unexpected scanner temporary path; cleanup refused.');
  await rm(temporary, { recursive: true, force: true });
}
if (failed) process.exitCode = 1;
