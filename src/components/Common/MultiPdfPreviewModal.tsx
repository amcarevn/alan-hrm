import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, ArrowPathIcon, ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { managementApi } from '@/utils/api';

export interface ContractPreviewItem {
  id: number;
  employee_name: string;
  template_name: string;
}

interface Props {
  open: boolean;
  contracts: ContractPreviewItem[];
  onClose: () => void;
}

const MultiPdfPreviewModal: React.FC<Props> = ({ open, contracts, onClose }) => {
  const [index, setIndex] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const current = contracts[index];

  useEffect(() => {
    if (!open || !current) return;
    let cancelled = false;
    setPdfUrl('');
    setError('');
    setLoading(true);
    managementApi
      .get(`/api-hrm/employee-contracts/${current.id}/download_file/`, { responseType: 'blob' })
      .then((res: any) => {
        if (cancelled) return;
        const url = URL.createObjectURL(res.data);
        setPdfUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError('Không thể tải PDF');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, current]);

  useEffect(() => {
    if (!open) {
      setIndex(0);
      setPdfUrl('');
      setError('');
    }
  }, [open]);

  const handleDownload = () => {
    if (!pdfUrl || !current) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `${current.employee_name}_${current.template_name}.pdf`;
    a.click();
  };

  if (!open || contracts.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {current?.employee_name} — {current?.template_name}
            </h3>
            {contracts.length > 1 && (
              <span className="text-xs text-gray-500 shrink-0">
                {index + 1} / {contracts.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {contracts.length > 1 && (
              <>
                <button
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                  className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-30 hover:bg-gray-100 rounded"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIndex((i) => Math.min(contracts.length - 1, i + 1))}
                  disabled={index === contracts.length - 1}
                  className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-30 hover:bg-gray-100 rounded"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </>
            )}
            {pdfUrl && !loading && (
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Tải PDF
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-200 relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
              <ArrowPathIcon className="w-10 h-10 animate-spin mb-3" />
              <p className="text-sm">Đang tải PDF...</p>
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded max-w-lg text-sm">
                <p className="font-semibold mb-1">Không thể tải bản xem trước</p>
                <p>{error}</p>
              </div>
            </div>
          )}
          {pdfUrl && !loading && !error && (
            <iframe src={pdfUrl} title="PDF Preview" className="absolute inset-0 w-full h-full border-0" />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MultiPdfPreviewModal;
