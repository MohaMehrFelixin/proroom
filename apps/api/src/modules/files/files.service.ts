import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

const BUCKET_NAME = 'proroom-files';
const AVATAR_BUCKET = 'proroom-avatars';
const MAX_FILE_SIZE_MB = 100;
const MAX_AVATAR_SIZE_MB = 5;
const PRESIGNED_URL_EXPIRY = 3600; // 1 hour
const ALLOWED_AVATAR_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

@Injectable()
export class FilesService implements OnModuleInit {
  private readonly logger = new Logger(FilesService.name);
  private minioClient: Minio.Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const endpoint = this.config.get('MINIO_ENDPOINT', 'localhost');
    const port = parseInt(this.config.get('MINIO_PORT', '9000'));
    this.minioClient = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL: false,
      accessKey: this.config.getOrThrow('MINIO_ACCESS_KEY'),
      secretKey: this.config.getOrThrow('MINIO_SECRET_KEY'),
    });
    this.minioInternalOrigin = `http://${endpoint}:${port}`;
    this.publicStorageBase =
      this.config.get('FRONTEND_URL', '') + '/storage';
  }

  private readonly minioInternalOrigin: string;
  private readonly publicStorageBase: string;

  private rewritePresignedUrl(url: string): string {
    if (!this.publicStorageBase) return url;
    return url.replace(this.minioInternalOrigin, this.publicStorageBase);
  }

  async onModuleInit() {
    const exists = await this.minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await this.minioClient.makeBucket(BUCKET_NAME);
      this.logger.log(`Created MinIO bucket: ${BUCKET_NAME}`);
    }

    const avatarExists = await this.minioClient.bucketExists(AVATAR_BUCKET);
    if (!avatarExists) {
      await this.minioClient.makeBucket(AVATAR_BUCKET);
      const publicPolicy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${AVATAR_BUCKET}/*`],
          },
        ],
      });
      await this.minioClient.setBucketPolicy(AVATAR_BUCKET, publicPolicy);
      this.logger.log(`Created public MinIO bucket: ${AVATAR_BUCKET}`);
    }
  }

  async getUploadUrl(
    roomId: string,
    uploaderId: string,
    fileName: string,
    mimeType: string,
    size: number,
  ) {
    if (size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new Error(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit`);
    }

    const fileId = randomBytes(16).toString('hex');
    const storagePath = `${roomId}/${fileId}`;

    await this.prisma.fileMetadata.create({
      data: {
        id: fileId,
        roomId,
        uploaderId,
        fileName,
        mimeType,
        size,
        storagePath,
      },
    });

    const uploadUrl = await this.minioClient.presignedPutObject(
      BUCKET_NAME,
      storagePath,
      PRESIGNED_URL_EXPIRY,
    );

    return { fileId, uploadUrl: this.rewritePresignedUrl(uploadUrl) };
  }

  async getAvatarUploadUrl(userId: string, mimeType: string, size: number) {
    if (!ALLOWED_AVATAR_TYPES.includes(mimeType)) {
      throw new Error(
        `Invalid file type. Allowed: ${ALLOWED_AVATAR_TYPES.join(', ')}`,
      );
    }

    if (size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
      throw new Error(`Avatar size exceeds ${MAX_AVATAR_SIZE_MB}MB limit`);
    }

    const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
    const storagePath = `${userId}/avatar.${ext}`;

    const uploadUrl = await this.minioClient.presignedPutObject(
      AVATAR_BUCKET,
      storagePath,
      PRESIGNED_URL_EXPIRY,
    );

    return {
      uploadUrl: this.rewritePresignedUrl(uploadUrl),
      storagePath,
    };
  }

  async getDownloadUrl(fileId: string) {
    const file = await this.prisma.fileMetadata.findUnique({
      where: { id: fileId },
    });

    if (!file) throw new Error('File not found');

    const downloadUrl = await this.minioClient.presignedGetObject(
      BUCKET_NAME,
      file.storagePath,
      PRESIGNED_URL_EXPIRY,
    );

    return {
      downloadUrl: this.rewritePresignedUrl(downloadUrl),
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
    };
  }
}
