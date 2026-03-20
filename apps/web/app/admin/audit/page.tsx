'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import Link from 'next/link';

interface AuditEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string;
}

export default function AuditPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('');

  // Mock audit data (would come from API)
  const mockLogs: AuditEntry[] = [
    { id: '1', timestamp: '2026-03-10T14:30:00Z', user_id: 'admin-001', user_name: 'System Admin', action: 'login', entity_type: 'user', entity_id: 'admin-001', ip_address: '192.168.1.100' },
    { id: '2', timestamp: '2026-03-10T14:25:00Z', user_id: 'admin-001', user_name: 'System Admin', action: 'update_settings', entity_type: 'settings', entity_id: 'clinic_name', ip_address: '192.168.1.100' },
    { id: '3', timestamp: '2026-03-10T14:20:00Z', user_id: 'doc-001', user_name: 'Dr. John Doe', action: 'call_patient', entity_type: 'visit', entity_id: 'visit-042', ip_address: '192.168.1.101' },
    { id: '4', timestamp: '2026-03-10T14:15:00Z', user_id: 'rec-001', user_name: 'Jane Smith', action: 'add_to_queue', entity_type: 'visit', entity_id: 'visit-041', ip_address: '192.168.1.102' },
    { id: '5', timestamp: '2026-03-10T14:10:00Z', user_id: 'admin-001', user_name: 'System Admin', action: 'create_user', entity_type: 'user', entity_id: 'user-new', ip_address: '192.168.1.100' },
    { id: '6', timestamp: '2026-03-10T14:05:00Z', user_id: 'doc-002', user_name: 'Dr. Sarah Kimani', action: 'complete_visit', entity_type: 'visit', entity_id: 'visit-040', ip_address: '192.168.1.103' },
    { id: '7', timestamp: '2026-03-10T14:00:00Z', user_id: 'rec-001', user_name: 'Jane Smith', action: 'transfer_patient', entity_type: 'visit', entity_id: 'visit-039', ip_address: '192.168.1.102' },
    { id: '8', timestamp: '2026-03-10T13:55:00Z', user_id: 'patient-001', user_name: 'John Doe', action: 'register', entity_type: 'patient', entity_id: 'patient-new', ip_address: '192.168.1.200' },
    { id: '9', timestamp: '2026-03-10T13:50:00Z', user_id: 'admin-001', user_name: 'System Admin', action: 'logout', entity_type: 'user', entity_id: 'admin-001', ip_address: '192.168.1.100' },
    { id: '10', timestamp: '2026-03-10T13:45:00Z', user_id: 'doc-001', user_name: 'Dr. John Doe', action: 'login', entity_type: 'user', entity_id: 'doc-001', ip_address: '192.168.1.101' },
  ];

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
      return;
    }
    setLogs(mockLogs);
    setLoading(false);
  }, [isAuthenticated, user, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const filteredLogs = logs.filter(log => {
    if (filterAction && log.action !== filterAction) return false;
    if (filterUser && !log.user_name.toLowerCase().includes(filterUser.toLowerCase())) return false;
    return true;
  });

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      login: 'bg-green-500/20 text-green-400',
      logout: 'bg-gray-500/20 text-gray-400',
      create_user: 'bg-blue-500/20 text-blue-400',
      update_settings: 'bg-purple-500/20 text-purple-400',
      add_to_queue: 'bg-primary-500/20 text-primary-400',
      call_patient: 'bg-yellow-500/20 text-yellow-400',
      complete_visit: 'bg-green-500/20 text-green-400',
      transfer_patient: 'bg-orange-500/20 text-orange-400',
      register: 'bg-cyan-500/20 text-cyan-400',
    };
    return colors[action] || 'bg-gray-500/20 text-gray-400';
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueUsers = [...new Set(logs.map(l => l.user_name))];

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
            <h1 className="text-xl font-bold text-white">Audit Logs</h1>
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
        {/* Filters */}
        <div className="glass-card mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-white/60 text-sm mb-2 block">Filter by Action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="glass-input w-full"
              >
                <option value="">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>
                    {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-white/60 text-sm mb-2 block">Filter by User</label>
              <input
                type="text"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                placeholder="Search users..."
                className="glass-input w-full"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterAction('');
                  setFilterUser('');
                }}
                className="glass-button px-4 py-2"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="glass-card">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">
              System Audit Log {filterAction || filterUser ? `(filtered)` : ''}
            </h2>
            <p className="text-sm text-white/50">{filteredLogs.length} entries</p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-white/50">Loading audit logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-white/50">No audit logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Timestamp</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-white/60">User</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Entity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-white/60">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-sm text-white/80 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-white">{log.user_name}</span>
                        <span className="text-white/40 text-xs ml-2">({log.user_id})</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">
                        {log.entity_type}: {log.entity_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/50 font-mono">
                        {log.ip_address}
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
