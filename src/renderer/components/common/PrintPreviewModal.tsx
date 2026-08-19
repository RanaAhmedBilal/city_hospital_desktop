import React, { useState } from 'react';
import { Modal } from './Modal';
import { invokeIpc } from '../../lib/ipc';
import { Printer, Download, X, Check } from 'lucide-react';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  htmlContent: string;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  htmlContent,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleDirectPrint = async () => {
    setIsPrinting(true);
    setStatusMsg(null);
    try {
      const res = await invokeIpc('print:direct', { html: htmlContent });
      if (res.success) {
        setStatusMsg('Print job dispatched successfully!');
      } else {
        // Fallback to browser print window if running outside native electron
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }
      }
    } catch (err: any) {
      console.error('Print error:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsPrinting(true);
    try {
      const res = await invokeIpc<string>('print:generate-pdf', { html: htmlContent });
      if (res.success && res.data) {
        const byteCharacters = atob(res.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Browser fallback
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }
      }
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="900px">
      <div style={{ display: 'flex', flexDirection: 'column', height: '75vh' }}>
        {/* Action Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border-default)',
          marginBottom: '1rem',
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            A4 Standard Healthcare Document Layout
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {statusMsg && (
              <span style={{ fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} /> {statusMsg}
              </span>
            )}
            <button
              onClick={handleDownloadPdf}
              disabled={isPrinting}
              className="btn btn-secondary btn-sm"
            >
              <Download size={14} />
              <span>Export PDF</span>
            </button>
            <button
              onClick={handleDirectPrint}
              disabled={isPrinting}
              className="btn btn-primary btn-sm"
            >
              <Printer size={14} />
              <span>Print A4</span>
            </button>
          </div>
        </div>

        {/* Scaled A4 Preview Box */}
        <div style={{
          flex: 1,
          backgroundColor: '#334155',
          borderRadius: 'var(--radius-sm)',
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{
            width: '210mm',
            minHeight: '297mm',
            backgroundColor: '#ffffff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <iframe
              srcDoc={htmlContent}
              title="Print Preview"
              style={{
                width: '100%',
                height: '100%',
                minHeight: '297mm',
                border: 'none',
                backgroundColor: '#ffffff',
              }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
