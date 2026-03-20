'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../lib/stores/auth';
import { api } from '../../../../lib/api';
import {
  Activity, Heart, Thermometer, Wind, Droplet,
  Clock, CheckCircle, AlertTriangle, FileText, Plus,
  ArrowLeft, Save, History, AlertCircle
} from 'lucide-react';

interface Vitals {
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  heartRate: string;
  temperature: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  weight: string;
  height: string;
}

interface TriageAssessment {
  chiefComplaint: string;
  symptoms: string[];
  symptomDuration: string;
  painLevel: number;
  medicalHistory: string[];
  allergies: string[];
}

interface TriageResult {
  triageLevel: 'emergency' | 'urgent' | 'normal' | 'low';
  recommendedDepartment: string;
  redFlags: string[];
  waitTimeEstimate: number;
  aiReasoning: string;
}

interface Patient {
  id: string;
  name: string;
  ticketNumber: string;
  department: string;
}

export default function VitalsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vitalsHistory, setVitalsHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [vitals, setVitals] = useState<Vitals>({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperature: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
  });

  const [triage, setTriage] = useState<TriageAssessment>({
    chiefComplaint: '',
    symptoms: [],
    symptomDuration: '',
    painLevel: 0,
    medicalHistory: [],
    allergies: [],
  });

  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [symptomInput, setSymptomInput] = useState('');
  const [historyInput, setHistoryInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'nurse' && user?.role !== 'doctor')) {
      router.push('/login');
      return;
    }
    loadPatients();
  }, [isAuthenticated, user, router]);

  const loadPatients = async () => {
    try {
      const waitingPatients = await api.get('/api/queue/waiting') as any[];
      setPatients(waitingPatients?.map((v: any) => ({
        id: v.patient_id,
        name: v.patient_name,
        ticketNumber: v.ticket_number,
        department: v.department,
      })) || []);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setTriageResult(null);
    setShowHistory(false);
    
    try {
      const history = await api.getVitals(patient.id) as any;
      if (history?.vitals) {
        setVitalsHistory(history.vitals);
      }
    } catch (error) {
      console.error('Failed to load vitals history:', error);
    }
  };

  const addSymptom = () => {
    if (symptomInput.trim()) {
      setTriage({ ...triage, symptoms: [...triage.symptoms, symptomInput.trim()] });
      setSymptomInput('');
    }
  };

  const removeSymptom = (index: number) => {
    setTriage({
      ...triage,
      symptoms: triage.symptoms.filter((_, i) => i !== index),
    });
  };

  const addHistory = () => {
    if (historyInput.trim()) {
      setTriage({ ...triage, medicalHistory: [...triage.medicalHistory, historyInput.trim()] });
      setHistoryInput('');
    }
  };

  const removeHistory = (index: number) => {
    setTriage({
      ...triage,
      medicalHistory: triage.medicalHistory.filter((_, i) => i !== index),
    });
  };

  const addAllergy = () => {
    if (allergyInput.trim()) {
      setTriage({ ...triage, allergies: [...triage.allergies, allergyInput.trim()] });
      setAllergyInput('');
    }
  };

  const removeAllergy = (index: number) => {
    setTriage({
      ...triage,
      allergies: triage.allergies.filter((_, i) => i !== index),
    });
  };

  const saveVitals = async () => {
    if (!selectedPatient) return;

    setSaving(true);
    try {
      await api.recordVitals({
        patientId: selectedPatient.id,
        bloodPressureSystolic: vitals.bloodPressureSystolic ? parseInt(vitals.bloodPressureSystolic) : undefined,
        bloodPressureDiastolic: vitals.bloodPressureDiastolic ? parseInt(vitals.bloodPressureDiastolic) : undefined,
        heartRate: vitals.heartRate ? parseInt(vitals.heartRate) : undefined,
        temperature: vitals.temperature ? parseFloat(vitals.temperature) : undefined,
        respiratoryRate: vitals.respiratoryRate ? parseInt(vitals.respiratoryRate) : undefined,
        oxygenSaturation: vitals.oxygenSaturation ? parseInt(vitals.oxygenSaturation) : undefined,
        weight: vitals.weight ? parseFloat(vitals.weight) : undefined,
        height: vitals.height ? parseFloat(vitals.height) : undefined,
        chiefComplaint: triage.chiefComplaint,
        painLevel: triage.painLevel,
        notes: '',
      });

      if (triage.chiefComplaint) {
        const result = await api.performTriage({
          chiefComplaint: triage.chiefComplaint,
          symptoms: triage.symptoms,
          symptomDuration: triage.symptomDuration,
          painLevel: triage.painLevel,
          vitalSigns: {
            bloodPressureSystolic: vitals.bloodPressureSystolic ? parseInt(vitals.bloodPressureSystolic) : undefined,
            bloodPressureDiastolic: vitals.bloodPressureDiastolic ? parseInt(vitals.bloodPressureDiastolic) : undefined,
            heartRate: vitals.heartRate ? parseInt(vitals.heartRate) : undefined,
            temperature: vitals.temperature ? parseFloat(vitals.temperature) : undefined,
            oxygenSaturation: vitals.oxygenSaturation ? parseInt(vitals.oxygenSaturation) : undefined,
          },
          medicalHistory: triage.medicalHistory,
          allergies: triage.allergies,
        }) as TriageResult;
        setTriageResult(result);
      }

      resetForm();
      loadPatients();
    } catch (error) {
      console.error('Failed to save vitals:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setVitals({
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      heartRate: '',
      temperature: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      weight: '',
      height: '',
    });
    setTriage({
      chiefComplaint: '',
      symptoms: [],
      symptomDuration: '',
      painLevel: 0,
      medicalHistory: [],
      allergies: [],
    });
    setTriageResult(null);
  };

  const getTriageColor = (level: string) => {
    const colors: Record<string, string> = {
      emergency: 'bg-red-500',
      urgent: 'bg-orange-500',
      normal: 'bg-yellow-500',
      low: 'bg-green-500',
    };
    return colors[level] || 'bg-gray-500';
  };

  const getTriageLabel = (level: string) => {
    const labels: Record<string, string> = {
      emergency: 'Immediate',
      urgent: 'Urgent',
      normal: 'Standard',
      low: 'Non-Urgent',
    };
    return labels[level] || level;
  };

  if (!isAuthenticated || (user?.role !== 'nurse' && user?.role !== 'doctor')) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard/nurse')} className="text-white/60 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-white">Record Vitals & Triage</h1>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 glass-button rounded-lg text-sm"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="glass-card">
              <h2 className="text-lg font-semibold text-white mb-4">Select Patient</h2>
              
              {showHistory && selectedPatient ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-medium">Vitals History - {selectedPatient.name}</h3>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="text-sm text-white/60 hover:text-white"
                    >
                      Close History
                    </button>
                  </div>
                  {vitalsHistory.length === 0 ? (
                    <p className="text-white/50">No vitals recorded yet</p>
                  ) : (
                    <div className="space-y-3">
                      {vitalsHistory.map((record: any) => (
                        <div key={record.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-white/50 text-sm">
                              {new Date(record.recorded_at).toLocaleString()}
                            </span>
                            <span className="text-white/50 text-sm">
                              By: {record.recorded_by_name || 'Unknown'}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-sm">
                            {record.blood_pressure_systolic && (
                              <div>
                                <span className="text-white/50">BP:</span>
                                <span className="text-white ml-1">
                                  {record.blood_pressure_systolic}/{record.blood_pressure_diastolic}
                                </span>
                              </div>
                            )}
                            {record.heart_rate && (
                              <div>
                                <span className="text-white/50">HR:</span>
                                <span className="text-white ml-1">{record.heart_rate} bpm</span>
                              </div>
                            )}
                            {record.temperature && (
                              <div>
                                <span className="text-white/50">Temp:</span>
                                <span className="text-white ml-1">{record.temperature}°C</span>
                              </div>
                            )}
                            {record.oxygen_saturation && (
                              <div>
                                <span className="text-white/50">O₂:</span>
                                <span className="text-white ml-1">{record.oxygen_saturation}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => selectPatient(patient)}
                      className={`p-4 rounded-lg border text-left transition ${
                        selectedPatient?.id === patient.id
                          ? 'bg-primary-500/20 border-primary-500'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-white">{patient.name}</p>
                          <p className="text-sm text-white/50">{patient.ticketNumber}</p>
                        </div>
                        <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/70">
                          {patient.department}
                        </span>
                      </div>
                    </button>
                  ))}
                  {patients.length === 0 && (
                    <p className="col-span-2 text-center text-white/50 py-8">
                      No patients waiting in queue
                    </p>
                  )}
                </div>
              )}
            </div>

            {selectedPatient && !showHistory && (
              <div className="glass-card mt-6">
                <h2 className="text-lg font-semibold text-white mb-6">Record Vitals</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-white/50 mb-2">Blood Pressure (Systolic)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={vitals.bloodPressureSystolic}
                        onChange={(e) => setVitals({ ...vitals, bloodPressureSystolic: e.target.value })}
                        placeholder="120"
                        className="glass-input flex-1"
                      />
                      <span className="text-white/50">/</span>
                      <input
                        type="number"
                        value={vitals.bloodPressureDiastolic}
                        onChange={(e) => setVitals({ ...vitals, bloodPressureDiastolic: e.target.value })}
                        placeholder="80"
                        className="glass-input w-20"
                      />
                      <span className="text-white/50 text-sm">mmHg</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-2">
                      <Heart className="w-4 h-4 inline mr-1 text-pink-400" />
                      Heart Rate
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={vitals.heartRate}
                        onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                        placeholder="72"
                        className="glass-input flex-1"
                      />
                      <span className="text-white/50 text-sm">bpm</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-2">
                      <Thermometer className="w-4 h-4 inline mr-1 text-orange-400" />
                      Temperature
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={vitals.temperature}
                        onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                        placeholder="37.0"
                        className="glass-input flex-1"
                      />
                      <span className="text-white/50 text-sm">°C</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-2">
                      <Wind className="w-4 h-4 inline mr-1 text-blue-400" />
                      Respiratory Rate
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={vitals.respiratoryRate}
                        onChange={(e) => setVitals({ ...vitals, respiratoryRate: e.target.value })}
                        placeholder="16"
                        className="glass-input flex-1"
                      />
                      <span className="text-white/50 text-sm">/min</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-2">
                      <Droplet className="w-4 h-4 inline mr-1 text-purple-400" />
                      Oxygen Saturation
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={vitals.oxygenSaturation}
                        onChange={(e) => setVitals({ ...vitals, oxygenSaturation: e.target.value })}
                        placeholder="98"
                        className="glass-input flex-1"
                      />
                      <span className="text-white/50 text-sm">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-2">
                      <Activity className="w-4 h-4 inline mr-1 text-green-400" />
                      Weight
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={vitals.weight}
                        onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                        placeholder="70"
                        className="glass-input flex-1"
                      />
                      <span className="text-white/50 text-sm">kg</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-2">Height</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={vitals.height}
                        onChange={(e) => setVitals({ ...vitals, height: e.target.value })}
                        placeholder="170"
                        className="glass-input flex-1"
                      />
                      <span className="text-white/50 text-sm">cm</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            {selectedPatient && !showHistory && (
              <div className="glass-card">
                <h2 className="text-lg font-semibold text-white mb-4">Triage Assessment</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/50 mb-2">Chief Complaint</label>
                    <input
                      type="text"
                      value={triage.chiefComplaint}
                      onChange={(e) => setTriage({ ...triage, chiefComplaint: e.target.value })}
                      placeholder="Primary reason for visit"
                      className="glass-input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-2">Symptom Duration</label>
                    <input
                      type="text"
                      value={triage.symptomDuration}
                      onChange={(e) => setTriage({ ...triage, symptomDuration: e.target.value })}
                      placeholder="e.g., 2 days, 1 week"
                      className="glass-input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-2">Symptoms</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={symptomInput}
                        onChange={(e) => setSymptomInput(e.target.value)}
                        placeholder="Add symptom"
                        className="glass-input flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
                      />
                      <button onClick={addSymptom} className="px-3 py-2 glass-button rounded-lg">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {triage.symptoms.map((symptom, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-white/10 rounded text-sm text-white flex items-center gap-1"
                        >
                          {symptom}
                          <button onClick={() => removeSymptom(index)} className="text-white/50 hover:text-white">
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-2">Pain Level (0-10)</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={triage.painLevel}
                      onChange={(e) => setTriage({ ...triage, painLevel: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-white/50">
                      <span>0 (No Pain)</span>
                      <span className="font-bold text-primary-400">{triage.painLevel}</span>
                      <span>10 (Severe)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-2">Medical History</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={historyInput}
                        onChange={(e) => setHistoryInput(e.target.value)}
                        placeholder="Add condition"
                        className="glass-input flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && addHistory()}
                      />
                      <button onClick={addHistory} className="px-3 py-2 glass-button rounded-lg">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {triage.medicalHistory.map((history, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-500/20 rounded text-sm text-blue-300 flex items-center gap-1"
                        >
                          {history}
                          <button onClick={() => removeHistory(index)} className="text-blue-300/50 hover:text-blue-300">
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-2">Allergies</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={allergyInput}
                        onChange={(e) => setAllergyInput(e.target.value)}
                        placeholder="Add allergy"
                        className="glass-input flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
                      />
                      <button onClick={addAllergy} className="px-3 py-2 glass-button rounded-lg">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {triage.allergies.map((allergy, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-red-500/20 rounded text-sm text-red-300 flex items-center gap-1"
                        >
                          {allergy}
                          <button onClick={() => removeAllergy(index)} className="text-red-300/50 hover:text-red-300">
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {triageResult && (
                    <div className={`p-4 rounded-lg ${getTriageColor(triageResult.triageLevel)}/20 border ${getTriageColor(triageResult.triageLevel)}`}>
                      <h3 className="font-semibold text-white mb-2">Triage Result</h3>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-white/70">Level:</span>
                          <span className="ml-2 font-medium">{getTriageLabel(triageResult.triageLevel)}</span>
                        </p>
                        <p>
                          <span className="text-white/70">Department:</span>
                          <span className="ml-2">{triageResult.recommendedDepartment}</span>
                        </p>
                        <p>
                          <span className="text-white/70">Wait Time:</span>
                          <span className="ml-2">{triageResult.waitTimeEstimate} min</span>
                        </p>
                        {triageResult.redFlags.length > 0 && (
                          <div className="mt-2">
                            <p className="text-red-300 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              Red Flags:
                            </p>
                            <ul className="text-xs mt-1 space-y-1">
                              {triageResult.redFlags.map((flag, i) => (
                                <li key={i} className="text-red-200">{flag}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="text-white/50 text-xs mt-2">{triageResult.aiReasoning}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={saveVitals}
                    disabled={saving}
                    className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Vitals & Triage
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {!selectedPatient && (
              <div className="glass-card text-center py-12">
                <Activity className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/50">Select a patient to record vitals</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
