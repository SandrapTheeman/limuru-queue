'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  PhoneOff,
  X,
  Search,
  Users,
  Filter,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';
import { useVoiceCallStore } from '@/lib/stores/voice';
import {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  getStaffMembers,
  type StaffMember,
} from '@/lib/api/voice';

interface StaffDirectoryProps {
  isOpen: boolean;
  onClose: () => void;
  onCallInitiated?: (targetUserId: string, callId: string) => void;
  department?: string;
}

/**
 * Staff Directory Component
 * Allows users to find and call other staff members
 */
export function StaffDirectory({
  isOpen,
  onClose,
  onCallInitiated,
  department,
}: StaffDirectoryProps) {
  const { user } = useAuthStore();
  const {
    setCurrentCall,
    setIncomingCall,
    clearIncomingCall,
    simulateCallAccepted,
    simulateCallEnded,
    incomingCall,
    isRinging,
  } = useVoiceCallStore();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [callingUserId, setCallingUserId] = useState<string | null>(null);
  const [callingUserName, setCallingUserName] = useState<string | null>(null);

  // Mock staff data for demo when API is unavailable
  const mockStaff: StaffMember[] = [
    { id: 'doc-001', name: 'Dr. Sarah Johnson', email: 'sarah@hospital.com', role: 'doctor', department: 'MED', isOnline: true },
    { id: 'doc-002', name: 'Dr. Michael Chen', email: 'michael@hospital.com', role: 'doctor', department: 'CARD', isOnline: true },
    { id: 'doc-003', name: 'Dr. Emily Brown', email: 'emily@hospital.com', role: 'doctor', department: 'PED', isOnline: false },
    { id: 'nurse-001', name: 'James Wilson', email: 'james@hospital.com', role: 'nurse', department: 'MED', isOnline: true },
    { id: 'nurse-002', name: 'Lisa Anderson', email: 'lisa@hospital.com', role: 'nurse', department: 'EMER', isOnline: true },
    { id: 'nurse-003', name: 'David Martinez', email: 'david@hospital.com', role: 'nurse', department: 'PED', isOnline: false },
    { id: 'recep-001', name: 'Maria Garcia', email: 'maria@hospital.com', role: 'receptionist', department: 'RECEP', isOnline: true },
    { id: 'recep-002', name: 'Robert Taylor', email: 'robert@hospital.com', role: 'receptionist', department: 'RECEP', isOnline: true },
  ];

  // Fetch staff members
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getStaffMembers(department);
      if (response.success && response.data) {
        setStaff(response.data);
        setFilteredStaff(response.data);
      } else {
        // Use mock data if API fails
        console.log('Using mock staff data');
        const mockFiltered = department
          ? mockStaff.filter((s) => s.department === department)
          : mockStaff;
        setStaff(mockFiltered);
        setFilteredStaff(mockFiltered);
      }
    } catch (err) {
      console.log('Using mock staff data due to error');
      const mockFiltered = department
        ? mockStaff.filter((s) => s.department === department)
        : mockStaff;
      setStaff(mockFiltered);
      setFilteredStaff(mockFiltered);
    } finally {
      setLoading(false);
    }
  }, [department]);

  // Initial fetch
  useEffect(() => {
    if (isOpen) {
      fetchStaff();
    }
  }, [isOpen, fetchStaff]);

  // Filter staff when search or role filter changes
  useEffect(() => {
    let filtered = staff;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.role.toLowerCase().includes(query)
      );
    }

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter((s) => s.role === filterRole);
    }

    // Exclude current user
    filtered = filtered.filter((s) => s.id !== user?.id);

    setFilteredStaff(filtered);
  }, [searchQuery, filterRole, staff, user?.id]);

  // Handle initiating a call
  const handleInitiateCall = async (targetUser: StaffMember) => {
    setCallingUserId(targetUser.id);
    setCallingUserName(targetUser.name);

    try {
      const response = await initiateCall({
        targetUserId: targetUser.id,
        priority: 'normal',
        metadata: {
          department: user?.role || undefined,
        },
      });

      if (response.success && response.data) {
        // Set the current call in store
        setCurrentCall({
          callId: response.data.callId,
          callerId: user?.id || '',
          callerName: user?.name || 'Unknown',
          calleeId: targetUser.id,
          calleeName: targetUser.name,
          status: 'connecting',
          priority: 'normal',
          startedAt: new Date().toISOString(),
          isMuted: false,
          isOnHold: false,
        });

        onCallInitiated?.(targetUser.id, response.data.callId);

        // Simulate call connecting after a delay (in real app, this would be WebSocket)
        setTimeout(() => {
          setCurrentCall({
            callId: response.data!.callId,
            callerId: user?.id || '',
            callerName: user?.name || 'Unknown',
            calleeId: targetUser.id,
            calleeName: targetUser.name,
            status: 'active',
            priority: 'normal',
            startedAt: new Date().toISOString(),
            isMuted: false,
            isOnHold: false,
          });
        }, 2000);
      } else {
        // Demo mode - simulate call without API
        console.log('Demo mode: Simulating call');
        setCurrentCall({
          callId: `demo-${Date.now()}`,
          callerId: user?.id || '',
          callerName: user?.name || 'Unknown',
          calleeId: targetUser.id,
          calleeName: targetUser.name,
          status: 'active',
          priority: 'normal',
          startedAt: new Date().toISOString(),
          isMuted: false,
          isOnHold: false,
        });
        onCallInitiated?.(targetUser.id, `demo-${Date.now()}`);
      }
    } catch (err) {
      // Demo mode fallback
      console.log('Demo mode: Simulating call due to error');
      setCurrentCall({
        callId: `demo-${Date.now()}`,
        callerId: user?.id || '',
        callerName: user?.name || 'Unknown',
        calleeId: targetUser.id,
        calleeName: targetUser.name,
        status: 'active',
        priority: 'normal',
        startedAt: new Date().toISOString(),
        isMuted: false,
        isOnHold: false,
      });
      onCallInitiated?.(targetUser.id, `demo-${Date.now()}`);
    } finally {
      setCallingUserId(null);
      setCallingUserName(null);
      onClose();
    }
  };

  // Handle ending a call
  const handleEndCall = async () => {
    const currentCall = useVoiceCallStore.getState().currentCall;
    if (currentCall) {
      try {
        await endCall(currentCall.callId);
      } catch (err) {
        console.log('Demo mode: Ending simulated call');
      }
      simulateCallEnded();
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'doctor':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'nurse':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'receptionist':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] mx-4 glass-card rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Staff Directory</h2>
              <p className="text-sm text-white/50">Find and call staff members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="px-6 py-4 border-b border-white/10 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-white/40" />
            <div className="flex gap-2">
              {['all', 'doctor', 'nurse', 'receptionist'].map((role) => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                    filterRole === role
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/30'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {role === 'all' ? 'All Staff' : role + 's'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Staff List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="ml-3 text-white/60">Loading staff...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
              <p className="text-red-300 mb-3">{error}</p>
              <button
                onClick={fetchStaff}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-white/20 mb-3" />
              <p className="text-white/50">No staff members found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStaff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center">
                        <span className="text-lg font-semibold text-white">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {/* Online indicator */}
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-gray-900 ${
                          member.isOnline ? 'bg-green-500' : 'bg-gray-500'
                        }`}
                      />
                    </div>

                    {/* Info */}
                    <div>
                      <h3 className="font-medium text-white">{member.name}</h3>
                      <p className="text-sm text-white/50">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Role Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getRoleBadgeColor(
                        member.role
                      )}`}
                    >
                      {member.role}
                    </span>

                    {/* Call Button */}
                    <button
                      onClick={() => handleInitiateCall(member)}
                      disabled={
                        callingUserId === member.id ||
                        !member.isOnline ||
                        member.id === user?.id
                      }
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        !member.isOnline || member.id === user?.id
                          ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                          : callingUserId === member.id
                          ? 'bg-blue-500/50 text-white cursor-wait'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                      title={
                        !member.isOnline
                          ? 'User is offline'
                          : member.id === user?.id
                          ? 'Cannot call yourself'
                          : `Call ${member.name}`
                      }
                    >
                      {callingUserId === member.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Calling...</span>
                        </>
                      ) : (
                        <>
                          <Phone className="w-4 h-4" />
                          <span>Call</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/20">
          <p className="text-xs text-white/40 text-center">
            {filteredStaff.length} staff members • Green dot = Online
          </p>
        </div>
      </div>
    </div>
  );
}
