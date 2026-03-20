'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
      return;
    }
    // In a real app, fetch users from API
    setUsers([
      { id: '1', name: 'Admin User', email: 'admin@hospital.co.ke', role: 'admin', is_active: true, last_login: '2026-03-06', created_at: '2026-01-01' },
      { id: '2', name: 'Dr. John Doe', email: 'doctor@hospital.co.ke', role: 'doctor', is_active: true, last_login: '2026-03-05', created_at: '2026-01-15' },
      { id: '3', name: 'Jane Smith', email: 'reception@hospital.co.ke', role: 'receptionist', is_active: true, last_login: '2026-03-06', created_at: '2026-02-01' },
    ]);
    setLoading(false);
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className="text-white/60 hover:text-white">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-white">User Management</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/70">Welcome, {user?.name}</span>
            <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-card">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Staff Users</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="glass-button-primary px-4 py-2"
            >
              Add User
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-white/50">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Role</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Last Login</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-6 py-4 text-sm font-medium text-white">{u.name}</td>
                      <td className="px-6 py-4 text-sm text-white/80">{u.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                          u.role === 'doctor' ? 'bg-blue-500/20 text-blue-400' :
                          u.role === 'nurse' ? 'bg-green-500/20 text-green-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/60">
                        {u.last_login || 'Never'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button className="text-primary-400 hover:text-primary-300 mr-3">
                          Edit
                        </button>
                        <button className="text-red-400 hover:text-red-300">
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
