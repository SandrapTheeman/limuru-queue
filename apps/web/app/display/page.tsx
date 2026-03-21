'use client';

import { useState, useEffect, useRef } from 'react';
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

const M3U_PLAYLIST_URL = 'https://iptv-org.github.io/iptv/index.m3u';

interface Channel {
  id: string;
  name: string;
  url: string;
  category: string;
  is_active: boolean;
  display_order: number;
}

export default function DisplayPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<HTMLDivElement>(null);
  
  const {
    departments,
    selectedDepartment,
    currentPatient,
    waitingPatients,
    announcement,
    activeChannel,
    channels,
    fetchDepartments,
    selectDepartment,
    fetchQueue,
    setAnnouncement,
    setActiveChannel,
    setChannels,
  } = useDisplayStore();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [streamError, setStreamError] = useState<string | null>(null);
  const [tickerPosition, setTickerPosition] = useState(0);
  const [healthTipIndex, setHealthTipIndex] = useState(0);
  const [prevPatientId, setPrevPatientId] = useState<string | null>(null);
  const [isPatientChanged, setIsPatientChanged] = useState(false);

  useEffect(() => {
    fetchDepartments();
    fetchPlaylist();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchQueue(selectedDepartment.id);
    }
  }, [selectedDepartment, fetchQueue]);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-cycle departments
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

  // Health tips rotation
  useEffect(() => {
    const tipTimer = setInterval(() => {
      setHealthTipIndex(prev => (prev + 1) % HEALTH_TIPS.length);
    }, 10000);
    return () => clearInterval(tipTimer);
  }, []);

  // Ticker animation
  useEffect(() => {
    const tickerAnimation = setInterval(() => {
      setTickerPosition(prev => {
        if (prev <= -100) return 100;
        return prev - 0.5;
      });
    }, 50);
    return () => clearInterval(tickerAnimation);
  }, []);

  // Video stream
  useEffect(() => {
    if (videoRef.current && activeChannel?.url) {
      videoRef.current.src = activeChannel.url;
      videoRef.current.load();
      videoRef.current.play().catch(() => {
        setStreamError('Stream unavailable');
      });
    }
  }, [activeChannel]);

  // Detect patient change for animation
  useEffect(() => {
    if (currentPatient?.id && currentPatient.id !== prevPatientId) {
      setIsPatientChanged(true);
      setPrevPatientId(currentPatient.id);
      setTimeout(() => setIsPatientChanged(false), 1000);
    }
  }, [currentPatient?.id, prevPatientId]);

  const fetchPlaylist = async () => {
    try {
      const response = await fetch(M3U_PLAYLIST_URL);
      if (!response.ok) throw new Error('Failed to fetch playlist');
      const content = await response.text();
      const parsedChannels = parseM3U(content);
      const validChannels = parsedChannels.filter((ch: Channel) => ch.url && ch.url.startsWith('http'));
      setChannels(validChannels);
      if (validChannels.length > 0 && !activeChannel) {
        setActiveChannel(validChannels[0]);
      }
    } catch (error) {
      console.error('Failed to load M3U playlist:', error);
    }
  };

  const parseM3U = (content: string): Channel[] => {
    const lines = content.split('\n');
    const channels: Channel[] = [];
    let currentChannel: Channel | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#EXTINF:')) {
        const info = trimmed.replace('#EXTINF:', '');
        const [, attributes] = info.split(',');
        const attrs: Record<string, string> = {};
        const attrRegex = /([a-zA-Z0-9-]+)="([^"]*)"/g;
        let match;
        while ((match = attrRegex.exec(info)) !== null) {
          attrs[match[1]] = match[2];
        }
        currentChannel = {
          id: attrs['tvg-id'] || `channel-${channels.length}`,
          name: attributes?.trim() || 'Unknown Channel',
          url: '',
          category: attrs['group-title'] || 'Uncategorized',
          is_active: true,
          display_order: channels.length + 1,
        };
      } else if (trimmed && !trimmed.startsWith('#') && currentChannel) {
        currentChannel.url = trimmed;
        channels.push(currentChannel);
        currentChannel = null;
      }
    }
    return channels;
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
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate estimated wait time
  const estimatedWaitMinutes = waitingPatients.length * 12;

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Top Header Bar */}
      <header className="bg-slate-900/95 border-b border-slate-700/50 py-3 px-6 flex-shrink-0 backdrop-blur-md">
        <div className="flex justify-between items-center max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-teal-500/30">
              🏥
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Limuru Cottage Hospital</h1>
              <p className="text-slate-400 text-sm">Digital Queuing System</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            {/* Department Tabs */}
            <div className="flex gap-2">
              {departments.slice(0, 5).map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => selectDepartment(dept)}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-300 ${
                    selectedDepartment?.id === dept.id
                      ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30 scale-105'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:scale-102'
                  }`}
                >
                  {dept.code || dept.name.substring(0, 4).toUpperCase()}
                </button>
              ))}
            </div>

            {/* Date & Time */}
            <div className="text-right bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50">
              <div className="text-2xl font-bold text-white tabular-nums tracking-wider">
                {formatTime(currentTime)}
              </div>
              <div className="text-slate-400 text-xs">{formatDate(currentTime)}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Announcement Banner */}
      {announcement && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 py-2 px-6 flex-shrink-0 animate-pulse">
          <div className="flex items-center justify-center gap-3 max-w-[1920px] mx-auto">
            <span className="text-xl">📢</span>
            <span className="text-white font-semibold text-lg uppercase tracking-wide">
              {announcement}
            </span>
            <span className="text-xl">📢</span>
          </div>
        </div>
      )}

      {/* Main Content - Split Screen */}
      <main className="flex-1 flex gap-4 p-4 max-w-[1920px] mx-auto w-full overflow-hidden">
        {/* Left Panel - Queue Display */}
        <div className="w-[40%] flex flex-col gap-4">
          {/* Current Patient Card */}
          <div className={`
            bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-6 flex-shrink-0 shadow-2xl
            transition-all duration-500
            ${isPatientChanged ? 'scale-[1.02] shadow-teal-500/40' : ''}
          `}>
            <div className="text-teal-200 text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-teal-300 rounded-full animate-pulse"></span>
              Now Serving
            </div>
            {currentPatient ? (
              <div className="text-center">
                <div className={`
                  text-8xl font-black text-white mb-2
                  transition-all duration-300
                  ${isPatientChanged ? 'scale-110' : ''}
                `}>
                  {currentPatient.ticket_number}
                </div>
                <div className="text-3xl font-bold text-teal-100">
                  Patient #{currentPatient.patient_number || currentPatient.id?.slice(-4)}
                </div>
                {currentPatient.priority && (
                  <div className="mt-3 inline-block px-4 py-1 bg-amber-400 text-amber-900 rounded-full font-bold text-sm uppercase shadow-lg">
                    ⚠️ Priority
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl text-teal-300/50 mb-2">--</div>
                <div className="text-teal-200 text-xl">No patient called</div>
              </div>
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 flex-shrink-0">
            <div className="bg-slate-800/80 rounded-2xl p-4 text-center border border-slate-700/50 backdrop-blur-sm hover:border-teal-500/30 transition-colors">
              <div className="text-4xl font-black text-teal-400">
                {waitingPatients.length}
              </div>
              <div className="text-slate-400 text-sm mt-1 uppercase tracking-wide">
                Waiting
              </div>
            </div>
            <div className="bg-slate-800/80 rounded-2xl p-4 text-center border border-slate-700/50 backdrop-blur-sm hover:border-amber-500/30 transition-colors">
              <div className="text-4xl font-black text-amber-400">
                ~{estimatedWaitMinutes}
              </div>
              <div className="text-slate-400 text-sm mt-1 uppercase tracking-wide">
                Est. Minutes
              </div>
            </div>
            <div className="bg-slate-800/80 rounded-2xl p-4 text-center border border-slate-700/50 backdrop-blur-sm hover:border-blue-500/30 transition-colors">
              <div className="text-2xl font-bold text-white">
                {selectedDepartment?.code || 'N/A'}
              </div>
              <div className="text-slate-400 text-sm mt-1 uppercase tracking-wide">
                Dept
              </div>
            </div>
          </div>

          {/* Waiting Queue List */}
          <div className="bg-slate-800/80 rounded-2xl p-4 flex-1 flex flex-col border border-slate-700/50 overflow-hidden backdrop-blur-sm">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
                Up Next
              </h2>
              <div className="text-slate-400 text-sm bg-slate-700/50 px-3 py-1 rounded-full">
                {waitingPatients.length} patients
              </div>
            </div>
            <div ref={queueRef} className="flex-1 overflow-y-auto space-y-2 pr-2">
              {waitingPatients.slice(0, 12).map((patient, index) => (
                <div
                  key={patient.id || index}
                  className={`
                    flex items-center justify-between p-3 
                    bg-slate-700/50 rounded-xl
                    transition-all duration-300
                    hover:bg-slate-700/80 hover:translate-x-1
                    ${index === 0 ? 'border-l-2 border-l-teal-400 bg-teal-500/10' : ''}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                      ${index === 0 ? 'bg-teal-500 text-white' : 'bg-slate-600 text-slate-300'}
                    `}>
                      {index + 1}
                    </span>
                    {patient.priority && (
                      <span className="px-2 py-0.5 bg-amber-500/20 rounded text-amber-400 text-xs font-bold uppercase animate-pulse">
                        !
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-white font-mono tracking-wider">
                      {patient.ticket_number}
                    </span>
                  </div>
                  <div className="text-slate-400 text-sm w-16 text-right flex items-center justify-end gap-1">
                    <span>⏱️</span>
                    <span>{patient.wait_time || 0}m</span>
                  </div>
                </div>
              ))}
              {waitingPatients.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3 opacity-30">✓</div>
                  <div className="text-slate-500 text-lg">No patients waiting</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - IPTV */}
        <div className="w-[60%] flex flex-col gap-4">
          {/* Channel Info Bar */}
          <div className="bg-slate-800/80 rounded-xl p-4 flex items-center justify-between border border-slate-700/50 flex-shrink-0 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-xl shadow-lg">
                📺
              </div>
              <div>
                <div className="text-slate-400 text-xs uppercase tracking-wide">Now Playing</div>
                <div className="text-white font-bold text-lg">
                  {activeChannel?.name || 'No Channel Selected'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-slate-400 text-sm bg-slate-700/50 px-3 py-1 rounded-full">
                {activeChannel?.category || 'Entertainment'}
              </div>
              <div className="flex gap-1">
                {channels.slice(0, 5).map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      activeChannel?.id === ch.id
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                    }`}
                  >
                    {ch.name.substring(0, 6)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Video Player */}
          <div className="flex-1 bg-black rounded-2xl overflow-hidden relative border border-slate-700/50">
            {activeChannel?.url ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain"
                  autoPlay
                  muted
                  playsInline
                  onError={() => setStreamError('Stream unavailable')}
                />
                {streamError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📡</div>
                      <div className="text-red-400 text-xl font-semibold mb-2">{streamError}</div>
                      <div className="text-slate-400">Please try another channel</div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <div className="text-center">
                  <div className="text-8xl mb-4 opacity-50">📺</div>
                  <div className="text-slate-400 text-2xl font-semibold">No Channel Selected</div>
                  <div className="text-slate-500 mt-2">Select a channel to begin</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Health Tips Ticker */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-t border-slate-700/50 py-3 px-6 flex-shrink-0">
        <div className="flex items-center gap-6 max-w-[1920px] mx-auto">
          <div className="flex items-center gap-2 flex-shrink-0 bg-gradient-to-r from-teal-500/20 to-teal-500/10 px-3 py-1.5 rounded-full border border-teal-500/20">
            <span className="text-xl">💡</span>
            <span className="text-teal-400 font-bold uppercase tracking-wide text-sm">
              Health Tip
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div
              ref={tickerRef}
              className="text-white text-lg transition-transform duration-100"
              style={{ transform: `translateX(${tickerPosition}%)` }}
            >
              {HEALTH_TIPS[healthTipIndex]}
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            {HEALTH_TIPS.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === healthTipIndex ? 'bg-teal-400 scale-125' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-900/95 py-2 px-6 flex justify-between items-center text-slate-500 text-sm flex-shrink-0 border-t border-slate-800">
        <div className="flex items-center gap-4">
          <span>Auto-refresh: <span className="text-teal-400 font-semibold">30s</span></span>
          <span>|</span>
          <span>Next update: <span className="text-white">{formatTime(new Date(currentTime.getTime() + 30000))}</span></span>
        </div>
        <div>
          Powered by <span className="text-teal-400 font-semibold">Limuru Cottage Hospital</span> | Queue Management System
        </div>
      </div>
    </div>
  );
}
