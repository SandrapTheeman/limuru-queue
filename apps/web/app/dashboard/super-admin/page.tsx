'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import Link from 'next/link';

interface Facility {
  id: string;
  name: string;
  location: string;
  status: string;
  patients: number;
  staff: number;
}

interface GlobalStats {
  totalFacilities: number;
  totalPatients: number;
  totalStaff: number;
  activeQueues: number;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [stats, setStats] = useState<GlobalStats>({ totalFacilities: 0, totalPatients: 0, totalStaff: 0, activeQueues: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/facilities', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFacilities(data.data?.facilities || []);
        setStats({ totalFacilities: data.data?.facilities?.length || 0, totalPatients: 0, totalStaff: 0, activeQueues: 0 });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setFacilities([
        { id: '1', name: 'Limuru Cottage Hospital', location: 'Limuru', status: 'active', patients: 1250, staff: 45 },
        { id: '2', name: 'Kikuyu Branch', location: 'Kikuyu', status: 'active', patients: 800, staff: 30 },
      ]);
      setStats({ totalFacilities: 2, totalPatients: 2050, totalStaff: 75, activeQueues: 12 });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="glass border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xl">🏥</Link>
            <h1 className="text-lg font-bold text-white">Super Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70">
              {user.name}
              <span className="ml-2 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded text-xs text-white">{user.role}</span>
            </span>
            <button onClick={() => { logout(); router.push('/login'); }} className="text-sm text-red-400">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card"><div className="text-3xl mb-2">🏥</div><h3 className="text-lg font-semibold text-white">Facilities</h3><p className="text-2xl font-bold text-purple-300">{stats.totalFacilities}</p></div>
          <div className="glass-card"><div className="text-3xl mb-2">👥</div><h3 className="text-lg font-semibold text-white">Total Patients</h3><p className="text-2xl font-bold text-blue-300">{stats.totalPatients}</p></div>
          <div className="glass-card"><div className="text-3xl mb-2">👨‍⚕️</div><h3 className="text-lg font-semibold text-white">Total Staff</h3><p className="text-2xl font-bold text-green-300">{stats.totalStaff}</p></div>
          <div className="glass-card"><div className="text-3xl mb-2">📋</div><h3 className="text-lg font-semibold text-white">Active Queues</h3><p className="text-2xl font-bold text-yellow-300">{stats.activeQueues}</p></div>
        </div>

        <div className="glass-card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Facility Management</h2>
            <Link href="/admin/facilities/new" className="glass-button-primary text-sm">Add Facility</Link>
          </div>
          {loading ? <div className="text-white/60 text-center py-8">Loading...</div> : facilities.length === 0 ? <div className="text-white/60 text-center py-8">No facilities found</div> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/10"><th className="text-left py-3 px-4 text-white/70">Facility</th><th className="text-left py-3 px-4 text-white/70">Location</th><th className="text-left py-3 px-4 text-white/70">Patients</th><th className="text-left py-3 px-4 text-white/70">Staff</th><th className="text-left py-3 px-4 text-white/70">Status</th><th className="text-left py-3 px-4 text-white/70">Actions</th></tr></thead>
                <tbody>
                  {facilities.map((facility) => (
                    <tr key={facility.id} className="border-b border-white/5">
                      <td className="py-3 px-4 text-white font-medium">{facility.name}</td>
                      <td className="py-3 px-4 text-white/70">{facility.location}</td>
                      <td className="py-3 px-4 text-white">{facility.patients}</td>
                      <td className="py-3 px-4 text-white">{facility.staff}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs ${facility.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>{facility.status}</span></td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Link href={`/admin/facilities/${facility.id}`} className="glass-button text-sm py-1">Manage</Link>
                          <button className="glass-button text-sm py-1 text-white/60">Reports</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="glass-card">
            <h2 className="text-lg font-semibold text-white mb-4">System Wide Settings</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                <span className="text-white">Global Notifications</span>
                <span className="text-green-300">Enabled</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                <span className="text-white">Multi-Facility Reports</span>
                <span className="text-green-300">Active</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                <span className="text-white">Cross-Facility Auth</span>
                <span className="text-green-300">Enabled</span>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/users" className="glass-button">Manage All Users</Link>
              <Link href="/admin/settings" className="glass-button">Global Settings</Link>
              <Link href="/admin/analytics" className="glass-button">Analytics</Link>
              <Link href="/admin/backups" className="glass-button">Backups</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
