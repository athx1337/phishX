import type { EngineResult } from '../../shared/scan';
import { aggregate, evidence, target } from './evidence';
import type { ParsedInput } from './url';
import confusables from './data/confusables.json';

const BRANDS: Record<string, string[]> = {
  // Verified sources: google.com/supported_domains; PayPal help432 (PayPal.Me).
  paypal: ['paypal.com', 'paypalobjects.com', 'paypal.me'], google: ['google.com', 'google.co.uk', 'google.co.in', 'google.de', 'google.fr', 'google.com.au', 'google.co.jp', 'google.ca', 'google.co.nz', 'google.it', 'google.es', 'googleusercontent.com', 'gstatic.com'],
  microsoft: ['microsoft.com', 'microsoftonline.com', 'live.com', 'office.com', 'outlook.com', 'windows.com'],
  apple: ['apple.com', 'icloud.com'], amazon: ['amazon.com', 'amazon.co.uk', 'amazon.in', 'amazon.de', 'amazon.com.au', 'amazonaws.com'],
  facebook: ['facebook.com', 'fb.com', 'meta.com'], instagram: ['instagram.com'], netflix: ['netflix.com'],
  github: ['github.com', 'githubusercontent.com'], dropbox: ['dropbox.com', 'dropboxusercontent.com'],
};
const SHORTENERS = new Set(['bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'is.gd', 'ow.ly', 'cutt.ly', 'buff.ly', 'shorturl.at']);
/** UTS #39 skeleton is an internal comparison form, never a user-facing hostname. */
export function skeleton(value: string): string {
  const mappings = confusables as Record<string, string>;
  return [...value.normalize('NFD').toLowerCase()].map(c => mappings[c] || c).join('').normalize('NFD').toLowerCase();
}
function oneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, differences = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++differences > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return differences + (i < a.length || j < b.length ? 1 : 0) === 1;
}
export function analyzeHeuristics(input: ParsedInput): EngineResult {
  const { hostname, registrable_domain: domain, unicode_hostname: unicode, is_ip: isIp } = input.domain;
  return aggregate('heuristics', 'URL heuristic analysis', 'heuristic', input.targets.map(url => {
    const findings = [];
    const labels = unicode.toLowerCase().split('.');
    const mapped = skeleton(unicode.toLowerCase());
    for (const [brand, legitimate] of Object.entries(BRANDS)) {
      if (domain && legitimate.includes(domain)) continue;
      const exact = labels.some(label => label === brand || label.split('-').includes(brand));
      const brandSkeleton = skeleton(brand);
      const confusing = mapped.split('.').some(label => label === brandSkeleton || label.split('-').includes(brandSkeleton));
      const rootLabel = domain?.slice(0, domain.indexOf('.')) || '';
      const typo = brand.length >= 5 && rootLabel.length >= 5 && oneEdit(rootLabel, brand);
      if (exact || confusing || typo) findings.push(evidence('URL heuristic analysis', `brand-${brand}`, `${brand[0].toUpperCase() + brand.slice(1)} name outside its recognized domain`,
        `The hostname resembles ${brand}, but the registrable domain is ${domain || hostname}. This is an explainable impersonation warning, not a confirmed reputation detection.`, 'warning', 'suspicious_structure', url));
    }
    if (isIp) findings.push(evidence('URL heuristic analysis', 'ip-host', 'IP address destination', 'The URL uses an IP address rather than a registrable domain. This limits identity checks.', 'warning', 'suspicious_structure', url));
    if (SHORTENERS.has(hostname)) findings.push(evidence('URL heuristic analysis', 'shortener', 'Known link shortener', 'The hostname belongs to a known shortening service. The final destination has not been inferred from the URL text.', 'info', 'suspicious_structure', url));
    if (/xn--/i.test(hostname) && !findings.some(f => f.id.startsWith('brand-'))) findings.push(evidence('URL heuristic analysis', 'idn', 'Internationalized hostname', `Unicode hostname: ${unicode}. Internationalized names are not inherently malicious.`, 'info', 'suspicious_structure', url));
    return target(url, findings.some(f => f.severity !== 'info') ? 'detected' : 'no_detection', { evidence: findings });
  }));
}
