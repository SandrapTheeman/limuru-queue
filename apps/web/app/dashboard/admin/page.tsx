'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import { api } from '../../../lib/api';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  // Department management state
  const [departments, setDepartments] = useState<any[]>([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [deptForm, setDeptForm] = useState({ code: '', name: '', description: '', color: '#6366f1', icon: '🏥' });
  const [savingDept, setSavingDept] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const fetchData = async () => {
    try {
      const [statsData, settingsData, deptsData] = await Promise.all([
        api.getStats(),
        api.getSettings(),
        api.getAdminDepartments(),
      ]);
      setStats(statsData);
      setSettings(settingsData);
      setDepartments(deptsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Department management functions
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDept(true);
    try {
      if (editingDept) {
        await api.updateDepartment(editingDept.id, deptForm);
      } else {
        await api.createDepartment(deptForm);
      }
      await fetchData();
      setShowDeptModal(false);
      setEditingDept(null);
      setDeptForm({ code: '', name: '', description: '', color: '#6366f1', icon: '🏥' });
    } catch (error) {
      console.error('Failed to save department:', error);
      alert('Failed to save department');
    } finally {
      setSavingDept(false);
    }
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.deleteDepartment(id);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete department:', error);
      alert('Failed to delete department');
    }
  };

  const openEditModal = (dept: any) => {
    setEditingDept(dept);
    setDeptForm({
      code: dept.code,
      name: dept.name,
      description: dept.description || '',
      color: dept.color || '#6366f1',
      icon: dept.icon || '🏥',
    });
    setShowDeptModal(true);
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/" className="text-xl md:text-2xl">🏥</Link>
            <h1 className="text-lg md:text-xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <span className="text-sm text-white/70 hidden sm:inline">
              Welcome, {user?.name}
              <span className="ml-2 px-2 py-1 bg-purple-500/20 rounded text-xs capitalize text-purple-300">
                {user?.role}
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
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="glass-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/60 text-sm">Today's Visits</div>
                <div className="text-3xl font-bold text-blue-400">
                  {loading ? '...' : stats?.todayVisits || 0}
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/60 text-sm">Currently Waiting</div>
                <div className="text-3xl font-bold text-yellow-400">
                  {loading ? '...' : stats?.waiting || 0}
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/60 text-sm">Completed Today</div>
                <div className="text-3xl font-bold text-green-400">
                  {loading ? '...' : stats?.completed || 0}
                </div>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/60 text-sm">Total Patients</div>
                <div className="text-3xl font-bold text-purple-400">
                  {loading ? '...' : stats?.totalPatients || 0}
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Department Management */}
        <div className="glass-card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Departments</h2>
            <button
              onClick={() => {
                setEditingDept(null);
                setDeptForm({ code: '', name: '', description: '', color: '#6366f1', icon: '🏥' });
                setShowDeptModal(true);
              }}
              className="glass-button-primary px-4 py-2 text-sm"
            >
              + Add Department
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className={`p-4 rounded-lg border ${dept.is_active ? 'bg-white/5 border-white/10' : 'bg-red-500/10 border-red-500/30'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{dept.icon || '🏥'}</span>
                    <div>
                      <div className="font-semibold text-white">{dept.code}</div>
                      <div className="text-sm text-white/60">{dept.name}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs px-2 py-1 rounded ${dept.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {dept.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(dept)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <Link
            href="/admin/users"
            className="glass-card hover:scale-105 transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">User Management</h3>
                <p className="text-sm text-white/50">Manage staff accounts</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/settings"
            className="glass-card hover:scale-105 transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Settings</h3>
                <p className="text-sm text-white/50">System configuration</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/iptv"
            className="glass-card hover:scale-105 transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">IPTV</h3>
                <p className="text-sm text-white/50">Channel management</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/analytics"
            className="glass-card hover:scale-105 transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Analytics</h3>
                <p className="text-sm text-white/50">Performance metrics</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/audit"
            className="glass-card hover:scale-105 transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Audit Logs</h3>
                <p className="text-sm text-white/50">System activity</p>
              </div>
            </div>
          </Link>

          <Link
            href="/display"
            className="glass-card hover:scale-105 transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Display</h3>
                <p className="text-sm text-white/50">View waiting display</p>
              </div>
            </div>
          </Link>
        </div>

        {/* System Settings Overview */}
        <div className="glass-card">
          <h2 className="text-lg font-semibold text-white mb-4">System Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-white/50 text-sm">Clinic Name</div>
              <div className="font-medium text-white">{settings?.clinic_name || 'Not set'}</div>
            </div>
            <div>
              <div className="text-white/50 text-sm">Clinic Address</div>
              <div className="font-medium text-white">{settings?.clinic_address || 'Not set'}</div>
            </div>
            <div>
              <div className="text-white/50 text-sm">Wait Time per Patient</div>
              <div className="font-medium text-white">{settings?.wait_time_per_patient || 15} min</div>
            </div>
            <div>
              <div className="text-white/50 text-sm">Departments</div>
              <div className="font-medium text-white">{settings?.departments || 'MED,PED,GYN,OPH,DEN,ORTH'}</div>
            </div>
          </div>
        </div>
      </main>

      {/* Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">
              {editingDept ? 'Edit Department' : 'Add New Department'}
            </h3>
            
            <form onSubmit={handleSaveDepartment} className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">Department Code *</label>
                <input
                  type="text"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                  className="glass-input w-full"
                  placeholder="e.g., URGENT"
                  required
                  disabled={!!editingDept}
                  maxLength={10}
                />
              </div>
              
              <div>
                <label className="text-white/70 text-sm mb-2 block">Department Name *</label>
                <input
                  type="text"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="glass-input w-full"
                  placeholder="e.g., Urgent Care"
                  required
                />
              </div>
              
              <div>
                <label className="text-white/70 text-sm mb-2 block">Description</label>
                <input
                  type="text"
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="glass-input w-full"
                  placeholder="Brief description"
                />
              </div>
              
              <div>
                <label className="text-white/70 text-sm mb-2 block">Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={deptForm.color}
                    onChange={(e) => setDeptForm({ ...deptForm, color: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={deptForm.color}
                    onChange={(e) => setDeptForm({ ...deptForm, color: e.target.value })}
                    className="glass-input flex-1"
                    placeholder="#6366f1"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-white/70 text-sm mb-2 block">Icon (Emoji)</label>
                <input
                  type="text"
                  value={deptForm.icon}
                  onChange={(e) => setDeptForm({ ...deptForm, icon: e.target.value })}
                  className="glass-input w-full"
                  placeholder="🏥"
                  maxLength={2}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeptModal(false);
                    setEditingDept(null);
                  }}
                  className="glass-button px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDept}
                  className="glass-button-primary px-4 py-2"
                >
                  {savingDept ? 'Saving...' : (editingDept ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
