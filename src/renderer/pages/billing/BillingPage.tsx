import React, { useState, useEffect } from 'react';
import { useActivePatientStore } from '../../stores/activePatientStore';
import { invokeIpc } from '../../lib/ipc';
import {
  VisitChargeDto,
  InvoiceDto,
  ServiceDto,
  PaymentDto,
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
} from 'lucide-react';

export const BillingPage: React.FC = () => {
  const { patient, visit, setActiveVisit } = useActivePatientStore();

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
        // Automatically select all unbilled charges
        const unbilledIds = cRes.data.filter((c) => c.status !== 'BILLED' && c.status !== 'VOIDED').map((c) => c.id);
        setSelectedChargeIds(unbilledIds);

        // Pre-fill initial payment amount with net sum
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
        setActiveVisit({ ...visit, paymentStatus: res.data.status === 'PAID' ? ('PAID' as any) : ('PARTIALLY_PAID' as any) });
        // Auto-open print preview modal for immediate printing
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
    if (!selectedInvoice || !patient) return;
    setSubmitting(true);
    try {
      const payload = {
        invoiceId: selectedInvoice.id,
        patientId: patient.id,
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
        setSuccessMsg(`Payment of Rs. ${res.data.amount} recorded! Receipt: ${res.data.receiptNumber}`);
        // Auto-open updated print preview
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
          title: `A4 Billing Slip - ${patient?.fullName}`,
          html: res.data,
        });
      }
    } catch (err) {
      console.error('Invoice print error:', err);
    }
  };

  if (!patient || !visit) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <Receipt size={40} color="var(--primary-400)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Encounter Selected for Billing</h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto' }}>
          Please select a patient visit from the OPD Queue or Patient Directory to open the Billing & Cashier terminal.
        </p>
      </div>
    );
  }

  // Calculate live preview totals for selected charges
  const selectedChargesList = charges.filter((c) => selectedChargeIds.includes(c.id));
  const previewGross = selectedChargesList.reduce((acc, c) => acc + c.unitPrice * c.quantity, 0);
  const previewItemDiscount = selectedChargesList.reduce((acc, c) => acc + c.discount, 0);
  const previewGlobalDiscount = parseFloat(discountAmount) || 0;
  const previewNet = Math.max(0, previewGross - (previewItemDiscount + previewGlobalDiscount));
  const previewPaid = parseFloat(initialPayAmount) || 0;
  const previewBalance = Math.max(0, previewNet - previewPaid);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Receipt size={22} color="var(--primary-400)" />
            <span>Billing Terminal — Token #{visit.tokenNumber} ({visit.visitNumber})</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Financial settlement, service charges itemization, and payment receipting
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setIsAddChargeModalOpen(true)} className="btn btn-secondary btn-sm">
            <Plus size={14} />
            <span>Add Service Charge</span>
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
                        {inv.status === 'PAID' ? 'PAID' : 'UNPAID'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Net Total: <strong style={{ color: '#ffffff' }}>Rs. {inv.netTotal.toLocaleString()}</strong> • Paid: <strong style={{ color: '#34d399' }}>Rs. {inv.paidTotal.toLocaleString()}</strong> • Balance Due: <strong style={{ color: inv.balanceTotal > 0 ? '#fda4af' : '#34d399' }}>Rs. {inv.balanceTotal.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handlePrintInvoice(inv.id)}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Printer size={14} />
                      <span>Print A4 Bill Slip</span>
                    </button>

                    {inv.balanceTotal > 0 && inv.status !== 'VOIDED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setPaymentFormData({
                            amount: String(inv.balanceTotal),
                            method: PaymentMethod.CASH,
                            reference: '',
                            notes: '',
                          });
                          setIsPayModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <DollarSign size={14} />
                        <span>Receive Payment</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Grid: Charges Itemization & Invoice Form */}
      <div className="billing-workstation-grid">
        {/* Left: Billable Charges List */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary-400)' }}>1. Visit Encounters & Service Charges</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Select items to include in invoice</span>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}>Select</th>
                  <th>Service Description</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Rate</th>
                  <th style={{ textAlign: 'right' }}>Discount</th>
                  <th style={{ textAlign: 'right' }}>Net</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {charges.length > 0 ? (
                  charges.map((c) => {
                    const isChecked = selectedChargeIds.includes(c.id);
                    const isBilled = c.status === 'BILLED';
                    const matchingInv = invoices.find(
                      (inv) =>
                        inv.items?.some((it) => it.chargeId === c.id) ||
                        inv.visitId === c.visitId
                    );

                    return (
                      <tr key={c.id} style={{ opacity: isBilled ? 0.85 : 1 }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isBilled}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedChargeIds([...selectedChargeIds, c.id]);
                              } else {
                                setSelectedChargeIds(selectedChargeIds.filter((id) => id !== c.id));
                              }
                            }}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{c.serviceName}</div>
                          {c.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.description}</div>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{c.quantity}</td>
                        <td style={{ textAlign: 'right' }}>Rs. {c.unitPrice.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', color: '#34d399' }}>{c.discount > 0 ? `Rs. ${c.discount}` : '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-400)' }}>
                          Rs. {c.netAmount.toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge ${isBilled ? 'badge-slate' : 'badge-amber'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isBilled && matchingInv ? (
                            <button
                              type="button"
                              onClick={() => handlePrintInvoice(matchingInv.id)}
                              className="btn btn-secondary btn-sm"
                              title="Print A4 Bill Slip"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                            >
                              <Printer size={12} />
                              <span>Print</span>
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No charges found for this visit. Click "Add Service Charge" to add fees.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Payment & Invoicing Box */}
        <div className="card" style={{ background: 'var(--bg-surface-elevated)' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', color: '#f8fafc' }}>2. Financial Settlement</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Selected Gross:</span>
              <span>Rs. {previewGross.toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Item Discounts:</span>
              <span style={{ color: '#34d399' }}>- Rs. {previewItemDiscount.toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Additional Discount (Rs.)</label>
              <input
                type="number"
                className="input"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                style={{ width: '120px', textAlign: 'right', fontSize: '0.85rem' }}
                min="0"
              />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border-default)',
              fontSize: '1.15rem',
              fontWeight: 800,
              color: 'var(--primary-400)',
            }}>
              <span>Net Payable:</span>
              <span>Rs. {previewNet.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px dashed var(--border-default)', paddingTop: '0.75rem' }}>
            <div>
              <label className="form-label">Payment Method</label>
              <select
                className="select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                <option value="CASH">Cash Payment</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="BANK_TRANSFER">Bank Wire / Online Transfer</option>
                <option value="PANEL_CREDIT">Corporate Panel Credit</option>
                <option value="CHEQUE">Bank Cheque</option>
              </select>
            </div>

            <div>
              <label className="form-label">Received Amount (Rs.)</label>
              <input
                type="number"
                className="input"
                value={initialPayAmount}
                onChange={(e) => setInitialPayAmount(e.target.value)}
                placeholder="Amount received"
                min="0"
                style={{ fontWeight: 700, fontSize: '1rem', color: '#34d399' }}
              />
            </div>

            {paymentMethod !== 'CASH' && (
              <div>
                <label className="form-label">Transaction Ref / Auth #</label>
                <input
                  type="text"
                  className="input"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="Card auth code / Bank txn ID"
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 700, color: previewBalance > 0 ? '#fda4af' : '#6ee7b7' }}>
              <span>Balance Remaining:</span>
              <span>Rs. {previewBalance.toLocaleString()}</span>
            </div>

            <button
              onClick={handleFinalizeInvoice}
              disabled={submitting || selectedChargeIds.length === 0}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              <Receipt size={16} />
              <span>{submitting ? 'Generating Invoice...' : 'Finalize Invoice & Receipt'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Generated Invoices History for this Patient */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={18} color="var(--primary-400)" />
          <span>Patient Invoices History ({invoices.length})</span>
        </h3>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date / Time</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th>Net Total</th>
                <th>Paid Total</th>
                <th>Balance Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 800, color: 'var(--primary-400)' }}>{inv.invoiceNumber}</td>
                    <td>{new Date(inv.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>Rs. {inv.subtotal.toLocaleString()}</td>
                    <td style={{ color: '#34d399' }}>- Rs. {inv.discountTotal.toLocaleString()}</td>
                    <td style={{ fontWeight: 700 }}>Rs. {inv.netTotal.toLocaleString()}</td>
                    <td style={{ color: '#34d399', fontWeight: 600 }}>Rs. {inv.paidTotal.toLocaleString()}</td>
                    <td style={{ color: inv.balanceTotal > 0 ? '#fda4af' : 'var(--text-muted)', fontWeight: 700 }}>
                      Rs. {inv.balanceTotal.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${inv.status === 'PAID' ? 'badge-emerald' : inv.status === 'VOIDED' ? 'badge-rose' : 'badge-amber'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => handlePrintInvoice(inv.id)}
                          className="btn btn-secondary btn-sm"
                          title="Print A4 Official Slip"
                        >
                          <Printer size={13} />
                          <span>Print Slip</span>
                        </button>
                        {inv.balanceTotal > 0 && inv.status !== 'VOIDED' && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPaymentFormData({
                                amount: String(inv.balanceTotal),
                                method: PaymentMethod.CASH,
                                reference: '',
                                notes: '',
                              });
                              setIsPayModalOpen(true);
                            }}
                            className="btn btn-primary btn-sm"
                            title="Collect Payment"
                          >
                            <DollarSign size={13} />
                            <span>Pay</span>
                          </button>
                        )}
                        {inv.status !== 'VOIDED' && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setAdjFormData({
                                type: AdjustmentType.REFUND,
                                adjustedAmount: String(inv.netTotal),
                                reason: '',
                              });
                              setIsAdjModalOpen(true);
                            }}
                            className="btn btn-secondary btn-sm"
                            title="Apply Adjustment / Refund"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                    No finalized invoices generated for this patient yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Custom Service Charge Modal */}
      <Modal isOpen={isAddChargeModalOpen} onClose={() => setIsAddChargeModalOpen(false)} title="Add Visit Service Charge" maxWidth="500px">
        <form onSubmit={handleAddCharge} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">Select Standard Service</label>
            <select
              className="select"
              value={newChargeData.serviceId}
              onChange={(e) => {
                const s = servicesMaster.find((item) => item.id === e.target.value);
                setNewChargeData({
                  ...newChargeData,
                  serviceId: e.target.value,
                  serviceName: s ? s.name : newChargeData.serviceName,
                  unitPrice: s ? String(s.standardPrice) : newChargeData.unitPrice,
                });
              }}
            >
              <option value="">Custom Service Description...</option>
              {servicesMaster.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.category}] {s.name} — Rs. {s.standardPrice}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Service Description *</label>
            <input
              type="text"
              className="input"
              value={newChargeData.serviceName}
              onChange={(e) => setNewChargeData({ ...newChargeData, serviceName: e.target.value })}
              placeholder="Service or Procedure Name"
              required
            />
          </div>

          <div className="responsive-grid-3">
            <div>
              <label className="form-label">Quantity</label>
              <input
                type="number"
                className="input"
                value={newChargeData.quantity}
                onChange={(e) => setNewChargeData({ ...newChargeData, quantity: e.target.value })}
                min="1"
                required
              />
            </div>

            <div>
              <label className="form-label">Unit Rate (Rs.) *</label>
              <input
                type="number"
                className="input"
                value={newChargeData.unitPrice}
                onChange={(e) => setNewChargeData({ ...newChargeData, unitPrice: e.target.value })}
                placeholder="Rate"
                min="0"
                required
              />
            </div>

            <div>
              <label className="form-label">Discount (Rs.)</label>
              <input
                type="number"
                className="input"
                value={newChargeData.discount}
                onChange={(e) => setNewChargeData({ ...newChargeData, discount: e.target.value })}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setIsAddChargeModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              <span>{submitting ? 'Adding...' : 'Add Charge Item'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Standalone Payment Modal */}
      <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title={`Collect Payment for ${selectedInvoice?.invoiceNumber}`} maxWidth="500px">
        <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">Payment Amount (Rs.) *</label>
            <input
              type="number"
              className="input"
              value={paymentFormData.amount}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
              min="1"
              required
            />
          </div>

          <div>
            <label className="form-label">Payment Mode</label>
            <select
              className="select"
              value={paymentFormData.method}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, method: e.target.value as PaymentMethod })}
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Credit/Debit Card</option>
              <option value="BANK_TRANSFER">Bank Wire</option>
              <option value="PANEL_CREDIT">Panel Credit</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label className="form-label">Reference / Auth Code</label>
            <input
              type="text"
              className="input"
              value={paymentFormData.reference}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
              placeholder="Card authorization code or wire slip #"
            />
          </div>

          <div>
            <label className="form-label">Notes</label>
            <input
              type="text"
              className="input"
              value={paymentFormData.notes}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
              placeholder="Optional notes"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={() => setIsPayModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              <span>{submitting ? 'Processing...' : 'Issue Receipt'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Financial Adjustment / Refund Modal */}
      <Modal isOpen={isAdjModalOpen} onClose={() => setIsAdjModalOpen(false)} title={`Financial Adjustment for ${selectedInvoice?.invoiceNumber}`} maxWidth="500px">
        <form onSubmit={handleApplyAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">Adjustment Type</label>
            <select
              className="select"
              value={adjFormData.type}
              onChange={(e) => setAdjFormData({ ...adjFormData, type: e.target.value as AdjustmentType })}
            >
              <option value="REFUND">Refund Transaction</option>
              <option value="CORRECTION">Bill Amount Correction</option>
              <option value="DISCOUNT_ADJUSTMENT">Post-Bill Discount</option>
              <option value="VOID">Void Invoice</option>
            </select>
          </div>

          {adjFormData.type !== 'VOID' && (
            <div>
              <label className="form-label">New Adjusted Total (Rs.)</label>
              <input
                type="number"
                className="input"
                value={adjFormData.adjustedAmount}
                onChange={(e) => setAdjFormData({ ...adjFormData, adjustedAmount: e.target.value })}
                min="0"
                required
              />
            </div>
          )}

          <div>
            <label className="form-label">Justification Reason *</label>
            <textarea
              className="textarea"
              rows={3}
              value={adjFormData.reason}
              onChange={(e) => setAdjFormData({ ...adjFormData, reason: e.target.value })}
              placeholder="Reason for financial correction or refund (recorded in audit logs)"
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={() => setIsAdjModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              <span>{submitting ? 'Applying...' : 'Apply & Audit Log'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* A4 Print Preview Modal */}
      <PrintPreviewModal
        isOpen={printModal.open}
        onClose={() => setPrintModal({ open: false, title: '', html: '' })}
        title={printModal.title}
        htmlContent={printModal.html}
      />
    </div>
  );
};
