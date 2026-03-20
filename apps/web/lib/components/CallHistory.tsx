'use client';

import { useState } from 'react';
import {
  Phone,
  PhoneMissed,
  PhoneOutgoing,
  PhoneIncoming,
  Clock,
  Filter,
  Calendar,
  ArrowRightLeft,
  Search,
  X,
} from 'lucide-react';

export type CallType = 'all' | 'incoming' | 'outgoing' | 'missed';

export interface CallHistoryItem {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: Date;
  duration?: number;
  notes?: string;
}

interface CallHistoryProps {
  items: CallHistoryItem[];
  onCallBack: (userId: string) => void;
  onViewDetails?: (callId: string) => void;
  maxHeight?: string;
}

export function CallHistory({
  items,
  onCallBack,
  onViewDetails,
  maxHeight = '400px',
}: CallHistoryProps) {
  const [filterType, setFilterType] = useState<CallType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [selectedCall, setSelectedCall] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredItems = items.filter((item) => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch = item.callerName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    let matchesDate = true;
    if (dateRange.start) {
      matchesDate =
        matchesDate && new Date(item.timestamp) >= new Date(dateRange.start);
    }
    if (dateRange.end) {
      matchesDate =
        matchesDate && new Date(item.timestamp) <= new Date(dateRange.end);
    }

    return matchesType && matchesSearch && matchesDate;
  });

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallIcon = (type: CallHistoryItem['type']) => {
    switch (type) {
      case 'incoming':
        return <PhoneIncoming className="w-4 h-4 text-green-500" />;
      case 'outgoing':
        return <PhoneOutgoing className="w-4 h-4 text-blue-500" />;
      case 'missed':
        return <PhoneMissed className="w-4 h-4 text-red-500" />;
    }
  };

  const getTypeLabel = (type: CallType) => {
    switch (type) {
      case 'all':
        return 'All';
      case 'incoming':
        return 'Incoming';
      case 'outgoing':
        return 'Outgoing';
      case 'missed':
        return 'Missed';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Call History
          </h3>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`p-2 rounded-lg transition-colors ${
              isFilterOpen
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search calls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isFilterOpen && (
          <div className="space-y-4 p-4 bg-white rounded-lg border mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Call Type
              </label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'incoming', 'outgoing', 'missed'] as CallType[]).map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        filterType === type
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {getTypeLabel(type)}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {(dateRange.start || dateRange.end) && (
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear dates
              </button>
            )}
          </div>
        )}

        <div className="flex gap-1 overflow-x-auto pb-2">
          {(['all', 'incoming', 'outgoing', 'missed'] as CallType[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filterType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getTypeLabel(type)}
              </button>
            )
          )}
        </div>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight }}>
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Phone className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No calls found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedCall === item.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  setSelectedCall(item.id);
                  onViewDetails?.(item.id);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    {item.callerAvatar ? (
                      <img
                        src={item.callerAvatar}
                        alt={item.callerName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-600">
                          {item.callerName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border flex items-center justify-center">
                      {getCallIcon(item.type)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 truncate">
                        {item.callerName}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatDate(item.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 capitalize">
                        {item.type}
                      </span>
                      {item.duration !== undefined && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(item.duration)}
                          </span>
                        </>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCallBack(item.callerId);
                    }}
                    className="flex-shrink-0 p-2 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
                    title="Call back"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {filteredItems.length > 0 && (
        <div className="p-3 border-t bg-gray-50 text-center">
          <p className="text-xs text-gray-500">
            Showing {filteredItems.length} of {items.length} calls
          </p>
        </div>
      )}
    </div>
  );
}
