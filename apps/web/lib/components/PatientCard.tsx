'use client';

import { User, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';

export interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  insuranceId?: string;
  bloodType?: string;
  allergies?: string[];
  notes?: string;
}

export interface PatientCardProps {
  patient: Patient;
  showFullDetails?: boolean;
  onEdit?: (id: string) => void;
}

export function PatientCard({ patient, showFullDetails = false, onEdit }: PatientCardProps) {
  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Card
      header={
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{patient.name}</h3>
            <p className="text-sm text-gray-500">ID: {patient.id}</p>
          </div>
          {patient.allergies && patient.allergies.length > 0 && (
            <Badge variant="danger">Allergies</Badge>
          )}
        </div>
      }
      footer={
        onEdit && (
          <Button variant="ghost" size="sm" onClick={() => onEdit(patient.id)}>
            View Full Profile
          </Button>
        )
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>
            {new Date(patient.dateOfBirth).toLocaleDateString()} ({calculateAge(patient.dateOfBirth)} years, {patient.gender})
          </span>
        </div>

        {patient.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{patient.phone}</span>
          </div>
        )}

        {patient.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-gray-400" />
            <span>{patient.email}</span>
          </div>
        )}

        {showFullDetails && (
          <>
            {patient.insuranceId && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-gray-400" />
                <span>Insurance: {patient.insuranceId}</span>
              </div>
            )}

            {patient.bloodType && (
              <div className="flex items-center gap-2 text-sm">
                <span className="w-4" />
                <Badge variant="danger">{patient.bloodType}</Badge>
              </div>
            )}

            {patient.allergies && patient.allergies.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Allergies:</p>
                <div className="flex flex-wrap gap-1">
                  {patient.allergies.map((allergy, idx) => (
                    <Badge key={idx} variant="warning">{allergy}</Badge>
                  ))}
                </div>
              </div>
            )}

            {patient.notes && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{patient.notes}</p>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function Button({ variant, size, children, onClick }: { variant: string; size: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
    >
      {children}
    </button>
  );
}
