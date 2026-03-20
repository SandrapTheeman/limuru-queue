'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../lib/store';
import Link from 'next/link';

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
  // Track user after successful login for redirect
  const [loggedInUser, setLoggedInUser] = useState<typeof authUser>(null);

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
      default:
        return '/dashboard';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (loginType === 'pin') {
        await loginWithPin(pin, stationId || undefined);
      } else {
        await login(email, password, loginType);
      }
      // Get the updated user from store and redirect
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        const dashboardUrl = getDashboardUrl(currentUser.role);
        router.push(dashboardUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-20 h-20 mb-4 glass-card">
            <span className="text-4xl">🏥</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Limuru Cottage</h1>
          <p className="text-white/60 mt-2">Queuing System Login</p>
        </div>

        {/* Login Form */}
        <div className="glass-card">
          {/* Login Type Tabs */}
          <div className="flex mb-6 bg-white/5 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setLoginType('patient')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                loginType === 'patient' 
                  ? 'bg-primary-500 text-white' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Patient
            </button>
            <button
              type="button"
              onClick={() => setLoginType('staff')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                loginType === 'staff' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Staff
            </button>
            <button
              type="button"
              onClick={() => setLoginType('pin')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                loginType === 'pin' 
                  ? 'bg-purple-500 text-white' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Doctor PIN
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {loginType === 'pin' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-white/70 text-sm mb-2 block">
                    PIN Code
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="glass-input"
                    placeholder="Enter your PIN"
                    required
                  />
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">
                    Station ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={stationId}
                    onChange={(e) => setStationId(e.target.value)}
                    className="glass-input"
                    placeholder="Station identifier"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-white/70 text-sm mb-2 block">
                    {loginType === 'patient' ? 'Email or Patient ID' : 'Email'}
                  </label>
                  <input
                    type={loginType === 'patient' ? 'text' : 'email'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input"
                    placeholder={loginType === 'patient' ? 'email@example.com or patient ID' : 'staff@hospital.co.ke'}
                    required
                  />
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="glass-button-primary w-full mt-6 py-3"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {loginType === 'patient' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-white/60">
                Don't have an account?{' '}
                <Link href="/register" className="text-primary-400 hover:text-primary-300 font-medium">
                  Register here
                </Link>
              </p>
            </div>
          )}

          <div className="mt-4 text-center">
            <Link href="/reset-password" className="text-sm text-white/40 hover:text-white/60">
              Forgot Password?
            </Link>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-white/40 hover:text-white/60">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <LoginForm />
    </Suspense>
  );
}
