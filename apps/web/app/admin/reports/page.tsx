'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import Link from 'next/link';

interface ReportData {
  date: string;
  totalPatients: number;
  completed: number;
  waiting: number;
  cancelled: number;
  avgWaitTime: number;
}

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [dateRange, setDateRange] = useState('7');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData[]>([]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
      return;
    }
    const days = parseInt(dateRange);
    const data: ReportData[] = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        totalPatients: Math.floor(Math.random() * 30) + 10,
        completed: Math.floor(Math.random() * 25) + 5,
        waiting: Math.floor(Math.random() * 10),
        cancelled: Math.floor(Math.random() * 3),
        avgWaitTime: Math.floor(Math.random() * 20) + 10,
      });
    }
    setReportData(data);
    setLoading(false);
  }, [isAuthenticated, user, dateRange]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const totalPatients = reportData.reduce((sum, d) => sum + d.totalPatients, 0);
  const totalCompleted = reportData.reduce((sum, d) => sum + d.completed, 0);
  const avgWaitTime = Math.round(reportData.reduce((sum, d) => sum + d.avgWaitTime, 0) / reportData.length);

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className="text-white/60 hover:text-white">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-white">Reports & Analytics</h1>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h2 className="text-2xl font-bold text-white">Queue Performance Reports</h2>
          <div className="flex gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="glass-input px-4 py-2 text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </select>
            <button className="glass-button-primary px-4 py-2 text-sm">
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/60 text-sm">Total Patients</div>
                <div className="text-3xl font-bold text-blue-400">{totalPatients}</div>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/60 text-sm">Completed</div>
                <div className="text-3xl font-bold text-green-400">{totalCompleted}</div>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/60 text-sm">Avg Wait Time</div>
                <div className="text-3xl font-bold text-yellow-400">{avgWaitTime} min</div>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/60 text-sm">Completion Rate</div>
                <div className="text-3xl font-bold text-purple-400">
                  {totalPatients > 0 ? Math.round((totalCompleted / totalPatients) * 100) : 0}%
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Breakdown</h3>
          {loading ? (
            <div className="text-center py-8 text-white/50">Loading data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Total</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Completed</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Waiting</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Cancelled</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Avg Wait</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {reportData.map((row) => (
                    <tr key={row.date} className="hover:bg-white/5">
                      <td className="px-6 py-4 text-sm font-medium text-white">{row.date}</td>
                      <td className="px-6 py-4 text-sm text-blue-400 font-medium">{row.totalPatients}</td>
                      <td className="px-6 py-4 text-sm text-green-400">{row.completed}</td>
                      <td className="px-6 py-4 text-sm text-yellow-400">{row.waiting}</td>
                      <td className="px-6 py-4 text-sm text-red-400">{row.cancelled}</td>
                      <td className="px-6 py-4 text-sm text-white/80">{row.avgWaitTime} min</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                          {Math.round((row.completed / row.totalPatients) * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card">
            <h3 className="text-lg font-semibold text-white mb-4">Department Performance</h3>
            <div className="space-y-4">
              {['MED', 'PED', 'GYN', 'OPH', 'DEN', 'ORTH'].map((dept, idx) => (
                <div key={dept} className="flex items-center justify-between">
                  <span className="text-white/80">{dept}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" 
                        style={{ width: `${Math.floor(Math.random() * 40) + 60}%` }}
                      />
                    </div>
                    <span className="text-sm text-white/60 w-16">{Math.floor(Math.random() * 50) + 20} patients</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card">
            <h3 className="text-lg font-semibold text-white mb-4">Peak Hours Analysis</h3>
            <div className="space-y-4">
              {[
                { time: '8:00 AM - 10:00 AM', count: 45 },
                { time: '10:00 AM - 12:00 PM', count: 62 },
                { time: '12:00 PM - 2:00 PM', count: 38 },
                { time: '2:00 PM - 4:00 PM', count: 55 },
                { time: '4:00 PM - 5:00 PM', count: 28 },
              ].map((slot) => (
                <div key={slot.time} className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">{slot.time}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-400 rounded-full" 
                        style={{ width: `${(slot.count / 70) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-white/60">{slot.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}