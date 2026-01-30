export enum EncryptionType {
  PAIRWISE = 'PAIRWISE',
  SENDER_KEY = 'SENDER_KEY',
}

export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM',
}

export interface EncryptedMessage {
  id: string;
  roomId: string;
  senderId: string;
  ciphertext: string; // base64
  nonce: string; // base64
  encryptionType: EncryptionType;
  senderKeyId?: string;
  messageType: MessageType;
  fileId?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
}

export interface RecipientCopy {
  recipientUserId: string;
  ciphertext: string; // base64
  nonce: string; // base64
}

export interface SendMessagePayload {
  roomId: string;
  ciphertext: string; // base64 — used for DM (single recipient)
  nonce: string; // base64
  encryptionType: EncryptionType;
  senderKeyId?: string;
  messageType: MessageType;
  fileId?: string;
  recipientCopies?: RecipientCopy[]; // for group PAIRWISE — per-recipient encrypted copies
}

export interface DecryptedMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  fileId?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
}

export interface EncryptedSenderKeyPayload {
  roomId: string;
  senderUserId: string;
  recipientUserId: string;
  encryptedSenderKey: string; // base64
  nonce: string; // base64
  keyId: string;
}
