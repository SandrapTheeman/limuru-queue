'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await api.register({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        password: formData.password,
      });
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
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
          <p className="text-white/60 mt-2">Create Your Patient Account</p>
        </div>

        {/* Registration Form */}
        <div className="glass-card">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/70 text-sm mb-2 block">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="glass-input"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="text-white/70 text-sm mb-2 block">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="glass-input"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="text-white/70 text-sm mb-2 block">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="glass-input"
                placeholder="+254..."
              />
            </div>

            <div>
              <label className="text-white/70 text-sm mb-2 block">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="glass-input"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="text-white/70 text-sm mb-2 block">
                Confirm Password *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="glass-input"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="glass-button-primary w-full mt-6 py-3"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-white/60">
              Already have an account?{' '}
              <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium">
                Login here
              </Link>
            </p>
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
