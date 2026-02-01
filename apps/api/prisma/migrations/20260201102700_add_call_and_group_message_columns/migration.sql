-- AlterTable: Add call-related columns to Room
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "callHandle" TEXT;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "callTitle" TEXT;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "isCallActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "callStartedAt" TIMESTAMP(3);
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "callStartedBy" TEXT;

-- CreateIndex: Unique index on Room.callHandle
CREATE UNIQUE INDEX IF NOT EXISTS "Room_callHandle_key" ON "Room"("callHandle");

-- AlterTable: Add per-recipient group message columns to Message
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "recipientUserId" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "groupMessageId" TEXT;

-- CreateIndex: Indexes for Message group columns
CREATE INDEX IF NOT EXISTS "Message_roomId_recipientUserId_createdAt_idx" ON "Message"("roomId", "recipientUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_groupMessageId_idx" ON "Message"("groupMessageId");
