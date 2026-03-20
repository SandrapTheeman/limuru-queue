'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Activity, Heart, Thermometer, Wind, Droplet,
  Clock, CheckCircle, AlertTriangle, FileText, Plus, Phone
} from 'lucide-react';
import { VoiceCallFAB } from '@/lib/components/VoiceCallUI';

interface QueuePatient {
  id: string;
  ticketNumber: string;
  patientName: string;
  department: string;
  status: 'waiting' | 'called' | 'in-progress' | 'completed';
  waitTime: number;
}

interface Vitals {
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  weight: string;
  height: string;
}

interface TriageAssessment {
  painLevel: number;
  chiefComplaint: string;
  triageLevel: '1' | '2' | '3' | '4' | '5';
  notes: string;
}

export default function NurseDashboard() {
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<QueuePatient | null>(null);
  const [vitals, setVitals] = useState<Vitals>({
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
  });
  const [triage, setTriage] = useState<TriageAssessment>({
    painLevel: 0,
    chiefComplaint: '',
    triageLevel: '3',
    notes: '',
  });
  const [completedVitals, setCompletedVitals] = useState<string[]>([]);

  useEffect(() => {
    const mockQueue: QueuePatient[] = [
      { id: '1', ticketNumber: 'T0023', patientName: 'John Smith', department: 'General Medicine', status: 'waiting', waitTime: 15 },
      { id: '2', ticketNumber: 'T0024', patientName: 'Sarah Johnson', department: 'Cardiology', status: 'waiting', waitTime: 25 },
      { id: '3', ticketNumber: 'T0025', patientName: 'Michael Brown', department: 'Pediatrics', status: 'waiting', waitTime: 8 },
      { id: '4', ticketNumber: 'T0026', patientName: 'Emily Davis', department: 'General Medicine', status: 'waiting', waitTime: 12 },
      { id: '5', ticketNumber: 'T0027', patientName: 'Robert Wilson', department: 'Orthopedics', status: 'waiting', waitTime: 20 },
    ];
    setQueue(mockQueue);
  }, []);

  const selectPatient = (patient: QueuePatient) => {
    setSelectedPatient(patient);
  };

  const saveVitals = () => {
    if (selectedPatient) {
      setCompletedVitals([...completedVitals, selectedPatient.id]);
      setQueue(queue.map(p =>
        p.id === selectedPatient.id ? { ...p, status: 'completed' } : p
      ));
      setSelectedPatient(null);
      setVitals({
        bloodPressure: '',
        heartRate: '',
        temperature: '',
        respiratoryRate: '',
        oxygenSaturation: '',
        weight: '',
        height: '',
      });
      setTriage({
        painLevel: 0,
        chiefComplaint: '',
        triageLevel: '3',
        notes: '',
      });
    }
  };

  const getTriageColor = (level: string) => {
    const colors: Record<string, string> = {
      '1': 'bg-red-500',
      '2': 'bg-orange-500',
      '3': 'bg-yellow-500',
      '4': 'bg-green-500',
      '5': 'bg-blue-500',
    };
    return colors[level] || 'bg-gray-500';
  };

  const getTriageLabel = (level: string) => {
    const labels: Record<string, string> = {
      '1': 'Immediate',
      '2': 'Emergent',
      '3': 'Urgent',
      '4': 'Less Urgent',
      '5': 'Non-Urgent',
    };
    return labels[level] || level;
  };

  return (
    <div className="min-h-screen bg-hospital-background">
      <header className="bg-white shadow-sm border-b border-hospital-muted">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-hospital-primary">Nurse Station</h1>
            <span className="text-sm text-gray-500">Station A</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Quick Call Button */}
            <button
              onClick={() => {
                const event = new CustomEvent('openVoiceCall');
                window.dispatchEvent(event);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
              title="Call Staff"
            >
              <Phone className="w-4 h-4" />
              <span>Call Staff</span>
            </button>
            <Clock className="w-5 h-5 text-gray-500" />
            <span className="text-gray-600">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-hospital-text mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-hospital-primary" />
                Patient Queue - Vitals Required
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-hospital-muted">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ticket</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Patient</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Department</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Wait Time</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((patient) => (
                      <tr 
                        key={patient.id} 
                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          selectedPatient?.id === patient.id ? 'bg-hospital-muted' : ''
                        } ${completedVitals.includes(patient.id) ? 'bg-green-50' : ''}`}
                        onClick={() => !completedVitals.includes(patient.id) && selectPatient(patient)}
                      >
                        <td className="py-3 px-4 font-medium text-hospital-primary">
                          {patient.ticketNumber}
                        </td>
                        <td className="py-3 px-4 text-hospital-text">{patient.patientName}</td>
                        <td className="py-3 px-4 text-gray-500">{patient.department}</td>
                        <td className="py-3 px-4 text-gray-500">{patient.waitTime} min</td>
                        <td className="py-3 px-4">
                          {completedVitals.includes(patient.id) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs">
                              <CheckCircle className="w-3 h-3" />
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full text-xs">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {!completedVitals.includes(patient.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                selectPatient(patient);
                              }}
                              className="text-sm text-hospital-primary hover:underline"
                            >
                              Record Vitals
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="col-span-1">
            {selectedPatient ? (
              <div className="card">
                <h2 className="text-lg font-semibold text-hospital-text mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-hospital-primary" />
                  Vitals & Triage
                </h2>

                <div className="mb-4 p-3 bg-hospital-muted rounded-lg">
                  <p className="font-medium text-hospital-primary">{selectedPatient.ticketNumber}</p>
                  <p className="text-sm text-gray-600">{selectedPatient.patientName}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      Blood Pressure
                    </h3>
                    <input
                      type="text"
                      value={vitals.bloodPressure}
                      onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                      placeholder="120/80"
                      className="input-field"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Activity className="w-4 h-4 text-pink-500" />
                        Heart Rate
                      </h3>
                      <input
                        type="text"
                        value={vitals.heartRate}
                        onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                        placeholder="bpm"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Thermometer className="w-4 h-4 text-orange-500" />
                        Temp
                      </h3>
                      <input
                        type="text"
                        value={vitals.temperature}
                        onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                        placeholder="°C"
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Wind className="w-4 h-4 text-blue-500" />
                        Resp Rate
                      </h3>
                      <input
                        type="text"
                        value={vitals.respiratoryRate}
                        onChange={(e) => setVitals({ ...vitals, respiratoryRate: e.target.value })}
                        placeholder="/min"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Droplet className="w-4 h-4 text-purple-500" />
                        O2 Sat
                      </h3>
                      <input
                        type="text"
                        value={vitals.oxygenSaturation}
                        onChange={(e) => setVitals({ ...vitals, oxygenSaturation: e.target.value })}
                        placeholder="%"
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Triage Assessment</h3>
                    
                    <div className="mb-3">
                      <label className="block text-xs text-gray-500 mb-1">Chief Complaint</label>
                      <input
                        type="text"
                        value={triage.chiefComplaint}
                        onChange={(e) => setTriage({ ...triage, chiefComplaint: e.target.value })}
                        placeholder="Primary reason for visit"
                        className="input-field"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs text-gray-500 mb-1">Pain Level (0-10)</label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={triage.painLevel}
                        onChange={(e) => setTriage({ ...triage, painLevel: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>0</span>
                        <span className="font-bold text-hospital-primary">{triage.painLevel}</span>
                        <span>10</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs text-gray-500 mb-1">Triage Level</label>
                      <div className="flex gap-2">
                        {['1', '2', '3', '4', '5'].map((level) => (
                          <button
                            key={level}
                            onClick={() => setTriage({ ...triage, triageLevel: level as TriageAssessment['triageLevel'] })}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                              triage.triageLevel === level
                                ? `${getTriageColor(level)} text-white`
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-center mt-1 text-gray-500">
                        {getTriageLabel(triage.triageLevel)}
                      </p>
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs text-gray-500 mb-1">Notes</label>
                      <textarea
                        value={triage.notes}
                        onChange={(e) => setTriage({ ...triage, notes: e.target.value })}
                        rows={2}
                        placeholder="Additional observations..."
                        className="input-field"
                      />
                    </div>
                  </div>

                  <button
                    onClick={saveVitals}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Save & Complete
                  </button>
                </div>
              </div>
            ) : (
              <div className="card text-center py-12">
                <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a patient to record vitals</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Voice Call FAB */}
      <VoiceCallFAB />
    </div>
  );
}
