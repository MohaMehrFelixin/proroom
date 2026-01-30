import { randomBytes } from '@noble/hashes/utils';
import { deriveKey } from './hkdf';
import { encrypt, decrypt, type EncryptedPayload } from './aes-gcm';

const SENDER_KEY_LENGTH = 32;

export interface SenderKey {
  keyId: string;
  chainKey: Uint8Array;
  iteration: number;
}

export const generateSenderKey = (): SenderKey => {
  const chainKey = randomBytes(SENDER_KEY_LENGTH);
  const keyId = bytesToHex(randomBytes(16));
  return { keyId, chainKey, iteration: 0 };
};

export const ratchetChainKey = (senderKey: SenderKey): SenderKey => {
  const nextChainKey = deriveKey(
    senderKey.chainKey,
    `iteration-${senderKey.iteration + 1}`,
    'proroom-sender-key-ratchet',
  );
  return {
    keyId: senderKey.keyId,
    chainKey: nextChainKey,
    iteration: senderKey.iteration + 1,
  };
};

export const deriveMessageKeyFromChain = (chainKey: Uint8Array): Uint8Array => {
  return deriveKey(chainKey, 'message-key', 'proroom-sender-message-key');
};

export const encryptWithSenderKey = (
  senderKey: SenderKey,
  plaintext: Uint8Array,
): { encrypted: EncryptedPayload; updatedKey: SenderKey } => {
  const messageKey = deriveMessageKeyFromChain(senderKey.chainKey);
  const encrypted = encrypt(messageKey, plaintext);
  // Static key — no ratcheting. All messages use the same derived key.
  // Random nonces in AES-GCM ensure uniqueness per message.
  return { encrypted, updatedKey: senderKey };
};

export const decryptWithSenderKey = (
  senderKey: SenderKey,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): { plaintext: Uint8Array; updatedKey: SenderKey } => {
  const messageKey = deriveMessageKeyFromChain(senderKey.chainKey);
  const plaintext = decrypt(messageKey, ciphertext, nonce);
  return { plaintext, updatedKey: senderKey };
};

export const serializeSenderKey = (key: SenderKey): Uint8Array => {
  const json = JSON.stringify({
    keyId: key.keyId,
    chainKey: bytesToHex(key.chainKey),
    iteration: key.iteration,
  });
  return new TextEncoder().encode(json);
};

export const deserializeSenderKey = (data: Uint8Array): SenderKey => {
  const json = JSON.parse(new TextDecoder().decode(data));
  return {
    keyId: json.keyId,
    chainKey: hexToBytes(json.chainKey),
    iteration: json.iteration,
  };
};

const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};
