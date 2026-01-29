import { ed25519 } from '@noble/curves/ed25519';
import { randomBytes } from '@noble/hashes/utils';
import { generateX25519KeyPair, type KeyPair } from './x25519';

export interface IdentityKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface SignedPreKey {
  keyPair: KeyPair;
  signature: Uint8Array;
}

export interface DeviceKeys {
  identityKey: IdentityKeyPair;
  signedPreKey: SignedPreKey;
}

export const generateIdentityKey = (): IdentityKeyPair => {
  const privateKey = randomBytes(32);
  const publicKey = ed25519.getPublicKey(privateKey);
  return { publicKey, privateKey };
};

export const generateSignedPreKey = (
  identityPrivateKey: Uint8Array,
): SignedPreKey => {
  const keyPair = generateX25519KeyPair();
  const signature = ed25519.sign(keyPair.publicKey, identityPrivateKey);
  return { keyPair, signature };
};

export const verifySignedPreKey = (
  identityPublicKey: Uint8Array,
  preKeyPublic: Uint8Array,
  signature: Uint8Array,
): boolean => {
  return ed25519.verify(signature, preKeyPublic, identityPublicKey);
};

export const generateDeviceKeys = (): DeviceKeys => {
  const identityKey = generateIdentityKey();
  const signedPreKey = generateSignedPreKey(identityKey.privateKey);
  return { identityKey, signedPreKey };
};
