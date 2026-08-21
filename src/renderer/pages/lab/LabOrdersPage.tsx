import React, { useState, useEffect } from 'react';
import { useActivePatientStore } from '../../stores/activePatientStore';
import { invokeIpc } from '../../lib/ipc';
import { InvoiceDto, VisitChargeDto } from '../../../shared/types';
import { Modal } from '../../components/common/Modal';
import {
  FlaskConical,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Printer,
  Receipt,
  Clock,
  User,
  ShieldCheck,
  CreditCard,
  Banknote,
  DollarSign,
  FileText,
  Tag,
  History,
  Stethoscope,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Eye,
  Filter,
  Check,
  RefreshCw,
  SlidersHorizontal,
  X,
  Edit,
  Save,
} from 'lucide-react';

interface LabCatalogItem {
  code: string;
  name: string;
  category: string;
  defaultFee: number;
  sampleType: string;
  containerType: string;
  tatHours: number;
}

interface SelectedTest {
  code?: string;
  name: string;
  category: string;
  sampleType: string;
  fee: number;
}

interface ActivePrescriptionInfo {
  prescriptionId: string;
  prescriptionNo: string;
  diagnosis: string | null;
  clinicalNotes: string | null;
  advice: string | null;
  doctorName: string;
  doctorSpecialty: string;
  status: string;
  createdAt: string;
  investigations: Array<{
    id: string;
    investigationName: string;
    instructions: string | null;
  }>;
}

interface LabHistoryItem {
  id: string;
  prescriptionNo: string;
  visitId: string;
  patientId: string;
  patient: {
    id: string;
    mrn: string;
    fullName: string;
    age: number | null;
    gender: string;
    phone: string;
  };
  doctor: {
    id: string;
    name: string;
    specialty: string;
    printableTitle: string;
  };
  visit: {
    id: string;
    visitNumber: string;
    visitDateTime: string;
    tokenNumber: number;
  };
  investigations: Array<{
    id: string;
    investigationName: string;
    instructions: string | null;
  }>;
  prescriptionStatus: string;
  createdAt: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    netTotal: number;
    paidTotal: number;
    balanceTotal: number;
    status: string;
    sampleBarcode: string;
  } | null;
}

interface LabOrdersPageProps {
  onNavigateToBilling: () => void;
  onNavigateToQueue: () => void;
}

