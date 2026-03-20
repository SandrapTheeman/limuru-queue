'use client';

import { Phone, PhoneOff } from 'lucide-react';
import { useState, useEffect } from 'react';

interface VoiceCallButtonProps {
  targetUserId: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  variant?: 'default' | 'minimal' | 'full';
  onCallStart?: (targetUserId: string) => void;
  isOnline?: boolean;
  userName?: string;
}

export function VoiceCallButton({
  targetUserId,
  priority = 'normal',
  variant = 'default',
  onCallStart,
  isOnline = true,
  userName = 'User',
}: VoiceCallButtonProps) {
  const [status, setStatus] = useState<'idle' | 'calling' | 'connected'>('idle');

  const priorityColors = {
    low: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    normal: 'bg-blue-500 hover:bg-blue-600 text-white',
    high: 'bg-orange-500 hover:bg-orange-600 text-white',
    urgent: 'bg-red-500 hover:bg-red-600 text-white animate-pulse',
  };

  const handleCall = () => {
    if (!isOnline) return;
    if (status === 'idle') {
      setStatus('calling');
      onCallStart?.(targetUserId);
    } else if (status === 'connected') {
      setStatus('idle');
    }
  };

  useEffect(() => {
    if (status === 'calling') {
      const timer = setTimeout(() => setStatus('connected'), 1500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleCall}
        disabled={!isOnline}
        className={`p-2 rounded-full transition-all ${
          !isOnline
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : status === 'connected'
            ? 'bg-green-500 text-white'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
        title={isOnline ? (status === 'connected' ? 'End Call' : 'Start Call') : 'User Offline'}
      >
        {status === 'connected' ? <PhoneOff size={16} /> : <Phone size={16} />}
      </button>
    );
  }

  if (variant === 'full') {
    return (
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-md border">
        <div className="relative">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900">{userName}</p>
          <p className="text-xs text-gray-500">
            {isOnline ? 'Available' : 'Offline'}
          </p>
        </div>
        <button
          onClick={handleCall}
          disabled={!isOnline}
          className={`p-3 rounded-full transition-all ${
            !isOnline
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : status === 'connected'
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : priorityColors[priority]
          }`}
        >
          {status === 'connected' ? <PhoneOff size={20} /> : <Phone size={20} />}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleCall}
      disabled={!isOnline}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
        !isOnline
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : status === 'connected'
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : priorityColors[priority]
      }`}
    >
      {status === 'connected' ? (
        <>
          <PhoneOff size={18} />
          <span>End Call</span>
        </>
      ) : (
        <>
          <Phone size={18} />
          <span>Call</span>
        </>
      )}
    </button>
  );
}
