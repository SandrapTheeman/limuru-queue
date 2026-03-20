'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import Link from 'next/link';

interface SystemStatus {
  api: string;
  database: string;
  cache: string;
  queue: string;
}

interface Backup {
  key: string;
  size: number;
  uploaded: string;
}

interface Log {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  ip: string;
}

export default function ITSupportDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({ api: 'unknown', database: 'unknown', cache: 'unknown', queue: 'unknown' });
  const [backups, setBackups] = useState<Backup[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusRes, backupRes, logRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/admin/backups', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/admin/audit-logs?limit=20', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
      ]);
      
      if (statusRes.ok) setSystemStatus({ api: 'healthy', database: 'healthy', cache: 'healthy', queue: 'healthy' });
      if (backupRes.ok) { const d = await backupRes.json(); setBackups(d.data?.backups || []); }
      if (logRes.ok) { const d = await logRes.json(); setLogs(d.data?.logs || []); }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      setCreatingBackup(true);
      const response = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Error creating backup:', error);
    } finally {
      setCreatingBackup(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'healthy' || status === 'available') return 'text-green-300';
    if (status === 'degraded') return 'text-yellow-300';
    return 'text-red-300';
  };

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="glass border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xl">🏥</Link>
            <h1 className="text-lg font-bold text-white">IT Support Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70">
              {user.name}
              <span className="ml-2 px-2 py-1 bg-cyan-500/20 rounded text-xs text-cyan-300">{user.role}</span>
            </span>
            <button onClick={() => { logout(); router.push('/login'); }} className="text-sm text-red-400">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card"><div className="text-3xl mb-2">🌐</div><h3 className="text-lg font-semibold text-white">API</h3><p className={`text-2xl font-bold ${getStatusColor(systemStatus.api)}`}>{systemStatus.api}</p></div>
          <div className="glass-card"><div className="text-3xl mb-2">🗄️</div><h3 className="text-lg font-semibold text-white">Database</h3><p className={`text-2xl font-bold ${getStatusColor(systemStatus.database)}`}>{systemStatus.database}</p></div>
          <div className="glass-card"><div className="text-3xl mb-2">⚡</div><h3 className="text-lg font-semibold text-white">Cache</h3><p className={`text-2xl font-bold ${getStatusColor(systemStatus.cache)}`}>{systemStatus.cache}</p></div>
          <div className="glass-card"><div className="text-3xl mb-2">📬</div><h3 className="text-lg font-semibold text-white">Queue</h3><p className={`text-2xl font-bold ${getStatusColor(systemStatus.queue)}`}>{systemStatus.queue}</p></div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">System Backups</h2>
              <button onClick={createBackup} disabled={creatingBackup} className="glass-button-primary text-sm">
                {creatingBackup ? 'Creating...' : 'Create Backup'}
              </button>
            </div>
            {backups.length === 0 ? <div className="text-white/60 text-center py-8">No backups found</div> : (
              <div className="space-y-3">
                {backups.map((backup, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded">
                    <div><p className="text-white text-sm">{backup.key}</p><p className="text-white/50 text-xs">{(backup.size / 1024).toFixed(2)} KB</p></div>
                    <span className="text-white/50 text-sm">{new Date(backup.uploaded).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            {logs.length === 0 ? <div className="text-white/60 text-center py-8">No activity logs</div> : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 bg-white/5 rounded">
                    <div className="flex justify-between"><span className="text-white text-sm">{log.action}</span><span className="text-white/50 text-xs">{new Date(log.timestamp).toLocaleString()}</span></div>
                    <p className="text-white/50 text-xs">User: {log.user} | IP: {log.ip}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="glass-card mt-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/settings" className="glass-button">System Settings</Link>
            <Link href="/admin/iptv" className="glass-button">TV Displays</Link>
            <Link href="/admin/users" className="glass-button">User Management</Link>
            <button onClick={fetchData} className="glass-button">Refresh Status</button>
          </div>
        </div>
      </main>
    </div>
  );
}
