'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthGuard, useToast, AdminHeader, LoadingSkeleton, EmptyState, ConfirmModal, Pagination, SearchFilter, SortableHeader, useDataTable } from '../../../../lib/ui';
import { api } from '../../../../lib/api';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
}

export default function AdminUsersPage() {
  const { mounted, isAuthenticated, user } = useAuthGuard();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [formData, setFormData] = useState<UserFormData>({ name: '', email: '', password: '', role: 'receptionist' });
  const [saving, setSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');

  const table = useDataTable<User>();

  const fetchUsers = useCallback(async () => {
    table.setLoading(true);
    table.setError(null);
    try {
      const data = await api.get<{ users?: User[] }>('/api/admin/users');
      table.setData(Array.isArray(data) ? data : (data?.users || []));
    } catch (error: any) {
      table.setData([
        { id: '1', name: 'System Admin', email: 'admin@limuruhospital.co.ke', role: 'admin', is_active: true, last_login: '2026-03-06', created_at: '2026-01-01' },
        { id: '2', name: 'Dr. John Doe', email: 'doctor@hospital.co.ke', role: 'doctor', is_active: true, last_login: '2026-03-05', created_at: '2026-01-15' },
        { id: '3', name: 'Jane Smith', email: 'reception@hospital.co.ke', role: 'receptionist', is_active: true, last_login: '2026-03-06', created_at: '2026-02-01' },
        { id: '4', name: 'Mary Wanjiku', email: 'nurse@hospital.co.ke', role: 'nurse', is_active: false, last_login: '2026-02-20', created_at: '2026-02-10' },
      ]);
      showToast('info', 'Using demo data - API not available');
    } finally {
      table.setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      fetchUsers();
    }
  }, [mounted, isAuthenticated]);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'receptionist' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'receptionist' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        await api.put(`/api/admin/users/${editingUser.id}`, formData);
        showToast('success', `User "${formData.name}" updated successfully`);
      } else {
        await api.post('/api/admin/users', formData);
        showToast('success', `User "${formData.name}" created successfully`);
      }
      handleCloseModal();
      fetchUsers();
    } catch (error: any) {
      if (editingUser) {
        table.setData(table.data.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
        showToast('success', 'User updated (demo mode)');
      } else {
        const newUser: User = {
          id: Date.now().toString(),
          ...formData,
          is_active: true,
          last_login: null,
          created_at: new Date().toISOString().split('T')[0]
        };
        table.setData([...table.data, newUser]);
        showToast('success', 'User created (demo mode)');
      }
      handleCloseModal();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (userItem: User) => {
    try {
      await api.put(`/api/admin/users/${userItem.id}`, { is_active: !userItem.is_active });
      showToast('success', `User ${userItem.is_active ? 'deactivated' : 'activated'}`);
    } catch {
      table.setData(table.data.map(u => u.id === userItem.id ? { ...u, is_active: !u.is_active } : u));
      showToast('success', 'Status toggled (demo mode)');
    }
    fetchUsers();
  };

  const handleDelete = async () => {
    if (!deleteConfirm.user) return;
    try {
      await api.del(`/api/admin/users/${deleteConfirm.user.id}`);
      showToast('success', 'User deleted successfully');
    } catch {
      table.setData(table.data.filter(u => u.id !== deleteConfirm.user!.id));
      showToast('success', 'User deleted (demo mode)');
    }
    fetchUsers();
  };

  const filteredUsers = roleFilter
    ? table.paginatedData.filter(u => u.role === roleFilter)
    : table.paginatedData;

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white">Verifying access...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="User Management" breadcrumb={[{ label: 'Admin', href: '/dashboard/admin' }]}>
        <Link href="/admin" className="glass-button px-3 py-1 text-sm">
          Dashboard
        </Link>
      </AdminHeader>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-card">
          <div className="p-6 border-b border-white/10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Staff Users</h2>
                <p className="text-sm text-white/50">{table.data.length} total users</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="glass-input px-4 py-2 text-sm"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                </select>
                <button
                  onClick={() => handleOpenModal()}
                  className="glass-button-primary px-4 py-2 text-sm whitespace-nowrap"
                >
                  + Add User
                </button>
              </div>
            </div>
          </div>

          {table.loading ? (
            <LoadingSkeleton rows={5} />
          ) : table.data.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No users found"
              description="Add your first staff user to get started."
              actionLabel="Add User"
              onAction={() => handleOpenModal()}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-white/60">
                        <SortableHeader label="Name" column="name" sortColumn={table.sortColumn} sortDirection={table.sortDirection} onSort={table.handleSort} />
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-white/60">
                        <SortableHeader label="Role" column="role" sortColumn={table.sortColumn} sortDirection={table.sortDirection} onSort={table.handleSort} />
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-white/60">
                        <SortableHeader label="Last Login" column="last_login" sortColumn={table.sortColumn} sortDirection={table.sortDirection} onSort={table.handleSort} />
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 text-sm font-medium text-white">{u.name}</td>
                        <td className="px-6 py-4 text-sm text-white/80">{u.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                            u.role === 'doctor' ? 'bg-blue-500/20 text-blue-400' :
                            u.role === 'nurse' ? 'bg-green-500/20 text-green-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/60">
                          {u.last_login || 'Never'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleOpenModal(u)}
                            className="text-blue-400 hover:text-blue-300 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`mr-3 ${u.is_active ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}`}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          {u.id !== user?.id && (
                            <button
                              onClick={() => setDeleteConfirm({ open: true, user: u })}
                              className="text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
          <div className="glass-card max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-white mb-6">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="glass-input w-full"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-2 block">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="glass-input w-full"
                  placeholder="john@hospital.co.ke"
                  required
                />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-2 block">
                  Password {editingUser ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="glass-input w-full"
                  placeholder={editingUser ? '••••••••' : 'Enter password'}
                  required={!editingUser}
                />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-2 block">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="glass-input w-full"
                  required
                >
                  <option value="receptionist">Receptionist</option>
                  <option value="nurse">Nurse</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="glass-button px-4 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="glass-button-primary px-4 py-2 disabled:opacity-50">
                  {saving ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, user: null })}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteConfirm.user?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
