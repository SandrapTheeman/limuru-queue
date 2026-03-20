'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import { api } from '../../../lib/api';
import Link from 'next/link';
import { VoiceCallFAB } from '@/lib/components/VoiceCallUI';
import { Phone } from 'lucide-react';

const DEPARTMENTS = [
  { code: 'MED', name: 'General Medicine' },
  { code: 'PED', name: 'Pediatrics' },
  { code: 'GYN', name: 'Gynecology' },
  { code: 'ORTHO', name: 'Orthopedics' },
  { code: 'DEN', name: 'Dental' },
  { code: 'OPH', name: 'Ophthalmology' },
  { code: 'CARD', name: 'Cardiology' },
  { code: 'EMER', name: 'Emergency' },
];

type DoctorStatus = 'available' | 'break' | 'emergency';

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [queueData, setQueueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('MED');
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  
  // Doctor status
  const [doctorStatus, setDoctorStatus] = useState<DoctorStatus>('available');
  
  // Patient history
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Complete visit modal with notes
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [visitNotes, setVisitNotes] = useState({
    diagnosis: '',
    prescription: '',
    doctorNotes: ''
  });
  const [completingVisit, setCompletingVisit] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'doctor' && user?.role !== 'nurse')) {
      router.push('/login');
      return;
    }
    if (user?.department) {
      setSelectedDept(user.department);
    }
    fetchQueue();
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // Refresh every 5 seconds for real-time updates
    return () => clearInterval(interval);
  }, [selectedDept]);

  const fetchQueue = async () => {
    try {
      const data = await api.getQueue(selectedDept);
      setQueueData(data);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientHistory = async (patientId: string) => {
    setLoadingHistory(true);
    setSelectedPatientId(patientId);
    try {
      const history = await api.getPatientHistory(patientId, 5, 0);
      setPatientHistory(history.visits || []);
    } catch (error) {
      console.error('Failed to fetch patient history:', error);
      setPatientHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCallPatient = async (visitId: string) => {
    setProcessing(visitId);
    try {
      await api.callPatient(visitId, user?.room || '101', user?.id || 'doctor-001');
      await fetchQueue();
    } catch (error) {
      console.error('Failed to call patient:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleStartConsultation = async (visitId: string, patientId?: string) => {
    setProcessing(visitId);
    try {
      await api.startConsultation(visitId);
      if (patientId) {
        fetchPatientHistory(patientId);
      }
      await fetchQueue();
    } catch (error) {
      console.error('Failed to start consultation:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleCompleteVisit = async () => {
    if (!selectedPatientId) return;
    
    setCompletingVisit(true);
    try {
      await api.completeVisit(selectedPatientId, visitNotes);
      setShowCompleteModal(false);
      setVisitNotes({ diagnosis: '', prescription: '', doctorNotes: '' });
      setSelectedPatientId(null);
      setPatientHistory([]);
      await fetchQueue();
    } catch (error) {
      console.error('Failed to complete visit:', error);
    } finally {
      setCompletingVisit(false);
    }
  };

  const handleMarkNoShow = async (visitId: string) => {
    setProcessing(visitId);
    try {
      await api.markNoShow(visitId);
      await fetchQueue();
    } catch (error) {
      console.error('Failed to mark no-show:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleStatusChange = async (newStatus: DoctorStatus) => {
    setDoctorStatus(newStatus);
    // API call to update doctor status would go here
  };

  if (!isAuthenticated || (user?.role !== 'doctor' && user?.role !== 'nurse')) {
    return null;
  }

  const waitingPatients = queueData?.patients?.filter((p: any) => p.status === 'waiting') || [];
  const calledPatient = queueData?.patients?.find((p: any) => p.status === 'called');
  const inProgressPatient = queueData?.patients?.find((p: any) => p.status === 'in_progress');
  
  // Filter by search query
  const filteredPatients = searchQuery 
    ? waitingPatients.filter((p: any) => 
        p.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.patient_number?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : waitingPatients;

  // Get current patient for history display
  const currentPatient = inProgressPatient || calledPatient;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl">🏥</Link>
            <h1 className="text-xl font-bold text-white">Doctor Dashboard</h1>
          </div>
          
          {/* Status Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">Status:</span>
              <button
                onClick={() => handleStatusChange('available')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  doctorStatus === 'available' 
                    ? 'bg-green-500/20 text-green-400 border border-green-400' 
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                ● Available
              </button>
              <button
                onClick={() => handleStatusChange('break')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  doctorStatus === 'break' 
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400' 
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                ⏸ Break
              </button>
              <button
                onClick={() => handleStatusChange('emergency')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  doctorStatus === 'emergency' 
                    ? 'bg-red-500/20 text-red-400 border border-red-400' 
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                ⚡ Emergency
              </button>
            </div>
            <span className="text-sm text-white/70">
              Dr. {user?.name} | Room {user?.room || 'N/A'}
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
        {/* Department Selector */}
        <div className="mb-6">
          <label className="text-white/70 text-sm mb-2 block">
            Select Department
          </label>
          <div className="flex gap-2 flex-wrap">
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept.code}
                onClick={() => {
                  setSelectedDept(dept.code);
                  setLoading(true);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedDept === dept.code
                    ? 'bg-blue-500 text-white'
                    : 'glass-button text-sm'
                }`}
              >
                {dept.code} - {dept.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Patient */}
          <div className="lg:col-span-2">
            <div className="glass-card">
              <h2 className="text-lg font-semibold text-white mb-4">Current Patient</h2>
              
              {loading ? (
                <div className="text-center py-8 text-white/50">Loading...</div>
              ) : inProgressPatient ? (
                <div className="bg-green-500/20 rounded-lg p-6 border border-green-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-white/60 text-sm">Ticket Number</div>
                      <div className="text-5xl font-bold text-green-400">
                        {inProgressPatient.ticket_number}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
                        In Progress
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-xl font-semibold text-white mb-4">
                    {inProgressPatient.patient_name}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-white/50 text-sm">Wait Time</div>
                      <div className="font-semibold text-white">{inProgressPatient.wait_time} min</div>
                    </div>
                    <div>
                      <div className="text-white/50 text-sm">Position</div>
                      <div className="font-semibold text-white">#{inProgressPatient.position}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedPatientId(inProgressPatient.id);
                        fetchPatientHistory(inProgressPatient.patient_id);
                        setShowCompleteModal(true);
                      }}
                      className="flex-1 bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition"
                    >
                      Complete Visit
                    </button>
                    <button
                      onClick={() => handleMarkNoShow(inProgressPatient.id)}
                      disabled={processing === inProgressPatient.id}
                      className="px-4 py-3 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition disabled:opacity-50"
                    >
                      No Show
                    </button>
                  </div>
                </div>
              ) : calledPatient ? (
                <div className="bg-blue-500/20 rounded-lg p-6 border border-blue-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-white/60 text-sm">Ticket Number</div>
                      <div className="text-5xl font-bold text-blue-400">
                        {calledPatient.ticket_number}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-medium">
                        Called
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-xl font-semibold text-white mb-4">
                    {calledPatient.patient_name}
                  </div>
                  
                  <button
                    onClick={() => handleStartConsultation(calledPatient.id, calledPatient.patient_id)}
                    disabled={processing === calledPatient.id}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50"
                  >
                    {processing === calledPatient.id ? 'Processing...' : 'Start Consultation'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-white/50">
                  No patient currently called
                </div>
              )}
            </div>

            {/* Patient History Section */}
            {selectedPatientId && (
              <div className="glass-card mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-white">Patient History</h2>
                  <button 
                    onClick={() => {
                      setSelectedPatientId(null);
                      setPatientHistory([]);
                    }}
                    className="text-sm text-white/40 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                
                {loadingHistory ? (
                  <div className="text-center py-4 text-white/50">Loading history...</div>
                ) : patientHistory.length === 0 ? (
                  <div className="text-center py-4 text-white/50">No previous visits</div>
                ) : (
                  <div className="space-y-3">
                    {patientHistory.map((visit) => (
                      <div key={visit.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">{new Date(visit.created_at).toLocaleDateString()}</span>
                          <span className="text-white/40">{visit.department}</span>
                        </div>
                        {visit.diagnosis && (
                          <div className="mt-2 text-sm text-white/80">
                            <span className="text-white/50">Diagnosis:</span> {visit.diagnosis}
                          </div>
                        )}
                        {visit.prescription && (
                          <div className="mt-1 text-sm text-white/80">
                            <span className="text-white/50">Rx:</span> {visit.prescription}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Waiting Queue - Scrollable */}
          <div className="glass-card flex flex-col" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            {/* Search Input */}
            <div className="mb-3 shrink-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ticket, name, or patient number..."
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-primary-500"
              />
              {searchQuery && (
                <div className="mt-1 text-xs text-white/50">
                  Found {filteredPatients.length} of {waitingPatients.length} patients
                </div>
              )}
            </div>
            
            {/* Header Stats */}
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h2 className="text-lg font-semibold text-white">Waiting Queue</h2>
              <div className="flex gap-3 text-sm">
                <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                  {waitingPatients.length} waiting
                </span>
                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                  ~{waitingPatients.length * 15} min
                </span>
              </div>
            </div>
            
            {filteredPatients.length === 0 ? (
              <div className="text-center py-4 text-white/50">
                {searchQuery ? 'No patients match your search' : 'No patients waiting'}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {filteredPatients.map((patient: any) => (
                  <div
                    key={patient.id}
                    className={`border rounded-lg p-2.5 shrink-0 ${
                      patient.priority ? 'border-yellow-400/50 bg-yellow-500/10' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg font-bold text-white">{patient.ticket_number}</span>
                      {patient.priority && (
                        <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                          !
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-white text-sm">{patient.patient_name}</div>
                    <div className="text-xs text-white/50 mb-2">
                      {patient.wait_time}min | #{patient.position}
                    </div>
                    <button
                      onClick={() => handleCallPatient(patient.id)}
                      disabled={processing === patient.id || doctorStatus === 'break'}
                      className="w-full bg-blue-500 text-white py-1 rounded text-sm font-medium hover:bg-blue-600 transition disabled:opacity-50"
                    >
                      {processing === patient.id ? '...' : 'Call'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Complete Visit Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">Complete Visit</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">Diagnosis</label>
                <input
                  type="text"
                  value={visitNotes.diagnosis}
                  onChange={(e) => setVisitNotes({ ...visitNotes, diagnosis: e.target.value })}
                  className="glass-input w-full"
                  placeholder="Enter diagnosis..."
                />
              </div>
              
              <div>
                <label className="text-white/70 text-sm mb-2 block">Prescription</label>
                <textarea
                  value={visitNotes.prescription}
                  onChange={(e) => setVisitNotes({ ...visitNotes, prescription: e.target.value })}
                  className="glass-input w-full h-24 resize-none"
                  placeholder="Enter prescription..."
                />
              </div>
              
              <div>
                <label className="text-white/70 text-sm mb-2 block">Doctor's Notes</label>
                <textarea
                  value={visitNotes.doctorNotes}
                  onChange={(e) => setVisitNotes({ ...visitNotes, doctorNotes: e.target.value })}
                  className="glass-input w-full h-24 resize-none"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setVisitNotes({ diagnosis: '', prescription: '', doctorNotes: '' });
                }}
                className="glass-button px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteVisit}
                disabled={completingVisit}
                className="glass-button-primary px-4 py-2"
              >
                {completingVisit ? 'Completing...' : 'Complete Visit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Call FAB */}
      <VoiceCallFAB />
    </div>
  );
}
