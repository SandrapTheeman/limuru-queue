'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthGuard, useToast, AdminHeader, LoadingSkeleton, EmptyState, ConfirmModal, useDataTable } from '../../../../lib/ui';
import { api } from '../../../../lib/api';
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

interface DepartmentFormData {
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const ICON_OPTIONS = ['🏥', '🩺', '👶', '🩹', '👁️', '🦷', '🦴', '💊', '🫀', '🧠', '🦶', '👂'];
const COLOR_OPTIONS = ['#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1'];

export default function AdminDepartmentsPage() {
  const { mounted, isAuthenticated } = useAuthGuard();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; dept: Department | null }>({ open: false, dept: null });
  const [formData, setFormData] = useState<DepartmentFormData>({
    code: '', name: '', description: '', icon: '🏥', color: '#3b82f6'
  });
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const table = useDataTable<Department>();

  const fetchDepartments = useCallback(async () => {
    table.setLoading(true);
    table.setError(null);
    try {
      const data = await api.get<Department[]>('/api/admin/departments');
      table.setData(Array.isArray(data) ? data : []);
    } catch {
      table.setData([
        { id: '1', code: 'MED', name: 'General Medicine', description: 'General medical consultations', icon: '🩺', color: '#3b82f6', is_active: true, queue_count: 8, avg_wait_time: 15 },
        { id: '2', code: 'PED', name: 'Pediatrics', description: 'Child healthcare services', icon: '👶', color: '#10b981', is_active: true, queue_count: 5, avg_wait_time: 12 },
        { id: '3', code: 'GYN', name: 'Gynecology', description: 'Women health services', icon: '🩹', color: '#ec4899', is_active: true, queue_count: 3, avg_wait_time: 18 },
        { id: '4', code: 'OPH', name: 'Ophthalmology', description: 'Eye care services', icon: '👁️', color: '#8b5cf6', is_active: true, queue_count: 2, avg_wait_time: 20 },
        { id: '5', code: 'DEN', name: 'Dental', description: 'Dental care services', icon: '🦷', color: '#f59e0b', is_active: true, queue_count: 4, avg_wait_time: 10 },
        { id: '6', code: 'ORTH', name: 'Orthopedics', description: 'Bone and joint services', icon: '🦴', color: '#ef4444', is_active: false, queue_count: 0, avg_wait_time: 0 },
      ]);
      showToast('info', 'Using demo data - API not available');
    } finally {
      table.setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      fetchDepartments();
    }
  }, [mounted, isAuthenticated]);

  const handleOpenModal = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({
        code: dept.code,
        name: dept.name,
        description: dept.description,
        icon: dept.icon,
        color: dept.color,
      });
    } else {
      setEditingDept(null);
      setFormData({ code: '', name: '', description: '', icon: '🏥', color: '#3b82f6' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDept(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDept) {
        await api.put(`/api/admin/departments/${editingDept.id}`, formData);
        showToast('success', `Department "${formData.name}" updated`);
      } else {
        await api.post('/api/admin/departments', formData);
        showToast('success', `Department "${formData.name}" created`);
      }
      handleCloseModal();
      fetchDepartments();
    } catch {
      if (editingDept) {
        table.setData(table.data.map(d => d.id === editingDept.id ? { ...d, ...formData } : d));
        showToast('success', 'Department updated (demo mode)');
      } else {
        const newDept: Department = {
          id: Date.now().toString(),
          ...formData,
          is_active: true,
          queue_count: 0,
          avg_wait_time: 0,
        };
        table.setData([...table.data, newDept]);
        showToast('success', 'Department created (demo mode)');
      }
      handleCloseModal();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (dept: Department) => {
    try {
      await api.put(`/api/admin/departments/${dept.id}`, { is_active: !dept.is_active });
      showToast('success', `Department ${dept.is_active ? 'disabled' : 'enabled'}`);
    } catch {
      table.setData(table.data.map(d => d.id === dept.id ? { ...d, is_active: !d.is_active } : d));
      showToast('success', 'Status toggled (demo mode)');
    }
    fetchDepartments();
  };

  const handleDelete = async () => {
    if (!deleteConfirm.dept) return;
    try {
      await api.del(`/api/admin/departments/${deleteConfirm.dept.id}`);
      showToast('success', 'Department deleted');
    } catch {
      table.setData(table.data.filter(d => d.id !== deleteConfirm.dept!.id));
      showToast('success', 'Department deleted (demo mode)');
    }
    fetchDepartments();
  };

  const filteredDepts = statusFilter
    ? table.paginatedData.filter(d => statusFilter === 'active' ? d.is_active : !d.is_active)
    : table.paginatedData;

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  const activeDepts = table.data.filter(d => d.is_active).length;

  return (
    <div className="min-h-screen">
      <AdminHeader title="Department Management" breadcrumb={[{ label: 'Admin', href: '/dashboard/admin' }]}>
        <Link href="/admin" className="glass-button px-3 py-1 text-sm">Dashboard</Link>
      </AdminHeader>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Hospital Departments</h2>
            <p className="text-white/60">{activeDepts} active departments</p>
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="glass-input px-4 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button onClick={() => handleOpenModal()} className="glass-button-primary px-4 py-2">
              + Add Department
            </button>
          </div>
        </div>

        {table.loading ? (
          <LoadingSkeleton rows={4} />
        ) : table.data.length === 0 ? (
          <EmptyState
            icon="🏥"
            title="No departments found"
            description="Create your first department to get started."
            actionLabel="Add Department"
            onAction={() => handleOpenModal()}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredDepts.map((dept) => (
                <div
                  key={dept.id}
                  className={`glass-card transition-all hover:scale-[1.02] ${!dept.is_active ? 'opacity-60' : ''}`}
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
                      dept.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
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
                      onClick={() => handleToggleStatus(dept)}
                      className={`text-sm ${dept.is_active ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}`}
                    >
                      {dept.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <div className="flex gap-3">
                      <button onClick={() => handleOpenModal(dept)} className="text-sm text-blue-400 hover:text-blue-300">
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ open: true, dept })}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={table.currentPage}
              totalPages={table.totalPages}
              onPageChange={table.setCurrentPage}
              totalItems={table.filteredData.length}
              itemsPerPage={table.itemsPerPage}
            />
          </>
        )}

        <div className="mt-8 glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">Department Status Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {table.data.map((dept) => (
              <div
                key={dept.id}
                className={`p-4 rounded-lg border ${
                  dept.is_active ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
          <div className="glass-card max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-white mb-6">
              {editingDept ? 'Edit Department' : 'Add New Department'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="flex flex-wrap gap-2 mb-2">
                  {COLOR_OPTIONS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-lg border-2 transition ${formData.color === color ? 'border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="glass-input w-full"
                  placeholder="#6366f1"
                />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-2 block">Icon (Emoji)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {ICON_OPTIONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center transition ${
                        formData.icon === icon ? 'border-primary-500 bg-white/10' : 'border-white/10'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="glass-button px-4 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="glass-button-primary px-4 py-2 disabled:opacity-50">
                  {saving ? 'Saving...' : (editingDept ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, dept: null })}
        onConfirm={handleDelete}
        title="Delete Department"
        message={`Are you sure you want to delete "${deleteConfirm.dept?.name}"? This will remove the department and all associated queue data.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
