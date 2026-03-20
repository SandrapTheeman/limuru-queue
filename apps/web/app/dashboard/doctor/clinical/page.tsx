'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../lib/store';
import { api } from '../../../../lib/api';
import Link from 'next/link';

interface Vitals {
  temperature?: number;
  bloodPressure?: string;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
}

interface Prescription {
  medication: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
}

interface ClinicalNote {
  id: string;
  visit_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  vitals: string | null;
  diagnosis: string | null;
  prescriptions: string | null;
  follow_up: string | null;
  source: 'typed' | 'voice' | 'template';
  status: 'draft' | 'final' | 'amended';
  created_at: string;
  updated_at: string;
}

type SoapTab = 'subjective' | 'objective' | 'assessment' | 'plan';

export default function ClinicalNotesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [activeTab, setActiveTab] = useState<SoapTab>('subjective');
  const [isRecording, setIsRecording] = useState(false);
  const [noteHistory, setNoteHistory] = useState<ClinicalNote[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const [note, setNote] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    diagnosis: '',
  });

  const [vitals, setVitals] = useState<Vitals>({});
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [followUp, setFollowUp] = useState({
    date: '',
    instructions: '',
  });

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'doctor' && user?.role !== 'nurse')) {
      router.push('/login');
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('patientId');
    const vid = params.get('visitId');
    if (pid) setPatientId(pid);
    if (vid) {
      setVisitId(vid);
      loadVisitNotes(vid);
    }
    setLoading(false);
  }, [isAuthenticated, user, router]);

  const loadVisitNotes = async (vId: string) => {
    try {
      const notes = await api.get(`/api/clinical/visit/${vId}`) as ClinicalNote[];
      if (notes && notes.length > 0) {
        const latest = notes[0];
        setNote({
          subjective: latest.subjective || '',
          objective: latest.objective || '',
          assessment: latest.assessment || '',
          plan: latest.plan || '',
          diagnosis: latest.diagnosis || '',
        });
        if (latest.vitals) {
          setVitals(JSON.parse(latest.vitals));
        }
        if (latest.prescriptions) {
          setPrescriptions(JSON.parse(latest.prescriptions));
        }
        if (latest.follow_up) {
          setFollowUp(JSON.parse(latest.follow_up));
        }
        setNoteHistory(notes);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const saveNote = useCallback(async (isDraft = true) => {
    if (!patientId) return;
    setAutoSaveStatus('saving');
    setSaving(true);
    try {
      const payload = {
        visitId: visitId || '',
        patientId,
        subjective: note.subjective,
        objective: note.objective,
        assessment: note.assessment,
        plan: note.plan,
        vitals: Object.keys(vitals).length > 0 ? vitals : undefined,
        diagnosis: note.diagnosis || undefined,
        prescriptions: prescriptions.length > 0 ? prescriptions : undefined,
        followUp: followUp.date || followUp.instructions ? followUp : undefined,
        source: 'typed' as const,
      };

      if (visitId && noteHistory.length > 0) {
        await api.put(`/api/clinical/${noteHistory[0].id}`, { ...payload, status: isDraft ? 'draft' : 'final' });
      } else {
        const result = await api.post('/api/clinical', { ...payload, status: isDraft ? 'draft' : 'final' }) as ClinicalNote;
        setNoteHistory([result]);
      }
      setAutoSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save note:', error);
      setAutoSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, [patientId, visitId, note, vitals, prescriptions, followUp, noteHistory]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (note.subjective || note.objective || note.assessment || note.plan) {
        saveNote(true);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [saveNote, note]);

  const handleVoiceInput = async (field: SoapTab) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    setIsRecording(true);
    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      setNote((prev) => ({ ...prev, [field]: prev[field] + transcript }));
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();

    const stopRecording = () => {
      recognition.stop();
      setIsRecording(false);
    };

    setTimeout(stopRecording, 10000);
  };

  const applyTemplate = (template: Template) => {
    setNote({
      subjective: template.subjective,
      objective: template.objective,
      assessment: template.assessment,
      plan: template.plan,
      diagnosis: '',
    });
    setShowTemplates(false);
  };

  const addPrescription = () => {
    setPrescriptions([...prescriptions, { medication: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const updatePrescription = (index: number, field: keyof Prescription, value: string) => {
    const updated = [...prescriptions];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptions(updated);
  };

  const removePrescription = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  if (!isAuthenticated || (user?.role !== 'doctor' && user?.role !== 'nurse')) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/doctor" className="text-2xl">←</Link>
            <h1 className="text-xl font-bold text-white">Clinical Notes</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              {autoSaveStatus === 'saved' && <span className="text-green-400">✓ Saved</span>}
              {autoSaveStatus === 'saving' && <span className="text-yellow-400">⏳ Saving...</span>}
              {autoSaveStatus === 'error' && <span className="text-red-400">⚠ Save failed</span>}
            </div>
            <Link href="/dashboard/doctor" className="text-sm text-white/60 hover:text-white">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="glass-card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">SOAP Notes</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="px-3 py-1.5 text-sm glass-button rounded-lg"
                  >
                    📋 Templates
                  </button>
                </div>
              </div>

              {showTemplates && (
                <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <h3 className="text-white font-medium mb-2">Select a Template</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        className="text-left p-2 bg-white/5 rounded border border-white/10 hover:border-primary-500 transition"
                      >
                        <div className="text-white font-medium text-sm">{template.name}</div>
                        <div className="text-white/50 text-xs">{template.category}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="tabs mb-4">
                {(['subjective', 'objective', 'assessment', 'plan'] as SoapTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`tab ${activeTab === tab ? 'active' : ''}`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <div className="soap-content">
                {activeTab === 'subjective' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-white font-medium">Subjective</h3>
                      <button
                        onClick={() => handleVoiceInput('subjective')}
                        disabled={isRecording}
                        className={`px-3 py-1 text-sm rounded ${isRecording ? 'bg-red-500/20 text-red-400' : 'glass-button'}`}
                      >
                        {isRecording ? '🔴 Recording...' : '🎤 Dictate'}
                      </button>
                    </div>
                    <p className="text-white/50 text-xs mb-2">Patient's description of symptoms, history of present illness</p>
                    <textarea
                      value={note.subjective}
                      onChange={(e) => setNote({ ...note, subjective: e.target.value })}
                      placeholder="Patient reports..."
                      className="glass-input w-full h-40 resize-none"
                    />
                  </div>
                )}

                {activeTab === 'objective' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-white font-medium">Objective</h3>
                      <button
                        onClick={() => handleVoiceInput('objective')}
                        disabled={isRecording}
                        className={`px-3 py-1 text-sm rounded ${isRecording ? 'bg-red-500/20 text-red-400' : 'glass-button'}`}
                      >
                        {isRecording ? '🔴 Recording...' : '🎤 Dictate'}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-white/50 text-xs">Temp (°C)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={vitals.temperature || ''}
                          onChange={(e) => setVitals({ ...vitals, temperature: parseFloat(e.target.value) || undefined })}
                          className="glass-input w-full"
                          placeholder="37.0"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs">BP</label>
                        <input
                          type="text"
                          value={vitals.bloodPressure || ''}
                          onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                          className="glass-input w-full"
                          placeholder="120/80"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs">HR (bpm)</label>
                        <input
                          type="number"
                          value={vitals.heartRate || ''}
                          onChange={(e) => setVitals({ ...vitals, heartRate: parseInt(e.target.value) || undefined })}
                          className="glass-input w-full"
                          placeholder="72"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs">RR</label>
                        <input
                          type="number"
                          value={vitals.respiratoryRate || ''}
                          onChange={(e) => setVitals({ ...vitals, respiratoryRate: parseInt(e.target.value) || undefined })}
                          className="glass-input w-full"
                          placeholder="16"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs">O₂ Sat (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={vitals.oxygenSaturation || ''}
                          onChange={(e) => setVitals({ ...vitals, oxygenSaturation: parseInt(e.target.value) || undefined })}
                          className="glass-input w-full"
                          placeholder="98"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs">Weight (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={vitals.weight || ''}
                          onChange={(e) => setVitals({ ...vitals, weight: parseFloat(e.target.value) || undefined })}
                          className="glass-input w-full"
                          placeholder="70"
                        />
                      </div>
                    </div>

                    <textarea
                      value={note.objective}
                      onChange={(e) => setNote({ ...note, objective: e.target.value })}
                      placeholder="Physical examination findings..."
                      className="glass-input w-full h-32 resize-none"
                    />
                  </div>
                )}

                {activeTab === 'assessment' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-white font-medium">Assessment</h3>
                      <button
                        onClick={() => handleVoiceInput('assessment')}
                        disabled={isRecording}
                        className={`px-3 py-1 text-sm rounded ${isRecording ? 'bg-red-500/20 text-red-400' : 'glass-button'}`}
                      >
                        {isRecording ? '🔴 Recording...' : '🎤 Dictate'}
                      </button>
                    </div>

                    <div>
                      <label className="text-white/50 text-xs mb-1 block">Diagnosis</label>
                      <input
                        type="text"
                        value={note.diagnosis}
                        onChange={(e) => setNote({ ...note, diagnosis: e.target.value })}
                        placeholder="Primary diagnosis..."
                        className="glass-input w-full"
                      />
                    </div>

                    <textarea
                      value={note.assessment}
                      onChange={(e) => setNote({ ...note, assessment: e.target.value })}
                      placeholder="Clinical impression, differential diagnosis..."
                      className="glass-input w-full h-32 resize-none"
                    />
                  </div>
                )}

                {activeTab === 'plan' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-white font-medium">Plan</h3>
                      <button
                        onClick={() => handleVoiceInput('plan')}
                        disabled={isRecording}
                        className={`px-3 py-1 text-sm rounded ${isRecording ? 'bg-red-500/20 text-red-400' : 'glass-button'}`}
                      >
                        {isRecording ? '🔴 Recording...' : '🎤 Dictate'}
                      </button>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-white/70 text-sm font-medium">Prescriptions</h4>
                        <button onClick={addPrescription} className="text-sm text-secondary-400 hover:text-secondary-300">
                          + Add Prescription
                        </button>
                      </div>
                      {prescriptions.map((rx, index) => (
                        <div key={index} className="bg-white/5 rounded-lg p-3 mb-2 border border-white/10">
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            <input
                              type="text"
                              value={rx.medication}
                              onChange={(e) => updatePrescription(index, 'medication', e.target.value)}
                              placeholder="Medication"
                              className="glass-input text-sm"
                            />
                            <input
                              type="text"
                              value={rx.dosage}
                              onChange={(e) => updatePrescription(index, 'dosage', e.target.value)}
                              placeholder="Dosage"
                              className="glass-input text-sm"
                            />
                            <input
                              type="text"
                              value={rx.frequency}
                              onChange={(e) => updatePrescription(index, 'frequency', e.target.value)}
                              placeholder="Frequency"
                              className="glass-input text-sm"
                            />
                            <input
                              type="text"
                              value={rx.duration || ''}
                              onChange={(e) => updatePrescription(index, 'duration', e.target.value)}
                              placeholder="Duration"
                              className="glass-input text-sm"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => removePrescription(index)}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-white/50 text-xs mb-1 block">Follow-up Date</label>
                        <input
                          type="date"
                          value={followUp.date}
                          onChange={(e) => setFollowUp({ ...followUp, date: e.target.value })}
                          className="glass-input w-full"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs mb-1 block">Follow-up Instructions</label>
                        <input
                          type="text"
                          value={followUp.instructions}
                          onChange={(e) => setFollowUp({ ...followUp, instructions: e.target.value })}
                          placeholder="Return if symptoms persist..."
                          className="glass-input w-full"
                        />
                      </div>
                    </div>

                    <textarea
                      value={note.plan}
                      onChange={(e) => setNote({ ...note, plan: e.target.value })}
                      placeholder="Treatment plan, next steps..."
                      className="glass-input w-full h-24 resize-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                <button
                  onClick={() => router.back()}
                  className="px-4 py-2 glass-button rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveNote(true)}
                  disabled={saving}
                  className="px-4 py-2 glass-button rounded-lg"
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={() => saveNote(false)}
                  disabled={saving}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                >
                  Save & Complete
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="glass-card">
              <h2 className="text-lg font-semibold text-white mb-4">Note History</h2>
              {noteHistory.length === 0 ? (
                <p className="text-white/50 text-sm">No previous notes</p>
              ) : (
                <div className="space-y-3">
                  {noteHistory.map((n) => (
                    <div key={n.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex justify-between text-xs text-white/50 mb-1">
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded ${
                          n.status === 'final' ? 'bg-green-500/20 text-green-400' :
                          n.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {n.status}
                        </span>
                      </div>
                      {n.subjective && (
                        <p className="text-white/70 text-xs line-clamp-2">{n.subjective}</p>
                      )}
                      {n.diagnosis && (
                        <p className="text-white/50 text-xs mt-1">Dx: {n.diagnosis}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {noteHistory.length > 0 && (
              <div className="glass-card mt-4">
                <h3 className="text-white font-medium mb-3">Quick Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Total Visits</span>
                    <span className="text-white">{noteHistory.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Last Visit</span>
                    <span className="text-white">
                      {noteHistory[0] ? new Date(noteHistory[0].created_at).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

interface Template {
  id: string;
  name: string;
  category: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'template_uri',
    name: 'Upper Respiratory Infection',
    category: 'General Medicine',
    subjective: 'Patient presents with [duration] of [symptoms]. Reports [associated symptoms].',
    objective: 'Temp: [temp]°C. Throat: [throat]. Lungs: [lungs].',
    assessment: '[diagnosis]',
    plan: 'Prescribed [medication]. Return if symptoms persist > 3 days.',
  },
  {
    id: 'template_hypertension',
    name: 'Hypertension Follow-up',
    category: 'Cardiology',
    subjective: 'Patient returns for blood pressure check.',
    objective: 'BP: [systolic]/[diastolic], HR: [heartRate].',
    assessment: 'Essential hypertension.',
    plan: 'Continue [medication]. Return in 4 weeks.',
  },
  {
    id: 'template_diabetes',
    name: 'Diabetes Follow-up',
    category: 'Endocrinology',
    subjective: 'Patient returns for diabetes review.',
    objective: 'BP: [bp]. Blood glucose: [glucose].',
    assessment: 'Type 2 diabetes mellitus.',
    plan: 'Continue [medication]. Monitor diet. Follow-up in 4 weeks.',
  },
];
