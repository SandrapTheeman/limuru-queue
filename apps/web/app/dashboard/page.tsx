'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../lib/store';
import { Button } from '@/lib/components/Button';
import { StatCard } from '@/lib/components/Card';
import { Spinner } from '@/lib/components/LoadingStates';
import { useToastStore } from '@/lib/components/Toast';
import { api } from '../../lib/api';
import {
  Clock,
  Bell,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Users,
  Activity,
  Building2,
  PhoneCall,
  Plus,
  Calendar,
  MessageSquare,
  Monitor,
  Ticket,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  Menu,
  X as XIcon,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  Pause,
  Play,
  Eye,
  FileText,
  Search,
  Filter,
  ArrowRight,
  Home,
  LayoutDashboard,
  UserCog,
  Stethoscope,
  ClipboardList,
  Pill,
  TestTube,
  Wrench,
  Crown,
  Zap
} from 'lucide-react';

interface QueueItem {
  id: string;
  ticket_number: string;
  patient_name: string;
  patient_phone?: string;
  department: string;
  department_name?: string;
  status: 'waiting' | 'called' | 'in-progress' | 'completed' | 'cancelled';
  wait_time: number;
  position: number;
  priority: boolean;
  created_at: string;
  room_assigned?: string;
  called_at?: string;
}

