import { x25519 } from '@noble/curves/ed25519';
import { randomBytes } from '@noble/hashes/utils';

const KEY_LENGTH = 32;

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export const generateX25519KeyPair = (): KeyPair => {
  const privateKey = randomBytes(KEY_LENGTH);
  const publicKey = x25519.getPublicKey(privateKey);
  return { publicKey, privateKey };
};

export const computeSharedSecret = (
  privateKey: Uint8Array,
  publicKey: Uint8Array,
): Uint8Array => {
  return x25519.getSharedSecret(privateKey, publicKey);
};

export { randomBytes };
