import {
  generateDeviceKeys,
  establishPairwiseSession,
  encryptMessage,
  decryptMessage,
  encryptBytes,
  decryptBytes,
  verifySignedPreKey,
  generateSenderKey,
  encryptWithSenderKey,
  decryptWithSenderKey,
  serializeSenderKey,
  deserializeSenderKey,
  base64ToBytes,
  bytesToBase64,
  type DeviceKeys,
  type PairwiseSession,
  type SenderKey,
} from '@proroom/crypto';
import { get, set } from 'idb-keyval';

const DEVICE_KEYS_STORE_KEY = 'proroom:device-keys';

export const getOrCreateDeviceKeys = async (): Promise<DeviceKeys> => {
  const stored = await get<string>(DEVICE_KEYS_STORE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    return {
      identityKey: {
        publicKey: base64ToBytes(parsed.identityKey.publicKey),
        privateKey: base64ToBytes(parsed.identityKey.privateKey),
      },
      signedPreKey: {
        keyPair: {
          publicKey: base64ToBytes(parsed.signedPreKey.keyPair.publicKey),
          privateKey: base64ToBytes(parsed.signedPreKey.keyPair.privateKey),
        },
        signature: base64ToBytes(parsed.signedPreKey.signature),
      },
    };
  }

  const keys = generateDeviceKeys();

  const serialized = JSON.stringify({
    identityKey: {
      publicKey: bytesToBase64(keys.identityKey.publicKey),
      privateKey: bytesToBase64(keys.identityKey.privateKey),
    },
    signedPreKey: {
      keyPair: {
        publicKey: bytesToBase64(keys.signedPreKey.keyPair.publicKey),
        privateKey: bytesToBase64(keys.signedPreKey.keyPair.privateKey),
      },
      signature: bytesToBase64(keys.signedPreKey.signature),
    },
  });

  await set(DEVICE_KEYS_STORE_KEY, serialized);
  return keys;
};

export const getPublicKeysForUpload = async () => {
  const keys = await getOrCreateDeviceKeys();
  return {
    identityKey: bytesToBase64(keys.identityKey.publicKey),
    signedPreKey: bytesToBase64(keys.signedPreKey.keyPair.publicKey),
    preKeySignature: bytesToBase64(keys.signedPreKey.signature),
  };
};

// Pairwise session cache
const sessionCache = new Map<string, PairwiseSession>();
// Track which rooms we've already distributed our sender key to
const distributedRooms = new Set<string>();

export const clearCryptoState = (): void => {
  sessionCache.clear();
  senderKeyCache.clear();
  senderKeysLoaded = false;
  distributedRooms.clear();
};

export const getPairwiseSession = async (
  theirUserId: string,
  theirIdentityKey: string,
  theirSignedPreKey: string,
  theirPreKeySignature: string,
  roomId: string,
): Promise<PairwiseSession> => {
  const cacheKey = `${theirUserId}:${roomId}`;
  const cached = sessionCache.get(cacheKey);
  if (cached) return cached;

  const theirIdKey = base64ToBytes(theirIdentityKey);
  const theirPreKey = base64ToBytes(theirSignedPreKey);
  const theirSig = base64ToBytes(theirPreKeySignature);

  if (!verifySignedPreKey(theirIdKey, theirPreKey, theirSig)) {
    throw new Error('Invalid pre-key signature');
  }

  const myKeys = await getOrCreateDeviceKeys();
  const session = establishPairwiseSession(
    myKeys.signedPreKey.keyPair.privateKey,
    theirPreKey,
    roomId,
  );

  sessionCache.set(cacheKey, session);
  return session;
};

export const encryptDMMessage = async (
  session: PairwiseSession,
  plaintext: string,
) => {
  const { ciphertext, nonce } = encryptMessage(session, plaintext);
  return {
    ciphertext: bytesToBase64(ciphertext),
    nonce: bytesToBase64(nonce),
  };
};

export const decryptDMMessage = (
  session: PairwiseSession,
  ciphertext: string,
  nonce: string,
): string => {
  return decryptMessage(
    session,
    base64ToBytes(ciphertext),
    base64ToBytes(nonce),
  );
};

// Sender key management — persisted to IndexedDB
const SENDER_KEYS_STORE_KEY = 'proroom:sender-keys';
const senderKeyCache = new Map<string, SenderKey>();
let senderKeysLoaded = false;

const persistSenderKeys = async (): Promise<void> => {
  const entries: Record<string, string> = {};
  for (const [key, sk] of senderKeyCache) {
    entries[key] = bytesToBase64(serializeSenderKey(sk));
  }
  await set(SENDER_KEYS_STORE_KEY, JSON.stringify(entries));
};

const loadSenderKeys = async (): Promise<void> => {
  if (senderKeysLoaded) return;
  const stored = await get<string>(SENDER_KEYS_STORE_KEY);
  if (stored) {
    const entries: Record<string, string> = JSON.parse(stored);
    for (const [key, b64] of Object.entries(entries)) {
      if (!senderKeyCache.has(key)) {
        senderKeyCache.set(key, deserializeSenderKey(base64ToBytes(b64)));
      }
    }
  }
  senderKeysLoaded = true;
};

