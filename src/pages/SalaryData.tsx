import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import {
  salaryService,
  type CommissionRecord,
  type BulkImportCommissionRecord,
  type PenaltyRecord,
  type BulkImportPenaltyRecord,
} from '../services/salary.service';
import { SelectBox } from '../components/LandingLayout/SelectBox';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedCommissionRow {
  employee_code: string;
  amount: number;
  rowIndex: number;
  parseError?: string;
}

interface ParsedPenaltyRow {
  employee_code: string;
  amount: number;
  reason: string;
  rowIndex: number;
  parseError?: string;
}

type TabKey = 'commission' | 'penalty';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'commission', label: 'Hoa Hồng',      icon: CurrencyDollarIcon },
  { key: 'penalty',   label: 'Phạt Biên Bản',  icon: ExclamationCircleIcon },
];

// ─── Constants ───────────────────────────────────────────────────────────────

const now = new Date();
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS  = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractCellNumber(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'object' && 'result' in (raw as object))
    return extractCellNumber((raw as { result: unknown }).result);
  if (typeof raw === 'string') {
    let s = raw.replace(/\s/g, '').trim();
    if (/^\d{1,3}(\.\d{3})+(,\d*)?$/.test(s)) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function extractCellString(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && 'result' in (raw as object))
    return extractCellString((raw as { result: unknown }).result);
  return String(raw).trim();
}

const fmtMoney = (v: number | string) => {
  const n = Number(v);
  return n ? n.toLocaleString('vi-VN') + ' ₫' : '—';
};

// ─── Component ───────────────────────────────────────────────────────────────

