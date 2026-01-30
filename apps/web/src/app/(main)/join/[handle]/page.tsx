'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useCallStore } from '@/stores/call';

const JoinHandlePage = () => {
  const params = useParams<{ handle: string }>();
  const router = useRouter();
  const handle = params.handle;
  const { setCallTitle } = useCallStore();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolve = async () => {
      try {
        const { data } = await api.get(`/rooms/call/${handle}`);

        if (!data.isCallActive) {
          setError('This call has ended.');
          setLoading(false);
          return;
        }

        setCallTitle(data.callTitle);
        router.replace(`/calls/${data.roomId}/lobby`);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          setError("You're not a member of this room.");
        } else if (status === 404) {
          setError('Invalid call link.');
        } else {
          setError('Something went wrong.');
        }
        setLoading(false);
      }
    };

    resolve();
  }, [handle, router, setCallTitle]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-tg-bg-dark">
        <div className="text-tg-text-secondary">Joining call...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center bg-tg-bg-dark p-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-tg-text">{error}</h2>
        <button
          onClick={() => router.push('/chat')}
          className="rounded-xl bg-tg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-tg-accent/90"
        >
          Go to Chat
        </button>
      </div>
    </div>
  );
};

export default JoinHandlePage;
