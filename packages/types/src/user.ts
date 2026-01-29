export enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarPath?: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublicKeys {
  userId: string;
  identityKey: string; // base64
  signedPreKey: string; // base64
  preKeySignature: string; // base64
}

export interface CreateUserInput {
  username: string;
  displayName: string;
  password: string;
  role?: Role;
}

export interface UpdateUserInput {
  displayName?: string;
  password?: string;
  isActive?: boolean;
  role?: Role;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}
