/** Evaluate the shipped URL model locally. Inputs stay private; outputs contain IDs and hashes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { extractFeatures } from '../ml/features.mjs';
import { createPredictor } from '../ml/inference.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../backend-worker/package.json', import.meta.url));
const { parse } = require('tldts');
const ipaddr = require('ipaddr.js');
const hash = text => createHash('sha256').update(text).digest('hex');
globalThis.fetch = () => { throw new Error('Network requests are disabled in the offline evaluator.'); };

async function fileHash(path) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}

function canonicalize(input) {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.href.length > 4096) {
    throw new Error('Unsupported URL input');
  }
  url.hash = '';
  url.hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const domain = parse(host, { allowPrivateDomains: true }).domain;
  if (ipaddr.isValid(host)) {
    const address = ipaddr.process(host);
    if (address.range() !== 'unicast' || /^(?:192\.0\.0\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.|192\.88\.99\.)/.test(address.toString())) {
      throw new Error('Nonpublic URL input');
    }
  } else {
    const parsed = parse(host, { allowPrivateDomains: true });
    if (!domain || (!parsed.isIcann && !parsed.isPrivate) || /(?:^|\.)(?:localhost|local|internal|invalid|test|onion)$/.test(host)) {
      throw new Error('Ineligible URL input');
    }
  }
  return { url: url.href, domain: domain || host, schemeIndependent: url.href.replace(/^https?:/, '') };
}

function warningSummary(rows) {
  const count = rows.length;
  const warnings = rows.filter(row => row.warning).length;
  if (!count) return { count, warnings, misses: 0, warning_rate: null, wilson_95: null };
  const rate = warnings / count;
  const z = 1.959963984540054;
  const denominator = 1 + z * z / count;
  const center = (rate + z * z / (2 * count)) / denominator;
  const radius = z * Math.sqrt(rate * (1 - rate) / count + z * z / (4 * count * count)) / denominator;
  return { count, warnings, misses: count - warnings, warning_rate: rate,
    wilson_95: [Math.max(0, center - radius), Math.min(1, center + radius)] };
}

function percent(value) {
  return value === null ? 'Unavailable' : `${(100 * value).toFixed(2)}%`;
}

function reportMarkdown(report) {
  const sample = report.metrics.supplied_verified_online;
  const fresh = report.metrics.corpus_domain_disjoint_verified_online;
  const special = report.rows.find(row => row.id === '9554574');
  const lines = [
    '# Supplied PhishTank sample — frozen model evaluation', '',
    `Run ${report.checked_at}. Model ${report.model.version}. The warning threshold was frozen at ${report.model.warning_threshold}.`, '',
    `The supplied list contains ${report.counts.rows} rows. ${sample.count} were supplied with valid/online labels. ${report.counts.incomplete_labels} has incomplete label/status and is excluded from the positive-label metric. Labels were transcribed from the user. Independent live label confirmation was unavailable.`, '',
    '| Cohort | Rows | Model warnings | Model misses | Warning recall against supplied labels |',
    '| --- | ---: | ---: | ---: | ---: |',
    `| Supplied valid/online | ${sample.count} | ${sample.warnings} | ${sample.misses} | ${percent(sample.warning_rate)} |`,
    `| Corpus-domain-disjoint supplied valid/online | ${fresh.count} | ${fresh.warnings} | ${fresh.misses} | ${percent(fresh.warning_rate)} |`, '',
    `The descriptive Wilson 95% interval for supplied-label warning recall is ${sample.wilson_95 ? sample.wilson_95.map(percent).join(' to ') : 'unavailable'}. Shared domains and campaign patterns weaken the independent-row assumption. This small selected positive sample cannot estimate false-positive rate, precision, overall accuracy or traffic prevalence.`, '',
    `There are ${report.counts.unique_canonical_urls} canonical URLs and ${report.counts.unique_domains} registrable-domain groups. Against the entire pinned historical corpus, ${report.counts.corpus_exact_overlap} rows have an exact canonical match, ${report.counts.corpus_scheme_independent_overlap} have a match after removing the scheme, and ${report.counts.corpus_domain_overlap} have a domain match. The per-row results also identify matches with train, validation, calibration and historical test split hashes.`, '',
    'The runner imported the current runtime feature extractor and tree evaluator, verified the artifact, feature, corpus and split-manifest checksums, and rescanned the pinned corpus locally. It did not retrain, select a new threshold, fetch destinations, call reputation providers or submit URLs to Gemini. Raw URLs remain in ignored `.cache`; exported rows use PhishTank IDs and SHA256 hashes.', '',
  ];
  if (special) lines.push(`Entry 9554574 has calibrated model output ${special.calibrated_score.toFixed(6)} and ${special.warning ? 'reaches' : 'falls below'} the fixed warning threshold. Its supplied label/status is ${special.supplied_verified === true && special.supplied_online === true ? 'valid/online' : 'incomplete'}. Model output is a supporting warning measurement.`, '');
  lines.push('| PhishTank ID | Supplied status | Calibrated output | Warning | Historical exact/scheme/domain overlap |',
    '| --- | --- | ---: | --- | --- |');
  for (const row of report.rows) {
    const label = row.supplied_verified === true && row.supplied_online === true ? 'valid/online' : 'incomplete';
    lines.push(`| ${row.id} | ${label} | ${row.calibrated_score.toFixed(6)} | ${row.warning ? 'yes' : 'no'} | ${row.overlap.corpus_exact}/${row.overlap.corpus_scheme_independent}/${row.overlap.corpus_domain} |`);
  }
  lines.push('', 'Full redacted scores, hashes, overlap flags and reproduction metadata are in `PHISHTANK-HOLDOUT.json`.', '');
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--input' || args[2] !== '--output') {
    throw new Error('Usage: node scripts/evaluate-phishing-holdout.mjs --input <private JSON> --output <report directory>');
  }
  const inputPath = resolve(args[1]);
  const outputPath = resolve(args[3]);
  const inputText = await readFile(inputPath, 'utf8');
  const input = JSON.parse(inputText);
  assert.ok(Array.isArray(input.rows) && input.rows.length > 0 && input.rows.length <= 10_000, 'Bounded rows required');
  const artifactPath = resolve(root, 'model/xgboost-edge.json');
  const featurePath = resolve(root, 'ml/features.mjs');
  const corpusPath = resolve(root, 'ml/data/corpus.jsonl');
  const splitsPath = resolve(root, 'ml/data/split-manifest.json');
  const evaluation = JSON.parse(await readFile(resolve(root, 'model/evaluation.json'), 'utf8'));
  const artifact = JSON.parse(await readFile(artifactPath, 'utf8'));
  const fingerprints = {
    artifact_sha256: await fileHash(artifactPath), feature_sha256: await fileHash(featurePath),
    corpus_sha256: await fileHash(corpusPath), split_manifest_sha256: await fileHash(splitsPath),
  };
  for (const key of Object.keys(fingerprints)) assert.equal(fingerprints[key], evaluation[key], `Pinned ${key} mismatch`);
  const predict = createPredictor(artifact);
  const ids = new Set();
  const working = input.rows.map(row => {
    assert.match(row.id, /^\d{1,12}$/);
    assert.ok(!ids.has(row.id), 'Duplicate identifier'); ids.add(row.id);
    assert.ok([true, false, null].includes(row.verified) && [true, false, null].includes(row.online), 'Explicit label status required');
    const target = canonicalize(row.url);
    return { id: row.id, supplied_verified: row.verified, supplied_online: row.online, ...target,
      url_sha256: hash(target.url), domain_sha256: hash(target.domain),
      overlap: { corpus_exact: false, corpus_scheme_independent: false, corpus_domain: false, splits: {} } };
  });
  const splits = JSON.parse(await readFile(splitsPath, 'utf8'));
  for (const [name, values] of Object.entries(splits)) {
    const urls = new Set(values.urls);
    const domains = new Set(values.domains);
    for (const row of working) row.overlap.splits[name] = { exact: urls.has(row.url_sha256), domain: domains.has(row.domain_sha256) };
  }
  const byUrl = new Map();
  const bySchemeIndependent = new Map();
  const byDomain = new Map();
  for (const row of working) {
    for (const [map, key] of [[byUrl, row.url], [bySchemeIndependent, row.schemeIndependent], [byDomain, row.domain]]) {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
  }
  let corpusRows = 0;
  let corpusIneligible = 0;
  const lines = createInterface({ input: createReadStream(corpusPath), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    corpusRows += 1;
    let target;
    try { target = canonicalize(JSON.parse(line).url); }
    catch { corpusIneligible += 1; continue; }
    for (const row of byUrl.get(target.url) || []) row.overlap.corpus_exact = true;
    for (const row of bySchemeIndependent.get(target.schemeIndependent) || []) row.overlap.corpus_scheme_independent = true;
    for (const row of byDomain.get(target.domain) || []) row.overlap.corpus_domain = true;
  }
  const rows = working.map(row => {
    const score = predict(extractFeatures(row.url, row.domain));
    return { id: row.id, supplied_verified: row.supplied_verified, supplied_online: row.supplied_online,
      canonical_url_sha256: row.url_sha256, scheme_independent_url_sha256: hash(row.schemeIndependent),
      registrable_domain_sha256: row.domain_sha256, raw_score: score.raw_probability,
      calibrated_score: score.probability, warning: score.warning, overlap: row.overlap };
  });
  const verified = rows.filter(row => row.supplied_verified === true && row.supplied_online === true);
  const distinctVerified = verified.filter((row, index) => verified.findIndex(other => other.canonical_url_sha256 === row.canonical_url_sha256) === index);
  const allRows = warningSummary(rows);
  allRows.non_warnings = allRows.misses;
  delete allRows.misses;
  assert.equal(await fileHash(artifactPath), fingerprints.artifact_sha256, 'Model changed during evaluation');
  assert.equal(await fileHash(featurePath), fingerprints.feature_sha256, 'Features changed during evaluation');
  assert.equal(await fileHash(corpusPath), fingerprints.corpus_sha256, 'Corpus changed during evaluation');
  assert.equal(await fileHash(splitsPath), fingerprints.split_manifest_sha256, 'Split manifest changed during evaluation');
  const report = { checked_at: new Date().toISOString(), input_sha256: hash(inputText),
    source: 'User-supplied PhishTank listing transcription; labels have not been independently confirmed',
    model: { version: artifact.model_version, warning_threshold: artifact.warning_threshold, promoted: evaluation.promoted, ...fingerprints },
    counts: { rows: rows.length, unique_canonical_urls: byUrl.size, unique_domains: byDomain.size,
      incomplete_labels: rows.filter(row => row.supplied_verified === null || row.supplied_online === null).length,
      corpus_rows_scanned: corpusRows, corpus_ineligible_rows: corpusIneligible,
      corpus_exact_overlap: rows.filter(row => row.overlap.corpus_exact).length,
      corpus_scheme_independent_overlap: rows.filter(row => row.overlap.corpus_scheme_independent).length,
      corpus_domain_overlap: rows.filter(row => row.overlap.corpus_domain).length },
    metrics: { all_rows_descriptive: allRows, supplied_verified_online: warningSummary(verified),
      unique_supplied_verified_online: warningSummary(distinctVerified),
      corpus_domain_disjoint_verified_online: warningSummary(verified.filter(row => !row.overlap.corpus_domain)) },
    rows,
  };
  await mkdir(outputPath, { recursive: true });
  await writeFile(resolve(outputPath, 'PHISHTANK-HOLDOUT.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(resolve(outputPath, 'PHISHTANK-HOLDOUT.md'), reportMarkdown(report));
  console.log(JSON.stringify({ counts: report.counts, metrics: report.metrics,
    requested_entry: rows.find(row => row.id === '9554574'), model: report.model.version }));
}

main().catch(() => { console.error('Offline evaluation failed. Check the private input schema and pinned artifacts.'); process.exitCode = 1; });
