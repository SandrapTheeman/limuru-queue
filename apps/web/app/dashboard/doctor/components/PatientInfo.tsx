'use client';

import { Clock, AlertTriangle, Activity, FileText } from 'lucide-react';

interface PatientHistoryItem {
  id: string;
  created_at: string;
  department: string;
  diagnosis?: string;
  prescription?: string;
}

interface PatientInfoProps {
  patient: {
    id: string;
    ticket_number: string;
    patient_name: string;
    patient_number: string;
    patient_phone?: string;
    wait_time: number;
    position: number;
    priority: boolean;
    status: string;
  } | null;
  history: PatientHistoryItem[];
  loadingHistory: boolean;
  onClose: () => void;
}

export default function PatientInfo({ patient, history, loadingHistory, onClose }: PatientInfoProps) {
  if (!patient) {
    return (
      <div className="glass-card">
        <h2 className="text-lg font-semibold text-white mb-4">Patient Information</h2>
        <div className="text-center py-12 text-white/50">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No patient selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Patient Information</h2>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white text-sm"
        >
          Close
        </button>
      </div>

      <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
            <span className="text-xl font-bold text-blue-400">
              {patient.patient_name.charAt(0)}
            </span>
          </div>
          <div>
            <div className="font-semibold text-white">{patient.patient_name}</div>
            <div className="text-sm text-white/60">{patient.patient_number}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Ticket</div>
            <div className="text-lg font-bold text-white">{patient.ticket_number}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Wait Time</div>
            <div className="text-lg font-bold text-white flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {patient.wait_time}m
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Position</div>
            <div className="text-lg font-bold text-white">#{patient.position}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Status</div>
            <div className={`text-sm font-medium ${
              patient.status === 'in_progress' ? 'text-green-400' :
              patient.status === 'called' ? 'text-blue-400' : 'text-yellow-400'
            }`}>
              {patient.status.replace('_', ' ')}
            </div>
          </div>
        </div>

        {patient.priority && (
          <div className="mt-3 flex items-center gap-2 text-yellow-400 bg-yellow-500/10 rounded-lg p-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Priority Patient</span>
          </div>
        )}

        {patient.patient_phone && (
          <div className="mt-3 text-sm text-white/60">
            <span className="text-white/40">Phone:</span> {patient.patient_phone}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-white/60" />
          <h3 className="text-sm font-medium text-white">Visit History</h3>
        </div>

        {loadingHistory ? (
          <div className="text-center py-4 text-white/50">Loading...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-4 text-white/50 text-sm">No previous visits</div>
        ) : (
          <div className="space-y-2">
            {history.map((visit) => (
              <div key={visit.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60">
                    {new Date(visit.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-white/40 text-xs">{visit.department}</span>
                </div>
                {visit.diagnosis && (
                  <div className="mt-2 text-sm">
                    <span className="text-white/50">Dx:</span>{' '}
                    <span className="text-white/80">{visit.diagnosis}</span>
                  </div>
                )}
                {visit.prescription && (
                  <div className="mt-1 text-sm">
                    <span className="text-white/50">Rx:</span>{' '}
                    <span className="text-white/80">{visit.prescription}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