interface DashboardStats {
  current_patients: number;
  avg_wait_time: number;
  departments_active: number;
  calls_today: number;
  waiting: number;
  called: number;
  completed: number;
  in_progress: number;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

const statusConfig = {
  waiting: { label: 'Waiting', icon: Clock, className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  called: { label: 'Called', icon: Phone, className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'in-progress': { label: 'In Progress', icon: Activity, className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  completed: { label: 'Completed', icon: CheckCircle, className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  cancelled: { label: 'Cancelled', icon: X, className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

function StatusBadge({ status, size = 'md' }: { status: keyof typeof statusConfig; size?: 'sm' | 'md' }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-3 py-1 text-sm gap-1.5';
  
  return (
    <span className={`inline-flex items-center rounded-full font-semibold border ${config.className} ${sizeClasses}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {config.label}
    </span>
  );
}

function calculateWaitTime(createdAt: string): string {
  if (!createdAt) return '--';
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { addToast } = useToastStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(3);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [callingPatient, setCallingPatient] = useState<string | null>(null);
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, queueRes, deptRes] = await Promise.all([
        api.get('/api/analytics/stats').catch(() => ({ waiting: 0, called: 0, completed_today: 0, avg_wait_time: 0, current_patients: 0, departments_active: 0, calls_today: 0 })),
        api.get('/api/queue/all/summary').catch(() => []),
        api.get('/api/departments').catch(() => [])
      ]);
      
      const statsData = statsRes?.waiting !== undefined ? {
        waiting: statsRes.waiting || 0,
        called: statsRes.called || 0,
        completed: statsRes.completed_today || 0,
        avg_wait_time: statsRes.avg_wait_time || 0,
        current_patients: statsRes.current_patients || 0,
        departments_active: statsRes.departments_active || 0,
        calls_today: statsRes.calls_today || 0,
        in_progress: statsRes.in_progress || 0,
      } : {
        waiting: 4, called: 1, completed: 12, avg_wait_time: 15, current_patients: 18, departments_active: 5, calls_today: 8, in_progress: 2
      };
      
      setStats(statsData);
      setDepartments(deptRes || []);
      setQueue(Array.isArray(queueRes) ? queueRes : []);
    } catch (err) {
      setError('Failed to load dashboard data');
      setStats({ waiting: 4, called: 1, completed: 12, avg_wait_time: 15, current_patients: 18, departments_active: 5, calls_today: 8, in_progress: 2 });
      setQueue([
        { id: '1', ticket_number: 'MED001', patient_name: 'John Mwangi', department: 'MED', department_name: 'Medical', status: 'called', wait_time: 0, position: 1, priority: false, created_at: new Date().toISOString() },
        { id: '2', ticket_number: 'MED002', patient_name: 'Mary Wanjiku', department: 'MED', department_name: 'Medical', status: 'waiting', wait_time: 15, position: 2, priority: false, created_at: new Date(Date.now() - 900000).toISOString() },
        { id: '3', ticket_number: 'MED003', patient_name: 'Peter Otieno', department: 'MED', department_name: 'Medical', status: 'waiting', wait_time: 10, position: 3, priority: true, created_at: new Date(Date.now() - 600000).toISOString() },
        { id: '4', ticket_number: 'PED001', patient_name: 'Grace Nyongo', department: 'PED', department_name: 'Pediatric', status: 'in-progress', wait_time: 20, position: 1, priority: false, created_at: new Date(Date.now() - 1200000).toISOString() },
        { id: '5', ticket_number: 'GYN001', patient_name: 'Jane Adhiambo', department: 'GYN', department_name: 'Gynecology', status: 'waiting', wait_time: 5, position: 1, priority: true, created_at: new Date(Date.now() - 300000).toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
      const refreshInterval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(refreshInterval);
    }
  }, [isAuthenticated, loadDashboardData]);

  const handleLogout = () => {
    logout();
    addToast({ type: 'info', message: 'You have been logged out successfully.' });
    router.push('/login');
  };

  const handleCallNext = async () => {
    const waitingPatient = queue.find(p => p.status === 'waiting');
    if (!waitingPatient) {
      addToast({ type: 'warning', message: 'No patients waiting in queue' });
      return;
    }
    setCallingPatient(waitingPatient.id);
    try {
      await api.post(`/api/queue/${waitingPatient.id}/call`, { room: 'Room 1', doctorId: user?.id });
      addToast({ type: 'success', message: `Patient ${waitingPatient.ticket_number} called successfully` });
      loadDashboardData();
    } catch {
      addToast({ type: 'error', message: 'Failed to call patient' });
    } finally {
      setCallingPatient(null);
    }
  };

  const handleCompletePatient = async (id: string) => {
    try {
      await api.post(`/api/queue/${id}/complete`, {});
      addToast({ type: 'success', message: 'Patient visit completed' });
      loadDashboardData();
    } catch {
      addToast({ type: 'error', message: 'Failed to complete patient' });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getRoleDisplayName = (role: string) => {
    const names: Record<string, string> = {
      admin: 'Administrator',
      doctor: 'Doctor',
      nurse: 'Nurse',
      receptionist: 'Receptionist',
      patient: 'Patient',
      pharmacist: 'Pharmacist',
      lab_tech: 'Lab Technician',
      facility: 'Facility Manager',
      it_support: 'IT Support',
      super_admin: 'Super Admin'
    };
    return names[role] || role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, React.ReactNode> = {
      admin: <Crown className="w-4 h-4" />,
      doctor: <Stethoscope className="w-4 h-4" />,
      nurse: <Activity className="w-4 h-4" />,
      receptionist: <ClipboardList className="w-4 h-4" />,
      patient: <User className="w-4 h-4" />,
      pharmacist: <Pill className="w-4 h-4" />,
      lab_tech: <TestTube className="w-4 h-4" />,
      facility: <Wrench className="w-4 h-4" />,
      it_support: <Settings className="w-4 h-4" />,
      super_admin: <Crown className="w-4 h-4" />
    };
    return icons[role] || <User className="w-4 h-4" />;
  };

  const filteredQueue = selectedDepartment
    ? queue.filter(item => item.department === selectedDepartment)
    : queue;

  if (!user) return null;

  const role = user.role as string;
  const canSeeAllDepartments = ['admin', 'super_admin', 'pharmacist', 'lab_tech'].includes(role);
  const canCallPatients = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_tech'].includes(role);
  const canManageQueue = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_tech'].includes(role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <header className="glass sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {showMobileMenu ? <XIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-white">Limuru Cottage</h1>
                  <p className="text-xs text-slate-400">Queue Management</p>
                </div>
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <div className="text-right">
                <div className="text-2xl font-bold text-white tabular-nums tracking-tight">{formatTime(currentTime)}</div>
                <div className="text-xs text-slate-400">{formatDate(currentTime)}</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2.5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <Bell className="w-5 h-5 text-slate-300" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center text-white">
                      {notificationCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 glass-card border border-white/20 p-2 animate-scale-in origin-top-right" ref={notificationRef}>
                    <div className="p-3 border-b border-white/10">
                      <h3 className="font-semibold text-white">Notifications</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      <div className="p-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                        <p className="text-sm text-white">Patient MED001 called to Room 1</p>
                        <p className="text-xs text-slate-400 mt-1">2 minutes ago</p>
                      </div>
                      <div className="p-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                        <p className="text-sm text-white">New patient checked in at Reception</p>
                        <p className="text-xs text-slate-400 mt-1">5 minutes ago</p>
                      </div>
                      <div className="p-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                        <p className="text-sm text-white">Queue summary updated</p>
                        <p className="text-xs text-slate-400 mt-1">10 minutes ago</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/30">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-white">{user.name}</div>
                    <div className="text-xs text-teal-400 flex items-center gap-1">
                      {getRoleIcon(user.role)}
                      {getRoleDisplayName(user.role)}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 glass-card border border-white/20 p-2 animate-scale-in origin-top-right">
                    <div className="p-3 border-b border-white/10 mb-2">
                      <p className="text-sm font-medium text-white">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email || 'No email'}</p>
                    </div>
                    <Link href="/profile" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/10 transition-colors text-slate-300">
                      <User className="w-4 h-4" />
                      <span className="text-sm">Profile</span>
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/10 transition-colors text-slate-300">
                      <Settings className="w-4 h-4" />
                      <span className="text-sm">Settings</span>
                    </Link>
                    <div className="border-t border-white/10 mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-red-500/10 transition-colors text-red-400 w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`fixed lg:sticky top-0 lg:top-[88px] left-0 z-40 h-screen lg:h-[calc(100vh-88px)] w-64 glass border-r border-white/10 transform transition-transform duration-300 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <nav className="p-4 space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 p-3 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link href="/display" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-slate-300 transition-colors">
              <Monitor className="w-5 h-5" />
              <span>Queue Display</span>
            </Link>
            {canManageQueue && (
              <>
                <Link href="/kiosk" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-slate-300 transition-colors">
                  <Ticket className="w-5 h-5" />
                  <span>Kiosk Mode</span>
                </Link>
                <Link href="/patients" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-slate-300 transition-colors">
                  <Users className="w-5 h-5" />
                  <span>Patients</span>
                </Link>
                <Link href="/appointments" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-slate-300 transition-colors">
                  <Calendar className="w-5 h-5" />
                  <span>Appointments</span>
                </Link>
              </>
            )}
            {user.role === 'doctor' && (
              <Link href="/doctor/notes" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-slate-300 transition-colors">
                <FileText className="w-5 h-5" />
                <span>Doctor Notes</span>
              </Link>
            )}
            {(role === 'admin' || role === 'super_admin') && (
              <>
                <div className="border-t border-white/10 my-3" />
                <Link href="/admin" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-slate-300 transition-colors">
                  <UserCog className="w-5 h-5" />
                  <span>Admin Panel</span>
                </Link>
              </>
            )}
          </nav>
        </aside>

        {showMobileMenu && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
        )}

        <main className="flex-1 min-h-[calc(100vh-88px)] p-4 md:p-6">
          <div className="max-w-[1600px] mx-auto">
            <div className="mb-8 animate-fade-in-up">
              <div className="glass-card p-6 bg-gradient-to-r from-teal-600/15 via-teal-600/10 to-transparent border-l-4 border-l-teal-500">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-2xl shadow-lg shadow-teal-500/30">
                    <span className="text-white">👋</span>
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">
                      Welcome back, {user.name.split(' ')[0]}!
                    </h2>
                    <p className="text-slate-400 mt-1">
                      {getRoleDisplayName(user.role)} Dashboard • {formatDate(currentTime)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {isLoading && !stats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="glass-card animate-pulse">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10" />
                    </div>
                    <div className="h-8 bg-white/10 rounded-lg mb-2 w-2/3" />
                    <div className="h-4 bg-white/10 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                  <StatCard
                    icon={<Users className="w-6 h-6" />}
                    label="Current Patients"
                    value={stats?.current_patients || 0}
                    variant="primary"
                  />
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                  <StatCard
                    icon={<Clock className="w-6 h-6" />}
                    label="Avg Wait Time"
                    value={`${stats?.avg_wait_time || 0} min`}
                    variant="warning"
                  />
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                  <StatCard
                    icon={<Building2 className="w-6 h-6" />}
                    label="Active Departments"
                    value={stats?.departments_active || 0}
                    variant="default"
                  />
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                  <StatCard
                    icon={<PhoneCall className="w-6 h-6" />}
                    label="Calls Today"
                    value={stats?.calls_today || 0}
                    variant="success"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <div className="glass-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-teal-400" />
                      Queue Management
                    </h3>
                    <div className="flex items-center gap-3">
                      {canSeeAllDepartments && (
                        <select
                          value={selectedDepartment}
                          onChange={(e) => setSelectedDepartment(e.target.value)}
                          className="glass-input text-sm py-2 px-3 min-w-[150px]"
                        >
                          <option value="">All Departments</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.code || dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadDashboardData}
                        leftIcon={<RefreshCw className="w-4 h-4" />}
                        className="text-slate-400"
                      >
                        <span className="hidden sm:inline">Refresh</span>
                      </Button>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 animate-pulse">
                          <div className="w-16 h-8 bg-white/10 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-white/10 rounded w-1/3" />
                            <div className="h-3 bg-white/10 rounded w-1/4" />
                          </div>
                          <div className="w-20 h-6 bg-white/10 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : filteredQueue.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="w-8 h-8 text-slate-500" />
                      </div>
                      <h4 className="text-lg font-medium text-white mb-2">No patients in queue</h4>
                      <p className="text-slate-400 text-sm mb-4">The queue is currently empty</p>
                      <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                        Add Patient
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                      {filteredQueue.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/10"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className={`w-14 h-10 rounded-lg flex flex-col items-center justify-center ${item.priority ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-teal-500/20 border border-teal-500/30'}`}>
                            <span className={`text-sm font-bold ${item.priority ? 'text-amber-400' : 'text-teal-400'}`}>
                              {item.ticket_number}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-white font-medium truncate">{item.patient_name}</h4>
                              {item.priority && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold">
                                  PRIORITY
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {item.department_name || item.department}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {calculateWaitTime(item.created_at)}
                              </span>
                            </div>
                          </div>
                          <StatusBadge status={item.status} size="sm" />
                          {canCallPatients && (
                            <div className="flex items-center gap-2">
                              {item.status === 'waiting' && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  isLoading={callingPatient === item.id}
                                  onClick={async () => {
                                    setCallingPatient(item.id);
                                    try {
                                      await api.post(`/api/queue/${item.id}/call`, { room: 'Room 1', doctorId: user?.id });
                                      addToast({ type: 'success', message: `Patient ${item.ticket_number} called` });
                                      loadDashboardData();
                                    } catch {
                                      addToast({ type: 'error', message: 'Failed to call patient' });
                                    } finally {
                                      setCallingPatient(null);
                                    }
                                  }}
                                  leftIcon={<PhoneCall className="w-4 h-4" />}
                                  className="hidden sm:flex"
                                >
                                  Call
                                </Button>
                              )}
                              {(item.status === 'called' || item.status === 'in-progress') && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleCompletePatient(item.id)}
                                  leftIcon={<CheckCircle className="w-4 h-4" />}
                                  className="hidden sm:flex"
                                >
                                  Complete
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
                <div className="glass-card mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-teal-400" />
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    {canCallPatients && (
                      <Button
                        variant="primary"
                        className="w-full justify-start"
                        onClick={handleCallNext}
                        isLoading={callingPatient !== null}
                        leftIcon={<PhoneCall className="w-5 h-5" />}
                      >
                        Call Next Patient
                      </Button>
                    )}
                    <Link href="/kiosk" className="block">
                      <Button variant="secondary" className="w-full justify-start" leftIcon={<Ticket className="w-5 h-5" />}>
                        Kiosk Mode
                      </Button>
                    </Link>
                    <Link href="/display" className="block">
                      <Button variant="secondary" className="w-full justify-start" leftIcon={<Monitor className="w-5 h-5" />}>
                        Queue Display
                      </Button>
                    </Link>
                    {canManageQueue && (
                      <>
                        <Link href="/patients" className="block">
                          <Button variant="secondary" className="w-full justify-start" leftIcon={<Search className="w-5 h-5" />}>
                            Search Patients
                          </Button>
                        </Link>
                        <Link href="/appointments" className="block">
                          <Button variant="secondary" className="w-full justify-start" leftIcon={<Calendar className="w-5 h-5" />}>
                            New Appointment
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                <div className="glass-card">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-teal-400" />
                    Today&apos;s Stats
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                        <span className="text-white font-medium">Waiting</span>
                      </div>
                      <span className="text-2xl font-bold text-amber-400">{stats?.waiting || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-white font-medium">Called</span>
                      </div>
                      <span className="text-2xl font-bold text-blue-400">{stats?.called || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Play className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="text-white font-medium">In Progress</span>
                      </div>
                      <span className="text-2xl font-bold text-purple-400">{stats?.in_progress || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-white font-medium">Completed</span>
                      </div>
                      <span className="text-2xl font-bold text-emerald-400">{stats?.completed || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="glass-card border-red-500/30 bg-red-500/10 p-4 mb-6">
                <div className="flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                  <Button variant="ghost" size="sm" onClick={loadDashboardData} className="ml-auto text-red-400">
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {user.role === 'patient' && (
              <div className="glass-card animate-fade-in-up">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-teal-400" />
                  Your Queue Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-center">
                    <div className="text-4xl font-bold text-teal-400 mb-2">#3</div>
                    <div className="text-sm text-slate-400">Your Position</div>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <div className="text-4xl font-bold text-amber-400 mb-2">15 min</div>
                    <div className="text-sm text-slate-400">Est. Wait Time</div>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <div className="text-4xl font-bold text-blue-400 mb-2">MED</div>
                    <div className="text-sm text-slate-400">Department</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
