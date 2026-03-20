'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState<'request' | 'confirm' | 'success'>(token ? 'confirm' : 'request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Request form state
  const [identifier, setIdentifier] = useState('');
  
  // Confirm form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (token) {
      setStep('confirm');
    }
  }, [token]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await api.requestPasswordReset(identifier);
      setMessage(result.message || 'If an account exists, a reset link will be sent to your email.');
      
      // In development, show the token for testing
      if ('debugToken' in result && result.debugToken) {
        console.log('Password reset token:', result.debugToken);
        setMessage(`${result.message} (Dev token: ${result.debugToken})`);
      }
      
      // Show success state briefly then redirect
      setTimeout(() => {
        router.push('/login?reset requested=true');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await api.confirmPasswordReset(token!, newPassword);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The token may be expired.');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card text-center">
            <div className="w-16 h-16 bg-green-500/30 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Password Reset Successful</h1>
            <p className="text-white/60 mb-6">Your password has been reset. You can now login with your new password.</p>
            <Link
              href="/login"
              className="inline-block glass-button-primary px-6 py-3"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Confirm password reset form
  if (step === 'confirm') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center justify-center w-20 h-20 mb-4 glass-card">
              <span className="text-4xl">🏥</span>
            </Link>
            <h1 className="text-2xl font-bold text-white">Reset Your Password</h1>
            <p className="text-white/60 mt-2">Enter your new password</p>
          </div>

          {/* Form */}
          <div className="glass-card">
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleConfirmSubmit} className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">
                  New Password *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="glass-input"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="text-white/70 text-sm mb-2 block">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="glass-input"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="glass-button-primary w-full mt-6 py-3"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          </div>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-white/40 hover:text-white/60">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Request password reset form
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-20 h-20 mb-4 glass-card">
            <span className="text-4xl">🏥</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
          <p className="text-white/60 mt-2">Enter your email or patient ID to reset your password</p>
        </div>

        {/* Form */}
        <div className="glass-card">
          {message && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="text-white/70 text-sm mb-2 block">
                Email or Patient ID *
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="glass-input"
                placeholder="your.email@example.com or patient ID"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="glass-button-primary w-full mt-6 py-3"
            >
              {loading ? 'Sending Request...' : 'Send Reset Link'}
            </button>
          </form>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-white/40 hover:text-white/60">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/10 rounded w-48 mx-auto"></div>
            <div className="h-64 bg-white/10 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
