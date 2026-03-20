'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import { api } from '../../../lib/api';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import { VoiceCallFAB } from '@/lib/components/VoiceCallUI';

const DEPARTMENTS = [
  { code: 'MED', name: 'General Medicine', color: 'from-green-500/80 to-green-600/80' },
  { code: 'PED', name: 'Pediatrics', color: 'from-blue-500/80 to-blue-600/80' },
  { code: 'GYN', name: 'Gynecology', color: 'from-pink-500/80 to-pink-600/80' },
  { code: 'ORTHO', name: 'Orthopedics', color: 'from-purple-500/80 to-purple-600/80' },
  { code: 'DEN', name: 'Dental', color: 'from-yellow-500/80 to-yellow-600/80' },
  { code: 'OPH', name: 'Ophthalmology', color: 'from-cyan-500/80 to-cyan-600/80' },
  { code: 'CARD', name: 'Cardiology', color: 'from-red-500/80 to-red-600/80' },
  { code: 'EMER', name: 'Emergency', color: 'from-orange-500/80 to-orange-600/80' },
];

// Color mapping for departments
const DEPT_COLORS: Record<string, string> = {
  MED: 'from-green-500/80 to-green-600/80',
  PED: 'from-blue-500/80 to-blue-600/80',
  GYN: 'from-pink-500/80 to-pink-600/80',
  ORTHO: 'from-purple-500/80 to-purple-600/80',
  DEN: 'from-yellow-500/80 to-yellow-600/80',
  OPH: 'from-cyan-500/80 to-cyan-600/80',
  CARD: 'from-red-500/80 to-red-600/80',
  EMER: 'from-orange-500/80 to-orange-600/80',
};

