import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const version = '18.0.0';
// Unicode's release directory can lag its already versioned latest document.
let source = `https://www.unicode.org/Public/security/${version}/confusables.txt`;
let response = await fetch(source, { signal: AbortSignal.timeout(30000), redirect: 'error' });
if (response.status === 404) { source = 'https://www.unicode.org/Public/security/latest/confusables.txt'; response = await fetch(source, { signal: AbortSignal.timeout(30000), redirect: 'error' }); }
if (!response.ok) throw new Error(`Unicode data download failed: ${response.status}`);
const data = await response.text();
if (data.length > 3_000_000 || !data.includes('confusables') || !data.includes(`# Version: ${version}`)) throw new Error('Unexpected Unicode data/version; review the upstream release before updating.');
const mappings = {};
for (const line of data.split('\n')) {
  const match = /^([0-9A-F ]+)\s*;\s*([0-9A-F ]+)\s*;/.exec(line);
  if (!match) continue;
  const from = String.fromCodePoint(...match[1].trim().split(/\s+/).map(value => parseInt(value, 16)));
  const to = String.fromCodePoint(...match[2].trim().split(/\s+/).map(value => parseInt(value, 16)));
  mappings[from] = to;
}
const directory = new URL('../src/data/', import.meta.url);
const licenseResponse = await fetch('https://www.unicode.org/license.txt', { signal: AbortSignal.timeout(30000), redirect: 'error' });
if (!licenseResponse.ok) throw new Error('Unicode redistribution notice could not be retrieved.');
const license = await licenseResponse.text();
if (!license.startsWith('UNICODE LICENSE V3') || license.length > 20000) throw new Error('Review the changed Unicode license before updating.');
await mkdir(directory, { recursive: true });
await writeFile(new URL('confusables.json', directory), JSON.stringify(mappings));
await writeFile(new URL('UNICODE-LICENSE.txt', directory), license);
await writeFile(new URL('unicode-manifest.json', directory), JSON.stringify({ version, source, source_sha256: createHash('sha256').update(data).digest('hex'), mappings: Object.keys(mappings).length, license: 'Unicode-3.0', license_url: 'https://www.unicode.org/license.txt', standard: 'https://www.unicode.org/reports/tr39/' }, null, 2) + '\n');
console.log(`Pinned ${Object.keys(mappings).length} mappings from Unicode ${version} in ${fileURLToPath(directory)}`);
