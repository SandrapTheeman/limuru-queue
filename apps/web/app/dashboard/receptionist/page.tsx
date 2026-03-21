'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import { api } from '../../../lib/api';
import Link from 'next/link';
import { Phone, Search, Plus, RotateCcw, AlertCircle } from 'lucide-react';
import { VoiceCallFAB } from '@/lib/components/VoiceCallUI';
import { OfflineBanner } from '@/lib/hooks/useOfflineStatus';
import { useToast, useConfirmDialog } from '@/lib/components';
import { validationRules, FormFieldError, FormFieldLabel } from '@/lib/hooks/useFormValidation';
import { useFormValidation } from '@/lib/hooks/useFormValidation';
import { SkeletonPatientCard, CodeBlueButton, EmergencyOverride } from '@/lib/components';

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
  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [queues, setQueues] = useState<Record<string, any>>({});
  const [departments, setDepartments] = useState<any[]>(DEPARTMENTS);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('MED');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);

  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const { fields, handleChange, handleBlur, reset, isValid: formIsValid } = useFormValidation({
    name: [validationRules.required('Full name is required')],
    phone: [validationRules.phone('Please enter a valid phone number')],
    email: [validationRules.email('Please enter a valid email address')],
    department: [validationRules.required('Please select a department')],
  }, {
    initialValues: {
      name: '',
      phone: '',
      email: '',
      department: 'MED',
    },
  });

  const [registering, setRegistering] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferringVisit, setTransferringVisit] = useState<any>(null);
  const [transferToDept, setTransferToDept] = useState('');
  const [transferring, setTransferring] = useState(false);

  const [cancelledVisits, setCancelledVisits] = useState<Record<string, { visit: any; timeout: NodeJS.Timeout }>>({});

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
    const interval = setInterval(fetchAllQueues, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllQueues = async () => {
    try {
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
      setSearchResults(results?.results || results || []);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed. Please try again.');
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
      toast.success('Patient transferred successfully');
    } catch (error) {
      console.error('Failed to transfer patient:', error);
      toast.error('Failed to transfer patient');
    } finally {
      setTransferring(false);
    }
  };

  const openTransferModal = (visit: any, currentDept: string) => {
    setTransferringVisit({ ...visit, currentDept });
    setTransferToDept('');
    setShowTransferModal(true);
  };

  const handleCancelVisit = async (visitId: string, visitData: any) => {
    const confirmed = await confirm({
      title: 'Cancel Patient Visit?',
      message: 'Are you sure you want to cancel this patient visit? This action can be undone within 30 seconds.',
      confirmText: 'Cancel Visit',
      cancelText: 'Keep in Queue',
      variant: 'danger',
      showUndo: true,
      onUndo: () => {
        const pending = cancelledVisits[visitId];
        if (pending) {
          clearTimeout(pending.timeout);
          setCancelledVisits((prev) => {
            const { [visitId]: _, ...rest } = prev;
            return rest;
          });
          toast.info('Visit cancellation undone');
        }
      },
    });

    if (confirmed) {
      try {
        await (api as any).cancelVisit?.(visitId);
        toast.success('Visit cancelled. Undo available for 30 seconds.', {
          action: {
            label: 'Undo',
            onClick: () => {
              const pending = cancelledVisits[visitId];
              if (pending) {
                clearTimeout(pending.timeout);
                setCancelledVisits((prev) => {
                  const { [visitId]: _, ...rest } = prev;
                  return rest;
                });
                toast.info('Visit cancellation undone');
              }
            },
          },
        });

        const timeout = setTimeout(async () => {
          setCancelledVisits((prev) => {
            const { [visitId]: _, ...rest } = prev;
            return rest;
          });
          await (api as any).deleteVisit?.(visitId);
        }, 30000);

        setCancelledVisits((prev) => ({
          ...prev,
          [visitId]: { visit: visitData, timeout },
        }));

        fetchAllQueues();
      } catch (error) {
        console.error('Failed to cancel visit:', error);
        toast.error('Failed to cancel visit');
      }
    }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);

    try {
      const result = await api.addToQueue({
        name: fields.name.value,
        phone: fields.phone.value || undefined,
        email: fields.email.value || undefined,
        department: fields.department.value,
        priority: false,
      });

      toast.success(`Patient registered! Ticket: ${result.ticket_number}, Position: ${result.position}`);
      reset({
        name: '',
        phone: '',
        email: '',
        department: 'MED',
      });
      setShowNewPatientModal(false);
      fetchAllQueues();
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast.error(error.message || 'Failed to register patient');
    } finally {
      setRegistering(false);
    }
  };

  const handleQuickAddToQueue = async (patient: any) => {
    try {
      await api.addToQueue({
        name: patient.name,
        phone: patient.phone || undefined,
        email: patient.email || undefined,
        department: fields.department.value || 'MED',
        priority: false,
      });
      fetchAllQueues();
      toast.success('Patient added to queue!');
    } catch (error: any) {
      console.error('Failed to add to queue:', error);
      toast.error('Failed to add patient: ' + error.message);
    }
  };

  const handleEmergencyActivate = async (patientId: string, reason: string, room?: string) => {
    try {
      await (api as any).emergencyOverride?.(patientId, reason, room);
      toast.success('CODE BLUE activated! Emergency alerts sent.');
      fetchAllQueues();
    } catch (error: any) {
      console.error('Failed to activate emergency:', error);
      toast.error('Failed to activate emergency protocol');
      throw error;
    }
  };

  if (!isAuthenticated || user?.role !== 'receptionist') {
    return null;
  }

  const totalWaiting = Object.values(queues).reduce((sum: any, q: any) => sum + (q?.waiting || 0), 0);
  const totalCalled = Object.values(queues).reduce((sum: any, q: any) => sum + (q?.called || 0), 0);

  return (
    <div className="min-h-screen">
      <OfflineBanner />
      <ConfirmDialog />

      <header className="glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl">🏥</Link>
            <h1 className="text-xl font-bold text-white">Reception Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <CodeBlueButton variant="icon" onClick={() => setShowEmergency(true)} />
            <span className="text-sm text-white/70">
              Welcome, {user?.name}
              <span className="ml-2 px-2 py-1 bg-blue-500/20 rounded text-xs capitalize text-blue-300">
                {user?.role}
              </span>
            </span>
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

        <div className="glass-card mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Patient Search</h2>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name, email, or phone..."
                className="glass-input pl-10"
              />
            </div>
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
              {searching ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3].map((i) => (
                    <SkeletonPatientCard key={i} />
                  ))}
                </div>
              ) : (
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
              )}
            </div>
          )}
        </div>

        <div className="glass-card mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">All Department Queues</h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-40 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => setShowNewPatientModal(true)}
            className="glass-card hover:scale-105 transition-transform text-center"
          >
            <div className="text-4xl mb-3"><Plus className="w-12 h-12 mx-auto text-primary-400" /></div>
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

      {showNewPatientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Register New Patient</h3>

            <form onSubmit={handleRegisterPatient} className="space-y-4">
              <div>
                <FormFieldLabel htmlFor="name" required>Full Name *</FormFieldLabel>
                <input
                  id="name"
                  type="text"
                  value={fields.name.value}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  className={`glass-input w-full ${fields.name.error ? 'border-error-500' : ''}`}
                  aria-invalid={!!fields.name.error}
                  aria-describedby={fields.name.error ? 'name-error' : undefined}
                />
                <FormFieldError error={fields.name.error} />
              </div>

              <div>
                <FormFieldLabel htmlFor="phone">Phone Number</FormFieldLabel>
                <input
                  id="phone"
                  type="tel"
                  value={fields.phone.value}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  placeholder="+254..."
                  className={`glass-input w-full ${fields.phone.error ? 'border-error-500' : ''}`}
                />
                <FormFieldError error={fields.phone.error} />
              </div>

              <div>
                <FormFieldLabel htmlFor="email">Email</FormFieldLabel>
                <input
                  id="email"
                  type="email"
                  value={fields.email.value}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="your.email@example.com"
                  className={`glass-input w-full ${fields.email.error ? 'border-error-500' : ''}`}
                />
                <FormFieldError error={fields.email.error} />
              </div>

              <div>
                <FormFieldLabel htmlFor="department" required>Department *</FormFieldLabel>
                <select
                  id="department"
                  value={fields.department.value}
                  onChange={(e) => handleChange('department', e.target.value)}
                  className="glass-input w-full"
                >
                  {departments.map((dept) => (
                    <option key={dept.code} value={dept.code}>
                      {dept.code} - {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewPatientModal(false);
                    reset();
                  }}
                  className="glass-button px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering || !formIsValid}
                  className="glass-button-primary px-4 py-2"
                >
                  {registering ? 'Registering...' : 'Register & Add to Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <EmergencyOverride
        isOpen={showEmergency}
        onClose={() => setShowEmergency(false)}
        onActivate={handleEmergencyActivate}
        waitingPatients={[]}
        loading={loading}
      />

      <VoiceCallFAB />
    </div>
  );
}