export default function ReceptionistDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [queues, setQueues] = useState<Record<string, any>>({});
  const [departments, setDepartments] = useState<any[]>(DEPARTMENTS);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('MED');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // New patient modal state
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    name: '',
    phone: '',
    email: '',
    department: 'MED',
    priority: false,
  });
  const [registering, setRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState('');

  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferringVisit, setTransferringVisit] = useState<any>(null);
  const [transferToDept, setTransferToDept] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Fetch departments from API
  const fetchDepartments = async () => {
    try {
      const depts = await api.getDepartments?.() || await fetch('/api/departments').then(r => r.json());
      if (Array.isArray(depts) && depts.length > 0) {
        setDepartments(depts.map((d: any) => ({
          code: d.code,
          name: d.name,
          color: DEPT_COLORS[d.code] || 'from-gray-500/80 to-gray-600/80'
        })));
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'receptionist') {
      router.push('/login');
      return;
    }
    fetchDepartments();
    fetchAllQueues();
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  useEffect(() => {
    fetchAllQueues();
    // Refresh every 5 seconds for real-time synchronization
    const interval = setInterval(fetchAllQueues, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllQueues = async () => {
    try {
      // Use summary endpoint for better performance and synchronization
      const summary = await api.getQueueSummary();
      const queueMap: Record<string, any> = {};
      summary.forEach((dept: any) => {
        queueMap[dept.code] = {
          waiting: dept.waiting,
          called: dept.called,
          in_progress: dept.in_progress,
          total: dept.waiting + dept.called + dept.in_progress,
        };
      });
      setQueues(queueMap);
    } catch (error) {
      console.error('Failed to fetch queues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const results = await api.searchPatients(searchQuery);
      // Handle both wrapped and direct responses
      setSearchResults(results?.results || results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferringVisit || !transferToDept) return;

    setTransferring(true);
    try {
      await api.transferPatient(transferringVisit.id, transferToDept, user?.id);
      setShowTransferModal(false);
      setTransferringVisit(null);
      setTransferToDept('');
      fetchAllQueues();
    } catch (error) {
      console.error('Failed to transfer patient:', error);
    } finally {
      setTransferring(false);
    }
  };

  const openTransferModal = (visit: any, currentDept: string) => {
    setTransferringVisit({ ...visit, currentDept });
    setTransferToDept('');
    setShowTransferModal(true);
  };

  // Handle new patient registration
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationError('');
    setRegistrationSuccess('');
    setRegistering(true);

    try {
      // Add patient to queue
      const result = await api.addToQueue({
        name: newPatientData.name,
        phone: newPatientData.phone || undefined,
        email: newPatientData.email || undefined,
        department: newPatientData.department,
        priority: newPatientData.priority,
      });

      setRegistrationSuccess(`Patient registered! Ticket: ${result.ticket_number}, Position: ${result.position}`);
      setNewPatientData({ name: '', phone: '', email: '', department: 'MED', priority: false });
      
      // Refresh queues
      fetchAllQueues();
      
      // Close modal after short delay
      setTimeout(() => {
        setShowNewPatientModal(false);
        setRegistrationSuccess('');
      }, 3000);
    } catch (error: any) {
      console.error('Registration failed:', error);
      setRegistrationError(error.message || 'Failed to register patient');
    } finally {
      setRegistering(false);
    }
  };

  // Quick add existing patient to queue
  const handleQuickAddToQueue = async (patient: any) => {
    try {
      const dept = newPatientData.department || 'MED';
      await api.addToQueue({
        name: patient.name,
        phone: patient.phone || undefined,
        email: patient.email || undefined,
        department: dept,
        priority: false,
      });
      fetchAllQueues();
      alert('Patient added to queue!');
    } catch (error: any) {
      console.error('Failed to add to queue:', error);
      alert('Failed to add patient to queue: ' + error.message);
    }
  };

  if (!isAuthenticated || user?.role !== 'receptionist') {
    return null;
  }

  const totalWaiting = Object.values(queues).reduce((sum: any, q: any) => sum + (q?.waiting || 0), 0);
  const totalCalled = Object.values(queues).reduce((sum: any, q: any) => sum + (q?.called || 0), 0);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl">🏥</Link>
            <h1 className="text-xl font-bold text-white">Reception Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/70">
              Welcome, {user?.name}
              <span className="ml-2 px-2 py-1 bg-blue-500/20 rounded text-xs capitalize text-blue-300">
                {user?.role}
              </span>
            </span>
            {/* Quick Call Button */}
            <button
              onClick={() => {
                const event = new CustomEvent('openVoiceCall');
                window.dispatchEvent(event);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors"
              title="Call Staff"
            >
              <Phone className="w-4 h-4" />
              <span>Call</span>
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card">
            <div className="text-3xl font-bold text-blue-400">{totalWaiting}</div>
            <div className="text-white/60">Total Waiting</div>
          </div>
          <div className="glass-card">
            <div className="text-3xl font-bold text-green-400">{totalCalled}</div>
            <div className="text-white/60">Called</div>
          </div>
          <div className="glass-card">
            <div className="text-3xl font-bold text-purple-400">{DEPARTMENTS.length}</div>
            <div className="text-white/60">Departments</div>
          </div>
          <div className="glass-card">
            <button
              onClick={() => setShowNewPatientModal(true)}
              className="block text-center glass-button-primary py-2 w-full"
            >
              + Register Patient
            </button>
          </div>
        </div>

        {/* Patient Search */}
        <div className="glass-card mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Patient Search</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name, email, or phone..."
              className="glass-input flex-1"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="glass-button-primary px-6 py-2"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-4">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-white/60">Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-white/60">Email</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-white/60">Phone</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-white/60">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {searchResults.map((patient: any) => (
                    <tr key={patient.id}>
                      <td className="px-4 py-3 text-sm text-white/80">{patient.name}</td>
                      <td className="px-4 py-3 text-sm text-white/80">{patient.email || '-'}</td>
                      <td className="px-4 py-3 text-sm text-white/80">{patient.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <button 
                          onClick={() => handleQuickAddToQueue(patient)}
                          className="text-green-400 hover:text-green-300 font-medium mr-3"
                        >
                          Add to Queue
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* All Department Queues */}
        <div className="glass-card mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">All Department Queues</h2>
          
          {loading ? (
            <div className="text-center py-8 text-white/50">Loading queues...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map((dept) => {
                const queue = queues[dept.code];
                return (
                  <div
                    key={dept.code}
                    className={`bg-gradient-to-br ${dept.color} rounded-xl p-6 text-white`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">{dept.code}</h3>
                      <span className="text-white/80 text-sm">{dept.name}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-white/20 rounded-lg p-2 text-center">
                        <div className="text-xl font-bold">{queue?.in_progress || 0}</div>
                        <div className="text-xs text-white/80">Active</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-2 text-center">
                        <div className="text-xl font-bold">{queue?.waiting || 0}</div>
                        <div className="text-xs text-white/80">Waiting</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-2 text-center">
                        <div className="text-xl font-bold">{queue?.called || 0}</div>
                        <div className="text-xs text-white/80">Called</div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-white/80">
                      Total: {queue?.total || 0} patients
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => setShowNewPatientModal(true)}
            className="glass-card hover:scale-105 transition-transform text-center"
          >
            <div className="text-4xl mb-3">📝</div>
            <h3 className="text-lg font-semibold text-white">Register New Patient</h3>
            <p className="text-white/50 mt-1">Add patient to queue</p>
          </button>
          
          <Link
            href="/display"
            className="glass-card hover:scale-105 transition-transform text-center"
          >
            <div className="text-4xl mb-3">📺</div>
            <h3 className="text-lg font-semibold text-white">View Display</h3>
            <p className="text-white/50 mt-1">TV display mode</p>
          </Link>
          
          <Link
            href="/dashboard"
            className="glass-card hover:scale-105 transition-transform text-center"
          >
            <div className="text-4xl mb-3">🏠</div>
            <h3 className="text-lg font-semibold text-white">Dashboard</h3>
            <p className="text-white/50 mt-1">Main dashboard</p>
          </Link>
        </div>
      </main>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Transfer Patient</h3>
            
            <div className="mb-4">
              <div className="text-white/60 text-sm mb-1">Patient</div>
              <div className="text-white font-medium">
                {transferringVisit?.ticket_number} - {transferringVisit?.patient_name}
              </div>
            </div>
            
            <div className="mb-4">
              <div className="text-white/60 text-sm mb-1">Current Department</div>
              <div className="text-white font-medium">{transferringVisit?.currentDept}</div>
            </div>
            
            <div className="mb-4">
              <label className="text-white/70 text-sm mb-2 block">Transfer to Department</label>
              <select
                value={transferToDept}
                onChange={(e) => setTransferToDept(e.target.value)}
                className="glass-input w-full"
              >
                <option value="">Select department...</option>
                {DEPARTMENTS.filter(d => d.code !== transferringVisit?.currentDept).map((dept) => (
                  <option key={dept.code} value={dept.code}>
                    {dept.code} - {dept.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferringVisit(null);
                  setTransferToDept('');
                }}
                className="glass-button px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={!transferToDept || transferring}
                className="glass-button-primary px-4 py-2"
              >
                {transferring ? 'Transferring...' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Patient Registration Modal */}
      {showNewPatientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Register New Patient</h3>
            
            <form onSubmit={handleRegisterPatient} className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">Full Name *</label>
                <input
                  type="text"
                  value={newPatientData.name}
                  onChange={(e) => setNewPatientData({ ...newPatientData, name: e.target.value })}
                  className="glass-input w-full"
                  required
                />
              </div>
              
              <div>
                <label className="text-white/70 text-sm mb-2 block">Phone Number</label>
                <input
                  type="tel"
                  value={newPatientData.phone}
                  onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                  className="glass-input w-full"
                />
              </div>
              
              <div>
                <label className="text-white/70 text-sm mb-2 block">Email</label>
                <input
                  type="email"
                  value={newPatientData.email}
                  onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
                  className="glass-input w-full"
                />
              </div>
              
              <div>
                <label className="text-white/70 text-sm mb-2 block">Department *</label>
                <select
                  value={newPatientData.department}
                  onChange={(e) => setNewPatientData({ ...newPatientData, department: e.target.value })}
                  className="glass-input w-full"
                >
                  {departments.map((dept) => (
                    <option key={dept.code} value={dept.code}>
                      {dept.code} - {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="priority"
                  checked={newPatientData.priority}
                  onChange={(e) => setNewPatientData({ ...newPatientData, priority: e.target.checked })}
                  className="w-5 h-5"
                />
                <label htmlFor="priority" className="text-sm text-white/70">
                  Priority patient (elderly, pregnant, disabled)
                </label>
              </div>
              
              {registrationError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                  {registrationError}
                </div>
              )}
              
              {registrationSuccess && (
                <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm">
                  {registrationSuccess}
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewPatientModal(false);
                    setRegistrationError('');
                    setRegistrationSuccess('');
                  }}
                  className="glass-button px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering || !newPatientData.name}
                  className="glass-button-primary px-4 py-2"
                >
                  {registering ? 'Registering...' : 'Register & Add to Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voice Call FAB */}
      <VoiceCallFAB />
    </div>
  );
}