const SalaryData: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('commission');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());

  // ── Commission state ──
  const [commissionRecords,  setCommissionRecords]  = useState<CommissionRecord[]>([]);
  const [loadingCommission,  setLoadingCommission]  = useState(false);
  const [commissionLoaded,   setCommissionLoaded]   = useState(false);
  const [cParsedRows,        setCParsedRows]        = useState<ParsedCommissionRow[] | null>(null);
  const [cFile,              setCFile]              = useState<File | null>(null);
  const [cParsing,           setCParsing]           = useState(false);
  const [cParseError,        setCParseError]        = useState<string | null>(null);
  const [cImporting,         setCImporting]         = useState(false);
  const [cSearch,            setCSearch]            = useState('');
  const [cEditingId,         setCEditingId]         = useState<number | null>(null);
  const [cEditAmount,        setCEditAmount]        = useState('');
  const [cSaving,            setCSaving]            = useState(false);
  const [cDeletingId,        setCDeletingId]        = useState<number | null>(null);
  const [cDeleting,          setCDeleting]          = useState(false);
  const cFileRef = useRef<HTMLInputElement>(null);

  // ── Penalty state ──
  const [penaltyRecords,  setPenaltyRecords]  = useState<PenaltyRecord[]>([]);
  const [loadingPenalty,  setLoadingPenalty]  = useState(false);
  const [penaltyLoaded,   setPenaltyLoaded]   = useState(false);
  const [pParsedRows,     setPParsedRows]     = useState<ParsedPenaltyRow[] | null>(null);
  const [pFile,           setPFile]           = useState<File | null>(null);
  const [pParsing,        setPParsing]        = useState(false);
  const [pParseError,     setPParseError]     = useState<string | null>(null);
  const [pImporting,      setPImporting]      = useState(false);
  const [pSearch,         setPSearch]         = useState('');
  const [pEditingId,      setPEditingId]      = useState<number | null>(null);
  const [pEditValues,     setPEditValues]     = useState({ amount: '', reason: '' });
  const [pSaving,         setPSaving]         = useState(false);
  const [pDeletingId,     setPDeletingId]     = useState<number | null>(null);
  const [pDeleting,       setPDeleting]       = useState(false);
  const pFileRef = useRef<HTMLInputElement>(null);

  // ── Shared toasts ──
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  // ─── Load functions ────────────────────────────────────────────────────────

  const loadCommissions = useCallback(async (month = selectedMonth, year = selectedYear) => {
    setLoadingCommission(true);
    setCommissionLoaded(false);
    try {
      const data = await salaryService.listCommissions({ year, month });
      setCommissionRecords(data);
      setCommissionLoaded(true);
    } catch {
      setErrorMsg('Không thể tải danh sách hoa hồng.');
    } finally {
      setLoadingCommission(false);
    }
  }, [selectedMonth, selectedYear]);

  const loadPenalties = useCallback(async (month = selectedMonth, year = selectedYear) => {
    setLoadingPenalty(true);
    setPenaltyLoaded(false);
    try {
      const data = await salaryService.listPenalties({ year, month });
      setPenaltyRecords(data);
      setPenaltyLoaded(true);
    } catch {
      setErrorMsg('Không thể tải danh sách phạt biên bản.');
    } finally {
      setLoadingPenalty(false);
    }
  }, [selectedMonth, selectedYear]);

  // Auto-load khi đổi tab / tháng / năm
  useEffect(() => {
    if (activeTab === 'commission') loadCommissions(selectedMonth, selectedYear);
    else loadPenalties(selectedMonth, selectedYear);
  }, [activeTab, selectedMonth, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Month/Year handlers ───────────────────────────────────────────────────

  const handleMonthChange = (v: number) => {
    setSelectedMonth(v);
    setCParsedRows(null); setCFile(null); if (cFileRef.current) cFileRef.current.value = '';
    setPParsedRows(null); setPFile(null); if (pFileRef.current) pFileRef.current.value = '';
  };
  const handleYearChange = (v: number) => {
    setSelectedYear(v);
    setCParsedRows(null); setCFile(null); if (cFileRef.current) cFileRef.current.value = '';
    setPParsedRows(null); setPFile(null); if (pFileRef.current) pFileRef.current.value = '';
  };

  // ─── Commission: template ──────────────────────────────────────────────────

  const handleDownloadCommissionTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Hoa Hồng');
    ws.columns = [
      { header: 'Mã nhân viên',   key: 'employee_code',    width: 20 },
      { header: 'Lương hoa hồng', key: 'commission_amount', width: 22 },
    ];
    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 28;
    ws.addRow({ employee_code: 'NV001', commission_amount: 5000000 });
    ws.addRow({ employee_code: 'NV002', commission_amount: 3000000 });
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url; a.download = `template_hoa_hong_T${selectedMonth}_${selectedYear}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Commission: parse Excel ───────────────────────────────────────────────

  const handleCommissionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.match(/\.xlsx$/i)) { setCParseError('Chỉ chấp nhận file Excel (.xlsx)'); return; }
    setCFile(f); setCParseError(null); setCParsedRows(null); setSuccessMsg(null); setErrorMsg(null); setCParsing(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await f.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) { setCParseError('File không có sheet nào.'); return; }
      const rows: ParsedCommissionRow[] = [];
      ws.eachRow((row, idx) => {
        if (idx === 1) return;
        const code = row.getCell(1).value != null ? String(row.getCell(1).value).trim() : '';
        if (!code) return;
        const amount = extractCellNumber(row.getCell(2).value);
        rows.push({ employee_code: code, amount, rowIndex: idx, parseError: amount < 0 ? 'Số tiền không hợp lệ' : undefined });
      });
      if (!rows.length) { setCParseError('File không có dữ liệu.'); return; }
      setCParsedRows(rows);
    } catch { setCParseError('Không thể đọc file.'); }
    finally { setCParsing(false); }
  };

  // ─── Commission: import ────────────────────────────────────────────────────

  const handleCommissionImport = async () => {
    if (!cParsedRows) return;
    const valid = cParsedRows.filter((r) => !r.parseError);
    if (!valid.length) return;
    setCImporting(true);
    try {
      const records: BulkImportCommissionRecord[] = valid.map((r) => ({ employee_code: r.employee_code, commission_amount: r.amount }));
      const res = await salaryService.bulkImportCommissions({ year: selectedYear, month: selectedMonth, records });
      if (res.success.length > 0) setSuccessMsg(`Import thành công ${res.success.length} hoa hồng.`);
      if (res.errors.length > 0)  setErrorMsg(`${res.errors.length} dòng lỗi: ${res.errors.map((e) => e.employee_code).join(', ')}`);
      setCParsedRows(null); setCFile(null); if (cFileRef.current) cFileRef.current.value = '';
      await loadCommissions();
    } catch { setErrorMsg('Lỗi kết nối máy chủ.'); }
    finally { setCImporting(false); }
  };

  // ─── Commission: edit/delete ───────────────────────────────────────────────

  const startCEdit = (rec: CommissionRecord) => { setCEditingId(rec.id); setCEditAmount(String(Number(rec.amount))); setCDeletingId(null); };
  const cancelCEdit = () => setCEditingId(null);

  const handleCSave = async (id: number) => {
    const amount = parseFloat(cEditAmount.replace(/,/g, '')) || 0;
    setCSaving(true);
    try {
      const updated = await salaryService.updateCommission(id, { amount });
      setCommissionRecords((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      setCEditingId(null); setSuccessMsg('Đã cập nhật hoa hồng.');
    } catch { setErrorMsg('Không thể cập nhật.'); }
    finally { setCSaving(false); }
  };

  const handleCDelete = async (id: number) => {
    setCDeleting(true);
    try {
      await salaryService.deleteCommission(id);
      setCommissionRecords((prev) => prev.filter((r) => r.id !== id));
      setCDeletingId(null); setSuccessMsg('Đã xoá hoa hồng.');
    } catch { setErrorMsg('Không thể xoá.'); }
    finally { setCDeleting(false); }
  };

  // ─── Penalty: template ─────────────────────────────────────────────────────

  const handleDownloadPenaltyTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Phạt Biên Bản');
    ws.columns = [
      { header: 'Mã nhân viên',  key: 'employee_code', width: 20 },
      { header: 'Số tiền phạt',  key: 'amount',        width: 20 },
      { header: 'Lý do vi phạm', key: 'reason',        width: 40 },
    ];
    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD93D1A' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 28;
    ws.addRow({ employee_code: 'NV001', amount: 500000, reason: 'Đi muộn 3 lần' });
    ws.addRow({ employee_code: 'NV002', amount: 200000, reason: 'Không đeo đồng phục' });
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url; a.download = `template_phat_bien_ban_T${selectedMonth}_${selectedYear}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Penalty: parse Excel ──────────────────────────────────────────────────

  const handlePenaltyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.match(/\.xlsx$/i)) { setPParseError('Chỉ chấp nhận file Excel (.xlsx)'); return; }
    setPFile(f); setPParseError(null); setPParsedRows(null); setSuccessMsg(null); setErrorMsg(null); setPParsing(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await f.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) { setPParseError('File không có sheet nào.'); return; }
      const rows: ParsedPenaltyRow[] = [];
      ws.eachRow((row, idx) => {
        if (idx === 1) return;
        const code = row.getCell(1).value != null ? String(row.getCell(1).value).trim() : '';
        if (!code) return;
        const amount = extractCellNumber(row.getCell(2).value);
        const reason = extractCellString(row.getCell(3).value);
        rows.push({ employee_code: code, amount, reason, rowIndex: idx, parseError: amount < 0 ? 'Số tiền không hợp lệ' : undefined });
      });
      if (!rows.length) { setPParseError('File không có dữ liệu.'); return; }
      setPParsedRows(rows);
    } catch { setPParseError('Không thể đọc file.'); }
    finally { setPParsing(false); }
  };

  // ─── Penalty: import ───────────────────────────────────────────────────────

  const handlePenaltyImport = async () => {
    if (!pParsedRows) return;
    const valid = pParsedRows.filter((r) => !r.parseError);
    if (!valid.length) return;
    setPImporting(true);
    try {
      const records: BulkImportPenaltyRecord[] = valid.map((r) => ({ employee_code: r.employee_code, amount: r.amount, reason: r.reason }));
      const res = await salaryService.bulkImportPenalties({ year: selectedYear, month: selectedMonth, records });
      if (res.success.length > 0) setSuccessMsg(`Import thành công ${res.success.length} bản ghi phạt.`);
      if (res.errors.length > 0)  setErrorMsg(`${res.errors.length} dòng lỗi: ${res.errors.map((e) => e.employee_code).join(', ')}`);
      setPParsedRows(null); setPFile(null); if (pFileRef.current) pFileRef.current.value = '';
      await loadPenalties();
    } catch { setErrorMsg('Lỗi kết nối máy chủ.'); }
    finally { setPImporting(false); }
  };

  // ─── Penalty: edit/delete ──────────────────────────────────────────────────

  const startPEdit = (rec: PenaltyRecord) => { setPEditingId(rec.id); setPEditValues({ amount: String(Number(rec.amount)), reason: rec.reason }); setPDeletingId(null); };
  const cancelPEdit = () => setPEditingId(null);

  const handlePSave = async (id: number) => {
    const amount = parseFloat(pEditValues.amount.replace(/,/g, '')) || 0;
    setPSaving(true);
    try {
      const updated = await salaryService.updatePenalty(id, { amount, reason: pEditValues.reason });
      setPenaltyRecords((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      setPEditingId(null); setSuccessMsg('Đã cập nhật phạt biên bản.');
    } catch { setErrorMsg('Không thể cập nhật.'); }
    finally { setPSaving(false); }
  };

  const handlePDelete = async (id: number) => {
    setPDeleting(true);
    try {
      await salaryService.deletePenalty(id);
      setPenaltyRecords((prev) => prev.filter((r) => r.id !== id));
      setPDeletingId(null); setSuccessMsg('Đã xoá phạt biên bản.');
    } catch { setErrorMsg('Không thể xoá.'); }
    finally { setPDeleting(false); }
  };

  // ─── Derived ──────────────────────────────────────────────────────────────

  const filteredCommissions = commissionRecords.filter((r) =>
    !cSearch || r.employee_code.toLowerCase().includes(cSearch.toLowerCase()) || r.employee_name.toLowerCase().includes(cSearch.toLowerCase())
  );
  const filteredPenalties = penaltyRecords.filter((r) =>
    !pSearch || r.employee_code.toLowerCase().includes(pSearch.toLowerCase()) || r.employee_name.toLowerCase().includes(pSearch.toLowerCase())
  );

  // ─── Render helpers ────────────────────────────────────────────────────────

  const renderLoading = (color = 'primary') => (
    <div className="flex items-center justify-center py-16">
      <ArrowPathIcon className={`h-6 w-6 text-${color}-400 animate-spin`} />
      <span className="ml-2 text-sm text-gray-500">Đang tải...</span>
    </div>
  );

  const renderEmpty = (msg: string) => (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <UserIcon className="h-10 w-10 mb-2" />
      <p className="text-sm">{msg}</p>
    </div>
  );

  const renderAvatar = (name: string, colorClass: string) => (
    <div className={`h-8 w-8 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0`}>
      <span className="text-xs font-semibold">{name?.charAt(0).toUpperCase()}</span>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dữ liệu</h1>
        <p className="text-gray-600 mt-2">Quản lý lương hoa hồng và phạt biên bản theo tháng/năm.</p>
      </div>

      {/* Toasts */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          <CheckIcon className="h-4 w-4 flex-shrink-0" />{successMsg}
          <button className="ml-auto" onClick={() => setSuccessMsg(null)}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />{errorMsg}
          <button className="ml-auto" onClick={() => setErrorMsg(null)}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
          <div className="w-32">
            <SelectBox<number> label="Tháng" value={selectedMonth} options={MONTHS.map((m) => ({ value: m, label: `Tháng ${m}` }))} onChange={handleMonthChange} />
          </div>
          <div className="w-24">
            <SelectBox<number> label="Năm" value={selectedYear} options={YEARS.map((y) => ({ value: y, label: String(y) }))} onChange={handleYearChange} />
          </div>
          <button
            onClick={() => activeTab === 'commission' ? loadCommissions() : loadPenalties()}
            disabled={loadingCommission || loadingPenalty}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 ${(loadingCommission || loadingPenalty) ? 'animate-spin' : ''}`} />
            Tải dữ liệu
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setSuccessMsg(null); setErrorMsg(null); }}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 space-y-4">

          {/* ═══ TAB HOA HỒNG ═══ */}
          {activeTab === 'commission' && (
            <>
              {/* Action bar */}
              <div className="flex flex-wrap gap-3 items-center">
                <button onClick={handleDownloadCommissionTemplate} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                  <ArrowDownTrayIcon className="h-4 w-4" />Tải file mẫu
                </button>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-primary-300 text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100 cursor-pointer transition-colors">
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {cFile ? cFile.name : 'Chọn file Excel'}
                  <input ref={cFileRef} type="file" accept=".xlsx" className="hidden" onChange={handleCommissionFileChange} />
                </label>
                {cParsedRows && cParsedRows.filter((r) => !r.parseError).length > 0 && (
                  <button onClick={handleCommissionImport} disabled={cImporting} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-60 transition-colors">
                    {cImporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                    {cImporting ? 'Đang import...' : `Xác nhận import (${cParsedRows.filter((r) => !r.parseError).length})`}
                  </button>
                )}
                {commissionLoaded && (
                  <div className="flex-1 relative min-w-48">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Tìm nhân viên..." value={cSearch} onChange={(e) => setCSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                )}
              </div>
              {cParseError && <p className="flex items-center gap-1 text-sm text-red-600"><ExclamationCircleIcon className="h-4 w-4" />{cParseError}</p>}

              {/* Preview */}
              {cParsedRows && !cParsing && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Xem trước — {cParsedRows.length} dòng
                      {cParsedRows.filter((r) => r.parseError).length > 0 && <span className="text-red-500"> · {cParsedRows.filter((r) => r.parseError).length} lỗi</span>}
                    </span>
                    <span className="text-gray-500">Tháng {selectedMonth}/{selectedYear}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NV</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Lương hoa hồng</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {cParsedRows.map((row, i) => (
                          <tr key={row.rowIndex} className={row.parseError ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-2 font-mono font-medium text-gray-800">{row.employee_code}</td>
                            <td className="px-4 py-2 text-right text-gray-700">{row.amount > 0 ? row.amount.toLocaleString('vi-VN') + ' ₫' : '—'}</td>
                            <td className="px-4 py-2">
                              {row.parseError
                                ? <span className="inline-flex items-center gap-1 text-xs text-red-600"><ExclamationCircleIcon className="h-3.5 w-3.5" />{row.parseError}</span>
                                : <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckIcon className="h-3.5 w-3.5" />Hợp lệ</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Commission list */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    Danh sách hoa hồng — Tháng {selectedMonth}/{selectedYear}
                    <span className="ml-2 font-normal text-gray-500">{filteredCommissions.length} nhân viên</span>
                  </p>
                </div>
                {loadingCommission ? renderLoading('primary') :
                 filteredCommissions.length === 0 ? renderEmpty(commissionRecords.length === 0 ? 'Chưa có dữ liệu hoa hồng tháng này.' : 'Không tìm thấy nhân viên.') : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Lương hoa hồng</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredCommissions.map((rec, i) => {
                          const isEditing  = cEditingId  === rec.id;
                          const isDeleting = cDeletingId === rec.id;
                          return (
                            <tr key={rec.id} className={isDeleting ? 'bg-red-50' : 'hover:bg-gray-50 transition-colors'}>
                              <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {renderAvatar(rec.employee_name, 'bg-primary-50 text-primary-700')}
                                  <div><p className="font-medium text-gray-900">{rec.employee_name}</p><p className="text-xs text-gray-500 font-mono">{rec.employee_code}</p></div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <input type="text" value={cEditAmount} onChange={(e) => setCEditAmount(e.target.value)}
                                    className="w-36 text-right border border-primary-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0" />
                                ) : (
                                  <span className="font-medium text-gray-700">{fmtMoney(rec.amount)}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isDeleting ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-xs text-red-600">Xác nhận xoá?</span>
                                    <button onClick={() => handleCDelete(rec.id)} disabled={cDeleting} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60">
                                      {cDeleting ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Xoá
                                    </button>
                                    <button onClick={() => setCDeletingId(null)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleCSave(rec.id)} disabled={cSaving} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-60">
                                      {cSaving ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Lưu
                                    </button>
                                    <button onClick={cancelCEdit} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => startCEdit(rec)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-md hover:bg-primary-100 transition-colors">
                                      <PencilIcon className="h-3.5 w-3.5" />Sửa
                                    </button>
                                    <button onClick={() => { setCDeletingId(rec.id); setCEditingId(null); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors">
                                      <TrashIcon className="h-3.5 w-3.5" />Xoá
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══ TAB PHẠT BIÊN BẢN ═══ */}
          {activeTab === 'penalty' && (
            <>
              {/* Action bar */}
              <div className="flex flex-wrap gap-3 items-center">
                <button onClick={handleDownloadPenaltyTemplate} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                  <ArrowDownTrayIcon className="h-4 w-4" />Tải file mẫu
                </button>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-red-300 text-red-700 bg-red-50 rounded-md hover:bg-red-100 cursor-pointer transition-colors">
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {pFile ? pFile.name : 'Chọn file Excel'}
                  <input ref={pFileRef} type="file" accept=".xlsx" className="hidden" onChange={handlePenaltyFileChange} />
                </label>
                {pParsedRows && pParsedRows.filter((r) => !r.parseError).length > 0 && (
                  <button onClick={handlePenaltyImport} disabled={pImporting} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60 transition-colors">
                    {pImporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                    {pImporting ? 'Đang import...' : `Xác nhận import (${pParsedRows.filter((r) => !r.parseError).length})`}
                  </button>
                )}
                {penaltyLoaded && (
                  <div className="flex-1 relative min-w-48">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Tìm nhân viên..." value={pSearch} onChange={(e) => setPSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                )}
              </div>
              {pParseError && <p className="flex items-center gap-1 text-sm text-red-600"><ExclamationCircleIcon className="h-4 w-4" />{pParseError}</p>}

              {/* Preview */}
              {pParsedRows && !pParsing && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Xem trước — {pParsedRows.length} dòng
                      {pParsedRows.filter((r) => r.parseError).length > 0 && <span className="text-red-500"> · {pParsedRows.filter((r) => r.parseError).length} lỗi</span>}
                    </span>
                    <span className="text-gray-500">Tháng {selectedMonth}/{selectedYear}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NV</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền phạt</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lý do</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {pParsedRows.map((row, i) => (
                          <tr key={row.rowIndex} className={row.parseError ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-2 font-mono font-medium text-gray-800">{row.employee_code}</td>
                            <td className="px-4 py-2 text-right text-red-600 font-medium">{row.amount > 0 ? row.amount.toLocaleString('vi-VN') + ' ₫' : '—'}</td>
                            <td className="px-4 py-2 text-gray-600 max-w-xs truncate">{row.reason || '—'}</td>
                            <td className="px-4 py-2">
                              {row.parseError
                                ? <span className="inline-flex items-center gap-1 text-xs text-red-600"><ExclamationCircleIcon className="h-3.5 w-3.5" />{row.parseError}</span>
                                : <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckIcon className="h-3.5 w-3.5" />Hợp lệ</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Penalty list */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    Danh sách phạt biên bản — Tháng {selectedMonth}/{selectedYear}
                    <span className="ml-2 font-normal text-gray-500">{filteredPenalties.length} bản ghi</span>
                  </p>
                </div>
                {loadingPenalty ? renderLoading('red') :
                 filteredPenalties.length === 0 ? renderEmpty(penaltyRecords.length === 0 ? 'Chưa có bản ghi phạt nào tháng này.' : 'Không tìm thấy nhân viên.') : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền phạt</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lý do vi phạm</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredPenalties.map((rec, i) => {
                          const isEditing  = pEditingId  === rec.id;
                          const isDeleting = pDeletingId === rec.id;
                          return (
                            <tr key={rec.id} className={isDeleting ? 'bg-red-50' : 'hover:bg-gray-50 transition-colors'}>
                              <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {renderAvatar(rec.employee_name, 'bg-red-50 text-red-700')}
                                  <div><p className="font-medium text-gray-900">{rec.employee_name}</p><p className="text-xs text-gray-500 font-mono">{rec.employee_code}</p></div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <input type="text" value={pEditValues.amount} onChange={(e) => setPEditValues((v) => ({ ...v, amount: e.target.value }))}
                                    className="w-36 text-right border border-red-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" placeholder="0" />
                                ) : (
                                  <span className="font-medium text-red-600">{fmtMoney(rec.amount)}</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input type="text" value={pEditValues.reason} onChange={(e) => setPEditValues((v) => ({ ...v, reason: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Lý do vi phạm..." />
                                ) : (
                                  <span className="text-gray-700">{rec.reason || '—'}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isDeleting ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-xs text-red-600">Xác nhận xoá?</span>
                                    <button onClick={() => handlePDelete(rec.id)} disabled={pDeleting} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60">
                                      {pDeleting ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Xoá
                                    </button>
                                    <button onClick={() => setPDeletingId(null)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handlePSave(rec.id)} disabled={pSaving} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-60">
                                      {pSaving ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Lưu
                                    </button>
                                    <button onClick={cancelPEdit} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => startPEdit(rec)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-md hover:bg-primary-100 transition-colors">
                                      <PencilIcon className="h-3.5 w-3.5" />Sửa
                                    </button>
                                    <button onClick={() => { setPDeletingId(rec.id); setPEditingId(null); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors">
                                      <TrashIcon className="h-3.5 w-3.5" />Xoá
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalaryData;
