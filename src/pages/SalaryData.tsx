import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  PlusIcon,
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
  type ParkingAllowanceOverrideRecord,
  type BulkImportParkingAllowanceRecord,
  type LunchAllowanceOverrideRecord,
  type BulkImportLunchAllowanceRecord,
  type SalaryDataMonthlySummary,
} from '../services/salary.service';
import { SelectBox } from '../components/LandingLayout/SelectBox';
import Pagination from '../components/Pagination';

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

interface ParsedParkingAllowanceRow {
  employee_code: string;
  amount: number;
  notes: string;
  rowIndex: number;
  parseError?: string;
}

interface ParsedLunchAllowanceRow {
  employee_code: string;
  amount: number;
  notes: string;
  rowIndex: number;
  parseError?: string;
}

interface EmployeeOption {
  id: number;
  employee_code: string;
  employee_name: string;
}

type TabKey = 'commission' | 'penalty' | 'advance' | 'other_allowance' | 'parking_allowance' | 'lunch_allowance';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'commission',        label: 'Hoa Hồng',        icon: CurrencyDollarIcon },
  { key: 'penalty',           label: 'Phạt Biên Bản',   icon: ExclamationCircleIcon },
  { key: 'advance',           label: 'Tạm Ứng Lương',   icon: CurrencyDollarIcon },
  { key: 'other_allowance',   label: 'Phụ Cấp Khác',    icon: CurrencyDollarIcon },
  { key: 'parking_allowance', label: 'Phụ Cấp Gửi Xe',  icon: CurrencyDollarIcon },
  { key: 'lunch_allowance',   label: 'Phụ Cấp Ăn Trưa', icon: CurrencyDollarIcon },
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

