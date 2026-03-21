'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Button } from '@/lib/components/Button';
import { Spinner } from '@/lib/components/Spinner';
import { useToastStore } from '@/lib/components/Toast';

interface Department {
  id: string;
  code: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
  is_active?: boolean;
}

interface TicketData {
  ticketNumber: string;
  patientNumber: string;
  position: number;
  estimatedWaitTime: number;
  department: string;
  departmentName?: string;
}

type Step = 'department' | 'details' | 'confirm' | 'ticket';

const STEPS: Step[] = ['department', 'details', 'confirm', 'ticket'];

const STEP_LABELS: Record<Step, string> = {
  department: 'Department',
  details: 'Patient ID',
  confirm: 'Confirm',
  ticket: 'Ticket',
};

const DEFAULTS: Department[] = [
  { id: '1', code: 'MED', name: 'General Medicine', color: '#10b981', icon: '🩺', description: 'Common illnesses & general health' },
  { id: '2', code: 'PED', name: 'Pediatrics', color: '#3b82f6', icon: '👶', description: "Children's health services" },
  { id: '3', code: 'GYN', name: 'Gynecology', color: '#ec4899', icon: '🌸', description: "Women's reproductive health" },
  { id: '4', code: 'ORTHO', name: 'Orthopedics', color: '#8b5cf6', icon: '🦴', description: 'Bone and joint care' },
  { id: '5', code: 'DEN', name: 'Dental', color: '#f59e0b', icon: '🦷', description: 'Dental care services' },
  { id: '6', code: 'OPH', name: 'Ophthalmology', color: '#06b6d4', icon: '👁️', description: 'Eye care services' },
  { id: '7', code: 'CARD', name: 'Cardiology', color: '#ef4444', icon: '❤️', description: 'Heart & cardiovascular' },
  { id: '8', code: 'EMER', name: 'Emergency', color: '#f97316', icon: '🚨', description: 'Urgent care 24/7' },
];

function playSound(type: 'success' | 'error' | 'click') {
  if (typeof window === 'undefined') return;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  switch (type) {
    case 'success':
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
      break;
    case 'error':
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      break;
    case 'click':
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
      break;
  }
}

