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

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="text-center pt-12 md:pt-20 pb-6 md:pb-10 relative z-10">
        <div className="inline-flex items-center justify-center w-24 h-24 md:w-28 md:h-28 mb-6 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/30 backdrop-blur-md shadow-2xl shadow-teal-500/20 animate-slide-up hover:scale-105 transition-transform">
          <span className="text-5xl md:text-6xl">🏥</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          Limuru Cottage
        </h1>
        <p className="text-xl md:text-2xl text-slate-400 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          Digital Queuing System
        </p>
        <p className="text-sm text-slate-500 mt-2 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          Limuru, Kenya
        </p>
      </div>

      {/* Main Actions */}
      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-4xl">
          {/* Hero Buttons */}
          <div className="grid md:grid-cols-2 gap-6 mb-12 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Link
              href="/kiosk"
              className="glass-card text-center py-10 px-6 group hover:scale-[1.03] transition-all duration-300 border-teal-500/30"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 mb-4 group-hover:scale-110 transition-transform">
                <span className="text-5xl">🎫</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-teal-400 transition-colors">Get Queue Ticket</h2>
              <p className="text-slate-400">Get a digital ticket for your appointment</p>
              <div className="mt-4 text-sm text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Click to start →
              </div>
            </Link>
            <Link
              href="/display"
              className="glass-card text-center py-10 px-6 group hover:scale-[1.03] transition-all duration-300 border-blue-500/30"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 mb-4 group-hover:scale-110 transition-transform">
                <span className="text-5xl">📺</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">View Display</h2>
              <p className="text-slate-400">See current queue status on TV display</p>
              <div className="mt-4 text-sm text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                View queue →
              </div>
            </Link>
          </div>

          {/* Login Options */}
          <div className="grid md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            {/* Patient Portal */}
            <Link
              href="/login?type=patient"
              className="glass-card text-center py-6 px-4 group hover:scale-[1.03] transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/30 to-teal-600/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <span className="text-3xl">👤</span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-teal-400 transition-colors">Patient Portal</h2>
              <p className="text-slate-500 text-sm">View queue position & history</p>
            </Link>

            {/* Staff Portal */}
            <Link
              href="/login?type=staff"
              className="glass-card text-center py-6 px-4 group hover:scale-[1.03] transition-all duration-300 border-blue-500/20"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/30 to-blue-600/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <span className="text-3xl">👨‍⚕️</span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">Staff Portal</h2>
              <p className="text-slate-500 text-sm">Doctors, nurses & receptionists</p>
            </Link>

            {/* Admin Portal */}
            <Link
              href="/login?type=staff"
              className="glass-card text-center py-6 px-4 group hover:scale-[1.03] transition-all duration-300 border-purple-500/20"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/30 to-purple-600/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <span className="text-3xl">⚙️</span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">Admin Panel</h2>
              <p className="text-slate-500 text-sm">System configuration & analytics</p>
            </Link>
          </div>

          {/* Departments */}
          <div className="mt-16 animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <h2 className="text-2xl font-semibold text-white text-center mb-6">Our Departments</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {[
                { code: 'MED', name: 'General Medicine', color: '#10b981', icon: '🩺' },
                { code: 'PED', name: 'Pediatrics', color: '#3b82f6', icon: '👶' },
                { code: 'GYN', name: 'Gynecology', color: '#ec4899', icon: '🌸' },
                { code: 'ORTHO', name: 'Orthopedics', color: '#8b5cf6', icon: '🦴' },
                { code: 'CARD', name: 'Cardiology', color: '#ef4444', icon: '❤️' },
                { code: 'EMER', name: 'Emergency', color: '#f59e0b', icon: '🚨' },
              ].map((dept, index) => (
                <div 
                  key={dept.code} 
                  className="glass-card text-center py-5 px-2 hover:scale-105 transition-all duration-300 cursor-pointer"
                  style={{ 
                    borderColor: `${dept.color}30`,
                    animationDelay: `${index * 0.05}s`,
                  } as React.CSSProperties}
                >
                  <span className="text-3xl mb-2 block">{dept.icon}</span>
                  <span className="text-sm font-medium text-white">{dept.code}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info Cards */}
          <div className="mt-12 grid md:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <div className="glass-card p-5 border-l-4 border-l-teal-500">
              <div className="flex items-start gap-4">
                <span className="text-3xl">⏱️</span>
                <div>
                  <h3 className="font-semibold text-white mb-1">Save Time</h3>
                  <p className="text-sm text-slate-400">Get your queue ticket digitally and track your position in real-time from your phone.</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-5 border-l-4 border-l-blue-500">
              <div className="flex items-start gap-4">
                <span className="text-3xl">📱</span>
                <div>
                  <h3 className="font-semibold text-white mb-1">Stay Updated</h3>
                  <p className="text-sm text-slate-400">Receive notifications when it's almost your turn so you can wait more comfortably.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-slate-500 text-sm relative z-10">
        <p>© 2026 Limuru Cottage Hospital. All rights reserved.</p>
        <p className="mt-1 text-xs text-slate-600">Digital Queuing System v2.0</p>
      </footer>
    </main>
  );
}
