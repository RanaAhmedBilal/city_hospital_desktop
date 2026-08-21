import React, { useState, useEffect } from 'react';
import { useActivePatientStore } from '../../stores/activePatientStore';
import { invokeIpc } from '../../lib/ipc';
import {
  VisitChargeDto,
  InvoiceDto,
  ServiceDto,
  PaymentDto,
  PatientDto,
} from '../../../shared/types';
import { PaymentMethod, AdjustmentType } from '../../../shared/constants/enums';
import { PrintPreviewModal } from '../../components/common/PrintPreviewModal';
import { Modal } from '../../components/common/Modal';
import {
  Receipt,
  Plus,
  CreditCard,
  Banknote,
  Building,
  Printer,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  DollarSign,
  Search,
  User,
  Filter,
  ArrowRight,
  Eye,
  RefreshCw,
  FileText,
  Check,
  Layers,
  Sparkles,
} from 'lucide-react';

export const BillingPage: React.FC = () => {
  const { patient, visit, setActivePatient, setActiveVisit } = useActivePatientStore();

  // Top-Level Section View: 'DESK' (Cashier Desk Overview) or 'ENCOUNTER' (Active Patient Encounter Billing)
  const [mainView, setMainView] = useState<'DESK' | 'ENCOUNTER'>(
    patient && visit ? 'ENCOUNTER' : 'DESK'
  );

  // Cashier Desk State
  const [deskTab, setDeskTab] = useState<'PENDING' | 'PARTIAL' | 'ACTIVE_ENCOUNTERS' | 'SETTLED' | 'ALL'>('PENDING');
  const [deskSearch, setDeskSearch] = useState('');
  const [deskPage, setDeskPage] = useState(1);
  const [deskPageSize, setDeskPageSize] = useState(10);
  const [allInvoices, setAllInvoices] = useState<InvoiceDto[]>([]);
  const [unbilledVisits, setUnbilledVisits] = useState<any[]>([]);
  const [deskLoading, setDeskLoading] = useState(false);

  // Encounter Billing State
  const [charges, setCharges] = useState<VisitChargeDto[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [servicesMaster, setServicesMaster] = useState<ServiceDto[]>([]);

  // Charge selection for invoice
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
  const [discountAmount, setDiscountAmount] = useState('0');
  const [initialPayAmount, setInitialPayAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [transactionRef, setTransactionRef] = useState('');
  const [billingNotes, setBillingNotes] = useState('');

  // Add Service Modal
  const [isAddChargeModalOpen, setIsAddChargeModalOpen] = useState(false);
  const [newChargeData, setNewChargeData] = useState({
    serviceId: '',
    serviceName: '',
    quantity: '1',
    unitPrice: '',
    discount: '0',
  });

  // Record Standalone Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    method: PaymentMethod.CASH,
    reference: '',
    notes: '',
  });

  // Financial Adjustment Modal
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [adjFormData, setAdjFormData] = useState({
    type: AdjustmentType.REFUND,
    adjustedAmount: '',
    reason: '',
  });

  // Print Preview Modal
  const [printModal, setPrintModal] = useState<{ open: boolean; title: string; html: string }>({
    open: false,
    title: '',
    html: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
    loadCashierDeskData();
  }, []);

  useEffect(() => {
    if (visit) {
      loadEncounterBillingData();
    }
  }, [visit]);

  const loadServices = async () => {
    try {
      const res = await invokeIpc<ServiceDto[]>('config:get-services', { activeOnly: true });
      if (res.success && res.data) setServicesMaster(res.data);
    } catch (err) {}
  };

  const loadCashierDeskData = async () => {
    setDeskLoading(true);
    try {
      const [invRes, visRes] = await Promise.all([
        invokeIpc<InvoiceDto[]>('billing:get-invoices', { query: deskSearch.trim() || undefined, limit: 200 }),
        invokeIpc<any[]>('billing:get-unbilled-visits'),
      ]);

      if (invRes.success && invRes.data) {
        setAllInvoices(invRes.data);
      }
      if (visRes.success && visRes.data) {
        setUnbilledVisits(visRes.data);
      }
    } catch (err) {
      console.error('Error loading cashier desk data:', err);
    } finally {
      setDeskLoading(false);
    }
  };

  const loadEncounterBillingData = async () => {
    if (!visit) return;
    setLoading(true);
    try {
      const [cRes, invRes] = await Promise.all([
        invokeIpc<VisitChargeDto[]>('billing:get-charges', { visitId: visit.id }),
        invokeIpc<InvoiceDto[]>('billing:get-invoices', { patientId: visit.patientId }),
      ]);

      if (cRes.success && cRes.data) {
        setCharges(cRes.data);
        const unbilledIds = cRes.data.filter((c) => c.status !== 'BILLED' && c.status !== 'VOIDED').map((c) => c.id);
        setSelectedChargeIds(unbilledIds);

        const netSum = cRes.data
          .filter((c) => unbilledIds.includes(c.id))
          .reduce((sum, c) => sum + c.netAmount, 0);
        setInitialPayAmount(String(netSum));
      }

      if (invRes.success && invRes.data) {
        setInvoices(invRes.data);
      }
    } catch (err) {
      console.error('Billing load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Select patient encounter from Cashier Desk table
  const handleSelectEncounterForBilling = async (visitId: string, patientId: string) => {
    try {
      const [pRes, vRes] = await Promise.all([
        invokeIpc<PatientDto>('patients:get-by-id', { id: patientId }),
        invokeIpc<any[]>('visits:get-all', { visitId }),
      ]);
      if (pRes.success && pRes.data) {
        const selectedVisit = vRes.data && vRes.data.length > 0 ? vRes.data[0] : null;
        setActivePatient(pRes.data, selectedVisit);
        setMainView('ENCOUNTER');
      }
    } catch (err) {
      console.error('Error selecting encounter for billing:', err);
    }
  };

  const handleSelectInvoiceEncounter = async (inv: InvoiceDto) => {
    try {
      const [pRes, vRes] = await Promise.all([
        invokeIpc<PatientDto>('patients:get-by-id', { id: inv.patientId }),
        invokeIpc<any[]>('visits:get-all', { visitId: inv.visitId }),
      ]);
      if (pRes.success && pRes.data) {
        const selectedVisit = vRes.data && vRes.data.length > 0 ? vRes.data[0] : null;
        setActivePatient(pRes.data, selectedVisit);
        setMainView('ENCOUNTER');
      }
    } catch (err) {
      console.error('Error selecting invoice encounter:', err);
    }
  };

  // Add Custom Charge
  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !visit) return;
    setSubmitting(true);
    try {
      const payload = {
        visitId: visit.id,
        patientId: patient.id,
        serviceId: newChargeData.serviceId || null,
        serviceName: newChargeData.serviceName.trim(),
        quantity: parseInt(newChargeData.quantity, 10) || 1,
        unitPrice: parseFloat(newChargeData.unitPrice) || 0,
        discount: parseFloat(newChargeData.discount) || 0,
      };

      const res = await invokeIpc<VisitChargeDto>('billing:add-charge', payload);
      if (res.success && res.data) {
        setIsAddChargeModalOpen(false);
        setNewChargeData({ serviceId: '', serviceName: '', quantity: '1', unitPrice: '', discount: '0' });
        loadEncounterBillingData();
        loadCashierDeskData();
      } else {
        setErrorMsg(res.error || 'Failed to add charge.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error adding charge.');
    } finally {
      setSubmitting(false);
    }
  };

  // Finalize Invoice
  const handleFinalizeInvoice = async () => {
    if (!patient || !visit) return;
    if (selectedChargeIds.length === 0) {
      setErrorMsg('Please select at least one charge item to invoice.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const initAmount = parseFloat(initialPayAmount);
      const payload = {
        visitId: visit.id,
        patientId: patient.id,
        doctorId: visit.doctorId,
        panelClientId: patient.panelClientId,
        panelClaimNo: patient.employeeId ? `CLAIM-${patient.employeeId}` : undefined,
        notes: billingNotes.trim() || undefined,
        chargeIds: selectedChargeIds,
        discountTotal: parseFloat(discountAmount) || 0,
        initialPayment:
          initAmount > 0
            ? {
                amount: initAmount,
                paymentMethod,
                transactionReference: transactionRef.trim() || null,
                notes: 'Settlement at time of invoicing',
              }
            : undefined,
      };

      const res = await invokeIpc<InvoiceDto>('billing:finalize-invoice', payload);
      if (res.success && res.data) {
        setSuccessMsg(`Invoice ${res.data.invoiceNumber} finalized successfully!`);
        loadEncounterBillingData();
        loadCashierDeskData();
        setActiveVisit({ ...visit, paymentStatus: res.data.status === 'PAID' ? ('PAID' as any) : ('PARTIALLY_PAID' as any) });
        handlePrintInvoice(res.data.id);
      } else {
        setErrorMsg(res.error || 'Failed to finalize invoice.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  // Record Standalone Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSubmitting(true);
    try {
      const payload = {
        invoiceId: selectedInvoice.id,
        patientId: selectedInvoice.patientId,
        amount: parseFloat(paymentFormData.amount),
        paymentMethod: paymentFormData.method,
        transactionReference: paymentFormData.reference.trim() || null,
        notes: paymentFormData.notes.trim() || null,
      };

      const res = await invokeIpc<PaymentDto>('billing:record-payment', payload);
      if (res.success && res.data) {
        const invId = selectedInvoice.id;
        setIsPayModalOpen(false);
        setPaymentFormData({ amount: '', method: PaymentMethod.CASH, reference: '', notes: '' });
        loadEncounterBillingData();
        loadCashierDeskData();
        setSuccessMsg(`Payment of Rs. ${res.data.amount} recorded! Receipt: ${res.data.receiptNumber}`);
        handlePrintInvoice(invId);
      } else {
        setErrorMsg(res.error || 'Failed to record payment.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error recording payment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Financial Adjustment
  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSubmitting(true);
    try {
      const payload = {
        invoiceId: selectedInvoice.id,
        type: adjFormData.type,
        adjustedAmount: parseFloat(adjFormData.adjustedAmount) || 0,
        reason: adjFormData.reason.trim(),
      };

      const res = await invokeIpc('billing:apply-adjustment', payload);
      if (res.success) {
        setIsAdjModalOpen(false);
        setAdjFormData({ type: AdjustmentType.REFUND, adjustedAmount: '', reason: '' });
        loadEncounterBillingData();
        loadCashierDeskData();
        setSuccessMsg('Financial adjustment applied and logged to audit trail.');
      } else {
        setErrorMsg(res.error || 'Adjustment failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error applying adjustment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      const res = await invokeIpc<string>('print:get-invoice-html', { invoiceId });
      if (res.success && res.data) {
        setPrintModal({
          open: true,
          title: `A4 Billing Slip`,
          html: res.data,
        });
      }
    } catch (err) {
      console.error('Invoice print error:', err);
    }
  };

  // Calculate Desk KPI Summary Totals
  const pendingInvoicesList = allInvoices.filter((i) => i.balanceTotal > 0 && i.status !== 'VOIDED');
  const pendingTotalAmount = pendingInvoicesList.reduce((acc, i) => acc + i.balanceTotal, 0);

  const partialInvoicesList = allInvoices.filter((i) => i.status === 'PARTIALLY_PAID');
  const paidTodayInvoices = allInvoices.filter((i) => i.status === 'PAID');
  const paidTodayTotal = paidTodayInvoices.reduce((acc, i) => acc + i.paidTotal, 0);

  const unbilledEncountersTotal = unbilledVisits.reduce((acc, v) => acc + (v.unbilledTotal || 0), 0);

  // Filter desk table items based on selected desk tab
  const filteredDeskInvoices = allInvoices.filter((inv) => {
    if (deskTab === 'PENDING') return inv.balanceTotal > 0 && inv.status !== 'VOIDED';
    if (deskTab === 'PARTIAL') return inv.status === 'PARTIALLY_PAID';
    if (deskTab === 'SETTLED') return inv.status === 'PAID';
    return true; // 'ALL'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header Switcher Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Receipt size={24} color="var(--primary-400)" />
            <span>Billing & Cashier Terminal</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Hospital financial settlement desk, pending/partial bill tracking, and active encounter billing
          </p>
        </div>

        {/* View Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '0.3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', gap: '0.35rem' }}>
          <button
            onClick={() => setMainView('DESK')}
            className={`btn btn-sm ${mainView === 'DESK' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem' }}
          >
            <Building size={16} />
            <span>Cashier Management Desk</span>
            {pendingInvoicesList.length > 0 && (
              <span style={{ background: '#f43f5e', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '999px', fontWeight: 700 }}>
                {pendingInvoicesList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainView('ENCOUNTER')}
            className={`btn btn-sm ${mainView === 'ENCOUNTER' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem' }}
          >
            <User size={16} />
            <span>Encounter Billing Terminal</span>
            {visit && (
              <span className="badge badge-emerald" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                Token #{visit.tokenNumber}
              </span>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--accent-rose)', color: '#fda4af', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1px solid var(--accent-emerald)', color: '#6ee7b7', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CASHIER MANAGEMENT DESK VIEW (HOSPITAL-WIDE BILLING OVERVIEW)          */}
      {/* ========================================================================= */}
      {mainView === 'DESK' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* KPI Dashboard Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #f43f5e' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Pending Bills</span>
                <Clock size={18} color="#f43f5e" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fda4af' }}>
                Rs. {pendingTotalAmount.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {pendingInvoicesList.length} outstanding invoice{pendingInvoicesList.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Partial Paid Bills</span>
                <CreditCard size={18} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fcd34d' }}>
                {partialInvoicesList.length} Invoices
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Partially settled balance due
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #34d399' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Settled Invoices</span>
                <CheckCircle size={18} color="#34d399" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6ee7b7' }}>
                Rs. {paidTodayTotal.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {paidTodayInvoices.length} fully paid invoices
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--primary-400)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Unbilled Encounters</span>
                <Layers size={18} color="var(--primary-400)" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>
                {unbilledVisits.length} Encounters
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Est. Unbilled: <strong>Rs. {unbilledEncountersTotal.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Cashier Desk Search & Sub-Tabs Bar */}
          <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setDeskTab('PENDING');
                    setDeskPage(1);
                  }}
                  className={`btn btn-sm ${deskTab === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Clock size={14} />
                  <span>Pending Bills ({pendingInvoicesList.length})</span>
                </button>

                <button
                  onClick={() => {
                    setDeskTab('PARTIAL');
                    setDeskPage(1);
                  }}
                  className={`btn btn-sm ${deskTab === 'PARTIAL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <CreditCard size={14} />
                  <span>Partial Paid ({partialInvoicesList.length})</span>
                </button>

                <button
                  onClick={() => {
                    setDeskTab('ACTIVE_ENCOUNTERS');
                    setDeskPage(1);
                  }}
                  className={`btn btn-sm ${deskTab === 'ACTIVE_ENCOUNTERS' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Layers size={14} />
                  <span>Active Encounters ({unbilledVisits.length})</span>
                </button>

                <button
                  onClick={() => {
                    setDeskTab('SETTLED');
                    setDeskPage(1);
                  }}
                  className={`btn btn-sm ${deskTab === 'SETTLED' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <CheckCircle size={14} />
                  <span>Settled ({paidTodayInvoices.length})</span>
                </button>

                <button
                  onClick={() => {
                    setDeskTab('ALL');
                    setDeskPage(1);
                  }}
                  className={`btn btn-sm ${deskTab === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span>All Invoices ({allInvoices.length})</span>
                </button>
              </div>

              {/* Search Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '280px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    className="input"
                    placeholder="Search Invoice #, MRN, Name, Phone..."
                    value={deskSearch}
                    onChange={(e) => {
                      setDeskSearch(e.target.value);
                      setDeskPage(1);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && loadCashierDeskData()}
                    style={{ paddingLeft: '2.1rem', fontSize: '0.85rem', width: '100%' }}
                  />
                </div>
                <button onClick={loadCashierDeskData} className="btn btn-secondary btn-sm" title="Refresh">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Table Content with Pagination */}
            {(() => {
              const currentTotalItems = deskTab === 'ACTIVE_ENCOUNTERS' ? unbilledVisits.length : filteredDeskInvoices.length;
              const totalDeskPages = Math.max(1, Math.ceil(currentTotalItems / deskPageSize));
              const startItemIdx = currentTotalItems === 0 ? 0 : (deskPage - 1) * deskPageSize + 1;
              const endItemIdx = Math.min(deskPage * deskPageSize, currentTotalItems);

              const paginatedUnbilled = unbilledVisits.slice((deskPage - 1) * deskPageSize, deskPage * deskPageSize);
              const paginatedInvoices = filteredDeskInvoices.slice((deskPage - 1) * deskPageSize, deskPage * deskPageSize);

              return (
                <>
                  {deskTab === 'ACTIVE_ENCOUNTERS' ? (
                    /* Active Encounters Table */
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>Token & Visit #</th>
                            <th>Patient Demographics</th>
                            <th>Attending Doctor</th>
                            <th>Unbilled Items</th>
                            <th>Est. Unbilled Fee</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedUnbilled.length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                No active encounters awaiting billing checkout.
                              </td>
                            </tr>
                          ) : (
                            paginatedUnbilled.map((v) => (
                              <tr key={v.id}>
                                <td>
                                  <div style={{ fontWeight: 800, color: 'var(--primary-400)' }}>Token #{v.tokenNumber}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{v.visitNumber}</div>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 700 }}>{v.patient?.fullName}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    MRN: {v.patient?.mrn} • Ph: {v.patient?.phone}
                                  </div>
                                </td>
                                <td>
                                  <div>{v.doctor?.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{v.doctor?.specialty}</div>
                                </td>
                                <td>
                                  <span className="badge badge-amber">{v.unbilledChargesCount} Unbilled</span>
                                </td>
                                <td>
                                  <strong style={{ color: '#f8fafc' }}>Rs. {v.unbilledTotal.toLocaleString()}</strong>
                                </td>
                                <td>
                                  <span className="badge badge-sky">{v.status}</span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    onClick={() => handleSelectEncounterForBilling(v.id, v.patient.id)}
                                    className="btn btn-primary btn-sm"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                  >
                                    <span>Checkout & Bill</span>
                                    <ArrowRight size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Invoices Table (Pending / Partial / Settled / All) */
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>Invoice # & Date</th>
                            <th>Patient Info</th>
                            <th>Net Total</th>
                            <th>Paid Total</th>
                            <th>Balance Due</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Cashier Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                                No invoices found for tab filter <strong>"{deskTab}"</strong>.
                              </td>
                            </tr>
                          ) : (
                            paginatedInvoices.map((inv) => (
                              <tr key={inv.id}>
                                <td>
                                  <div style={{ fontWeight: 800, color: 'var(--primary-400)', fontSize: '0.9rem' }}>
                                    {inv.invoiceNumber}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {new Date(inv.createdAt).toLocaleDateString()} {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 700 }}>{inv.patient?.fullName || 'N/A'}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    MRN: {inv.patient?.mrn} • Ph: {inv.patient?.phone}
                                  </div>
                                </td>
                                <td>
                                  <strong style={{ color: '#f8fafc' }}>Rs. {inv.netTotal.toLocaleString()}</strong>
                                </td>
                                <td>
                                  <span style={{ color: '#34d399', fontWeight: 600 }}>Rs. {inv.paidTotal.toLocaleString()}</span>
                                </td>
                                <td>
                                  <strong style={{ color: inv.balanceTotal > 0 ? '#f43f5e' : '#34d399', fontSize: '0.9rem' }}>
                                    Rs. {inv.balanceTotal.toLocaleString()}
                                  </strong>
                                </td>
                                <td>
                                  <span
                                    className={`badge ${
                                      inv.status === 'PAID'
                                        ? 'badge-emerald'
                                        : inv.status === 'PARTIALLY_PAID'
                                        ? 'badge-amber'
                                        : inv.status === 'VOIDED'
                                        ? 'badge-rose'
                                        : 'badge-sky'
                                    }`}
                                  >
                                    {inv.status}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                                    {inv.balanceTotal > 0 && inv.status !== 'VOIDED' && (
                                      <button
                                        onClick={() => {
                                          setSelectedInvoice(inv);
                                          setPaymentFormData({
                                            amount: String(inv.balanceTotal),
                                            method: PaymentMethod.CASH,
                                            reference: '',
                                            notes: 'Cashier collection',
                                          });
                                          setIsPayModalOpen(true);
                                        }}
                                        className="btn btn-emerald btn-sm"
                                        title="Collect Outstanding Payment"
                                      >
                                        <DollarSign size={14} />
                                        <span>Pay</span>
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handlePrintInvoice(inv.id)}
                                      className="btn btn-secondary btn-sm"
                                      title="Print A4 Billing Slip"
                                    >
                                      <Printer size={14} />
                                      <span>Slip</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        setSelectedInvoice(inv);
                                        setAdjFormData({ type: AdjustmentType.REFUND, adjustedAmount: String(inv.netTotal), reason: '' });
                                        setIsAdjModalOpen(true);
                                      }}
                                      className="btn btn-secondary btn-sm"
                                      title="Apply Refund or Financial Adjustment"
                                    >
                                      <RotateCcw size={14} />
                                    </button>

                                    <button
                                      onClick={() => handleSelectInvoiceEncounter(inv)}
                                      className="btn btn-secondary btn-sm"
                                      title="Open Patient Encounter Session"
                                    >
                                      <User size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Cashier Desk Pagination Controls Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span>
                        Showing <strong>{startItemIdx}</strong> to <strong>{endItemIdx}</strong> of <strong>{currentTotalItems}</strong> items
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Per page:</span>
                        <select
                          className="input"
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.78rem' }}
                          value={deskPageSize}
                          onChange={(e) => {
                            setDeskPageSize(Number(e.target.value));
                            setDeskPage(1);
                          }}
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <button
                        disabled={deskPage <= 1}
                        onClick={() => setDeskPage(1)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        First
                      </button>

                      <button
                        disabled={deskPage <= 1}
                        onClick={() => setDeskPage((p) => Math.max(1, p - 1))}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Prev
                      </button>

                      <span style={{ fontSize: '0.8rem', padding: '0 0.4rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        Page <strong>{deskPage}</strong> of <strong>{totalDeskPages}</strong>
                      </span>

                      <button
                        disabled={deskPage >= totalDeskPages}
                        onClick={() => setDeskPage((p) => Math.min(totalDeskPages, p + 1))}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Next
                      </button>

                      <button
                        disabled={deskPage >= totalDeskPages}
                        onClick={() => setDeskPage(totalDeskPages)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Last
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ENCOUNTER BILLING TERMINAL VIEW (ACTIVE PATIENT SESSION)                 */}
      {/* ========================================================================= */}
      {mainView === 'ENCOUNTER' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {!patient || !visit ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <Receipt size={40} color="var(--primary-400)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Active Encounter Selected</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                Please select an active visit from the Cashier Desk table or OPD Queue to finalize encounter charges.
              </p>
              <button onClick={() => setMainView('DESK')} className="btn btn-primary btn-sm">
                <Building size={16} />
                <span>Go to Cashier Management Desk</span>
              </button>
            </div>
          ) : (
            <>
              {/* Encounter Status Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Billing Terminal — Token #{visit.tokenNumber} ({visit.visitNumber})</span>
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Patient: <strong>{patient.fullName}</strong> ({patient.mrn}) • Doctor: {visit.doctor?.name || visit.doctorName || 'Attending Doctor'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setIsAddChargeModalOpen(true)} className="btn btn-secondary btn-sm">
                    <Plus size={14} />
                    <span>Add Service Charge</span>
                  </button>

                  <button onClick={() => setMainView('DESK')} className="btn btn-secondary btn-sm">
                    <Building size={14} />
                    <span>Cashier Desk Overview</span>
                  </button>
                </div>
              </div>

              {/* Active Encounter Invoices Banner */}
              {invoices.filter((i) => i.visitId === visit.id).length > 0 && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.18) 0%, rgba(3, 105, 161, 0.18) 100%)',
                    border: '1.5px solid var(--primary-500)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc' }}>
                      <Receipt size={18} color="var(--primary-400)" />
                      <span>Invoices Generated for this Encounter ({invoices.filter((i) => i.visitId === visit.id).length})</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Click <strong>"Print Slip"</strong> to preview and print the official A4 bill
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {invoices
                      .filter((i) => i.visitId === visit.id)
                      .map((inv) => (
                        <div
                          key={inv.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            padding: '0.65rem 1rem',
                            borderRadius: 'var(--radius-sm)',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 800, color: 'var(--primary-400)', fontSize: '1rem' }}>
                                {inv.invoiceNumber}
                              </span>
                              <span className={`badge ${inv.status === 'PAID' ? 'badge-emerald' : 'badge-amber'}`}>
                                {inv.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Net Total: <strong style={{ color: '#ffffff' }}>Rs. {inv.netTotal.toLocaleString()}</strong> • Paid: <strong style={{ color: '#34d399' }}>Rs. {inv.paidTotal.toLocaleString()}</strong> • Balance Due: <strong style={{ color: inv.balanceTotal > 0 ? '#fda4af' : '#34d399' }}>Rs. {inv.balanceTotal.toLocaleString()}</strong>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {inv.balanceTotal > 0 && inv.status !== 'VOIDED' && (
                              <button
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setPaymentFormData({
                                    amount: String(inv.balanceTotal),
                                    method: PaymentMethod.CASH,
                                    reference: '',
                                    notes: 'Settlement payment',
                                  });
                                  setIsPayModalOpen(true);
                                }}
                                className="btn btn-emerald btn-sm"
                              >
                                <DollarSign size={14} />
                                <span>Record Payment</span>
                              </button>
                            )}

                            <button onClick={() => handlePrintInvoice(inv.id)} className="btn btn-secondary btn-sm">
                              <Printer size={14} />
                              <span>Print A4 Slip</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Main Encounter Billing Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)', gap: '1.25rem' }}>
                {/* Left Column: Itemized Charge Selection Table */}
                <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>1. Itemized Visit Charges</h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Select items to include in this invoice
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '35px' }}>
                            <input
                              type="checkbox"
                              checked={
                                charges.filter((c) => c.status !== 'BILLED' && c.status !== 'VOIDED').length > 0 &&
                                selectedChargeIds.length === charges.filter((c) => c.status !== 'BILLED' && c.status !== 'VOIDED').length
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedChargeIds(charges.filter((c) => c.status !== 'BILLED' && c.status !== 'VOIDED').map((c) => c.id));
                                } else {
                                  setSelectedChargeIds([]);
                                }
                              }}
                            />
                          </th>
                          <th>Service Description</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th>Discount</th>
                          <th>Net Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {charges.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                              No charges recorded for this encounter yet. Click <strong>"Add Service Charge"</strong> above to add consultation or procedure fees.
                            </td>
                          </tr>
                        ) : (
                          charges.map((c) => (
                            <tr key={c.id} style={{ opacity: c.status === 'BILLED' || c.status === 'VOIDED' ? 0.6 : 1 }}>
                              <td>
                                <input
                                  type="checkbox"
                                  disabled={c.status === 'BILLED' || c.status === 'VOIDED'}
                                  checked={selectedChargeIds.includes(c.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedChargeIds([...selectedChargeIds, c.id]);
                                    } else {
                                      setSelectedChargeIds(selectedChargeIds.filter((id) => id !== c.id));
                                    }
                                  }}
                                />
                              </td>
                              <td style={{ fontWeight: 600 }}>{c.serviceName}</td>
                              <td>{c.quantity}</td>
                              <td>Rs. {c.unitPrice.toLocaleString()}</td>
                              <td>Rs. {c.discount.toLocaleString()}</td>
                              <td>
                                <strong>Rs. {c.netAmount.toLocaleString()}</strong>
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    c.status === 'BILLED'
                                      ? 'badge-emerald'
                                      : c.status === 'VOIDED'
                                      ? 'badge-rose'
                                      : 'badge-amber'
                                  }`}
                                >
                                  {c.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Column: Invoice Settlement & Checkout Panel */}
                <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <DollarSign size={18} color="var(--primary-400)" />
                    <span>2. Finalize & Settlement</span>
                  </h3>

                  {/* Summary Totals */}
                  <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Selected Charges ({selectedChargeIds.length}):</span>
                      <span>Rs. {charges.filter((c) => selectedChargeIds.includes(c.id)).reduce((a, c) => a + c.unitPrice * c.quantity, 0).toLocaleString()}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                      <span>Item Discounts:</span>
                      <span>- Rs. {charges.filter((c) => selectedChargeIds.includes(c.id)).reduce((a, c) => a + c.discount, 0).toLocaleString()}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontWeight: 700 }}>Additional Global Discount:</span>
                      <input
                        type="number"
                        className="input"
                        style={{ width: '100px', textAlign: 'right', padding: '0.2rem 0.4rem', fontSize: '0.85rem' }}
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-400)', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <span>Net Payable Invoice Total:</span>
                      <span>
                        Rs.{' '}
                        {Math.max(
                          0,
                          charges.filter((c) => selectedChargeIds.includes(c.id)).reduce((a, c) => a + c.netAmount, 0) - (parseFloat(discountAmount) || 0)
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Immediate Settlement Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Initial Payment Settlement (Rs.)
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={initialPayAmount}
                      onChange={(e) => setInitialPayAmount(e.target.value)}
                      placeholder="Enter amount collected..."
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Payment Mode</label>
                        <select
                          className="input"
                          style={{ fontSize: '0.85rem' }}
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        >
                          <option value={PaymentMethod.CASH}>Cash</option>
                          <option value={PaymentMethod.CARD}>Card / POS</option>
                          <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
                          <option value={PaymentMethod.PANEL_CREDIT}>Panel Credit</option>
                          <option value={PaymentMethod.ONLINE}>Online / Wallet</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ref # / Auth Code</label>
                        <input
                          type="text"
                          className="input"
                          style={{ fontSize: '0.85rem' }}
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          placeholder="Optional ref"
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Billing Notes / Remarks</label>
                      <input
                        type="text"
                        className="input"
                        style={{ fontSize: '0.85rem' }}
                        value={billingNotes}
                        onChange={(e) => setBillingNotes(e.target.value)}
                        placeholder="Optional invoice notes..."
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleFinalizeInvoice}
                    disabled={submitting || selectedChargeIds.length === 0}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 700, marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <CheckCircle size={18} />
                    <span>{submitting ? 'Finalizing Invoice...' : 'Generate & Print Invoice'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS: Add Service Charge, Record Standalone Payment, Financial Adjustment */}
      {/* ========================================================================= */}

      {/* 1. Add Service Charge Modal */}
      <Modal isOpen={isAddChargeModalOpen} onClose={() => setIsAddChargeModalOpen(false)} title="Add Visit Service Charge">
        <form onSubmit={handleAddCharge} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Select Service from Catalog (Optional)</label>
            <select
              className="input"
              value={newChargeData.serviceId}
              onChange={(e) => {
                const sId = e.target.value;
                const s = servicesMaster.find((item) => item.id === sId);
                if (s) {
                  setNewChargeData({
                    ...newChargeData,
                    serviceId: sId,
                    serviceName: s.name,
                    unitPrice: String(s.standardPrice),
                  });
                } else {
                  setNewChargeData({ ...newChargeData, serviceId: sId });
                }
              }}
            >
              <option value="">-- Custom Manual Service Entry --</option>
              {servicesMaster.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) — Rs. {s.standardPrice}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Service Description / Name *</label>
            <input
              type="text"
              className="input"
              required
              value={newChargeData.serviceName}
              onChange={(e) => setNewChargeData({ ...newChargeData, serviceName: e.target.value })}
              placeholder="e.g. ECG Recording, Dressing Fee, IV Infusion..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                className="input"
                min="1"
                required
                value={newChargeData.quantity}
                onChange={(e) => setNewChargeData({ ...newChargeData, quantity: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Unit Price (Rs.) *</label>
              <input
                type="number"
                className="input"
                required
                value={newChargeData.unitPrice}
                onChange={(e) => setNewChargeData({ ...newChargeData, unitPrice: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Discount (Rs.)</label>
              <input
                type="number"
                className="input"
                value={newChargeData.discount}
                onChange={(e) => setNewChargeData({ ...newChargeData, discount: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setIsAddChargeModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              Add Charge
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. Standalone Record Payment Modal */}
      <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title={`Record Payment — ${selectedInvoice?.invoiceNumber}`}>
        <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
            <div>Patient: <strong>{selectedInvoice?.patient?.fullName}</strong> ({selectedInvoice?.patient?.mrn})</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span>Invoice Net Total: Rs. {selectedInvoice?.netTotal.toLocaleString()}</span>
              <span style={{ color: '#f43f5e', fontWeight: 700 }}>
                Balance Due: Rs. {selectedInvoice?.balanceTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <label className="label">Payment Amount Received (Rs.) *</label>
            <input
              type="number"
              className="input"
              required
              max={selectedInvoice?.balanceTotal}
              value={paymentFormData.amount}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label">Payment Method</label>
              <select
                className="input"
                value={paymentFormData.method}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, method: e.target.value as PaymentMethod })}
              >
                <option value={PaymentMethod.CASH}>Cash</option>
                <option value={PaymentMethod.CARD}>Card / POS</option>
                <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
                <option value={PaymentMethod.PANEL_CREDIT}>Panel Credit</option>
                <option value={PaymentMethod.ONLINE}>Online / Wallet</option>
              </select>
            </div>

            <div>
              <label className="label">Reference / Auth Code</label>
              <input
                type="text"
                className="input"
                value={paymentFormData.reference}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
                placeholder="Transaction ID / Slip #"
              />
            </div>
          </div>

          <div>
            <label className="label">Receipt Remarks</label>
            <input
              type="text"
              className="input"
              value={paymentFormData.notes}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
              placeholder="Notes..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setIsPayModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-emerald">
              Submit Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Financial Adjustment Modal */}
      <Modal isOpen={isAdjModalOpen} onClose={() => setIsAdjModalOpen(false)} title={`Financial Adjustment — ${selectedInvoice?.invoiceNumber}`}>
        <form onSubmit={handleApplyAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Adjustment Type *</label>
            <select
              className="input"
              value={adjFormData.type}
              onChange={(e) => setAdjFormData({ ...adjFormData, type: e.target.value as AdjustmentType })}
            >
              <option value={AdjustmentType.REFUND}>Refund Issued</option>
              <option value={AdjustmentType.CORRECTION}>Bill Correction / Discount</option>
              <option value={AdjustmentType.WRITE_OFF}>Bad Debt Write-Off</option>
              <option value={AdjustmentType.VOID}>Void Invoice Entirely</option>
            </select>
          </div>

          {adjFormData.type !== AdjustmentType.VOID && (
            <div>
              <label className="label">Adjusted Net Total (Rs.) *</label>
              <input
                type="number"
                className="input"
                required
                value={adjFormData.adjustedAmount}
                onChange={(e) => setAdjFormData({ ...adjFormData, adjustedAmount: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="label">Reason for Adjustment / Audit Note *</label>
            <textarea
              className="input"
              rows={3}
              required
              value={adjFormData.reason}
              onChange={(e) => setAdjFormData({ ...adjFormData, reason: e.target.value })}
              placeholder="Provide a valid administrative justification..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setIsAdjModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-rose">
              Apply Adjustment
            </button>
          </div>
        </form>
      </Modal>

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={printModal.open}
        onClose={() => setPrintModal({ ...printModal, open: false })}
        title={printModal.title}
        htmlContent={printModal.html}
      />
    </div>
  );
};
