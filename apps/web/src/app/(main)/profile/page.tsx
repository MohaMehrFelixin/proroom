'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Avatar } from '@/components/ui/Avatar';
import { getAvatarUrl } from '@/lib/avatar';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const ProfilePage = () => {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarUrl = getAvatarUrl(user?.avatarPath);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Use JPEG, PNG, WebP, or GIF.');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    setError('');
    setMessage('');
    setUploading(true);

    try {
      const { data: uploadData } = await api.post<{
        uploadUrl: string;
        storagePath: string;
      }>('/files/avatar-upload-url', {
        mimeType: file.type,
        size: file.size,
      });

      await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      const { data: updatedUser } = await api.patch<{
        id: string;
        username: string;
        displayName: string;
        avatarPath: string;
        role: string;
        isActive: boolean;
      }>('/users/me', { avatarPath: uploadData.storagePath });

      setUser({ ...user!, avatarPath: updatedUser.avatarPath });
      setMessage('Avatar updated');
    } catch {
      setError('Failed to upload avatar');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      const payload: Record<string, string> = {};
      if (displayName !== user?.displayName) payload.displayName = displayName;
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        setMessage('No changes to save');
        setSaving(false);
        return;
      }

      const { data } = await api.patch<{
        id: string;
        username: string;
        displayName: string;
        avatarPath: string | null;
        role: string;
        isActive: boolean;
      }>('/users/me', payload);

      setUser({ ...user!, displayName: data.displayName });
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Profile updated');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message ?? 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full items-start justify-center overflow-y-auto p-6">
      <div className="w-full max-w-md rounded-xl bg-tg-bg-secondary p-6">
        <h1 className="mb-6 text-xl font-bold text-white">Profile Settings</h1>

        {message && (
          <div className="mb-4 rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Avatar section */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <Avatar
            name={user?.displayName ?? ''}
            id={user?.id ?? ''}
            size="lg"
            avatarUrl={avatarUrl}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg bg-tg-bg-input px-4 py-1.5 text-sm text-tg-accent hover:bg-tg-bg-input/80 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Change Avatar'}
          </button>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-tg-text-secondary">Username</label>
            <input
              value={`@${user?.username ?? ''}`}
              disabled
              className="w-full rounded-lg border border-tg-border bg-tg-bg-input px-3 py-2 text-sm text-tg-text-secondary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-tg-text-secondary">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-tg-border bg-tg-bg-input px-3 py-2 text-sm text-white focus:border-tg-accent focus:outline-none"
              required
              minLength={1}
              maxLength={100}
            />
          </div>

          <hr className="border-tg-border" />
          <p className="text-sm text-tg-text-secondary">Change Password</p>

          <div>
            <label className="mb-1 block text-sm text-tg-text-secondary">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-tg-border bg-tg-bg-input px-3 py-2 text-sm text-white focus:border-tg-accent focus:outline-none"
              placeholder="Required to change password"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-tg-text-secondary">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-tg-border bg-tg-bg-input px-3 py-2 text-sm text-white focus:border-tg-accent focus:outline-none"
              placeholder="Min 8 characters"
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-tg-accent py-2.5 font-medium text-white hover:bg-tg-accent/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
