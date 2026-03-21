'use client';

import Link from 'next/link';

const features = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    title: 'Real-time Queue Management',
    description: 'Live tracking of patient flow with instant position updates and automated queue optimization.',
    color: 'teal',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: 'SMS/WhatsApp Notifications',
    description: 'Keep patients informed with automated notifications when their turn approaches.',
    color: 'green',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'TV Display Integration',
    description: 'Beautiful waiting room displays showing queue status and estimated wait times.',
    color: 'blue',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: 'Doctor Dashboard',
    description: 'Comprehensive dashboard for healthcare providers to manage appointments and patient records.',
    color: 'purple',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Patient Mobile Check-in',
    description: 'Allow patients to check in remotely and track their queue position from their phone.',
    color: 'orange',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Analytics & Reporting',
    description: 'Detailed insights and reports on patient flow, wait times, and departmental performance.',
    color: 'cyan',
  },
];

const departments = [
  { code: 'MED', name: 'General Medicine', icon: '🩺', color: '#10b981' },
  { code: 'PED', name: 'Pediatrics', icon: '👶', color: '#3b82f6' },
  { code: 'GYN', name: 'Gynecology', icon: '🌸', color: '#ec4899' },
  { code: 'ORTHO', name: 'Orthopedics', icon: '🦴', color: '#8b5cf6' },
  { code: 'CARD', name: 'Cardiology', icon: '❤️', color: '#ef4444' },
  { code: 'EMER', name: 'Emergency', icon: '🚨', color: '#f59e0b' },
  { code: 'DENTAL', name: 'Dental', icon: '🦷', color: '#06b6d4' },
  { code: 'EYE', name: 'Ophthalmology', icon: '👁️', color: '#84cc16' },
];

