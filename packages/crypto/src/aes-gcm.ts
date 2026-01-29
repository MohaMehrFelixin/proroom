import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/hashes/utils';

const NONCE_LENGTH = 12;

export interface EncryptedPayload {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
}

export const encrypt = (
  key: Uint8Array,
  plaintext: Uint8Array,
): EncryptedPayload => {
  const nonce = randomBytes(NONCE_LENGTH);
  const cipher = gcm(key, nonce);
  const ciphertext = cipher.encrypt(plaintext);
  return { ciphertext, nonce };
};

export const decrypt = (
  key: Uint8Array,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): Uint8Array => {
  const cipher = gcm(key, nonce);
  return cipher.decrypt(ciphertext);
};

export const encryptString = (
  key: Uint8Array,
  plaintext: string,
): EncryptedPayload => {
  return encrypt(key, new TextEncoder().encode(plaintext));
};

export const decryptToString = (
  key: Uint8Array,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): string => {
  const decrypted = decrypt(key, ciphertext, nonce);
  return new TextDecoder().decode(decrypted);
};
