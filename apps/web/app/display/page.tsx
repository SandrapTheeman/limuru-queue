'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDisplayStore } from '@/lib/stores/display';
import { apiClient } from '@/lib/api/client';

const HEALTH_TIPS = [
  "Stay hydrated - drink at least 8 glasses of water daily",
  "Wash your hands frequently to prevent infections",
  "Get regular check-ups for early detection of health issues",
  "Maintain a balanced diet rich in fruits and vegetables",
  "Exercise for at least 30 minutes every day",
  "Get adequate sleep - 7-9 hours for adults",
  "Manage stress through meditation or deep breathing",
  "Avoid smoking and limit alcohol consumption",
  "Keep your vaccinations up to date",
  "Report any unusual symptoms to your doctor promptly",
];

interface QueuePatient {
  id: string;
  ticket_number: string;
  patient_number: string;
  patient_name?: string;
  department?: string;
  priority: boolean;
  wait_time: number;
  position: number;
  status: string;
  room_assigned?: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function DisplayPage() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);
  
  const {
    departments,
    selectedDepartment,
    currentPatient,
    waitingPatients,
    announcement,
    fetchDepartments,
    selectDepartment,
    fetchQueue,
    setAnnouncement,
  } = useDisplayStore();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [tickerPosition, setTickerPosition] = useState(0);
  const [healthTipIndex, setHealthTipIndex] = useState(0);
  const [prevPatientId, setPrevPatientId] = useState<string | null>(null);
  const [isPatientChanged, setIsPatientChanged] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const [videoBackground, setVideoBackground] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkNightHours = useCallback(() => {
    const hour = new Date().getHours();
    return hour >= 21 || hour < 6;
  }, []);

  useEffect(() => {
    setIsNightMode(checkNightHours());
    fetchDepartments();
  }, [fetchDepartments, checkNightHours]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchQueue(selectedDepartment.id);
    }
  }, [selectedDepartment, fetchQueue]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const deptTimer = setInterval(() => {
      if (departments.length > 0) {
        const currentIdx = departments.findIndex(d => d.id === selectedDepartment?.id);
        const nextIdx = (currentIdx + 1) % departments.length;
        selectDepartment(departments[nextIdx]);
      }
    }, 45000);
    return () => clearInterval(deptTimer);
  }, [departments, selectedDepartment, selectDepartment]);

  useEffect(() => {
    const tipTimer = setInterval(() => {
      setHealthTipIndex(prev => (prev + 1) % HEALTH_TIPS.length);
    }, 8000);
    return () => clearInterval(tipTimer);
  }, []);

  useEffect(() => {
    const tickerAnimation = setInterval(() => {
      setTickerPosition(prev => {
        if (prev <= -100) return 100;
        return prev - 0.3;
      });
    }, 50);
    return () => clearInterval(tickerAnimation);
  }, []);

  useEffect(() => {
    const refreshTimer = setInterval(() => {
      if (selectedDepartment) {
        fetchQueue(selectedDepartment.id);
      }
    }, 5000);
    return () => clearInterval(refreshTimer);
  }, [selectedDepartment, fetchQueue]);

  useEffect(() => {
    if (currentPatient?.id && currentPatient.id !== prevPatientId) {
      setIsPatientChanged(true);
      setPrevPatientId(currentPatient.id);
      playAnnouncement();
      setTimeout(() => setIsPatientChanged(false), 1500);
    }
  }, [currentPatient?.id, prevPatientId]);

  const playAnnouncement = () => {
    if (audioRef.current && currentPatient) {
      audioRef.current.play().catch(() => {});
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-KE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const estimatedWaitMinutes = waitingPatients.length * 12;

  const nightModeClass = isNightMode 
    ? 'bg-slate-950' 
    : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900';

  const headerBg = isNightMode 
    ? 'bg-slate-950/95 border-slate-800/50' 
    : 'bg-slate-900/95 border-slate-700/50';

  return (
    <div className={`min-h-screen flex flex-col overflow-hidden ${nightModeClass}`}>
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVcQNpHW+NueZVQ1Yqzk/5VkTTZgr+j/q2tTP2Kr5f+kaVQ5Zavm/6NnVD5kq+f/n2hVPmSr5v+gaFU+Z6vm/59pVT5mq+f/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU+Z6vm/6BpVT5nq+b/oGlVPmer5v+gaVU=" type="audio/wav" />
      </audio>

      {videoBackground && (
        <video
          ref={videoRef}
          className="fixed inset-0 w-full h-full object-cover opacity-20 pointer-events-none z-0"
          autoPlay
          muted
          loop
          playsInline
        />
      )}

      <header className={`${headerBg} border-b py-4 px-8 flex-shrink-0 backdrop-blur-md z-10 relative`}>
        <div className="flex justify-between items-center max-w-[1920px] mx-auto">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-teal-500/30">
              🏥
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Limuru Cottage Hospital</h1>
              <p className="text-slate-400 text-base">Digital Queue Display</p>
            </div>
          </div>

          <div className="flex items-center gap-10">
            <div className="flex gap-2">
              {departments.slice(0, 6).map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => selectDepartment(dept)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                    selectedDepartment?.id === dept.id
                      ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30 scale-105'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:scale-102'
                  }`}
                >
                  {dept.code || dept.name.substring(0, 4).toUpperCase()}
                </button>
              ))}
            </div>

            <div className={`text-right px-5 py-3 rounded-xl border ${isNightMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-800/50 border-slate-700/50'}`}>
              <div className="text-3xl font-bold text-white tabular-nums tracking-wider">
                {formatTime(currentTime)}
              </div>
              <div className="text-slate-400 text-sm">{formatDate(currentTime)}</div>
            </div>
          </div>
        </div>
      </header>

      {announcement && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 py-3 px-6 flex-shrink-0 animate-pulse z-10 relative">
          <div className="flex items-center justify-center gap-4 max-w-[1920px] mx-auto">
            <span className="text-2xl">📢</span>
            <span className="text-white font-bold text-xl uppercase tracking-wide">
              {announcement}
            </span>
            <span className="text-2xl">📢</span>
          </div>
        </div>
      )}

      <main className="flex-1 flex gap-6 p-6 max-w-[1920px] mx-auto w-full overflow-hidden relative z-10">
        <div className="flex-1 flex flex-col gap-6">
          <div className={`
            bg-gradient-to-br from-teal-600 to-teal-800 rounded-3xl p-8 flex-shrink-0 shadow-2xl
            transition-all duration-500 border-2 border-teal-400/30
            ${isPatientChanged ? 'scale-[1.02] shadow-teal-500/50' : ''}
          `}>
            <div className="text-teal-200 text-lg font-semibold uppercase tracking-wider mb-4 flex items-center gap-3">
              <span className="w-3 h-3 bg-teal-300 rounded-full animate-pulse"></span>
              Now Calling
            </div>
            {currentPatient ? (
              <div className="text-center">
                <div className={`
                  text-[12rem] font-black text-white leading-none mb-4
                  transition-all duration-300
                  ${isPatientChanged ? 'scale-110' : ''}
                `}>
                  {currentPatient.ticket_number}
                </div>
                <div className="text-4xl font-bold text-teal-100">
                  {currentPatient.patient_name || `Patient #${currentPatient.patient_number || currentPatient.id?.slice(-4)}`}
                </div>
                <div className="text-2xl font-semibold text-teal-200 mt-2">
                  Room {currentPatient.room_assigned || '--'} • {selectedDepartment?.name || currentPatient.department || 'General'}
                </div>
                {currentPatient.priority && (
                  <div className="mt-4 inline-block px-6 py-2 bg-amber-400 text-amber-900 rounded-full font-bold text-lg uppercase shadow-lg animate-pulse">
                    ⚠️ Priority
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-8xl text-teal-300/50 mb-4">--</div>
                <div className="text-teal-200 text-3xl">No patient called</div>
                <div className="text-teal-300/70 text-xl mt-2">Please wait for your number</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 flex-shrink-0">
            <div className={`rounded-2xl p-5 text-center border backdrop-blur-sm ${isNightMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-800/80 border-slate-700/50'}`}>
              <div className="text-5xl font-black text-teal-400">
                {waitingPatients.length}
              </div>
              <div className="text-slate-400 text-sm mt-2 uppercase tracking-wide font-semibold">
                Waiting
              </div>
            </div>
            <div className={`rounded-2xl p-5 text-center border backdrop-blur-sm ${isNightMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-800/80 border-slate-700/50'}`}>
              <div className="text-5xl font-black text-amber-400">
                ~{estimatedWaitMinutes}
              </div>
              <div className="text-slate-400 text-sm mt-2 uppercase tracking-wide font-semibold">
                Est. Minutes
              </div>
            </div>
            <div className={`rounded-2xl p-5 text-center border backdrop-blur-sm ${isNightMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-800/80 border-slate-700/50'}`}>
              <div className="text-3xl font-bold text-white">
                {selectedDepartment?.code || 'N/A'}
              </div>
              <div className="text-slate-400 text-sm mt-2 uppercase tracking-wide font-semibold">
                Department
              </div>
            </div>
          </div>

          <div className={`flex-1 rounded-2xl p-5 flex flex-col border overflow-hidden backdrop-blur-sm ${isNightMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-800/80 border-slate-700/50'}`}>
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-2xl font-bold text-white uppercase tracking-wide flex items-center gap-3">
                <span className="w-3 h-3 bg-teal-400 rounded-full"></span>
                Up Next
              </h2>
              <div className="text-slate-400 text-sm bg-slate-700/50 px-4 py-2 rounded-full font-medium">
                {waitingPatients.length} patients
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {waitingPatients.slice(0, 8).map((patient, index) => (
                <div
                  key={patient.id || index}
                  className={`
                    flex items-center justify-between p-4 
                    rounded-xl transition-all duration-300
                    hover:translate-x-2
                    ${index === 0 ? 'border-l-4 border-l-teal-400 bg-teal-500/10' : 'bg-slate-700/30'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <span className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                      ${index === 0 ? 'bg-teal-500 text-white' : 'bg-slate-600 text-slate-300'}
                    `}>
                      {index + 1}
                    </span>
                    {patient.priority && (
                      <span className="px-3 py-1 bg-amber-500/20 rounded-full text-amber-400 text-sm font-bold uppercase animate-pulse">
                        ! Priority
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-bold text-white font-mono tracking-wider">
                      {patient.ticket_number}
                    </span>
                  </div>
                  <div className="text-slate-400 text-lg font-medium flex items-center gap-2">
                    <span>⏱️</span>
                    <span>{patient.wait_time || 0}m</span>
                  </div>
                </div>
              ))}
              {waitingPatients.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4 opacity-30">✓</div>
                  <div className="text-slate-500 text-2xl">No patients waiting</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <div className={`border-t py-4 px-8 flex-shrink-0 ${isNightMode ? 'bg-slate-950 border-slate-800' : 'bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700/50'}`}>
        <div className="flex items-center gap-6 max-w-[1920px] mx-auto">
          <div className="flex items-center gap-3 flex-shrink-0 bg-gradient-to-r from-teal-500/20 to-teal-500/10 px-4 py-2 rounded-full border border-teal-500/20">
            <span className="text-2xl">💡</span>
            <span className="text-teal-400 font-bold uppercase tracking-wide text-base">
              Health Tip
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div
              ref={tickerRef}
              className="text-white text-xl transition-transform duration-100 whitespace-nowrap"
              style={{ transform: `translateX(${tickerPosition}%)` }}
            >
              {HEALTH_TIPS[healthTipIndex]}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {HEALTH_TIPS.map((_, idx) => (
              <div
                key={idx}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  idx === healthTipIndex ? 'bg-teal-400 scale-125' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={`py-3 px-8 flex justify-between items-center text-slate-500 text-sm flex-shrink-0 border-t ${isNightMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-900/95 border-slate-800'}`}>
        <div className="flex items-center gap-4">
          <span>Auto-refresh: <span className="text-teal-400 font-semibold">5s</span></span>
          <span className="text-slate-600">|</span>
          <span>Next update: <span className="text-white">{formatTime(new Date(currentTime.getTime() + 5000))}</span></span>
        </div>
        <div className="flex items-center gap-4">
          {isNightMode && (
            <button 
              onClick={() => setIsNightMode(false)}
              className="text-amber-400 hover:text-amber-300 text-sm"
            >
              ☀️ Day Mode
            </button>
          )}
          {!isNightMode && (
            <button 
              onClick={() => setIsNightMode(true)}
              className="text-slate-400 hover:text-slate-300 text-sm"
            >
              🌙 Night Mode
            </button>
          )}
          <span>Powered by <span className="text-teal-400 font-semibold">Limuru Cottage Hospital</span> | Queue Management</span>
        </div>
      </div>
    </div>
  );
}