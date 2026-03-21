'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../lib/store';
import Link from 'next/link';
import { Button } from '@/lib/components/Button';
import { StatCard } from '@/lib/components/Card';
import { Spinner } from '@/lib/components/Spinner';
import { useToastStore } from '@/lib/components/Toast';

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { addToast } = useToastStore();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Redirect to role-specific dashboard if authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const targetDashboard = getDashboardUrl(user.role);
      if (pathname !== targetDashboard) {
        router.replace(targetDashboard);
      }
    }
  }, [isAuthenticated, user, router, pathname]);

  if (!user) return null;

  const getDashboardUrl = (role: string): string => {
    switch (role) {
      case 'patient':
        return '/dashboard/patient';
      case 'doctor':
      case 'nurse':
        return '/dashboard/doctor';
      case 'receptionist':
        return '/dashboard/receptionist';
      case 'admin':
        return '/dashboard/admin';
      case 'pharmacist':
        return '/dashboard/pharmacist';
      case 'lab_tech':
        return '/dashboard/lab-tech';
      case 'facility':
        return '/dashboard/facility';
      case 'it_support':
        return '/dashboard/it-support';
      case 'super_admin':
        return '/dashboard/super-admin';
      default:
        return '/dashboard/patient';
    }
  };

  const handleLogout = () => {
    logout();
    addToast({ type: 'info', message: 'You have been logged out successfully.' });
    router.push('/login');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Role-specific content
  const getRoleContent = () => {
    switch (user.role) {
      case 'patient':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <Link
                href="/dashboard/patient"
                className="glass-card p-6 hover:scale-[1.02] transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-4xl mb-3">📋</div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-teal-400 transition-colors">My Queue Status</h3>
                    <p className="text-slate-400 mt-1">View your position in queue</p>
                  </div>
                  <span className="text-teal-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
              <Link
                href="/kiosk"
                className="glass-card p-6 hover:scale-[1.02] transition-all group border-teal-500/30"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-4xl mb-3">🎫</div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-teal-400 transition-colors">Get Queue Ticket</h3>
                    <p className="text-slate-400 mt-1">Join a new queue</p>
                  </div>
                  <span className="text-teal-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <StatCard
                icon={<span className="text-2xl">⏱️</span>}
                label="Est. Wait"
                value="15 min"
                variant="primary"
              />
              <StatCard
                icon={<span className="text-2xl">📍</span>}
                label="Position"
                value="#3"
                variant="default"
              />
              <StatCard
                icon={<span className="text-2xl">🏥</span>}
                label="Department"
                value="General"
                variant="default"
              />
            </div>
          </>
        );

      case 'doctor':
      case 'nurse':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
              <StatCard
                icon={<span className="text-2xl">👨‍⚕️</span>}
                label="Patients Today"
                value="24"
                variant="primary"
              />
              <StatCard
                icon={<span className="text-2xl">⏳</span>}
                label="In Queue"
                value="8"
                variant="warning"
              />
              <StatCard
                icon={<span className="text-2xl">✓</span>}
                label="Completed"
                value="16"
                variant="success"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/dashboard/doctor" className="glass-card p-5 hover:scale-[1.02] transition-all group">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🩺</div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">My Queue</h3>
                    <p className="text-sm text-slate-400">Manage patient queue</p>
                  </div>
                </div>
              </Link>
              <Link href="/display" className="glass-card p-5 hover:scale-[1.02] transition-all group border-blue-500/30">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📺</div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">Display</h3>
                    <p className="text-sm text-slate-400">View queue display</p>
                  </div>
                </div>
              </Link>
              <Link href="/kiosk" className="glass-card p-5 hover:scale-[1.02] transition-all group border-teal-500/30">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📝</div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">Register</h3>
                    <p className="text-sm text-slate-400">Register new patient</p>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/nurse/vitals" className="glass-card p-5 hover:scale-[1.02] transition-all group border-purple-500/30">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">💊</div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">Vitals</h3>
                    <p className="text-sm text-slate-400">Record vitals</p>
                  </div>
                </div>
              </Link>
            </div>
          </>
        );

      case 'receptionist':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
              <StatCard
                icon={<span className="text-2xl">📋</span>}
                label="Total Patients"
                value="45"
                variant="primary"
              />
              <StatCard
                icon={<span className="text-2xl">⏳</span>}
                label="Waiting"
                value="12"
                variant="warning"
              />
              <StatCard
                icon={<span className="text-2xl">✅</span>}
                label="Served"
                value="33"
                variant="success"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/dashboard/receptionist" className="glass-card p-5 hover:scale-[1.02] transition-all group">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🖥️</div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">All Queues</h3>
                    <p className="text-sm text-slate-400">Manage department queues</p>
                  </div>
                </div>
              </Link>
              <Link href="/kiosk" className="glass-card p-5 hover:scale-[1.02] transition-all group border-teal-500/30">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📝</div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">Register Patient</h3>
                    <p className="text-sm text-slate-400">Add new patient</p>
                  </div>
                </div>
              </Link>
              <Link href="/display" className="glass-card p-5 hover:scale-[1.02] transition-all group border-blue-500/30">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📺</div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">Queue Display</h3>
                    <p className="text-sm text-slate-400">View on TV</p>
                  </div>
                </div>
              </Link>
            </div>
          </>
        );

      case 'admin':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-6">
              <StatCard
                icon={<span className="text-2xl">👥</span>}
                label="Total Users"
                value="28"
                variant="primary"
              />
              <StatCard
                icon={<span className="text-2xl">🏥</span>}
                label="Departments"
                value="8"
                variant="default"
              />
              <StatCard
                icon={<span className="text-2xl">📋</span>}
                label="Queue Today"
                value="156"
                variant="warning"
              />
              <StatCard
                icon={<span className="text-2xl">⚡</span>}
                label="Avg Wait"
                value="12 min"
                variant="success"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/dashboard/admin" className="glass-card p-5 hover:scale-[1.02] transition-all group">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">⚙️</div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">Admin Panel</h3>
                    <p className="text-sm text-slate-400">System overview</p>
                  </div>
                </div>
              </Link>
              <Link href="/admin/users" className="glass-card p-5 hover:scale-[1.02] transition-all group border-purple-500/30">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">👥</div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">User Mgmt</h3>
                    <p className="text-sm text-slate-400">Manage staff</p>
                  </div>
                </div>
              </Link>
              <Link href="/admin/settings" className="glass-card p-5 hover:scale-[1.02] transition-all group border-blue-500/30">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🔧</div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">Settings</h3>
                    <p className="text-sm text-slate-400">Configuration</p>
                  </div>
                </div>
              </Link>
              <Link href="/admin/reports" className="glass-card p-5 hover:scale-[1.02] transition-all group border-teal-500/30">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📊</div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">Reports</h3>
                    <p className="text-sm text-slate-400">Analytics</p>
                  </div>
                </div>
              </Link>
            </div>
          </>
        );

      case 'pharmacist':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
              <StatCard
                icon={<span className="text-2xl">💊</span>}
                label="Prescriptions"
                value="18"
                variant="primary"
              />
              <StatCard
                icon={<span className="text-2xl">⏳</span>}
                label="Pending"
                value="5"
                variant="warning"
              />
              <StatCard
                icon={<span className="text-2xl">✅</span>}
                label="Dispensed"
                value="13"
                variant="success"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/dashboard/pharmacist" className="glass-card p-5 hover:scale-[1.02] transition-all group">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">💊</div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">Dispense Center</h3>
                    <p className="text-sm text-slate-400">Process prescriptions</p>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/pharmacist/inventory" className="glass-card p-5 hover:scale-[1.02] transition-all group border-teal-500/30">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📦</div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">Inventory</h3>
                    <p className="text-sm text-slate-400">Manage stock</p>
                  </div>
                </div>
              </Link>
            </div>
          </>
        );

      case 'lab_tech':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
              <StatCard
                icon={<span className="text-2xl">🔬</span>}
                label="Lab Orders"
                value="12"
                variant="primary"
              />
              <StatCard
                icon={<span className="text-2xl">⏳</span>}
                label="Processing"
                value="4"
                variant="warning"
              />
              <StatCard
                icon={<span className="text-2xl">✅</span>}
                label="Completed"
                value="8"
                variant="success"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/dashboard/lab-tech" className="glass-card p-5 hover:scale-[1.02] transition-all group">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🔬</div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">Lab Center</h3>
                    <p className="text-sm text-slate-400">Process lab orders</p>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/lab-tech/results" className="glass-card p-5 hover:scale-[1.02] transition-all group border-teal-500/30">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📊</div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">Results</h3>
                    <p className="text-sm text-slate-400">View lab results</p>
                  </div>
                </div>
              </Link>
            </div>
          </>
        );

      default:
        return (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏥</div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome, {user.name}!</h2>
            <p className="text-slate-400">Dashboard for {user.role} role coming soon.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="glass border-b border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl">🏥</Link>
            <div>
              <h1 className="text-lg font-bold text-white">Dashboard</h1>
              <p className="text-xs text-slate-400 hidden sm:block">Limuru Cottage Hospital</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
            {/* Real-time Clock */}
            <div className="hidden md:flex flex-col items-end">
              <span className="text-lg font-bold text-white tabular-nums">{formatTime(currentTime)}</span>
              <span className="text-xs text-slate-400">{formatDate(currentTime)}</span>
            </div>
            
            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-white">{user.name}</div>
                <div className="text-xs text-teal-400 capitalize">{user.role.replace('_', ' ')}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Welcome Banner */}
        <div className="mb-8 animate-slide-up">
          <div className="glass-card p-6 bg-gradient-to-r from-teal-600/10 to-transparent border-l-4 border-l-teal-500">
            <div className="flex items-center gap-4">
              <div className="text-4xl">👋</div>
              <div>
                <h2 className="text-2xl font-bold text-white">Welcome back, {user.name.split(' ')[0]}!</h2>
                <p className="text-slate-400">Here's what's happening at the hospital today.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Role-specific Content */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {getRoleContent()}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/display" className="glass-button text-sm py-2.5 px-4">
              📺 Queue Display
            </Link>
            <Link href="/kiosk" className="glass-button text-sm py-2.5 px-4">
              🎫 Kiosk Mode
            </Link>
            <Link href="/admin/users" className="glass-button text-sm py-2.5 px-4">
              🔍 Patient Search
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
