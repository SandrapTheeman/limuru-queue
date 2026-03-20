'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

const DEPARTMENTS = [
  { code: 'MED', name: 'General Medicine', color: '#10b981', icon: '🩺' },
  { code: 'PED', name: 'Pediatrics', color: '#3b82f6', icon: '👶' },
  { code: 'GYN', name: 'Gynecology', color: '#ec4899', icon: '🌸' },
  { code: 'ORTHO', name: 'Orthopedics', color: '#8b5cf6', icon: '🦴' },
  { code: 'DEN', name: 'Dental', color: '#f59e0b', icon: '🦷' },
  { code: 'OPH', name: 'Ophthalmology', color: '#06b6d4', icon: '👁️' },
  { code: 'CARD', name: 'Cardiology', color: '#ef4444', icon: '❤️' },
  { code: 'EMER', name: 'Emergency', color: '#f97316', icon: '🚨' },
];

export default function KioskPage() {
  const [step, setStep] = useState<'department' | 'details' | 'ticket'>('department');
  const [selectedDept, setSelectedDept] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [priority, setPriority] = useState(false);
  const [ticket, setTicket] = useState<{ticketNumber: string; patientNumber: string; position: number; estimatedWaitTime: number; department: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDepartmentSelect = (dept: string) => {
    setSelectedDept(dept);
    setStep('details');
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
        department: selectedDept,
        priority: priority,
      });

      setTicket({
        ticketNumber: response.ticket_number,
        patientNumber: response.patient?.patient_number || response.patient_number,
        position: response.position,
        estimatedWaitTime: response.position * 15,
        department: selectedDept,
      });
      setStep('ticket');
    } catch (err: any) {
      console.error('Failed to join queue:', err);
      setError(err.message || 'Failed to get ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewTicket = () => {
    setStep('department');
    setSelectedDept('');
    setName('');
    setPhone('');
    setEmail('');
    setPriority(false);
    setTicket(null);
    setError('');
  };

  const deptInfo = DEPARTMENTS.find(d => d.code === selectedDept);

  if (step === 'department') {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">🎫 Get Your Queue Ticket</h1>
              <p className="text-xl text-white/60">Select your department</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept.code}
                  onClick={() => handleDepartmentSelect(dept.code)}
                  className="glass-card text-center py-8 hover:scale-105 transition-transform"
                  style={{ borderColor: `${dept.color}50` }}
                >
                  <span className="text-4xl mb-3 block">{dept.icon}</span>
                  <span className="text-xl font-bold text-white">{dept.code}</span>
                  <span className="block text-sm text-white/60 mt-1">{dept.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link href="/" className="text-white/40 hover:text-white/60">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'details') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <button
            onClick={() => setStep('department')}
            className="mb-6 text-white/60 hover:text-white flex items-center gap-2"
          >
            ← Back
          </button>

          <div className="glass-card">
            <div className="text-center mb-6">
              <span className="text-3xl">{deptInfo?.icon}</span>
              <h2 className="text-2xl font-bold text-white mt-2">
                {deptInfo?.name}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input"
                  required
                />
              </div>

              <div>
                <label className="text-white/70 text-sm mb-2 block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="glass-input"
                />
              </div>

              <div>
                <label className="text-white/70 text-sm mb-2 block">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="priority"
                  checked={priority}
                  onChange={(e) => setPriority(e.target.checked)}
                  className="w-5 h-5"
                />
                <label htmlFor="priority" className="text-sm text-white/70">
                  Priority patient (elderly, pregnant, disabled)
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="glass-button-primary w-full py-4 text-lg"
              >
                {loading ? 'Processing...' : '🎫 Get Ticket'}
              </button>

              {error && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Ticket print view
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="glass-card py-12 px-8 max-w-md">
          <div className="text-primary-400 text-lg font-semibold mb-4">
            🏥 Limuru Cottage
          </div>
          <div className="text-8xl font-bold" style={{ color: deptInfo?.color }}>
            {ticket?.ticketNumber}
          </div>
          <div className="text-xl text-white/80 mb-6">
            {deptInfo?.name}
          </div>
          
          <div className="border-t border-b border-white/10 py-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-white/60">Position:</span>
              <span className="font-bold text-2xl text-white">#{ticket?.position}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Est. Wait:</span>
              <span className="font-semibold text-white">{ticket?.estimatedWaitTime} min</span>
            </div>
          </div>

          {priority && (
            <div className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg mb-6 font-bold">
              ⚠️ Priority Queue
            </div>
          )}

          <div className="text-sm text-white/40">
            Please wait for your number to be called
          </div>
        </div>

        <button
          onClick={handleNewTicket}
          className="glass-button-primary mt-8 px-8 py-4 text-lg"
        >
          🎫 Get Another Ticket
        </button>

        <div className="mt-6">
          <Link href="/" className="text-white/40 hover:text-white/60">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
