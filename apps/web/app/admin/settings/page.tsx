'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import { api } from '../../../lib/api';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [settings, setSettings] = useState< Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchSettings();
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className="text-white/60 hover:text-white">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-white">System Settings</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/70">Welcome, {user?.name}</span>
            <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-8 text-white/50">Loading settings...</div>
        ) : (
          <div className="glass-card p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Clinic Information</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-white/70 text-sm mb-2 block">
                    Clinic Name
                  </label>
                  <input
                    type="text"
                    value={settings.clinic_name || ''}
                    onChange={(e) => setSettings({ ...settings, clinic_name: e.target.value })}
                    className="glass-input w-full"
                  />
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">
                    Clinic Address
                  </label>
                  <input
                    type="text"
                    value={settings.clinic_address || ''}
                    onChange={(e) => setSettings({ ...settings, clinic_address: e.target.value })}
                    className="glass-input w-full"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Queue Settings</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-white/70 text-sm mb-2 block">
                    Wait Time per Patient (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.wait_time_per_patient || '15'}
                    onChange={(e) => setSettings({ ...settings, wait_time_per_patient: e.target.value })}
                    className="glass-input w-full"
                  />
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">
                    Departments (comma-separated codes)
                  </label>
                  <input
                    type="text"
                    value={settings.departments || 'MED,PED,GYN,OPH,DEN,ORTH'}
                    onChange={(e) => setSettings({ ...settings, departments: e.target.value })}
                    className="glass-input w-full"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Default Password</h2>
              <div>
                <label className="text-white/70 text-sm mb-2 block">
                  Default Patient Password
                </label>
                <input
                  type="text"
                  value={settings.default_password || ''}
                  onChange={(e) => setSettings({ ...settings, default_password: e.target.value })}
                  className="glass-input w-full"
                  placeholder="#Limuru_Cottage_Hospital@2026"
                />
                <p className="text-sm text-white/40 mt-1">
                  This password will be used for new patient registrations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-white/10">
              <button
                onClick={handleSave}
                disabled={saving}
                className="glass-button-primary px-6 py-2"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              {saved && (
                <span className="text-green-400 font-medium">Settings saved successfully!</span>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
