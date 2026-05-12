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
  type AdvanceRecord,
  type BulkImportAdvanceRecord,
  type OtherAllowanceRecord,
  type BulkImportOtherAllowanceRecord,
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

interface ParsedAdvanceRow {
  employee_code: string;
  amount: number;
  rowIndex: number;
  parseError?: string;
}

interface ParsedOtherAllowanceRow {
  employee_code: string;
  amount: number;
  description: string;
  rowIndex: number;
  parseError?: string;
}

type TabKey = 'commission' | 'penalty' | 'advance' | 'other_allowance';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'commission',      label: 'Hoa Hồng',      icon: CurrencyDollarIcon },
  { key: 'penalty',         label: 'Phạt Biên Bản', icon: ExclamationCircleIcon },
  { key: 'advance',         label: 'Tạm Ứng Lương', icon: CurrencyDollarIcon },
  { key: 'other_allowance', label: 'Phụ Cấp Khác',  icon: CurrencyDollarIcon },
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
  const defaultMonth = now.getDate() >= 15 ? now.getMonth() + 1 : now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultYear  = now.getDate() < 15 && now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear,  setSelectedYear]  = useState(defaultYear);

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

  // ── OtherAllowance state ──
  const [oRecords,    setORecords]    = useState<OtherAllowanceRecord[]>([]);
  const [loadingO,    setLoadingO]    = useState(false);
  const [oLoaded,     setOLoaded]     = useState(false);
  const [oParsedRows, setOParsedRows] = useState<ParsedOtherAllowanceRow[] | null>(null);
  const [oFile,       setOFile]       = useState<File | null>(null);
  const [oParsing,    setOParsing]    = useState(false);
  const [oParseError, setOParseError] = useState<string | null>(null);
  const [oImporting,  setOImporting]  = useState(false);
  const [oSearch,     setOSearch]     = useState('');
  const [oEditingId,  setOEditingId]  = useState<number | null>(null);
  const [oEditValues, setOEditValues] = useState({ amount: '', description: '' });
  const [oSaving,     setOSaving]     = useState(false);
  const [oDeletingId, setODeletingId] = useState<number | null>(null);
  const [oDeleting,   setODeleting]   = useState(false);
  const oFileRef = useRef<HTMLInputElement>(null);

  // ── Advance state ──
  const [advanceRecords,  setAdvanceRecords]  = useState<AdvanceRecord[]>([]);
  const [loadingAdvance,  setLoadingAdvance]  = useState(false);
  const [advanceLoaded,   setAdvanceLoaded]   = useState(false);
  const [aParsedRows,     setAParsedRows]     = useState<ParsedAdvanceRow[] | null>(null);
  const [aFile,           setAFile]           = useState<File | null>(null);
  const [aParsing,        setAParsing]        = useState(false);
  const [aParseError,     setAParseError]     = useState<string | null>(null);
  const [aImporting,      setAImporting]      = useState(false);
  const [aSearch,         setASearch]         = useState('');
  const [aEditingId,      setAEditingId]      = useState<number | null>(null);
  const [aEditAmount,     setAEditAmount]     = useState('');
  const [aSaving,         setASaving]         = useState(false);
  const [aDeletingId,     setADeletingId]     = useState<number | null>(null);
  const [aDeleting,       setADeleting]       = useState(false);
  const aFileRef = useRef<HTMLInputElement>(null);

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

  // ── Per-tab import errors (detailed) ──
  const [cImportErr, setCImportErr] = useState<{ errors: {employee_code:string;error:string}[]; failedRows: ParsedCommissionRow[] } | null>(null);
  const [pImportErr, setPImportErr] = useState<{ errors: {employee_code:string;error:string}[]; failedRows: ParsedPenaltyRow[] } | null>(null);
  const [aImportErr, setAImportErr] = useState<{ errors: {employee_code:string;error:string}[]; failedRows: ParsedAdvanceRow[] } | null>(null);
  const [oImportErr, setOImportErr] = useState<{ errors: {employee_code:string;error:string}[]; failedRows: ParsedOtherAllowanceRow[] } | null>(null);

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

  const loadOtherAllowances = useCallback(async (month = selectedMonth, year = selectedYear) => {
    setLoadingO(true);
    setOLoaded(false);
    try {
      const data = await salaryService.listOtherAllowances({ year, month });
      setORecords(data);
      setOLoaded(true);
    } catch {
      setErrorMsg('Không thể tải danh sách phụ cấp khác.');
    } finally {
      setLoadingO(false);
    }
  }, [selectedMonth, selectedYear]);

  const loadAdvances = useCallback(async (month = selectedMonth, year = selectedYear) => {
    setLoadingAdvance(true);
    setAdvanceLoaded(false);
    try {
      const data = await salaryService.listAdvances({ year, month });
      setAdvanceRecords(data);
      setAdvanceLoaded(true);
    } catch {
      setErrorMsg('Không thể tải danh sách tạm ứng.');
    } finally {
      setLoadingAdvance(false);
    }
  }, [selectedMonth, selectedYear]);

  // Auto-load khi đổi tab / tháng / năm
  useEffect(() => {
    if (activeTab === 'commission') loadCommissions(selectedMonth, selectedYear);
    else if (activeTab === 'penalty') loadPenalties(selectedMonth, selectedYear);
    else if (activeTab === 'advance') loadAdvances(selectedMonth, selectedYear);
    else loadOtherAllowances(selectedMonth, selectedYear);
  }, [activeTab, selectedMonth, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Month/Year handlers ───────────────────────────────────────────────────

  const clearImportState = () => {
    setCParsedRows(null); setCFile(null); setCImportErr(null); if (cFileRef.current) cFileRef.current.value = '';
    setPParsedRows(null); setPFile(null); setPImportErr(null); if (pFileRef.current) pFileRef.current.value = '';
    setAParsedRows(null); setAFile(null); setAImportErr(null); if (aFileRef.current) aFileRef.current.value = '';
    setOParsedRows(null); setOFile(null); setOImportErr(null); if (oFileRef.current) oFileRef.current.value = '';
  };

  const handleMonthChange = (v: number) => { setSelectedMonth(v); clearImportState(); };
  const handleYearChange  = (v: number) => { setSelectedYear(v);  clearImportState(); };

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
      if (res.errors.length > 0) {
        const errorCodes = new Set(res.errors.map((e) => e.employee_code));
        const failedRows = (cParsedRows ?? []).filter((r) => errorCodes.has(r.employee_code));
        setCImportErr({ errors: res.errors, failedRows });
      }
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
      if (res.errors.length > 0) {
        const errorCodes = new Set(res.errors.map((e) => e.employee_code));
        const failedRows = (pParsedRows ?? []).filter((r) => errorCodes.has(r.employee_code));
        setPImportErr({ errors: res.errors, failedRows });
      }
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

  // ─── Advance: template ─────────────────────────────────────────────────────

  const handleDownloadAdvanceTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Tạm Ứng Lương');
    ws.columns = [
      { header: 'Mã nhân viên',     key: 'employee_code', width: 20 },
      { header: 'Số tiền tạm ứng',  key: 'amount',        width: 22 },
    ];
    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7490' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 28;
    ws.addRow({ employee_code: 'NV001', amount: 3000000 });
    ws.addRow({ employee_code: 'NV002', amount: 5000000 });
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url; a.download = `template_tam_ung_T${selectedMonth}_${selectedYear}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Advance: parse Excel ──────────────────────────────────────────────────

  const handleAdvanceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.match(/\.xlsx$/i)) { setAParseError('Chỉ chấp nhận file Excel (.xlsx)'); return; }
    setAFile(f); setAParseError(null); setAParsedRows(null); setSuccessMsg(null); setErrorMsg(null); setAParsing(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await f.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) { setAParseError('File không có sheet nào.'); return; }
      const rows: ParsedAdvanceRow[] = [];
      ws.eachRow((row, idx) => {
        if (idx === 1) return;
        const code = row.getCell(1).value != null ? String(row.getCell(1).value).trim() : '';
        if (!code) return;
        const amount = extractCellNumber(row.getCell(2).value);
        rows.push({ employee_code: code, amount, rowIndex: idx, parseError: amount < 0 ? 'Số tiền không hợp lệ' : undefined });
      });
      if (!rows.length) { setAParseError('File không có dữ liệu.'); return; }
      setAParsedRows(rows);
    } catch { setAParseError('Không thể đọc file.'); }
    finally { setAParsing(false); }
  };

  // ─── Advance: import ───────────────────────────────────────────────────────

  const handleAdvanceImport = async () => {
    if (!aParsedRows) return;
    const valid = aParsedRows.filter((r) => !r.parseError);
    if (!valid.length) return;
    setAImporting(true);
    try {
      const records: BulkImportAdvanceRecord[] = valid.map((r) => ({ employee_code: r.employee_code, amount: r.amount }));
      const res = await salaryService.bulkImportAdvances({ year: selectedYear, month: selectedMonth, records });
      if (res.success.length > 0) setSuccessMsg(`Import thành công ${res.success.length} tạm ứng.`);
      if (res.errors.length > 0) {
        const errorCodes = new Set(res.errors.map((e) => e.employee_code));
        const failedRows = (aParsedRows ?? []).filter((r) => errorCodes.has(r.employee_code));
        setAImportErr({ errors: res.errors, failedRows });
      }
      setAParsedRows(null); setAFile(null); if (aFileRef.current) aFileRef.current.value = '';
      await loadAdvances();
    } catch { setErrorMsg('Lỗi kết nối máy chủ.'); }
    finally { setAImporting(false); }
  };

  // ─── Advance: edit/delete ──────────────────────────────────────────────────

  const startAEdit = (rec: AdvanceRecord) => { setAEditingId(rec.id); setAEditAmount(String(Number(rec.amount))); setADeletingId(null); };
  const cancelAEdit = () => setAEditingId(null);

  const handleASave = async (id: number) => {
    const amount = parseFloat(aEditAmount.replace(/,/g, '')) || 0;
    setASaving(true);
    try {
      const updated = await salaryService.updateAdvance(id, { amount });
      setAdvanceRecords((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      setAEditingId(null); setSuccessMsg('Đã cập nhật tạm ứng.');
    } catch { setErrorMsg('Không thể cập nhật.'); }
    finally { setASaving(false); }
  };

  const handleADelete = async (id: number) => {
    setADeleting(true);
    try {
      await salaryService.deleteAdvance(id);
      setAdvanceRecords((prev) => prev.filter((r) => r.id !== id));
      setADeletingId(null); setSuccessMsg('Đã xoá tạm ứng.');
    } catch { setErrorMsg('Không thể xoá.'); }
    finally { setADeleting(false); }
  };

  // ─── OtherAllowance: template ──────────────────────────────────────────────

  const handleDownloadOtherAllowanceTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Phụ Cấp Khác');
    ws.columns = [
      { header: 'Mã nhân viên',   key: 'employee_code', width: 20 },
      { header: 'Số tiền phụ cấp', key: 'amount',       width: 22 },
      { header: 'Mô tả phụ cấp',  key: 'description',   width: 30 },
    ];
    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 28;
    ws.addRow({ employee_code: 'NV001', amount: 200000, description: 'Phụ cấp điện thoại' });
    ws.addRow({ employee_code: 'NV002', amount: 500000, description: 'Phụ cấp xăng xe' });
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url; a.download = `template_phu_cap_khac_T${selectedMonth}_${selectedYear}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── OtherAllowance: parse Excel ──────────────────────────────────────────

  const handleOtherAllowanceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.match(/\.xlsx$/i)) { setOParseError('Chỉ chấp nhận file Excel (.xlsx)'); return; }
    setOFile(f); setOParseError(null); setOParsedRows(null); setSuccessMsg(null); setErrorMsg(null); setOParsing(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await f.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) { setOParseError('File không có sheet nào.'); return; }
      const rows: ParsedOtherAllowanceRow[] = [];
      ws.eachRow((row, idx) => {
        if (idx === 1) return;
        const code = row.getCell(1).value != null ? String(row.getCell(1).value).trim() : '';
        if (!code) return;
        const amount = extractCellNumber(row.getCell(2).value);
        const description = extractCellString(row.getCell(3).value);
        rows.push({ employee_code: code, amount, description, rowIndex: idx, parseError: amount < 0 ? 'Số tiền không hợp lệ' : undefined });
      });
      if (!rows.length) { setOParseError('File không có dữ liệu.'); return; }
      setOParsedRows(rows);
    } catch { setOParseError('Không thể đọc file.'); }
    finally { setOParsing(false); }
  };

  // ─── OtherAllowance: import ────────────────────────────────────────────────

  const handleOtherAllowanceImport = async () => {
    if (!oParsedRows) return;
    const valid = oParsedRows.filter((r) => !r.parseError);
    if (!valid.length) return;
    setOImporting(true);
    try {
      const records: BulkImportOtherAllowanceRecord[] = valid.map((r) => ({ employee_code: r.employee_code, amount: r.amount, description: r.description }));
      const res = await salaryService.bulkImportOtherAllowances({ year: selectedYear, month: selectedMonth, records });
      if (res.success.length > 0) setSuccessMsg(`Import thành công ${res.success.length} phụ cấp.`);
      if (res.errors.length > 0) {
        const errorCodes = new Set(res.errors.map((e) => e.employee_code));
        const failedRows = (oParsedRows ?? []).filter((r) => errorCodes.has(r.employee_code));
        setOImportErr({ errors: res.errors, failedRows });
      }
      setOParsedRows(null); setOFile(null); if (oFileRef.current) oFileRef.current.value = '';
      await loadOtherAllowances();
    } catch { setErrorMsg('Lỗi kết nối máy chủ.'); }
    finally { setOImporting(false); }
  };

  // ─── OtherAllowance: edit/delete ───────────────────────────────────────────

  const startOEdit = (rec: OtherAllowanceRecord) => { setOEditingId(rec.id); setOEditValues({ amount: String(Number(rec.amount)), description: rec.description }); setODeletingId(null); };
  const cancelOEdit = () => setOEditingId(null);

  const handleOSave = async (id: number) => {
    const amount = parseFloat(oEditValues.amount.replace(/,/g, '')) || 0;
    setOSaving(true);
    try {
      const updated = await salaryService.updateOtherAllowance(id, { amount, description: oEditValues.description });
      setORecords((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      setOEditingId(null); setSuccessMsg('Đã cập nhật phụ cấp.');
    } catch { setErrorMsg('Không thể cập nhật.'); }
    finally { setOSaving(false); }
  };

  const handleODelete = async (id: number) => {
    setODeleting(true);
    try {
      await salaryService.deleteOtherAllowance(id);
      setORecords((prev) => prev.filter((r) => r.id !== id));
      setODeletingId(null); setSuccessMsg('Đã xoá phụ cấp.');
    } catch { setErrorMsg('Không thể xoá.'); }
    finally { setODeleting(false); }
  };

  // ─── Export error helpers ─────────────────────────────────────────────────

  const buildErrorExcel = async (
    sheetName: string,
    headerColor: string,
    cols: { header: string; key: string; width: number }[],
    dataRows: (string | number)[][],
  ) => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName);
    ws.columns = cols;
    const borderStyle = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } };
    const allBorders = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
      cell.font      = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border    = allBorders;
    });
    ws.getRow(1).height = 28;
    dataRows.forEach((values, idx) => {
      const exRow = ws.getRow(idx + 2);
      values.forEach((v, ci) => {
        const cell = exRow.getCell(ci + 1);
        cell.value    = v as any;
        cell.border   = allBorders;
        cell.alignment = { vertical: 'middle' };
      });
      exRow.commit();
    });
    return wb;
  };

  const handleExportCommissionErrors = async () => {
    if (!cImportErr?.errors.length) return;
    const rowMap = new Map(cImportErr.failedRows.map((r) => [r.employee_code, r]));
    const cols = [
      { header: 'Mã nhân viên',   key: 'a', width: 20 },
      { header: 'Lương hoa hồng', key: 'b', width: 22 },
      { header: 'Lý do lỗi',      key: 'c', width: 44 },
    ];
    const dataRows = cImportErr.errors.map((e) => {
      const orig = rowMap.get(e.employee_code);
      return [e.employee_code, orig?.amount ?? '', e.error];
    });
    const wb = await buildErrorExcel('Hoa Hồng', 'FF4F46E5', cols, dataRows);
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = `hoa_hong_loi_T${selectedMonth}_${selectedYear}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPenaltyErrors = async () => {
    if (!pImportErr?.errors.length) return;
    const rowMap = new Map(pImportErr.failedRows.map((r) => [r.employee_code, r]));
    const cols = [
      { header: 'Mã nhân viên',  key: 'a', width: 20 },
      { header: 'Số tiền phạt',  key: 'b', width: 20 },
      { header: 'Lý do vi phạm', key: 'c', width: 40 },
      { header: 'Lý do lỗi',     key: 'd', width: 44 },
    ];
    const dataRows = pImportErr.errors.map((e) => {
      const orig = rowMap.get(e.employee_code);
      return [e.employee_code, orig?.amount ?? '', orig?.reason ?? '', e.error];
    });
    const wb = await buildErrorExcel('Phạt Biên Bản', 'FFD93D1A', cols, dataRows);
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = `phat_bien_ban_loi_T${selectedMonth}_${selectedYear}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAdvanceErrors = async () => {
    if (!aImportErr?.errors.length) return;
    const rowMap = new Map(aImportErr.failedRows.map((r) => [r.employee_code, r]));
    const cols = [
      { header: 'Mã nhân viên',    key: 'a', width: 20 },
      { header: 'Số tiền tạm ứng', key: 'b', width: 22 },
      { header: 'Lý do lỗi',       key: 'c', width: 44 },
    ];
    const dataRows = aImportErr.errors.map((e) => {
      const orig = rowMap.get(e.employee_code);
      return [e.employee_code, orig?.amount ?? '', e.error];
    });
    const wb = await buildErrorExcel('Tạm Ứng', 'FF0E7490', cols, dataRows);
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = `tam_ung_loi_T${selectedMonth}_${selectedYear}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportOtherAllowanceErrors = async () => {
    if (!oImportErr?.errors.length) return;
    const rowMap = new Map(oImportErr.failedRows.map((r) => [r.employee_code, r]));
    const cols = [
      { header: 'Mã nhân viên',    key: 'a', width: 20 },
      { header: 'Số tiền phụ cấp', key: 'b', width: 22 },
      { header: 'Mô tả phụ cấp',   key: 'c', width: 30 },
      { header: 'Lý do lỗi',        key: 'd', width: 44 },
    ];
    const dataRows = oImportErr.errors.map((e) => {
      const orig = rowMap.get(e.employee_code);
      return [e.employee_code, orig?.amount ?? '', orig?.description ?? '', e.error];
    });
    const wb = await buildErrorExcel('Phụ Cấp Khác', 'FF7C3AED', cols, dataRows);
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = `phu_cap_khac_loi_T${selectedMonth}_${selectedYear}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Derived ──────────────────────────────────────────────────────────────

  const filteredCommissions = commissionRecords.filter((r) =>
    !cSearch || r.employee_code.toLowerCase().includes(cSearch.toLowerCase()) || r.employee_name.toLowerCase().includes(cSearch.toLowerCase())
  );
  const filteredPenalties = penaltyRecords.filter((r) =>
    !pSearch || r.employee_code.toLowerCase().includes(pSearch.toLowerCase()) || r.employee_name.toLowerCase().includes(pSearch.toLowerCase())
  );
  const filteredAdvances = advanceRecords.filter((r) =>
    !aSearch || r.employee_code.toLowerCase().includes(aSearch.toLowerCase()) || r.employee_name.toLowerCase().includes(aSearch.toLowerCase())
  );
  const filteredOtherAllowances = oRecords.filter((r) =>
    !oSearch || r.employee_code.toLowerCase().includes(oSearch.toLowerCase()) || r.employee_name.toLowerCase().includes(oSearch.toLowerCase())
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

  const renderImportErrors = (
    errState: { errors: {employee_code:string;error:string}[]; failedRows: unknown[] } | null,
    onExport: () => void,
    onClear: () => void,
  ) => {
    if (!errState?.errors.length) return null;
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-red-100">
          <span className="flex items-center gap-1.5 text-xs font-medium text-red-700">
            <ExclamationCircleIcon className="h-4 w-4" />
            {errState.errors.length} dòng không import được
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
            >
              <ArrowDownTrayIcon className="h-3 w-3" />
              Tải file lỗi để sửa
            </button>
            <button onClick={onClear} className="p-1 hover:bg-red-200 rounded transition-colors">
              <XMarkIcon className="h-3.5 w-3.5 text-red-500" />
            </button>
          </div>
        </div>
        <div className="max-h-40 overflow-y-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-red-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-red-700 w-32">Mã nhân viên</th>
                <th className="px-3 py-2 text-left font-medium text-red-700">Lý do lỗi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100 bg-white">
              {errState.errors.map((e, i) => (
                <tr key={i}>
                  <td className="px-3 py-1.5 font-mono font-medium text-red-700">{e.employee_code}</td>
                  <td className="px-3 py-1.5 text-red-600">{e.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

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
            onClick={() => activeTab === 'commission' ? loadCommissions() : activeTab === 'penalty' ? loadPenalties() : activeTab === 'advance' ? loadAdvances() : loadOtherAllowances()}
            disabled={loadingCommission || loadingPenalty || loadingAdvance || loadingO}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 ${(loadingCommission || loadingPenalty || loadingAdvance || loadingO) ? 'animate-spin' : ''}`} />
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
              {renderImportErrors(cImportErr, handleExportCommissionErrors, () => setCImportErr(null))}

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

          {/* ═══ TAB PHỤ CẤP KHÁC ═══ */}
          {activeTab === 'other_allowance' && (
            <>
              {/* Action bar */}
              <div className="flex flex-wrap gap-3 items-center">
                <button onClick={handleDownloadOtherAllowanceTemplate} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                  <ArrowDownTrayIcon className="h-4 w-4" />Tải file mẫu
                </button>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-purple-300 text-purple-700 bg-purple-50 rounded-md hover:bg-purple-100 cursor-pointer transition-colors">
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {oFile ? oFile.name : 'Chọn file Excel'}
                  <input ref={oFileRef} type="file" accept=".xlsx" className="hidden" onChange={handleOtherAllowanceFileChange} />
                </label>
                {oParsedRows && oParsedRows.filter((r) => !r.parseError).length > 0 && (
                  <button onClick={handleOtherAllowanceImport} disabled={oImporting} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-60 transition-colors">
                    {oImporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                    {oImporting ? 'Đang import...' : `Xác nhận import (${oParsedRows.filter((r) => !r.parseError).length})`}
                  </button>
                )}
                {oLoaded && (
                  <div className="flex-1 relative min-w-48">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Tìm nhân viên..." value={oSearch} onChange={(e) => setOSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                )}
              </div>
              {oParseError && <p className="flex items-center gap-1 text-sm text-red-600"><ExclamationCircleIcon className="h-4 w-4" />{oParseError}</p>}
              {renderImportErrors(oImportErr, handleExportOtherAllowanceErrors, () => setOImportErr(null))}

              {/* Preview */}
              {oParsedRows && !oParsing && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Xem trước — {oParsedRows.length} dòng
                      {oParsedRows.filter((r) => r.parseError).length > 0 && <span className="text-red-500"> · {oParsedRows.filter((r) => r.parseError).length} lỗi</span>}
                    </span>
                    <span className="text-gray-500">Tháng {selectedMonth}/{selectedYear}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NV</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mô tả phụ cấp</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {oParsedRows.map((row, i) => (
                          <tr key={row.rowIndex} className={row.parseError ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-2 font-mono font-medium text-gray-800">{row.employee_code}</td>
                            <td className="px-4 py-2 text-right text-purple-700 font-medium">{row.amount > 0 ? row.amount.toLocaleString('vi-VN') + ' ₫' : '—'}</td>
                            <td className="px-4 py-2 text-gray-600 max-w-xs truncate">{row.description || '—'}</td>
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

              {/* OtherAllowance list */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    Danh sách phụ cấp khác — Tháng {selectedMonth}/{selectedYear}
                    <span className="ml-2 font-normal text-gray-500">{filteredOtherAllowances.length} nhân viên</span>
                  </p>
                </div>
                {loadingO ? renderLoading('primary') :
                 filteredOtherAllowances.length === 0 ? renderEmpty(oRecords.length === 0 ? 'Chưa có dữ liệu phụ cấp tháng này.' : 'Không tìm thấy nhân viên.') : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mô tả phụ cấp</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredOtherAllowances.map((rec, i) => {
                          const isEditing  = oEditingId  === rec.id;
                          const isDeleting = oDeletingId === rec.id;
                          return (
                            <tr key={rec.id} className={isDeleting ? 'bg-red-50' : 'hover:bg-gray-50 transition-colors'}>
                              <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {renderAvatar(rec.employee_name, 'bg-purple-50 text-purple-700')}
                                  <div><p className="font-medium text-gray-900">{rec.employee_name}</p><p className="text-xs text-gray-500 font-mono">{rec.employee_code}</p></div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <input type="text" value={oEditValues.amount} onChange={(e) => setOEditValues((v) => ({ ...v, amount: e.target.value }))}
                                    className="w-36 text-right border border-purple-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="0" />
                                ) : (
                                  <span className="font-medium text-purple-700">{fmtMoney(rec.amount)}</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input type="text" value={oEditValues.description} onChange={(e) => setOEditValues((v) => ({ ...v, description: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Mô tả phụ cấp..." />
                                ) : (
                                  <span className="text-gray-700">{rec.description || '—'}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isDeleting ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-xs text-red-600">Xác nhận xoá?</span>
                                    <button onClick={() => handleODelete(rec.id)} disabled={oDeleting} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60">
                                      {oDeleting ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Xoá
                                    </button>
                                    <button onClick={() => setODeletingId(null)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleOSave(rec.id)} disabled={oSaving} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-60">
                                      {oSaving ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Lưu
                                    </button>
                                    <button onClick={cancelOEdit} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => startOEdit(rec)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors">
                                      <PencilIcon className="h-3.5 w-3.5" />Sửa
                                    </button>
                                    <button onClick={() => { setODeletingId(rec.id); setOEditingId(null); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors">
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

          {/* ═══ TAB TẠM ỨNG LƯƠNG ═══ */}
          {activeTab === 'advance' && (
            <>
              {/* Action bar */}
              <div className="flex flex-wrap gap-3 items-center">
                <button onClick={handleDownloadAdvanceTemplate} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                  <ArrowDownTrayIcon className="h-4 w-4" />Tải file mẫu
                </button>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-cyan-300 text-cyan-700 bg-cyan-50 rounded-md hover:bg-cyan-100 cursor-pointer transition-colors">
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {aFile ? aFile.name : 'Chọn file Excel'}
                  <input ref={aFileRef} type="file" accept=".xlsx" className="hidden" onChange={handleAdvanceFileChange} />
                </label>
                {aParsedRows && aParsedRows.filter((r) => !r.parseError).length > 0 && (
                  <button onClick={handleAdvanceImport} disabled={aImporting} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-60 transition-colors">
                    {aImporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                    {aImporting ? 'Đang import...' : `Xác nhận import (${aParsedRows.filter((r) => !r.parseError).length})`}
                  </button>
                )}
                {advanceLoaded && (
                  <div className="flex-1 relative min-w-48">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Tìm nhân viên..." value={aSearch} onChange={(e) => setASearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                )}
              </div>
              {aParseError && <p className="flex items-center gap-1 text-sm text-red-600"><ExclamationCircleIcon className="h-4 w-4" />{aParseError}</p>}
              {renderImportErrors(aImportErr, handleExportAdvanceErrors, () => setAImportErr(null))}

              {/* Preview */}
              {aParsedRows && !aParsing && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Xem trước — {aParsedRows.length} dòng
                      {aParsedRows.filter((r) => r.parseError).length > 0 && <span className="text-red-500"> · {aParsedRows.filter((r) => r.parseError).length} lỗi</span>}
                    </span>
                    <span className="text-gray-500">Tháng {selectedMonth}/{selectedYear}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NV</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền tạm ứng</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {aParsedRows.map((row, i) => (
                          <tr key={row.rowIndex} className={row.parseError ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-2 font-mono font-medium text-gray-800">{row.employee_code}</td>
                            <td className="px-4 py-2 text-right text-cyan-700 font-medium">{row.amount > 0 ? row.amount.toLocaleString('vi-VN') + ' ₫' : '—'}</td>
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

              {/* Advance list */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    Danh sách tạm ứng — Tháng {selectedMonth}/{selectedYear}
                    <span className="ml-2 font-normal text-gray-500">{filteredAdvances.length} nhân viên</span>
                  </p>
                </div>
                {loadingAdvance ? renderLoading('primary') :
                 filteredAdvances.length === 0 ? renderEmpty(advanceRecords.length === 0 ? 'Chưa có dữ liệu tạm ứng tháng này.' : 'Không tìm thấy nhân viên.') : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền tạm ứng</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredAdvances.map((rec, i) => {
                          const isEditing  = aEditingId  === rec.id;
                          const isDeleting = aDeletingId === rec.id;
                          return (
                            <tr key={rec.id} className={isDeleting ? 'bg-red-50' : 'hover:bg-gray-50 transition-colors'}>
                              <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {renderAvatar(rec.employee_name, 'bg-cyan-50 text-cyan-700')}
                                  <div><p className="font-medium text-gray-900">{rec.employee_name}</p><p className="text-xs text-gray-500 font-mono">{rec.employee_code}</p></div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <input type="text" value={aEditAmount} onChange={(e) => setAEditAmount(e.target.value)}
                                    className="w-36 text-right border border-cyan-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" placeholder="0" />
                                ) : (
                                  <span className="font-medium text-cyan-700">{fmtMoney(rec.amount)}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isDeleting ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-xs text-red-600">Xác nhận xoá?</span>
                                    <button onClick={() => handleADelete(rec.id)} disabled={aDeleting} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60">
                                      {aDeleting ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Xoá
                                    </button>
                                    <button onClick={() => setADeletingId(null)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleASave(rec.id)} disabled={aSaving} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-60">
                                      {aSaving ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Lưu
                                    </button>
                                    <button onClick={cancelAEdit} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => startAEdit(rec)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-md hover:bg-cyan-100 transition-colors">
                                      <PencilIcon className="h-3.5 w-3.5" />Sửa
                                    </button>
                                    <button onClick={() => { setADeletingId(rec.id); setAEditingId(null); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors">
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
              {renderImportErrors(pImportErr, handleExportPenaltyErrors, () => setPImportErr(null))}

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
