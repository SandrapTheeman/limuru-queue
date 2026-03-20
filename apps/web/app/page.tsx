'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../lib/store';

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Redirect to role-based dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const targetDashboard = getDashboardUrl(user.role);
      router.replace(targetDashboard);
    }
  }, [isAuthenticated, user, router]);

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
      default:
        return '/dashboard/patient';
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="text-center pt-12 md:pt-16 pb-6 md:pb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 mb-4 glass-card">
          <span className="text-4xl md:text-5xl">🏥</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Limuru Cottage</h1>
        <p className="text-lg md:text-xl text-white/60">Digital Queuing System</p>
      </div>

      {/* Main Actions */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-4xl">
          {/* Hero Buttons */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Link
              href="/kiosk"
              className="glass-card text-center py-8 hover:scale-105 transition-transform"
            >
              <div className="text-5xl mb-4">🎫</div>
              <h2 className="text-2xl font-bold text-white mb-2">Get Queue Ticket</h2>
              <p className="text-white/60">Get a digital ticket for your appointment</p>
            </Link>
            <Link
              href="/display"
              className="glass-card text-center py-8 hover:scale-105 transition-transform"
            >
              <div className="text-5xl mb-4">📺</div>
              <h2 className="text-2xl font-bold text-white mb-2">View Display</h2>
              <p className="text-white/60">See current queue status on TV display</p>
            </Link>
          </div>

          {/* Login Options */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Patient Portal */}
            <Link
              href="/login?type=patient"
              className="glass-card text-center py-6 hover:scale-105 transition-transform"
            >
              <div className="w-16 h-16 rounded-full bg-primary-500/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🏥</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Patient Portal</h2>
              <p className="text-white/50 text-sm">View queue position & history</p>
            </Link>

            {/* Staff Portal */}
            <Link
              href="/login?type=staff"
              className="glass-card text-center py-6 hover:scale-105 transition-transform"
            >
              <div className="w-16 h-16 rounded-full bg-blue-500/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👨‍⚕️</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Staff Portal</h2>
              <p className="text-white/50 text-sm">Doctors, nurses & receptionists</p>
            </Link>

            {/* Admin Portal */}
            <Link
              href="/login?type=staff"
              className="glass-card text-center py-6 hover:scale-105 transition-transform"
            >
              <div className="w-16 h-16 rounded-full bg-purple-500/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚙️</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Admin Panel</h2>
              <p className="text-white/50 text-sm">System configuration & analytics</p>
            </Link>
          </div>

          {/* Departments */}
          <div className="mt-12">
            <h2 className="text-2xl font-semibold text-white text-center mb-6">Our Departments</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {[
                { code: 'MED', name: 'General Medicine', color: '#3b82f6', icon: '🩺' },
                { code: 'PED', name: 'Pediatrics', color: '#10b981', icon: '👶' },
                { code: 'GYN', name: 'Gynecology', color: '#ec4899', icon: '🌸' },
                { code: 'ORTHO', name: 'Orthopedics', color: '#8b5cf6', icon: '🦴' },
                { code: 'CARD', name: 'Cardiology', color: '#ef4444', icon: '❤️' },
                { code: 'EMER', name: 'Emergency', color: '#f59e0b', icon: '🚨' },
              ].map((dept) => (
                <div 
                  key={dept.code} 
                  className="glass-card text-center py-4"
                  style={{ borderColor: `${dept.color}50` }}
                >
                  <span className="text-2xl mb-2 block">{dept.icon}</span>
                  <span className="text-sm font-medium text-white">{dept.code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-white/30 text-sm">
        <p>© 2026 Limuru Cottage. All rights reserved.</p>
      </footer>
    </main>
  );
}
