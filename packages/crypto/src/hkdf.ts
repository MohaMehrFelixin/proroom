import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

const DEFAULT_KEY_LENGTH = 32;

export const deriveKey = (
  sharedSecret: Uint8Array,
  salt: string | Uint8Array,
  info: string,
  keyLength: number = DEFAULT_KEY_LENGTH,
): Uint8Array => {
  const saltBytes =
    typeof salt === 'string' ? new TextEncoder().encode(salt) : salt;
  const infoBytes = new TextEncoder().encode(info);
  return hkdf(sha256, sharedSecret, saltBytes, infoBytes, keyLength);
};
