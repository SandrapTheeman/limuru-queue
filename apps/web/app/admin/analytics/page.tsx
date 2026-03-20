'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import Link from 'next/link';

interface AnalyticsData {
  todayPatients: number;
  weekPatients: number;
  monthPatients: number;
  avgWaitTime: number;
  deptStats: { department: string; patients: number; avgWait: number }[];
  hourlyData: { hour: number; count: number }[];
  peakHour: number;
}

const DEPARTMENTS = [
  { code: 'MED', name: 'General Medicine' },
  { code: 'PED', name: 'Pediatrics' },
  { code: 'GYN', name: 'Gynecology' },
  { code: 'ORTHO', name: 'Orthopedics' },
  { code: 'DEN', name: 'Dental' },
  { code: 'OPH', name: 'Ophthalmology' },
  { code: 'CARD', name: 'Cardiology' },
  { code: 'EMER', name: 'Emergency' },
];

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');
  
  // Mock analytics data (would come from API)
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    todayPatients: 47,
    weekPatients: 312,
    monthPatients: 1245,
    avgWaitTime: 18,
    deptStats: [
      { department: 'MED', patients: 156, avgWait: 22 },
      { department: 'PED', patients: 89, avgWait: 15 },
      { department: 'GYN', patients: 67, avgWait: 20 },
      { department: 'OPH', patients: 45, avgWait: 18 },
      { department: 'DEN', patients: 78, avgWait: 12 },
      { department: 'ORTH', patients: 34, avgWait: 25 },
    ],
    hourlyData: [
      { hour: 8, count: 12 }, { hour: 9, count: 28 }, { hour: 10, count: 45 },
      { hour: 11, count: 52 }, { hour: 12, count: 35 }, { hour: 13, count: 25 },
      { hour: 14, count: 48 }, { hour: 15, count: 55 }, { hour: 16, count: 42 },
      { hour: 17, count: 20 },
    ],
    peakHour: 15,
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
      return;
    }
    // Simulate loading analytics data
    setTimeout(() => setLoading(false), 500);
  }, [isAuthenticated, user, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const maxHourlyCount = Math.max(...analytics.hourlyData.map(d => d.count));

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
            <h1 className="text-xl font-bold text-white">Analytics Dashboard</h1>
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
        {/* Date Range Selector */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white">Performance Analytics</h2>
          <div className="flex gap-2">
            {(['today', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  dateRange === range
                    ? 'bg-primary-500 text-white'
                    : 'glass-button text-sm'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-white/50">Loading analytics...</div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="glass-card">
                <div className="text-white/60 text-sm mb-2">Today</div>
                <div className="text-3xl font-bold text-primary-400">{analytics.todayPatients}</div>
                <div className="text-white/50 text-sm">patients</div>
              </div>
              <div className="glass-card">
                <div className="text-white/60 text-sm mb-2">This Week</div>
                <div className="text-3xl font-bold text-blue-400">{analytics.weekPatients}</div>
                <div className="text-white/50 text-sm">patients</div>
              </div>
              <div className="glass-card">
                <div className="text-white/60 text-sm mb-2">This Month</div>
                <div className="text-3xl font-bold text-green-400">{analytics.monthPatients}</div>
                <div className="text-white/50 text-sm">patients</div>
              </div>
              <div className="glass-card">
                <div className="text-white/60 text-sm mb-2">Avg Wait Time</div>
                <div className="text-3xl font-bold text-yellow-400">{analytics.avgWaitTime}</div>
                <div className="text-white/50 text-sm">minutes</div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Hourly Distribution */}
              <div className="glass-card">
                <h3 className="text-lg font-semibold text-white mb-6">Patients by Hour</h3>
                <div className="flex items-end justify-between h-48 gap-2">
                  {analytics.hourlyData.map((data) => (
                    <div key={data.hour} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-gradient-to-t from-primary-500/80 to-primary-400/80 rounded-t transition-all hover:from-primary-400 hover:to-primary-300"
                        style={{ height: `${(data.count / maxHourlyCount) * 100}%` }}
                        title={`${data.count} patients`}
                      />
                      <div className="text-xs text-white/50 mt-2">
                        {data.hour}:00
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center text-sm text-white/60">
                  Peak hour: {analytics.peakHour}:00 ({Math.max(...analytics.hourlyData.map(d => d.count))} patients)
                </div>
              </div>

              {/* Department Stats */}
              <div className="glass-card">
                <h3 className="text-lg font-semibold text-white mb-6">Department Performance</h3>
                <div className="space-y-4">
                  {analytics.deptStats.map((dept) => {
                    const maxPatients = Math.max(...analytics.deptStats.map(d => d.patients));
                    const deptInfo = DEPARTMENTS.find(d => d.code === dept.department);
                    return (
                      <div key={dept.department}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white">{dept.department} - {deptInfo?.name}</span>
                          <span className="text-white/60">{dept.patients} patients</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-primary-500 to-primary-400 h-2 rounded-full"
                            style={{ width: `${(dept.patients / maxPatients) * 100}%` }}
                          />
                        </div>
                        <div className="text-xs text-white/40 mt-1">
                          Avg wait: {dept.avgWait} min
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card">
                <h3 className="text-lg font-semibold text-white mb-4">Most Active Department</h3>
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-primary-400">MED</div>
                  <div className="text-white/60">General Medicine</div>
                  <div className="text-sm text-white/40 mt-2">156 patients this week</div>
                </div>
              </div>
              <div className="glass-card">
                <h3 className="text-lg font-semibold text-white mb-4">Shortest Wait</h3>
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-green-400">DEN</div>
                  <div className="text-white/60">Dental</div>
                  <div className="text-sm text-white/40 mt-2">12 min average</div>
                </div>
              </div>
              <div className="glass-card">
                <h3 className="text-lg font-semibold text-white mb-4">Peak Time</h3>
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-yellow-400">3 PM</div>
                  <div className="text-white/60">15:00 - 16:00</div>
                  <div className="text-sm text-white/40 mt-2">55 patients on average</div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