const colorClasses: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  teal: { bg: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30', text: 'text-teal-400', glow: 'shadow-teal-500/20' },
  green: { bg: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30', text: 'text-green-400', glow: 'shadow-green-500/20' },
  blue: { bg: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
  purple: { bg: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
  orange: { bg: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
  cyan: { bg: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
};

export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute top-20 right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-40 left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/30 to-teal-600/20 border border-teal-500/30 flex items-center justify-center shadow-lg shadow-teal-500/10">
              <span className="text-xl">🏥</span>
            </div>
            <div>
              <div className="font-semibold text-sm text-white">Limuru Cottage Hospital</div>
              <div className="text-xs text-slate-400">Queue Management System</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn btn-ghost btn-sm hidden sm:flex">
              Staff Login
            </Link>
            <Link href="/kiosk" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Animated Hospital Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 mb-8 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <span className="text-sm text-teal-400 font-medium">Live Queue Status</span>
            </div>

            {/* Hospital Icon with Animation */}
            <div className="relative inline-block mb-8">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/30 flex items-center justify-center shadow-2xl shadow-teal-500/20 animate-bounce-in">
                <span className="text-6xl md:text-7xl">🏥</span>
              </div>
              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center animate-pulse">
                <span className="text-xl">✨</span>
              </div>
            </div>

            {/* Hero Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 animate-slide-up">
              <span className="bg-gradient-to-r from-white via-teal-100 to-teal-300 bg-clip-text text-transparent">
                Limuru Cottage Hospital
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 mb-3 animate-slide-up font-medium" style={{ animationDelay: '0.1s' }}>
              Digital Queue Management System
            </p>
            
            <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Experience seamless healthcare with real-time queue management, automated notifications, 
              and modern patient check-in solutions designed for efficiency and comfort.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Link href="/kiosk" className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold shadow-xl shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-105 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Patient Check-In
                <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              
              <Link href="/login" className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 hover:border-teal-500/30 hover:scale-105 transition-all duration-300 backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Staff Login
              </Link>
              
              <Link href="/display" className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 hover:border-blue-500/30 hover:scale-105 transition-all duration-300 backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                View Queue Display
              </Link>
            </div>

            {/* Stats Preview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="glass-card p-4 text-center hover:border-teal-500/30 transition-colors">
                <div className="text-2xl md:text-3xl font-bold text-teal-400">24</div>
                <div className="text-xs md:text-sm text-slate-400">Patients Waiting</div>
              </div>
              <div className="glass-card p-4 text-center hover:border-green-500/30 transition-colors">
                <div className="text-2xl md:text-3xl font-bold text-green-400">156</div>
                <div className="text-xs md:text-sm text-slate-400">Served Today</div>
              </div>
              <div className="glass-card p-4 text-center hover:border-yellow-500/30 transition-colors">
                <div className="text-2xl md:text-3xl font-bold text-yellow-400">12</div>
                <div className="text-xs md:text-sm text-slate-400">Avg Wait (min)</div>
              </div>
              <div className="glass-card p-4 text-center hover:border-red-500/30 transition-colors">
                <div className="text-2xl md:text-3xl font-bold text-red-400">3</div>
                <div className="text-xs md:text-sm text-slate-400">Urgent Cases</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-medium mb-4">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need for Efficient Healthcare
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Our comprehensive queue management system streamlines patient flow, enhances communication, 
              and improves the overall healthcare experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const colors = colorClasses[feature.color];
              return (
                <div
                  key={feature.title}
                  className="group glass-card p-6 hover:scale-[1.02] transition-all duration-300 animate-slide-up"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.bg} border ${colors.border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${colors.text}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-teal-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Departments Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
              Departments
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Our Medical Departments
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Quality healthcare services across multiple specialties to meet all your medical needs.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {departments.map((dept, index) => (
              <div
                key={dept.code}
                className="group glass-card p-5 text-center hover:scale-105 transition-all duration-300 cursor-pointer animate-slide-up"
                style={{ 
                  animationDelay: `${0.05 * index}s`,
                  borderColor: `${dept.color}30`,
                }}
              >
                <span className="text-4xl mb-3 block group-hover:scale-110 transition-transform">{dept.icon}</span>
                <span className="text-sm font-semibold text-white">{dept.code}</span>
                <span className="block text-xs text-slate-400 mt-1">{dept.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-4">
              How It Works
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Simple & Efficient Process
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center animate-slide-up">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/30 flex items-center justify-center mx-auto mb-4 text-3xl">
                1️⃣
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Check In</h3>
              <p className="text-slate-400 text-sm">
                Patients check in at the kiosk or via mobile app and receive a digital ticket.
              </p>
            </div>
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-4 text-3xl">
                2️⃣
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Wait Comfortably</h3>
              <p className="text-slate-400 text-sm">
                Monitor your queue position on TV displays or receive SMS/WhatsApp updates.
              </p>
            </div>
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4 text-3xl">
                3️⃣
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Get Called</h3>
              <p className="text-slate-400 text-sm">
                When your turn arrives, you'll be notified instantly to proceed to your consultation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="glass-card p-8 md:p-12 max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="inline-block px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-medium mb-4">
                  Contact Us
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Get In Touch
                </h2>
                <p className="text-slate-400 mb-6">
                  Have questions about our queue management system? We're here to help improve your healthcare experience.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Location</div>
                      <div className="text-white">Limuru, Kiambu County, Kenya</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Phone</div>
                      <div className="text-white">+254 700 123 456</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Email</div>
                      <div className="text-white">info@limuruhospital.co.ke</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="w-full h-64 rounded-2xl bg-gradient-to-br from-teal-500/20 to-blue-500/20 border border-teal-500/20 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-6xl mb-4 block">🏥</span>
                    <div className="text-teal-400 font-semibold">Limuru Cottage Hospital</div>
                    <div className="text-slate-400 text-sm">Serving the Community Since 2010</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/30 to-teal-600/20 border border-teal-500/30 flex items-center justify-center">
                  <span className="text-xl">🏥</span>
                </div>
                <div>
                  <div className="font-semibold text-white">Limuru Cottage Hospital</div>
                  <div className="text-xs text-slate-400">Queue Management System</div>
                </div>
              </div>
              <p className="text-slate-400 text-sm">
                Providing quality healthcare with modern queue management solutions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/kiosk" className="hover:text-teal-400 transition-colors">Patient Check-In</Link></li>
                <li><Link href="/display" className="hover:text-teal-400 transition-colors">Queue Display</Link></li>
                <li><Link href="/login" className="hover:text-teal-400 transition-colors">Staff Portal</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/dashboard" className="hover:text-teal-400 transition-colors">Dashboard</Link></li>
                <li><Link href="#" className="hover:text-teal-400 transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-teal-400 transition-colors">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="#" className="hover:text-teal-400 transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-teal-400 transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-teal-400 transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © 2026 Limuru Cottage Hospital. All rights reserved.
            </p>
            <p className="text-slate-500 text-sm">
              Digital Queue Management System v2.0
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
