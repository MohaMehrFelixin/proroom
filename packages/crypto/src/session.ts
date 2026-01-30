import { computeSharedSecret } from './x25519';
import { deriveKey } from './hkdf';
import {
  encrypt,
  decrypt,
  encryptString,
  decryptToString,
  type EncryptedPayload,
} from './aes-gcm';
export interface PairwiseSession {
  sharedSecret: Uint8Array;
  messageKey: Uint8Array;
}

/**
 * Establish a pairwise session between two users for DM encryption.
 * Uses X25519 ECDH: both sides compute X25519(myPreKeyPriv, theirPreKeyPub)
 * which is commutative, ensuring both derive the same shared secret.
 */
export const establishPairwiseSession = (
  mySignedPreKeyPrivate: Uint8Array,
  theirSignedPreKeyPublic: Uint8Array,
  roomId: string,
): PairwiseSession => {
  const sharedSecret = computeSharedSecret(
    mySignedPreKeyPrivate,
    theirSignedPreKeyPublic,
  );
  const messageKey = deriveKey(sharedSecret, roomId, 'proroom-dm');
  return { sharedSecret, messageKey };
};

export const encryptMessage = (
  session: PairwiseSession,
  plaintext: string,
): EncryptedPayload => {
  return encryptString(session.messageKey, plaintext);
};

export const decryptMessage = (
  session: PairwiseSession,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): string => {
  return decryptToString(session.messageKey, ciphertext, nonce);
};

/**
 * Encrypt arbitrary bytes using a pairwise session (for sender key distribution).
 */
export const encryptBytes = (
  session: PairwiseSession,
  data: Uint8Array,
): EncryptedPayload => {
  return encrypt(session.messageKey, data);
};

export const decryptBytes = (
  session: PairwiseSession,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): Uint8Array => {
  return decrypt(session.messageKey, ciphertext, nonce);
};
