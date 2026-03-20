'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import { api } from '../../../lib/api';
import Link from 'next/link';

type TabType = 'queue' | 'history' | 'profile';

export default function PatientDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('queue');
  const [currentVisit, setCurrentVisit] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Profile state
  const [patientData, setPatientData] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  // Notification preferences
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    remindMinutes: 15
  });

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
        // Get patient history - API returns array directly
        const historyData = await api.getPatientHistory(user.id);
        setHistory(Array.isArray(historyData) ? historyData : []);
        
        // Find current visit
        const current = Array.isArray(historyData) ? historyData.find(
          (v: any) => v.status === 'waiting' || v.status === 'called' || v.status === 'in_progress'
        ) : null;
        setCurrentVisit(current);
        
        // Get patient profile
        try {
          const patientInfo = await api.getPatient(user.id);
          setPatientData(patientInfo);
          setProfileForm({
            name: patientInfo.name || '',
            phone: patientInfo.phone || '',
            email: patientInfo.email || ''
          });
        } catch (e) {
          // Use user data from auth store as fallback
          setProfileForm({
            name: user.name || '',
            phone: '',
            email: user.email || ''
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setPasswordError('');
    try {
      if (user?.id) {
        await api.updatePatient(user.id, {
          name: profileForm.name,
          phone: profileForm.phone,
          email: profileForm.email
        });
        setEditingProfile(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
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
      setPasswordSuccess('Password changed successfully!');
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

  if (!isAuthenticated || user?.role !== 'patient') {
    return null;
  }

  const totalWaiting = currentVisit ? history.filter((v: any) => v.status === 'waiting').length + 1 : 0;
  const currentPosition = 1; // Would be calculated from API

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl">🏥</Link>
            <h1 className="text-xl font-bold text-white">Patient Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/70">
              Welcome, {user.name}
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

      {/* Tab Navigation */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1">
            <button
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ==================== QUEUE STATUS TAB ==================== */}
        {activeTab === 'queue' && (
          <>
            {/* Called Alert Banner */}
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

            {/* Current Queue Status */}
            <div className="glass-card mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">Current Visit Status</h2>
              
              {loading ? (
                <div className="text-center py-8 text-white/50">Loading...</div>
              ) : currentVisit ? (
                <>
                  <div className="bg-primary-500/20 rounded-lg p-6 border border-primary-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-white/60 text-sm">Ticket Number</div>
                        <div className="text-5xl font-bold text-primary-400">
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
                        <div className="text-white/50 text-sm">Check-in Time</div>
                        <div className="font-semibold text-white">
                          {new Date(currentVisit.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-white/50 text-sm">Wait Time</div>
                        <div className="font-semibold text-white">{currentVisit.wait_time_minutes || 0} min</div>
                      </div>
                    </div>
                  </div>

                  {/* Queue Progress Bar */}
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
                      <p className="text-sm text-white/50 mt-2">
                        Estimated wait: {currentVisit.wait_time_minutes || 15} minutes
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

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>
          </>
        )}

        {/* ==================== VISIT HISTORY TAB ==================== */}
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
                        <td className="px-4 py-3 text-sm font-medium text-white">
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

        {/* ==================== PROFILE TAB ==================== */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Personal Information */}
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
                          email: patientData?.email || user.email || ''
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
                    <div className="text-white font-medium">{user.id || 'N/A'}</div>
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
                  <div>
                    <div className="text-white/50 text-sm">Date of Birth</div>
                    <div className="text-white font-medium">{patientData?.dob || 'Not set'}</div>
                  </div>
                  <div>
                    <div className="text-white/50 text-sm">Member Since</div>
                    <div className="text-white font-medium">
                      {patientData?.created_at ? new Date(patientData.created_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Security */}
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

            {/* Notification Preferences */}
            <div className="glass-card">
              <h2 className="text-lg font-semibold text-white mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/70">Email notifications</span>
                  <input
                    type="checkbox"
                    checked={notifications.email}
                    onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                    className="w-5 h-5 rounded accent-primary-500"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/70">SMS notifications</span>
                  <input
                    type="checkbox"
                    checked={notifications.sms}
                    onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })}
                    className="w-5 h-5 rounded accent-primary-500"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/70">Browser push notifications</span>
                  <input
                    type="checkbox"
                    checked={notifications.push}
                    onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
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

      {/* Password Change Modal */}
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
    </div>
  );
}
