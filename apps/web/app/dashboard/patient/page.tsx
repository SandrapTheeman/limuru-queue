'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import { api } from '../../../lib/api';
import Link from 'next/link';
import { MessageCircle, Bell, Clock, MapPin, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { OfflineBanner } from '@/lib/hooks/useOfflineStatus';
import { useToast } from '@/lib/components';
import { LanguageSwitcher } from '@/lib/components/LanguageSwitcher';

type TabType = 'queue' | 'history' | 'profile';

export default function PatientDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('queue');
  const [currentVisit, setCurrentVisit] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [patientData, setPatientData] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    whatsapp: false,
    remindMinutes: 15,
  });
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'patient') {
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
      if (user?.id) {
        const historyData = await api.getPatientHistory(user.id);
        setHistory(Array.isArray(historyData) ? historyData : []);

        const current = Array.isArray(historyData) ? historyData.find(
          (v: any) => v.status === 'waiting' || v.status === 'called' || v.status === 'in_progress'
        ) : null;
        setCurrentVisit(current);

        try {
          const patientInfo = await api.getPatient(user.id);
          setPatientData(patientInfo);
          setProfileForm({
            name: patientInfo.name || '',
            phone: patientInfo.phone || '',
            email: patientInfo.email || '',
          });
        } catch (e) {
          setProfileForm({
            name: user.name || '',
            phone: '',
            email: user.email || '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.info('Data refreshed');
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      if (user?.id) {
        await api.updatePatient(user.id, {
          name: profileForm.name,
          phone: profileForm.phone,
          email: profileForm.email,
        });
        toast.success('Profile updated');
        setEditingProfile(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.new.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      await api.changePassword(passwordForm.current, passwordForm.new);
      toast.success('Password changed successfully');
      setPasswordForm({ current: '', new: '', confirm: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleWhatsAppConnect = async () => {
    if (!whatsappNumber) {
      toast.error('Please enter a WhatsApp number');
      return;
    }
    try {
      await (api as any).updateNotificationPrefs?.({ whatsapp: true, whatsappNumber });
      toast.success('WhatsApp connected! You will receive queue updates there.');
      setShowWhatsAppModal(false);
      setNotifications((prev) => ({ ...prev, whatsapp: true }));
    } catch (error) {
      console.error('Failed to connect WhatsApp:', error);
      toast.error('Failed to connect WhatsApp');
    }
  };

  const estimatedWait = currentVisit?.estimated_wait_minutes || (currentVisit ? Math.max(1, (currentVisit.position || 1) * 15) : 0);

  if (!isAuthenticated || user?.role !== 'patient') {
    return null;
  }

  const totalWaiting = currentVisit ? history.filter((v: any) => v.status === 'waiting').length + 1 : 0;
  const currentPosition = currentVisit?.position || 1;

  return (
    <div className="min-h-screen">
      <OfflineBanner />

      <header className="glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl">🏥</Link>
            <h1 className="text-xl font-bold text-white">Patient Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-sm text-white/70">
              {user.name}
              <span className="ml-2 px-2 py-1 bg-primary-500/20 rounded text-xs capitalize text-primary-300">
                {user.role}
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

      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'queue'}
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'queue'
                  ? 'text-primary-400 border-primary-400'
                  : 'text-white/60 border-transparent hover:text-white'
              }`}
            >
              Queue Status
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'history'
                  ? 'text-primary-400 border-primary-400'
                  : 'text-white/60 border-transparent hover:text-white'
              }`}
            >
              Visit History
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'profile'}
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'profile'
                  ? 'text-primary-400 border-primary-400'
                  : 'text-white/60 border-transparent hover:text-white'
              }`}
            >
              My Profile
            </button>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="tabpanel">
        {activeTab === 'queue' && (
          <>
            {currentVisit?.status === 'called' && (
              <div className="mb-8 bg-green-500/30 border-2 border-green-400 rounded-xl p-6 animate-pulse">
                <div className="text-center">
                  <div className="text-4xl mb-2">🔔</div>
                  <h2 className="text-2xl font-bold text-green-400 mb-2">IT'S YOUR TURN!</h2>
                  <p className="text-white mb-2">Please proceed to your consultation room</p>
                  <div className="text-3xl font-bold text-white mb-4">
                    Room {currentVisit.room_assigned || 'TBD'}
                  </div>
                  {currentVisit.doctor_name && (
                    <p className="text-white/70">
                      Dr. {currentVisit.doctor_name} is waiting for you
                    </p>
                  )}
                  <button className="mt-4 glass-button-primary px-8 py-3">
                    I'm On My Way
                  </button>
                </div>
              </div>
            )}

            <div className="glass-card mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">Current Visit Status</h2>

              {loading ? (
                <div className="text-center py-8 text-white/50">
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  Loading...
                </div>
              ) : currentVisit ? (
                <>
                  <div className="bg-primary-500/20 rounded-lg p-6 border border-primary-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-white/60 text-sm">Ticket Number</div>
                        <div className="text-5xl font-bold text-primary-400 font-mono">
                          {currentVisit.ticket_number}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white/60 text-sm">Status</div>
                        <div className={`text-xl font-semibold ${
                          currentVisit.status === 'waiting' ? 'text-yellow-400' :
                          currentVisit.status === 'called' ? 'text-blue-400' :
                          currentVisit.status === 'in_progress' ? 'text-green-400' : 'text-white/60'
                        }`}>
                          {currentVisit.status.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <div className="text-white/50 text-sm">Department</div>
                        <div className="font-semibold text-white">{currentVisit.department}</div>
                      </div>
                      <div>
                        <div className="text-white/50 text-sm">Room</div>
                        <div className="font-semibold text-white">{currentVisit.room_assigned || 'Not assigned'}</div>
                      </div>
                      <div>
                        <div className="text-white/50 text-sm flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Wait Time
                        </div>
                        <div className="font-semibold text-white">{currentVisit.wait_time_minutes || 0} min</div>
                      </div>
                      <div>
                        <div className="text-white/50 text-sm flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          Position
                        </div>
                        <div className="font-semibold text-white">#{currentPosition}</div>
                      </div>
                    </div>
                  </div>

                  {currentVisit.status === 'waiting' && totalWaiting > 1 && (
                    <div className="mt-6">
                      <div className="flex justify-between text-sm text-white/60 mb-2">
                        <span>Queue Progress</span>
                        <span>Position {currentPosition} of {totalWaiting} waiting</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary-500 to-primary-400 h-4 rounded-full transition-all duration-500"
                          style={{ width: `${((totalWaiting - currentPosition + 1) / totalWaiting) * 100}%` }}
                        />
                      </div>
                      <p className="text-sm text-white/50 mt-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Estimated wait: ~{estimatedWait} minutes
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-white/50 mb-4">You are not currently in a queue</div>
                  <Link
                    href="/kiosk"
                    className="inline-block glass-button-primary px-6 py-3"
                  >
                    Get a Queue Ticket
                  </Link>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/kiosk"
                className="glass-card hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">🎫</div>
                <h3 className="text-lg font-semibold text-white">Get Queue Ticket</h3>
                <p className="text-white/50 mt-1">Join a new queue for consultation</p>
              </Link>

              <Link
                href="/display"
                className="glass-card hover:scale-105 transition-transform"
                style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}
              >
                <div className="text-4xl mb-3">📺</div>
                <h3 className="text-lg font-semibold text-white">View Display</h3>
                <p className="text-white/50 mt-1">Check current queue status</p>
              </Link>

              <button
                onClick={() => setShowWhatsAppModal(true)}
                className="glass-card hover:scale-105 transition-transform text-left"
              >
                <div className="text-4xl mb-3">
                  <svg className="w-12 h-12 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Connect WhatsApp</h3>
                <p className="text-white/50 mt-1">Get updates on your phone</p>
              </button>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="glass-card">
            <h2 className="text-lg font-semibold text-white mb-4">Visit History</h2>

            {history.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                No previous visits found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Ticket</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Department</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Wait Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {history.map((visit) => (
                      <tr key={visit.id}>
                        <td className="px-4 py-3 text-sm text-white/80">
                          {new Date(visit.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-white font-mono">
                          {visit.ticket_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-white/80">
                          {visit.department}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            visit.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            visit.status === 'no_show' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {visit.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/80">
                          {visit.wait_time_minutes || '-'} min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="glass-card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                {!editingProfile && (
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="text-sm text-primary-400 hover:text-primary-300"
                  >
                    Edit Information
                  </button>
                )}
              </div>

              {editingProfile ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="glass-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Phone Number</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="glass-input w-full"
                      placeholder="+254..."
                    />
                  </div>
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Email Address</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="glass-input w-full"
                      placeholder="your.email@example.com"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="glass-button-primary px-4 py-2"
                    >
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingProfile(false);
                        setProfileForm({
                          name: patientData?.name || user.name || '',
                          phone: patientData?.phone || '',
                          email: patientData?.email || user.email || '',
                        });
                      }}
                      className="glass-button px-4 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-white/50 text-sm">Patient ID</div>
                    <div className="text-white font-medium font-mono">{user.id || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-white/50 text-sm">Full Name</div>
                    <div className="text-white font-medium">{patientData?.name || user.name}</div>
                  </div>
                  <div>
                    <div className="text-white/50 text-sm">Phone Number</div>
                    <div className="text-white font-medium">{patientData?.phone || 'Not set'}</div>
                  </div>
                  <div>
                    <div className="text-white/50 text-sm">Email Address</div>
                    <div className="text-white font-medium">{patientData?.email || user.email || 'Not set'}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card">
              <h2 className="text-lg font-semibold text-white mb-4">Security</h2>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-white/70">Password</div>
                  <div className="text-white/50 text-sm">Last changed: Never</div>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="glass-button-primary px-4 py-2"
                >
                  Change Password
                </button>
              </div>
            </div>

            <div className="glass-card">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/70 flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Email notifications
                  </span>
                  <input
                    type="checkbox"
                    checked={notifications.email}
                    onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                    className="w-5 h-5 rounded accent-primary-500"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/70 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    SMS notifications
                  </span>
                  <input
                    type="checkbox"
                    checked={notifications.sms}
                    onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })}
                    className="w-5 h-5 rounded accent-primary-500"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/70 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp notifications
                    {notifications.whatsapp && <span className="text-green-400 text-xs">(Connected)</span>}
                  </span>
                  <input
                    type="checkbox"
                    checked={notifications.whatsapp}
                    onChange={(e) => {
                      if (!notifications.whatsapp) {
                        setShowWhatsAppModal(true);
                      }
                    }}
                    className="w-5 h-5 rounded accent-primary-500"
                  />
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Remind me before my turn</span>
                  <select
                    value={notifications.remindMinutes}
                    onChange={(e) => setNotifications({ ...notifications, remindMinutes: parseInt(e.target.value) })}
                    className="glass-input w-auto"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
                <button className="glass-button-primary px-4 py-2">
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Change Password</h3>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
                {passwordSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  className="glass-input w-full"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-2 block">New Password</label>
                <input
                  type="password"
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                  className="glass-input w-full"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-2 block">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  className="glass-input w-full"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError('');
                  setPasswordForm({ current: '', new: '', confirm: '' });
                }}
                className="glass-button px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordForm.current || !passwordForm.new}
                className="glass-button-primary px-4 py-2"
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Connect WhatsApp
            </h3>
            <p className="text-white/60 mb-4">
              Enter your WhatsApp number to receive queue updates and notifications.
            </p>
            <div className="mb-4">
              <label className="text-white/70 text-sm mb-2 block">WhatsApp Number</label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="glass-input w-full"
                placeholder="+254..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="glass-button px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleWhatsAppConnect}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