const parseAmountInput = (value: string): number => parseFloat(value.replace(/,/g, '')) || 0;

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const payload = (error as { response?: { data?: unknown } })?.response?.data;
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'object' && payload !== null) {
    const firstValue = Object.values(payload as Record<string, unknown>)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === 'string') return firstValue;
  }
  return fallback;
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
  const [cPage,              setCPage]              = useState(1);
  const [cPageSize,          setCPageSize]          = useState(20);
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
  const [oPage,       setOPage]       = useState(1);
  const [oPageSize,   setOPageSize]   = useState(20);
  const oFileRef = useRef<HTMLInputElement>(null);

  // ── ParkingAllowanceOverride state ──
  const [paRecords,    setPaRecords]    = useState<ParkingAllowanceOverrideRecord[]>([]);
  const [loadingPa,    setLoadingPa]    = useState(false);
  const [paLoaded,     setPaLoaded]     = useState(false);
  const [paParsedRows, setPaParsedRows] = useState<ParsedParkingAllowanceRow[] | null>(null);
  const [paFile,       setPaFile]       = useState<File | null>(null);
  const [paParsing,    setPaParsing]    = useState(false);
  const [paParseError, setPaParseError] = useState<string | null>(null);
  const [paImporting,  setPaImporting]  = useState(false);
  const [paSearch,     setPaSearch]     = useState('');
  const [paEditingId,  setPaEditingId]  = useState<number | null>(null);
  const [paEditValues, setPaEditValues] = useState({ amount: '', notes: '' });
  const [paSaving,     setPaSaving]     = useState(false);
  const [paDeletingId, setPaDeletingId] = useState<number | null>(null);
  const [paDeleting,   setPaDeleting]   = useState(false);
  const [paAdding,     setPaAdding]     = useState(false);
  const [paCreating,   setPaCreating]   = useState(false);
  const [paCreateValues, setPaCreateValues] = useState({ employeeId: 0, amount: '', notes: '' });
  const [paImportErr, setPaImportErr] = useState<{ errors: {employee_code:string;error:string}[]; failedRows: ParsedParkingAllowanceRow[] } | null>(null);
  const [paPage,     setPaPage]     = useState(1);
  const [paPageSize, setPaPageSize] = useState(20);
  const paFileRef = useRef<HTMLInputElement>(null);

  // ── LunchAllowanceOverride state ──
  const [laRecords,    setLaRecords]    = useState<LunchAllowanceOverrideRecord[]>([]);
  const [loadingLa,    setLoadingLa]    = useState(false);
  const [laLoaded,     setLaLoaded]     = useState(false);
  const [laParsedRows, setLaParsedRows] = useState<ParsedLunchAllowanceRow[] | null>(null);
  const [laFile,       setLaFile]       = useState<File | null>(null);
  const [laParsing,    setLaParsing]    = useState(false);
  const [laParseError, setLaParseError] = useState<string | null>(null);
  const [laImporting,  setLaImporting]  = useState(false);
  const [laSearch,     setLaSearch]     = useState('');
  const [laEditingId,  setLaEditingId]  = useState<number | null>(null);
  const [laEditValues, setLaEditValues] = useState({ amount: '', notes: '' });
  const [laSaving,     setLaSaving]     = useState(false);
  const [laDeletingId, setLaDeletingId] = useState<number | null>(null);
  const [laDeleting,   setLaDeleting]   = useState(false);
  const [laAdding,     setLaAdding]     = useState(false);
  const [laCreating,   setLaCreating]   = useState(false);
  const [laCreateValues, setLaCreateValues] = useState({ employeeId: 0, amount: '', notes: '' });
  const [laImportErr, setLaImportErr] = useState<{ errors: {employee_code:string;error:string}[]; failedRows: ParsedLunchAllowanceRow[] } | null>(null);
  const [laSyncing, setLaSyncing] = useState(false);
  const [laPage,     setLaPage]     = useState(1);
  const [laPageSize, setLaPageSize] = useState(20);
  const laFileRef = useRef<HTMLInputElement>(null);

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
  const [aPage,           setAPage]           = useState(1);
  const [aPageSize,       setAPageSize]       = useState(20);
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
  const [pPage,           setPPage]           = useState(1);
  const [pPageSize,       setPPageSize]       = useState(20);
  const pFileRef = useRef<HTMLInputElement>(null);

  // ── Per-tab import errors (detailed) ──
  const [cImportErr, setCImportErr] = useState<{ errors: {employee_code:string;error:string}[]; failedRows: ParsedCommissionRow[] } | null>(null);
  const [pImportErr, setPImportErr] = useState<{ errors: {employee_code:string;error:string}[]; failedRows: ParsedPenaltyRow[] } | null>(null);
  const [aImportErr, setAImportErr] = useState<{ errors: {employee_code:string;error:string}[]; failedRows: ParsedAdvanceRow[] } | null>(null);
  const [oImportErr, setOImportErr] = useState<{ errors: {employee_code:string;error:string}[]; failedRows: ParsedOtherAllowanceRow[] } | null>(null);

  // ── Shared toasts ──
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSummary, setReportSummary] = useState<SalaryDataMonthlySummary | null>(null);

  // ── Employee options (for manual add) ──
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // ── Commission add state ──
  const [cAdding, setCAdding] = useState(false);
  const [cCreating, setCCreating] = useState(false);
  const [cCreateValues, setCCreateValues] = useState({ employeeId: 0, amount: '' });

  // ── Penalty add state ──
  const [pAdding, setPAdding] = useState(false);
  const [pCreating, setPCreating] = useState(false);
  const [pCreateValues, setPCreateValues] = useState({ employeeId: 0, amount: '', reason: '' });

  // ── Advance add state ──
  const [aAdding, setAAdding] = useState(false);
  const [aCreating, setACreating] = useState(false);
  const [aCreateValues, setACreateValues] = useState({ employeeId: 0, amount: '' });

  // ── OtherAllowance add state ──
  const [oAdding, setOAdding] = useState(false);
  const [oCreating, setOCreating] = useState(false);
  const [oCreateValues, setOCreateValues] = useState({ employeeId: 0, amount: '', description: '' });

  // ─── Load functions ────────────────────────────────────────────────────────

  const loadCommissions = useCallback(async (month = selectedMonth, year = selectedYear) => {
    setLoadingCommission(true);
    setCommissionLoaded(false);
    try {
      const data = await salaryService.listCommissions({ year, month });
      setCommissionRecords(data);
      setCPage(1);
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
      setPPage(1);
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
      setOPage(1);
      setOLoaded(true);
    } catch {
      setErrorMsg('Không thể tải danh sách phụ cấp khác.');
    } finally {
      setLoadingO(false);
    }
  }, [selectedMonth, selectedYear]);

  const loadParkingAllowances = useCallback(async (month = selectedMonth, year = selectedYear) => {
    setLoadingPa(true);
    setPaLoaded(false);
    try {
      const data = await salaryService.listParkingAllowanceOverrides({ year, month });
      setPaRecords(data);
      setPaPage(1);
      setPaLoaded(true);
    } catch {
      setErrorMsg('Không thể tải danh sách phụ cấp gửi xe.');
    } finally {
      setLoadingPa(false);
    }
  }, [selectedMonth, selectedYear]);

  const loadLunchAllowances = useCallback(async (month = selectedMonth, year = selectedYear) => {
    setLoadingLa(true);
    setLaLoaded(false);
    try {
      const data = await salaryService.listLunchAllowanceOverrides({ year, month });
      setLaRecords(data);
      setLaPage(1);
      setLaLoaded(true);
    } catch {
      setErrorMsg('Không thể tải danh sách phụ cấp ăn trưa.');
    } finally {
      setLoadingLa(false);
    }
  }, [selectedMonth, selectedYear]);

  const loadAdvances = useCallback(async (month = selectedMonth, year = selectedYear) => {
    setLoadingAdvance(true);
    setAdvanceLoaded(false);
    try {
      const data = await salaryService.listAdvances({ year, month });
      setAdvanceRecords(data);
      setAPage(1);
      setAdvanceLoaded(true);
    } catch {
      setErrorMsg('Không thể tải danh sách tạm ứng.');
    } finally {
      setLoadingAdvance(false);
    }
  }, [selectedMonth, selectedYear]);

  const loadEmployeeOptions = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const res = await salaryService.listEmployeeSalaries({ page: 1, page_size: 1000, ordering: 'employee_id' });
      const options = res.results
        .filter((employee) => !!employee.id && !!employee.employee_id)
        .map((employee) => ({
          id: employee.id,
          employee_code: employee.employee_id,
          employee_name: employee.full_name || employee.employee_id,
        }));
      setEmployeeOptions(options);
    } catch {
      setErrorMsg('Không thể tải danh sách nhân viên để thêm dữ liệu.');
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  const handleLoadReport = useCallback(async () => {
    setReportLoading(true);
    setErrorMsg(null);
    try {
      const summary = await salaryService.getSalaryDataMonthlySummary({
        year: selectedYear,
        month: selectedMonth,
      });
      setReportSummary(summary);
      setSuccessMsg(`Đã tải báo cáo tháng ${selectedMonth}/${selectedYear}.`);
    } catch (error) {
      setErrorMsg(getApiErrorMessage(error, 'Không thể tải báo cáo tổng hợp theo tháng.'));
    } finally {
      setReportLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  // Auto-load khi đổi tab / tháng / năm
  useEffect(() => {
    if (activeTab === 'commission') loadCommissions(selectedMonth, selectedYear);
    else if (activeTab === 'penalty') loadPenalties(selectedMonth, selectedYear);
    else if (activeTab === 'advance') loadAdvances(selectedMonth, selectedYear);
    else if (activeTab === 'parking_allowance') loadParkingAllowances(selectedMonth, selectedYear);
    else if (activeTab === 'lunch_allowance') loadLunchAllowances(selectedMonth, selectedYear);
    else loadOtherAllowances(selectedMonth, selectedYear);
  }, [activeTab, selectedMonth, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadEmployeeOptions();
  }, [loadEmployeeOptions]);

  // Reset trang phân trang về 1 khi từ khoá tìm kiếm của từng tab thay đổi
  useEffect(() => { setCPage(1); }, [cSearch]);
  useEffect(() => { setPPage(1); }, [pSearch]);
  useEffect(() => { setAPage(1); }, [aSearch]);
  useEffect(() => { setOPage(1); }, [oSearch]);
  useEffect(() => { setPaPage(1); }, [paSearch]);
  useEffect(() => { setLaPage(1); }, [laSearch]);

  // ─── Month/Year handlers ───────────────────────────────────────────────────

  const clearImportState = () => {
    setCParsedRows(null); setCFile(null); setCImportErr(null); if (cFileRef.current) cFileRef.current.value = '';
    setPParsedRows(null); setPFile(null); setPImportErr(null); if (pFileRef.current) pFileRef.current.value = '';
    setAParsedRows(null); setAFile(null); setAImportErr(null); if (aFileRef.current) aFileRef.current.value = '';
    setOParsedRows(null); setOFile(null); setOImportErr(null); if (oFileRef.current) oFileRef.current.value = '';
  };

  const handleMonthChange = (v: number) => { setSelectedMonth(v); clearImportState(); setReportSummary(null); };
  const handleYearChange  = (v: number) => { setSelectedYear(v);  clearImportState(); setReportSummary(null); };

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

  const handleCAdd = async () => {
    const amount = parseAmountInput(cCreateValues.amount);
    if (!cCreateValues.employeeId) {
      setErrorMsg('Vui lòng chọn mã nhân viên.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền lớn hơn 0.');
      return;
    }

    setCCreating(true);
    try {
      await salaryService.createCommission({
        employee: cCreateValues.employeeId,
        year: selectedYear,
        month: selectedMonth,
        amount,
      });
      setSuccessMsg('Đã thêm hoa hồng.');
      setCAdding(false);
      setCCreateValues({ employeeId: 0, amount: '' });
      await loadCommissions();
    } catch (error) {
      setErrorMsg(getApiErrorMessage(error, 'Không thể thêm hoa hồng.'));
    } finally {
      setCCreating(false);
    }
  };

  // ─── Commission: download data ────────────────────────────────────────────

  const handleDownloadCommissionData = async () => {
    if (!commissionRecords.length) {
      setErrorMsg('Không có dữ liệu hoa hồng để tải xuống.');
      return;
    }
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Hoa Hồng');
      ws.columns = [
        { header: 'Mã nhân viên',   key: 'employee_code', width: 20 },
        { header: 'Tên nhân viên',  key: 'employee_name', width: 30 },
        { header: 'Lương hoa hồng', key: 'amount',        width: 20 },
      ];
      
      // Style header
      ws.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      ws.getRow(1).height = 28;
      
      // Add data
      commissionRecords.forEach((rec) => {
        ws.addRow({
          employee_code: rec.employee_code,
          employee_name: rec.employee_name,
          amount: rec.amount,
        });
      });
      
      // Format data rows
      ws.eachRow((row, idx) => {
        if (idx === 1) return;
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          };
        });
      });
      
      const buf = await wb.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `hoa_hong_T${selectedMonth}_${selectedYear}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMsg('Tải xuống dữ liệu hoa hồng thành công.');
    } catch (error) {
      setErrorMsg(getApiErrorMessage(error, 'Không thể tải xuống dữ liệu hoa hồng.'));
    }
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

  const handlePAdd = async () => {
    const amount = parseAmountInput(pCreateValues.amount);
    if (!pCreateValues.employeeId) {
      setErrorMsg('Vui lòng chọn mã nhân viên.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền lớn hơn 0.');
      return;
    }

    setPCreating(true);
    try {
      await salaryService.createPenalty({
        employee: pCreateValues.employeeId,
        year: selectedYear,
        month: selectedMonth,
        amount,
        reason: pCreateValues.reason.trim(),
      });
      setSuccessMsg('Đã thêm phạt biên bản.');
      setPAdding(false);
      setPCreateValues({ employeeId: 0, amount: '', reason: '' });
      await loadPenalties();
    } catch (error) {
      setErrorMsg(getApiErrorMessage(error, 'Không thể thêm phạt biên bản.'));
    } finally {
      setPCreating(false);
    }
  };

  // ─── Penalty: download data ────────────────────────────────────────────────

  const handleDownloadPenaltyData = async () => {
    if (!penaltyRecords.length) {
      setErrorMsg('Không có dữ liệu phạt biên bản để tải xuống.');
      return;
    }
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Phạt Biên Bản');
      ws.columns = [
        { header: 'Mã nhân viên',  key: 'employee_code', width: 20 },
        { header: 'Tên nhân viên', key: 'employee_name', width: 30 },
        { header: 'Số tiền phạt',  key: 'amount',        width: 20 },
        { header: 'Lý do vi phạm', key: 'reason',        width: 40 },
      ];
      
      // Style header
      ws.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD93D1A' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      ws.getRow(1).height = 28;
      
      // Add data
      penaltyRecords.forEach((rec) => {
        ws.addRow({
          employee_code: rec.employee_code,
          employee_name: rec.employee_name,
          amount: rec.amount,
          reason: rec.reason,
        });
      });
      
      // Format data rows
      ws.eachRow((row, idx) => {
        if (idx === 1) return;
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          };
        });
      });
      
      const buf = await wb.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `phat_bien_ban_T${selectedMonth}_${selectedYear}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMsg('Tải xuống dữ liệu phạt biên bản thành công.');
    } catch (error) {
      setErrorMsg(getApiErrorMessage(error, 'Không thể tải xuống dữ liệu phạt biên bản.'));
    }
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

  const handleAAdd = async () => {
    const amount = parseAmountInput(aCreateValues.amount);
    if (!aCreateValues.employeeId) {
      setErrorMsg('Vui lòng chọn mã nhân viên.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền lớn hơn 0.');
      return;
    }

    setACreating(true);
    try {
      await salaryService.createAdvance({
        employee: aCreateValues.employeeId,
        year: selectedYear,
        month: selectedMonth,
        amount,
      });
      setSuccessMsg('Đã thêm tạm ứng.');
      setAAdding(false);
      setACreateValues({ employeeId: 0, amount: '' });
      await loadAdvances();
    } catch (error) {
      setErrorMsg(getApiErrorMessage(error, 'Không thể thêm tạm ứng.'));
    } finally {
      setACreating(false);
    }
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

  const handleOAdd = async () => {
    const amount = parseAmountInput(oCreateValues.amount);
    if (!oCreateValues.employeeId) {
      setErrorMsg('Vui lòng chọn mã nhân viên.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền lớn hơn 0.');
      return;
    }

    setOCreating(true);
    try {
      await salaryService.createOtherAllowance({
        employee: oCreateValues.employeeId,
        year: selectedYear,
        month: selectedMonth,
        amount,
        description: oCreateValues.description.trim(),
      });
      setSuccessMsg('Đã thêm phụ cấp khác.');
      setOAdding(false);
      setOCreateValues({ employeeId: 0, amount: '', description: '' });
      await loadOtherAllowances();
    } catch (error) {
      setErrorMsg(getApiErrorMessage(error, 'Không thể thêm phụ cấp khác.'));
    } finally {
      setOCreating(false);
    }
  };

  // ─── ParkingAllowanceOverride: template ────────────────────────────────────

  const handleDownloadParkingAllowanceTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Phụ Cấp Gửi Xe');
    ws.columns = [
      { header: 'Mã nhân viên',            key: 'employee_code', width: 20 },
      { header: 'Số tiền phụ cấp gửi xe',  key: 'amount',        width: 24 },
      { header: 'Ghi chú',                 key: 'notes',         width: 30 },
    ];
    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 28;
    ws.addRow({ employee_code: 'NV001', amount: 100000, notes: '' });
    ws.addRow({ employee_code: 'NV002', amount: 150000, notes: '' });
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url; a.download = `template_phu_cap_gui_xe_T${selectedMonth}_${selectedYear}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── ParkingAllowanceOverride: parse Excel ─────────────────────────────────

  const handleParkingAllowanceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.match(/\.xlsx$/i)) { setPaParseError('Chỉ chấp nhận file Excel (.xlsx)'); return; }
    setPaFile(f); setPaParseError(null); setPaParsedRows(null); setSuccessMsg(null); setErrorMsg(null); setPaParsing(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await f.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) { setPaParseError('File không có sheet nào.'); return; }
      const rows: ParsedParkingAllowanceRow[] = [];
      ws.eachRow((row, idx) => {
        if (idx === 1) return;
        const code = row.getCell(1).value != null ? String(row.getCell(1).value).trim() : '';
        if (!code) return;
        const amount = extractCellNumber(row.getCell(2).value);
        const notes = extractCellString(row.getCell(3).value);
        rows.push({ employee_code: code, amount, notes, rowIndex: idx, parseError: amount < 0 ? 'Số tiền không hợp lệ' : undefined });
      });
      if (!rows.length) { setPaParseError('File không có dữ liệu.'); return; }
      setPaParsedRows(rows);
    } catch { setPaParseError('Không thể đọc file.'); }
    finally { setPaParsing(false); }
  };

  // ─── ParkingAllowanceOverride: import ──────────────────────────────────────

  const handleParkingAllowanceImport = async () => {
    if (!paParsedRows) return;
    const valid = paParsedRows.filter((r) => !r.parseError);
    if (!valid.length) return;
    setPaImporting(true);
    try {
      const records: BulkImportParkingAllowanceRecord[] = valid.map((r) => ({ employee_code: r.employee_code, amount: r.amount, notes: r.notes }));
      const res = await salaryService.bulkImportParkingAllowanceOverrides({ year: selectedYear, month: selectedMonth, records });
      if (res.success.length > 0) setSuccessMsg(`Import thành công ${res.success.length} phụ cấp gửi xe.`);
      if (res.errors.length > 0) {
        const errorCodes = new Set(res.errors.map((e) => e.employee_code));
        const failedRows = (paParsedRows ?? []).filter((r) => errorCodes.has(r.employee_code));
        setPaImportErr({ errors: res.errors, failedRows });
      }
      setPaParsedRows(null); setPaFile(null); if (paFileRef.current) paFileRef.current.value = '';
      await loadParkingAllowances();
    } catch { setErrorMsg('Lỗi kết nối máy chủ.'); }
    finally { setPaImporting(false); }
  };

  // ─── ParkingAllowanceOverride: set 0 cho người còn lại ─────────────────────

  const [paFillingZero, setPaFillingZero] = useState(false);

  const handleFillRemainingZero = async () => {
    const confirmed = window.confirm(
      `Đặt phụ cấp gửi xe = 0 cho TẤT CẢ nhân viên đang hoạt động chưa có trong danh sách tháng ${selectedMonth}/${selectedYear}?\n` +
      `Không ảnh hưởng tới các bản ghi đã có (kể cả > 0).`
    );
    if (!confirmed) return;
    setPaFillingZero(true);
    try {
      const res = await salaryService.fillRemainingParkingAllowanceZero({ year: selectedYear, month: selectedMonth });
      setSuccessMsg(`Đã đặt 0 cho ${res.created_count} nhân viên còn lại.${res.errors.length ? ` (${res.errors.length} lỗi)` : ''}`);
      await loadParkingAllowances();
    } catch (error) {
      setErrorMsg(getApiErrorMessage(error, 'Không thể đặt 0 cho người còn lại.'));
    } finally {
      setPaFillingZero(false);
    }
  };

  // ─── ParkingAllowanceOverride: edit/delete ─────────────────────────────────

  const startPaEdit = (rec: ParkingAllowanceOverrideRecord) => { setPaEditingId(rec.id); setPaEditValues({ amount: String(Number(rec.amount)), notes: rec.notes }); setPaDeletingId(null); };
  const cancelPaEdit = () => setPaEditingId(null);

  const handlePaSave = async (id: number) => {
    const amount = parseFloat(paEditValues.amount.replace(/,/g, '')) || 0;
    setPaSaving(true);
    try {
      const updated = await salaryService.updateParkingAllowanceOverride(id, { amount, notes: paEditValues.notes });
      setPaRecords((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      setPaEditingId(null); setSuccessMsg('Đã cập nhật phụ cấp gửi xe.');
    } catch { setErrorMsg('Không thể cập nhật.'); }
    finally { setPaSaving(false); }
  };

  const handlePaDelete = async (id: number) => {
    setPaDeleting(true);
    try {
      await salaryService.deleteParkingAllowanceOverride(id);
      setPaRecords((prev) => prev.filter((r) => r.id !== id));
      setPaDeletingId(null); setSuccessMsg('Đã xoá phụ cấp gửi xe.');
    } catch { setErrorMsg('Không thể xoá.'); }
    finally { setPaDeleting(false); }
  };

  const handlePaAdd = async () => {
    const amount = parseAmountInput(paCreateValues.amount);
    if (!paCreateValues.employeeId) {
      setErrorMsg('Vui lòng chọn mã nhân viên.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền lớn hơn 0.');
      return;
    }

    setPaCreating(true);
    try {
      await salaryService.createParkingAllowanceOverride({
        employee: paCreateValues.employeeId,
        year: selectedYear,
        month: selectedMonth,
        amount,
        notes: paCreateValues.notes.trim(),
      });
      setSuccessMsg('Đã thêm phụ cấp gửi xe.');
      setPaAdding(false);
      setPaCreateValues({ employeeId: 0, amount: '', notes: '' });
      await loadParkingAllowances();
    } catch (error) {
      setErrorMsg(getApiErrorMessage(error, 'Không thể thêm phụ cấp gửi xe.'));
    } finally {
      setPaCreating(false);
    }
  };

  // ─── LunchAllowanceOverride: template ──────────────────────────────────────

  const handleDownloadLunchAllowanceTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Phụ Cấp Ăn Trưa');
    ws.columns = [
      { header: 'Mã nhân viên',              key: 'employee_code', width: 20 },
      { header: 'Số tiền phụ cấp ăn trưa',  key: 'amount',        width: 24 },
      { header: 'Ghi chú',                   key: 'notes',         width: 30 },
    ];
    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 28;
    ws.addRow({ employee_code: 'NV001', amount: 100000, notes: '' });
    ws.addRow({ employee_code: 'NV002', amount: 150000, notes: '' });
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url; a.download = `template_phu_cap_an_trua_T${selectedMonth}_${selectedYear}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── LunchAllowanceOverride: parse Excel ───────────────────────────────────

  const handleLunchAllowanceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.match(/\.xlsx$/i)) { setLaParseError('Chỉ chấp nhận file Excel (.xlsx)'); return; }
    setLaFile(f); setLaParseError(null); setLaParsedRows(null); setSuccessMsg(null); setErrorMsg(null); setLaParsing(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await f.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) { setLaParseError('File không có sheet nào.'); return; }
      const rows: ParsedLunchAllowanceRow[] = [];
      ws.eachRow((row, idx) => {
        if (idx === 1) return;
        const code = row.getCell(1).value != null ? String(row.getCell(1).value).trim() : '';
        if (!code) return;
        const amount = extractCellNumber(row.getCell(2).value);
        const notes = extractCellString(row.getCell(3).value);
        rows.push({ employee_code: code, amount, notes, rowIndex: idx, parseError: amount < 0 ? 'Số tiền không hợp lệ' : undefined });
      });
      if (!rows.length) { setLaParseError('File không có dữ liệu.'); return; }
      setLaParsedRows(rows);
    } catch { setLaParseError('Không thể đọc file.'); }
    finally { setLaParsing(false); }
  };

  // ─── LunchAllowanceOverride: import ────────────────────────────────────────

  const handleLunchAllowanceImport = async () => {
    if (!laParsedRows) return;
    const valid = laParsedRows.filter((r) => !r.parseError);
    if (!valid.length) return;
    setLaImporting(true);
    try {
      const records: BulkImportLunchAllowanceRecord[] = valid.map((r) => ({ employee_code: r.employee_code, amount: r.amount, notes: r.notes }));
      const res = await salaryService.bulkImportLunchAllowanceOverrides({ year: selectedYear, month: selectedMonth, records });
      if (res.success.length > 0) setSuccessMsg(`Import thành công ${res.success.length} phụ cấp ăn trưa.`);
      if (res.errors.length > 0) {
        const errorCodes = new Set(res.errors.map((e) => e.employee_code));
        const failedRows = (laParsedRows ?? []).filter((r) => errorCodes.has(r.employee_code));
        setLaImportErr({ errors: res.errors, failedRows });
      }
      setLaParsedRows(null); setLaFile(null); if (laFileRef.current) laFileRef.current.value = '';
      await loadLunchAllowances();
    } catch { setErrorMsg('Lỗi kết nối máy chủ.'); }
    finally { setLaImporting(false); }
  };

  // ─── LunchAllowanceOverride: đồng bộ dữ liệu hiện tại ──────────────────────

  const handleLaSyncCurrent = async () => {
    const confirmed = window.confirm(
      `Lấy phụ cấp ăn trưa đang được tính tự động cho tất cả nhân viên đang hoạt động CHƯA có trong danh sách của tháng ${selectedMonth}/${selectedYear}?\n` +
      `Không ghi đè các dòng đã có sẵn.`
    );
    if (!confirmed) return;
    setLaSyncing(true);
    try {
      const res = await salaryService.syncCurrentLunchAllowances({ year: selectedYear, month: selectedMonth });
      setSuccessMsg(`Đã đồng bộ cho ${res.created_count} nhân viên.${res.errors.length ? ` (${res.errors.length} lỗi)` : ''}`);
      await loadLunchAllowances();
    } catch (error) {
      setErrorMsg(getApiErrorMessage(error, 'Không thể đồng bộ dữ liệu hiện tại.'));
    } finally {
      setLaSyncing(false);
    }
  };

  // ─── LunchAllowanceOverride: edit/delete ───────────────────────────────────

  const startLaEdit = (rec: LunchAllowanceOverrideRecord) => { setLaEditingId(rec.id); setLaEditValues({ amount: String(Number(rec.amount)), notes: rec.notes }); setLaDeletingId(null); };
  const cancelLaEdit = () => setLaEditingId(null);

  const handleLaSave = async (id: number) => {
    const amount = parseFloat(laEditValues.amount.replace(/,/g, '')) || 0;
    setLaSaving(true);
    try {
      const updated = await salaryService.updateLunchAllowanceOverride(id, { amount, notes: laEditValues.notes });
      setLaRecords((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      setLaEditingId(null); setSuccessMsg('Đã cập nhật phụ cấp ăn trưa.');
    } catch { setErrorMsg('Không thể cập nhật.'); }
    finally { setLaSaving(false); }
  };

  const handleLaDelete = async (id: number) => {
    setLaDeleting(true);
    try {
      await salaryService.deleteLunchAllowanceOverride(id);
      setLaRecords((prev) => prev.filter((r) => r.id !== id));
      setLaDeletingId(null); setSuccessMsg('Đã xoá phụ cấp ăn trưa.');
    } catch { setErrorMsg('Không thể xoá.'); }
    finally { setLaDeleting(false); }
  };

  const handleLaAdd = async () => {
    const amount = parseAmountInput(laCreateValues.amount);
    if (!laCreateValues.employeeId) {
      setErrorMsg('Vui lòng chọn mã nhân viên.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền lớn hơn 0.');
      return;
    }

    setLaCreating(true);
    try {
      await salaryService.createLunchAllowanceOverride({
        employee: laCreateValues.employeeId,
        year: selectedYear,
        month: selectedMonth,
        amount,
        notes: laCreateValues.notes.trim(),
      });
      setSuccessMsg('Đã thêm phụ cấp ăn trưa.');
      setLaAdding(false);
      setLaCreateValues({ employeeId: 0, amount: '', notes: '' });
      await loadLunchAllowances();
    } catch (error) {
      setErrorMsg(getApiErrorMessage(error, 'Không thể thêm phụ cấp ăn trưa.'));
    } finally {
      setLaCreating(false);
    }
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

  const handleExportParkingAllowanceErrors = async () => {
    if (!paImportErr?.errors.length) return;
    const rowMap = new Map(paImportErr.failedRows.map((r) => [r.employee_code, r]));
    const cols = [
      { header: 'Mã nhân viên',            key: 'a', width: 20 },
      { header: 'Số tiền phụ cấp gửi xe',  key: 'b', width: 24 },
      { header: 'Ghi chú',                 key: 'c', width: 30 },
      { header: 'Lý do lỗi',               key: 'd', width: 44 },
    ];
    const dataRows = paImportErr.errors.map((e) => {
      const orig = rowMap.get(e.employee_code);
      return [e.employee_code, orig?.amount ?? '', orig?.notes ?? '', e.error];
    });
    const wb = await buildErrorExcel('Phụ Cấp Gửi Xe', 'FFD97706', cols, dataRows);
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = `phu_cap_gui_xe_loi_T${selectedMonth}_${selectedYear}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportLunchAllowanceErrors = async () => {
    if (!laImportErr?.errors.length) return;
    const rowMap = new Map(laImportErr.failedRows.map((r) => [r.employee_code, r]));
    const cols = [
      { header: 'Mã nhân viên',              key: 'a', width: 20 },
      { header: 'Số tiền phụ cấp ăn trưa',  key: 'b', width: 24 },
      { header: 'Ghi chú',                   key: 'c', width: 30 },
      { header: 'Lý do lỗi',                 key: 'd', width: 44 },
    ];
    const dataRows = laImportErr.errors.map((e) => {
      const orig = rowMap.get(e.employee_code);
      return [e.employee_code, orig?.amount ?? '', orig?.notes ?? '', e.error];
    });
    const wb = await buildErrorExcel('Phụ Cấp Ăn Trưa', 'FF059669', cols, dataRows);
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = `phu_cap_an_trua_loi_T${selectedMonth}_${selectedYear}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Derived ──────────────────────────────────────────────────────────────

  const filteredCommissions = commissionRecords.filter((r) =>
    !cSearch || r.employee_code.toLowerCase().includes(cSearch.toLowerCase()) || r.employee_name.toLowerCase().includes(cSearch.toLowerCase())
  );
  const cTotalAmount = filteredCommissions.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const cTotalPages = Math.max(1, Math.ceil(filteredCommissions.length / cPageSize));
  const paginatedCommissions = filteredCommissions.slice((cPage - 1) * cPageSize, cPage * cPageSize);

  const filteredPenalties = penaltyRecords.filter((r) =>
    !pSearch || r.employee_code.toLowerCase().includes(pSearch.toLowerCase()) || r.employee_name.toLowerCase().includes(pSearch.toLowerCase())
  );
  const pTotalAmount = filteredPenalties.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const pTotalPages = Math.max(1, Math.ceil(filteredPenalties.length / pPageSize));
  const paginatedPenalties = filteredPenalties.slice((pPage - 1) * pPageSize, pPage * pPageSize);

  const filteredAdvances = advanceRecords.filter((r) =>
    !aSearch || r.employee_code.toLowerCase().includes(aSearch.toLowerCase()) || r.employee_name.toLowerCase().includes(aSearch.toLowerCase())
  );
  const aTotalAmount = filteredAdvances.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const aTotalPages = Math.max(1, Math.ceil(filteredAdvances.length / aPageSize));
  const paginatedAdvances = filteredAdvances.slice((aPage - 1) * aPageSize, aPage * aPageSize);

  const filteredOtherAllowances = oRecords.filter((r) =>
    !oSearch || r.employee_code.toLowerCase().includes(oSearch.toLowerCase()) || r.employee_name.toLowerCase().includes(oSearch.toLowerCase())
  );
  const oTotalAmount = filteredOtherAllowances.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const oTotalPages = Math.max(1, Math.ceil(filteredOtherAllowances.length / oPageSize));
  const paginatedOtherAllowances = filteredOtherAllowances.slice((oPage - 1) * oPageSize, oPage * oPageSize);

  const filteredParkingAllowances = paRecords.filter((r) =>
    !paSearch || r.employee_code.toLowerCase().includes(paSearch.toLowerCase()) || r.employee_name.toLowerCase().includes(paSearch.toLowerCase())
  );
  const paTotalAmount = filteredParkingAllowances.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const paTotalPages = Math.max(1, Math.ceil(filteredParkingAllowances.length / paPageSize));
  const paginatedParkingAllowances = filteredParkingAllowances.slice((paPage - 1) * paPageSize, paPage * paPageSize);

  const filteredLunchAllowances = laRecords.filter((r) =>
    !laSearch || r.employee_code.toLowerCase().includes(laSearch.toLowerCase()) || r.employee_name.toLowerCase().includes(laSearch.toLowerCase())
  );
  const laTotalAmount = filteredLunchAllowances.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const laTotalPages = Math.max(1, Math.ceil(filteredLunchAllowances.length / laPageSize));
  const paginatedLunchAllowances = filteredLunchAllowances.slice((laPage - 1) * laPageSize, laPage * laPageSize);

  const employeeSelectOptions = employeeOptions.map((employee) => ({
    value: employee.id,
    label: `${employee.employee_code} - ${employee.employee_name}`,
  }));

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
      <div className="bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-red-100">
          <span className="flex items-center gap-1.5 text-xs font-medium text-red-700">
            <ExclamationCircleIcon className="h-4 w-4" />
            {errState.errors.length} dòng không import được
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
            >
              <ArrowDownTrayIcon className="h-3 w-3" />
              Tải file lỗi để sửa
            </button>
            <button onClick={onClear} className="p-1 hover:bg-red-200 rounded-xl transition-colors">
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
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dữ liệu</h1>
        <p className="text-gray-900 mt-0.5 text-sm">Quản lý lương hoa hồng và phạt biên bản theo tháng/năm.</p>
      </div>

      {/* Toasts */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm">
          <CheckIcon className="h-4 w-4 flex-shrink-0" />{successMsg}
          <button className="ml-auto" onClick={() => setSuccessMsg(null)}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm">
          <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />{errorMsg}
          <button className="ml-auto" onClick={() => setErrorMsg(null)}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
          <div className="w-32">
            <SelectBox<number> label="Tháng" value={selectedMonth} options={MONTHS.map((m) => ({ value: m, label: `Tháng ${m}` }))} onChange={handleMonthChange} />
          </div>
          <div className="w-24">
            <SelectBox<number> label="Năm" value={selectedYear} options={YEARS.map((y) => ({ value: y, label: String(y) }))} onChange={handleYearChange} />
          </div>
          <button
            onClick={() => activeTab === 'commission' ? loadCommissions() : activeTab === 'penalty' ? loadPenalties() : activeTab === 'advance' ? loadAdvances() : activeTab === 'parking_allowance' ? loadParkingAllowances() : activeTab === 'lunch_allowance' ? loadLunchAllowances() : loadOtherAllowances()}
            disabled={loadingCommission || loadingPenalty || loadingAdvance || loadingO || loadingPa || loadingLa}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 ${(loadingCommission || loadingPenalty || loadingAdvance || loadingO || loadingPa || loadingLa) ? 'animate-spin' : ''}`} />
            Tải dữ liệu
          </button>
          <button
            onClick={handleLoadReport}
            disabled={reportLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-xl hover:bg-gray-900 disabled:opacity-60 transition-colors"
          >
            {reportLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
            Báo cáo
          </button>
        </div>
      </div>

      {reportSummary && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">Báo cáo tổng hợp tháng {reportSummary.month}/{reportSummary.year}</p>
            <span className="text-xs text-gray-500">Net điều chỉnh: {fmtMoney(reportSummary.net_adjustment)}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-primary-100 bg-primary-50 p-3">
              <p className="text-xs text-gray-500">Hoa hồng</p>
              <p className="text-sm font-semibold text-primary-700">{fmtMoney(reportSummary.commission_total)}</p>
              <p className="text-xs text-gray-500">{reportSummary.commission_count} bản ghi</p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-3">
              <p className="text-xs text-gray-500">Phạt biên bản</p>
              <p className="text-sm font-semibold text-red-600">{fmtMoney(reportSummary.penalty_total)}</p>
              <p className="text-xs text-gray-500">{reportSummary.penalty_count} bản ghi</p>
            </div>
            <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3">
              <p className="text-xs text-gray-500">Tạm ứng lương</p>
              <p className="text-sm font-semibold text-cyan-700">{fmtMoney(reportSummary.advance_total)}</p>
              <p className="text-xs text-gray-500">{reportSummary.advance_count} bản ghi</p>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
              <p className="text-xs text-gray-500">Phụ cấp khác</p>
              <p className="text-sm font-semibold text-violet-700">{fmtMoney(reportSummary.other_allowance_total)}</p>
              <p className="text-xs text-gray-500">{reportSummary.other_allowance_count} bản ghi</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100">
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
                <button onClick={handleDownloadCommissionTemplate} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                  <ArrowDownTrayIcon className="h-4 w-4" />Tải file mẫu
                </button>
                <button
                  onClick={() => {
                    setCAdding((prev) => !prev);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-primary-300 text-primary-700 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  {cAdding ? 'Đóng thêm mới' : 'Thêm'}
                </button>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-primary-300 text-primary-700 bg-primary-50 rounded-xl hover:bg-primary-100 cursor-pointer transition-colors">
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {cFile ? cFile.name : 'Chọn file Excel'}
                  <input ref={cFileRef} type="file" accept=".xlsx" className="hidden" onChange={handleCommissionFileChange} />
                </label>
                {cParsedRows && cParsedRows.filter((r) => !r.parseError).length > 0 && (
                  <button onClick={handleCommissionImport} disabled={cImporting} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-colors">
                    {cImporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                    {cImporting ? 'Đang import...' : `Xác nhận import (${cParsedRows.filter((r) => !r.parseError).length})`}
                  </button>
                )}
                {commissionLoaded && (
                  <div className="flex-1 relative min-w-48">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Tìm nhân viên..." value={cSearch} onChange={(e) => setCSearch(e.target.value)}
                      className="input-field w-full pl-9" />
                  </div>
                )}
              </div>
              {cAdding && (
                <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-7">
                      <SelectBox<number>
                        label="Mã nhân viên"
                        value={cCreateValues.employeeId}
                        options={employeeSelectOptions}
                        onChange={(value) => setCCreateValues((prev) => ({ ...prev, employeeId: value }))}
                        placeholder={loadingEmployees ? 'Đang tải nhân viên...' : 'Tìm mã nhân viên...'}
                        searchable
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium mb-1 text-gray-700">Số tiền</label>
                      <input
                        type="number"
                        min="0"
                        value={cCreateValues.amount}
                        onChange={(e) => setCCreateValues((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="Nhập số tiền"
                        className="input-field w-full"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <button
                        onClick={handleCAdd}
                        disabled={cCreating || loadingEmployees}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-60 w-full"
                      >
                        {cCreating ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                        Lưu
                      </button>
                      <button
                        onClick={() => {
                          setCAdding(false);
                          setCCreateValues({ employeeId: 0, amount: '' });
                        }}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50"
                      >
                        <XMarkIcon className="h-4 w-4" />Huỷ
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {cParseError && <p className="flex items-center gap-1 text-sm text-red-600"><ExclamationCircleIcon className="h-4 w-4" />{cParseError}</p>}
              {renderImportErrors(cImportErr, handleExportCommissionErrors, () => setCImportErr(null))}

              {/* Preview */}
              {cParsedRows && !cParsing && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Xem trước — {cParsedRows.length} dòng
                      {cParsedRows.filter((r) => r.parseError).length > 0 && <span className="text-red-500"> · {cParsedRows.filter((r) => r.parseError).length} lỗi</span>}
                    </span>
                    <span className="text-gray-500">Tháng {selectedMonth}/{selectedYear}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="table-header w-10">#</th>
                          <th className="table-header">Mã NV</th>
                          <th className="table-header text-right">Lương hoa hồng</th>
                          <th className="table-header">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {cParsedRows.map((row, i) => (
                          <tr key={row.rowIndex} className={row.parseError ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="table-cell text-gray-400 text-xs">{i + 1}</td>
                            <td className="table-cell font-mono font-medium text-gray-800">{row.employee_code}</td>
                            <td className="table-cell text-right text-gray-700">{row.amount > 0 ? row.amount.toLocaleString('vi-VN') + ' ₫' : '—'}</td>
                            <td className="table-cell">
                              {row.parseError
                                ? <span className="inline-flex items-center gap-1 text-xs text-red-600"><ExclamationCircleIcon className="h-3.5 w-3.5" />{row.parseError}</span>
                                : <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckIcon className="h-3.5 w-3.5" />Hợp lệ</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Commission list */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-700">
                    Danh sách hoa hồng — Tháng {selectedMonth}/{selectedYear}
                    <span className="ml-2 font-normal text-gray-500">{filteredCommissions.length} nhân viên</span>
                  </p>
                  <button 
                    onClick={handleDownloadCommissionData}
                    disabled={!commissionRecords.length}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Tải Excel
                  </button>
                </div>
                {loadingCommission ? renderLoading('primary') :
                 filteredCommissions.length === 0 ? renderEmpty(commissionRecords.length === 0 ? 'Chưa có dữ liệu hoa hồng tháng này.' : 'Không tìm thấy nhân viên.') : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="table-header w-10">#</th>
                          <th className="table-header">Nhân viên</th>
                          <th className="table-header text-right">Lương hoa hồng</th>
                          <th className="table-header text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {paginatedCommissions.map((rec, i) => {
                          const isEditing  = cEditingId  === rec.id;
                          const isDeleting = cDeletingId === rec.id;
                          return (
                            <tr key={rec.id} className={isDeleting ? 'bg-red-50' : 'hover:bg-gray-50 transition-colors'}>
                              <td className="table-cell text-gray-400 text-xs">{i + 1}</td>
                              <td className="table-cell">
                                <div className="flex items-center gap-3">
                                  {renderAvatar(rec.employee_name, 'bg-primary-50 text-primary-700')}
                                  <div><p className="font-medium text-gray-900">{rec.employee_name}</p><p className="text-xs text-gray-500 font-mono">{rec.employee_code}</p></div>
                                </div>
                              </td>
                              <td className="table-cell text-right">
                                {isEditing ? (
                                  <input type="text" value={cEditAmount} onChange={(e) => setCEditAmount(e.target.value)}
                                    className="input-field w-36 text-right" placeholder="0" />
                                ) : (
                                  <span className="font-medium text-gray-700">{fmtMoney(rec.amount)}</span>
                                )}
                              </td>
                              <td className="table-cell text-center">
                                {isDeleting ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-xs text-red-600">Xác nhận xoá?</span>
                                    <button onClick={() => handleCDelete(rec.id)} disabled={cDeleting} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60">
                                      {cDeleting ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Xoá
                                    </button>
                                    <button onClick={() => setCDeletingId(null)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleCSave(rec.id)} disabled={cSaving} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-60">
                                      {cSaving ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Lưu
                                    </button>
                                    <button onClick={cancelCEdit} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => startCEdit(rec)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 transition-colors">
                                      <PencilIcon className="h-3.5 w-3.5" />Sửa
                                    </button>
                                    <button onClick={() => { setCDeletingId(rec.id); setCEditingId(null); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
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
                {filteredCommissions.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-600">
                      Tổng số tiền ({filteredCommissions.length} nhân viên)
                    </span>
                    <span className="text-base font-semibold text-gray-900">{fmtMoney(cTotalAmount)}</span>
                  </div>
                )}
              </div>
              {filteredCommissions.length > 0 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={cPage}
                    totalPages={cTotalPages}
                    totalItems={filteredCommissions.length}
                    itemsPerPage={cPageSize}
                    onPageChange={setCPage}
                    onItemsPerPageChange={(n) => { setCPageSize(n); setCPage(1); }}
                  />
                </div>
              )}
            </>
          )}

          {/* ═══ TAB PHỤ CẤP KHÁC ═══ */}
          {activeTab === 'other_allowance' && (
            <>
              {/* Action bar */}
              <div className="flex flex-wrap gap-3 items-center">
                <button onClick={handleDownloadOtherAllowanceTemplate} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                  <ArrowDownTrayIcon className="h-4 w-4" />Tải file mẫu
                </button>
                <button
                  onClick={() => {
                    setOAdding((prev) => !prev);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-violet-300 text-violet-700 bg-violet-50 rounded-xl hover:bg-violet-100 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  {oAdding ? 'Đóng thêm mới' : 'Thêm'}
                </button>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-violet-300 text-violet-700 bg-violet-50 rounded-xl hover:bg-violet-100 cursor-pointer transition-colors">
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {oFile ? oFile.name : 'Chọn file Excel'}
                  <input ref={oFileRef} type="file" accept=".xlsx" className="hidden" onChange={handleOtherAllowanceFileChange} />
                </label>
                {oParsedRows && oParsedRows.filter((r) => !r.parseError).length > 0 && (
                  <button onClick={handleOtherAllowanceImport} disabled={oImporting} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-colors">
                    {oImporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                    {oImporting ? 'Đang import...' : `Xác nhận import (${oParsedRows.filter((r) => !r.parseError).length})`}
                  </button>
                )}
                {oLoaded && (
                  <div className="flex-1 relative min-w-48">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Tìm nhân viên..." value={oSearch} onChange={(e) => setOSearch(e.target.value)}
                      className="input-field w-full pl-9" />
                  </div>
                )}
              </div>
              {oAdding && (
                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-5">
                      <SelectBox<number>
                        label="Mã nhân viên"
                        value={oCreateValues.employeeId}
                        options={employeeSelectOptions}
                        onChange={(value) => setOCreateValues((prev) => ({ ...prev, employeeId: value }))}
                        placeholder={loadingEmployees ? 'Đang tải nhân viên...' : 'Tìm mã nhân viên...'}
                        searchable
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium mb-1 text-gray-700">Số tiền</label>
                      <input
                        type="number"
                        min="0"
                        value={oCreateValues.amount}
                        onChange={(e) => setOCreateValues((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="Nhập số tiền"
                        className="input-field w-full"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1 text-gray-700">Mô tả</label>
                      <input
                        type="text"
                        value={oCreateValues.description}
                        onChange={(e) => setOCreateValues((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Mô tả phụ cấp"
                        className="input-field w-full"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <button
                        onClick={handleOAdd}
                        disabled={oCreating || loadingEmployees}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-60 w-full"
                      >
                        {oCreating ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                        Lưu
                      </button>
                      <button
                        onClick={() => {
                          setOAdding(false);
                          setOCreateValues({ employeeId: 0, amount: '', description: '' });
                        }}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50"
                      >
                        <XMarkIcon className="h-4 w-4" />Huỷ
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {oParseError && <p className="flex items-center gap-1 text-sm text-red-600"><ExclamationCircleIcon className="h-4 w-4" />{oParseError}</p>}
              {renderImportErrors(oImportErr, handleExportOtherAllowanceErrors, () => setOImportErr(null))}

              {/* Preview */}
              {oParsedRows && !oParsing && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Xem trước — {oParsedRows.length} dòng
                      {oParsedRows.filter((r) => r.parseError).length > 0 && <span className="text-red-500"> · {oParsedRows.filter((r) => r.parseError).length} lỗi</span>}
                    </span>
                    <span className="text-gray-500">Tháng {selectedMonth}/{selectedYear}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="table-header w-10">#</th>
                          <th className="table-header">Mã NV</th>
                          <th className="table-header text-right">Số tiền</th>
                          <th className="table-header">Mô tả phụ cấp</th>
                          <th className="table-header">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {oParsedRows.map((row, i) => (
                          <tr key={row.rowIndex} className={row.parseError ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="table-cell text-gray-400 text-xs">{i + 1}</td>
                            <td className="table-cell font-mono font-medium text-gray-800">{row.employee_code}</td>
                            <td className="table-cell text-right text-violet-700 font-medium">{row.amount > 0 ? row.amount.toLocaleString('vi-VN') + ' ₫' : '—'}</td>
                            <td className="table-cell text-gray-600 max-w-xs truncate">{row.description || '—'}</td>
                            <td className="table-cell">
                              {row.parseError
                                ? <span className="inline-flex items-center gap-1 text-xs text-red-600"><ExclamationCircleIcon className="h-3.5 w-3.5" />{row.parseError}</span>
                                : <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckIcon className="h-3.5 w-3.5" />Hợp lệ</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* OtherAllowance list */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    Danh sách phụ cấp khác — Tháng {selectedMonth}/{selectedYear}
                    <span className="ml-2 font-normal text-gray-500">{filteredOtherAllowances.length} nhân viên</span>
                  </p>
                </div>
                {loadingO ? renderLoading('primary') :
                 filteredOtherAllowances.length === 0 ? renderEmpty(oRecords.length === 0 ? 'Chưa có dữ liệu phụ cấp tháng này.' : 'Không tìm thấy nhân viên.') : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="table-header w-10">#</th>
                          <th className="table-header">Nhân viên</th>
                          <th className="table-header text-right">Số tiền</th>
                          <th className="table-header">Mô tả phụ cấp</th>
                          <th className="table-header text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {paginatedOtherAllowances.map((rec, i) => {
                          const isEditing  = oEditingId  === rec.id;
                          const isDeleting = oDeletingId === rec.id;
                          return (
                            <tr key={rec.id} className={isDeleting ? 'bg-red-50' : 'hover:bg-gray-50 transition-colors'}>
                              <td className="table-cell text-gray-400 text-xs">{i + 1}</td>
                              <td className="table-cell">
                                <div className="flex items-center gap-3">
                                  {renderAvatar(rec.employee_name, 'bg-violet-50 text-violet-700')}
                                  <div><p className="font-medium text-gray-900">{rec.employee_name}</p><p className="text-xs text-gray-500 font-mono">{rec.employee_code}</p></div>
                                </div>
                              </td>
                              <td className="table-cell text-right">
                                {isEditing ? (
                                  <input type="text" value={oEditValues.amount} onChange={(e) => setOEditValues((v) => ({ ...v, amount: e.target.value }))}
                                    className="input-field w-36 text-right" placeholder="0" />
                                ) : (
                                  <span className="font-medium text-violet-700">{fmtMoney(rec.amount)}</span>
                                )}
                              </td>
                              <td className="table-cell">
                                {isEditing ? (
                                  <input type="text" value={oEditValues.description} onChange={(e) => setOEditValues((v) => ({ ...v, description: e.target.value }))}
                                    className="input-field w-full" placeholder="Mô tả phụ cấp..." />
                                ) : (
                                  <span className="text-gray-700">{rec.description || '—'}</span>
                                )}
                              </td>
                              <td className="table-cell text-center">
                                {isDeleting ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-xs text-red-600">Xác nhận xoá?</span>
                                    <button onClick={() => handleODelete(rec.id)} disabled={oDeleting} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60">
                                      {oDeleting ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Xoá
                                    </button>
                                    <button onClick={() => setODeletingId(null)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleOSave(rec.id)} disabled={oSaving} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-60">
                                      {oSaving ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Lưu
                                    </button>
                                    <button onClick={cancelOEdit} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => startOEdit(rec)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 transition-colors">
                                      <PencilIcon className="h-3.5 w-3.5" />Sửa
                                    </button>
                                    <button onClick={() => { setODeletingId(rec.id); setOEditingId(null); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
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
                {filteredOtherAllowances.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-600">
                      Tổng số tiền ({filteredOtherAllowances.length} nhân viên)
                    </span>
                    <span className="text-base font-semibold text-gray-900">{fmtMoney(oTotalAmount)}</span>
                  </div>
                )}
              </div>
              {filteredOtherAllowances.length > 0 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={oPage}
                    totalPages={oTotalPages}
                    totalItems={filteredOtherAllowances.length}
                    itemsPerPage={oPageSize}
                    onPageChange={setOPage}
                    onItemsPerPageChange={(n) => { setOPageSize(n); setOPage(1); }}
                  />
                </div>
              )}
            </>
          )}

          {/* ═══ TAB PHỤ CẤP GỬI XE ═══ */}
          {activeTab === 'parking_allowance' && (
            <>
              {/* Action bar */}
              <div className="flex flex-wrap gap-3 items-center">
                <button onClick={handleDownloadParkingAllowanceTemplate} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                  <ArrowDownTrayIcon className="h-4 w-4" />Tải file mẫu
                </button>
                <button
                  onClick={() => {
                    setPaAdding((prev) => !prev);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-amber-300 text-amber-700 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  {paAdding ? 'Đóng thêm mới' : 'Thêm'}
                </button>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-amber-300 text-amber-700 bg-amber-50 rounded-xl hover:bg-amber-100 cursor-pointer transition-colors">
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {paFile ? paFile.name : 'Chọn file Excel'}
                  <input ref={paFileRef} type="file" accept=".xlsx" className="hidden" onChange={handleParkingAllowanceFileChange} />
                </label>
                {paParsedRows && paParsedRows.filter((r) => !r.parseError).length > 0 && (
                  <button onClick={handleParkingAllowanceImport} disabled={paImporting} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-60 transition-colors">
                    {paImporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                    {paImporting ? 'Đang import...' : `Xác nhận import (${paParsedRows.filter((r) => !r.parseError).length})`}
                  </button>
                )}
                {paLoaded && (
                  <button
                    onClick={handleFillRemainingZero}
                    disabled={paFillingZero}
                    title="Đặt phụ cấp gửi xe = 0 cho những nhân viên chưa có trong danh sách tháng này"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-60 transition-colors"
                  >
                    {paFillingZero ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                    {paFillingZero ? 'Đang xử lý...' : 'Đặt 0 cho người còn lại'}
                  </button>
                )}
                {paLoaded && (
                  <div className="flex-1 relative min-w-48">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Tìm nhân viên..." value={paSearch} onChange={(e) => setPaSearch(e.target.value)}
                      className="input-field w-full pl-9" />
                  </div>
                )}
              </div>
              {paAdding && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-5">
                      <SelectBox<number>
                        label="Mã nhân viên"
                        value={paCreateValues.employeeId}
                        options={employeeSelectOptions}
                        onChange={(value) => setPaCreateValues((prev) => ({ ...prev, employeeId: value }))}
                        placeholder={loadingEmployees ? 'Đang tải nhân viên...' : 'Tìm mã nhân viên...'}
                        searchable
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium mb-1 text-gray-700">Số tiền phụ cấp gửi xe</label>
                      <input
                        type="number"
                        min="0"
                        value={paCreateValues.amount}
                        onChange={(e) => setPaCreateValues((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="Nhập số tiền"
                        className="input-field w-full"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1 text-gray-700">Ghi chú</label>
                      <input
                        type="text"
                        value={paCreateValues.notes}
                        onChange={(e) => setPaCreateValues((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Ghi chú"
                        className="input-field w-full"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <button
                        onClick={handlePaAdd}
                        disabled={paCreating || loadingEmployees}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-60 w-full"
                      >
                        {paCreating ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                        Lưu
                      </button>
                      <button
                        onClick={() => {
                          setPaAdding(false);
                          setPaCreateValues({ employeeId: 0, amount: '', notes: '' });
                        }}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50"
                      >
                        <XMarkIcon className="h-4 w-4" />Huỷ
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {paParseError && <p className="flex items-center gap-1 text-sm text-red-600"><ExclamationCircleIcon className="h-4 w-4" />{paParseError}</p>}
              {renderImportErrors(paImportErr, handleExportParkingAllowanceErrors, () => setPaImportErr(null))}

              {/* Preview */}
              {paParsedRows && !paParsing && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Xem trước — {paParsedRows.length} dòng
                      {paParsedRows.filter((r) => r.parseError).length > 0 && <span className="text-red-500"> · {paParsedRows.filter((r) => r.parseError).length} lỗi</span>}
                    </span>
                    <span className="text-gray-500">Tháng {selectedMonth}/{selectedYear}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="table-header w-10">#</th>
                          <th className="table-header">Mã NV</th>
                          <th className="table-header text-right">Số tiền</th>
                          <th className="table-header">Ghi chú</th>
                          <th className="table-header">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {paParsedRows.map((row, i) => (
                          <tr key={row.rowIndex} className={row.parseError ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="table-cell text-gray-400 text-xs">{i + 1}</td>
                            <td className="table-cell font-mono font-medium text-gray-800">{row.employee_code}</td>
                            <td className="table-cell text-right text-amber-700 font-medium">{row.amount > 0 ? row.amount.toLocaleString('vi-VN') + ' ₫' : '—'}</td>
                            <td className="table-cell text-gray-600 max-w-xs truncate">{row.notes || '—'}</td>
                            <td className="table-cell">
                              {row.parseError
                                ? <span className="inline-flex items-center gap-1 text-xs text-red-600"><ExclamationCircleIcon className="h-3.5 w-3.5" />{row.parseError}</span>
                                : <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckIcon className="h-3.5 w-3.5" />Hợp lệ</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ParkingAllowanceOverride list */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    Danh sách phụ cấp gửi xe — Tháng {selectedMonth}/{selectedYear}
                    <span className="ml-2 font-normal text-gray-500">{filteredParkingAllowances.length} nhân viên</span>
                  </p>
                </div>
                {loadingPa ? renderLoading('primary') :
                 filteredParkingAllowances.length === 0 ? renderEmpty(paRecords.length === 0 ? 'Chưa có dữ liệu phụ cấp gửi xe tháng này.' : 'Không tìm thấy nhân viên.') : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="table-header w-10">#</th>
                          <th className="table-header">Nhân viên</th>
                          <th className="table-header text-right">Số tiền</th>
                          <th className="table-header">Ghi chú</th>
                          <th className="table-header text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {paginatedParkingAllowances.map((rec, i) => {
                          const isEditing  = paEditingId  === rec.id;
                          const isDeleting = paDeletingId === rec.id;
                          return (
                            <tr key={rec.id} className={isDeleting ? 'bg-red-50' : 'hover:bg-gray-50 transition-colors'}>
                              <td className="table-cell text-gray-400 text-xs">{i + 1}</td>
                              <td className="table-cell">
                                <div className="flex items-center gap-3">
                                  {renderAvatar(rec.employee_name, 'bg-amber-50 text-amber-700')}
                                  <div><p className="font-medium text-gray-900">{rec.employee_name}</p><p className="text-xs text-gray-500 font-mono">{rec.employee_code}</p></div>
                                </div>
                              </td>
                              <td className="table-cell text-right">
                                {isEditing ? (
                                  <input type="text" value={paEditValues.amount} onChange={(e) => setPaEditValues((v) => ({ ...v, amount: e.target.value }))}
                                    className="input-field w-36 text-right" placeholder="0" />
                                ) : (
                                  <span className="font-medium text-amber-700">{fmtMoney(rec.amount)}</span>
                                )}
                              </td>
                              <td className="table-cell">
                                {isEditing ? (
                                  <input type="text" value={paEditValues.notes} onChange={(e) => setPaEditValues((v) => ({ ...v, notes: e.target.value }))}
                                    className="input-field w-full" placeholder="Ghi chú..." />
                                ) : (
                                  <span className="text-gray-700">{rec.notes || '—'}</span>
                                )}
                              </td>
                              <td className="table-cell text-center">
                                {isDeleting ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-xs text-red-600">Xác nhận xoá?</span>
                                    <button onClick={() => handlePaDelete(rec.id)} disabled={paDeleting} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60">
                                      {paDeleting ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Xoá
                                    </button>
                                    <button onClick={() => setPaDeletingId(null)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handlePaSave(rec.id)} disabled={paSaving} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-60">
                                      {paSaving ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Lưu
                                    </button>
                                    <button onClick={cancelPaEdit} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => startPaEdit(rec)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors">
                                      <PencilIcon className="h-3.5 w-3.5" />Sửa
                                    </button>
                                    <button onClick={() => { setPaDeletingId(rec.id); setPaEditingId(null); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
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
                {filteredParkingAllowances.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-600">
                      Tổng số tiền ({filteredParkingAllowances.length} nhân viên)
                    </span>
                    <span className="text-base font-semibold text-gray-900">{fmtMoney(paTotalAmount)}</span>
                  </div>
                )}
              </div>
              {filteredParkingAllowances.length > 0 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={paPage}
                    totalPages={paTotalPages}
                    totalItems={filteredParkingAllowances.length}
                    itemsPerPage={paPageSize}
                    onPageChange={setPaPage}
                    onItemsPerPageChange={(n) => { setPaPageSize(n); setPaPage(1); }}
                  />
                </div>
              )}
            </>
          )}

          {/* ═══ TAB PHỤ CẤP ĂN TRƯA ═══ */}
          {activeTab === 'lunch_allowance' && (
            <>
              {/* Action bar */}
              <div className="flex flex-wrap gap-3 items-center">
                <button onClick={handleDownloadLunchAllowanceTemplate} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                  <ArrowDownTrayIcon className="h-4 w-4" />Tải file mẫu
                </button>
                <button
                  onClick={() => {
                    setLaAdding((prev) => !prev);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-emerald-300 text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  {laAdding ? 'Đóng thêm mới' : 'Thêm'}
                </button>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-emerald-300 text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 cursor-pointer transition-colors">
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {laFile ? laFile.name : 'Chọn file Excel'}
                  <input ref={laFileRef} type="file" accept=".xlsx" className="hidden" onChange={handleLunchAllowanceFileChange} />
                </label>
                {laParsedRows && laParsedRows.filter((r) => !r.parseError).length > 0 && (
                  <button onClick={handleLunchAllowanceImport} disabled={laImporting} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                    {laImporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                    {laImporting ? 'Đang import...' : `Xác nhận import (${laParsedRows.filter((r) => !r.parseError).length})`}
                  </button>
                )}
                {laLoaded && (
                  <button
                    onClick={handleLaSyncCurrent}
                    disabled={laSyncing}
                    title="Lấy phụ cấp ăn trưa đang được tính tự động cho tất cả nhân viên đang hoạt động CHƯA có trong danh sách của tháng này (không ghi đè các dòng đã có sẵn)"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-60 transition-colors"
                  >
                    {laSyncing ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                    {laSyncing ? 'Đang xử lý...' : 'Đồng bộ dữ liệu hiện tại'}
                  </button>
                )}
                {laLoaded && (
                  <div className="flex-1 relative min-w-48">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Tìm nhân viên..." value={laSearch} onChange={(e) => setLaSearch(e.target.value)}
                      className="input-field w-full pl-9" />
                  </div>
                )}
              </div>
              {laAdding && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-5">
                      <SelectBox<number>
                        label="Mã nhân viên"
                        value={laCreateValues.employeeId}
                        options={employeeSelectOptions}
                        onChange={(value) => setLaCreateValues((prev) => ({ ...prev, employeeId: value }))}
                        placeholder={loadingEmployees ? 'Đang tải nhân viên...' : 'Tìm mã nhân viên...'}
                        searchable
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium mb-1 text-gray-700">Số tiền phụ cấp ăn trưa</label>
                      <input
                        type="number"
                        min="0"
                        value={laCreateValues.amount}
                        onChange={(e) => setLaCreateValues((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="Nhập số tiền"
                        className="input-field w-full"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1 text-gray-700">Ghi chú</label>
                      <input
                        type="text"
                        value={laCreateValues.notes}
                        onChange={(e) => setLaCreateValues((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Ghi chú"
                        className="input-field w-full"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <button
                        onClick={handleLaAdd}
                        disabled={laCreating || loadingEmployees}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-60 w-full"
                      >
                        {laCreating ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                        Lưu
                      </button>
                      <button
                        onClick={() => {
                          setLaAdding(false);
                          setLaCreateValues({ employeeId: 0, amount: '', notes: '' });
                        }}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50"
                      >
                        <XMarkIcon className="h-4 w-4" />Huỷ
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {laParseError && <p className="flex items-center gap-1 text-sm text-red-600"><ExclamationCircleIcon className="h-4 w-4" />{laParseError}</p>}
              {renderImportErrors(laImportErr, handleExportLunchAllowanceErrors, () => setLaImportErr(null))}

              {/* Preview */}
              {laParsedRows && !laParsing && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Xem trước — {laParsedRows.length} dòng
                      {laParsedRows.filter((r) => r.parseError).length > 0 && <span className="text-red-500"> · {laParsedRows.filter((r) => r.parseError).length} lỗi</span>}
                    </span>
                    <span className="text-gray-500">Tháng {selectedMonth}/{selectedYear}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="table-header w-10">#</th>
                          <th className="table-header">Mã NV</th>
                          <th className="table-header text-right">Số tiền</th>
                          <th className="table-header">Ghi chú</th>
                          <th className="table-header">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {laParsedRows.map((row, i) => (
                          <tr key={row.rowIndex} className={row.parseError ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="table-cell text-gray-400 text-xs">{i + 1}</td>
                            <td className="table-cell font-mono font-medium text-gray-800">{row.employee_code}</td>
                            <td className="table-cell text-right text-emerald-700 font-medium">{row.amount > 0 ? row.amount.toLocaleString('vi-VN') + ' ₫' : '—'}</td>
                            <td className="table-cell text-gray-600 max-w-xs truncate">{row.notes || '—'}</td>
                            <td className="table-cell">
                              {row.parseError
                                ? <span className="inline-flex items-center gap-1 text-xs text-red-600"><ExclamationCircleIcon className="h-3.5 w-3.5" />{row.parseError}</span>
                                : <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckIcon className="h-3.5 w-3.5" />Hợp lệ</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* LunchAllowanceOverride list */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    Danh sách phụ cấp ăn trưa — Tháng {selectedMonth}/{selectedYear}
                    <span className="ml-2 font-normal text-gray-500">{filteredLunchAllowances.length} nhân viên</span>
                  </p>
                </div>
                {loadingLa ? renderLoading('primary') :
                 filteredLunchAllowances.length === 0 ? renderEmpty(laRecords.length === 0 ? 'Chưa có dữ liệu phụ cấp ăn trưa tháng này.' : 'Không tìm thấy nhân viên.') : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="table-header w-10">#</th>
                          <th className="table-header">Nhân viên</th>
                          <th className="table-header text-right">Số tiền</th>
                          <th className="table-header">Ghi chú</th>
                          <th className="table-header text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {paginatedLunchAllowances.map((rec, i) => {
                          const isEditing  = laEditingId  === rec.id;
                          const isDeleting = laDeletingId === rec.id;
                          return (
                            <tr key={rec.id} className={isDeleting ? 'bg-red-50' : 'hover:bg-gray-50 transition-colors'}>
                              <td className="table-cell text-gray-400 text-xs">{i + 1}</td>
                              <td className="table-cell">
                                <div className="flex items-center gap-3">
                                  {renderAvatar(rec.employee_name, 'bg-emerald-50 text-emerald-700')}
                                  <div><p className="font-medium text-gray-900">{rec.employee_name}</p><p className="text-xs text-gray-500 font-mono">{rec.employee_code}</p></div>
                                </div>
                              </td>
                              <td className="table-cell text-right">
                                {isEditing ? (
                                  <input type="text" value={laEditValues.amount} onChange={(e) => setLaEditValues((v) => ({ ...v, amount: e.target.value }))}
                                    className="input-field w-36 text-right" placeholder="0" />
                                ) : (
                                  <span className="font-medium text-emerald-700">{fmtMoney(rec.amount)}</span>
                                )}
                              </td>
                              <td className="table-cell">
                                {isEditing ? (
                                  <input type="text" value={laEditValues.notes} onChange={(e) => setLaEditValues((v) => ({ ...v, notes: e.target.value }))}
                                    className="input-field w-full" placeholder="Ghi chú..." />
                                ) : (
                                  <span className="text-gray-700">{rec.notes || '—'}</span>
                                )}
                              </td>
                              <td className="table-cell text-center">
                                {isDeleting ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-xs text-red-600">Xác nhận xoá?</span>
                                    <button onClick={() => handleLaDelete(rec.id)} disabled={laDeleting} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60">
                                      {laDeleting ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Xoá
                                    </button>
                                    <button onClick={() => setLaDeletingId(null)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleLaSave(rec.id)} disabled={laSaving} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-60">
                                      {laSaving ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Lưu
                                    </button>
                                    <button onClick={cancelLaEdit} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => startLaEdit(rec)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors">
                                      <PencilIcon className="h-3.5 w-3.5" />Sửa
                                    </button>
                                    <button onClick={() => { setLaDeletingId(rec.id); setLaEditingId(null); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
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
                {filteredLunchAllowances.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-600">
                      Tổng số tiền ({filteredLunchAllowances.length} nhân viên)
                    </span>
                    <span className="text-base font-semibold text-gray-900">{fmtMoney(laTotalAmount)}</span>
                  </div>
                )}
              </div>
              {filteredLunchAllowances.length > 0 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={laPage}
                    totalPages={laTotalPages}
                    totalItems={filteredLunchAllowances.length}
                    itemsPerPage={laPageSize}
                    onPageChange={setLaPage}
                    onItemsPerPageChange={(n) => { setLaPageSize(n); setLaPage(1); }}
                  />
                </div>
              )}
            </>
          )}

          {/* ═══ TAB TẠM ỨNG LƯƠNG ═══ */}
          {activeTab === 'advance' && (
            <>
              {/* Action bar */}
              <div className="flex flex-wrap gap-3 items-center">
                <button onClick={handleDownloadAdvanceTemplate} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                  <ArrowDownTrayIcon className="h-4 w-4" />Tải file mẫu
                </button>
                <button
                  onClick={() => {
                    setAAdding((prev) => !prev);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-primary-300 text-primary-700 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  {aAdding ? 'Đóng thêm mới' : 'Thêm'}
                </button>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-primary-300 text-primary-700 bg-primary-50 rounded-xl hover:bg-primary-100 cursor-pointer transition-colors">
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {aFile ? aFile.name : 'Chọn file Excel'}
                  <input ref={aFileRef} type="file" accept=".xlsx" className="hidden" onChange={handleAdvanceFileChange} />
                </label>
                {aParsedRows && aParsedRows.filter((r) => !r.parseError).length > 0 && (
                  <button onClick={handleAdvanceImport} disabled={aImporting} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-colors">
                    {aImporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                    {aImporting ? 'Đang import...' : `Xác nhận import (${aParsedRows.filter((r) => !r.parseError).length})`}
                  </button>
                )}
                {advanceLoaded && (
                  <div className="flex-1 relative min-w-48">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Tìm nhân viên..." value={aSearch} onChange={(e) => setASearch(e.target.value)}
                      className="input-field w-full pl-9" />
                  </div>
                )}
              </div>
              {aAdding && (
                <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-7">
                      <SelectBox<number>
                        label="Mã nhân viên"
                        value={aCreateValues.employeeId}
                        options={employeeSelectOptions}
                        onChange={(value) => setACreateValues((prev) => ({ ...prev, employeeId: value }))}
                        placeholder={loadingEmployees ? 'Đang tải nhân viên...' : 'Tìm mã nhân viên...'}
                        searchable
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium mb-1 text-gray-700">Số tiền tạm ứng</label>
                      <input
                        type="number"
                        min="0"
                        value={aCreateValues.amount}
                        onChange={(e) => setACreateValues((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="Nhập số tiền"
                        className="input-field w-full"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <button
                        onClick={handleAAdd}
                        disabled={aCreating || loadingEmployees}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-60 w-full"
                      >
                        {aCreating ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                        Lưu
                      </button>
                      <button
                        onClick={() => {
                          setAAdding(false);
                          setACreateValues({ employeeId: 0, amount: '' });
                        }}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50"
                      >
                        <XMarkIcon className="h-4 w-4" />Huỷ
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {aParseError && <p className="flex items-center gap-1 text-sm text-red-600"><ExclamationCircleIcon className="h-4 w-4" />{aParseError}</p>}
              {renderImportErrors(aImportErr, handleExportAdvanceErrors, () => setAImportErr(null))}

              {/* Preview */}
              {aParsedRows && !aParsing && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Xem trước — {aParsedRows.length} dòng
                      {aParsedRows.filter((r) => r.parseError).length > 0 && <span className="text-red-500"> · {aParsedRows.filter((r) => r.parseError).length} lỗi</span>}
                    </span>
                    <span className="text-gray-500">Tháng {selectedMonth}/{selectedYear}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="table-header w-10">#</th>
                          <th className="table-header">Mã NV</th>
                          <th className="table-header text-right">Số tiền tạm ứng</th>
                          <th className="table-header">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {aParsedRows.map((row, i) => (
                          <tr key={row.rowIndex} className={row.parseError ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="table-cell text-gray-400 text-xs">{i + 1}</td>
                            <td className="table-cell font-mono font-medium text-gray-800">{row.employee_code}</td>
                            <td className="table-cell text-right text-primary-700 font-medium">{row.amount > 0 ? row.amount.toLocaleString('vi-VN') + ' ₫' : '—'}</td>
                            <td className="table-cell">
                              {row.parseError
                                ? <span className="inline-flex items-center gap-1 text-xs text-red-600"><ExclamationCircleIcon className="h-3.5 w-3.5" />{row.parseError}</span>
                                : <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckIcon className="h-3.5 w-3.5" />Hợp lệ</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Advance list */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    Danh sách tạm ứng — Tháng {selectedMonth}/{selectedYear}
                    <span className="ml-2 font-normal text-gray-500">{filteredAdvances.length} nhân viên</span>
                  </p>
                </div>
                {loadingAdvance ? renderLoading('primary') :
                 filteredAdvances.length === 0 ? renderEmpty(advanceRecords.length === 0 ? 'Chưa có dữ liệu tạm ứng tháng này.' : 'Không tìm thấy nhân viên.') : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="table-header w-10">#</th>
                          <th className="table-header">Nhân viên</th>
                          <th className="table-header text-right">Số tiền tạm ứng</th>
                          <th className="table-header text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {paginatedAdvances.map((rec, i) => {
                          const isEditing  = aEditingId  === rec.id;
                          const isDeleting = aDeletingId === rec.id;
                          return (
                            <tr key={rec.id} className={isDeleting ? 'bg-red-50' : 'hover:bg-gray-50 transition-colors'}>
                              <td className="table-cell text-gray-400 text-xs">{i + 1}</td>
                              <td className="table-cell">
                                <div className="flex items-center gap-3">
                                  {renderAvatar(rec.employee_name, 'bg-primary-50 text-primary-700')}
                                  <div><p className="font-medium text-gray-900">{rec.employee_name}</p><p className="text-xs text-gray-500 font-mono">{rec.employee_code}</p></div>
                                </div>
                              </td>
                              <td className="table-cell text-right">
                                {isEditing ? (
                                  <input type="text" value={aEditAmount} onChange={(e) => setAEditAmount(e.target.value)}
                                    className="input-field w-36 text-right" placeholder="0" />
                                ) : (
                                  <span className="font-medium text-primary-700">{fmtMoney(rec.amount)}</span>
                                )}
                              </td>
                              <td className="table-cell text-center">
                                {isDeleting ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-xs text-red-600">Xác nhận xoá?</span>
                                    <button onClick={() => handleADelete(rec.id)} disabled={aDeleting} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60">
                                      {aDeleting ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Xoá
                                    </button>
                                    <button onClick={() => setADeletingId(null)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleASave(rec.id)} disabled={aSaving} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-60">
                                      {aSaving ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Lưu
                                    </button>
                                    <button onClick={cancelAEdit} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => startAEdit(rec)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 transition-colors">
                                      <PencilIcon className="h-3.5 w-3.5" />Sửa
                                    </button>
                                    <button onClick={() => { setADeletingId(rec.id); setAEditingId(null); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
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
                {filteredAdvances.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-600">
                      Tổng số tiền ({filteredAdvances.length} nhân viên)
                    </span>
                    <span className="text-base font-semibold text-gray-900">{fmtMoney(aTotalAmount)}</span>
                  </div>
                )}
              </div>
              {filteredAdvances.length > 0 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={aPage}
                    totalPages={aTotalPages}
                    totalItems={filteredAdvances.length}
                    itemsPerPage={aPageSize}
                    onPageChange={setAPage}
                    onItemsPerPageChange={(n) => { setAPageSize(n); setAPage(1); }}
                  />
                </div>
              )}
            </>
          )}

          {/* ═══ TAB PHẠT BIÊN BẢN ═══ */}
          {activeTab === 'penalty' && (
            <>
              {/* Action bar */}
              <div className="flex flex-wrap gap-3 items-center">
                <button onClick={handleDownloadPenaltyTemplate} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                  <ArrowDownTrayIcon className="h-4 w-4" />Tải file mẫu
                </button>
                <button
                  onClick={() => {
                    setPAdding((prev) => !prev);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-red-300 text-red-700 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  {pAdding ? 'Đóng thêm mới' : 'Thêm'}
                </button>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-red-300 text-red-700 bg-red-50 rounded-xl hover:bg-red-100 cursor-pointer transition-colors">
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {pFile ? pFile.name : 'Chọn file Excel'}
                  <input ref={pFileRef} type="file" accept=".xlsx" className="hidden" onChange={handlePenaltyFileChange} />
                </label>
                {pParsedRows && pParsedRows.filter((r) => !r.parseError).length > 0 && (
                  <button onClick={handlePenaltyImport} disabled={pImporting} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors">
                    {pImporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                    {pImporting ? 'Đang import...' : `Xác nhận import (${pParsedRows.filter((r) => !r.parseError).length})`}
                  </button>
                )}
                {penaltyLoaded && (
                  <div className="flex-1 relative min-w-48">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Tìm nhân viên..." value={pSearch} onChange={(e) => setPSearch(e.target.value)}
                      className="input-field w-full pl-9" />
                  </div>
                )}
              </div>
              {pAdding && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-5">
                      <SelectBox<number>
                        label="Mã nhân viên"
                        value={pCreateValues.employeeId}
                        options={employeeSelectOptions}
                        onChange={(value) => setPCreateValues((prev) => ({ ...prev, employeeId: value }))}
                        placeholder={loadingEmployees ? 'Đang tải nhân viên...' : 'Tìm mã nhân viên...'}
                        searchable
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium mb-1 text-gray-700">Số tiền phạt</label>
                      <input
                        type="number"
                        min="0"
                        value={pCreateValues.amount}
                        onChange={(e) => setPCreateValues((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="Nhập số tiền"
                        className="input-field w-full"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1 text-gray-700">Lý do</label>
                      <input
                        type="text"
                        value={pCreateValues.reason}
                        onChange={(e) => setPCreateValues((prev) => ({ ...prev, reason: e.target.value }))}
                        placeholder="Lý do vi phạm"
                        className="input-field w-full"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <button
                        onClick={handlePAdd}
                        disabled={pCreating || loadingEmployees}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60 w-full"
                      >
                        {pCreating ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                        Lưu
                      </button>
                      <button
                        onClick={() => {
                          setPAdding(false);
                          setPCreateValues({ employeeId: 0, amount: '', reason: '' });
                        }}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50"
                      >
                        <XMarkIcon className="h-4 w-4" />Huỷ
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {pParseError && <p className="flex items-center gap-1 text-sm text-red-600"><ExclamationCircleIcon className="h-4 w-4" />{pParseError}</p>}
              {renderImportErrors(pImportErr, handleExportPenaltyErrors, () => setPImportErr(null))}

              {/* Preview */}
              {pParsedRows && !pParsing && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Xem trước — {pParsedRows.length} dòng
                      {pParsedRows.filter((r) => r.parseError).length > 0 && <span className="text-red-500"> · {pParsedRows.filter((r) => r.parseError).length} lỗi</span>}
                    </span>
                    <span className="text-gray-500">Tháng {selectedMonth}/{selectedYear}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="table-header w-10">#</th>
                          <th className="table-header">Mã NV</th>
                          <th className="table-header text-right">Số tiền phạt</th>
                          <th className="table-header">Lý do</th>
                          <th className="table-header">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {pParsedRows.map((row, i) => (
                          <tr key={row.rowIndex} className={row.parseError ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="table-cell text-gray-400 text-xs">{i + 1}</td>
                            <td className="table-cell font-mono font-medium text-gray-800">{row.employee_code}</td>
                            <td className="table-cell text-right text-red-600 font-medium">{row.amount > 0 ? row.amount.toLocaleString('vi-VN') + ' ₫' : '—'}</td>
                            <td className="table-cell text-gray-600 max-w-xs truncate">{row.reason || '—'}</td>
                            <td className="table-cell">
                              {row.parseError
                                ? <span className="inline-flex items-center gap-1 text-xs text-red-600"><ExclamationCircleIcon className="h-3.5 w-3.5" />{row.parseError}</span>
                                : <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckIcon className="h-3.5 w-3.5" />Hợp lệ</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Penalty list */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-700">
                    Danh sách phạt biên bản — Tháng {selectedMonth}/{selectedYear}
                    <span className="ml-2 font-normal text-gray-500">{filteredPenalties.length} bản ghi</span>
                  </p>
                  <button 
                    onClick={handleDownloadPenaltyData}
                    disabled={!penaltyRecords.length}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-xl hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Tải Excel
                  </button>
                </div>
                {loadingPenalty ? renderLoading('red') :
                 filteredPenalties.length === 0 ? renderEmpty(penaltyRecords.length === 0 ? 'Chưa có bản ghi phạt nào tháng này.' : 'Không tìm thấy nhân viên.') : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="table-header w-10">#</th>
                          <th className="table-header">Nhân viên</th>
                          <th className="table-header text-right">Số tiền phạt</th>
                          <th className="table-header">Lý do vi phạm</th>
                          <th className="table-header text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {paginatedPenalties.map((rec, i) => {
                          const isEditing  = pEditingId  === rec.id;
                          const isDeleting = pDeletingId === rec.id;
                          return (
                            <tr key={rec.id} className={isDeleting ? 'bg-red-50' : 'hover:bg-gray-50 transition-colors'}>
                              <td className="table-cell text-gray-400 text-xs">{i + 1}</td>
                              <td className="table-cell">
                                <div className="flex items-center gap-3">
                                  {renderAvatar(rec.employee_name, 'bg-red-50 text-red-700')}
                                  <div><p className="font-medium text-gray-900">{rec.employee_name}</p><p className="text-xs text-gray-500 font-mono">{rec.employee_code}</p></div>
                                </div>
                              </td>
                              <td className="table-cell text-right">
                                {isEditing ? (
                                  <input type="text" value={pEditValues.amount} onChange={(e) => setPEditValues((v) => ({ ...v, amount: e.target.value }))}
                                    className="input-field w-36 text-right" placeholder="0" />
                                ) : (
                                  <span className="font-medium text-red-600">{fmtMoney(rec.amount)}</span>
                                )}
                              </td>
                              <td className="table-cell">
                                {isEditing ? (
                                  <input type="text" value={pEditValues.reason} onChange={(e) => setPEditValues((v) => ({ ...v, reason: e.target.value }))}
                                    className="input-field w-full" placeholder="Lý do vi phạm..." />
                                ) : (
                                  <span className="text-gray-700">{rec.reason || '—'}</span>
                                )}
                              </td>
                              <td className="table-cell text-center">
                                {isDeleting ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-xs text-red-600">Xác nhận xoá?</span>
                                    <button onClick={() => handlePDelete(rec.id)} disabled={pDeleting} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60">
                                      {pDeleting ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Xoá
                                    </button>
                                    <button onClick={() => setPDeletingId(null)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handlePSave(rec.id)} disabled={pSaving} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-60">
                                      {pSaving ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}Lưu
                                    </button>
                                    <button onClick={cancelPEdit} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50">
                                      <XMarkIcon className="h-3 w-3" />Huỷ
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => startPEdit(rec)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 transition-colors">
                                      <PencilIcon className="h-3.5 w-3.5" />Sửa
                                    </button>
                                    <button onClick={() => { setPDeletingId(rec.id); setPEditingId(null); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
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
                {filteredPenalties.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-600">
                      Tổng số tiền ({filteredPenalties.length} bản ghi)
                    </span>
                    <span className="text-base font-semibold text-gray-900">{fmtMoney(pTotalAmount)}</span>
                  </div>
                )}
              </div>
              {filteredPenalties.length > 0 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={pPage}
                    totalPages={pTotalPages}
                    totalItems={filteredPenalties.length}
                    itemsPerPage={pPageSize}
                    onPageChange={setPPage}
                    onItemsPerPageChange={(n) => { setPPageSize(n); setPPage(1); }}
                  />
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default SalaryData;