export const getOrCreateSenderKey = async (roomId: string): Promise<SenderKey> => {
  await loadSenderKeys();
  const cacheKey = `my:${roomId}`;
  const cached = senderKeyCache.get(cacheKey);
  if (cached) return cached;

  const key = generateSenderKey();
  senderKeyCache.set(cacheKey, key);
  await persistSenderKeys();
  return key;
};

export const encryptGroupMessage = async (
  roomId: string,
  plaintext: string,
  myUserId?: string,
) => {
  const senderKey = await getOrCreateSenderKey(roomId);
  const data = new TextEncoder().encode(plaintext);
  const { encrypted, updatedKey } = encryptWithSenderKey(senderKey, data);

  senderKeyCache.set(`my:${roomId}`, updatedKey);
  if (myUserId) {
    senderKeyCache.set(`${myUserId}:${roomId}`, updatedKey);
  }
  await persistSenderKeys();

  return {
    ciphertext: bytesToBase64(encrypted.ciphertext),
    nonce: bytesToBase64(encrypted.nonce),
    senderKeyId: senderKey.keyId,
  };
};

export const decryptGroupMessage = async (
  senderUserId: string,
  roomId: string,
  ciphertext: string,
  nonce: string,
): Promise<string> => {
  await loadSenderKeys();
  const cacheKey = `${senderUserId}:${roomId}`;
  let senderKey = senderKeyCache.get(cacheKey);
  if (!senderKey) {
    // Fallback: own messages stored under `my:` prefix
    senderKey = senderKeyCache.get(`my:${roomId}`);
    if (senderKey) {
      // Re-store under the proper key for future lookups
      senderKeyCache.set(cacheKey, senderKey);
    }
  }
  if (!senderKey) throw new Error('Sender key not found');

  const { plaintext, updatedKey } = decryptWithSenderKey(
    senderKey,
    base64ToBytes(ciphertext),
    base64ToBytes(nonce),
  );

  senderKeyCache.set(cacheKey, updatedKey);
  await persistSenderKeys();
  return new TextDecoder().decode(plaintext);
};

export const distributeSenderKey = async (
  roomId: string,
  session: PairwiseSession,
): Promise<{ encryptedSenderKey: string; nonce: string; keyId: string }> => {
  const senderKey = await getOrCreateSenderKey(roomId);
  const serialized = serializeSenderKey(senderKey);
  const { ciphertext, nonce } = encryptBytes(session, serialized);

  return {
    encryptedSenderKey: bytesToBase64(ciphertext),
    nonce: bytesToBase64(nonce),
    keyId: senderKey.keyId,
  };
};

export const receiveSenderKey = async (
  senderUserId: string,
  roomId: string,
  session: PairwiseSession,
  encryptedSenderKey: string,
  nonce: string,
): Promise<void> => {
  const decrypted = decryptBytes(
    session,
    base64ToBytes(encryptedSenderKey),
    base64ToBytes(nonce),
  );
  const senderKey = deserializeSenderKey(decrypted);
  senderKeyCache.set(`${senderUserId}:${roomId}`, senderKey);
  await persistSenderKeys();
};

export const distributeSenderKeyToAll = async (
  roomId: string,
  myUserId: string,
  memberKeys: Map<string, { userId: string; identityKey: string; signedPreKey: string; preKeySignature: string }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket: { emit: (...args: any[]) => any },
): Promise<void> => {
  const cacheKey = `${myUserId}:${roomId}`;
  if (distributedRooms.has(cacheKey)) return;
  distributedRooms.add(cacheKey);

  for (const [userId, keys] of memberKeys) {
    if (userId === myUserId) continue;
    try {
      const session = await getPairwiseSession(
        userId,
        keys.identityKey,
        keys.signedPreKey,
        keys.preKeySignature,
        roomId,
      );
      const distributed = await distributeSenderKey(roomId, session);
      socket.emit('senderkey:distribute', {
        roomId,
        senderUserId: myUserId,
        recipientUserId: userId,
        encryptedSenderKey: distributed.encryptedSenderKey,
        nonce: distributed.nonce,
        keyId: distributed.keyId,
      });
    } catch {
      // Failed to distribute to this member
    }
  }
};

// ---- File encryption ----
import { encrypt as aesEncryptRaw, decrypt as aesDecryptRaw } from '@proroom/crypto';

/**
 * Encrypts a file client-side with a random AES-256-GCM key.
 * Returns the encrypted bytes and the file key (to embed in message ciphertext).
 */
export const encryptFile = (fileData: Uint8Array): {
  encryptedFile: Uint8Array;
  fileNonce: string;
  fileKey: string;
} => {
  // Generate random 32-byte file key
  const fileKey = crypto.getRandomValues(new Uint8Array(32));
  const { ciphertext, nonce } = aesEncryptRaw(fileKey, fileData);

  return {
    encryptedFile: ciphertext,
    fileNonce: bytesToBase64(nonce),
    fileKey: bytesToBase64(fileKey),
  };
};

/**
 * Decrypts a file that was encrypted with encryptFile().
 */
export const decryptFile = (
  encryptedFile: Uint8Array,
  fileNonce: string,
  fileKey: string,
): Uint8Array => {
  return aesDecryptRaw(
    base64ToBytes(fileKey),
    encryptedFile,
    base64ToBytes(fileNonce),
  );
};
