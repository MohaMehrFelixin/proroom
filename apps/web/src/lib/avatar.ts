const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const STORAGE_BASE =
  API_BASE.replace(/\/api\/?$/, '') + '/storage';
const AVATAR_BUCKET = 'proroom-avatars';

export const getAvatarUrl = (
  avatarPath?: string | null,
): string | undefined => {
  if (!avatarPath) return undefined;
  return `${STORAGE_BASE}/${AVATAR_BUCKET}/${avatarPath}`;
};
