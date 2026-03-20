'use client';

import { useState, useEffect } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  ArrowRightLeft,
  User,
  Clock,
} from 'lucide-react';

interface ActiveCallUIProps {
  isOpen: boolean;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  isOnHold?: boolean;
  isMuted?: boolean;
  onEndCall: () => void;
  onToggleMute?: () => void;
  onToggleHold?: () => void;
  onTransfer?: () => void;
}

export function ActiveCallUI({
  isOpen,
  callerId,
  callerName,
  callerAvatar,
  isOnHold = false,
  isMuted = false,
  onEndCall,
  onToggleMute,
  onToggleHold,
  onTransfer,
}: ActiveCallUIProps) {
  const [duration, setDuration] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-lg mx-4">
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6">
            {callerAvatar ? (
              <img
                src={callerAvatar}
                alt={callerName}
                className={`w-32 h-32 rounded-full object-cover border-4 border-green-500 shadow-2xl ${
                  isOnHold ? 'opacity-50 grayscale' : ''
                }`}
              />
            ) : (
              <div
                className={`w-32 h-32 rounded-full bg-blue-100 border-4 border-green-500 shadow-2xl flex items-center justify-center ${
                  isOnHold ? 'opacity-50 grayscale' : ''
                }`}
              >
                <User className="w-16 h-16 text-blue-600" />
              </div>
            )}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isOnHold ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'
              }`}>
                {isOnHold ? 'On Hold' : 'Connected'}
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{callerName}</h2>
          <p className="text-gray-400">Call in progress</p>

          <div className="flex items-center justify-center gap-2 mt-4">
            <Clock className="w-4 h-4 text-green-400" />
            <span className="text-xl font-mono text-green-400">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <button
            onClick={onToggleMute}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
            <span className="text-xs text-white font-medium">
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
          </button>

          <button
            onClick={onToggleHold}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
              isOnHold
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isOnHold ? (
              <Play className="w-6 h-6 text-white" />
            ) : (
              <Pause className="w-6 h-6 text-white" />
            )}
            <span className="text-xs text-white font-medium">
              {isOnHold ? 'Resume' : 'Hold'}
            </span>
          </button>

          <button
            onClick={onTransfer}
            className="flex flex-col items-center gap-2 p-4 bg-gray-700 hover:bg-gray-600 rounded-xl transition-all"
          >
            <ArrowRightLeft className="w-6 h-6 text-white" />
            <span className="text-xs text-white font-medium">Transfer</span>
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onEndCall}
            className="flex items-center gap-3 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            <PhoneOff className="w-6 h-6" />
            <span>End Call</span>
          </button>
        </div>

        <div className="mt-8 flex justify-center gap-6 text-xs text-gray-500">
          <span>Press M to {isMuted ? 'unmute' : 'mute'}</span>
          <span>Press H to {isOnHold ? 'resume' : 'hold'}</span>
          <span>Press Escape to end</span>
        </div>
      </div>
    </div>
  );
}
