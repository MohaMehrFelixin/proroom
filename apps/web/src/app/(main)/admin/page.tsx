'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'next/navigation';
import type { User } from '@proroom/types';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRooms: number;
  totalMessages: number;
}

const AdminPage = () => {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [form, setForm] = useState<{ username: string; displayName: string; password: string; role: 'ADMIN' | 'MEMBER' }>({ username: '', displayName: '', password: '', role: 'MEMBER' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      router.push('/chat');
      return;
    }

    const load = async () => {
      const [statsRes, usersRes] = await Promise.all([
        api.get<DashboardStats>('/admin/stats'),
        api.get<{ data: User[] }>('/users'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.data);
    };
    load();
  }, [user, router]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post<User>('/users', form);
      setUsers((prev) => [data, ...prev]);
      setShowCreateUser(false);
      setForm({ username: '', displayName: '', password: '', role: 'MEMBER' });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message ?? 'Failed to create user');
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    await api.patch(`/users/${userId}`, { isActive: !isActive });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: !isActive } : u)),
    );
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Delete user @${username}? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      setError('Failed to delete user');
    }
  };

  if (user?.role !== 'ADMIN') return null;

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-6 text-2xl font-bold text-white">Admin Panel</h1>

      {/* Stats */}
      {stats && (
        <div className="mb-8 grid grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers },
            { label: 'Active Users', value: stats.activeUsers },
            { label: 'Total Rooms', value: stats.totalRooms },
            { label: 'Total Messages', value: stats.totalMessages },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-surface-800 p-4"
            >
              <div className="text-2xl font-bold text-white">
                {stat.value}
              </div>
              <div className="text-sm text-surface-300">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* User Management */}
      <div className="rounded-xl bg-surface-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Users</h2>
          <button
            onClick={() => setShowCreateUser(!showCreateUser)}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            {showCreateUser ? 'Cancel' : 'Create User'}
          </button>
        </div>

        {showCreateUser && (
          <form
            onSubmit={handleCreateUser}
            className="mb-6 rounded-lg bg-surface-800 p-4"
          >
            {error && (
              <div className="mb-3 rounded-lg bg-red-500/10 p-2 text-sm text-red-400">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="Username"
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value }))
                }
                className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-white"
                required
              />
              <input
                placeholder="Display Name"
                value={form.displayName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, displayName: e.target.value }))
                }
                className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-white"
                required
              />
              <input
                type="password"
                placeholder="Password (min 8 chars)"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-white"
                required
                minLength={8}
              />
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    role: e.target.value as 'ADMIN' | 'MEMBER',
                  }))
                }
                className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-white"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Create User
            </button>
          </form>
        )}

        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-800 text-left text-sm text-surface-300">
              <th className="pb-3">Username</th>
              <th className="pb-3">Display Name</th>
              <th className="pb-3">Role</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-surface-800/50 text-sm"
              >
                <td className="py-3 text-white">@{u.username}</td>
                <td className="py-3 text-surface-300">{u.displayName}</td>
                <td className="py-3">
                  <span
                    className={
                      u.role === 'ADMIN'
                        ? 'text-primary-400'
                        : 'text-surface-300'
                    }
                  >
                    {u.role}
                  </span>
                </td>
                <td className="py-3">
                  <span
                    className={
                      u.isActive ? 'text-green-400' : 'text-red-400'
                    }
                  >
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(u.id, u.isActive)}
                      className="text-xs text-surface-300 hover:text-white"
                    >
                      {u.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id, u.username)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPage;
