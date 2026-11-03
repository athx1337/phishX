/** Bounded decoder for the official v5 SearchUrlsResponse protobuf wire format.
 * Field contracts: threats(1):ThreatUrl{url(1),packed ThreatType(2)}, cacheDuration(2):Duration.
 * Kept alongside recorded harmless Google test fixtures because the live service returns protobuf.
 */
import { ProviderError } from './http';

const THREATS: Record<number, string> = { 1: 'MALWARE', 2: 'SOCIAL_ENGINEERING', 3: 'UNWANTED_SOFTWARE', 4: 'POTENTIALLY_HARMFUL_APPLICATION' };
class Reader {
  offset = 0;
  constructor(readonly bytes: Uint8Array) {}
  number(): number {
    let value = 0, multiplier = 1;
    for (let i = 0; i < 10; i++) {
      if (this.offset >= this.bytes.length) throw new ProviderError('MALFORMED_RESPONSE');
      const byte = this.bytes[this.offset++]; value += (byte & 127) * multiplier;
      if (!Number.isSafeInteger(value)) throw new ProviderError('MALFORMED_RESPONSE');
      if (!(byte & 128)) return value;
      multiplier *= 128;
    }
    throw new ProviderError('MALFORMED_RESPONSE');
  }
  chunk(): Uint8Array {
    const size = this.number();
    if (size > 1_048_576 || this.offset + size > this.bytes.length) throw new ProviderError('MALFORMED_RESPONSE');
    const result = this.bytes.subarray(this.offset, this.offset + size); this.offset += size; return result;
  }
  skip(wire: number): void {
    if (wire === 0) { this.number(); return; }
    if (wire === 2) { this.chunk(); return; }
    const size = wire === 1 ? 8 : wire === 5 ? 4 : -1;
    if (size < 0 || this.offset + size > this.bytes.length) throw new ProviderError('MALFORMED_RESPONSE');
    this.offset += size;
  }
}
function threat(bytes: Uint8Array): { url: string; threatTypes: string[] } {
  const reader = new Reader(bytes), types: string[] = []; let url: string | undefined;
  while (reader.offset < bytes.length) {
    const tag = reader.number(), field = tag >>> 3, wire = tag & 7;
    if (!field) throw new ProviderError('MALFORMED_RESPONSE');
    if (field === 1 && wire === 2) { if (url !== undefined) throw new ProviderError('MALFORMED_RESPONSE'); url = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(reader.chunk()); }
    else if (field === 2 && (wire === 2 || wire === 0)) {
      const packed = wire === 2 ? new Reader(reader.chunk()) : reader;
      do { const value = THREATS[packed.number()]; if (!value || types.length >= 10) throw new ProviderError('MALFORMED_RESPONSE'); types.push(value); } while (wire === 2 && packed.offset < packed.bytes.length);
    } else reader.skip(wire);
  }
  if (!url || url.length > 4096 || !types.length) throw new ProviderError('MALFORMED_RESPONSE');
  return { url, threatTypes: types };
}
function duration(bytes: Uint8Array): string {
  const reader = new Reader(bytes); let seconds = 0, nanos = 0; const seen = new Set<number>();
  while (reader.offset < bytes.length) {
    const tag = reader.number(), field = tag >>> 3, wire = tag & 7;
    if (!field) throw new ProviderError('MALFORMED_RESPONSE');
    if ((field === 1 || field === 2) && wire === 0) {
      if (seen.has(field)) throw new ProviderError('MALFORMED_RESPONSE'); seen.add(field);
      const value = reader.number(); if (field === 1) seconds = value; else nanos = value;
    } else reader.skip(wire);
  }
  if (seconds > 86400 || nanos >= 1e9) throw new ProviderError('MALFORMED_RESPONSE');
  return `${seconds + nanos / 1e9}s`;
}
export function decodeSafeBrowsing(bytes: Uint8Array): { threats: { url: string; threatTypes: string[] }[]; cacheDuration: string } {
  try {
    const reader = new Reader(bytes), threats = []; let cacheDuration: string | undefined;
    while (reader.offset < bytes.length) {
      const tag = reader.number(), field = tag >>> 3, wire = tag & 7;
      if (!field) throw new ProviderError('MALFORMED_RESPONSE');
      if (field === 1 && wire === 2) { if (threats.length >= 50) throw new ProviderError('MALFORMED_RESPONSE'); threats.push(threat(reader.chunk())); }
      else if (field === 2 && wire === 2) { if (cacheDuration !== undefined) throw new ProviderError('MALFORMED_RESPONSE'); cacheDuration = duration(reader.chunk()); }
      else reader.skip(wire);
    }
    if (cacheDuration === undefined) throw new ProviderError('MALFORMED_RESPONSE');
    return { threats, cacheDuration };
  } catch { throw new ProviderError('MALFORMED_RESPONSE'); }
}
