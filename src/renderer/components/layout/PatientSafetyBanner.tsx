import React from 'react';
import { useActivePatientStore } from '../../stores/activePatientStore';
import { BloodGroupLabels } from '../../../shared/constants/enums';
import { Shield, UserX } from 'lucide-react';

export const PatientSafetyBanner: React.FC = () => {
  const { patient, visit, clearActive } = useActivePatientStore();

  if (!patient) return null;

  return (
    <div
      className="responsive-flex-between"
      style={{
        background: 'linear-gradient(90deg, #092c28 0%, #0f172a 100%)',
        border: '1px solid #14b8a6',
        borderRadius: 'var(--radius-md)',
        padding: '0.65rem 1rem',
        marginBottom: '1rem',
        boxShadow: '0 4px 15px rgba(20, 184, 166, 0.15)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{
            background: 'var(--primary-600)',
            color: '#fff',
            borderRadius: '4px',
            padding: '3px 6px',
            fontSize: '0.7rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <Shield size={12} />
            <span>ACTIVE PATIENT</span>
          </div>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f0fdfa' }}>
            {patient.fullName}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--primary-400)', fontWeight: 700, background: 'rgba(20, 184, 166, 0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(20, 184, 166, 0.3)' }}>
            MRN: {patient.mrn}
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.25rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
          <div><strong>Age/Gender:</strong> {patient.age ? `${patient.age}y` : '—'} / {patient.gender}</div>
          <div><strong>Blood:</strong> {BloodGroupLabels[patient.bloodGroup] || patient.bloodGroup}</div>
          <div><strong>Phone:</strong> {patient.phone}</div>
          <div><strong>NIC:</strong> {patient.nic || '—'}</div>
          {patient.employeeId && <div><strong>Emp ID:</strong> {patient.employeeId}</div>}
          <div><strong>Panel:</strong> {patient.panelClientName || 'Private'}</div>
          {visit && (
            <div style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
              <strong>Token #{visit.tokenNumber}</strong> ({visit.visitType.replace('_', ' ')})
            </div>
          )}
        </div>
      </div>

      <button
        onClick={clearActive}
        className="btn btn-secondary btn-sm"
        title="Deselect active patient"
        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
      >
        <UserX size={13} />
        <span>Switch Patient</span>
      </button>
    </div>
  );
};
