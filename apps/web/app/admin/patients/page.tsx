'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import Link from 'next/link';

interface Patient {
  id: string;
  mrn: string;
  name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  department: string;
  registration_date: string;
  last_visit: string | null;
  status: 'active' | 'inactive';
}

export default function AdminPatientsPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
      return;
    }
    setPatients([
      { id: '1', mrn: 'MRN001', name: 'John Doe', phone: '+254700000001', date_of_birth: '1985-03-15', gender: 'Male', department: 'MED', registration_date: '2026-01-10', last_visit: '2026-03-15', status: 'active' },
      { id: '2', mrn: 'MRN002', name: 'Jane Smith', phone: '+254700000002', date_of_birth: '1990-07-22', gender: 'Female', department: 'PED', registration_date: '2026-01-12', last_visit: '2026-03-14', status: 'active' },
      { id: '3', mrn: 'MRN003', name: 'Robert Brown', phone: '+254700000003', date_of_birth: '1978-11-05', gender: 'Male', department: 'GYN', registration_date: '2026-02-01', last_visit: '2026-03-10', status: 'active' },
      { id: '4', mrn: 'MRN004', name: 'Mary Wilson', phone: '+254700000004', date_of_birth: '1995-02-28', gender: 'Female', department: 'OPH', registration_date: '2026-02-15', last_visit: '2026-03-12', status: 'active' },
      { id: '5', mrn: 'MRN005', name: 'James Johnson', phone: '+254700000005', date_of_birth: '1982-09-10', gender: 'Male', department: 'DEN', registration_date: '2026-02-20', last_visit: null, status: 'inactive' },
      { id: '6', mrn: 'MRN006', name: 'Patricia Davis', phone: '+254700000006', date_of_birth: '1988-12-03', gender: 'Female', department: 'ORTH', registration_date: '2026-03-01', last_visit: '2026-03-16', status: 'active' },
    ]);
    setLoading(false);
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.phone.includes(searchTerm);
    const matchesDept = selectedDepartment === 'all' || p.department === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  const departments = ['MED', 'PED', 'GYN', 'OPH', 'DEN', 'ORTH'];

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className="text-white/60 hover:text-white">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-white">Patient Management</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/70">Welcome, {user?.name}</span>
            <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-card">
          <div className="p-6 border-b border-white/10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg font-semibold text-white">Registered Patients</h2>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="glass-input px-4 py-2 text-sm w-full sm:w-64"
                />
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="glass-input px-4 py-2 text-sm"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="glass-button-primary px-4 py-2 text-sm whitespace-nowrap"
                >
                  + Add Patient
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-white/50">Loading patients...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">MRN</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Phone</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">DOB</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Gender</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Dept</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Registered</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Last Visit</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-white/60">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 text-sm font-medium text-blue-400">{patient.mrn}</td>
                      <td className="px-6 py-4 text-sm font-medium text-white">{patient.name}</td>
                      <td className="px-6 py-4 text-sm text-white/80">{patient.phone}</td>
                      <td className="px-6 py-4 text-sm text-white/60">{patient.date_of_birth}</td>
                      <td className="px-6 py-4 text-sm text-white/80">{patient.gender}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                          {patient.department}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/60">{patient.registration_date}</td>
                      <td className="px-6 py-4 text-sm text-white/60">{patient.last_visit || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          patient.status === 'active' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {patient.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 border-t border-white/10 text-sm text-white/60">
            Showing {filteredPatients.length} of {patients.length} patients
          </div>
        </div>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Add New Patient</h3>
            <form className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">Full Name *</label>
                <input type="text" className="glass-input w-full" placeholder="John Doe" required />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-2 block">Phone Number *</label>
                <input type="tel" className="glass-input w-full" placeholder="+254700000000" required />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-2 block">Date of Birth *</label>
                <input type="date" className="glass-input w-full" required />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-2 block">Gender *</label>
                <select className="glass-input w-full">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="text-white/70 text-sm mb-2 block">Department *</label>
                <select className="glass-input w-full">
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="glass-button px-4 py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="glass-button-primary px-4 py-2">
                  Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}