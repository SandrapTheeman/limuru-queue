'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, User, Clock, Bell, Zap, X, Search } from 'lucide-react';

interface EmergencyPatient {
  id: string;
  name: string;
  ticketNumber?: string;
  department: string;
  waitTime?: number;
}

interface EmergencyOverrideProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: (patientId: string, reason: string, room?: string) => Promise<void>;
  waitingPatients?: EmergencyPatient[];
  loading?: boolean;
}

export function EmergencyOverride({
  isOpen,
  onClose,
  onActivate,
  waitingPatients = [],
  loading = false,
}: EmergencyOverrideProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'select' | 'reason' | 'confirm'>('select');
  const [selectedPatient, setSelectedPatient] = useState<EmergencyPatient | null>(null);
  const [reason, setReason] = useState('');
  const [room, setRoom] = useState('');
  const [activating, setActivating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedPatient(null);
      setReason('');
      setRoom('');
      setTimeout(() => dialogRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handlePatientSelect = useCallback((patient: EmergencyPatient) => {
    setSelectedPatient(patient);
    setStep('reason');
  }, []);

  const handleReasonSubmit = useCallback(() => {
    if (!reason.trim()) return;
    setStep('confirm');
  }, [reason]);

  const handleActivate = useCallback(async () => {
    if (!selectedPatient) return;
    setActivating(true);
    try {
      await onActivate(selectedPatient.id, reason, room);
      onClose();
    } catch (error) {
      console.error('Failed to activate emergency:', error);
    } finally {
      setActivating(false);
    }
  }, [selectedPatient, reason, room, onActivate, onClose]);

  const filteredPatients = searchQuery
    ? waitingPatients.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : waitingPatients;

  if (!mounted || !isOpen) return null;

  const reasonOptions = [
    'Patient experiencing chest pain',
    'Patient having difficulty breathing',
    'Patient showing signs of severe allergic reaction',
    'Patient has high fever (above 39°C)',
    'Patient is unconscious or unresponsive',
    'Patient has severe bleeding',
    'Patient is pregnant and experiencing complications',
    'Pediatric emergency',
    'Other medical emergency',
  ];

  const dialogContent = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="emergency-title"
        tabIndex={-1}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-bounce-in"
      >
        <div className="bg-error-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 id="emergency-title" className="text-xl font-bold text-white">
                CODE BLUE - Emergency Override
              </h2>
              <p className="text-error-100 text-sm">Prioritize patient immediately</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {step === 'select' && (
            <div>
              <p className="text-gray-600 mb-4">
                Select a patient from the waiting queue to prioritize for emergency treatment.
              </p>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search patient by name or ticket..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-error-500 focus:border-error-500"
                />
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-error-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="mt-2 text-gray-500">Loading patients...</p>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No patients found in the queue</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredPatients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handlePatientSelect(patient)}
                      className="w-full p-4 text-left bg-gray-50 hover:bg-error-50 border border-gray-200 hover:border-error-300 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{patient.name}</p>
                          <p className="text-sm text-gray-500">
                            {patient.ticketNumber && `${patient.ticketNumber} • `}
                            {patient.department}
                          </p>
                        </div>
                        {patient.waitTime && (
                          <div className="flex items-center gap-1 text-gray-500 text-sm">
                            <Clock className="w-4 h-4" />
                            {patient.waitTime} min
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'reason' && (
            <div>
              <button
                onClick={() => setStep('select')}
                className="text-sm text-gray-500 hover:text-gray-700 mb-4"
              >
                ← Back to patient list
              </button>
              
              <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-4">
                <p className="font-medium text-error-800">
                  Selected: {selectedPatient?.name}
                </p>
                <p className="text-sm text-error-600">
                  {selectedPatient?.ticketNumber && `${selectedPatient.ticketNumber} • `}
                  {selectedPatient?.department}
                </p>
              </div>

              <p className="text-gray-700 font-medium mb-3">Select emergency reason:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                {reasonOptions.map((option) => (
                  <label
                    key={option}
                    className={`
                      flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors
                      ${reason === option
                        ? 'border-error-500 bg-error-50'
                        : 'border-gray-200 hover:border-error-300 hover:bg-error-50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="emergency-reason"
                      value={option}
                      checked={reason === option}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-4 h-4 text-error-500"
                    />
                    <span className="text-gray-700">{option}</span>
                  </label>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Room assignment (optional)
                </label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g., ER-1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-error-500 focus:border-error-500"
                />
              </div>

              <button
                onClick={handleReasonSubmit}
                disabled={!reason}
                className="w-full py-3 bg-error-500 hover:bg-error-600 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <AlertTriangle className="w-8 h-8 text-error-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Activate Code Blue?
                </h3>
                <p className="text-gray-600">
                  This will immediately notify all staff and display emergency alerts.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Patient:</span>
                  <span className="font-medium text-gray-900">{selectedPatient?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reason:</span>
                  <span className="font-medium text-gray-900 text-right max-w-[200px]">
                    {reason}
                  </span>
                </div>
                {room && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Room:</span>
                    <span className="font-medium text-gray-900">{room}</span>
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> The patient will be moved to the front of the queue,
                  all staff will be notified, and the TV display will show an emergency alert.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('reason')}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleActivate}
                  disabled={activating}
                  className="flex-1 py-3 bg-error-500 hover:bg-error-600 disabled:bg-error-300 text-white font-medium rounded-lg transition-colors"
                >
                  {activating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Activating...
                    </span>
                  ) : (
                    <>
                      <Bell className="w-5 h-5 inline mr-2" />
                      Activate Code Blue
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}

export function CodeBlueButton({
  onClick,
  variant = 'button',
  className = '',
}: {
  onClick: () => void;
  variant?: 'button' | 'icon';
  className?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (variant === 'icon') {
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative p-3 bg-error-500 hover:bg-error-600 text-white rounded-full shadow-lg transition-all ${
          isHovered ? 'scale-110' : ''
        } ${className}`}
        aria-label="Code Blue Emergency"
        title="Code Blue Emergency"
      >
        <Zap className="w-6 h-6" />
        {isHovered && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 bg-error-500 hover:bg-error-600 text-white font-medium rounded-lg shadow-lg transition-all ${
        className || ''
      }`}
    >
      <Zap className="w-5 h-5" />
      Code Blue
    </button>
  );
}
