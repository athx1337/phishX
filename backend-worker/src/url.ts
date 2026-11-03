import { parse } from 'tldts';
import ipaddr from 'ipaddr.js';
import { toUnicode } from 'punycode/';
import { hasSensitiveParameters } from '../../shared/scan';
import type { ScanReport, VerifyRequest } from '../../shared/scan';
import { PublicError } from './types';

export interface ParsedInput {
  primary: string;
  targets: string[];
  domain: ScanReport['domain'];
  sensitive: boolean;
  refresh: boolean;
}
export function isPublicIp(input: string): boolean {
  try {
    const address = ipaddr.process(input.replace(/^\[|\]$/g, ''));
    if (address.range() !== 'unicast') return false;
    // Documentation and protocol-assignment ranges are not public destinations.
    if (address.kind() === 'ipv4') {
      const value = address.toString();
      if (/^(?:192\.0\.0\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.|192\.88\.99\.)/.test(value)) return false;
    }
    return true;
  } catch { return false; }
}

export function parseInput(body: unknown): ParsedInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new PublicError('INVALID_REQUEST', 'Send a JSON object with a URL string.');
  const input = body as Partial<VerifyRequest>;
  if (typeof input.url !== 'string' || !input.url.trim()) throw new PublicError('URL_REQUIRED', 'A URL string is required.');
  if ((input.refresh !== undefined && typeof input.refresh !== 'boolean') ||
      (input.sensitive_url_consent !== undefined && typeof input.sensitive_url_consent !== 'boolean')) {
    throw new PublicError('INVALID_REQUEST', 'Refresh and consent flags must be booleans.');
  }
  if (input.url.length > 4096) throw new PublicError('URL_TOO_LONG', 'URLs must be at most 4096 characters.');
  if (/[\u0000-\u0020\u007f\\]/.test(input.url.trim())) throw new PublicError('INVALID_URL', 'URLs cannot contain whitespace, control characters or backslashes.');
  const raw = input.url.trim();
  const explicit = /^https?:\/\//i.test(raw);
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !explicit && !/^[^/]+:\d+(?:\/|$)/.test(raw)) {
    throw new PublicError('UNSUPPORTED_SCHEME', 'Only HTTP and HTTPS URLs are supported.');
  }
  let url: URL;
  try { url = new URL(explicit ? raw : `https://${raw}`); }
  catch { throw new PublicError('INVALID_URL', 'Enter a valid public HTTP or HTTPS URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new PublicError('INVALID_URL', 'HTTP(S) URLs containing embedded credentials are not supported.');
  }
  const hostname = url.hostname.replace(/\.$/, '').toLowerCase();
  url.hostname = hostname;
  const bareIp = hostname.replace(/^\[|\]$/g, '');
  const isIp = ipaddr.isValid(bareIp);
  const parsed = parse(hostname, { allowPrivateDomains: true });
  if ((isIp && !isPublicIp(bareIp)) || (!isIp && (!parsed.domain || !parsed.isIcann && !parsed.isPrivate ||
      /(?:^|\.)(?:localhost|local|internal|invalid|test|onion)$/.test(hostname)))) {
    throw new PublicError('PROHIBITED_DESTINATION', 'Use a public domain or publicly routable IP address. Private and reserved destinations are not supported.');
  }
  const sensitive = hasSensitiveParameters(url.toString());
  if (sensitive && !input.sensitive_url_consent) {
    throw new PublicError('SENSITIVE_URL_CONSENT_REQUIRED', 'This URL may contain private parameters or a fragment. Acknowledge third-party sharing before scanning.');
  }
  // Fragments are client-side state and must never be sent to reputation services.
  url.hash = '';
  if (url.toString().length > 4096) throw new PublicError('URL_TOO_LONG', 'The normalized URL exceeds 4096 characters.');
  const primary = url.toString();
  const targets = [primary];
  if (!explicit) {
    const second = new URL(primary);
    const suppliedPort = raw.split(/[/?#]/, 1)[0].match(/:(\d+)$/)?.[1];
    second.protocol = 'http:';
    // URL normalizes an explicit HTTPS :443 away; retain it for the HTTP variant.
    if (suppliedPort) second.port = suppliedPort;
    targets.push(second.toString());
  }
  return { primary, targets, sensitive, refresh: input.refresh === true, domain: {
    hostname, registrable_domain: isIp ? null : parsed.domain, unicode_hostname: toUnicode(hostname), is_ip: isIp,
  } };
}
