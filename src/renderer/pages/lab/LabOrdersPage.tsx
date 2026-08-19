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

interface LabOrdersPageProps {
  onNavigateToBilling: () => void;
  onNavigateToQueue: () => void;
}

export const LabOrdersPage: React.FC<LabOrdersPageProps> = ({
  onNavigateToBilling,
  onNavigateToQueue,
}) => {
  const { patient, visit } = useActivePatientStore();

  const [catalog, setCatalog] = useState<LabCatalogItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([]);

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

  const categories = ['ALL', ...Array.from(new Set(catalog.map((c) => c.category)))];

  const filteredCatalog = catalog.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
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
          barcode: res.data.sampleRecord.barcode,
        });
        setPayAmount(String(res.data.invoice.netTotal));
        setSelectedTests([]);
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
        // Print the paid receipt
        handlePrintLabInvoice(successResult.invoice.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPaying(false);
    }
  };

  if (!patient || !visit) {
    return (
      <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
        <FlaskConical size={48} color="var(--primary-400)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Active Patient Visit Selected</h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
          When a doctor prescribes laboratory tests, select the patient from the OPD Queue to take their diagnostic sample and generate their separate lab bill.
        </p>
        <button onClick={onNavigateToQueue} className="btn btn-primary">
          <span>Go to OPD Queue</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Patient & Encounter Header */}
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
              <FlaskConical size={22} color="var(--primary-400)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{patient.fullName}</h3>
                <span className="badge badge-primary">{patient.mrn}</span>
                <span className="badge badge-emerald">Token #{visit.tokenNumber}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Doctor: <strong style={{ color: 'var(--text-primary)' }}>{visit.doctorName || 'Assigned Specialist'}</strong> • Age/Gender: {patient.age || '—'} Yrs / {patient.gender || '—'} • Phone: {patient.phone || '—'}
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

      {errorMsg && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--accent-rose)', color: '#fda4af', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
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
              Bill Number: <strong style={{ color: '#ffffff' }}>{successResult.invoice.invoiceNumber}</strong> • Sample Barcode: <strong style={{ color: 'var(--primary-400)' }}>{successResult.barcode}</strong> • Status: <span style={{ color: '#fbbf24', fontWeight: 700 }}>UNPAID (Rs. {successResult.invoice.netTotal.toLocaleString()})</span>
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

            <button
              type="button"
              onClick={() => setIsCustomModalOpen(true)}
              className="btn btn-secondary btn-sm"
            >
              <Plus size={13} />
              <span>Add Custom Test</span>
            </button>
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
                  No tests selected yet. Click any test from catalog to add.
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
    </div>
  );
};
