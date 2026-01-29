'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { encryptFile } from '@/lib/crypto';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface FileUploadProps {
  roomId: string;
  onFileReady: (fileId: string, fileName: string, fileKey: string, fileNonce: string) => void;
}

export const FileUpload = ({ roomId, onFileReady }: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Read file bytes
      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      // Encrypt client-side
      setProgress(20);
      const { encryptedFile, fileNonce, fileKey } = encryptFile(fileData);

      // Get presigned upload URL
      setProgress(40);
      const { data: uploadData } = await api.post<{
        fileId: string;
        uploadUrl: string;
      }>('/files/upload-url', {
        roomId,
        fileName: file.name,
        mimeType: 'application/octet-stream', // Always octet-stream since encrypted
        size: encryptedFile.length,
      });

      // Upload encrypted bytes to MinIO via presigned URL
      setProgress(60);
      await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: new Uint8Array(encryptedFile) as unknown as BodyInit,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      setProgress(100);
      onFileReady(uploadData.fileId, file.name, fileKey, fileNonce);
    } catch {
      // Upload failed
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded-lg bg-surface-800 px-3 py-2.5 text-surface-300 hover:bg-surface-700 hover:text-white disabled:opacity-50"
        title="Upload encrypted file"
      >
        {uploading ? `${progress}%` : '📎'}
      </button>
    </div>
  );
};
