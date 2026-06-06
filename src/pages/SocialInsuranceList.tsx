import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheckIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { socialInsuranceAPI } from '../utils/api/hrm.api';
import { managementApi } from '../utils/api/client';
import type { SocialInsurance, SocialInsuranceCreateData, SocialInsuranceStatus } from '../utils/api/types';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { SelectBox } from '../components/LandingLayout/SelectBox';
import type { SelectOption } from '../components/LandingLayout/SelectBox';

const STATUS_OPTIONS: SelectOption<string>[] = [
  { value: '', label: 'Tất cả' },
  { value: 'ACTIVE', label: 'Đang tham gia' },
  { value: 'RESIGNED', label: 'Nghỉ việc' },
  { value: 'SUSPENDED', label: 'Tạm dừng' },
];

const STATUS_FORM_OPTIONS: SelectOption<SocialInsuranceStatus>[] = [
  { value: 'ACTIVE', label: 'Đang tham gia' },
  { value: 'RESIGNED', label: 'Nghỉ việc' },
  { value: 'SUSPENDED', label: 'Tạm dừng' },
];


// ── Status badge ──────────────────────────────────────────────
const StatusBadge: React.FC<{ status: SocialInsuranceStatus; label: string }> = ({ status, label }) => {
  const colors: Record<SocialInsuranceStatus, string> = {
    ACTIVE:    'bg-emerald-100 text-emerald-700',
    RESIGNED:  'bg-red-100 text-red-700',
    SUSPENDED: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {label}
    </span>
  );
};

// ── Format currency ───────────────────────────────────────────
const formatCurrency = (val: string | null) => {
  if (!val) return '—';
  return Number(val).toLocaleString('vi-VN') + ' ₫';
};
const formatDate = (val: string | null) => {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('vi-VN');
};

// ── Detail modal ──────────────────────────────────────────────
const DetailModal: React.FC<{
  item: SocialInsurance;
  onClose: () => void;
  onEdit: () => void;
}> = ({ item, onClose, onEdit }) => {
  const Row: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div className="flex items-baseline justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 shrink-0 mr-3">{label}</span>
      <span className={`text-sm text-right ${value ? 'font-medium text-gray-800' : 'text-gray-300 italic'}`}>
        {value || 'Chưa có'}
      </span>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
              <ShieldCheckIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900">{item.employee_name}</h2>
                <StatusBadge status={item.status} label={item.status_display} />
              </div>
              <p className="text-xs text-gray-400">{item.employee_code}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          <Row label="Mã nhân viên"     value={item.employee_code} />
          <Row label="Tên nhân viên"    value={item.employee_name} />
          <Row label="Số sổ BHXH"       value={item.insurance_book_number} />
          <Row label="Mã số BHXH"       value={item.insurance_number} />
          <Row label="Pháp nhân đóng BHXH" value={item.legal_entity} />
          <Row label="Ngày bắt đầu"     value={formatDate(item.start_date)} />
          <Row label="Ngày dừng"        value={formatDate(item.end_date)} />
          <Row label="Lương đóng BHXH"  value={formatCurrency(item.salary_base)} />
          <Row label="Tỷ lệ đóng (%)"   value={item.contribution_rate ? `${item.contribution_rate}%` : null} />
          <Row label="Ghi chú"          value={item.note} />
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary">Đóng</button>
          <button onClick={onEdit} className="btn-primary flex items-center gap-1.5">
            <PencilSquareIcon className="w-4 h-4" />
            Chỉnh sửa
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Field wrapper (must be outside FormModal to avoid remount on rerender) ──
const Field: React.FC<{ label: React.ReactNode; error?: string; children: React.ReactNode }> = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0" />{error}</p>}
  </div>
);

// ── Create / Edit modal ───────────────────────────────────────
const EMPTY_FORM: SocialInsuranceCreateData = {
  employee: '',
  insurance_book_number: '',
  insurance_number: '',
  legal_entity: '',
  start_date: '',
  end_date: '',
  salary_base: '',
  contribution_rate: '',
  status: 'ACTIVE',
  note: '',
};