export const LabOrdersPage: React.FC<LabOrdersPageProps> = ({
  onNavigateToBilling,
  onNavigateToQueue,
}) => {
  const { patient, visit, setActivePatient } = useActivePatientStore();

  // Tab State: 'ACTIVE' (workstation for active patient) or 'HISTORY' (previous test list)
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>(
    patient && visit ? 'ACTIVE' : 'HISTORY'
  );

  const [catalog, setCatalog] = useState<LabCatalogItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([]);

  // Catalog Master Data Management State
  const [isCatalogManagerOpen, setIsCatalogManagerOpen] = useState(false);
  const [managerSearchQuery, setManagerSearchQuery] = useState('');
  const [managerCategoryFilter, setManagerCategoryFilter] = useState('ALL');
  const [isTestFormOpen, setIsTestFormOpen] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<LabCatalogItem | null>(null);
  const [savingCatalogItem, setSavingCatalogItem] = useState(false);
  const [deletingCatalogCode, setDeletingCatalogCode] = useState<string | null>(null);

  const [testFormState, setTestFormState] = useState({
    code: '',
    name: '',
    category: 'Biochemistry',
    defaultFee: 500,
    sampleType: 'Whole Blood / Serum',
    containerType: 'Purple EDTA Top',
    tatHours: 4,
  });

  const handleOpenAddTestModal = () => {
    setEditingCatalogItem(null);
    setTestFormState({
      code: '',
      name: '',
      category: 'Biochemistry',
      defaultFee: 500,
      sampleType: 'Whole Blood / Serum',
      containerType: 'Purple EDTA Top',
      tatHours: 4,
    });
    setIsTestFormOpen(true);
  };

  const handleOpenEditTestModal = (item: LabCatalogItem) => {
    setEditingCatalogItem(item);
    setTestFormState({
      code: item.code,
      name: item.name,
      category: item.category,
      defaultFee: item.defaultFee,
      sampleType: item.sampleType,
      containerType: item.containerType,
      tatHours: item.tatHours,
    });
    setIsTestFormOpen(true);
  };

  const handleSaveCatalogTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testFormState.code.trim() || !testFormState.name.trim()) return;

    try {
      setSavingCatalogItem(true);
      const res = await invokeIpc<LabCatalogItem[]>('lab:save-catalog-item', testFormState);
      if (res.success && res.data) {
        setCatalog(res.data);
        setIsTestFormOpen(false);
      } else {
        alert(res.error || 'Failed to save catalog test.');
      }
    } catch (err) {
      console.error('Error saving catalog item:', err);
      alert('An error occurred while saving the catalog item.');
    } finally {
      setSavingCatalogItem(false);
    }
  };

  const handleDeleteCatalogTest = async (code: string) => {
    if (!window.confirm(`Are you sure you want to delete test "${code}" from the prescribed lab catalog?`)) return;

    try {
      setDeletingCatalogCode(code);
      const res = await invokeIpc<LabCatalogItem[]>('lab:delete-catalog-item', { code });
      if (res.success && res.data) {
        setCatalog(res.data);
      } else {
        alert(res.error || 'Failed to delete catalog item.');
      }
    } catch (err) {
      console.error('Error deleting catalog item:', err);
      alert('An error occurred while deleting the catalog item.');
    } finally {
      setDeletingCatalogCode(null);
    }
  };

  // Active Prescribed Investigations for current visit
  const [activePrescription, setActivePrescription] = useState<ActivePrescriptionInfo | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<LabHistoryItem[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<LabHistoryItem | null>(null);

  // History Filter, Sort & Pagination State
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'PENDING' | 'SAMPLED' | 'PAID'>('ALL');
  const [historySortField, setHistorySortField] = useState<'createdAt' | 'prescriptionNo' | 'patientName' | 'doctorName' | 'status'>('createdAt');
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');
  const [historyCurrentPage, setHistoryCurrentPage] = useState<number>(1);
  const [historyPageSize, setHistoryPageSize] = useState<number>(10);

  // Reset page when filter/sort/search changes
  useEffect(() => {
    setHistoryCurrentPage(1);
  }, [historySearchQuery, historyStatusFilter, historySortField, historySortOrder, historyPageSize]);

  const safeLower = (str?: string | null): string => (str ? String(str).toLowerCase().trim() : '');

  // Filtered History List
  const filteredHistory = historyList.filter((item) => {
    if (!item) return false;
    const q = safeLower(historySearchQuery);
    const matchesSearch =
      !q ||
      safeLower(item.patient?.fullName).includes(q) ||
      safeLower(item.patient?.mrn).includes(q) ||
      safeLower(item.patient?.phone).includes(q) ||
      safeLower(item.doctor?.name).includes(q) ||
      safeLower(item.prescriptionNo).includes(q) ||
      safeLower(item.visit?.visitNumber).includes(q) ||
      (item.investigations && item.investigations.some((inv) => safeLower(inv?.investigationName).includes(q)));

    let matchesStatus = true;
    if (historyStatusFilter === 'PENDING') {
      matchesStatus = !item.invoice;
    } else if (historyStatusFilter === 'SAMPLED') {
      matchesStatus = item.invoice !== null && item.invoice.status !== 'PAID';
    } else if (historyStatusFilter === 'PAID') {
      matchesStatus = item.invoice !== null && item.invoice.status === 'PAID';
    }

    return matchesSearch && matchesStatus;
  });

  // Sorted History List
  const sortedHistory = [...filteredHistory].sort((a, b) => {
    let valA: any;
    let valB: any;

    switch (historySortField) {
      case 'prescriptionNo':
        valA = a.prescriptionNo;
        valB = b.prescriptionNo;
        break;
      case 'patientName':
        valA = a.patient.fullName;
        valB = b.patient.fullName;
        break;
      case 'doctorName':
        valA = a.doctor.name;
        valB = b.doctor.name;
        break;
      case 'status':
        valA = a.invoice ? (a.invoice.status === 'PAID' ? 2 : 1) : 0;
        valB = b.invoice ? (b.invoice.status === 'PAID' ? 2 : 1) : 0;
        break;
      case 'createdAt':
      default:
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
        break;
    }

    if (typeof valA === 'string') {
      const cmp = valA.localeCompare(valB);
      return historySortOrder === 'asc' ? cmp : -cmp;
    } else {
      return historySortOrder === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Pagination Calculations
  const totalHistoryCount = sortedHistory.length;
  const totalHistoryPages = Math.ceil(totalHistoryCount / historyPageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, historyCurrentPage), totalHistoryPages);

  const startHistoryIndex = (safeCurrentPage - 1) * historyPageSize;
  const paginatedHistory = sortedHistory.slice(startHistoryIndex, startHistoryIndex + historyPageSize);

  // Counters
  const totalCount = historyList.length;
  const pendingCount = historyList.filter((i) => !i.invoice).length;
  const sampledUnpaidCount = historyList.filter((i) => i.invoice && i.invoice.status !== 'PAID').length;
  const paidCount = historyList.filter((i) => i.invoice && i.invoice.status === 'PAID').length;

  // Sample Collection Details
  const [sampleType, setSampleType] = useState('Whole Blood / Serum');
  const [containerType, setContainerType] = useState('EDTA Purple / Gel Top');
  const [sampleBarcode, setSampleBarcode] = useState(`SMP-${Date.now().toString().slice(-6)}`);
  const [collectionNotes, setCollectionNotes] = useState('');

  // Custom Test Modal
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customTest, setCustomTest] = useState({
    name: '',
    category: 'Biochemistry',
    sampleType: 'Serum',
    fee: '',
  });

  // Action State
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    invoice: InvoiceDto;
    barcode: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Print Preview
  const [printHtml, setPrintHtml] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPrintingDirect, setIsPrintingDirect] = useState(false);

  // Quick Pay Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'CARD' | 'ONLINE_TRANSFER' | 'PANEL_CLAIM'>('CASH');
  const [payRef, setPayRef] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (visit?.id) {
      loadActivePrescription(visit.id);
    } else {
      setActivePrescription(null);
    }
  }, [visit?.id]);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      loadLabHistory(historySearchQuery);
    }
  }, [activeTab, historySearchQuery]);

  const loadCatalog = async () => {
    try {
      const res = await invokeIpc<LabCatalogItem[]>('lab:get-catalog');
      if (res.success && res.data) {
        setCatalog(res.data);
      }
    } catch (err) {
      console.error('Failed to load lab catalog:', err);
    }
  };

  const loadActivePrescription = async (vId: string) => {
    try {
      const res = await invokeIpc<ActivePrescriptionInfo | null>('lab:get-prescribed-for-visit', { visitId: vId });
      if (res.success && res.data) {
        setActivePrescription(res.data);
      } else {
        setActivePrescription(null);
      }
    } catch (err) {
      console.error('Failed to load active prescription for visit:', err);
    }
  };

  const loadLabHistory = async (query = '') => {
    setLoadingHistory(true);
    try {
      const res = await invokeIpc<LabHistoryItem[]>('lab:get-history', { query });
      if (res.success && res.data) {
        setHistoryList(res.data);
      }
    } catch (err) {
      console.error('Failed to load lab history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectPrescribedTests = () => {
    if (!activePrescription || !activePrescription.investigations) return;

    const newTests: SelectedTest[] = [...selectedTests];

    for (const inv of activePrescription.investigations) {
      if (!inv || !inv.investigationName) continue;
      const invName = safeLower(inv.investigationName);
      const exists = newTests.some((t) => safeLower(t?.name) === invName);
      if (!exists) {
        const match = catalog.find((c) => safeLower(c?.name) === invName);
        if (match) {
          newTests.push({
            code: match.code,
            name: match.name,
            category: match.category,
            sampleType: match.sampleType,
            fee: match.defaultFee,
          });
        } else {
          newTests.push({
            name: inv.investigationName,
            category: 'Prescribed Investigation',
            sampleType: 'Whole Blood / Serum',
            fee: 500,
          });
        }
      }
    }

    setSelectedTests(newTests);
  };

  const categories = ['ALL', ...Array.from(new Set(catalog.map((c) => c?.category).filter(Boolean)))];

  const filteredCatalog = catalog.filter((item) => {
    if (!item) return false;
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const q = safeLower(searchQuery);
    const matchesSearch =
      !q ||
      safeLower(item.name).includes(q) ||
      safeLower(item.code).includes(q) ||
      safeLower(item.category).includes(q);
    return matchesCat && matchesSearch;
  });

  const handleToggleTest = (item: LabCatalogItem) => {
    const exists = selectedTests.some((t) => t.name === item.name);
    if (exists) {
      setSelectedTests(selectedTests.filter((t) => t.name !== item.name));
    } else {
      setSelectedTests([
        ...selectedTests,
        {
          code: item.code,
          name: item.name,
          category: item.category,
          sampleType: item.sampleType,
          fee: item.defaultFee,
        },
      ]);
    }
  };

  const handleAddCustomTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTest.name.trim() || !customTest.fee) return;

    setSelectedTests([
      ...selectedTests,
      {
        name: customTest.name.trim(),
        category: customTest.category,
        sampleType: customTest.sampleType,
        fee: parseFloat(customTest.fee) || 0,
      },
    ]);

    setCustomTest({ name: '', category: 'Biochemistry', sampleType: 'Serum', fee: '' });
    setIsCustomModalOpen(false);
  };

  const totalBillAmount = selectedTests.reduce((sum, t) => sum + (t.fee || 0), 0);

  const handleCreateLabOrderAndBill = async () => {
    if (!patient || !visit) {
      setErrorMsg('Please select an active patient visit encounter from OPD Queue.');
      return;
    }
    if (selectedTests.length === 0) {
      setErrorMsg('Please select at least one prescribed test to generate lab order & bill.');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        visitId: visit.id,
        patientId: patient.id,
        tests: selectedTests,
        sampleDetails: {
          sampleType,
          containerType,
          barcode: sampleBarcode,
          collectionNotes: collectionNotes.trim() || undefined,
        },
      };

      const res = await invokeIpc<any>('lab:order-and-create-bill', payload);
      if (res.success && res.data) {
        setSuccessResult({
          invoice: res.data.invoice,
          barcode: res.data.sampleRecord?.barcode || sampleBarcode,
        });
        setPayAmount(String(res.data.invoice?.netTotal || 0));
        setSelectedTests([]);
        loadLabHistory(historySearchQuery);
      } else {
        setErrorMsg(res.error || 'Failed to create lab bill.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing lab order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintLabInvoice = async (invoiceId: string) => {
    try {
      setIsPrintingDirect(true);
      const res = await invokeIpc<string>('print:get-invoice-html', { invoiceId });
      if (res.success && res.data) {
        setPrintHtml(res.data);
        setIsPrintModalOpen(true);
      } else {
        setErrorMsg(res.error || 'Failed to render lab bill print slip.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Print error.');
    } finally {
      setIsPrintingDirect(false);
    }
  };

  const handleExecuteDirectPrint = async () => {
    if (!printHtml) return;
    try {
      setIsPrintingDirect(true);
      const res = await invokeIpc('print:direct', { html: printHtml, options: { silent: false } });
      if (res.success) setIsPrintModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPrintingDirect(false);
    }
  };

  const handlePayLabBill = async () => {
    if (!successResult) return;
    setPaying(true);
    try {
      const res = await invokeIpc('billing:record-payment', {
        invoiceId: successResult.invoice.id,
        amount: parseFloat(payAmount) || successResult.invoice.netTotal,
        paymentMethod: payMethod,
        transactionReference: payRef.trim() || undefined,
      });

      if (res.success) {
        setIsPayModalOpen(false);
        handlePrintLabInvoice(successResult.invoice.id);
        loadLabHistory(historySearchQuery);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPaying(false);
    }
  };

  const handleProcessHistorySample = (historyItem: LabHistoryItem) => {
    if (!historyItem) return;

    // Construct patient & visit Dto objects and set in active patient store
    const fullPatient: any = {
      id: historyItem.patient?.id || historyItem.patientId || '',
      mrn: historyItem.patient?.mrn || '—',
      fullName: historyItem.patient?.fullName || 'Patient',
      age: historyItem.patient?.age ?? null,
      gender: historyItem.patient?.gender || '—',
      phone: historyItem.patient?.phone || '—',
    };

    const fullVisit: any = {
      id: historyItem.visit?.id || historyItem.visitId || '',
      visitNumber: historyItem.visit?.visitNumber || '—',
      patientId: historyItem.patient?.id || historyItem.patientId || '',
      patient: fullPatient,
      doctorId: historyItem.doctor?.id || '',
      doctorName: historyItem.doctor?.name || 'Assigned Specialist',
      doctorSpecialty: historyItem.doctor?.specialty || '',
      tokenNumber: historyItem.visit?.tokenNumber || 1,
      visitDateTime: historyItem.visit?.visitDateTime || new Date().toISOString(),
      visitType: (historyItem.visit as any)?.visitType || 'NEW_CONSULTATION',
    };

    setActivePatient(fullPatient, fullVisit);
    setActiveTab('ACTIVE');

    // Preselect investigations into cart
    if (historyItem.investigations && historyItem.investigations.length > 0) {
      const testsToSelect: SelectedTest[] = historyItem.investigations
        .filter((inv) => inv && inv.investigationName)
        .map((inv) => {
          const invName = safeLower(inv.investigationName);
          const match = catalog.find((c) => safeLower(c?.name) === invName);
          return {
            code: match?.code,
            name: inv.investigationName,
            category: match?.category || 'Prescribed Investigation',
            sampleType: match?.sampleType || 'Whole Blood / Serum',
            fee: match?.defaultFee || 500,
          };
        });
      setSelectedTests(testsToSelect);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Section Header & Dual-Tab Switcher */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(20, 184, 166, 0.15)',
              border: '1px solid rgba(20, 184, 166, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FlaskConical size={22} color="var(--primary-400)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Laboratory Orders & Diagnostic Sampling</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Manage active prescribed investigations, collect phlebotomy samples, and review past test history
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            backgroundColor: 'var(--bg-surface-elevated)',
            padding: '0.3rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('ACTIVE')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              backgroundColor: activeTab === 'ACTIVE' ? 'var(--primary-500)' : 'transparent',
              color: activeTab === 'ACTIVE' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <FlaskConical size={16} />
            <span>Active Sampling Workstation</span>
            {patient && visit && (
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  backgroundColor: activeTab === 'ACTIVE' ? 'rgba(255,255,255,0.25)' : 'rgba(20, 184, 166, 0.2)',
                  color: activeTab === 'ACTIVE' ? '#ffffff' : 'var(--primary-400)',
                }}
              >
                {patient.fullName ? patient.fullName.split(' ')[0] : 'Patient'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              backgroundColor: activeTab === 'HISTORY' ? 'var(--primary-500)' : 'transparent',
              color: activeTab === 'HISTORY' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <History size={16} />
            <span>Previous Tests History</span>
            {historyList.length > 0 && (
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  backgroundColor: activeTab === 'HISTORY' ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface)',
                  color: activeTab === 'HISTORY' ? '#ffffff' : 'var(--text-muted)',
                }}
              >
                {historyList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--accent-rose)', color: '#fda4af', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: ACTIVE WORKSTATION */}
      {activeTab === 'ACTIVE' && (
        <>
          {!patient || !visit ? (
            <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <FlaskConical size={48} color="var(--primary-400)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Active Patient Encounter Selected</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                When a doctor prescribes laboratory investigations during consultation, select the patient from the OPD Queue or pick from Previous Tests History below to sample and bill.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <button onClick={onNavigateToQueue} className="btn btn-primary">
                  <span>Go to OPD Queue</span>
                </button>
                <button onClick={() => setActiveTab('HISTORY')} className="btn btn-secondary">
                  <History size={16} />
                  <span>View Previous Test Prescriptions</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Patient & Doctor Banner */}
              <div className="card" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(20, 184, 166, 0.15)',
                        border: '1px solid rgba(20, 184, 166, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <User size={22} color="var(--primary-400)" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{patient?.fullName || 'Patient'}</h3>
                        <span className="badge badge-primary">{patient?.mrn || '—'}</span>
                        <span className="badge badge-emerald">Token #{visit?.tokenNumber || 1}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Prescribing Doctor: <strong style={{ color: 'var(--text-primary)' }}>{visit?.doctorName || 'Assigned Specialist'}</strong> • Age/Gender: {patient?.age || '—'} Yrs / {patient?.gender || '—'} • Phone: {patient?.phone || '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button onClick={onNavigateToBilling} className="btn btn-secondary btn-sm">
                      <Receipt size={14} />
                      <span>Go to Billing Counter</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Prescription Banner (if doctor prescribed tests for this visit) */}
              {activePrescription && activePrescription.investigations.length > 0 && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.14) 0%, rgba(59, 130, 246, 0.1) 100%)',
                    border: '1.5px solid rgba(20, 184, 166, 0.4)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-400)', fontWeight: 800, fontSize: '0.95rem' }}>
                        <Stethoscope size={18} />
                        <span>Doctor Prescribed Investigations ({activePrescription.investigations.length} Tests)</span>
                        <span className="badge badge-emerald">Rx #{activePrescription.prescriptionNo}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Prescribed by <strong style={{ color: 'var(--text-primary)' }}>{activePrescription.doctorName}</strong> ({activePrescription.doctorSpecialty})
                        {activePrescription.diagnosis && (
                          <span> • Diagnosis: <em style={{ color: 'var(--text-primary)' }}>{activePrescription.diagnosis}</em></span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSelectPrescribedTests}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 8px rgba(20, 184, 166, 0.3)' }}
                    >
                      <Plus size={15} />
                      <span>Auto-Select Prescribed Tests</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed rgba(20, 184, 166, 0.25)' }}>
                    {activePrescription.investigations.map((inv) => {
                      const invName = safeLower(inv?.investigationName);
                      const isSelected = selectedTests.some((t) => safeLower(t?.name) === invName);
                      return (
                        <div
                          key={inv.id}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '16px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            border: '1px solid',
                            borderColor: isSelected ? 'var(--primary-400)' : 'rgba(255,255,255,0.15)',
                            backgroundColor: isSelected ? 'rgba(20, 184, 166, 0.25)' : 'var(--bg-surface-elevated)',
                            color: isSelected ? '#ffffff' : 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          {isSelected ? <CheckCircle size={13} color="var(--primary-400)" /> : <FlaskConical size={13} color="var(--text-muted)" />}
                          <span>{inv.investigationName}</span>
                          {inv.instructions && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                              ({inv.instructions})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Success Banner when Bill & Sample is Generated */}
              {successResult && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1.5px solid #10b981',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 800, fontSize: '1rem' }}>
                      <CheckCircle size={20} />
                      <span>Diagnostic Sample Recorded & Separate Lab Bill Generated!</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                      Bill Number: <strong style={{ color: '#ffffff' }}>{successResult?.invoice?.invoiceNumber || '—'}</strong> • Sample Barcode: <strong style={{ color: 'var(--primary-400)' }}>{successResult?.barcode || '—'}</strong> • Status: <span style={{ color: '#fbbf24', fontWeight: 700 }}>UNPAID (Rs. {(successResult?.invoice?.netTotal || 0).toLocaleString()})</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button
                      onClick={() => handlePrintLabInvoice(successResult.invoice.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Printer size={15} />
                      <span>Print Lab Bill Slip</span>
                    </button>

                    <button
                      onClick={() => setIsPayModalOpen(true)}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <DollarSign size={15} />
                      <span>Pay Lab Bill Now</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Main 2-Column Workstation */}
              <div className="lab-workstation-grid">
                {/* Left: Test Catalog & Search */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FlaskConical size={18} color="var(--primary-400)" />
                        <span>Prescribed Lab Tests Catalog</span>
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Select prescribed diagnostic investigations for this patient
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => setIsCatalogManagerOpen(true)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <SlidersHorizontal size={13} />
                        <span>Manage Catalog</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCustomModalOpen(true)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Plus size={13} />
                        <span>Quick Custom Test</span>
                      </button>
                    </div>
                  </div>

                  {/* Search bar */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        className="input"
                        style={{ paddingLeft: '2.2rem' }}
                        placeholder="Search test name e.g. CBC, LFT, Lipid, Sugar, Urea..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Category Chips */}
                  <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          border: '1px solid',
                          borderColor: selectedCategory === cat ? 'var(--primary-500)' : 'var(--border-subtle)',
                          backgroundColor: selectedCategory === cat ? 'rgba(20, 184, 166, 0.2)' : 'transparent',
                          color: selectedCategory === cat ? 'var(--primary-400)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Test List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '420px', overflowY: 'auto' }}>
                    {filteredCatalog.map((item) => {
                      const isSelected = selectedTests.some((t) => t.name === item.name);
                      return (
                        <div
                          key={item.code}
                          onClick={() => handleToggleTest(item)}
                          style={{
                            padding: '0.6rem 0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid',
                            borderColor: isSelected ? 'rgba(20, 184, 166, 0.5)' : 'var(--border-subtle)',
                            backgroundColor: isSelected ? 'rgba(20, 184, 166, 0.12)' : 'var(--bg-surface-elevated)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              style={{ cursor: 'pointer', accentColor: 'var(--primary-500)' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isSelected ? 'var(--primary-400)' : 'var(--text-primary)' }}>
                                {item.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {item.category} • Sample: {item.sampleType} ({item.containerType})
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              Rs. {item.defaultFee}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              TAT: {item.tatHours} hrs
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Sample Collection & Order Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Sample Collection Details */}
                  <div className="card">
                    <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Tag size={16} color="var(--primary-400)" />
                      <span>Sample Collection Details</span>
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label className="form-label">Primary Sample Type</label>
                          <select
                            className="select"
                            value={sampleType}
                            onChange={(e) => setSampleType(e.target.value)}
                          >
                            <option value="Whole Blood / Serum">Whole Blood / Serum</option>
                            <option value="Plasma (Fluoride / EDTA)">Plasma (Fluoride)</option>
                            <option value="Mid-stream Urine">Mid-stream Urine</option>
                            <option value="Stool Specimen">Stool Specimen</option>
                            <option value="Throat / Nasal Swab">Throat / Nasal Swab</option>
                            <option value="Diagnostic Imaging / ECG">Diagnostic Imaging / ECG</option>
                          </select>
                        </div>

                        <div>
                          <label className="form-label">Sample Tube / Container</label>
                          <input
                            type="text"
                            className="input"
                            value={containerType}
                            onChange={(e) => setContainerType(e.target.value)}
                            placeholder="e.g. Purple EDTA / Red Gel"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Sample Accession / Barcode #</label>
                        <input
                          type="text"
                          className="input"
                          value={sampleBarcode}
                          onChange={(e) => setSampleBarcode(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="form-label">Phlebotomy / Collection Notes</label>
                        <input
                          type="text"
                          className="input"
                          value={collectionNotes}
                          onChange={(e) => setCollectionNotes(e.target.value)}
                          placeholder="e.g. Fasting sample taken, no hemolysis"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Selected Tests Cart & Bill Generation */}
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                        Selected Tests ({selectedTests.length})
                      </h3>
                      {selectedTests.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedTests([])}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    <div style={{ minHeight: '130px', maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                      {selectedTests.length > 0 ? (
                        selectedTests.map((t, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.4rem 0.6rem',
                              background: 'var(--bg-surface-elevated)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.82rem',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700 }}>{t.name}</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{t.category}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ fontWeight: 800 }}>Rs. {t.fee}</span>
                              <button
                                type="button"
                                onClick={() => setSelectedTests(selectedTests.filter((_, i) => i !== idx))}
                                style={{ color: 'var(--accent-rose)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem', fontSize: '0.82rem' }}>
                          No tests selected yet. Click any test from catalog or auto-select prescribed tests.
                        </div>
                      )}
                    </div>

                    {/* Total Summary */}
                    <div style={{ borderTop: '1.5px solid var(--border-subtle)', paddingTop: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.1rem', fontWeight: 800 }}>
                        <span>Total Lab Bill:</span>
                        <span style={{ color: 'var(--primary-400)' }}>Rs. {totalBillAmount.toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Separate unpaid diagnostic bill will be generated under this visit.
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={submitting || selectedTests.length === 0}
                      onClick={handleCreateLabOrderAndBill}
                      className="btn btn-primary btn-lg"
                      style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <FlaskConical size={18} />
                      <span>{submitting ? 'Generating Lab Bill...' : `Collect Sample & Generate Bill (Rs. ${totalBillAmount})`}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: PREVIOUS TESTS & PRESCRIPTIONS HISTORY */}
      {activeTab === 'HISTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Summary Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div
              onClick={() => setHistoryStatusFilter('ALL')}
              className="card"
              style={{
                padding: '1rem 1.2rem',
                cursor: 'pointer',
                border: historyStatusFilter === 'ALL' ? '2px solid var(--primary-500)' : '1px solid var(--border-subtle)',
                background: historyStatusFilter === 'ALL' ? 'rgba(20, 184, 166, 0.08)' : 'var(--bg-surface)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Prescriptions
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {totalCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                All recorded lab test histories
              </div>
            </div>

            <div
              onClick={() => setHistoryStatusFilter('PENDING')}
              className="card"
              style={{
                padding: '1rem 1.2rem',
                cursor: 'pointer',
                border: historyStatusFilter === 'PENDING' ? '2px solid var(--rose-500, #f43f5e)' : '1px solid var(--border-subtle)',
                background: historyStatusFilter === 'PENDING' ? 'rgba(244, 63, 94, 0.08)' : 'var(--bg-surface)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pending Sampling
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--rose-400, #fb7185)', marginTop: '0.2rem' }}>
                {pendingCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Awaiting sample collection & bill
              </div>
            </div>

            <div
              onClick={() => setHistoryStatusFilter('SAMPLED')}
              className="card"
              style={{
                padding: '1rem 1.2rem',
                cursor: 'pointer',
                border: historyStatusFilter === 'SAMPLED' ? '2px solid var(--amber-500, #f59e0b)' : '1px solid var(--border-subtle)',
                background: historyStatusFilter === 'SAMPLED' ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-surface)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Sampled - Unpaid
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--amber-400, #fbbf24)', marginTop: '0.2rem' }}>
                {sampledUnpaidCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Sample collected, payment pending
              </div>
            </div>

            <div
              onClick={() => setHistoryStatusFilter('PAID')}
              className="card"
              style={{
                padding: '1rem 1.2rem',
                cursor: 'pointer',
                border: historyStatusFilter === 'PAID' ? '2px solid var(--emerald-500, #10b981)' : '1px solid var(--border-subtle)',
                background: historyStatusFilter === 'PAID' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Billed & Paid
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--emerald-400, #34d399)', marginTop: '0.2rem' }}>
                {paidCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Fully processed & cleared
              </div>
            </div>
          </div>

          {/* History Filters & Sort Toolbar */}
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Row 1: Search + Refresh */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                  <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="input"
                    style={{ paddingLeft: '2.2rem', paddingRight: historySearchQuery ? '2rem' : '0.75rem' }}
                    placeholder="Search patient name, MRN, phone, doctor, test name, Rx #..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                  />
                  {historySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setHistorySearchQuery('')}
                      style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => loadLabHistory(historySearchQuery)}
                  className="btn btn-secondary btn-sm"
                  disabled={loadingHistory}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
                  <span>{loadingHistory ? 'Loading...' : 'Refresh History'}</span>
                </button>
              </div>

              {/* Row 2: Status Pills + Sort controls + Page Size */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                {/* Status Filter Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, marginRight: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Filter size={13} />
                    <span>Filter:</span>
                  </span>
                  {[
                    { key: 'ALL', label: `All (${totalCount})` },
                    { key: 'PENDING', label: `Pending (${pendingCount})` },
                    { key: 'SAMPLED', label: `Sampled (${sampledUnpaidCount})` },
                    { key: 'PAID', label: `Paid (${paidCount})` },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      type="button"
                      onClick={() => setHistoryStatusFilter(btn.key as any)}
                      style={{
                        padding: '0.3rem 0.7rem',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: historyStatusFilter === btn.key ? '1px solid var(--primary-500)' : '1px solid var(--border-subtle)',
                        background: historyStatusFilter === btn.key ? 'var(--primary-500)' : 'transparent',
                        color: historyStatusFilter === btn.key ? '#fff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Sort & Pagination Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {/* Sort By Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <SlidersHorizontal size={13} />
                      <span>Sort:</span>
                    </span>
                    <select
                      className="input"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', width: 'auto' }}
                      value={historySortField}
                      onChange={(e) => setHistorySortField(e.target.value as any)}
                    >
                      <option value="createdAt">Date & Time</option>
                      <option value="prescriptionNo">Prescription No</option>
                      <option value="patientName">Patient Name</option>
                      <option value="doctorName">Doctor Name</option>
                      <option value="status">Status</option>
                    </select>
                  </div>

                  {/* Sort Order Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setHistorySortOrder(historySortOrder === 'asc' ? 'desc' : 'asc')}
                    className="btn btn-secondary btn-sm"
                    title={`Sort Order: ${historySortOrder === 'asc' ? 'Ascending (A-Z / Oldest)' : 'Descending (Z-A / Newest)'}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem' }}
                  >
                    {historySortOrder === 'asc' ? <ArrowUp size={14} color="var(--primary-400)" /> : <ArrowDown size={14} color="var(--primary-400)" />}
                    <span style={{ fontSize: '0.78rem' }}>{historySortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
                  </button>

                  {/* Page Size Select */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Show:</span>
                    <select
                      className="input"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: 'auto' }}
                      value={historyPageSize}
                      onChange={(e) => setHistoryPageSize(Number(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cards List or Empty State */}
          {loadingHistory ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
              <div>Loading previous lab test prescriptions & history...</div>
            </div>
          ) : totalHistoryCount === 0 ? (
            <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
              <FileText size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No Previous Lab Test Records Found</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto' }}>
                {historySearchQuery || historyStatusFilter !== 'ALL'
                  ? `No test history matches the active search query or filter. Try adjusting your search/filter.`
                  : 'When doctors prescribe lab investigations during consultations, their test details, doctor info, and sampling status will appear here.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {paginatedHistory.map((item) => {
                const dateStr = new Date(item.createdAt).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const borderLeftColor = item.invoice
                  ? item.invoice.status === 'PAID'
                    ? 'var(--emerald-500, #10b981)'
                    : 'var(--amber-500, #f59e0b)'
                  : 'var(--rose-500, #f43f5e)';

                return (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      padding: '1.1rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                      borderLeft: `4px solid ${borderLeftColor}`,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary-400)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <FileText size={15} />
                          <span>{item.prescriptionNo}</span>
                        </span>
                        <span className="badge badge-secondary">Visit #{item.visit.visitNumber}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          • {dateStr}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {item.invoice ? (
                          item.invoice.status === 'PAID' ? (
                            <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle size={12} />
                              <span>Billed & Paid (Rs. {item.invoice.netTotal.toLocaleString()})</span>
                            </span>
                          ) : (
                            <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Clock size={12} />
                              <span>Sampled - Unpaid (Rs. {item.invoice.netTotal.toLocaleString()})</span>
                            </span>
                          )
                        ) : (
                          <span className="badge badge-rose" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <AlertCircle size={12} />
                            <span>Pending Sampling & Bill</span>
                          </span>
                        )}

                        {item.invoice?.sampleBarcode && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(20, 184, 166, 0.15)', color: 'var(--primary-400)', border: '1px solid rgba(20, 184, 166, 0.3)' }}>
                            Barcode: {item.invoice.sampleBarcode}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                      {/* Patient Details */}
                      <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <User size={13} color="var(--primary-400)" />
                          <span>Patient Information</span>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {item.patient.fullName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          MRN: <strong style={{ color: 'var(--text-primary)' }}>{item.patient.mrn}</strong> • {item.patient.age || '—'} Yrs / {item.patient.gender || '—'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Phone: {item.patient.phone || '—'}
                        </div>
                      </div>

                      {/* Doctor Details */}
                      <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Stethoscope size={13} color="var(--primary-400)" />
                          <span>Prescribing Doctor</span>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {item.doctor.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {item.doctor.specialty}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {item.doctor.printableTitle}
                        </div>
                      </div>

                      {/* Prescribed Tests */}
                      <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)', gridColumn: 'span 1' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FlaskConical size={13} color="var(--primary-400)" />
                          <span>Prescribed Investigations ({item.investigations.length})</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                          {item.investigations.map((inv) => (
                            <span
                              key={inv.id}
                              style={{
                                padding: '0.2rem 0.55rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: 'rgba(20, 184, 166, 0.15)',
                                color: 'var(--primary-400)',
                                border: '1px solid rgba(20, 184, 166, 0.25)',
                              }}
                            >
                              {inv.investigationName}
                              {inv.instructions && <em style={{ fontSize: '0.68rem', opacity: 0.8 }}> ({inv.instructions})</em>}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.65rem' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedHistoryItem(item)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Eye size={14} />
                        <span>View Full Details</span>
                      </button>

                      {item.invoice && (
                        <button
                          type="button"
                          onClick={() => handlePrintLabInvoice(item.invoice!.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Printer size={14} />
                          <span>Print Bill Slip</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleProcessHistorySample(item)}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <FlaskConical size={14} />
                        <span>Process Sampling in Workstation</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Pagination Controls Footer */}
              <div
                className="card"
                style={{
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Showing <strong>{startHistoryIndex + 1}</strong> to{' '}
                  <strong>{Math.min(startHistoryIndex + historyPageSize, totalHistoryCount)}</strong> of{' '}
                  <strong>{totalHistoryCount}</strong> records
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => setHistoryCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.3rem 0.5rem' }}
                    title="First Page"
                  >
                    <ChevronsLeft size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setHistoryCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={safeCurrentPage === 1}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.3rem 0.5rem' }}
                    title="Previous Page"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: totalHistoryPages }, (_, idx) => idx + 1)
                    .filter((p) => Math.abs(p - safeCurrentPage) <= 2 || p === 1 || p === totalHistoryPages)
                    .map((p, index, array) => {
                      const showEllipsisBefore = index > 0 && p - array[index - 1] > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsisBefore && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0 0.2rem' }}>...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setHistoryCurrentPage(p)}
                            style={{
                              padding: '0.3rem 0.65rem',
                              borderRadius: '4px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              border: safeCurrentPage === p ? '1px solid var(--primary-500)' : '1px solid var(--border-subtle)',
                              background: safeCurrentPage === p ? 'var(--primary-500)' : 'var(--bg-surface)',
                              color: safeCurrentPage === p ? '#fff' : 'var(--text-primary)',
                              cursor: 'pointer',
                            }}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    onClick={() => setHistoryCurrentPage((prev) => Math.min(totalHistoryPages, prev + 1))}
                    disabled={safeCurrentPage === totalHistoryPages}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.3rem 0.5rem' }}
                    title="Next Page"
                  >
                    <ChevronRight size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setHistoryCurrentPage(totalHistoryPages)}
                    disabled={safeCurrentPage === totalHistoryPages}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.3rem 0.5rem' }}
                    title="Last Page"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Item Full Details Modal */}
      {selectedHistoryItem && (
        <Modal
          isOpen={Boolean(selectedHistoryItem)}
          onClose={() => setSelectedHistoryItem(null)}
          title={`Prescribed Lab Investigation Details - Rx #${selectedHistoryItem.prescriptionNo}`}
          maxWidth="680px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header badges */}
            <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Patient</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedHistoryItem.patient.fullName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  MRN: {selectedHistoryItem.patient.mrn} • {selectedHistoryItem.patient.age || '—'} Yrs / {selectedHistoryItem.patient.gender} • Ph: {selectedHistoryItem.patient.phone}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Prescribing Doctor</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-400)' }}>{selectedHistoryItem.doctor.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {selectedHistoryItem.doctor.specialty} ({selectedHistoryItem.doctor.printableTitle})
                </div>
              </div>
            </div>

            {/* Prescribed Investigations List */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FlaskConical size={16} color="var(--primary-400)" />
                <span>Prescribed Tests ({selectedHistoryItem.investigations.length})</span>
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {selectedHistoryItem.investigations.map((inv, idx) => (
                  <div
                    key={inv.id}
                    style={{
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(20, 184, 166, 0.2)', color: 'var(--primary-400)', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{inv.investigationName}</span>
                    </div>

                    {inv.instructions && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Notes: {inv.instructions}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Billing & Sampling Status summary */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.5rem' }}>Sampling & Financial Status</h4>
              {selectedHistoryItem.invoice ? (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 800 }}>
                      Invoice #{selectedHistoryItem.invoice.invoiceNumber}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Sample Barcode: <strong style={{ color: 'var(--primary-400)' }}>{selectedHistoryItem.invoice.sampleBarcode}</strong> • Net Total: Rs. {selectedHistoryItem.invoice.netTotal.toLocaleString()}
                    </div>
                  </div>

                  <span className={`badge ${selectedHistoryItem.invoice.status === 'PAID' ? 'badge-emerald' : 'badge-amber'}`}>
                    {selectedHistoryItem.invoice.status}
                  </span>
                </div>
              ) : (
                <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', color: '#fda4af', fontSize: '0.85rem' }}>
                  No lab sample or bill has been recorded yet for this prescription.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setSelectedHistoryItem(null)} className="btn btn-secondary">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const item = selectedHistoryItem;
                  setSelectedHistoryItem(null);
                  handleProcessHistorySample(item);
                }}
                className="btn btn-primary"
              >
                <FlaskConical size={15} />
                <span>Process Sample in Workstation</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Custom Test Modal */}
      <Modal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        title="Add Custom Investigation / Test"
        maxWidth="500px"
      >
        <form onSubmit={handleAddCustomTest} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label className="form-label">Test / Investigation Name *</label>
            <input
              type="text"
              className="input"
              required
              value={customTest.name}
              onChange={(e) => setCustomTest({ ...customTest, name: e.target.value })}
              placeholder="e.g. D-Dimer, Serum Ferritin, 2D Echo"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="form-label">Category</label>
              <select
                className="select"
                value={customTest.category}
                onChange={(e) => setCustomTest({ ...customTest, category: e.target.value })}
              >
                <option value="Biochemistry">Biochemistry</option>
                <option value="Hematology">Hematology</option>
                <option value="Serology">Serology</option>
                <option value="Clinical Pathology">Clinical Pathology</option>
                <option value="Radiology">Radiology</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Ultrasound">Ultrasound</option>
                <option value="Other">Other Diagnostic</option>
              </select>
            </div>

            <div>
              <label className="form-label">Test Fee (Rs.) *</label>
              <input
                type="number"
                className="input"
                required
                min="0"
                value={customTest.fee}
                onChange={(e) => setCustomTest({ ...customTest, fee: e.target.value })}
                placeholder="Fee amount"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setIsCustomModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={15} />
              <span>Add to Order</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Pay Lab Bill Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={`Receive Payment for Lab Bill ${successResult?.invoice.invoiceNumber}`}
        maxWidth="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Payable Amount</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary-400)' }}>
                Rs. {successResult?.invoice.netTotal.toLocaleString()}
              </div>
            </div>
            <span className="badge badge-amber">Unpaid Bill</span>
          </div>

          <div>
            <label className="form-label">Payment Method</label>
            <select
              className="select"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as any)}
            >
              <option value="CASH">Cash Payment</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="ONLINE_TRANSFER">Online Bank Transfer / QR</option>
              <option value="PANEL_CLAIM">Panel / Corporate Credit</option>
            </select>
          </div>

          <div>
            <label className="form-label">Amount Received (Rs.)</label>
            <input
              type="number"
              className="input"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </div>

          {payMethod !== 'CASH' && (
            <div>
              <label className="form-label">Reference / Approval / Slip #</label>
              <input
                type="text"
                className="input"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="Card auth code or online transaction ID"
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setIsPayModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              disabled={paying}
              onClick={handlePayLabBill}
              className="btn btn-primary"
            >
              <CheckCircle size={15} />
              <span>{paying ? 'Recording...' : 'Mark Bill Paid & Print Slip'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Lab Invoice Print Preview Modal */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Laboratory & Diagnostic Bill Slip"
        maxWidth="950px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div
            style={{
              height: '75vh',
              maxHeight: '780px',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              backgroundColor: '#334155',
            }}
          >
            {printHtml ? (
              <iframe
                title="Lab Bill Preview"
                srcDoc={printHtml}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              />
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading bill preview...</div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.75rem',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              📄 Official Laboratory Investigation Invoice & Sample Receipt
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="btn btn-secondary"
                disabled={isPrintingDirect}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleExecuteDirectPrint}
                className="btn btn-primary"
                disabled={isPrintingDirect}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Printer size={16} />
                <span>{isPrintingDirect ? 'Sending to Printer...' : 'Print Now'}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* CATALOG MASTER MANAGER MODAL */}
      <Modal
        isOpen={isCatalogManagerOpen}
        onClose={() => setIsCatalogManagerOpen(false)}
        title="Prescribed Lab Tests Catalog Master Data"
        maxWidth="950px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Header Bar & Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'var(--bg-surface-elevated)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '240px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                  placeholder="Search catalog by code, name, category..."
                  value={managerSearchQuery}
                  onChange={(e) => setManagerSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="select"
                style={{ width: '180px', fontSize: '0.82rem' }}
                value={managerCategoryFilter}
                onChange={(e) => setManagerCategoryFilter(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat} Category</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleOpenAddTestModal}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={14} />
              <span>Add New Diagnostic Test</span>
            </button>
          </div>

          {/* Catalog Data Table */}
          <div style={{ maxHeight: '480px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Code</th>
                  <th>Test Name</th>
                  <th>Category</th>
                  <th>Default Fee</th>
                  <th>Sample / Container</th>
                  <th>TAT</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {catalog
                  .filter((item) => {
                    if (!item) return false;
                    const matchesCat = managerCategoryFilter === 'ALL' || item.category === managerCategoryFilter;
                    const q = safeLower(managerSearchQuery);
                    const matchesSearch =
                      !q ||
                      safeLower(item.name).includes(q) ||
                      safeLower(item.code).includes(q) ||
                      safeLower(item.category).includes(q);
                    return matchesCat && matchesSearch;
                  })
                  .map((item) => (
                    <tr key={item.code}>
                      <td>
                        <span className="badge badge-primary" style={{ fontWeight: 800 }}>
                          {item.code}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>{item.name}</strong>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                          {item.category}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: 'var(--primary-400)' }}>
                          Rs. {item.defaultFee}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.sampleType} <br />
                        <span style={{ opacity: 0.8 }}>({item.containerType})</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem' }}>{item.tatHours} hrs</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditTestModal(item)}
                            className="btn btn-secondary btn-xs"
                            title="Edit Test Details"
                            style={{ padding: '0.25rem 0.45rem' }}
                          >
                            <Edit size={13} color="var(--primary-400)" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCatalogTest(item.code)}
                            disabled={deletingCatalogCode === item.code}
                            className="btn btn-secondary btn-xs"
                            title="Delete Test from Catalog"
                            style={{ padding: '0.25rem 0.45rem', color: 'var(--accent-rose)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* CREATE / EDIT CATALOG TEST FORM MODAL */}
      <Modal
        isOpen={isTestFormOpen}
        onClose={() => setIsTestFormOpen(false)}
        title={editingCatalogItem ? `Edit Test: ${editingCatalogItem.code}` : 'Create New Diagnostic Test'}
        maxWidth="600px"
      >
        <form onSubmit={handleSaveCatalogTest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
            <div>
              <label className="form-label">Test Code *</label>
              <input
                type="text"
                className="input"
                required
                disabled={!!editingCatalogItem}
                value={testFormState.code}
                onChange={(e) => setTestFormState({ ...testFormState, code: e.target.value.toUpperCase() })}
                placeholder="e.g. LFT_PLUS"
              />
            </div>

            <div>
              <label className="form-label">Test Name *</label>
              <input
                type="text"
                className="input"
                required
                value={testFormState.name}
                onChange={(e) => setTestFormState({ ...testFormState, name: e.target.value })}
                placeholder="e.g. Liver Function Profile Extended"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="form-label">Category</label>
              <input
                type="text"
                className="input"
                list="category-suggestions"
                value={testFormState.category}
                onChange={(e) => setTestFormState({ ...testFormState, category: e.target.value })}
                placeholder="e.g. Biochemistry"
              />
              <datalist id="category-suggestions">
                <option value="Hematology" />
                <option value="Biochemistry" />
                <option value="Serology" />
                <option value="Endocrinology" />
                <option value="Clinical Pathology" />
                <option value="Microbiology" />
                <option value="Radiology" />
                <option value="Cardiology" />
                <option value="Ultrasound" />
              </datalist>
            </div>

            <div>
              <label className="form-label">Default Fee (Rs.) *</label>
              <input
                type="number"
                className="input"
                required
                min={0}
                value={testFormState.defaultFee}
                onChange={(e) => setTestFormState({ ...testFormState, defaultFee: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="form-label">Sample Type</label>
              <input
                type="text"
                className="input"
                value={testFormState.sampleType}
                onChange={(e) => setTestFormState({ ...testFormState, sampleType: e.target.value })}
                placeholder="e.g. Whole Blood / Serum"
              />
            </div>

            <div>
              <label className="form-label">Container / Tube Type</label>
              <input
                type="text"
                className="input"
                value={testFormState.containerType}
                onChange={(e) => setTestFormState({ ...testFormState, containerType: e.target.value })}
                placeholder="e.g. Purple EDTA / Red Gel"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Turnaround Time (TAT Hours)</label>
            <input
              type="number"
              className="input"
              min={1}
              value={testFormState.tatHours}
              onChange={(e) => setTestFormState({ ...testFormState, tatHours: Number(e.target.value) })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setIsTestFormOpen(false)}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingCatalogItem}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Save size={14} />
              <span>{savingCatalogItem ? 'Saving...' : editingCatalogItem ? 'Update Test' : 'Save New Test'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
