'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Button } from '@/lib/components/Button';
import { Spinner } from '@/lib/components/Spinner';
import { useToastStore } from '@/lib/components/Toast';

const DEPARTMENTS = [
  { code: 'MED', name: 'General Medicine', color: '#10b981', icon: '🩺', description: 'Common illnesses & general health' },
  { code: 'PED', name: 'Pediatrics', color: '#3b82f6', icon: '👶', description: 'Children\'s health services' },
  { code: 'GYN', name: 'Gynecology', color: '#ec4899', icon: '🌸', description: 'Women\'s reproductive health' },
  { code: 'ORTHO', name: 'Orthopedics', color: '#8b5cf6', icon: '🦴', description: 'Bone and joint care' },
  { code: 'DEN', name: 'Dental', color: '#f59e0b', icon: '🦷', description: 'Dental care services' },
  { code: 'OPH', name: 'Ophthalmology', color: '#06b6d4', icon: '👁️', description: 'Eye care services' },
  { code: 'CARD', name: 'Cardiology', color: '#ef4444', icon: '❤️', description: 'Heart & cardiovascular' },
  { code: 'EMER', name: 'Emergency', color: '#f97316', icon: '🚨', description: 'Urgent care 24/7' },
];

export default function KioskPage() {
  const [step, setStep] = useState<'department' | 'details' | 'ticket'>('department');
  const [selectedDept, setSelectedDept] = useState<(typeof DEPARTMENTS)[0] | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [priority, setPriority] = useState(false);
  const [ticket, setTicket] = useState<{
    ticketNumber: string;
    patientNumber: string;
    position: number;
    estimatedWaitTime: number;
    department: string
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTouched, setIsTouched] = useState(false);
  const { addToast } = useToastStore();

  const handleDepartmentSelect = (dept: (typeof DEPARTMENTS)[0]) => {
    setSelectedDept(dept);
    setStep('details');
    setIsTouched(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Call the real API
      const response = await api.addToQueue({
        name: name,
        phone: phone,
        email: email || undefined,
        department: selectedDept?.code || '',
        priority: priority,
      });

      setTicket({
        ticketNumber: response.ticket_number,
        patientNumber: response.patient?.patient_number || response.patient_number,
        position: response.position,
        estimatedWaitTime: response.position * 15,
        department: selectedDept?.code || '',
      });
      setStep('ticket');
      addToast({ type: 'success', message: 'Ticket generated successfully!' });
    } catch (err: any) {
      console.error('Failed to join queue:', err);
      setError(err.message || 'Failed to get ticket. Please try again.');
      addToast({ type: 'error', message: 'Failed to get ticket. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleNewTicket = () => {
    setStep('department');
    setSelectedDept(null);
    setName('');
    setPhone('');
    setEmail('');
    setPriority(false);
    setTicket(null);
    setError('');
    setIsTouched(false);
  };

  // Department Selection Screen
  if (step === 'department') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900">
        {/* Header */}
        <div className="glass border-b border-slate-700/50 py-4 px-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-2xl">🏥</Link>
              <div>
                <h1 className="text-lg font-bold text-white">Patient Registration</h1>
                <p className="text-xs text-slate-400">Limuru Cottage Hospital</p>
              </div>
            </div>
            <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            <div className="text-center mb-8 animate-slide-up">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/30 mb-4">
                <span className="text-3xl">🎫</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Get Your Queue Ticket</h2>
              <p className="text-slate-400">Select your department to begin</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              {DEPARTMENTS.map((dept, index) => (
                <button
                  key={dept.code}
                  onClick={() => handleDepartmentSelect(dept)}
                  className="glass-card p-6 text-center hover:scale-[1.03] transition-all group"
                  style={{ 
                    borderColor: `${dept.color}40`,
                    animationDelay: `${index * 0.05}s`,
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

            {/* Info Banner */}
            <div className="mt-8 glass-card p-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span className="text-2xl">💡</span>
                <p>If this is an emergency, please proceed directly to the Emergency department or contact our staff immediately.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Patient Details Form
  if (step === 'details' && selectedDept) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900">
        {/* Header */}
        <div className="glass border-b border-slate-700/50 py-4 px-6">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <button
              onClick={() => setStep('department')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <span>←</span>
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selectedDept.icon}</span>
              <span className="font-semibold text-white">{selectedDept.name}</span>
            </div>
            <div className="w-16"></div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="px-4 pt-6">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-sm font-bold">1</div>
                <span className="text-sm text-teal-400">Department</span>
              </div>
              <div className="w-12 h-0.5 bg-teal-500"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-sm font-bold">2</div>
                <span className="text-sm text-teal-400">Details</span>
              </div>
              <div className="w-12 h-0.5 bg-slate-700"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm font-bold">3</div>
                <span className="text-sm text-slate-500">Ticket</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full animate-slide-up">
            <div className="glass-card p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3" style={{ backgroundColor: `${selectedDept.color}20` }}>
                  <span className="text-4xl">{selectedDept.icon}</span>
                </div>
                <h2 className="text-xl font-bold text-white">Your Information</h2>
                <p className="text-sm text-slate-400 mt-1">Please provide your details</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="glass-input w-full"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="glass-input w-full"
                    placeholder="+254 700 123 456"
                  />
                </div>

                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input w-full"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="glass-card p-4 bg-slate-800/30">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      id="priority"
                      checked={priority}
                      onChange={(e) => setPriority(e.target.checked)}
                      className="w-5 h-5 mt-0.5 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
                    />
                    <div>
                      <span className="text-white font-medium">Priority Patient</span>
                      <p className="text-sm text-slate-400 mt-0.5">
                        Check this if you are elderly (65+), pregnant, or have a disability
                      </p>
                    </div>
                  </label>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !name.trim()}
                  isLoading={loading}
                  className="w-full py-4 text-lg"
                  size="xl"
                >
                  {loading ? 'Processing...' : '🎫 Get Ticket'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Ticket Success Screen
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900">
      {/* Confetti Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-teal-500 rounded-full animate-ping opacity-20"></div>
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-20" style={{ animationDelay: '0.3s' }}></div>
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-cyan-500 rounded-full animate-ping opacity-20" style={{ animationDelay: '0.6s' }}></div>
      </div>

      <div className="text-center max-w-md w-full animate-slide-up">
        <div className="glass-card py-10 px-8">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 mb-6 animate-bounce-in">
            <span className="text-4xl">✅</span>
          </div>

          <div className="text-teal-400 text-sm font-semibold uppercase tracking-wider mb-2">
            🏥 Limuru Cottage Hospital
          </div>

          {/* Ticket Number */}
          <div 
            className="text-7xl font-black mb-2 animate-bounce-in"
            style={{ 
              color: selectedDept?.color || '#10b981',
              animationDelay: '0.2s',
            } as React.CSSProperties}
          >
            {ticket?.ticketNumber}
          </div>

          <div className="text-xl text-white/80 mb-6">
            {selectedDept?.name}
          </div>
          
          {/* Ticket Details */}
          <div className="border-t border-b border-white/10 py-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400">Your Position</span>
              <span className="text-3xl font-bold text-white">#{ticket?.position}</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400">Estimated Wait</span>
              <span className="text-xl font-semibold text-white">~{ticket?.estimatedWaitTime} min</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Patient ID</span>
              <span className="text-white font-mono">{ticket?.patientNumber}</span>
            </div>
          </div>

          {/* Priority Badge */}
          {priority && (
            <div className="bg-gradient-to-r from-amber-500/20 to-amber-400/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl mb-6 font-bold inline-flex items-center gap-2">
              <span>⚠️</span>
              <span>Priority Queue - You will be called soon</span>
            </div>
          )}

          <div className="text-sm text-slate-500">
            Please wait for your number to be called on the display
          </div>
        </div>

        <Button
          onClick={handleNewTicket}
          className="mt-8 px-8 py-4 text-lg"
          size="xl"
          leftIcon={<span>🎫</span>}
        >
          Get Another Ticket
        </Button>

        <div className="mt-6">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
