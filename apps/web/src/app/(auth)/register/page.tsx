'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { getPublicKeysForUpload } from '@/lib/crypto';
import type { AuthResponse } from '@proroom/types';

const RegisterPage = () => {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post<AuthResponse>('/auth/register', {
        username,
        displayName,
        password,
      });

      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);

      const publicKeys = await getPublicKeysForUpload();
      await api.post('/keys/upload', publicKeys, {
        headers: { Authorization: `Bearer ${data.tokens.accessToken}` },
      });

      router.push('/chat');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Registration failed';
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message ?? message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-tg-bg-dark px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-tg-accent">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-tg-text">ProRoom</h1>
          <p className="mt-1 text-sm text-tg-text-secondary">
            Create your account
          </p>
        </div>

        <div className="rounded-xl bg-tg-bg-secondary p-6">
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl bg-tg-bg-input px-4 py-3 text-sm text-tg-text placeholder-tg-text-secondary outline-none focus:ring-1 focus:ring-tg-accent"
                placeholder="Username"
                required
                minLength={3}
                maxLength={50}
                autoComplete="username"
              />
            </div>

            <div>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl bg-tg-bg-input px-4 py-3 text-sm text-tg-text placeholder-tg-text-secondary outline-none focus:ring-1 focus:ring-tg-accent"
                placeholder="Display Name"
                required
                maxLength={100}
              />
            </div>

            <div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-tg-bg-input px-4 py-3 text-sm text-tg-text placeholder-tg-text-secondary outline-none focus:ring-1 focus:ring-tg-accent"
                placeholder="Password (min 8 characters)"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-tg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-tg-accent/80 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-tg-text-secondary">
            Already have an account?{' '}
            <Link href="/login" className="text-tg-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-tg-text-secondary">
          End-to-end encrypted. Only you can read your messages.
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
