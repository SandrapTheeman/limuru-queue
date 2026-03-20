'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../lib/store';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

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
    router.push('/login');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/" className="text-xl md:text-2xl">🏥</Link>
            <h1 className="text-lg md:text-xl font-bold text-white">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <span className="text-sm text-white/70 hidden sm:inline">
              Welcome, {user.name}
              <span className="ml-2 px-2 py-1 bg-primary-500/20 rounded text-xs capitalize text-primary-300">
                {user.role}
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {user.role === 'patient' && (
            <>
              <Link
                href="/dashboard/patient"
                className="glass-card hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">📋</div>
                <h3 className="text-lg font-semibold text-white">My Queue Status</h3>
                <p className="text-white/50 mt-1">View your position in queue</p>
              </Link>
              <Link
                href="/kiosk"
                className="glass-card hover:scale-105 transition-transform"
                style={{ borderColor: 'rgba(20, 184, 166, 0.3)' }}
              >
                <div className="text-4xl mb-3">🎫</div>
                <h3 className="text-lg font-semibold text-white">Get Queue Ticket</h3>
                <p className="text-white/50 mt-1">Join a new queue</p>
              </Link>
            </>
          )}

          {(user.role === 'doctor' || user.role === 'nurse') && (
            <>
              <Link
                href="/dashboard/doctor"
                className="glass-card hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">👨‍⚕️</div>
                <h3 className="text-lg font-semibold text-white">My Queue</h3>
                <p className="text-white/50 mt-1">Manage patient queue</p>
              </Link>
              <Link
                href="/display"
                className="glass-card hover:scale-105 transition-transform"
                style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}
              >
                <div className="text-4xl mb-3">📺</div>
                <h3 className="text-lg font-semibold text-white">Waiting Display</h3>
                <p className="text-white/50 mt-1">View current display</p>
              </Link>
            </>
          )}

          {user.role === 'receptionist' && (
            <>
              <Link
                href="/dashboard/receptionist"
                className="glass-card hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">🖥️</div>
                <h3 className="text-lg font-semibold text-white">All Queues</h3>
                <p className="text-white/50 mt-1">Manage all department queues</p>
              </Link>
              <Link
                href="/kiosk"
                className="glass-card hover:scale-105 transition-transform"
                style={{ borderColor: 'rgba(20, 184, 166, 0.3)' }}
              >
                <div className="text-4xl mb-3">📝</div>
                <h3 className="text-lg font-semibold text-white">Register Patient</h3>
                <p className="text-white/50 mt-1">Add new patient to queue</p>
              </Link>
            </>
          )}

          {user.role === 'admin' && (
            <>
              <Link
                href="/dashboard/admin"
                className="glass-card hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">⚙️</div>
                <h3 className="text-lg font-semibold text-white">Admin Panel</h3>
                <p className="text-white/50 mt-1">System overview</p>
              </Link>
              <Link
                href="/admin/users"
                className="glass-card hover:scale-105 transition-transform"
                style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}
              >
                <div className="text-4xl mb-3">👥</div>
                <h3 className="text-lg font-semibold text-white">User Management</h3>
                <p className="text-white/50 mt-1">Manage staff accounts</p>
              </Link>
              <Link
                href="/admin/settings"
                className="glass-card hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">🔧</div>
                <h3 className="text-lg font-semibold text-white">Settings</h3>
                <p className="text-white/50 mt-1">System configuration</p>
              </Link>
            </>
          )}

          {user.role === 'pharmacist' && (
            <>
              <Link
                href="/dashboard/pharmacist"
                className="glass-card hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">💊</div>
                <h3 className="text-lg font-semibold text-white">Dispense Center</h3>
                <p className="text-white/50 mt-1">Process prescriptions</p>
              </Link>
              <Link
                href="/dashboard/pharmacist/inventory"
                className="glass-card hover:scale-105 transition-transform"
                style={{ borderColor: 'rgba(20, 184, 166, 0.3)' }}
              >
                <div className="text-4xl mb-3">📦</div>
                <h3 className="text-lg font-semibold text-white">Inventory</h3>
                <p className="text-white/50 mt-1">Manage pharmacy stock</p>
              </Link>
            </>
          )}

          {user.role === 'lab_tech' && (
            <>
              <Link
                href="/dashboard/lab-tech"
                className="glass-card hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">🔬</div>
                <h3 className="text-lg font-semibold text-white">Lab Center</h3>
                <p className="text-white/50 mt-1">Process lab orders</p>
              </Link>
              <Link
                href="/dashboard/lab-tech/results"
                className="glass-card hover:scale-105 transition-transform"
                style={{ borderColor: 'rgba(20, 184, 166, 0.3)' }}
              >
                <div className="text-4xl mb-3">📊</div>
                <h3 className="text-lg font-semibold text-white">Results</h3>
                <p className="text-white/50 mt-1">View lab results</p>
              </Link>
            </>
          )}

          {user.role === 'facility' && (
            <>
              <Link
                href="/dashboard/facility"
                className="glass-card hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">🏢</div>
                <h3 className="text-lg font-semibold text-white">Facility Mgmt</h3>
                <p className="text-white/50 mt-1">Manage rooms & equipment</p>
              </Link>
              <Link
                href="/dashboard/facility/rooms"
                className="glass-card hover:scale-105 transition-transform"
                style={{ borderColor: 'rgba(20, 184, 166, 0.3)' }}
              >
                <div className="text-4xl mb-3">🚪</div>
                <h3 className="text-lg font-semibold text-white">Rooms</h3>
                <p className="text-white/50 mt-1">Room management</p>
              </Link>
            </>
          )}

          {user.role === 'it_support' && (
            <>
              <Link
                href="/dashboard/it-support"
                className="glass-card hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">🖥️</div>
                <h3 className="text-lg font-semibold text-white">IT Support</h3>
                <p className="text-white/50 mt-1">System monitoring</p>
              </Link>
              <Link
                href="/admin/backups"
                className="glass-card hover:scale-105 transition-transform"
                style={{ borderColor: 'rgba(20, 184, 166, 0.3)' }}
              >
                <div className="text-4xl mb-3">💾</div>
                <h3 className="text-lg font-semibold text-white">Backups</h3>
                <p className="text-white/50 mt-1">System backups</p>
              </Link>
            </>
          )}

          {user.role === 'super_admin' && (
            <>
              <Link
                href="/dashboard/super-admin"
                className="glass-card hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">🌐</div>
                <h3 className="text-lg font-semibold text-white">Super Admin</h3>
                <p className="text-white/50 mt-1">Multi-facility management</p>
              </Link>
              <Link
                href="/admin/facilities"
                className="glass-card hover:scale-105 transition-transform"
                style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}
              >
                <div className="text-4xl mb-3">🏥</div>
                <h3 className="text-lg font-semibold text-white">Facilities</h3>
                <p className="text-white/50 mt-1">Manage facilities</p>
              </Link>
            </>
          )}
        </div>

        {/* Quick Links */}
        <div className="glass-card">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/display"
              className="glass-button text-sm"
            >
              Waiting Room Display
            </Link>
            <Link
              href="/kiosk"
              className="glass-button text-sm"
            >
              Kiosk Mode
            </Link>
            {user.role !== 'patient' && (
              <Link
                href="/reception/search"
                className="glass-button text-sm"
              >
                Patient Search
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
