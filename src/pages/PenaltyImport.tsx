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
} from '@heroicons/react/24/outline';
import {
  salaryService,
  type BulkImportPenaltyRecord,
  type PenaltyRecord,
} from '../services/salary.service';
import { SelectBox } from '../components/LandingLayout/SelectBox';

interface ParsedRow {
  employee_code: string;
  amount: number;
  reason: string;
  rowIndex: number;
  parseError?: string;
}

interface EditValues {
  amount: string;
  reason: string;
}

const now = new Date();
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

function extractCellNumber(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'object' && 'result' in (raw as object))
    return extractCellNumber((raw as { result: unknown }).result);
  if (typeof raw === 'string') {
    let s = raw.replace(/\s/g, '').trim();
    // Dấu chấm làm phân cách hàng nghìn kiểu Việt Nam: 100.000.000
    // Nhận biết: tất cả dấu chấm đều theo sau bởi đúng 3 chữ số
    if (/^\d{1,3}(\.\d{3})+(,\d*)?$/.test(s)) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Dấu phẩy làm phân cách hàng nghìn kiểu Anh: 100,000,000
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

const PenaltyImport: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');

  // Import flow
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Records list
  const [records, setRecords] = useState<PenaltyRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsLoaded, setRecordsLoaded] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({ amount: '', reason: '' });
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toasts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ── Load records ── */
  const loadRecords = useCallback(async (month = selectedMonth, year = selectedYear) => {
    setLoadingRecords(true);
    setRecordsLoaded(false);
    setParsedRows(null);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    try {
      const data = await salaryService.listPenalties({ year, month });
      setRecords(data);
      setRecordsLoaded(true);
    } catch {
      setErrorMsg('Không thể tải danh sách. Vui lòng thử lại.');
    } finally {
      setLoadingRecords(false);
    }
  }, [selectedMonth, selectedYear]);

  /* ── Auto-load khi mount và khi đổi tháng/năm ── */
  useEffect(() => {
    loadRecords(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Template download ── */
  const handleDownloadTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Phạt Biên Bản');
    ws.columns = [
      { header: 'Mã nhân viên', key: 'employee_code', width: 20 },
      { header: 'Số tiền phạt', key: 'amount', width: 20 },
      { header: 'Lý do vi phạm', key: 'reason', width: 40 },
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
    const url = URL.createObjectURL(
      new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_phat_bien_ban_T${selectedMonth}_${selectedYear}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── File parse ── */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.match(/\.xlsx$/i)) { setParseError('Chỉ chấp nhận file Excel (.xlsx)'); return; }
    setFile(f);
    setParseError(null);
    setParsedRows(null);
    setSuccessMsg(null);
    setErrorMsg(null);
    setParsing(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await f.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) { setParseError('File không có sheet nào.'); return; }
      const rows: ParsedRow[] = [];
      ws.eachRow((row, idx) => {
        if (idx === 1) return;
        const code = row.getCell(1).value != null ? String(row.getCell(1).value).trim() : '';
        if (!code) return;
        const amount = extractCellNumber(row.getCell(2).value);
        const reason = extractCellString(row.getCell(3).value);
        let err: string | undefined;
        if (isNaN(amount) || amount < 0) err = 'Số tiền phạt không hợp lệ';
        rows.push({ employee_code: code, amount, reason, rowIndex: idx, parseError: err });
      });
      if (!rows.length) { setParseError('File không có dữ liệu (ngoài header).'); return; }
      setParsedRows(rows);
    } catch {
      setParseError('Không thể đọc file. Vui lòng kiểm tra định dạng.');
    } finally {
      setParsing(false);
    }
  };

  /* ── Import ── */
  const handleImport = async () => {
    if (!parsedRows) return;
    const valid = parsedRows.filter((r) => !r.parseError);
    if (!valid.length) return;
    setImporting(true);
    try {
      const payload: BulkImportPenaltyRecord[] = valid.map((r) => ({
        employee_code: r.employee_code,
        amount: r.amount,
        reason: r.reason,
      }));
      const res = await salaryService.bulkImportPenalties({ year: selectedYear, month: selectedMonth, records: payload });
      if (res.success.length > 0)
        setSuccessMsg(`Import thành công ${res.success.length} bản ghi phạt.`);
      if (res.errors.length > 0)
        setErrorMsg(`${res.errors.length} dòng lỗi. Mã không tìm thấy: ${res.errors.map((e) => e.employee_code).join(', ')}`);
      await loadRecords();
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ.');
    } finally {
      setImporting(false);
    }
  };

  /* ── Edit inline ── */
  const startEdit = (rec: PenaltyRecord) => {
    setEditingId(rec.id);
    setEditValues({ amount: String(Number(rec.amount)), reason: rec.reason });
    setDeletingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleSave = async (id: number) => {
    const amount = parseFloat(editValues.amount.replace(/,/g, '')) || 0;
    setSaving(true);
    try {
      const updated = await salaryService.updatePenalty(id, {
        amount,
        reason: editValues.reason,
      });
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      setEditingId(null);
      setSuccessMsg('Đã cập nhật thành công.');
    } catch {
      setErrorMsg('Không thể cập nhật. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await salaryService.deletePenalty(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setDeletingId(null);
      setSuccessMsg('Đã xoá thành công.');
    } catch {
      setErrorMsg('Không thể xoá. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  /* ── Derived ── */
  const validCount = parsedRows?.filter((r) => !r.parseError).length ?? 0;
  const invalidCount = parsedRows?.filter((r) => r.parseError).length ?? 0;

  const filteredRecords = records.filter(
    (r) =>
      !search ||
      r.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      r.employee_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleMonthChange = (v: number) => { setSelectedMonth(v); setParsedRows(null); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const handleYearChange = (v: number) => { setSelectedYear(v); setParsedRows(null); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  /* ── Render ── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Phạt Biên Bản</h1>
        <p className="text-gray-600 mt-2">
          Import file Excel hoặc thêm trực tiếp phạt biên bản theo tháng/năm.
        </p>
      </div>

      {/* Toasts */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          <CheckIcon className="h-4 w-4 flex-shrink-0" />
          {successMsg}
          <button className="ml-auto" onClick={() => setSuccessMsg(null)}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
          {errorMsg}
          <button className="ml-auto" onClick={() => setErrorMsg(null)}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filter / Action bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
          <div className="w-32">
            <SelectBox<number>
              label="Tháng"
              value={selectedMonth}
              options={MONTHS.map((m) => ({ value: m, label: `Tháng ${m}` }))}
              onChange={handleMonthChange}
            />
          </div>
          <div className="w-24">
            <SelectBox<number>
              label="Năm"
              value={selectedYear}
              options={YEARS.map((y) => ({ value: y, label: String(y) }))}
              onChange={handleYearChange}
            />
          </div>

          <button
            onClick={() => loadRecords()}
            disabled={loadingRecords}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loadingRecords ? 'animate-spin' : ''}`} />
            Tải dữ liệu
          </button>

          <div className="hidden sm:block w-px h-8 bg-gray-200 self-end mb-0.5" />

          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Tải file mẫu
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-red-300 text-red-700 bg-red-50 rounded-md hover:bg-red-100 cursor-pointer transition-colors">
            <ArrowUpTrayIcon className="h-4 w-4" />
            {file ? file.name : 'Chọn file Excel'}
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
          </label>

          {parsedRows && validCount > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {importing
                ? <ArrowPathIcon className="h-4 w-4 animate-spin" />
                : <CheckIcon className="h-4 w-4" />}
              {importing ? 'Đang import...' : `Xác nhận import (${validCount})`}
            </button>
          )}

          {recordsLoaded && (
            <>
              <div className="hidden sm:block w-px h-8 bg-gray-200 self-end mb-0.5" />
              <div className="flex-1 relative min-w-48">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm theo mã hoặc tên nhân viên..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </>
          )}
        </div>

        {parseError && (
          <div className="mt-3 flex items-center gap-2 text-red-700 text-sm">
            <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
            {parseError}
          </div>
        )}
      </div>

      {/* Preview bảng trước import */}
      {parsedRows && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              Xem trước dữ liệu
              <span className="ml-2 font-normal text-gray-500">
                {parsedRows.length} dòng
                {invalidCount > 0 && <span className="text-red-500"> · {invalidCount} lỗi</span>}
              </span>
            </p>
            <span className="text-xs text-gray-500">Tháng {selectedMonth}/{selectedYear}</span>
          </div>
          {parsing ? (
            <div className="flex items-center justify-center py-16">
              <ArrowPathIcon className="h-6 w-6 text-red-400 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Đang đọc file...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NV</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền phạt</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lý do vi phạm</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {parsedRows.map((row, i) => (
                    <tr key={row.rowIndex} className={row.parseError ? 'bg-red-50' : 'hover:bg-gray-50 transition-colors'}>
                      <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-mono font-medium text-gray-800">{row.employee_code}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        {row.amount > 0 ? row.amount.toLocaleString('vi-VN') + ' ₫' : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{row.reason || '—'}</td>
                      <td className="px-4 py-3">
                        {row.parseError
                          ? <span className="inline-flex items-center gap-1 text-xs text-red-600"><ExclamationCircleIcon className="h-3.5 w-3.5" />{row.parseError}</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckIcon className="h-3.5 w-3.5" />Hợp lệ</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Danh sách phạt biên bản */}
      {(recordsLoaded || loadingRecords) && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              Danh sách phạt biên bản — Tháng {selectedMonth}/{selectedYear}
              <span className="ml-2 font-normal text-gray-500">{filteredRecords.length} bản ghi</span>
            </p>
          </div>

          {loadingRecords ? (
            <div className="flex items-center justify-center py-16">
              <ArrowPathIcon className="h-6 w-6 text-red-400 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Đang tải...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <UserIcon className="h-10 w-10 mb-2" />
              <p className="text-sm">{records.length === 0 ? 'Chưa có bản ghi phạt nào cho tháng này.' : 'Không tìm thấy nhân viên.'}</p>
            </div>
          ) : (
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
                  {filteredRecords.map((rec, i) => {
                    const isEditing = editingId === rec.id;
                    const isDeleting = deletingId === rec.id;

                    return (
                      <tr key={rec.id} className={isDeleting ? 'bg-red-50' : 'hover:bg-gray-50 transition-colors'}>
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>

                        {/* Nhân viên */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-red-700">
                                {rec.employee_name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{rec.employee_name}</p>
                              <p className="text-xs text-gray-500 font-mono">{rec.employee_code}</p>
                            </div>
                          </div>
                        </td>

                        {/* Số tiền phạt */}
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues.amount}
                              onChange={(e) => setEditValues((v) => ({ ...v, amount: e.target.value }))}
                              className="w-36 text-right border border-red-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                              placeholder="0"
                            />
                          ) : (
                            <span className="font-medium text-red-600">{fmtMoney(rec.amount)}</span>
                          )}
                        </td>

                        {/* Lý do */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues.reason}
                              onChange={(e) => setEditValues((v) => ({ ...v, reason: e.target.value }))}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="Lý do vi phạm..."
                            />
                          ) : (
                            <span className="text-gray-700">{rec.reason || '—'}</span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="px-4 py-3 text-center">
                          {isDeleting ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xs text-red-600">Xác nhận xoá?</span>
                              <button
                                onClick={() => handleDelete(rec.id)}
                                disabled={deleting}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60"
                              >
                                {deleting ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}
                                Xoá
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50"
                              >
                                <XMarkIcon className="h-3 w-3" />
                                Huỷ
                              </button>
                            </div>
                          ) : isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSave(rec.id)}
                                disabled={saving}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-60"
                              >
                                {saving ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}
                                Lưu
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50"
                              >
                                <XMarkIcon className="h-3 w-3" />
                                Huỷ
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => startEdit(rec)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-md hover:bg-primary-100 transition-colors"
                              >
                                <PencilIcon className="h-3.5 w-3.5" />
                                Sửa
                              </button>
                              <button
                                onClick={() => { setDeletingId(rec.id); setEditingId(null); }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                                Xoá
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
      )}

      {/* Empty state — chưa tải */}
      {!recordsLoaded && !loadingRecords && !parsedRows && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ExclamationCircleIcon className="h-10 w-10 mb-2" />
            <p className="text-sm">Chọn tháng/năm rồi nhấn <strong className="text-gray-500">Tải dữ liệu</strong> hoặc upload file Excel.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PenaltyImport;
