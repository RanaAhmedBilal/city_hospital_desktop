import React, { useState, useEffect } from 'react';
import { invokeIpc } from '../../lib/ipc';
import { Modal } from '../../components/common/Modal';
import { RoleType } from '../../../shared/constants/roles';
import { ServiceCategory } from '../../../shared/constants/enums';
import {
  Settings,
  Building,
  Users,
  Sparkles,
  Receipt,
  Shield,
  Database,
  Plus,
  Check,
  AlertCircle,
  Search,
  Edit2,
  Stethoscope,
  Phone,
  Mail,
  Award,
  DollarSign,
  FileCheck,
  ToggleLeft,
  ToggleRight,
  Filter,
} from 'lucide-react';

export const AdminMasterPage: React.FC = () => {
  const [activeAdminTab, setActiveAdminTab] = useState<
    'doctors' | 'departments' | 'investigations' | 'services' | 'panels' | 'users' | 'settings' | 'backups'
  >('doctors');

  // Master Data States
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [panels, setPanels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [hospitalSetting, setHospitalSetting] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);

  // Search & Filter States
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorDeptFilter, setDoctorDeptFilter] = useState('ALL');
  const [investigationSearch, setInvestigationSearch] = useState('');
  const [investigationCategoryFilter, setInvestigationCategoryFilter] = useState('ALL');

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<
    'doctor' | 'department' | 'investigation' | 'service' | 'panel' | 'user' | 'setting' | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Doctor Form State
  const [doctorForm, setDoctorForm] = useState({
    id: '',
    name: '',
    printableTitle: '',
    licenseNumber: '',
    specialty: '',
    departmentId: '',
    consultationFee: 1500,
    followUpFee: 800,
    phone: '',
    email: '',
    signatureData: '',
    isActive: true,
  });

  // Department Form State
  const [deptForm, setDeptForm] = useState({
    id: '',
    code: '',
    name: '',
    description: '',
    isActive: true,
  });

  // Investigation Form State
  const [investigationForm, setInvestigationForm] = useState({
    id: '',
    code: '',
    name: '',
    category: 'Hematology',
    description: '',
    isActive: true,
  });

  // Service Form State
  const [serviceForm, setServiceForm] = useState({
    id: '',
    code: '',
    name: '',
    category: ServiceCategory.PROCEDURE,
    standardPrice: 500,
    isTaxable: false,
    taxPercent: 0,
    isActive: true,
  });

  // Panel Form State
  const [panelForm, setPanelForm] = useState({
    id: '',
    code: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    discountPercent: 10,
    billingType: 'CREDIT',
    isActive: true,
  });

  // User Form State
  const [userForm, setUserForm] = useState({
    id: '',
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: RoleType.RECEPTION,
    isActive: true,
  });

  // Hospital Settings Form State
  const [settingForm, setSettingForm] = useState({
    hospitalName: '',
    tagline: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    taxNumber: '',
    currencySymbol: 'Rs.',
    prescriptionDisclaimer: '',
    invoiceDisclaimer: '',
  });

  useEffect(() => {
    loadMasterData();
  }, [activeAdminTab]);

  const loadMasterData = async () => {
    setLoading(true);
    try {
      if (activeAdminTab === 'doctors') {
        const [docRes, deptRes] = await Promise.all([
          invokeIpc('config:get-doctors'),
          invokeIpc('config:get-departments'),
        ]);
        if (docRes.success && docRes.data) setDoctors(docRes.data);
        if (deptRes.success && deptRes.data) setDepartments(deptRes.data);
      } else if (activeAdminTab === 'departments') {
        const res = await invokeIpc('config:get-departments');
        if (res.success && res.data) setDepartments(res.data);
      } else if (activeAdminTab === 'investigations') {
        const res = await invokeIpc('config:get-investigations');
        if (res.success && res.data) setInvestigations(res.data);
      } else if (activeAdminTab === 'services') {
        const res = await invokeIpc('config:get-services');
        if (res.success && res.data) setServices(res.data);
      } else if (activeAdminTab === 'panels') {
        const res = await invokeIpc('config:get-panel-clients');
        if (res.success && res.data) setPanels(res.data);
      } else if (activeAdminTab === 'users') {
        const [usrRes, docRes] = await Promise.all([
          invokeIpc('config:get-users'),
          invokeIpc('config:get-doctors'),
        ]);
        if (usrRes.success && usrRes.data) setUsers(usrRes.data);
        if (docRes.success && docRes.data) setDoctors(docRes.data);
      } else if (activeAdminTab === 'settings') {
        const res = await invokeIpc('config:get-hospital-setting');
        if (res.success && res.data) {
          setHospitalSetting(res.data);
          setSettingForm({
            hospitalName: res.data.hospitalName || '',
            tagline: res.data.tagline || '',
            address: res.data.address || '',
            city: res.data.city || '',
            phone: res.data.phone || '',
            email: res.data.email || '',
            taxNumber: res.data.taxNumber || '',
            currencySymbol: res.data.currencySymbol || 'Rs.',
            prescriptionDisclaimer: res.data.prescriptionDisclaimer || '',
            invoiceDisclaimer: res.data.invoiceDisclaimer || '',
          });
        }
      } else if (activeAdminTab === 'backups') {
        const res = await invokeIpc('backup:list');
        if (res.success && res.data) setBackups(res.data);
      }
    } catch (err) {
      console.error('Master data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // DOCTOR CRUD HANDLERS
  // ----------------------------------------------------
  const handleOpenAddDoctor = () => {
    setFormError(null);
    setDoctorForm({
      id: '',
      name: '',
      printableTitle: '',
      licenseNumber: '',
      specialty: '',
      departmentId: departments[0]?.id || '',
      consultationFee: 1500,
      followUpFee: 800,
      phone: '',
      email: '',
      signatureData: '',
      isActive: true,
    });
    setModalType('doctor');
    setIsModalOpen(true);
  };

  const handleOpenEditDoctor = (doc: any) => {
    setFormError(null);
    setDoctorForm({
      id: doc.id,
      name: doc.name,
      printableTitle: doc.printableTitle,
      licenseNumber: doc.licenseNumber,
      specialty: doc.specialty,
      departmentId: doc.departmentId,
      consultationFee: doc.consultationFee,
      followUpFee: doc.followUpFee,
      phone: doc.phone || '',
      email: doc.email || '',
      signatureData: doc.signatureData || '',
      isActive: doc.isActive !== undefined ? doc.isActive : true,
    });
    setModalType('doctor');
    setIsModalOpen(true);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!doctorForm.name.trim()) return setFormError('Doctor full name is required.');
    if (!doctorForm.printableTitle.trim()) return setFormError('Printable title/qualifications is required.');
    if (!doctorForm.licenseNumber.trim()) return setFormError('Medical License / PMC number is required.');
    if (!doctorForm.specialty.trim()) return setFormError('Specialty is required.');
    if (!doctorForm.departmentId) return setFormError('Please select a department.');

    setIsSubmitting(true);
    try {
      const payload = {
        ...(doctorForm.id ? { id: doctorForm.id } : {}),
        name: doctorForm.name.trim(),
        printableTitle: doctorForm.printableTitle.trim(),
        licenseNumber: doctorForm.licenseNumber.trim(),
        specialty: doctorForm.specialty.trim(),
        departmentId: doctorForm.departmentId,
        consultationFee: Number(doctorForm.consultationFee) || 0,
        followUpFee: Number(doctorForm.followUpFee) || 0,
        phone: doctorForm.phone?.trim() || null,
        email: doctorForm.email?.trim() || null,
        signatureData: doctorForm.signatureData?.trim() || null,
        isActive: doctorForm.isActive,
      };

      const res = await invokeIpc('config:save-doctor', payload);
      if (res.success) {
        setFeedback({
          type: 'success',
          msg: `Doctor "${payload.name}" successfully ${doctorForm.id ? 'updated' : 'registered'}.`,
        });
        setIsModalOpen(false);
        loadMasterData();
      } else {
        setFormError(res.error || 'Failed to save doctor.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDoctorStatus = async (doc: any) => {
    try {
      const payload = {
        id: doc.id,
        name: doc.name,
        printableTitle: doc.printableTitle,
        licenseNumber: doc.licenseNumber,
        specialty: doc.specialty,
        departmentId: doc.departmentId,
        consultationFee: Number(doc.consultationFee),
        followUpFee: Number(doc.followUpFee),
        phone: doc.phone || null,
        email: doc.email || null,
        signatureData: doc.signatureData || null,
        isActive: !doc.isActive,
      };
      const res = await invokeIpc('config:save-doctor', payload);
      if (res.success) {
        setFeedback({
          type: 'success',
          msg: `Dr. ${doc.name} status updated to ${!doc.isActive ? 'Active' : 'Inactive'}.`,
        });
        loadMasterData();
      } else {
        setFeedback({ type: 'error', msg: res.error || 'Failed to toggle status.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Status update failed.' });
    }
  };

  // ----------------------------------------------------
  // DEPARTMENT CRUD HANDLERS
  // ----------------------------------------------------
  const handleOpenAddDepartment = () => {
    setFormError(null);
    setDeptForm({ id: '', code: '', name: '', description: '', isActive: true });
    setModalType('department');
    setIsModalOpen(true);
  };

  const handleOpenEditDepartment = (dept: any) => {
    setFormError(null);
    setDeptForm({
      id: dept.id,
      code: dept.code,
      name: dept.name,
      description: dept.description || '',
      isActive: dept.isActive !== undefined ? dept.isActive : true,
    });
    setModalType('department');
    setIsModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!deptForm.code.trim()) return setFormError('Department code is required.');
    if (!deptForm.name.trim()) return setFormError('Department name is required.');

    setIsSubmitting(true);
    try {
      const payload = {
        ...(deptForm.id ? { id: deptForm.id } : {}),
        code: deptForm.code.trim().toUpperCase(),
        name: deptForm.name.trim(),
        description: deptForm.description?.trim() || null,
        isActive: deptForm.isActive,
      };
      const res = await invokeIpc('config:save-department', payload);
      if (res.success) {
        setFeedback({
          type: 'success',
          msg: `Department "${payload.name}" successfully ${deptForm.id ? 'updated' : 'created'}.`,
        });
        setIsModalOpen(false);
        loadMasterData();
      } else {
        setFormError(res.error || 'Failed to save department.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save department.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // SERVICE CRUD HANDLERS
  // ----------------------------------------------------
  const handleOpenAddService = () => {
    setFormError(null);
    setServiceForm({
      id: '',
      code: '',
      name: '',
      category: ServiceCategory.PROCEDURE,
      standardPrice: 500,
      isTaxable: false,
      taxPercent: 0,
      isActive: true,
    });
    setModalType('service');
    setIsModalOpen(true);
  };

  const handleOpenEditService = (s: any) => {
    setFormError(null);
    setServiceForm({
      id: s.id,
      code: s.code,
      name: s.name,
      category: s.category || ServiceCategory.PROCEDURE,
      standardPrice: Number(s.standardPrice) || 0,
      isTaxable: s.isTaxable || false,
      taxPercent: Number(s.taxPercent) || 0,
      isActive: s.isActive !== undefined ? s.isActive : true,
    });
    setModalType('service');
    setIsModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!serviceForm.code.trim()) return setFormError('Service code is required.');
    if (!serviceForm.name.trim()) return setFormError('Service name is required.');

    setIsSubmitting(true);
    try {
      const payload = {
        ...(serviceForm.id ? { id: serviceForm.id } : {}),
        code: serviceForm.code.trim().toUpperCase(),
        name: serviceForm.name.trim(),
        category: serviceForm.category,
        standardPrice: Number(serviceForm.standardPrice) || 0,
        isTaxable: serviceForm.isTaxable,
        taxPercent: Number(serviceForm.taxPercent) || 0,
        isActive: serviceForm.isActive,
      };
      const res = await invokeIpc('config:save-service', payload);
      if (res.success) {
        setFeedback({
          type: 'success',
          msg: `Service tariff "${payload.name}" successfully ${serviceForm.id ? 'updated' : 'registered'}.`,
        });
        setIsModalOpen(false);
        loadMasterData();
      } else {
        setFormError(res.error || 'Failed to save service.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // INVESTIGATION CRUD HANDLERS
  // ----------------------------------------------------
  const handleOpenAddInvestigation = () => {
    setFormError(null);
    setInvestigationForm({
      id: '',
      code: '',
      name: '',
      category: 'Hematology',
      description: '',
      isActive: true,
    });
    setModalType('investigation');
    setIsModalOpen(true);
  };

  const handleOpenEditInvestigation = (inv: any) => {
    setFormError(null);
    setInvestigationForm({
      id: inv.id,
      code: inv.code,
      name: inv.name,
      category: inv.category || 'Hematology',
      description: inv.description || '',
      isActive: inv.isActive !== undefined ? inv.isActive : true,
    });
    setModalType('investigation');
    setIsModalOpen(true);
  };

  const handleSaveInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        ...(investigationForm.id ? { id: investigationForm.id } : {}),
        code: investigationForm.code.trim().toUpperCase(),
        name: investigationForm.name.trim(),
        category: investigationForm.category.trim(),
        description: investigationForm.description?.trim() || null,
        isActive: investigationForm.isActive,
      };

      const res = await invokeIpc('config:save-investigation', payload);
      if (res.success) {
        setFeedback({
          type: 'success',
          msg: `Investigation "${payload.name}" successfully ${investigationForm.id ? 'updated' : 'registered'}.`,
        });
        setIsModalOpen(false);
        loadMasterData();
      } else {
        setFormError(res.error || 'Failed to save investigation.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save investigation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleInvestigation = async (inv: any) => {
    try {
      const res = await invokeIpc('config:toggle-investigation-status', { id: inv.id });
      if (res.success) {
        setFeedback({
          type: 'success',
          msg: `Investigation "${inv.name}" marked as ${inv.isActive ? 'Inactive' : 'Active'}.`,
        });
        loadMasterData();
      } else {
        setFeedback({ type: 'error', msg: res.error || 'Failed to update status.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to update status.' });
    }
  };

  // ----------------------------------------------------
  // PANEL CLIENT CRUD HANDLERS
  // ----------------------------------------------------
  const handleOpenAddPanel = () => {
    setFormError(null);
    setPanelForm({
      id: '',
      code: '',
      name: '',
      discountPercent: 10,
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      billingType: 'CREDIT',
      isActive: true,
    });
    setModalType('panel');
    setIsModalOpen(true);
  };

  const handleOpenEditPanel = (p: any) => {
    setFormError(null);
    setPanelForm({
      id: p.id,
      code: p.code,
      name: p.name,
      discountPercent: Number(p.discountPercent) || 0,
      contactPerson: p.contactPerson || '',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      billingType: p.billingType || 'CREDIT',
      isActive: p.isActive !== undefined ? p.isActive : true,
    });
    setModalType('panel');
    setIsModalOpen(true);
  };

  const handleSavePanel = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!panelForm.code.trim()) return setFormError('Organization code is required.');
    if (!panelForm.name.trim()) return setFormError('Organization name is required.');

    setIsSubmitting(true);
    try {
      const payload = {
        ...(panelForm.id ? { id: panelForm.id } : {}),
        code: panelForm.code.trim().toUpperCase(),
        name: panelForm.name.trim(),
        discountPercent: Number(panelForm.discountPercent) || 0,
        contactPerson: panelForm.contactPerson?.trim() || null,
        phone: panelForm.phone?.trim() || null,
        email: panelForm.email?.trim() || null,
        address: panelForm.address?.trim() || null,
        billingType: panelForm.billingType,
        isActive: panelForm.isActive,
      };
      const res = await invokeIpc('config:save-panel-client', payload);
      if (res.success) {
        setFeedback({
          type: 'success',
          msg: `Panel Client "${payload.name}" successfully ${panelForm.id ? 'updated' : 'registered'}.`,
        });
        setIsModalOpen(false);
        loadMasterData();
      } else {
        setFormError(res.error || 'Failed to save panel client.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save panel client.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // USER CRUD HANDLERS (ADMIN & RECEPTION ONLY)
  // ----------------------------------------------------
  const handleOpenAddUser = () => {
    setFormError(null);
    setUserForm({
      id: '',
      username: '',
      password: '',
      fullName: '',
      email: '',
      phone: '',
      role: RoleType.RECEPTION,
      isActive: true,
    });
    setModalType('user');
    setIsModalOpen(true);
  };

  const handleOpenEditUser = (u: any) => {
    setFormError(null);
    const primaryRole = (u.roles && u.roles.includes(RoleType.ADMINISTRATOR))
      ? RoleType.ADMINISTRATOR
      : RoleType.RECEPTION;
    setUserForm({
      id: u.id,
      username: u.username,
      password: '',
      fullName: u.fullName,
      email: u.email || '',
      phone: u.phone || '',
      role: primaryRole,
      isActive: u.isActive !== undefined ? u.isActive : true,
    });
    setModalType('user');
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!userForm.username.trim()) return setFormError('Username is required.');
    if (!userForm.fullName.trim()) return setFormError('Full name is required.');
    if (!userForm.id && !userForm.password.trim()) return setFormError('Password is required for new accounts.');

    setIsSubmitting(true);
    try {
      const payload: any = {
        ...(userForm.id ? { id: userForm.id } : {}),
        username: userForm.username.trim().toLowerCase(),
        fullName: userForm.fullName.trim(),
        email: userForm.email?.trim() || null,
        phone: userForm.phone?.trim() || null,
        roles: [userForm.role],
        isActive: userForm.isActive,
      };
      if (userForm.password.trim()) {
        payload.password = userForm.password.trim();
      }

      const res = await invokeIpc('config:save-user', payload);
      if (res.success) {
        setFeedback({
          type: 'success',
          msg: `User account "${payload.username}" successfully ${userForm.id ? 'updated' : 'created'}.`,
        });
        setIsModalOpen(false);
        loadMasterData();
      } else {
        setFormError(res.error || 'Failed to save user.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // HOSPITAL SETTING HANDLER
  // ----------------------------------------------------
  const handleSaveHospitalSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        hospitalName: settingForm.hospitalName.trim(),
        tagline: settingForm.tagline.trim() || null,
        address: settingForm.address.trim(),
        city: settingForm.city.trim(),
        phone: settingForm.phone.trim(),
        email: settingForm.email.trim(),
        taxNumber: settingForm.taxNumber.trim() || null,
        currencySymbol: settingForm.currencySymbol.trim() || 'Rs.',
        prescriptionDisclaimer: settingForm.prescriptionDisclaimer.trim() || null,
        invoiceDisclaimer: settingForm.invoiceDisclaimer.trim() || null,
      };

      const res = await invokeIpc('config:update-hospital-setting', payload);
      if (res.success && res.data) {
        setHospitalSetting(res.data);
        setFeedback({
          type: 'success',
          msg: 'Hospital branding, address, phone, and printing disclaimers successfully saved! All print slips now use this information dynamically.',
        });
      } else {
        setFeedback({
          type: 'error',
          msg: res.error || 'Failed to update hospital settings.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        msg: err.message || 'Failed to update hospital settings.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // BACKUP HANDLER
  // ----------------------------------------------------
  const handleCreateBackup = async () => {
    try {
      const res = await invokeIpc('backup:create');
      if (res.success && res.data) {
        setFeedback({
          type: 'success',
          msg: `SQL Backup created: ${res.data.filename} (${(res.data.sizeBytes / 1024).toFixed(1)} KB)`,
        });
        loadMasterData();
      } else {
        setFeedback({ type: 'error', msg: res.error || 'Backup creation failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Backup failed.' });
    }
  };

  // Filtered Doctors
  const filteredDoctors = doctors.filter((d) => {
    const matchesSearch =
      doctorSearch === '' ||
      d.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.specialty.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.licenseNumber.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      (d.department?.name && d.department.name.toLowerCase().includes(doctorSearch.toLowerCase()));

    const matchesDept = doctorDeptFilter === 'ALL' || d.departmentId === doctorDeptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={22} color="var(--primary-400)" />
            <span>Master Data & Hospital Administration</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Configure clinical specialists, departments, diagnostic investigations, tariffs, user roles, and database backups
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            background: feedback.type === 'success' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
            color: feedback.type === 'success' ? '#6ee7b7' : '#fda4af',
            padding: '0.6rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          {feedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="scrollable-tabs-row">
        {[
          { id: 'doctors', label: 'Doctors', icon: Users },
          { id: 'departments', label: 'Departments', icon: Building },
          { id: 'investigations', label: 'Investigations Master', icon: Sparkles },
          { id: 'services', label: 'Services & Tariffs', icon: Receipt },
          { id: 'panels', label: 'Panel Clients', icon: Building },
          { id: 'users', label: 'Users & RBAC', icon: Shield },
          { id: 'settings', label: 'Hospital Settings', icon: Settings },
          { id: 'backups', label: 'Database Backup', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveAdminTab(tab.id as any);
                setFeedback(null);
              }}
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flexShrink: 0 }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. DOCTORS MASTER (FULL CRUD) */}
      {/* ---------------------------------------------------- */}
      {activeAdminTab === 'doctors' && (
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Stethoscope size={18} color="var(--primary-400)" />
                <span>Consulting Medical Specialists ({filteredDoctors.length} / {doctors.length})</span>
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Manage doctor credentials, specialties, department assignments, and consultation fee tariffs
              </p>
            </div>

            <button onClick={handleOpenAddDoctor} className="btn btn-primary btn-sm">
              <Plus size={15} />
              <span>Add New Doctor</span>
            </button>
          </div>

          {/* Search & Department Filter Bar */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search by doctor name, specialty, license #..."
                className="input"
                style={{ paddingLeft: '2.25rem' }}
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
              />
            </div>

            <div style={{ minWidth: '180px' }}>
              <select
                className="select"
                value={doctorDeptFilter}
                onChange={(e) => setDoctorDeptFilter(e.target.value)}
              >
                <option value="ALL">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Doctor Name & Qualifications</th>
                  <th>Department</th>
                  <th>License / PMC #</th>
                  <th>Specialty</th>
                  <th style={{ textAlign: 'right' }}>Consultation Fee</th>
                  <th style={{ textAlign: 'right' }}>Follow-Up Fee</th>
                  <th>Contact Info</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.length > 0 ? (
                  filteredDoctors.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{d.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.printableTitle}</div>
                      </td>
                      <td>
                        <span className="badge badge-purple">{d.department?.name || 'Unassigned'}</span>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.78rem' }}>{d.licenseNumber}</code>
                      </td>
                      <td>
                        <span className="badge badge-blue">{d.specialty}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary-400)' }}>
                        Rs. {Number(d.consultationFee).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#34d399' }}>
                        Rs. {Number(d.followUpFee).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.78rem' }}>{d.phone || '—'}</div>
                        {d.email && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{d.email}</div>}
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleDoctorStatus(d)}
                          title="Click to toggle status"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <span className={`badge ${d.isActive ? 'badge-emerald' : 'badge-rose'}`}>
                            {d.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenEditDoctor(d)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          title="Edit Doctor Details"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      {loading ? 'Loading specialists...' : 'No doctors found matching criteria. Click "Add New Doctor" to create one.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. DEPARTMENTS MASTER (WITH CRUD) */}
      {/* ---------------------------------------------------- */}
      {activeAdminTab === 'departments' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Clinical Hospital Departments ({departments.length})</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                OPD clinical services, specialty clinics, and inpatient departments
              </p>
            </div>
            <button onClick={handleOpenAddDepartment} className="btn btn-primary btn-sm">
              <Plus size={15} />
              <span>Add Department</span>
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Department Name</th>
                  <th>Description</th>
                  <th>Doctors Count</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id}>
                    <td>
                      <span className="badge badge-purple">{dept.code}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{dept.name}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{dept.description || '—'}</td>
                    <td>{dept._count?.doctors || 0} specialists</td>
                    <td>
                      <span className={`badge ${dept.isActive ? 'badge-emerald' : 'badge-rose'}`}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleOpenEditDepartment(dept)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. INVESTIGATIONS MASTER */}
      {/* ---------------------------------------------------- */}
      {activeAdminTab === 'investigations' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Diagnostic Investigations & Pathology Tests ({investigations.length})</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Manage diagnostic lab tests, pathology orders, and imaging investigations catalog</p>
            </div>
            <button onClick={handleOpenAddInvestigation} className="btn btn-primary btn-sm">
              <Plus size={15} />
              <span>Add New Investigation</span>
            </button>
          </div>

          {/* Search & Category Filter Bar */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: '2rem' }}
                placeholder="Search investigation by code or name..."
                value={investigationSearch}
                onChange={(e) => setInvestigationSearch(e.target.value)}
              />
            </div>
            <select
              className="select"
              style={{ width: '220px' }}
              value={investigationCategoryFilter}
              onChange={(e) => setInvestigationCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Diagnostic Categories</option>
              <option value="Hematology">Hematology</option>
              <option value="Biochemistry">Biochemistry</option>
              <option value="Microbiology">Microbiology</option>
              <option value="Pathology">Pathology</option>
              <option value="Radiology">Radiology / X-Ray</option>
              <option value="Ultrasound">Ultrasound</option>
              <option value="CT Scan">CT Scan</option>
              <option value="MRI">MRI</option>
              <option value="Cardiology">Cardiology / ECG</option>
              <option value="General">General Diagnostics</option>
            </select>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Test Code</th>
                  <th>Investigation / Test Name</th>
                  <th>Category</th>
                  <th>Clinical Description</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {investigations
                  .filter((inv) => {
                    const matchQ =
                      !investigationSearch ||
                      inv.name?.toLowerCase().includes(investigationSearch.toLowerCase()) ||
                      inv.code?.toLowerCase().includes(investigationSearch.toLowerCase());
                    const matchCat =
                      investigationCategoryFilter === 'ALL' ||
                      inv.category?.toLowerCase() === investigationCategoryFilter.toLowerCase();
                    return matchQ && matchCat;
                  })
                  .map((inv) => (
                    <tr key={inv.id} style={{ opacity: inv.isActive ? 1 : 0.6 }}>
                      <td>
                        <code style={{ background: 'rgba(15, 118, 110, 0.15)', color: 'var(--primary-300)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {inv.code}
                        </code>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{inv.name}</div>
                      </td>
                      <td>
                        <span className="badge badge-blue">{inv.category}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {inv.description || '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${inv.isActive ? 'badge-emerald' : 'badge-slate'}`}>
                          {inv.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditInvestigation(inv)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                            title="Edit Investigation"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleInvestigation(inv)}
                            className={`btn btn-sm ${inv.isActive ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                            title={inv.isActive ? 'Deactivate Investigation' : 'Activate Investigation'}
                          >
                            {inv.isActive ? <ToggleRight size={13} color="var(--accent-emerald)" /> : <ToggleLeft size={13} />}
                            <span>{inv.isActive ? 'Active' : 'Enable'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. SERVICES & TARIFFS */}
      {/* ---------------------------------------------------- */}
      {activeAdminTab === 'services' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Billable Hospital Services & Prices ({services.length})</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Manage hospital tariff catalog and procedure standard prices</p>
            </div>
            <button onClick={handleOpenAddService} className="btn btn-primary btn-sm">
              <Plus size={15} />
              <span>Add New Service</span>
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Service Name</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Standard Price</th>
                  <th>Tax Settings</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <code>{s.code}</code>
                    </td>
                    <td style={{ fontWeight: 700 }}>{s.name}</td>
                    <td>
                      <span className="badge badge-purple">{s.category}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary-400)' }}>
                      Rs. {Number(s.standardPrice).toLocaleString()}
                    </td>
                    <td>{s.isTaxable ? `${s.taxPercent}% Tax` : 'Exempt'}</td>
                    <td>
                      <span className={`badge ${s.isActive ? 'badge-emerald' : 'badge-rose'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenEditService(s)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 6. PANEL CLIENTS */}
      {/* ---------------------------------------------------- */}
      {activeAdminTab === 'panels' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Corporate Panel / Insurance Clients ({panels.length})</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Configure corporate panel partnerships and discount contracts</p>
            </div>
            <button onClick={handleOpenAddPanel} className="btn btn-primary btn-sm">
              <Plus size={15} />
              <span>Add Panel Client</span>
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Organization Name</th>
                  <th>Contracted Discount</th>
                  <th>Billing Mode</th>
                  <th>Contact Person</th>
                  <th>Phone / Email</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {panels.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code>{p.code}</code>
                    </td>
                    <td style={{ fontWeight: 700 }}>{p.name}</td>
                    <td style={{ fontWeight: 800, color: '#34d399' }}>{p.discountPercent}%</td>
                    <td>
                      <span className="badge badge-purple">{p.billingType}</span>
                    </td>
                    <td>{p.contactPerson || '—'}</td>
                    <td>{p.phone || p.email || '—'}</td>
                    <td>
                      <span className={`badge ${p.isActive ? 'badge-emerald' : 'badge-rose'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenEditPanel(p)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 7. USERS & RBAC (ADMIN & RECEPTION ONLY) */}
      {/* ---------------------------------------------------- */}
      {activeAdminTab === 'users' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>System Staff Accounts & Roles ({users.length})</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Manage Administrator and Front Desk Receptionist access credentials</p>
            </div>
            <button onClick={handleOpenAddUser} className="btn btn-primary btn-sm">
              <Plus size={15} />
              <span>Create Staff Account</span>
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Phone / Contact</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isAdmin = u.roles?.includes(RoleType.ADMINISTRATOR);
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700 }}>
                        <code>{u.username}</code>
                      </td>
                      <td>{u.fullName}</td>
                      <td>
                        <span className={`badge ${isAdmin ? 'badge-purple' : 'badge-blue'}`}>
                          {isAdmin ? '👑 Administrator' : '📋 Receptionist'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {u.phone || u.email || '—'}
                      </td>
                      <td>
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Never'}
                      </td>
                      <td>
                        <span className={`badge ${u.isActive ? 'badge-emerald' : 'badge-rose'}`}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 8. HOSPITAL SETTINGS (EDITABLE) */}
      {/* ---------------------------------------------------- */}
      {activeAdminTab === 'settings' && (
        <form onSubmit={handleSaveHospitalSetting} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-400)' }}>
                Hospital Identity & Printing Configuration
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                These details are dynamically populated across all Billing Slips, OPD Triage Sheets, Invoices, and Official Headers.
              </p>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Check size={16} />
              <span>{isSubmitting ? 'Saving Settings...' : 'Save Hospital Configuration'}</span>
            </button>
          </div>

          <div className="responsive-grid-2">
            <div>
              <label className="form-label">
                Hospital Legal Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. City Hospital"
                value={settingForm.hospitalName}
                onChange={(e) => setSettingForm({ ...settingForm, hospitalName: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label">Tagline / Motto / Subtitle</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Center for Medical Excellence & Compassionate Care"
                value={settingForm.tagline}
                onChange={(e) => setSettingForm({ ...settingForm, tagline: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">
                Hospital Street Address <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 123 Healthcare Boulevard, Medical District"
                value={settingForm.address}
                onChange={(e) => setSettingForm({ ...settingForm, address: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label">
                City, Region / Country <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Metropolis"
                value={settingForm.city}
                onChange={(e) => setSettingForm({ ...settingForm, city: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label">
                Contact Phone / Helpline <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. +1 (555) 019-2834"
                value={settingForm.phone}
                onChange={(e) => setSettingForm({ ...settingForm, phone: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label">
                Official Email Address <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="email"
                className="input"
                placeholder="e.g. info@cityhospital.org"
                value={settingForm.email}
                onChange={(e) => setSettingForm({ ...settingForm, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label">Hospital Registration / NTN / Tax ID</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. TX-984210"
                value={settingForm.taxNumber}
                onChange={(e) => setSettingForm({ ...settingForm, taxNumber: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">
                Billing Currency Symbol <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Rs."
                value={settingForm.currencySymbol}
                onChange={(e) => setSettingForm({ ...settingForm, currencySymbol: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">OPD & Triage Legal Disclaimer (Printed at bottom of Triage Slips)</label>
            <textarea
              className="textarea"
              rows={2}
              placeholder="e.g. This Triage Slip is computer-generated upon visit registration. Valid for OPD visit day. Retain this slip for pharmacy, laboratory sampling, and billing counter."
              value={settingForm.prescriptionDisclaimer}
              onChange={(e) => setSettingForm({ ...settingForm, prescriptionDisclaimer: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Invoice & Financial Receipt Disclaimer (Printed on Bill Slips)</label>
            <textarea
              className="textarea"
              rows={2}
              placeholder="e.g. Payment is due upon receipt. Computer generated invoice does not require physical signature. Goods/Services once billed are non-refundable."
              value={settingForm.invoiceDisclaimer}
              onChange={(e) => setSettingForm({ ...settingForm, invoiceDisclaimer: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Check size={16} />
              <span>{isSubmitting ? 'Saving Settings...' : 'Save Hospital Configuration'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ---------------------------------------------------- */}
      {/* 9. DATABASE BACKUP */}
      {/* ---------------------------------------------------- */}
      {activeAdminTab === 'backups' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-400)' }}>PostgreSQL Database Backup Engine</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Generates an immutable SQL dump archive of the entire `city_hospital_db` schema, clinical records, invoices, and audit logs.
                </p>
              </div>

              <button onClick={handleCreateBackup} className="btn btn-primary">
                <Database size={16} />
                <span>Create SQL Backup Now</span>
              </button>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Backup Archives ({backups.length})</h3>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Backup Archive Name</th>
                    <th>File Size</th>
                    <th>Created Date / Time</th>
                    <th>Engine</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.length > 0 ? (
                    backups.map((b) => (
                      <tr key={b.filename}>
                        <td style={{ fontWeight: 700 }}>
                          <code>{b.filename}</code>
                        </td>
                        <td>{(b.sizeBytes / 1024).toFixed(1)} KB</td>
                        <td>
                          {new Date(b.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>
                          <span className="badge badge-emerald">pg_dump</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No backup archives generated yet. Click "Create SQL Backup Now".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* DOCTOR CREATE / EDIT MODAL */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={isModalOpen && modalType === 'doctor'}
        onClose={() => setIsModalOpen(false)}
        title={doctorForm.id ? `Edit Specialist: ${doctorForm.name}` : 'Register New Medical Specialist'}
        maxWidth="680px"
      >
        <form onSubmit={handleSaveDoctor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formError && (
            <div
              style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid var(--accent-rose)',
                color: '#fda4af',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">
                Doctor Full Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Dr. Sarah Jenkins"
                value={doctorForm.name}
                onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label">
                Medical License / PMC # <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. PMC-84920-P"
                value={doctorForm.licenseNumber}
                onChange={(e) => setDoctorForm({ ...doctorForm, licenseNumber: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">
              Printable Title & Qualifications (for Rx Header) <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Dr. Sarah Jenkins, MBBS, FCPS (Cardiology), Consultant Cardiologist"
              value={doctorForm.printableTitle}
              onChange={(e) => setDoctorForm({ ...doctorForm, printableTitle: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">
                Primary Specialty <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Cardiology, Pediatrics, General Medicine"
                value={doctorForm.specialty}
                onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label">
                Clinical Department <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <select
                className="select"
                value={doctorForm.departmentId}
                onChange={(e) => setDoctorForm({ ...doctorForm, departmentId: e.target.value })}
                required
              >
                <option value="" disabled>
                  Select Department
                </option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">
                New Consultation Fee (Rs.) <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                step="50"
                className="input"
                value={doctorForm.consultationFee}
                onChange={(e) => setDoctorForm({ ...doctorForm, consultationFee: Number(e.target.value) })}
                required
              />
            </div>

            <div>
              <label className="form-label">
                Follow-Up Visit Fee (Rs.) <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                step="50"
                className="input"
                value={doctorForm.followUpFee}
                onChange={(e) => setDoctorForm({ ...doctorForm, followUpFee: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Contact Phone</label>
              <input
                type="text"
                className="input"
                placeholder="+1 (555) 019-2834"
                value={doctorForm.phone}
                onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">Official Email</label>
              <input
                type="email"
                className="input"
                placeholder="doctor@cityhospital.org"
                value={doctorForm.email}
                onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Digital Signature Text / Rx Sign-Off Footer</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Dr. S. Jenkins | Senior Consultant"
              value={doctorForm.signatureData}
              onChange={(e) => setDoctorForm({ ...doctorForm, signatureData: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              id="doc-active-checkbox"
              checked={doctorForm.isActive}
              onChange={(e) => setDoctorForm({ ...doctorForm, isActive: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="doc-active-checkbox" style={{ fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none' }}>
              Specialist is Active for OPD Booking and Queue Assignment
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1rem',
            }}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving Specialist...' : doctorForm.id ? 'Save Doctor Changes' : 'Register Specialist'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* DEPARTMENT CREATE / EDIT MODAL */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={isModalOpen && modalType === 'department'}
        onClose={() => setIsModalOpen(false)}
        title={deptForm.id ? `Edit Department: ${deptForm.name}` : 'Add Clinical Department'}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveDepartment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formError && (
            <div
              style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid var(--accent-rose)',
                color: '#fda4af',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="form-label">
              Department Code <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. CARD, PED, ORTH"
              value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div>
            <label className="form-label">
              Department Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Cardiology Department"
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="form-label">Clinical Description</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Description of clinical services offered..."
              value={deptForm.description}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="dept-active-checkbox"
              checked={deptForm.isActive}
              onChange={(e) => setDeptForm({ ...deptForm, isActive: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="dept-active-checkbox" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
              Department is Active
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1rem',
            }}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving Department...' : deptForm.id ? 'Save Department Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* INVESTIGATION CREATE / EDIT MODAL */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={isModalOpen && modalType === 'investigation'}
        onClose={() => setIsModalOpen(false)}
        title={investigationForm.id ? `Edit Investigation: ${investigationForm.name}` : 'Add Diagnostic Investigation'}
        maxWidth="520px"
      >
        <form onSubmit={handleSaveInvestigation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formError && (
            <div
              style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid var(--accent-rose)',
                color: '#fda4af',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div>
              <label className="form-label">
                Test Code <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. CBC, LFT-01"
                value={investigationForm.code}
                onChange={(e) => setInvestigationForm({ ...investigationForm, code: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <div>
              <label className="form-label">
                Investigation Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Complete Blood Count (CBC)"
                value={investigationForm.name}
                onChange={(e) => setInvestigationForm({ ...investigationForm, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">
              Diagnostic Category <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <select
              className="select"
              value={investigationForm.category}
              onChange={(e) => setInvestigationForm({ ...investigationForm, category: e.target.value })}
              required
            >
              <option value="Hematology">Hematology</option>
              <option value="Biochemistry">Biochemistry</option>
              <option value="Microbiology">Microbiology</option>
              <option value="Pathology">Pathology</option>
              <option value="Radiology">Radiology / X-Ray</option>
              <option value="Ultrasound">Ultrasound</option>
              <option value="CT Scan">CT Scan</option>
              <option value="MRI">MRI</option>
              <option value="Cardiology">Cardiology / ECG</option>
              <option value="General">General Diagnostics</option>
            </select>
          </div>

          <div>
            <label className="form-label">Clinical Description / Specimen Requirements</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="e.g. EDTA whole blood tube. Fasting recommended for fasting profiles..."
              value={investigationForm.description}
              onChange={(e) => setInvestigationForm({ ...investigationForm, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="inv-active-checkbox"
              checked={investigationForm.isActive}
              onChange={(e) => setInvestigationForm({ ...investigationForm, isActive: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="inv-active-checkbox" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
              Investigation is Active & Available for Clinical Orders
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1rem',
            }}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving Investigation...'
                : investigationForm.id
                ? 'Save Investigation Changes'
                : 'Register Investigation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* SERVICE CREATE / EDIT MODAL */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={isModalOpen && modalType === 'service'}
        onClose={() => setIsModalOpen(false)}
        title={serviceForm.id ? `Edit Service Tariff: ${serviceForm.name}` : 'Add Billable Service Tariff'}
        maxWidth="520px"
      >
        <form onSubmit={handleSaveService} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formError && (
            <div
              style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid var(--accent-rose)',
                color: '#fda4af',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div>
              <label className="form-label">
                Service Code <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. ECG-01"
                value={serviceForm.code}
                onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <div>
              <label className="form-label">
                Service / Procedure Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 12-Lead Electrocardiogram"
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Category</label>
              <select
                className="select"
                value={serviceForm.category}
                onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value as any })}
              >
                {Object.values(ServiceCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                Standard Price (Rs.) <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                step="50"
                className="input"
                value={serviceForm.standardPrice}
                onChange={(e) => setServiceForm({ ...serviceForm, standardPrice: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="srv-tax-checkbox"
              checked={serviceForm.isTaxable}
              onChange={(e) => setServiceForm({ ...serviceForm, isTaxable: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="srv-tax-checkbox" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
              Service is Subject to Sales Tax
            </label>
          </div>

          {serviceForm.isTaxable && (
            <div>
              <label className="form-label">Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="input"
                value={serviceForm.taxPercent}
                onChange={(e) => setServiceForm({ ...serviceForm, taxPercent: Number(e.target.value) })}
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="srv-active-checkbox"
              checked={serviceForm.isActive}
              onChange={(e) => setServiceForm({ ...serviceForm, isActive: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="srv-active-checkbox" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
              Service is Active for Billing Selection
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1rem',
            }}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving Tariff...' : serviceForm.id ? 'Save Tariff Changes' : 'Create Service Tariff'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* PANEL CLIENT CREATE / EDIT MODAL */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={isModalOpen && modalType === 'panel'}
        onClose={() => setIsModalOpen(false)}
        title={panelForm.id ? `Edit Panel Client: ${panelForm.name}` : 'Register Corporate Panel / Insurance Partner'}
        maxWidth="600px"
      >
        <form onSubmit={handleSavePanel} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formError && (
            <div
              style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid var(--accent-rose)',
                color: '#fda4af',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div>
              <label className="form-label">
                Panel Code <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. SLIC"
                value={panelForm.code}
                onChange={(e) => setPanelForm({ ...panelForm, code: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <div>
              <label className="form-label">
                Organization / Company Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. State Life Insurance Corporation"
                value={panelForm.name}
                onChange={(e) => setPanelForm({ ...panelForm, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Contracted Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="input"
                value={panelForm.discountPercent}
                onChange={(e) => setPanelForm({ ...panelForm, discountPercent: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="form-label">Billing Mode</label>
              <select
                className="select"
                value={panelForm.billingType}
                onChange={(e) => setPanelForm({ ...panelForm, billingType: e.target.value })}
              >
                <option value="CREDIT">CREDIT (Direct Panel Invoicing)</option>
                <option value="CO_PAY">CO_PAY (Partial Patient Co-Payment)</option>
                <option value="DIRECT">DIRECT (Cash Reimbursement)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Contact Person</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Mr. Tariq Mahmood"
                value={panelForm.contactPerson}
                onChange={(e) => setPanelForm({ ...panelForm, contactPerson: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">Contact Phone</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. +92 300 1234567"
                value={panelForm.phone}
                onChange={(e) => setPanelForm({ ...panelForm, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Billing Email</label>
            <input
              type="email"
              className="input"
              placeholder="e.g. claims@statelife.com.pk"
              value={panelForm.email}
              onChange={(e) => setPanelForm({ ...panelForm, email: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="panel-active-checkbox"
              checked={panelForm.isActive}
              onChange={(e) => setPanelForm({ ...panelForm, isActive: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="panel-active-checkbox" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
              Panel Client Contract is Active for Billing
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1rem',
            }}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving Panel...' : panelForm.id ? 'Save Panel Changes' : 'Register Panel Client'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* USER ACCOUNT CREATE / EDIT MODAL (ADMIN & RECEPTION ONLY) */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={isModalOpen && modalType === 'user'}
        onClose={() => setIsModalOpen(false)}
        title={userForm.id ? `Edit Staff Account: ${userForm.username}` : 'Create New System Staff Account'}
        maxWidth="540px"
      >
        <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formError && (
            <div
              style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid var(--accent-rose)',
                color: '#fda4af',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">
                Username <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. reception2"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                disabled={!!userForm.id}
                required
              />
            </div>

            <div>
              <label className="form-label">
                Password {userForm.id ? '(Leave blank to keep unchanged)' : <span style={{ color: 'var(--accent-rose)' }}>*</span>}
              </label>
              <input
                type="password"
                className="input"
                placeholder={userForm.id ? '••••••••' : 'Enter account password'}
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                required={!userForm.id}
              />
            </div>
          </div>

          <div>
            <label className="form-label">
              Full Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Maryam Fatima"
              value={userForm.fullName}
              onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="form-label">
              System Access Role <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <select
              className="select"
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value as RoleType })}
              required
            >
              <option value={RoleType.RECEPTION}>📋 Receptionist (Front Desk, Patients, OPD Queue, Vitals, Billing)</option>
              <option value={RoleType.ADMINISTRATOR}>👑 Administrator (Full Master Access, Reports, Doctors, Panels, Tariffs)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Contact Phone</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. +92 300 9876543"
                value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="e.g. staff@cityhospital.org"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="usr-active-checkbox"
              checked={userForm.isActive}
              onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="usr-active-checkbox" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
              Account is Active and Allowed to Login
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1rem',
            }}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving User...' : userForm.id ? 'Save User Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
