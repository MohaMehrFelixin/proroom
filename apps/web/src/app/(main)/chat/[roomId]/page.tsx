'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getChatSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import {
  getPairwiseSession,
  encryptDMMessage,
  decryptDMMessage,
  encryptGroupMessage,
  decryptGroupMessage,
  distributeSenderKey,
} from '@/lib/crypto';
import { getCachedMessages, setCachedMessages, appendCachedMessage, updateCachedMessage } from '@/lib/message-cache';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { DateSeparator } from '@/components/chat/DateSeparator';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ScrollToBottom } from '@/components/chat/ScrollToBottom';
import { RoomInfoPanel } from '@/components/chat/RoomInfoPanel';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { EncryptionType, MessageType } from '@proroom/types';
import type {
  EncryptedMessage,
  DecryptedMessage,
  Room,
  UserPublicKeys,
} from '@proroom/types';

const isSameDay = (a: string, b: string): boolean => {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

const ChatRoomPage = () => {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const currentUser = useAuthStore((s) => s.user);
  const { messages, addMessage, setMessages, setActiveRoom, editMessage, deleteMessage, typingUsers } = useChatStore();
  const [room, setRoom] = useState<Room | null>(null);
  const [sending, setSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState<DecryptedMessage | null>(null);
  const [memberKeys, setMemberKeys] = useState<Map<string, UserPublicKeys>>(new Map());
  const [showInfo, setShowInfo] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const roomMessages = messages[roomId] ?? [];
  const { startTyping, stopTyping } = useTypingIndicator(roomId);

  useEffect(() => {
    setActiveRoom(roomId);
    return () => setActiveRoom(null);
  }, [roomId, setActiveRoom]);

  // Fetch room info and member keys
  useEffect(() => {
    const init = async () => {
      try {
        const { data: roomData } = await api.get<Room>(`/rooms/${roomId}`);
        setRoom(roomData);

        const keyMap = new Map<string, UserPublicKeys>();
        const memberIds = roomData.members?.map((m) => m.userId).join(',') ?? '';
        if (memberIds) {
          const { data: keys } = await api.get<UserPublicKeys[]>(`/keys/batch?userIds=${memberIds}`);
          for (const k of keys) {
            keyMap.set(k.userId, k);
          }
          setMemberKeys(keyMap);
        }

        const { data: encryptedMessages } = await api.get<EncryptedMessage[]>(`/rooms/${roomId}/messages`);

        // Load local cache for messages we already decrypted
        const cached = await getCachedMessages(currentUser?.id ?? '', roomId);
        const cachedMap = new Map<string, DecryptedMessage>();
        if (cached) {
          for (const m of cached) {
            cachedMap.set(m.id, m);
          }
        }

        let needsSenderKeyResync = false;
        const decrypted = await Promise.all(
          encryptedMessages.reverse().map((msg) => {
            // Use cached plaintext if available
            const cachedMsg = cachedMap.get(msg.id);
            if (cachedMsg) return Promise.resolve(cachedMsg);

            return decryptEncryptedMessage(msg, keyMap, roomData).catch(() => {
              if (msg.encryptionType === 'SENDER_KEY') needsSenderKeyResync = true;
              return {
                id: msg.id,
                roomId: msg.roomId,
                senderId: msg.senderId,
                content: '[Unable to decrypt]',
                messageType: msg.messageType,
                fileId: msg.fileId,
                createdAt: msg.createdAt,
              };
            });
          }),
        );

        setMessages(roomId, decrypted);
        await setCachedMessages(currentUser?.id ?? '', roomId, decrypted);

        if (needsSenderKeyResync) {
          try {
            const socket = getChatSocket();
            socket.emit('senderkey:request', { roomId, requesterId: currentUser?.id ?? '' });
          } catch {
            // Socket not ready
          }
        }
      } catch (err) {
        console.error('[ChatRoom] init failed:', err);
      }
    };
    init();
  }, [roomId]);

  const decryptEncryptedMessage = useCallback(
    async (
      msg: EncryptedMessage,
      keysOverride?: Map<string, UserPublicKeys>,
      roomOverride?: Room,
    ): Promise<DecryptedMessage> => {
      const keys$ = keysOverride ?? memberKeys;
      const room$ = roomOverride ?? room;

      if (msg.encryptionType === 'PAIRWISE') {
        const otherUserId =
          msg.senderId === currentUser?.id
            ? room$?.members?.find((m) => m.userId !== currentUser?.id)?.userId ?? msg.senderId
            : msg.senderId;

        const keys = keys$.get(otherUserId);
        if (!keys) throw new Error('Keys not found');

        const session = await getPairwiseSession(
          otherUserId,
          keys.identityKey,
          keys.signedPreKey,
          keys.preKeySignature,
          roomId,
        );

        const content = decryptDMMessage(session, msg.ciphertext, msg.nonce);
        return {
          id: msg.id,
          roomId: msg.roomId,
          senderId: msg.senderId,
          content,
          messageType: msg.messageType,
          fileId: msg.fileId,
          createdAt: msg.createdAt,
        };
      }

      const content = await decryptGroupMessage(msg.senderId, roomId, msg.ciphertext, msg.nonce);
      return {
        id: msg.id,
        roomId: msg.roomId,
        senderId: msg.senderId,
        content,
        messageType: msg.messageType,
        fileId: msg.fileId,
        createdAt: msg.createdAt,
      };
    },
    [currentUser?.id, memberKeys, room?.members, roomId],
  );

  // Socket listener for new messages
  useEffect(() => {
    const socket = getChatSocket();
    socket.emit('room:join', roomId);

    const handleNewMessage = async (msg: EncryptedMessage) => {
      if (msg.roomId !== roomId) return;
      try {
        const decrypted = await decryptEncryptedMessage(msg);
        addMessage(roomId, decrypted);
        await appendCachedMessage(currentUser?.id ?? '', roomId, decrypted);
      } catch {
        const fallback = {
          id: msg.id,
          roomId: msg.roomId,
          senderId: msg.senderId,
          content: '[Unable to decrypt]',
          messageType: msg.messageType,
          fileId: msg.fileId,
          createdAt: msg.createdAt,
        };
        addMessage(roomId, fallback);
        await appendCachedMessage(currentUser?.id ?? '', roomId, fallback);
      }
    };

    socket.on('message:new', handleNewMessage);

    const handleEdited = async (data: { messageId: string; roomId: string }) => {
      if (data.roomId === roomId) {
        editMessage(roomId, data.messageId, '[Message edited - refresh to see]');
        await updateCachedMessage(currentUser?.id ?? '', roomId, data.messageId, { content: '[Message edited - refresh to see]' });
      }
    };
    const handleDeleted = async (data: { messageId: string; roomId: string }) => {
      if (data.roomId === roomId) {
        deleteMessage(roomId, data.messageId);
        await updateCachedMessage(currentUser?.id ?? '', roomId, data.messageId, { content: 'This message was deleted' });
      }
    };

    socket.on('message:edited', handleEdited);
    socket.on('message:deleted', handleDeleted);

    const handleSenderKeyRequest = async (data: { roomId: string; requesterId: string }) => {
      if (data.roomId !== roomId || !currentUser) return;
      const requesterKeys = memberKeys.get(data.requesterId);
      if (!requesterKeys) return;
      try {
        const session = await getPairwiseSession(
          data.requesterId,
          requesterKeys.identityKey,
          requesterKeys.signedPreKey,
          requesterKeys.preKeySignature,
          roomId,
        );
        const distributed = await distributeSenderKey(roomId, session);
        socket.emit('senderkey:distribute', {
          roomId,
          senderUserId: currentUser.id,
          recipientUserId: data.requesterId,
          encryptedSenderKey: distributed.encryptedSenderKey,
          nonce: distributed.nonce,
          keyId: distributed.keyId,
        });
      } catch {
        // Failed to distribute
      }
    };
    socket.on('senderkey:request' as Parameters<typeof socket.on>[0], handleSenderKeyRequest);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:edited', handleEdited);
      socket.off('message:deleted', handleDeleted);
      socket.off('senderkey:request' as Parameters<typeof socket.off>[0], handleSenderKeyRequest);
      socket.emit('room:leave', roomId);
    };
  }, [roomId, addMessage, editMessage, deleteMessage, decryptEncryptedMessage, currentUser, memberKeys]);

  // Auto-scroll and read receipt
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (roomMessages.length > 0) {
      const lastMsg = roomMessages[roomMessages.length - 1];
      if (lastMsg.senderId !== currentUser?.id) {
        try {
          const socket = getChatSocket();
          socket.emit('message:read', { roomId, lastReadMessageId: lastMsg.id });
        } catch {
          // Socket not ready
        }
      }
    }
  }, [roomMessages, roomId, currentUser?.id]);

  // Scroll detection
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollBtn(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (content: string) => {
    if (sending || !currentUser) return;
    setSending(true);

    try {
      const socket = getChatSocket();
      const isDM = room?.type === 'DM';
      let encryptionType: EncryptionType;
      let ciphertext: string;
      let nonce: string;
      let senderKeyId: string | undefined;

      if (isDM) {
        const otherMember = room?.members?.find((m) => m.userId !== currentUser.id);
        if (!otherMember) throw new Error('No other member in DM');
        const keys = memberKeys.get(otherMember.userId);
        if (!keys) throw new Error('Keys not found');
        const session = await getPairwiseSession(
          otherMember.userId,
          keys.identityKey,
          keys.signedPreKey,
          keys.preKeySignature,
          roomId,
        );
        const encrypted = await encryptDMMessage(session, content);
        ciphertext = encrypted.ciphertext;
        nonce = encrypted.nonce;
        encryptionType = EncryptionType.PAIRWISE;
      } else {
        const encrypted = await encryptGroupMessage(roomId, content, currentUser.id);
        ciphertext = encrypted.ciphertext;
        nonce = encrypted.nonce;
        senderKeyId = encrypted.senderKeyId;
        encryptionType = EncryptionType.SENDER_KEY;
      }

      // Handle edit vs new message
      if (editingMessage) {
        socket.emit('message:edit', { messageId: editingMessage.id, roomId, ciphertext, nonce }, (resp: { success: boolean }) => {
          if (resp.success) {
            editMessage(roomId, editingMessage.id, content);
          }
        });
        setEditingMessage(null);
      } else {
        socket.emit('message:send', {
          roomId,
          ciphertext,
          nonce,
          encryptionType,
          senderKeyId,
          messageType: MessageType.TEXT,
        }, () => {
          // Acknowledged
        });
      }

      stopTyping();
    } catch {
      // Handle error
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    const socket = getChatSocket();
    socket.emit('message:delete', { messageId, roomId }, (resp: { success: boolean }) => {
      if (resp.success) {
        deleteMessage(roomId, messageId);
      }
    });
  };

  const getMemberName = (userId: string): string => {
    if (userId === currentUser?.id) return 'You';
    const member = room?.members?.find((m) => m.userId === userId);
    return member?.user?.displayName ?? userId.slice(0, 8);
  };

  const isGroup = room?.type === 'GROUP';

  // Get typing users for this room
  const roomTyping = typingUsers[roomId];
  const typingNames = roomTyping
    ? Array.from(roomTyping)
        .filter((uid) => uid !== currentUser?.id)
        .map((uid) => getMemberName(uid))
    : [];

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col bg-tg-bg-dark">
        {/* Header */}
        {room && (
          <ChatHeader room={room} onInfoClick={() => setShowInfo(!showInfo)} />
        )}

        {/* Messages area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="relative flex-1 overflow-y-auto py-2"
        >
          {roomMessages.map((msg, i) => {
            const prevMsg = roomMessages[i - 1];
            const showDate = !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);
            const isOwn = msg.senderId === currentUser?.id;
            const showSenderName = isGroup && !isOwn && (!prevMsg || prevMsg.senderId !== msg.senderId);

            return (
              <div key={msg.id}>
                {showDate && <DateSeparator date={msg.createdAt} />}
                <MessageBubble
                  message={msg}
                  isOwn={isOwn}
                  showSenderName={showSenderName}
                  senderName={getMemberName(msg.senderId)}
                  onEdit={(m) => setEditingMessage(m)}
                  onDelete={handleDeleteMessage}
                />
              </div>
            );
          })}
          <div ref={messagesEndRef} />

          {/* Typing indicator */}
          <TypingIndicator names={typingNames} />

          {/* Scroll to bottom button */}
          <ScrollToBottom
            visible={showScrollBtn}
            onClick={scrollToBottom}
          />
        </div>

        {/* Input */}
        <MessageInput
          onSend={handleSend}
          disabled={sending}
          editingContent={editingMessage?.content ?? null}
          onCancelEdit={() => setEditingMessage(null)}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
        />
      </div>

      {/* Info panel */}
      {room && (
        <RoomInfoPanel
          room={room}
          open={showInfo}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  );
};

export default ChatRoomPage;
