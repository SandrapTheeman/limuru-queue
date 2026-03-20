'use client';

import { Phone, Play, CheckCircle, XCircle, UserMinus, Pause, PlayCircle } from 'lucide-react';

interface QueueActionsProps {
  patient: {
    id: string;
    ticket_number: string;
    patient_name: string;
    status: string;
    priority: boolean;
  } | null;
  doctorStatus: 'available' | 'break' | 'emergency';
  processing: string | null;
  onCall: (visitId: string) => void;
  onStart: (visitId: string) => void;
  onComplete: (patientId: string) => void;
  onNoShow: (visitId: string) => void;
  onBreakToggle: () => void;
}

export default function QueueActions({
  patient,
  doctorStatus,
  processing,
  onCall,
  onStart,
  onComplete,
  onNoShow,
  onBreakToggle,
}: QueueActionsProps) {
  const isBreak = doctorStatus === 'break';
  const isDisabled = isBreak || processing === patient?.id;

  return (
    <div className="glass-card">
      <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>

      {patient && (
        <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-lg font-bold text-blue-400">
                {patient.ticket_number}
              </span>
            </div>
            <div>
              <div className="font-medium text-white">{patient.patient_name}</div>
              <div className="text-sm text-white/60">{patient.status.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {patient?.status === 'waiting' && (
          <button
            onClick={() => onCall(patient.id)}
            disabled={isDisabled}
            className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Phone className="w-5 h-5" />
            {processing === patient.id ? 'Calling...' : 'Call Patient'}
          </button>
        )}

        {patient?.status === 'called' && (
          <button
            onClick={() => onStart(patient.id)}
            disabled={isDisabled}
            className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            {processing === patient.id ? 'Starting...' : 'Start Consultation'}
          </button>
        )}

        {patient?.status === 'in_progress' && (
          <>
            <button
              onClick={() => onComplete(patient.id)}
              disabled={processing === patient.id}
              className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-5 h-5" />
              {processing === patient.id ? 'Completing...' : 'Complete Visit'}
            </button>
            <button
              onClick={() => onNoShow(patient.id)}
              disabled={processing === patient.id}
              className="w-full flex items-center justify-center gap-2 border border-red-500/30 text-red-400 py-3 rounded-lg font-medium hover:bg-red-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserMinus className="w-5 h-5" />
              Mark No Show
            </button>
          </>
        )}

        {!patient && (
          <div className="text-center py-8 text-white/50">
            <Phone className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No patient to act on</p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-white/10">
        <button
          onClick={onBreakToggle}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition ${
            isBreak
              ? 'bg-green-500/20 text-green-400 border border-green-400 hover:bg-green-500/30'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/50 hover:bg-yellow-500/30'
          }`}
        >
          {isBreak ? (
            <>
              <PlayCircle className="w-5 h-5" />
              End Break
            </>
          ) : (
            <>
              <Pause className="w-5 h-5" />
              Take Break
            </>
          )}
        </button>
      </div>

      {isBreak && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-400 text-center">
            You are on break. Patients cannot be called.
          </p>
        </div>
      )}
    </div>
  );
}
