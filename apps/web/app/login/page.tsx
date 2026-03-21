'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type LoginType = 'staff' | 'patient' | 'doctor';

interface LoginState {
  email: string;
  identifier: string;
  password: string;
  pin: string;
  stationId: string;
  rememberMe: boolean;
  showPassword: boolean;
  showPin: boolean;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [loginType, setLoginType] = useState<LoginType>('staff');
  const [state, setState] = useState<LoginState>({
    email: '',
    identifier: '',
    password: '',
    pin: '',
    stationId: '',
    rememberMe: false,
    showPassword: false,
    showPin: false,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'patient' || type === 'staff' || type === 'doctor') {
      setLoginType(type);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('hospital_queue_remember');
      const savedIdentifier = localStorage.getItem('hospital_queue_remember_id');
      if (savedEmail) setState(prev => ({ ...prev, email: savedEmail, rememberMe: true }));
      if (savedIdentifier) setState(prev => ({ ...prev, identifier: savedIdentifier }));
    }
  }, []);

  const updateState = (updates: Partial<LoginState>) => {
    setState(prev => ({ ...prev, ...updates }));
    setError('');
    setFieldErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (loginType === 'doctor') {
      if (!state.email.trim()) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
        errors.email = 'Please enter a valid email';
      }
      if (!state.pin.trim()) {
        errors.pin = 'PIN is required';
      } else if (state.pin.length < 4 || state.pin.length > 6) {
        errors.pin = 'PIN must be 4-6 digits';
      } else if (!/^\d+$/.test(state.pin)) {
        errors.pin = 'PIN must contain only digits';
      }
    } else {
      if (!state.email.trim()) {
        errors.email = loginType === 'staff' ? 'Email is required' : 'Email or Patient ID is required';
      } else if (loginType === 'staff' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
        errors.email = 'Please enter a valid email address';
      }
      if (!state.password) {
        errors.password = 'Password is required';
      } else if (state.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      let response: Response;
      let data: { success: boolean; data?: { token: string; user: object }; error?: string; message?: string };

      if (loginType === 'staff') {
        response = await fetch('/api/auth/staff/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: state.email.trim().toLowerCase(), password: state.password }),
        });
      } else if (loginType === 'patient') {
        response = await fetch('/api/auth/patient/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: state.email.trim(), password: state.password }),
        });
      } else {
        response = await fetch('/api/auth/pin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: state.email.trim().toLowerCase(), pin: state.pin }),
        });
      }

      data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Login failed. Please check your credentials.');
      }

      if (data.success && data.data) {
        localStorage.setItem('hospital_queue_token', data.data.token);
        localStorage.setItem('hospital_queue_user', JSON.stringify(data.data.user));

        if (state.rememberMe) {
          if (loginType === 'staff' || loginType === 'doctor') {
            localStorage.setItem('hospital_queue_remember', state.email);
          } else {
            localStorage.setItem('hospital_queue_remember_id', state.email);
          }
        } else {
          localStorage.removeItem('hospital_queue_remember');
          localStorage.removeItem('hospital_queue_remember_id');
        }

        window.location.href = '/dashboard.html';
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabItems = [
    { id: 'staff' as LoginType, label: 'Staff', icon: '👨‍⚕️' },
    { id: 'patient' as LoginType, label: 'Patient', icon: '👤' },
    { id: 'doctor' as LoginType, label: 'Doctor', icon: '🔐' },
  ];

  const togglePasswordVisibility = () => {
    updateState({ showPassword: !state.showPassword });
  };

  const togglePinVisibility = () => {
    updateState({ showPin: !state.showPin });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-slide-up">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-teal-500/30 to-teal-600/20 border border-teal-500/40 backdrop-blur-md hover:scale-105 transition-transform duration-300"
            aria-label="Limuru Cottage Hospital Home"
          >
            <span className="text-4xl" aria-hidden="true">🏥</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Limuru Cottage Hospital</h1>
          <p className="text-slate-400">Queuing Management System</p>
        </div>

        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }} role="main">
          <div className="flex mb-6 bg-slate-800/60 rounded-xl p-1.5 gap-1" role="tablist" aria-label="Login type">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={loginType === tab.id}
                aria-controls={`${tab.id}-panel`}
                onClick={() => {
                  setLoginType(tab.id);
                  setError('');
                  setFieldErrors({});
                }}
                className={`
                  flex-1 py-2.5 px-3 rounded-lg text-sm font-medium 
                  transition-all duration-200 flex items-center justify-center gap-1.5
                  focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2 focus:ring-offset-slate-900
                  ${loginType === tab.id 
                    ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/25' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <span aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div 
            id={`${loginType}-panel`} 
            role="tabpanel" 
            aria-labelledby={loginType}
          >
            {error && (
              <div 
                className="mb-4 p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-red-400 text-sm flex items-center gap-3 animate-slide-up" 
                role="alert"
                aria-live="assertive"
              >
                <svg className="w-5 h-5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {loginType === 'doctor' ? (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="doctor-email" className="text-slate-300 text-sm font-medium mb-2 block">
                      Doctor Email <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="16" x="2" y="4" rx="2"/>
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                        </svg>
                      </span>
                      <input
                        type="email"
                        id="doctor-email"
                        value={state.email}
                        onChange={(e) => updateState({ email: e.target.value })}
                        className={`glass-input pl-12 ${fieldErrors.email ? 'border-red-500/50 bg-red-500/5' : ''}`}
                        placeholder="doctor@limuruhospital.co.ke"
                        required
                        autoComplete="email"
                        aria-describedby={fieldErrors.email ? 'doctor-email-error' : undefined}
                        aria-invalid={!!fieldErrors.email}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p id="doctor-email-error" className="mt-1.5 text-xs text-red-400" role="alert">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="doctor-pin" className="text-slate-300 text-sm font-medium mb-2 block">
                      PIN Code <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </span>
                      <input
                        type={state.showPin ? 'text' : 'password'}
                        id="doctor-pin"
                        value={state.pin}
                        onChange={(e) => updateState({ pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                        className={`glass-input pl-12 pr-12 text-center text-2xl tracking-[0.3em] ${fieldErrors.pin ? 'border-red-500/50 bg-red-500/5' : ''}`}
                        placeholder="••••"
                        maxLength={6}
                        required
                        autoComplete="off"
                        aria-describedby={fieldErrors.pin ? 'doctor-pin-error' : 'pin-hint'}
                        aria-invalid={!!fieldErrors.pin}
                      />
                      <button
                        type="button"
                        onClick={togglePinVisibility}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50 rounded"
                        aria-label={state.showPin ? 'Hide PIN' : 'Show PIN'}
                      >
                        {state.showPin ? (
                          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    {fieldErrors.pin ? (
                      <p id="doctor-pin-error" className="mt-1.5 text-xs text-red-400" role="alert">
                        {fieldErrors.pin}
                      </p>
                    ) : (
                      <p id="pin-hint" className="mt-1.5 text-xs text-slate-500">Enter your 4-6 digit doctor PIN</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="station-id" className="text-slate-300 text-sm font-medium mb-2 block">
                      Station ID <span className="text-slate-500">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="station-id"
                      value={state.stationId}
                      onChange={(e) => updateState({ stationId: e.target.value })}
                      className="glass-input"
                      placeholder="e.g., STATION-01"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="login-email" className="text-slate-300 text-sm font-medium mb-2 block">
                      {loginType === 'staff' ? 'Email Address' : 'Patient ID / Phone Number'} <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="16" x="2" y="4" rx="2"/>
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                        </svg>
                      </span>
                      <input
                        type={loginType === 'staff' ? 'email' : 'text'}
                        id="login-email"
                        value={state.email}
                        onChange={(e) => updateState({ email: e.target.value })}
                        className={`glass-input pl-12 ${fieldErrors.email ? 'border-red-500/50 bg-red-500/5' : ''}`}
                        placeholder={loginType === 'staff' ? 'staff@limuruhospital.co.ke' : 'PT-12345 or 0712345678'}
                        required
                        autoComplete={loginType === 'staff' ? 'email' : 'username'}
                        aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                        aria-invalid={!!fieldErrors.email}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p id="login-email-error" className="mt-1.5 text-xs text-red-400" role="alert">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="login-password" className="text-slate-300 text-sm font-medium mb-2 block">
                      Password <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </span>
                      <input
                        type={state.showPassword ? 'text' : 'password'}
                        id="login-password"
                        value={state.password}
                        onChange={(e) => updateState({ password: e.target.value })}
                        className={`glass-input pl-12 pr-12 ${fieldErrors.password ? 'border-red-500/50 bg-red-500/5' : ''}`}
                        placeholder="Enter your password"
                        required
                        autoComplete={loginType === 'staff' ? 'current-password' : 'current-password'}
                        aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                        aria-invalid={!!fieldErrors.password}
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50 rounded"
                        aria-label={state.showPassword ? 'Hide password' : 'Show password'}
                      >
                        {state.showPassword ? (
                          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p id="login-password-error" className="mt-1.5 text-xs text-red-400" role="alert">
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={state.rememberMe}
                    onChange={(e) => updateState({ rememberMe: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer transition-colors"
                  />
                  <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Remember me</span>
                </label>
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-teal-400 hover:text-teal-300 transition-colors focus:outline-none focus:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/30 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/>
                      <path d="m12 5 7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            {loginType === 'patient' && (
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-400">
                  New patient?{' '}
                  <Link href="/register" className="text-teal-400 hover:text-teal-300 font-medium transition-colors focus:outline-none focus:underline">
                    Register here
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors focus:outline-none focus:underline">
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/>
              <path d="m12 19-7-7 7-7"/>
            </svg>
            <span>Back to Home</span>
          </Link>
        </div>

        <div className="mt-4 p-4 glass-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <p className="text-xs text-slate-500 text-center mb-3 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
            Demo Credentials
          </p>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2.5">
              <span className="text-teal-400 font-medium">Staff</span>
              <code className="text-slate-300">admin@limuruhospital.co.ke / password123</code>
            </div>
            <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2.5">
              <span className="text-teal-400 font-medium">Doctor</span>
              <code className="text-slate-300">dr.smith@limuruhospital.co.ke / 1234</code>
            </div>
            <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2.5">
              <span className="text-teal-400 font-medium">Patient</span>
              <code className="text-slate-300">PT-00001 / patient123</code>
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
        <div className="flex flex-col items-center gap-4">
          <svg className="w-10 h-10 animate-spin text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
