'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import Link from 'next/link';

interface Department {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
  queue_count: number;
  avg_wait_time: number;
}

export default function AdminDepartmentsPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    icon: '🏥',
    color: '#6366f1',
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
      return;
    }
    setDepartments([
      { id: '1', code: 'MED', name: 'General Medicine', description: 'General medical consultations', icon: '🩺', color: '#3b82f6', is_active: true, queue_count: 8, avg_wait_time: 15 },
      { id: '2', code: 'PED', name: 'Pediatrics', description: 'Child healthcare services', icon: '👶', color: '#10b981', is_active: true, queue_count: 5, avg_wait_time: 12 },
      { id: '3', code: 'GYN', name: 'Gynecology', description: 'Women health services', icon: '🩹', color: '#ec4899', is_active: true, queue_count: 3, avg_wait_time: 18 },
      { id: '4', code: 'OPH', name: 'Ophthalmology', description: 'Eye care services', icon: '👁️', color: '#8b5cf6', is_active: true, queue_count: 2, avg_wait_time: 20 },
      { id: '5', code: 'DEN', name: 'Dental', description: 'Dental care services', icon: '🦷', color: '#f59e0b', is_active: true, queue_count: 4, avg_wait_time: 10 },
      { id: '6', code: 'ORTH', name: 'Orthopedics', description: 'Bone and joint services', icon: '🦴', color: '#ef4444', is_active: false, queue_count: 0, avg_wait_time: 0 },
    ]);
    setLoading(false);
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDept) {
      setDepartments(departments.map(d => 
        d.id === editingDept.id ? { ...d, ...formData } : d
      ));
    } else {
      const newDept: Department = {
        id: Date.now().toString(),
        ...formData,
        is_active: true,
        queue_count: 0,
        avg_wait_time: 0,
      };
      setDepartments([...departments, newDept]);
    }
    setShowModal(false);
    setEditingDept(null);
    setFormData({ code: '', name: '', description: '', icon: '🏥', color: '#6366f1' });
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      code: dept.code,
      name: dept.name,
      description: dept.description,
      icon: dept.icon,
      color: dept.color,
    });
    setShowModal(true);
  };

  const handleToggleStatus = (id: string) => {
    setDepartments(departments.map(d => 
      d.id === id ? { ...d, is_active: !d.is_active } : d
    ));
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      setDepartments(departments.filter(d => d.id !== id));
    }
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className="text-white/60 hover:text-white">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-white">Department Management</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/70">Welcome, {user?.name}</span>
            <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Hospital Departments</h2>
            <p className="text-white/60 mt-1">Manage departments and queue configurations</p>
          </div>
          <button
            onClick={() => {
              setEditingDept(null);
              setFormData({ code: '', name: '', description: '', icon: '🏥', color: '#6366f1' });
              setShowModal(true);
            }}
            className="glass-button-primary px-4 py-2"
          >
            + Add Department
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-white/50">Loading departments...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className={`glass-card transition-all hover:scale-[1.02] ${
                  !dept.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${dept.color}20` }}
                    >
                      {dept.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{dept.code}</h3>
                      <p className="text-sm text-white/60">{dept.name}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    dept.is_active 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {dept.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-sm text-white/70 mb-4">{dept.description}</p>

                {dept.is_active && (
                  <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-white/5 rounded-lg">
                    <div>
                      <div className="text-xs text-white/50">In Queue</div>
                      <div className="text-xl font-bold text-blue-400">{dept.queue_count}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/50">Avg Wait</div>
                      <div className="text-xl font-bold text-yellow-400">{dept.avg_wait_time} min</div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                  <button
                    onClick={() => handleToggleStatus(dept.id)}
                    className={`text-sm ${dept.is_active ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}`}
                  >
                    {dept.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEdit(dept)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(dept.id, dept.name)}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">Department Status Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className={`p-4 rounded-lg border ${
                  dept.is_active 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <div className="text-2xl mb-2">{dept.icon}</div>
                <div className="font-medium text-white">{dept.code}</div>
                <div className={`text-sm ${dept.is_active ? 'text-green-400' : 'text-red-400'}`}>
                  {dept.is_active ? `${dept.queue_count} in queue` : 'Disabled'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">
              {editingDept ? 'Edit Department' : 'Add New Department'}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">Department Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="glass-input w-full"
                  placeholder="e.g., MED"
                  required
                  disabled={!!editingDept}
                  maxLength={10}
                />
              </div>
              
              <div>
                <label className="text-white/70 text-sm mb-2 block">Department Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="glass-input w-full"
                  placeholder="e.g., General Medicine"
                  required
                />
              </div>
              
              <div>
                <label className="text-white/70 text-sm mb-2 block">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="glass-input w-full"
                  placeholder="Brief description"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="text-white/70 text-sm mb-2 block">Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="glass-input flex-1"
                    placeholder="#6366f1"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-white/70 text-sm mb-2 block">Icon (Emoji)</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="glass-input w-full"
                  placeholder="🏥"
                  maxLength={2}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingDept(null);
                  }}
                  className="glass-button px-4 py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="glass-button-primary px-4 py-2">
                  {editingDept ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}