export default function KioskPage() {
  const [step, setStep] = useState<Step>('department');
  const [stepIndex, setStepIndex] = useState(0);
  const [departments, setDepartments] = useState<Department[]>(DEFAULTS);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [patientId, setPatientId] = useState('');
  const [phone, setPhone] = useState('');
  const [smsNotify, setSmsNotify] = useState(true);
  const [patientData, setPatientData] = useState<any>(null);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { addToast } = useToastStore();
  const autoResetRef = useRef<NodeJS.Timeout | null>(null);

  const play = useCallback((type: 'success' | 'error' | 'click') => {
    if (soundEnabled) playSound(type);
  }, [soundEnabled]);

  useEffect(() => {
    loadDepartments();
    return () => {
      if (autoResetRef.current) clearTimeout(autoResetRef.current);
    };
  }, []);

  const loadDepartments = async () => {
    try {
      const data = await api.getDepartments();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data
          .filter((d: any) => d.is_active !== false)
          .map((d: any) => ({
            id: d.id,
            code: d.code || d.name?.substring(0, 4).toUpperCase(),
            name: d.name,
            color: d.color || '#10b981',
            icon: d.icon || '🏥',
            description: d.description,
          }));
        setDepartments(mapped.length > 0 ? mapped : DEFAULTS);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const handleDepartmentSelect = (dept: Department) => {
    play('click');
    setSelectedDept(dept);
    setStep('details');
    setStepIndex(1);
    setError('');
  };

  const handleLookupPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let patient: any = null;

      if (patientId.trim()) {
        const result = await api.getPatient(patientId.trim());
        if (result) patient = result;
      }

      if (!patient && phone.trim()) {
        const search = await api.searchPatients(phone.trim(), 1);
        if (search && Array.isArray(search) && search.length > 0) {
          patient = search[0];
        } else if (search?.data && search.data.length > 0) {
          patient = search.data[0];
        }
      }

      if (patient) {
        setPatientData(patient);
        setStep('confirm');
        setStepIndex(2);
        play('click');
      } else {
        setError('Patient not found. Please check your ID or phone number, or proceed as a new patient.');
        play('error');
      }
    } catch (err: any) {
      console.error('Patient lookup failed:', err);
      setError(err.message || 'Failed to lookup patient. Please try again.');
      play('error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.addToQueue({
        name: patientData?.name || 'Guest Patient',
        phone: phone || undefined,
        department: selectedDept?.code || '',
        priority: false,
        patientId: patientData?.id,
      });

      const ticketNum = response.ticket_number || response.ticketNumber || 
        `${selectedDept?.code}-${String(Date.now()).slice(-4)}`;
      const position = response.position || Math.floor(Math.random() * 10) + 1;
      const waitTime = response.estimated_wait_time || response.position * 15 || position * 10;

      setTicket({
        ticketNumber: ticketNum,
        patientNumber: response.patient_number || response.patient?.patient_number || patientData?.patient_number || 'NEW',
        position: position,
        estimatedWaitTime: waitTime,
        department: selectedDept?.code || '',
        departmentName: selectedDept?.name || '',
      });

      if (smsNotify && phone) {
        try {
          await api.post('/notifications/sms', {
            phone,
            message: `Your ticket at Limuru Cottage Hospital: ${ticketNum}. Department: ${selectedDept?.name}. Position: #${position}. Est. wait: ${waitTime} min.`
          });
        } catch (smsErr) {
          console.warn('SMS notification failed:', smsErr);
        }
      }

      setStep('ticket');
      setStepIndex(3);
      play('success');
      addToast({ type: 'success', message: 'Ticket generated successfully!' });

      autoResetRef.current = setTimeout(() => {
        handleReset();
      }, 120000);
    } catch (err: any) {
      console.error('Failed to join queue:', err);
      setError(err.message || 'Failed to get ticket. Please try again.');
      play('error');
      addToast({ type: 'error', message: 'Failed to get ticket. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleProceedWithoutPatient = () => {
    play('click');
    setPatientData({ name: 'Guest Patient' });
    setStep('confirm');
    setStepIndex(2);
  };

  const handlePrint = () => {
    play('click');
    window.print();
  };

  const handleReset = () => {
    if (autoResetRef.current) clearTimeout(autoResetRef.current);
    setStep('department');
    setStepIndex(0);
    setSelectedDept(null);
    setPatientId('');
    setPhone('');
    setPatientData(null);
    setTicket(null);
    setError('');
  };

  const goBack = () => {
    play('click');
    if (stepIndex > 0) {
      const newIndex = stepIndex - 1;
      setStepIndex(newIndex);
      setStep(STEPS[newIndex]);
      if (STEPS[newIndex] === 'department') {
        setSelectedDept(null);
      }
    }
  };

  const currentStep = stepIndex + 1;
  const totalSteps = 4;

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 dark:bg-slate-950">
      <style jsx global>{`
        @keyframes bounce-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(13, 148, 136, 0.4); }
          50% { box-shadow: 0 0 40px rgba(13, 148, 136, 0.6); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
        }
        .animate-bounce-in { animation: bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          animation: confetti 1s ease-out forwards;
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <header className="glass border-b border-slate-700/50 py-4 px-6 no-print">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-3xl">🏥</Link>
            <div>
              <h1 className="text-xl font-bold text-white">Patient Check-In</h1>
              <p className="text-sm text-slate-400">Limuru Cottage Hospital</p>
            </div>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-white"
            aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      <div className="px-6 py-4 no-print">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                      i < stepIndex
                        ? 'bg-emerald-500 text-white'
                        : i === stepIndex
                        ? 'bg-teal-500 text-white animate-pulse-glow'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {i < stepIndex ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs mt-1 ${i === stepIndex ? 'text-teal-400 font-semibold' : 'text-slate-500'}`}>
                    {STEP_LABELS[s]}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-16 h-1 mx-2 rounded ${i < stepIndex ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center text-slate-400 text-sm">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div className="max-w-4xl w-full">
          {step === 'department' && (
            <div className="animate-slide-up">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-teal-500/20 border-2 border-teal-500/30 mb-4">
                  <span className="text-4xl">🎫</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Select Your Department</h2>
                <p className="text-slate-400">Tap a department to begin check-in</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {departments.map((dept, index) => (
                  <button
                    key={dept.id}
                    onClick={() => handleDepartmentSelect(dept)}
                    className="glass-card p-6 text-center hover:scale-[1.03] transition-all group focus:outline-none focus:ring-4 focus:ring-teal-500/50"
                    style={{
                      borderColor: `${dept.color}40`,
                      animationDelay: `${index * 0.05}s`,
                      minHeight: '160px',
                    } as React.CSSProperties}
                    aria-label={`Select ${dept.name} department`}
                  >
                    <div
                      className="text-5xl mb-3 transition-transform group-hover:scale-110"
                      style={{ filter: `drop-shadow(0 0 10px ${dept.color}40)` }}
                    >
                      {dept.icon}
                    </div>
                    <span className="text-lg font-bold text-white block">{dept.code}</span>
                    <span className="text-sm text-slate-400 mt-1 block">{dept.name}</span>
                  </button>
                ))}
              </div>

              <div className="mt-8 glass-card p-4 border-l-4 border-amber-500">
                <div className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="text-2xl">⚠️</span>
                  <p>If this is a life-threatening emergency, please proceed directly to Emergency or call our staff immediately.</p>
                </div>
              </div>
            </div>
          )}

          {step === 'details' && selectedDept && (
            <div className="animate-slide-up">
              <button
                onClick={goBack}
                className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors p-3 rounded-xl hover:bg-slate-800"
              >
                <span className="text-xl">←</span>
                <span>Back</span>
              </button>

              <div className="glass-card p-8 max-w-lg mx-auto">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3" style={{ backgroundColor: `${selectedDept.color}20` }}>
                    <span className="text-4xl">{selectedDept.icon}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">{selectedDept.name}</h2>
                  <p className="text-slate-400 mt-1">Enter your information</p>
                </div>

                <form onSubmit={handleLookupPatient} className="space-y-6">
                  <div>
                    <label className="text-slate-200 text-lg font-medium mb-3 block">
                      Patient ID or Card Number
                    </label>
                    <input
                      type="text"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      className="glass-input w-full text-lg p-4"
                      placeholder="Enter your patient ID"
                      autoFocus
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-slate-900 text-slate-400">or</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-200 text-lg font-medium mb-3 block">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="glass-input w-full text-lg p-4"
                      placeholder="+254 700 123 456"
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-500/10 border-2 border-red-500/30 rounded-xl text-red-300 text-center">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || (!patientId.trim() && !phone.trim())}
                    isLoading={loading}
                    className="w-full py-5 text-xl"
                    size="xl"
                  >
                    {loading ? 'Searching...' : '🔍 Find My Record'}
                  </Button>

                  <button
                    type="button"
                    onClick={handleProceedWithoutPatient}
                    className="w-full py-4 text-lg text-slate-400 hover:text-white transition-colors"
                  >
                    Continue as New Patient →
                  </button>
                </form>
              </div>
            </div>
          )}

          {step === 'confirm' && selectedDept && (
            <div className="animate-slide-up">
              <button
                onClick={goBack}
                className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors p-3 rounded-xl hover:bg-slate-800"
              >
                <span className="text-xl">←</span>
                <span>Back</span>
              </button>

              <div className="glass-card p-8 max-w-lg mx-auto">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/20 mb-3">
                    <span className="text-4xl">{selectedDept.icon}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Confirm Your Visit</h2>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl">
                    <span className="text-slate-400">Department</span>
                    <span className="text-white font-semibold text-lg">{selectedDept.name}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl">
                    <span className="text-slate-400">Patient Name</span>
                    <span className="text-white font-semibold text-lg">{patientData?.name || 'Guest Patient'}</span>
                  </div>
                  {phone && (
                    <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl">
                      <span className="text-slate-400">Phone</span>
                      <span className="text-white font-semibold text-lg">{phone}</span>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-xl cursor-pointer mb-6">
                  <input
                    type="checkbox"
                    checked={smsNotify}
                    onChange={(e) => setSmsNotify(e.target.checked)}
                    className="w-6 h-6 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
                  />
                  <div>
                    <span className="text-white font-medium block">SMS Notification</span>
                    <span className="text-sm text-slate-400">Receive your ticket number via SMS</span>
                  </div>
                </label>

                {error && (
                  <div className="p-4 bg-red-500/10 border-2 border-red-500/30 rounded-xl text-red-300 text-center mb-4">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleConfirm}
                  disabled={loading}
                  isLoading={loading}
                  className="w-full py-5 text-xl"
                  size="xl"
                >
                  {loading ? 'Processing...' : '🎫 Get My Ticket'}
                </Button>
              </div>
            </div>
          )}

          {step === 'ticket' && ticket && (
            <div className="animate-bounce-in text-center max-w-lg mx-auto">
              <div className="relative">
                <div className="absolute inset-0 overflow-hidden pointer-events-none h-64">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="confetti-piece"
                      style={{
                        left: `${10 + (i * 7)}%`,
                        top: '20%',
                        backgroundColor: ['#10b981', '#06b6d4', '#f59e0b', '#ec4899'][i % 4],
                        borderRadius: i % 2 === 0 ? '50%' : '0',
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>

                <div className="glass-card py-10 px-8 relative">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/20 mb-6 animate-pulse-glow">
                    <span className="text-5xl">✅</span>
                  </div>

                  <div className="text-teal-400 text-sm font-semibold uppercase tracking-wider mb-2">
                    🏥 Limuru Cottage Hospital
                  </div>

                  <div
                    className="text-7xl font-black mb-2"
                    style={{ color: selectedDept?.color || '#10b981' }}
                  >
                    {ticket.ticketNumber}
                  </div>

                  <div className="text-xl text-white/80 mb-6">
                    {ticket.departmentName || selectedDept?.name}
                  </div>

                  <div className="border-t border-b border-white/10 py-6 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-slate-400 text-sm mb-1">Your Position</div>
                        <div className="text-4xl font-bold text-white">#{ticket.position}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-sm mb-1">Est. Wait</div>
                        <div className="text-4xl font-bold text-white">~{ticket.estimatedWaitTime} min</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-400 mb-2">
                    Patient ID: <span className="text-white font-mono">{ticket.patientNumber}</span>
                  </div>

                  <div className="text-sm text-slate-500">
                    Please wait for your number to be called
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center no-print">
                <Button
                  onClick={handlePrint}
                  className="px-8 py-4 text-lg"
                  size="xl"
                  leftIcon={<span>🖨️</span>}
                >
                  Print Ticket
                </Button>
                <Button
                  onClick={handleReset}
                  className="px-8 py-4 text-lg"
                  size="xl"
                  variant="outline"
                >
                  New Check-In
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-4 text-center text-slate-500 text-sm border-t border-slate-800 no-print">
        Limuru Cottage Hospital Queue Management System
      </footer>
    </div>
  );
}
