'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../lib/store';
import Link from 'next/link';
import { Button } from '@/lib/components/Button';
import { Spinner } from '@/lib/components/Spinner';
import { useToastStore, toast } from '@/lib/components/Toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser, login, loginWithPin, isLoading, isAuthenticated } = useAuthStore();
  const [loginType, setLoginType] = useState<'patient' | 'staff' | 'pin'>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [stationId, setStationId] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToastStore();

  // Handle URL query parameter for login type
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'patient') {
      setLoginType('patient');
    } else if (type === 'staff') {
      setLoginType('staff');
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && authUser) {
      const dashboardUrl = getDashboardUrl(authUser.role);
      router.replace(dashboardUrl);
    }
  }, [isAuthenticated, authUser, router]);

  // Get dashboard URL based on role
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
        return '/dashboard';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (loginType === 'pin') {
        await loginWithPin(pin, stationId || undefined);
        addToast({ type: 'success', message: 'Successfully logged in with PIN!' });
      } else {
        await login(email, password, loginType);
        addToast({ type: 'success', message: `Welcome back! Logged in as ${loginType}.` });
      }
      // Get the updated user from store and redirect
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        const dashboardUrl = getDashboardUrl(currentUser.role);
        router.push(dashboardUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      toast.error('Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabItems = [
    { id: 'patient', label: 'Patient', icon: '👤' },
    { id: 'staff', label: 'Staff', icon: '👨‍⚕️' },
    { id: 'pin', label: 'Doctor PIN', icon: '🔐' },
  ] as const;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-600/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <Link href="/" className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/30 backdrop-blur-md hover:scale-105 transition-transform">
            <span className="text-4xl">🏥</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Limuru Cottage</h1>
          <p className="text-slate-400">Hospital Queuing System</p>
        </div>

        {/* Login Form Card */}
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {/* Login Type Tabs */}
          <div className="flex mb-6 bg-slate-800/50 rounded-xl p-1.5 gap-1">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setLoginType(tab.id)}
                className={`
                  flex-1 py-2.5 px-3 rounded-lg text-sm font-medium 
                  transition-all duration-200 flex items-center justify-center gap-1.5
                  ${loginType === tab.id 
                    ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/25' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2 animate-slide-up">
              <span className="text-lg">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {loginType === 'pin' ? (
              <div className="space-y-5">
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    PIN Code
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="glass-input w-full text-center text-2xl tracking-[0.5em] py-4"
                      placeholder="• • • •"
                      maxLength={6}
                      required
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-slate-500 text-xs mt-2 text-center">
                    Enter your 4-6 digit doctor PIN
                  </p>
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    Station ID <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={stationId}
                    onChange={(e) => setStationId(e.target.value)}
                    className="glass-input"
                    placeholder="e.g., STATION-01"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    {loginType === 'patient' ? 'Email or Patient ID' : 'Staff Email'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">📧</span>
                    <input
                      type={loginType === 'patient' ? 'text' : 'email'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-input pl-12"
                      placeholder={loginType === 'patient' ? 'email@example.com or PT-12345' : 'staff@limuruhospital.co.ke'}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="glass-input pl-12 pr-12"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm text-slate-400">Remember me</span>
              </label>
              <Link 
                href="/reset-password" 
                className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              isLoading={isSubmitting || isLoading}
              className="w-full py-4 text-lg"
              leftIcon={<span>→</span>}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {loginType === 'patient' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                New patient?{' '}
                <Link href="/register" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
                  Register here
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <span>←</span>
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Demo Credentials */}
        <div className="mt-4 p-4 glass-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <p className="text-xs text-slate-500 text-center mb-2">Demo Credentials</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div className="bg-slate-800/50 rounded-lg p-2">
              <span className="block text-teal-400">Admin:</span>
              <span className="font-mono">admin@limuruhospital.co.ke</span>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2">
              <span className="block text-teal-400">Doctor PIN:</span>
              <span className="font-mono">1234</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Spinner size="xl" label="Loading..." />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
