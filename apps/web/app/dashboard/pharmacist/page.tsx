'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import Link from 'next/link';

interface Prescription {
  id: string;
  patient_name: string;
  medication: string;
  dosage: string;
  frequency: string;
  status: string;
  created_at: string;
  visit_id: string;
}

export default function PharmacistDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'completed'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      fetchPrescriptions();
    }
  }, [user, filter]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clinical/prescriptions?status=' + filter, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPrescriptions(data.data?.prescriptions || []);
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async (prescriptionId: string) => {
    try {
      setProcessing(prescriptionId);
      const response = await fetch(`/api/clinical/prescriptions/${prescriptionId}/dispense`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'dispensed' }),
      });
      
      if (response.ok) {
        fetchPrescriptions();
      }
    } catch (error) {
      console.error('Error dispensing prescription:', error);
    } finally {
      setProcessing(null);
    }
  };

  const filteredPrescriptions = prescriptions.filter(p =>
    p.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.medication?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="glass border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/dashboard" className="text-xl md:text-2xl">🏥</Link>
            <h1 className="text-lg md:text-xl font-bold text-white">Pharmacist Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <span className="text-sm text-white/70 hidden sm:inline">
              Welcome, {user.name}
              <span className="ml-2 px-2 py-1 bg-purple-500/20 rounded text-xs capitalize text-purple-300">
                {user.role}
              </span>
            </span>
            <button onClick={() => { logout(); router.push('/login'); }} className="text-sm text-red-400 hover:text-red-300">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card">
            <div className="text-3xl mb-2">💊</div>
            <h3 className="text-lg font-semibold text-white">Pending</h3>
            <p className="text-2xl font-bold text-primary-300">
              {prescriptions.filter(p => p.status === 'pending').length}
            </p>
          </div>
          <div className="glass-card">
            <div className="text-3xl mb-2">✅</div>
            <h3 className="text-lg font-semibold text-white">Dispensed</h3>
            <p className="text-2xl font-bold text-green-300">
              {prescriptions.filter(p => p.status === 'dispensed').length}
            </p>
          </div>
          <div className="glass-card">
            <div className="text-3xl mb-2">📋</div>
            <h3 className="text-lg font-semibold text-white">Today</h3>
            <p className="text-2xl font-bold text-blue-300">{prescriptions.length}</p>
          </div>
        </div>

        <div className="glass-card mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-white">Prescriptions</h2>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Search patient or medication..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input text-sm"
              />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'pending' | 'completed')}
                className="glass-input text-sm"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-white/60 text-center py-8">Loading prescriptions...</div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="text-white/60 text-center py-8">No prescriptions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/70 font-medium">Patient</th>
                    <th className="text-left py-3 px-4 text-white/70 font-medium">Medication</th>
                    <th className="text-left py-3 px-4 text-white/70 font-medium">Dosage</th>
                    <th className="text-left py-3 px-4 text-white/70 font-medium">Frequency</th>
                    <th className="text-left py-3 px-4 text-white/70 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-white/70 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrescriptions.map((prescription) => (
                    <tr key={prescription.id} className="border-b border-white/5">
                      <td className="py-3 px-4 text-white">{prescription.patient_name}</td>
                      <td className="py-3 px-4 text-white">{prescription.medication}</td>
                      <td className="py-3 px-4 text-white">{prescription.dosage}</td>
                      <td className="py-3 px-4 text-white">{prescription.frequency}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          prescription.status === 'pending' 
                            ? 'bg-yellow-500/20 text-yellow-300' 
                            : 'bg-green-500/20 text-green-300'
                        }`}>
                          {prescription.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {prescription.status === 'pending' && (
                          <button
                            onClick={() => handleDispense(prescription.id)}
                            disabled={processing === prescription.id}
                            className="glass-button-primary text-sm py-1 px-3"
                          >
                            {processing === prescription.id ? 'Processing...' : 'Dispense'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
