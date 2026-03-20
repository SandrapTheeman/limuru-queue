'use client';

import { Calendar, Clock, User, CheckCircle, AlertCircle } from 'lucide-react';

interface ScheduledAppointment {
  id: string;
  ticket_number: string;
  patient_name: string;
  patient_number: string;
  scheduled_time: string;
  department: string;
  status: 'scheduled' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
  priority: boolean;
  notes?: string;
}

interface ScheduleViewProps {
  appointments: ScheduledAppointment[];
  onPatientSelect: (appointment: ScheduledAppointment) => void;
  onAddToQueue: (appointmentId: string) => void;
}

export default function ScheduleView({ appointments, onPatientSelect, onAddToQueue }: ScheduleViewProps) {
  const getStatusColor = (status: ScheduledAppointment['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/20';
      case 'checked_in':
        return 'text-blue-400 bg-blue-500/20';
      case 'no_show':
      case 'cancelled':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-yellow-400 bg-yellow-500/20';
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const groupedAppointments = appointments.reduce((acc, apt) => {
    const hour = new Date(apt.scheduled_time).getHours();
    const key = `${hour}:00`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(apt);
    return acc;
  }, {} as Record<string, ScheduledAppointment[]>);

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-white/60" />
          <h2 className="text-lg font-semibold text-white">Today&apos;s Schedule</h2>
        </div>
        <div className="text-sm text-white/50">
          {appointments.length} appointments
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <span className="text-xs text-white/60">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500/50" />
          <span className="text-xs text-white/60">Checked In</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="text-xs text-white/60">Completed</span>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-12 text-white/50">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No appointments scheduled</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {Object.entries(groupedAppointments).map(([hour, hourAppointments]) => (
            <div key={hour}>
              <div className="text-sm text-white/40 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {hour}
              </div>
              <div className="space-y-2">
                {hourAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-white/5 rounded-lg p-3 border border-white/10 hover:border-blue-500/30 transition cursor-pointer"
                    onClick={() => onPatientSelect(apt)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">
                            {apt.ticket_number || apt.patient_number}
                          </span>
                          {apt.priority && (
                            <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                              Priority
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-white/80 mb-1">
                          {apt.patient_name}
                        </div>
                        <div className="text-xs text-white/50 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {formatTime(apt.scheduled_time)}
                          {apt.notes && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[150px]">{apt.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(apt.status)}`}>
                          {apt.status.replace('_', ' ')}
                        </span>
                        {apt.status === 'scheduled' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToQueue(apt.id);
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Add to Queue
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-white/60">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>
              {appointments.filter(a => a.status === 'completed').length} completed
            </span>
          </div>
          <div className="flex items-center gap-2 text-white/60">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>
              {appointments.filter(a => a.status === 'no_show').length} no-shows
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
