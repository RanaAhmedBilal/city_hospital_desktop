import React, { useState, useEffect } from 'react';
import { useActivePatientStore } from '../../stores/activePatientStore';
import { invokeIpc } from '../../lib/ipc';
import { PatientDto, PanelClientDto } from '../../../shared/types';
import { BloodGroupLabels } from '../../../shared/constants/enums';
import { Modal } from '../../components/common/Modal';
import {
  Search,
  UserPlus,
  UserCheck,
  FileText,
  AlertCircle,
  Building,
  Check,
  Edit2,
  Calendar,
} from 'lucide-react';

interface PatientListPageProps {
  onSelectPatient: (patient: PatientDto) => void;
  onOpenProfile: (patientId: string) => void;
}

export const PatientListPage: React.FC<PatientListPageProps> = ({
  onSelectPatient,
  onOpenProfile,
}) => {
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [panelClients, setPanelClients] = useState<PanelClientDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Registration Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    guardianName: '',
    age: '',
    gender: 'MALE',
    bloodGroup: 'UNKNOWN',
    phone: '',
    alternatePhone: '',
    address: '',
    city: 'Metropolis',
    nic: '',
    employeeId: '',
    panelClientId: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
  });

  const { setActivePatient, patient: activePatient } = useActivePatientStore();

  useEffect(() => {
    loadPatients();
    loadPanelClients();
  }, []);

  const loadPatients = async (query = '') => {
    setLoading(true);
    try {
      const res = await invokeIpc<PatientDto[]>('patients:search', { query, limit: 50 });
      if (res.success && res.data) {
        setPatients(res.data);
      }
    } catch (err) {
      console.error('Failed to search patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPanelClients = async () => {
    try {
      const res = await invokeIpc<PanelClientDto[]>('config:get-panel-clients', { activeOnly: true });
      if (res.success && res.data) setPanelClients(res.data);
    } catch (err) {}
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPatients(searchQuery);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        fullName: formData.fullName.trim(),
        guardianName: formData.guardianName.trim() || undefined,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        phone: formData.phone.trim(),
        alternatePhone: formData.alternatePhone.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        nic: formData.nic.trim() || undefined,
        employeeId: formData.employeeId.trim() || undefined,
        panelClientId: formData.panelClientId || undefined,
        emergencyContactName: formData.emergencyContactName.trim() || undefined,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      const res = await invokeIpc<PatientDto>('patients:register', payload);
      if (res.success && res.data) {
        setFormSuccess(`Patient registered successfully! MRN: ${res.data.mrn}`);
        setActivePatient(res.data);
        setTimeout(() => {
          setIsModalOpen(false);
          setFormData({
            fullName: '',
            guardianName: '',
            age: '',
            gender: 'MALE',
            bloodGroup: 'UNKNOWN',
            phone: '',
            alternatePhone: '',
            address: '',
            city: 'Metropolis',
            nic: '',
            employeeId: '',
            panelClientId: '',
            emergencyContactName: '',
            emergencyContactPhone: '',
            notes: '',
          });
          loadPatients();
        }, 1200);
      } else {
        setFormError(res.error || 'Failed to register patient.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Search and Action Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: '600px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by MRN, Patient Name, Phone, NIC, or Employee ID..."
              style={{ paddingLeft: '2.4rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <UserPlus size={16} />
          <span>New Patient Registration</span>
        </button>
      </div>

      {/* Patient List Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Registered Patients Directory</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Showing {patients.length} records
          </span>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>MRN</th>
                <th>Patient Name</th>
                <th>Age / Gender</th>
                <th>Blood</th>
                <th>Phone Number</th>
                <th>NIC / CNIC</th>
                <th>Panel / Corporate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length > 0 ? (
                patients.map((p) => {
                  const isActive = activePatient?.id === p.id;
                  return (
                    <tr key={p.id} style={{ backgroundColor: isActive ? 'rgba(20, 184, 166, 0.08)' : undefined }}>
                      <td style={{ fontWeight: 800, color: 'var(--primary-400)' }}>{p.mrn}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.fullName}</div>
                        {p.guardianName && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>S/O, D/O, W/O: {p.guardianName}</div>}
                      </td>
                      <td>{p.age ? `${p.age} yrs` : '—'} / {p.gender}</td>
                      <td>
                        <span className="badge badge-slate">{BloodGroupLabels[p.bloodGroup] || p.bloodGroup}</span>
                      </td>
                      <td>{p.phone}</td>
                      <td>{p.nic || '—'}</td>
                      <td>
                        {p.panelClientName ? (
                          <div>
                            <span className="badge badge-purple">{p.panelClientName}</span>
                            {p.employeeId && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: {p.employeeId}</div>}
                          </div>
                        ) : (
                          <span className="badge badge-slate">Private</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => {
                              setActivePatient(p);
                              onSelectPatient(p);
                            }}
                            className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                            title="Set as Active Patient"
                          >
                            <UserCheck size={14} />
                            <span>{isActive ? 'Active' : 'Select'}</span>
                          </button>
                          <button
                            onClick={() => onOpenProfile(p.id)}
                            className="btn btn-secondary btn-sm"
                            title="View Complete Medical Profile & History"
                          >
                            <FileText size={14} />
                            <span>Profile</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    {loading ? 'Searching patient records...' : 'No matching patient records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Patient Registration Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Permanent Patient Registration" maxWidth="700px">
        <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formError && (
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--accent-rose)', color: '#fda4af', padding: '0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1px solid var(--accent-emerald)', color: '#6ee7b7', padding: '0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Check size={16} />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="responsive-grid-2">
            <div>
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="input"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Johnathan Doe"
                required
              />
            </div>

            <div>
              <label className="form-label">Father / Husband Name</label>
              <input
                type="text"
                className="input"
                value={formData.guardianName}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                placeholder="Guardian name"
              />
            </div>
          </div>

          <div className="responsive-grid-3">
            <div>
              <label className="form-label">Age (Years) *</label>
              <input
                type="number"
                className="input"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="e.g. 35"
                min="0"
                max="130"
                required
              />
            </div>

            <div>
              <label className="form-label">Gender *</label>
              <select
                className="select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="form-label">Blood Group</label>
              <select
                className="select"
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="A_POSITIVE">A+</option>
                <option value="A_NEGATIVE">A-</option>
                <option value="B_POSITIVE">B+</option>
                <option value="B_NEGATIVE">B-</option>
                <option value="AB_POSITIVE">AB+</option>
                <option value="AB_NEGATIVE">AB-</option>
                <option value="O_POSITIVE">O+</option>
                <option value="O_NEGATIVE">O-</option>
              </select>
            </div>
          </div>

          <div className="responsive-grid-2">
            <div>
              <label className="form-label">Primary Phone *</label>
              <input
                type="text"
                className="input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +1 555 019 2831"
                required
              />
            </div>

            <div>
              <label className="form-label">NIC / National ID (CNIC)</label>
              <input
                type="text"
                className="input"
                value={formData.nic}
                onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                placeholder="e.g. 42101-1234567-1"
              />
            </div>
          </div>

          <div className="responsive-grid-2">
            <div>
              <label className="form-label">Panel / Corporate Sponsor</label>
              <select
                className="select"
                value={formData.panelClientId}
                onChange={(e) => setFormData({ ...formData, panelClientId: e.target.value })}
              >
                <option value="">None (Private / Self Pay)</option>
                {panelClients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.discountPercent}% Discount)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Employee ID (For Panel Patients)</label>
              <input
                type="text"
                className="input"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="Corporate Employee Badge #"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Residential Address</label>
            <input
              type="text"
              className="input"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address, apartment, locality"
            />
          </div>

          <div className="responsive-grid-2">
            <div>
              <label className="form-label">Emergency Contact Name</label>
              <input
                type="text"
                className="input"
                value={formData.emergencyContactName}
                onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                placeholder="Name of relative / next of kin"
              />
            </div>

            <div>
              <label className="form-label">Emergency Contact Phone</label>
              <input
                type="text"
                className="input"
                value={formData.emergencyContactPhone}
                onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                placeholder="Emergency contact phone"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              <UserPlus size={16} />
              <span>{isSubmitting ? 'Registering...' : 'Register & Assign MRN'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
