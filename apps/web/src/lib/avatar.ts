const MINIO_ENDPOINT = process.env.NEXT_PUBLIC_MINIO_ENDPOINT ?? 'localhost:9000';
const AVATAR_BUCKET = 'proroom-avatars';

export const getAvatarUrl = (avatarPath?: string | null): string | undefined => {
  if (!avatarPath) return undefined;
  return `http://${MINIO_ENDPOINT}/${AVATAR_BUCKET}/${avatarPath}`;
};
