import { env } from '$env/dynamic/private';

// AES-256-GCM via WebCrypto (works in Bun + Node).
// Format: base64(iv[12] || ciphertext || tag[16])
function keyBytes(): Uint8Array<ArrayBuffer> {
  if (!env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not set');
  const raw = Buffer.from(env.ENCRYPTION_KEY, 'base64');
  if (raw.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes base64');
  const out = new Uint8Array(new ArrayBuffer(32)); out.set(raw); return out;
}

let cachedKey: Promise<CryptoKey> | null = null;
function key() {
  cachedKey ??= crypto.subtle.importKey('raw', keyBytes(), 'AES-GCM', false, ['encrypt', 'decrypt']);
  return cachedKey;
}

export async function encrypt(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), new TextEncoder().encode(plain));
  return Buffer.concat([Buffer.from(iv), Buffer.from(ct)]).toString('base64');
}

export async function decrypt(blob: string): Promise<string> {
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, 12);
  const ct = buf.subarray(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await key(), ct);
  return new TextDecoder().decode(pt);
}
