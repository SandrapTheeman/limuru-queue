'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import { api } from '../../../lib/api';
import Link from 'next/link';

// Demo channels for testing without backend
const DEMO_CHANNELS = [
  { id: 'channel-001', name: 'KTN News', url: 'https://stream.knn.co.ke/live', category: 'News', logo: null, is_active: true, display_order: 1 },
  { id: 'channel-002', name: 'KBC Channel 1', url: 'https://stream.kbc.co.ke/live', category: 'Entertainment', logo: null, is_active: true, display_order: 2 },
  { id: 'channel-003', name: 'Citizen TV', url: 'https://stream.citizen.co.ke/live', category: 'News', logo: null, is_active: true, display_order: 3 },
  { id: 'channel-004', name: 'KTN Drama', url: 'https://stream.ktn.co.ke/drama', category: 'Entertainment', logo: null, is_active: false, display_order: 4 },
];

interface IPTVChannel {
  id: string;
  name: string;
  url: string;
  category: string;
  logo: string | null;
  is_active: boolean;
  display_order: number;
}

export default function AdminIPTVPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', url: '', category: '' });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchChannels();
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const fetchChannels = async () => {
    try {
      const data = await api.getIptvChannels();
      if (!data || data.length === 0) {
        setChannels(DEMO_CHANNELS);
      } else {
        setChannels(data);
      }
    } catch (error) {
      console.log('Using demo channels (API not available)');
      setChannels(DEMO_CHANNELS);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = async () => {
    if (!newChannel.name || !newChannel.url) return;
    
    const channel: IPTVChannel = {
      id: 'channel-' + Date.now(),
      name: newChannel.name,
      url: newChannel.url,
      category: newChannel.category || 'General',
      logo: null,
      is_active: true,
      display_order: channels.length + 1,
    };
    
    try {
      await api.addIptvChannel({
        name: newChannel.name,
        url: newChannel.url,
        category: newChannel.category || undefined,
      });
      fetchChannels();
    } catch (error) {
      setChannels([...channels, channel]);
    }
    
    setNewChannel({ name: '', url: '', category: '' });
    setShowAddModal(false);
  };

  const handleDeleteChannel = (channelId: string) => {
    if (!confirm('Are you sure you want to delete this channel?')) return;
    setChannels(channels.filter(c => c.id !== channelId));
  };

  const handleToggleActive = (channel: IPTVChannel) => {
    setChannels(channels.map(c => 
      c.id === channel.id ? { ...c, is_active: !c.is_active } : c
    ));
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
            <h1 className="text-xl font-bold text-white">IPTV Channel Management</h1>
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
        <div className="glass-card">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-white">TV Channels</h2>
              <p className="text-sm text-white/50">Manage channels for the waiting room display</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="glass-button-primary px-4 py-2"
            >
              Add Channel
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-white/50">Loading channels...</div>
          ) : channels.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              No channels configured. Add a channel to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {channels.map((channel) => (
                <div key={channel.id} className="border border-white/10 bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{channel.name}</h3>
                    <button
                      onClick={() => handleToggleActive(channel)}
                      className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${
                        channel.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {channel.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <p className="text-sm text-white/60 mb-2">{channel.category}</p>
                  <p className="text-xs text-white/40 truncate mb-3">{channel.url}</p>
                  <div className="flex gap-2">
                    <button className="text-sm text-primary-400 hover:text-primary-300">
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteChannel(channel.id)}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Channel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Add TV Channel</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">Channel Name *</label>
                <input
                  type="text"
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  className="glass-input w-full"
                  placeholder="KTN News"
                />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-2 block">Stream URL *</label>
                <input
                  type="url"
                  value={newChannel.url}
                  onChange={(e) => setNewChannel({ ...newChannel, url: e.target.value })}
                  className="glass-input w-full"
                  placeholder="https://stream.example.com/live"
                />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-2 block">Category</label>
                <input
                  type="text"
                  value={newChannel.category}
                  onChange={(e) => setNewChannel({ ...newChannel, category: e.target.value })}
                  className="glass-input w-full"
                  placeholder="News, Entertainment, etc."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddChannel}
                disabled={!newChannel.name || !newChannel.url}
                className="glass-button-primary px-4 py-2 disabled:opacity-50"
              >
                Add Channel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
