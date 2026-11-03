import type { EngineResult, RegistrationInfo } from '../../shared/scan';
import { aggregate, evidence, nowIso, target } from './evidence';
import { errorCode, isoDate, object, ProviderError, requestJson, text } from './http';
import type { ParsedInput } from './url';

let bootstrap: { fetched: number; services: Map<string, string> } | undefined;
/** Trust roots are IANA's HTTPS bootstrap registry, never a caller-supplied endpoint. */
async function registry(tld: string): Promise<string | null> {
  if (!bootstrap || Date.now() - bootstrap.fetched > 86_400_000) {
    const payload = await requestJson('https://data.iana.org/rdap/dns.json', {}, 2500);
    if (!object(payload) || !Array.isArray(payload.services) || payload.services.length > 5000) throw new ProviderError('MALFORMED_RDAP_BOOTSTRAP');
    const services = new Map<string, string>();
    for (const item of payload.services) {
      if (!Array.isArray(item) || item.length !== 2 || !Array.isArray(item[0]) || !Array.isArray(item[1])) throw new ProviderError('MALFORMED_RDAP_BOOTSTRAP');
      const endpoint = item[1].find((value: unknown) => {
        if (typeof value !== 'string') return false;
        try { const parsed = new URL(value); return parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.search && !parsed.hash && (!parsed.port || parsed.port === '443') && parsed.hostname.includes('.') && !/^(?:\d|\[)|(?:^|\.)(?:localhost|local|internal)$/.test(parsed.hostname); }
        catch { return false; }
      });
      if (endpoint) for (const name of item[0]) if (typeof name === 'string' && /^[a-z0-9-]{2,63}$/.test(name)) services.set(name, endpoint);
    }
    bootstrap = { fetched: Date.now(), services };
  }
  return bootstrap.services.get(tld) || null;
}
export function resetRdapBootstrap(): void { bootstrap = undefined; }
export async function domainRegistration(input: ParsedInput): Promise<RegistrationInfo> {
  const empty = (): RegistrationInfo => ({ status: 'unavailable', source: null, registrar: null, created_at: null, age_days: null, observed_at: nowIso() });
  const domain = input.domain.registrable_domain;
  if (!domain) return empty();
  try {
    const base = await registry(domain.split('.').at(-1)!);
    if (!base) return { ...empty(), error_code: 'RDAP_UNAVAILABLE_FOR_TLD' };
    const endpoint = new URL(`domain/${encodeURIComponent(domain)}`, base.endsWith('/') ? base : `${base}/`);
    const payload = await requestJson(endpoint.toString(), { headers: { Accept: 'application/rdap+json, application/json' } }, 2500);
    if (!object(payload) || payload.objectClassName !== 'domain' || typeof payload.ldhName !== 'string' ||
        payload.ldhName.toLowerCase().replace(/\.$/, '') !== domain || !Array.isArray(payload.events)) throw new ProviderError('MALFORMED_RDAP_RESPONSE');
    const events = payload.events.filter(object);
    const registered = events.find(event => event.eventAction === 'registration');
    const created = isoDate(registered?.eventDate);
    if (created && Date.parse(created) > Date.now() + 86_400_000) throw new ProviderError('MALFORMED_RDAP_DATE');
    let registrar: string | null = null;
    if (Array.isArray(payload.entities)) {
      const entity = payload.entities.find(item => object(item) && Array.isArray(item.roles) && item.roles.includes('registrar'));
      if (object(entity) && Array.isArray(entity.vcardArray) && Array.isArray(entity.vcardArray[1])) {
        const name = entity.vcardArray[1].find((row: unknown) => Array.isArray(row) && row[0] === 'fn');
        registrar = Array.isArray(name) ? text(name[3], 200) : null;
      }
    }
    return { status: 'available', source: endpoint.origin, registrar, created_at: created,
      age_days: created ? Math.max(0, Math.floor((Date.now() - Date.parse(created)) / 86_400_000)) : null, observed_at: nowIso() };
  } catch (error) {
    return { ...empty(), status: 'error', error_code: errorCode(error) === 'NOT_FOUND' ? 'REGISTRATION_NOT_FOUND' : errorCode(error) };
  }
}
export function registrationSignals(input: ParsedInput, registration: RegistrationInfo): EngineResult {
  return aggregate('registration', 'Domain registration context', 'heuristic', input.targets.map(url => {
    if (registration.status !== 'available') return target(url, registration.status === 'error' ? 'error' : 'unavailable', {
      error_code: registration.error_code || 'REGISTRATION_UNAVAILABLE', message: 'Registration context could not be established; no domain age was inferred.',
    });
    const findings = registration.status === 'available' && registration.age_days !== null && registration.age_days < 30 ?
      [evidence('RDAP registration record', 'recent-registration', 'Recently registered domain', `The public registration record reports a domain age of ${registration.age_days} days. Age is supporting context, not proof of phishing.`, 'info', 'suspicious_structure', url)] : [];
    return target(url, 'no_detection', { evidence: findings });
  }));
}
