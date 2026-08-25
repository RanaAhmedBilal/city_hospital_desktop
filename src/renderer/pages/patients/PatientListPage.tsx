import React, { useState, useEffect } from 'react';
import { useActivePatientStore } from '../../stores/activePatientStore';
import { invokeIpc } from '../../lib/ipc';
import { PatientDto, PanelClientDto, PaginatedPatientsDto } from '../../../shared/types';
import { BloodGroupLabels } from '../../../shared/constants/enums';
import { Modal } from '../../components/common/Modal';
import {
  Search,
  UserPlus,
  UserCheck,
  FileText,
  AlertCircle,
  Check,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientDto | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialFormData = {
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
  };

  const [formData, setFormData] = useState(initialFormData);

  const { setActivePatient, patient: activePatient } = useActivePatientStore();

  useEffect(() => {
    loadPatients(searchQuery, page, pageSize);
    loadPanelClients();
  }, []);

  const loadPatients = async (query = searchQuery, targetPage = page, targetLimit = pageSize) => {
    setLoading(true);
    try {
      const res = await invokeIpc<PaginatedPatientsDto>('patients:search', {
        query,
        page: targetPage,
        limit: targetLimit,
      });

      if (res.success && res.data) {
        setPatients(res.data.items);
        setTotalCount(res.data.totalCount);
        setPage(res.data.page);
        setTotalPages(res.data.totalPages);
      } else {
        // Fallback for unexpected response shape
        setPatients([]);
        setTotalCount(0);
        setTotalPages(1);
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
    setPage(1);
    loadPatients(searchQuery, 1, pageSize);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    loadPatients(searchQuery, newPage, pageSize);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10) || 10;
    setPageSize(newSize);
    setPage(1);
    loadPatients(searchQuery, 1, newSize);
  };

  const handleOpenRegisterModal = () => {
    setEditingPatient(null);
    setFormData(initialFormData);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: PatientDto) => {
    setEditingPatient(p);
    setFormData({
      fullName: p.fullName,
      guardianName: p.guardianName || '',
      age: p.age != null ? String(p.age) : '',
      gender: p.gender || 'MALE',
      bloodGroup: p.bloodGroup || 'UNKNOWN',
      phone: p.phone,
      alternatePhone: p.alternatePhone || '',
      address: p.address || '',
      city: p.city || 'Metropolis',
      nic: p.nic || '',
      employeeId: p.employeeId || '',
      panelClientId: p.panelClientId || '',
      emergencyContactName: p.emergencyContactName || '',
      emergencyContactPhone: p.emergencyContactPhone || '',
      notes: p.notes || '',
    });
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
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

      if (editingPatient) {
        payload.id = editingPatient.id;
        const res = await invokeIpc<PatientDto>('patients:update', payload);
        if (res.success && res.data) {
          setFormSuccess(`Patient profile updated successfully for MRN: ${res.data.mrn}`);
          if (activePatient?.id === res.data.id) {
            setActivePatient(res.data);
          }
          setTimeout(() => {
            setIsModalOpen(false);
            loadPatients(searchQuery, page, pageSize);
          }, 1200);
        } else {
          setFormError(res.error || 'Failed to update patient.');
        }
      } else {
        const res = await invokeIpc<PatientDto>('patients:register', payload);
        if (res.success && res.data) {
          setFormSuccess(`Patient registered successfully! MRN: ${res.data.mrn}`);
          setActivePatient(res.data);
          setTimeout(() => {
            setIsModalOpen(false);
            setFormData(initialFormData);
            loadPatients(searchQuery, 1, pageSize);
          }, 1200);
        } else {
          setFormError(res.error || 'Failed to register patient.');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startRecordIdx = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecordIdx = Math.min(totalCount, page * pageSize);

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

        <button onClick={handleOpenRegisterModal} className="btn btn-primary">
          <UserPlus size={16} />
          <span>New Patient Registration</span>
        </button>
      </div>

      {/* Patient List Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Registered Patients Directory</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>
              Showing {startRecordIdx}-{endRecordIdx} of {totalCount} records
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>Per page:</span>
              <select
                className="select"
                value={pageSize}
                onChange={handlePageSizeChange}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
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
                            onClick={() => handleOpenEditModal(p)}
                            className="btn btn-secondary btn-sm"
                            title="Edit Patient Demographics"
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.25rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total patients)
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handlePageChange(1)}
                disabled={page === 1}
                title="First Page"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                title="Previous Page"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <div style={{ display: 'flex', gap: '0.2rem', margin: '0 0.3rem' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, index) =>
                    typeof item === 'number' ? (
                      <button
                        key={item}
                        className={`btn btn-sm ${item === page ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handlePageChange(item)}
                        style={{ minWidth: '32px', padding: '0.2rem 0.5rem' }}
                      >
                        {item}
                      </button>
                    ) : (
                      <span key={`dots-${index}`} style={{ padding: '0.2rem 0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        ...
                      </span>
                    )
                  )}
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                title="Next Page"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={page === totalPages}
                title="Last Page"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Patient Registration / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPatient ? `Edit Patient Demographics (${editingPatient.mrn})` : "New Permanent Patient Registration"}
        maxWidth="700px"
      >
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              {editingPatient ? <Edit2 size={16} /> : <UserPlus size={16} />}
              <span>{isSubmitting ? (editingPatient ? 'Updating...' : 'Registering...') : (editingPatient ? 'Save Demographics Changes' : 'Register & Assign MRN')}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