// Format số thành "4.000.000", bỏ dot lấy raw "4000000"
const toVND = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
};
const fromVND = (display: string) => display.replace(/\./g, '').replace(/,/g, '');

const FormModal: React.FC<{
  initial?: SocialInsurance | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ initial, onClose, onSaved }) => {
  const initSalaryRaw = initial?.salary_base ?? '';
  const [form, setForm] = useState<SocialInsuranceCreateData>(
    initial
      ? {
          employee: initial.employee_code,
          insurance_book_number: initial.insurance_book_number ?? '',
          insurance_number: initial.insurance_number ?? '',
          legal_entity: initial.legal_entity ?? '',
          start_date: initial.start_date ?? '',
          end_date: initial.end_date ?? '',
          salary_base: initSalaryRaw,
          contribution_rate: initial.contribution_rate ?? '',
          status: initial.status,
          note: initial.note ?? '',
        }
      : EMPTY_FORM,
  );
  const [salaryDisplay, setSalaryDisplay] = useState(
    initSalaryRaw ? toVND(initSalaryRaw.replace(/\./g, '')) : ''
  );
  const [legalEntityOptions, setLegalEntityOptions] = useState<SelectOption<string>[]>([]);
  const [empSearch, setEmpSearch] = useState(
    initial ? `${initial.employee_code} — ${initial.employee_name}` : ''
  );
  const [empOptions, setEmpOptions] = useState<{ employee_id: string; full_name: string }[]>([]);
  const [showEmpDrop, setShowEmpDrop] = useState(false);
  const empRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    managementApi.get<{ value: string; label: string }[]>('/api/v1/salary/records/legal-entities/')
      .then(res => {
        setLegalEntityOptions(res.data.map(e => ({ value: e.value, label: e.label })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const trimmed = empSearch.trim();
    if (!trimmed || !!initial) { setEmpOptions([]); return; }
    const timer = setTimeout(() => {
      managementApi.get<{ results: { employee_id: string; full_name: string }[] }>(
        '/api-hrm/employees/', { params: { search: trimmed, page_size: 20 } }
      ).then(res => setEmpOptions(res.data.results)).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [empSearch, initial]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (empRef.current && !empRef.current.contains(e.target as Node)) setShowEmpDrop(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.employee.trim())          errs.employee        = 'Vui lòng chọn nhân viên';
    if (!form.insurance_number?.trim()) errs.insurance_number = 'Vui lòng nhập mã số BHXH';
    if (!form.legal_entity?.trim())     errs.legal_entity    = 'Vui lòng chọn pháp nhân';
    if (!form.start_date)               errs.start_date      = 'Vui lòng chọn ngày bắt đầu';
    if (!form.salary_base)              errs.salary_base     = 'Vui lòng nhập lương đóng BHXH';
    return errs;
  };

  const clearFieldError = (field: string) =>
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  const set = (field: keyof SocialInsuranceCreateData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = fromVND(e.target.value);
    setSalaryDisplay(toVND(raw));
    set('salary_base', raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    try {
      setSaving(true);
      setError(null);
      const payload: SocialInsuranceCreateData = {
        ...form,
        insurance_book_number: form.insurance_book_number || undefined,
        insurance_number: form.insurance_number || undefined,
        legal_entity: form.legal_entity || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        salary_base: form.salary_base || undefined,
        contribution_rate: form.contribution_rate || undefined,
        note: form.note || undefined,
      };
      if (initial) {
        await socialInsuranceAPI.update(initial.id, payload);
      } else {
        await socialInsuranceAPI.create(payload);
      }
      onSaved();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        const msg = Object.values(data).flat().join(' ');
        setError(msg || 'Lưu thất bại');
      } else {
        setError('Lưu thất bại');
      }
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
              <ShieldCheckIcon className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">
              {initial ? 'Chỉnh sửa BHXH' : 'Thêm BHXH'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto max-h-[65vh]">
          {error && (
            <div className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">{error}</div>
          )}

          <Field label={<>Mã nhân viên <span className="text-red-500">*</span></>} error={fieldErrors.employee}>
            {initial ? (
              <input type="text" value={empSearch} className="input-field bg-gray-50" disabled />
            ) : (
              <div ref={empRef} className="relative">
                <input
                  type="text"
                  value={empSearch}
                  onChange={e => { setEmpSearch(e.target.value); setShowEmpDrop(true); set('employee', ''); clearFieldError('employee'); }}
                  onFocus={() => setShowEmpDrop(true)}
                  className={`input-field w-full ${fieldErrors.employee ? 'border-red-400 focus:ring-red-300' : ''}`}
                  placeholder="Tìm mã hoặc tên nhân viên..."
                  autoComplete="off"
                />
                {showEmpDrop && empOptions.length > 0 && (
                  <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {empOptions.map(emp => (
                      <li
                        key={emp.employee_id}
                        className="px-3 py-2 cursor-pointer hover:bg-primary-50 text-sm flex items-center gap-2"
                        onMouseDown={() => {
                          set('employee', emp.employee_id);
                          setEmpSearch(`${emp.employee_id} — ${emp.full_name}`);
                          setShowEmpDrop(false);
                          setEmpOptions([]);
                          clearFieldError('employee');
                        }}
                      >
                        <span className="font-medium text-primary-700">{emp.employee_id}</span>
                        <span className="text-gray-500">{emp.full_name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Field>

          <Field label={<>Mã số BHXH <span className="text-red-500">*</span></>} error={fieldErrors.insurance_number}>
            <input
              type="text"
              value={form.insurance_number}
              onChange={e => { set('insurance_number', e.target.value); clearFieldError('insurance_number'); }}
              className={`input-field ${fieldErrors.insurance_number ? 'border-red-400 focus:ring-red-300' : ''}`}
              placeholder="Mã số..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <SelectBox
                label="Pháp nhân đóng BHXH *"
                value={form.legal_entity ?? ''}
                options={legalEntityOptions}
                placeholder="Chọn pháp nhân..."
                onChange={v => { set('legal_entity', v); clearFieldError('legal_entity'); }}
              />
              {fieldErrors.legal_entity && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0" />{fieldErrors.legal_entity}</p>}
            </div>
            <SelectBox
              label="Trạng thái"
              value={form.status}
              options={STATUS_FORM_OPTIONS}
              onChange={v => set('status', v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={<>Ngày bắt đầu <span className="text-red-500">*</span></>} error={fieldErrors.start_date}>
              <input
                type="date"
                value={form.start_date}
                onChange={e => { set('start_date', e.target.value); clearFieldError('start_date'); }}
                className={`input-field ${fieldErrors.start_date ? 'border-red-400 focus:ring-red-300' : ''}`}
              />
            </Field>
            <Field label="Ngày dừng">
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className="input-field" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={<>Lương đóng BHXH (₫) <span className="text-red-500">*</span></>} error={fieldErrors.salary_base}>
              <input
                type="text"
                inputMode="numeric"
                value={salaryDisplay}
                onChange={e => { handleSalaryChange(e); clearFieldError('salary_base'); }}
                className={`input-field ${fieldErrors.salary_base ? 'border-red-400 focus:ring-red-300' : ''}`}
                placeholder="4.000.000"
              />
            </Field>
            <Field label="Tỷ lệ đóng (%)">
              <input type="number" value={form.contribution_rate} onChange={e => set('contribution_rate', e.target.value)} className="input-field" placeholder="0.00" step="0.01" min="0" max="100" />
            </Field>
          </div>

          <Field label="Ghi chú">
            <textarea value={form.note} onChange={e => set('note', e.target.value)} className="input-field" rows={2} placeholder="Ghi chú..." />
          </Field>
        </form>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>Hủy</button>
          <button
            type="button"
            onClick={handleSubmit as any}
            className="btn-primary flex items-center gap-1.5"
            disabled={saving}
          >
            {saving ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Đang lưu...</>
            ) : (
              <>{initial ? 'Cập nhật' : 'Thêm mới'}</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Import modal ──────────────────────────────────────────────
const TEMPLATE_COLUMNS = [
  'Mã nhân viên', 'Số sổ BHXH', 'Mã số BHXH', 'Pháp nhân đóng BHXH',
  'Ngày bắt đầu', 'Ngày dừng', 'Lương đóng BHXH', 'Tỷ lệ đóng (%)',
  'Trạng thái', 'Ghi chú',
];

const ImportModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [file, setFile]           = useState<File | null>(null);
  const [loading, setLoading]     = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [result, setResult]       = useState<{ created: number; updated: number; errors: any[] } | null>(null);
  const [error, setError]         = useState('');
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const downloadTemplate = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Mẫu import BHXH');

      sheet.columns = TEMPLATE_COLUMNS.map(h => ({ header: h, key: h, width: Math.max(h.length + 4, 18) }));

      const headerRow = sheet.getRow(1);
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
      headerRow.height = 36;

      sheet.addRow({
        'Mã nhân viên':         'AC00001',
        'Số sổ BHXH':           'SB-001',
        'Mã số BHXH':           '0123456789',
        'Pháp nhân đóng BHXH':  'Công ty TNHH Amcare',
        'Ngày bắt đầu':         '2023-01-01',
        'Ngày dừng':            '',
        'Lương đóng BHXH':      5000000,
        'Tỷ lệ đóng (%)':       8,
        'Trạng thái':           'Đang tham gia',
        'Ghi chú':              '',
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mau_import_bhxh.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError('Tải mẫu thất bại: ' + e.message);
    }
  };

  const handleFileSelect = (f: File) => {
    if (!f.name.endsWith('.xlsx')) { setError('Chỉ hỗ trợ file .xlsx'); return; }
    setError(''); setResult(null); setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await socialInsuranceAPI.importExcel(file);
      setResult(res);
      if (res.created > 0 || res.updated > 0) onSuccess();
    } catch (e: any) {
      setError('Import thất bại: ' + (e.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Import BHXH từ Excel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Step 1 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-900 mb-1">Bước 1: Tải file mẫu</p>
            <p className="text-xs text-blue-700 mb-3">Điền thông tin vào file mẫu đúng định dạng, sau đó upload lại.</p>
            <button onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
              <DocumentArrowDownIcon className="w-4 h-4" />
              Tải file mẫu (.xlsx)
            </button>
          </div>

          {/* Step 2 */}
          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">Bước 2: Upload file đã điền</p>
            {!file ? (
              <div
                onDrop={e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <CloudArrowUpIcon className={`w-10 h-10 mb-2 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                <p className="text-sm text-gray-700 font-medium">
                  <span className="text-blue-600">Nhấn để chọn file</span> hoặc kéo thả vào đây
                </p>
                <p className="text-xs text-gray-500 mt-1">Chỉ hỗ trợ .xlsx</p>
                <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
              </div>
            ) : (
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <div className="flex items-center gap-2 min-w-0">
                  <DocumentArrowDownIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-800 truncate">{file.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button onClick={() => { setFile(null); setResult(null); setError(''); }}
                  className="text-gray-400 hover:text-red-500 p-1 rounded ml-2 flex-shrink-0">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">{error}</p>}

          {result && (
            <div className={`rounded-xl p-4 border text-sm ${result.errors.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className="font-semibold text-gray-900 mb-1">Kết quả import</p>
              <p className="text-emerald-700">✓ Tạo mới: <strong>{result.created}</strong> bản ghi</p>
              <p className="text-blue-700">↻ Cập nhật: <strong>{result.updated}</strong> bản ghi</p>
              {result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-700 font-medium">✗ Lỗi: {result.errors.length} dòng</p>
                  <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <li key={i} className="text-xs text-red-600">Dòng {e.row} [{e.employee}]: {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary">Đóng</button>
          <button onClick={handleImport} disabled={!file || loading}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-50">
            {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Đang import...</> : <>
              <ArrowUpTrayIcon className="w-4 h-4" />Import</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Main page ─────────────────────────────────────────────────
const PAGE_SIZE = 20;

const SocialInsuranceList: React.FC = () => {
  const [items, setItems]           = useState<SocialInsurance[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewItem, setViewItem]     = useState<SocialInsurance | null>(null);
  const [editItem, setEditItem]     = useState<SocialInsurance | null | undefined>(undefined);
  const [deleteItem, setDeleteItem] = useState<SocialInsurance | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [stats, setStats]           = useState({ total: 0, ACTIVE: 0, RESIGNED: 0, SUSPENDED: 0 });
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting]   = useState(false);

  const searchRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = async () => {
    try {
      const s = await socialInsuranceAPI.stats();
      setStats(s);
    } catch {}
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await socialInsuranceAPI.exportExcel({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bhxh-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Xuất file thất bại: ' + (e.message || 'Lỗi không xác định'));
    } finally {
      setExporting(false);
    }
  };

  const fetchItems = async (opts?: { search?: string; status?: string; page?: number }) => {
    try {
      setLoading(true);
      const res = await socialInsuranceAPI.list({
        search: opts?.search ?? search,
        status: (opts?.status ?? statusFilter) || undefined,
        page: opts?.page ?? page,
        page_size: PAGE_SIZE,
      });
      setItems(res.results);
      setTotal(res.count);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu BHXH');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); fetchStats(); }, []);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => { setPage(1); fetchItems({ search, status: statusFilter, page: 1 }); }, 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search, statusFilter]);

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      setDeleting(true);
      await socialInsuranceAPI.delete(deleteItem.id);
      setDeleteItem(null);
      fetchItems();
      fetchStats();
    } catch {
      setDeleteItem(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaved = () => {
    setEditItem(undefined);
    fetchItems();
    fetchStats();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const tableHeaders = ['Mã NV', 'Tên nhân viên', 'Mã số BHXH', 'Pháp nhân', 'Ngày bắt đầu', 'Ngày dừng', 'Lương đóng', 'Tỷ lệ đóng %', 'Trạng thái', 'Ghi chú', 'Thao tác'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Quản lý BHXH</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý thông tin bảo hiểm xã hội của nhân viên.</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-primary-500 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('')}
        >
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Tổng số</p>
          <p className="text-2xl font-extrabold text-primary-600 mt-1">{stats.total}</p>
        </div>
        <div
          className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-emerald-500 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('ACTIVE')}
        >
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Đang tham gia</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.ACTIVE}</p>
        </div>
        <div
          className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-red-500 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('RESIGNED')}
        >
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Nghỉ việc</p>
          <p className="text-2xl font-extrabold text-red-600 mt-1">{stats.RESIGNED}</p>
        </div>
        <div
          className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-yellow-500 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('SUSPENDED')}
        >
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Tạm dừng</p>
          <p className="text-2xl font-extrabold text-yellow-600 mt-1">{stats.SUSPENDED}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {/* Filters */}
        <div className="mb-5 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-900">Tìm kiếm</h3>
            {loading && (
              <div className="flex items-center text-xs text-gray-400 gap-1.5">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600" />
                Đang tải...
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tìm kiếm nhân viên / mã số BHXH</label>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field"
                placeholder="Mã NV, tên, mã số BHXH, số sổ..."
              />
            </div>
            <SelectBox
              label="Trạng thái"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={v => setStatusFilter(v)}
              placeholder="Tất cả"
            />
          </div>
        </div>

        {/* List header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Danh sách BHXH</h2>
            <p className="text-xs text-gray-400 mt-0.5">Tổng số: {total} bản ghi</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 bg-white border border-emerald-300 rounded-xl hover:bg-emerald-50 transition-colors disabled:opacity-50"
            >
              {exporting
                ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600" />Đang xuất...</>
                : <><ArrowDownTrayIcon className="w-4 h-4" />Xuất Excel</>}
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Import Excel
            </button>
            <button className="btn-primary flex items-center gap-1.5" onClick={() => setEditItem(null)}>
              <PlusIcon className="w-4 h-4" />
              Thêm mới
            </button>
          </div>
        </div>

        {/* Table */}
        {error ? (
          <div className="text-center py-12">
            <div className="h-12 w-12 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ExclamationCircleIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-gray-900">Đã xảy ra lỗi</p>
            <p className="text-xs text-gray-400 mt-1">{error}</p>
            <button onClick={() => fetchItems()} className="btn-primary mt-4">Thử lại</button>
          </div>
        ) : loading && items.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <p className="mt-4 text-sm text-gray-500">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {tableHeaders.map(h => (
                      <th key={h} className="table-header whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={tableHeaders.length} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-12 w-12 bg-primary-100 text-primary-400 rounded-2xl flex items-center justify-center">
                            <ShieldCheckIcon className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-bold text-gray-900">Chưa có dữ liệu BHXH</p>
                          <p className="text-xs text-gray-400">Bấm "Thêm mới" để bắt đầu</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    items.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-cell font-medium text-primary-700">{item.employee_code}</td>
                        <td className="table-cell font-medium">{item.employee_name}</td>
                        <td className="table-cell">{item.insurance_number || '—'}</td>
                        <td className="table-cell max-w-[160px] truncate">{item.legal_entity || '—'}</td>
                        <td className="table-cell whitespace-nowrap">{formatDate(item.start_date)}</td>
                        <td className="table-cell whitespace-nowrap">{formatDate(item.end_date)}</td>
                        <td className="table-cell whitespace-nowrap">{formatCurrency(item.salary_base)}</td>
                        <td className="table-cell">{item.contribution_rate ? `${item.contribution_rate}%` : '—'}</td>
                        <td className="table-cell">
                          <StatusBadge status={item.status} label={item.status_display} />
                        </td>
                        <td className="table-cell max-w-[160px] truncate">{item.note || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setViewItem(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-600 bg-white border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                            >
                              <EyeIcon className="w-3.5 h-3.5" />
                              Xem
                            </button>
                            <button
                              onClick={() => setEditItem(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-600 bg-white border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                            >
                              <PencilSquareIcon className="w-3.5 h-3.5" />
                              Sửa
                            </button>
                            <button
                              onClick={() => setDeleteItem(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  itemsPerPage={PAGE_SIZE}
                  onPageChange={p => { setPage(p); fetchItems({ page: p }); }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      {viewItem && (
        <DetailModal
          item={viewItem}
          onClose={() => setViewItem(null)}
          onEdit={() => { setViewItem(null); setEditItem(viewItem); }}
        />
      )}

      {/* Form modal — editItem===null means "create", object means "edit", undefined means "closed" */}
      {editItem !== undefined && (
        <FormModal
          initial={editItem}
          onClose={() => setEditItem(undefined)}
          onSaved={handleSaved}
        />
      )}

      {/* Import modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { fetchItems(); fetchStats(); }}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteItem !== null}
        variant="danger"
        title="Xóa bản ghi BHXH"
        message={
          deleteItem
            ? `Bạn có chắc chắn muốn xóa bản ghi BHXH của "${deleteItem.employee_name}" (${deleteItem.employee_code})?`
            : ''
        }
        confirmLabel="Xóa"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteItem(null)}
      />
    </div>
  );
};

export default SocialInsuranceList;
