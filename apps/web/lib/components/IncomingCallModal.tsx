'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, PhoneIncoming, User } from 'lucide-react';

interface IncomingCallModalProps {
  isOpen: boolean;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  onAccept: () => void;
  onReject: () => void;
  autoDeclineAfter?: number;
}

export function IncomingCallModal({
  isOpen,
  callerId,
  callerName,
  callerAvatar,
  priority = 'normal',
  onAccept,
  onReject,
  autoDeclineAfter = 30,
}: IncomingCallModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(autoDeclineAfter);
  const [isRinging, setIsRinging] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeRemaining(autoDeclineAfter);
      setIsRinging(true);

      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleU07teleU04teleU04teleU04tl');
      audio.loop = true;
      audioRef.current = audio;
      audio.play().catch(() => {});
    }

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [isOpen, autoDeclineAfter]);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRinging(false);
          onReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onReject]);

  const handleAccept = () => {
    setIsRinging(false);
    audioRef.current?.pause();
    onAccept();
  };

  const handleReject = () => {
    setIsRinging(false);
    audioRef.current?.pause();
    onReject();
  };

  const priorityStyles = {
    low: 'border-gray-300 bg-gray-50',
    normal: 'border-blue-300 bg-blue-50',
    high: 'border-orange-300 bg-orange-50',
    urgent: 'border-red-300 bg-red-50 animate-pulse',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-md mx-4 rounded-2xl border-2 p-6 shadow-2xl ${priorityStyles[priority]} ${
          isRinging ? 'animate-bounce' : ''
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            {callerAvatar ? (
              <img
                src={callerAvatar}
                alt={callerName}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-white shadow-lg flex items-center justify-center">
                <User className="w-12 h-12 text-blue-600" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
              <PhoneIncoming className="w-4 h-4 text-white animate-pulse" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            Incoming Call
          </h2>
          <p className="text-lg font-medium text-gray-700 mb-2">{callerName}</p>
          
          <div className="flex items-center gap-2 mb-6">
            <div className={`w-2 h-2 rounded-full ${
              priority === 'urgent' ? 'bg-red-500 animate-pulse' : 
              priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'
            }`} />
            <span className="text-sm text-gray-600 capitalize">{priority} Priority</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
              style={{ width: `${((autoDeclineAfter - timeRemaining) / autoDeclineAfter) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mb-6">
            Auto-decline in {timeRemaining}s
          </p>

          <div className="flex gap-4 w-full">
            <button
              onClick={handleReject}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all transform hover:scale-105"
            >
              <PhoneOff size={24} />
              <span>Reject</span>
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all transform hover:scale-105"
            >
              <Phone size={24} />
              <span>Accept</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
