'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import Link from 'next/link';

interface Room {
  id: string;
  name: string;
  type: string;
  department: string;
  status: string;
  capacity?: number;
  equipment?: string[];
}

export default function FacilityDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (user) fetchRooms();
  }, [user]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rooms', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRooms(data.data?.rooms || []);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (roomId: string, status: string) => {
    try {
      setProcessing(roomId);
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (response.ok) fetchRooms();
    } catch (error) {
      console.error('Error updating room:', error);
    } finally {
      setProcessing(null);
    }
  };

  const filteredRooms = rooms.filter(r => filter === 'all' || r.status === filter);

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="glass border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xl">🏥</Link>
            <h1 className="text-lg font-bold text-white">Facility Management</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70">
              {user.name}
              <span className="ml-2 px-2 py-1 bg-orange-500/20 rounded text-xs text-orange-300">{user.role}</span>
            </span>
            <button onClick={() => { logout(); router.push('/login'); }} className="text-sm text-red-400">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card"><div className="text-3xl mb-2">🚪</div><h3 className="text-lg font-semibold text-white">Total Rooms</h3><p className="text-2xl font-bold text-white/70">{rooms.length}</p></div>
          <div className="glass-card"><div className="text-3xl mb-2">✅</div><h3 className="text-lg font-semibold text-white">Available</h3><p className="text-2xl font-bold text-green-300">{rooms.filter(r => r.status === 'available').length}</p></div>
          <div className="glass-card"><div className="text-3xl mb-2">⏳</div><h3 className="text-lg font-semibold text-white">In Use</h3><p className="text-2xl font-bold text-yellow-300">{rooms.filter(r => r.status === 'in_use').length}</p></div>
          <div className="glass-card"><div className="text-3xl mb-2">🔧</div><h3 className="text-lg font-semibold text-white">Maintenance</h3><p className="text-2xl font-bold text-red-300">{rooms.filter(r => r.status === 'maintenance').length}</p></div>
        </div>
        <div className="glass-card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Room Management</h2>
            <div className="flex gap-3">
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="glass-input text-sm">
                <option value="all">All</option>
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <Link href="/admin/rooms/new" className="glass-button-primary text-sm">Add Room</Link>
            </div>
          </div>
          {loading ? <div className="text-white/60 text-center py-8">Loading...</div> : filteredRooms.length === 0 ? <div className="text-white/60 text-center py-8">No rooms found</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRooms.map((room) => (
                <div key={room.id} className="glass-card">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-white">{room.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${room.status === 'available' ? 'bg-green-500/20 text-green-300' : room.status === 'in_use' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>{room.status}</span>
                  </div>
                  <p className="text-white/60 text-sm mb-2">{room.type} - {room.department}</p>
                  {room.capacity && <p className="text-white/50 text-sm mb-2">Capacity: {room.capacity}</p>}
                  <div className="flex gap-2 mt-3">
                    {room.status === 'available' && <button onClick={() => handleUpdateStatus(room.id, 'in_use')} className="glass-button text-sm py-1">Mark In Use</button>}
                    {room.status !== 'maintenance' && <button onClick={() => handleUpdateStatus(room.id, 'maintenance')} className="glass-button text-sm py-1 text-yellow-300">Maintenance</button>}
                    {room.status === 'maintenance' && <button onClick={() => handleUpdateStatus(room.id, 'available')} className="glass-button text-sm py-1 text-green-300">Mark Available</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
