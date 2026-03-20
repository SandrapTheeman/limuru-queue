'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import Link from 'next/link';

interface LabOrder {
  id: string;
  patient_name: string;
  test_type: string;
  status: string;
  priority: string;
  created_at: string;
  results?: string;
}

export default function LabTechDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'completed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (user) fetchLabOrders();
  }, [user, filter]);

  const fetchLabOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clinical/lab-orders?status=${filter}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLabOrders(data.data?.orders || []);
      }
    } catch (error) {
      console.error('Error fetching lab orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      setProcessing(orderId);
      const response = await fetch(`/api/clinical/lab-orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) fetchLabOrders();
    } catch (error) {
      console.error('Error updating order:', error);
    } finally {
      setProcessing(null);
    }
  };

  const filteredOrders = labOrders.filter(o =>
    o.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.test_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="glass border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xl">🏥</Link>
            <h1 className="text-lg font-bold text-white">Lab Technician Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70">
              {user.name}
              <span className="ml-2 px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-300">{user.role}</span>
            </span>
            <button onClick={() => { logout(); router.push('/login'); }} className="text-sm text-red-400">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card"><div className="text-3xl mb-2">🔬</div><h3 className="text-lg font-semibold text-white">Pending</h3><p className="text-2xl font-bold text-yellow-300">{labOrders.filter(o => o.status === 'pending').length}</p></div>
          <div className="glass-card"><div className="text-3xl mb-2">⏳</div><h3 className="text-lg font-semibold text-white">In Progress</h3><p className="text-2xl font-bold text-blue-300">{labOrders.filter(o => o.status === 'in_progress').length}</p></div>
          <div className="glass-card"><div className="text-3xl mb-2">✅</div><h3 className="text-lg font-semibold text-white">Completed</h3><p className="text-2xl font-bold text-green-300">{labOrders.filter(o => o.status === 'completed').length}</p></div>
          <div className="glass-card"><div className="text-3xl mb-2">📋</div><h3 className="text-lg font-semibold text-white">Today</h3><p className="text-2xl font-bold text-white/70">{labOrders.length}</p></div>
        </div>
        <div className="glass-card">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-white">Lab Orders</h2>
            <div className="flex gap-3">
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="glass-input text-sm" />
              <select value={filter} onChange={(e) => setFilter(e.target.value as 'pending' | 'completed')} className="glass-input text-sm">
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          {loading ? <div className="text-white/60 text-center py-8">Loading...</div> : filteredOrders.length === 0 ? <div className="text-white/60 text-center py-8">No orders found</div> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/10"><th className="text-left py-3 px-4 text-white/70">Patient</th><th className="text-left py-3 px-4 text-white/70">Test Type</th><th className="text-left py-3 px-4 text-white/70">Priority</th><th className="text-left py-3 px-4 text-white/70">Status</th><th className="text-left py-3 px-4 text-white/70">Actions</th></tr></thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-white/5">
                      <td className="py-3 px-4 text-white">{order.patient_name}</td>
                      <td className="py-3 px-4 text-white">{order.test_type}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs ${order.priority === 'urgent' ? 'bg-red-500/20 text-red-300' : 'bg-gray-500/20 text-gray-300'}`}>{order.priority}</span></td>
                      <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs ${order.status === 'completed' ? 'bg-green-500/20 text-green-300' : order.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{order.status}</span></td>
                      <td className="py-3 px-4">
                        {order.status === 'pending' && <button onClick={() => handleUpdateStatus(order.id, 'in_progress')} disabled={processing === order.id} className="glass-button-primary text-sm py-1 px-3">Start</button>}
                        {order.status === 'in_progress' && <button onClick={() => handleUpdateStatus(order.id, 'completed')} disabled={processing === order.id} className="glass-button-primary text-sm py-1 px-3">Complete</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
