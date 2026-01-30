export enum RoomType {
  DM = 'DM',
  GROUP = 'GROUP',
}

export enum MemberRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  callHandle?: string | null;
  callTitle?: string | null;
  isCallActive?: boolean;
  callStartedAt?: string | null;
  callStartedBy?: string | null;
  members?: RoomMember[];
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarPath?: string | null;
  };
}

export interface CreateRoomInput {
  name: string;
  type: RoomType;
  memberIds: string[];
}

export interface AddMemberInput {
  userId: string;
  role?: MemberRole;
}
