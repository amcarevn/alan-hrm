import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  FunnelIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserIcon,
  CalendarIcon,
  BoltIcon,
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  EyeIcon,
  ShieldExclamationIcon,
  LockClosedIcon,
  LockOpenIcon,
  ClockIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { departmentsAPI, employeesAPI, Department, Employee } from '../utils/api';
import { workFinalizationService, WorkFinalizationRecord } from '../services/workFinalization.service';
import type { DailySummaryItem, FinalizeAllResponse, FinalizeDepartmentResponse, LockStatusResponse } from '../services/workFinalization.service';
import deptAttendanceViolationReportService from '../services/deptAttendanceViolationReport.service';
import type { DeptAttendanceViolationResponse } from '../services/deptAttendanceViolationReport.service';
import AttendanceCalendar from '../components/AttendanceCalendar';
import { SelectBox } from '../components/LandingLayout/SelectBox';

// --- Optimizations: Global Helpers & Memoized Sub-components ---

const formatNumber = (value: number | null) => {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('vi-VN');
};

const formatDate = (val: string | null | undefined) => {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime())
    ? '—'
    : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const EmployeeListItem = React.memo(({
  emp,
  rec,
  isSelected,
  isBeingFinalized,
  isLocked,
  canBypassLock,
  onSelect,
  onFinalize,
}: {
  emp: Employee;
  rec?: WorkFinalizationRecord;
  isSelected: boolean;
  isBeingFinalized: boolean;
  isLocked: boolean;
  canBypassLock: boolean;
  onSelect: (emp: Employee) => void;
  onFinalize: (emp: Employee) => void;
}) => {
  return (
    <li
      onClick={() => onSelect(emp)}
      className={`px-3 py-3 cursor-pointer hover:bg-indigo-50 transition-colors ${
        isSelected ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <UserIcon className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {emp.full_name}
            </p>
            <p className="text-xs text-gray-500 font-mono">
              {emp.employee_id}
            </p>
            <div className="flex flex-col">
              {emp.department && (
                <p className="text-xs text-gray-400 truncate">
                  {emp.department.name}
                </p>
              )}
              {emp.position && (
                <p className="text-[10px] text-indigo-400 font-medium truncate">
                  {emp.position.title}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          {rec ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              <CheckCircleIcon className="w-3 h-3 mr-0.5" />
              Đã chốt
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              Chưa chốt
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFinalize(emp);
            }}
            disabled={isBeingFinalized || (isLocked && !canBypassLock)}
            title={isLocked ? 'Tháng này đã khóa chốt công' : undefined}
            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed ${
              rec
                ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                : 'text-white bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isBeingFinalized ? (
              <ArrowPathIcon className="w-3 h-3 animate-spin" />
            ) : rec ? (
              'Chốt lại'
            ) : (
              'Chốt công'
            )}
          </button>
        </div>
      </div>
      {rec && (
        <div className="mt-2 flex gap-3 text-xs text-gray-500">
          <span>Công: <strong className="text-gray-700">{rec.tong_cong}</strong></span>
          <span>Phạt: <strong className="text-red-600">{formatNumber(rec.tong_phat)}đ</strong></span>
        </div>
      )}
    </li>
  );
});

const WorkFinalization: React.FC = () => {
  const { user } = useAuth();
  const userRole = user?.role ? user.role.toUpperCase() : 'USER';
  const canBypassLock = userRole === 'ADMIN' || userRole === 'HR';

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<WorkFinalizationRecord[]>([]);

  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationReport, setViolationReport] = useState<DeptAttendanceViolationResponse | null>(null);
  const [loadingViolation, setLoadingViolation] = useState(false);
  const [exportingViolation, setExportingViolation] = useState(false);

  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [finalizing, setFinalizing] = useState<string | null>(null);
  const [finalizingAll, setFinalizingAll] = useState(false);
  const [finalizingDepartment, setFinalizingDepartment] = useState(false);
  const [finalizeAllResult, setFinalizeAllResult] = useState<FinalizeAllResponse | null>(null);
  const [finalizeDepartmentResult, setFinalizeDepartmentResult] = useState<FinalizeDepartmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected employee for calendar view
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Finalization Lock state
  const [lockStatus, setLockStatus] = useState<LockStatusResponse | null>(null);
  const [togglingLock, setTogglingLock] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [lockNote, setLockNote] = useState('');
  const [lockStartAt, setLockStartAt] = useState('');

  // Daily detail pivot modal
  const [showDailyPreviewModal, setShowDailyPreviewModal] = useState(false);
  const [exportingDaily, setExportingDaily] = useState(false);

  const isLocked = lockStatus?.is_locked ?? false;

  // Helper: ISO string → datetime-local value
  const toLocalInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    // Format theo local timezone cho input datetime-local
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Load lock status when month/year changes
  useEffect(() => {
    workFinalizationService
      .getLockStatus(selectedYear, selectedMonth)
      .then((res) => {
        setLockStatus(res);
        setLockStartAt(toLocalInput(res.lock_start_at));
      })
      .catch(() => setLockStatus(null));
  }, [selectedYear, selectedMonth]);

  const handleToggleLock = async () => {
    setTogglingLock(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await workFinalizationService.toggleLock({
        year: selectedYear,
        month: selectedMonth,
        is_locked: !isLocked,
        note: lockNote,
        lock_start_at: lockStartAt ? new Date(lockStartAt).toISOString() : null,
      });
      setLockStatus(res);
      setSuccessMsg(res.message);
      setShowLockConfirm(false);
      setLockNote('');
      setLockStartAt(toLocalInput(res.lock_start_at));
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Không thể thay đổi trạng thái khóa.');
    } finally {
      setTogglingLock(false);
    }
  };

  const handleCancelSchedule = async () => {
    setTogglingLock(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await workFinalizationService.toggleLock({
        year: selectedYear,
        month: selectedMonth,
        is_locked: false,
        note: 'Hủy lịch hẹn khóa',
        lock_start_at: null,
      });
      setLockStatus(res);
      setSuccessMsg('Đã hủy lịch hẹn khóa.');
      setLockStartAt('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Không thể hủy lịch hẹn khóa.');
    } finally {
      setTogglingLock(false);
    }
  };

  // Load departments once
  useEffect(() => {
    departmentsAPI
      .list({ page_size: 1000 })
      .then((res) => setDepartments(res.results))
      .catch(() => { });
  }, []);

  // Load employees when dept filter changes
  const loadEmployees = useCallback(async () => {
    if (!selectedDepartment && !debouncedSearchTerm) {
      setEmployees([]);
      return;
    }
    setLoadingEmployees(true);
    try {
      const params: any = { page_size: 1000 };
      if (selectedDepartment && selectedDepartment !== 'all') {
        params.department = Number(selectedDepartment);
      }
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      const res = await employeesAPI.list(params);
      setEmployees(res.results);
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, [selectedDepartment, debouncedSearchTerm]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Load finalization records for the selected month/year/dept
  const loadRecords = useCallback(async () => {
    // Nếu không chọn phòng ban VÀ không có từ khóa tìm kiếm thì không tải
    if (!selectedDepartment && !debouncedSearchTerm) {
      setRecords([]);
      return;
    }
    setLoadingRecords(true);
    setError(null);
    try {
      const params: any = { year: selectedYear, month: selectedMonth };
      if (selectedDepartment && selectedDepartment !== 'all') {
        params.department_id = Number(selectedDepartment);
      }
      // Nếu có tìm kiếm, gửi kèm employee_code để lấy records của NV đó ngay cả khi không chọn phòng ban
      if (debouncedSearchTerm) {
        params.employee_code = debouncedSearchTerm;
      }
      const res = await workFinalizationService.list(params);
      setRecords(res.results);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
        'Không thể tải dữ liệu chốt công. Vui lòng thử lại.'
      );
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }, [selectedYear, selectedMonth, selectedDepartment, debouncedSearchTerm]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Memoized records map for O(1) lookup performance
  const recordsMap = useMemo(() => {
    const map = new Map<string, WorkFinalizationRecord>();
    records.forEach((r) => map.set(r.ma_nv, r));
    return map;
  }, [records]);

  const handleSelectEmployee = useCallback((emp: Employee) => {
    setSelectedEmployee(emp);
  }, []);

  const handleFinalize = useCallback(async (emp: Employee) => {
    setFinalizing(emp.employee_id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await workFinalizationService.finalize({
        employee_code: emp.employee_id,
        year: selectedYear,
        month: selectedMonth,
      });
      setSuccessMsg(
        `${res.created ? 'Chốt công thành công' : 'Đã cập nhật chốt công'} cho ${emp.employee_id} - ${emp.full_name}`
      );
      
      // Update local records state immediately for better UX
      if (res.data) {
        setRecords(prev => {
          const index = prev.findIndex(r => r.ma_nv === emp.employee_id);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = res.data;
            return updated;
          }
          return [...prev, res.data];
        });
      }

      await loadRecords();
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
        `Lỗi khi chốt công cho ${emp.employee_id}`
      );
    } finally {
      setFinalizing(null);
    }
  }, [selectedYear, selectedMonth, loadRecords]);

  const handleFinalizeAll = async () => {
    if (!window.confirm(`Bạn có chắc muốn chốt công cho toàn bộ nhân viên tháng ${selectedMonth}/${selectedYear}?`)) {
      return;
    }
    setFinalizingAll(true);
    setError(null);
    setSuccessMsg(null);
    setFinalizeAllResult(null);
    try {
      const res = await workFinalizationService.finalizeAll({
        year: selectedYear,
        month: selectedMonth,
      });
      setFinalizeAllResult(res);
      setSuccessMsg(
        `Đã chốt công ${res.total_processed} nhân viên tháng ${selectedMonth}/${selectedYear}` +
        (res.total_errors > 0 ? ` (${res.total_errors} lỗi)` : '')
      );
      await loadRecords();
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
        'Lỗi khi chốt công toàn bộ. Vui lòng thử lại.'
      );
    } finally {
      setFinalizingAll(false);
    }
  };

  const handleFinalizeDepartment = async () => {
    if (!selectedDepartment) return;
    const dept = departments.find((d) => d.id === Number(selectedDepartment));
    const deptName = dept ? dept.name : `Phòng ban #${selectedDepartment}`;
    if (!window.confirm(`Bạn có chắc muốn chốt công cho phòng ban "${deptName}" tháng ${selectedMonth}/${selectedYear}?`)) {
      return;
    }
    setFinalizingDepartment(true);
    setError(null);
    setSuccessMsg(null);
    setFinalizeDepartmentResult(null);
    try {
      const res = await workFinalizationService.finalizeDepartment({
        year: selectedYear,
        month: selectedMonth,
        department_id: Number(selectedDepartment),
      });
      setFinalizeDepartmentResult(res);
      setSuccessMsg(
        `Đã chốt công ${res.total_processed} nhân viên phòng ban "${deptName}" tháng ${selectedMonth}/${selectedYear}` +
        (res.total_errors > 0 ? ` (${res.total_errors} lỗi)` : '')
      );
      await loadRecords();
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
        'Lỗi khi chốt công phòng ban. Vui lòng thử lại.'
      );
    } finally {
      setFinalizingDepartment(false);
    }
  };

  const handleExport = async () => {
    if (records.length === 0) return;
    setExporting(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(
        `Tháng ${selectedMonth}_${selectedYear}`
      );

      const HEADER_FILL = {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FF4472C4' },
      };
      const HEADER_FONT = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 10,
      };
      const BORDER = {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const },
      };

      const headers = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Mã NV', key: 'ma_nv', width: 10 },
        { header: 'Họ và Tên', key: 'ho_va_ten', width: 24 },
        { header: 'Phòng Ban', key: 'phong_ban', width: 18 },
        { header: 'Vị Trí', key: 'vi_tri', width: 18 },
        { header: 'Bác Sĩ', key: 'bac_si', width: 10 },
        { header: 'Ngày BĐ Làm Việc', key: 'ngay_bat_dau_lam_viec', width: 18 },
        { header: 'Ngày KT Thử Việc', key: 'ngay_ket_thuc_thu_viec', width: 18 },
        { header: 'ON/OFF', key: 'on_off', width: 8 },
        { header: 'Ngày Nghỉ Việc', key: 'ngay_nghi_viec', width: 16 },
        { header: 'Hình Thức LV', key: 'hinh_thuc_lam_viec', width: 14 },
        { header: 'Công Thử Việc', key: 'cong_thu_viec', width: 14 },
        { header: 'Công Chính Thức', key: 'cong_chinh_thuc', width: 16 },
        { header: 'Có Lễ', key: 'co_le', width: 10 },
        { header: 'Công Thực Tế', key: 'cong_thuc_te', width: 14 },
        { header: 'Tổng Công', key: 'tong_cong', width: 12 },
        { header: 'Nghỉ Phép', key: 'nghi_phep', width: 12 },
        { header: 'Làm Việc Online', key: 'lam_viec_online', width: 14 },
        { header: 'Tổng Phạt', key: 'tong_phat', width: 14 },
        { header: 'Tăng Ca', key: 'tang_ca', width: 10 },
        { header: 'Làm Tối', key: 'lam_toi', width: 10 },
        { header: 'Trực Tối', key: 'truc_toi', width: 10 },
        { header: 'Làm Thêm Giờ', key: 'lam_them_gio', width: 14 },
        { header: 'Live', key: 'live', width: 8 },
        { header: 'Phụ Cấp Gửi Xe', key: 'phu_cap_gui_xe', width: 16 },
      ];

      sheet.columns = headers;

      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = BORDER;
      });
      headerRow.height = 36;

      records.forEach((rec) => {
        const row = sheet.addRow({
          stt: rec.stt,
          ma_nv: rec.ma_nv,
          ho_va_ten: rec.ho_va_ten,
          phong_ban: rec.phong_ban ?? '',
          vi_tri: rec.vi_tri ?? '',
          bac_si: rec.bac_si ?? '',
          ngay_bat_dau_lam_viec: rec.ngay_bat_dau_lam_viec
            ? new Date(rec.ngay_bat_dau_lam_viec)
            : '',
          ngay_ket_thuc_thu_viec: rec.ngay_ket_thuc_thu_viec
            ? new Date(rec.ngay_ket_thuc_thu_viec)
            : '',
          on_off: rec.on_off ?? '',
          ngay_nghi_viec: rec.ngay_nghi_viec
            ? new Date(rec.ngay_nghi_viec)
            : '',
          hinh_thuc_lam_viec: rec.hinh_thuc_lam_viec ?? '',
          cong_thu_viec: rec.cong_thu_viec,
          cong_chinh_thuc: rec.cong_chinh_thuc,
          co_le: rec.co_le ?? '',
          cong_thuc_te: rec.cong_thuc_te,
          tong_cong: rec.tong_cong,
          nghi_phep: rec.nghi_phep,
          lam_viec_online:rec.lam_viec_online,
          tong_phat: rec.tong_phat,
          tang_ca: rec.tang_ca,
          lam_toi: rec.lam_toi ?? '',
          truc_toi: rec.truc_toi,
          lam_them_gio: rec.lam_them_gio,
          live: rec.live,
          phu_cap_gui_xe: rec.phu_cap_gui_xe,
        });

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = BORDER;
          if (colNumber >= 12) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          } else {
            cell.alignment = { vertical: 'middle' };
          }
        });

        ['ngay_bat_dau_lam_viec', 'ngay_ket_thuc_thu_viec', 'ngay_nghi_viec'].forEach(
          (key) => {
            const col = headers.findIndex((h) => h.key === key) + 1;
            const cell = row.getCell(col);
            if (cell.value instanceof Date) {
              cell.numFmt = 'dd/mm/yyyy';
            }
          }
        );

        const tongPhatCol = headers.findIndex((h) => h.key === 'tong_phat') + 1;
        const phuCapCol = headers.findIndex((h) => h.key === 'phu_cap_gui_xe') + 1;
        row.getCell(tongPhatCol).numFmt = '#,##0';
        row.getCell(phuCapCol).numFmt = '#,##0';
      });

      sheet.views = [{ state: 'frozen', ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bang_cham_cong_Thang${selectedMonth}_${selectedYear}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      setError('Không thể xuất file Excel. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  const handlePreviewExport = () => {
    setShowPreviewModal(false);
    handleExport();
  };

  const handleOpenViolationReport = async () => {
    if (!selectedDepartment) return;
    setShowViolationModal(true);
    setLoadingViolation(true);
    setViolationReport(null);
    try {
      const res = await deptAttendanceViolationReportService.get({
        department_id: Number(selectedDepartment),
        year: selectedYear,
        month: selectedMonth,
      });
      setViolationReport(res);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
        'Không thể tải báo cáo vi phạm. Vui lòng thử lại.'
      );
      setShowViolationModal(false);
    } finally {
      setLoadingViolation(false);
    }
  };

  const handleExportViolation = async () => {
    if (!violationReport) return;
    setExportingViolation(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(
        `Vi_Pham_T${violationReport.month}_${violationReport.year}`
      );

      const HEADER_FILL = {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFD32F2F' },
      };
      const HEADER_FONT = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 10,
      };
      const BORDER = {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const },
      };

      const headers = [
        { header: 'Mã NV', key: 'ma_nhan_vien', width: 12 },
        { header: 'Tên Nhân Viên', key: 'ten_nhan_vien', width: 24 },
        { header: 'Phòng Ban', key: 'phong_ban', width: 18 },
        { header: 'Chức Danh', key: 'chuc_danh', width: 16 },
        { header: 'Vị Trí', key: 'vi_tri', width: 16 },
        { header: 'Bác Sĩ', key: 'bac_si', width: 16 },
        { header: 'Tổng Công', key: 'tong_cong', width: 12 },
        { header: 'Số Lần Vi Phạm', key: 'so_lan_vi_pham', width: 16 },
        { header: 'Số Lần Đi Muộn', key: 'so_lan_di_muon', width: 16 },
        { header: 'Số Lần Về Sớm', key: 'so_lan_ve_som', width: 16 },
        { header: 'Quên Chấm Công', key: 'so_lan_quen_cham_cong', width: 16 },
        { header: 'Phạt Đi Muộn', key: 'tong_phat_di_muon', width: 16 },
        { header: 'Phạt Về Sớm', key: 'tong_phat_ve_som', width: 14 },
        { header: 'Tổng Phạt', key: 'tong_phat', width: 14 },
      ];
      const firstNumericCol = headers.findIndex((h) => h.key === 'tong_cong') + 1;

      sheet.columns = headers;

      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = BORDER;
      });
      headerRow.height = 36;

      violationReport.data.forEach((item, idx) => {
        const row = sheet.addRow({
          ma_nhan_vien: item.ma_nhan_vien,
          ten_nhan_vien: item.ten_nhan_vien,
          phong_ban: item.phong_ban,
          chuc_danh: item.chuc_danh,
          vi_tri: item.vi_tri,
          bac_si: item.bac_si,
          tong_cong: item.tong_cong,
          so_lan_vi_pham: item.so_lan_vi_pham,
          so_lan_di_muon: item.so_lan_di_muon,
          so_lan_ve_som: item.so_lan_ve_som,
          so_lan_quen_cham_cong: item.so_lan_quen_cham_cong,
          tong_phat_di_muon: item.tong_phat_di_muon,
          tong_phat_ve_som: item.tong_phat_ve_som,
          tong_phat: item.tong_phat,
        });

        const isEvenRow = idx % 2 === 0;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = BORDER;
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEvenRow ? 'FFFFFFFF' : 'FFFFF8F8' },
          };
          if (colNumber >= firstNumericCol) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          } else {
            cell.alignment = { vertical: 'middle' };
          }
        });

        const tongPhatDiMuonCol = headers.findIndex((h) => h.key === 'tong_phat_di_muon') + 1;
        const tongPhatVeSomCol = headers.findIndex((h) => h.key === 'tong_phat_ve_som') + 1;
        const tongPhatCol = headers.findIndex((h) => h.key === 'tong_phat') + 1;
        row.getCell(tongPhatDiMuonCol).numFmt = '#,##0';
        row.getCell(tongPhatVeSomCol).numFmt = '#,##0';
        row.getCell(tongPhatCol).numFmt = '#,##0';
      });

      sheet.views = [{ state: 'frozen', ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BaoCao_ViPham_${violationReport.department_name}_T${violationReport.month}_${violationReport.year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export violation error:', err);
      setError('Không thể xuất file Excel báo cáo vi phạm. Vui lòng thử lại.');
    } finally {
      setExportingViolation(false);
    }
  };

  // --- Daily detail pivot helpers ---
  const formatDailyCredit = (item: DailySummaryItem): string => {
    const c = item.work_credit;
    if (item.day_type === 'L') return 'L';
    if (item.day_type === 'P') return c ? `${c} P` : '';
    if (item.day_type === 'OLW') return c ? `${c} OLW` : '';
    if (c > 0) return String(c);
    return '';
  };

  const dailyPivotRecords = useMemo(() =>
    records.filter((r) => r.daily_summary && r.daily_summary.length > 0),
    [records]
  );

  const pivotDayHeaders = useMemo(() => {
    if (dailyPivotRecords.length === 0) return [];
    const first = dailyPivotRecords[0].daily_summary!;
    return first.map((d) => ({
      day: d.day,
      label: `${String(d.day).padStart(2, '0')}(${d.weekday_label.replace('Thứ ', 'T').replace('Chủ nhật', 'CN')})`,
    }));
  }, [dailyPivotRecords]);

  const handleExportDailyPivot = async () => {
    if (dailyPivotRecords.length === 0) return;
    setExportingDaily(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const dept = departments.find((d) => d.id === Number(selectedDepartment));
      const sheetLabel = dept ? dept.name : 'TatCa';
      const sheet = workbook.addWorksheet(`ChiTiet_${sheetLabel}_T${selectedMonth}_${selectedYear}`);

      const HEADER_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } };
      const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      const BORDER = {
        top: { style: 'thin' as const }, left: { style: 'thin' as const },
        bottom: { style: 'thin' as const }, right: { style: 'thin' as const },
      };

      // Color fills for day_type
      const FILL_P = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFF3E0' } };
      const FILL_OL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE0F7FA' } };
      const FILL_L = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE3F2FD' } };

      // Build headers
      const dayLabels = pivotDayHeaders.map((h) => h.label);

      const FIXED_COLS = 5; // STT, Mã NV, Họ Tên, Phòng Ban, Vị Trí
      sheet.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Mã NV', key: 'ma_nv', width: 10 },
        { header: 'Họ và Tên', key: 'ho_va_ten', width: 24 },
        { header: 'Phòng Ban', key: 'phong_ban', width: 18 },
        { header: 'Vị Trí', key: 'vi_tri', width: 18 },
        ...dayLabels.map((lbl, i) => ({ header: lbl, key: `d${i + 1}`, width: 8 })),
        { header: 'Tổng', key: 'tong', width: 8 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = BORDER;
      });
      headerRow.height = 32;

      dailyPivotRecords.forEach((rec, idx) => {
        const rowData: Record<string, any> = {
          stt: idx + 1,
          ma_nv: rec.ma_nv,
          ho_va_ten: rec.ho_va_ten,
          phong_ban: rec.phong_ban ?? '',
          vi_tri: rec.vi_tri ?? '',
          tong: rec.tong_cong,
        };
        (rec.daily_summary || []).forEach((d, i) => {
          if (d.day_type === 'L') {
            rowData[`d${i + 1}`] = d.work_credit > 0 ? d.work_credit : 0;
          } else {
            rowData[`d${i + 1}`] = d.work_credit > 0 ? d.work_credit : null;
          }
        });

        const row = sheet.addRow(rowData);
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = BORDER;
          cell.alignment = { vertical: 'middle', horizontal: colNumber <= FIXED_COLS ? 'left' : 'center' };
        });

        // Apply day_type coloring + custom number format
        (rec.daily_summary || []).forEach((d, i) => {
          const cell = row.getCell(FIXED_COLS + 1 + i);
          if (d.day_type === 'P') {
            cell.fill = FILL_P;
            cell.numFmt = '0.## "P"';
          } else if (d.day_type === 'OLW') {
            cell.fill = FILL_OL;
            cell.numFmt = '0.## "OLW"';
          } else if (d.day_type === 'L') {
            cell.fill = FILL_L;
            cell.numFmt = '"L"';
          }
        });
      });

      sheet.views = [{ state: 'frozen', xSplit: FIXED_COLS, ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BangCong_ChiTiet_${sheetLabel}_T${selectedMonth}_${selectedYear}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export daily pivot error:', err);
      setError('Không thể xuất file Excel bảng công chi tiết. Vui lòng thử lại.');
    } finally {
      setExportingDaily(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const finalizedRec = useMemo(() =>
    selectedEmployee ? recordsMap.get(selectedEmployee.employee_id) : undefined
  , [selectedEmployee, recordsMap]);

  if (userRole !== 'ADMIN' && userRole !== 'HR') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chốt Công</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý bảng tính công hàng tháng và xuất báo cáo tính lương
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Nút Đóng/Mở chốt công */}
          <button
            onClick={() => {
              setLockStartAt(toLocalInput(lockStatus?.lock_start_at ?? null) || toLocalInput(new Date().toISOString()));
              setLockNote(lockStatus?.note ?? '');
              setShowLockConfirm(true);
            }}
            disabled={togglingLock}
            className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isLocked
                ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-500'
                : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100 focus:ring-green-500'
            }`}
          >
            {isLocked ? (
              <LockClosedIcon className="w-4 h-4 mr-2" />
            ) : (
              <LockOpenIcon className="w-4 h-4 mr-2" />
            )}
            {isLocked
              ? `Đang khóa T${selectedMonth}/${selectedYear}`
              : lockStatus?.lock_start_at
                ? `Hẹn khóa ${new Date(lockStatus.lock_start_at).toLocaleDateString('vi-VN')}`
                : `Đang mở T${selectedMonth}/${selectedYear}`}
          </button>
          {!isLocked && lockStatus?.lock_start_at && (
            <button
              onClick={handleCancelSchedule}
              disabled={togglingLock}
              className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XMarkIcon className="w-4 h-4 mr-1.5" />
              Hủy hẹn
            </button>
          )}

          <Link
            to="/dashboard/work-finalization/approvals"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ClipboardDocumentCheckIcon className="w-4 h-4 mr-2" />
            Phê duyệt chốt công
          </Link>
          <button
            onClick={handleFinalizeAll}
            disabled={(isLocked && !canBypassLock) || finalizingAll || finalizingDepartment || finalizing !== null || exporting}
            title={isLocked ? 'Tháng này đã khóa chốt công' : undefined}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BoltIcon className="w-4 h-4 mr-2" />
            {finalizingAll ? 'Đang chốt...' : `Chốt tất cả (Tháng ${selectedMonth}/${selectedYear})`}
          </button>
          {selectedDepartment && selectedDepartment !== 'all' && (
            <button
              onClick={handleFinalizeDepartment}
              disabled={(isLocked && !canBypassLock) || finalizingDepartment || finalizingAll || finalizing !== null || exporting}
              title={isLocked ? 'Tháng này đã khóa chốt công' : undefined}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BoltIcon className="w-4 h-4 mr-2" />
              {finalizingDepartment
                ? 'Đang chốt...'
                : `Chốt phòng ban (Tháng ${selectedMonth}/${selectedYear})`}
            </button>
          )}
          <button
            onClick={() => setShowPreviewModal(true)}
            disabled={records.length === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <EyeIcon className="w-4 h-4 mr-2" />
            Xem trước
          </button>
          <button
            onClick={() => setShowDailyPreviewModal(true)}
            disabled={dailyPivotRecords.length === 0}
            className="inline-flex items-center px-4 py-2 border border-indigo-300 rounded-md shadow-sm text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TableCellsIcon className="w-4 h-4 mr-2" />
            {`Bảng công chi tiết (${dailyPivotRecords.length})`}
          </button>
          <button
            onClick={handleOpenViolationReport}
            disabled={!selectedDepartment || selectedDepartment === 'all' || loadingViolation}
            className="inline-flex items-center px-4 py-2 border border-orange-300 rounded-md shadow-sm text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShieldExclamationIcon className="w-4 h-4 mr-2" />
            {loadingViolation ? 'Đang tải...' : 'Báo cáo vi phạm'}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || records.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            {exporting ? 'Đang xuất...' : `Xuất Excel (${records.length} đã chốt)`}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center p-4 text-sm text-red-800 bg-red-50 rounded-lg border border-red-200">
          <ExclamationCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center p-4 text-sm text-green-800 bg-green-50 rounded-lg border border-green-200">
          <CheckCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Lock banner */}
      {isLocked && (
        <div className="flex items-center justify-between p-4 text-sm bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 text-red-800">
            <LockClosedIcon className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-semibold">
                Tháng {selectedMonth}/{selectedYear} đã khóa chốt công.
              </span>
              <span className="ml-1">
                Không thể tạo đơn, phê duyệt hoặc chốt công cho tháng này.
              </span>
              {lockStatus?.locked_by && (
                <span className="ml-1 text-red-600">
                  (Khóa bởi: {lockStatus.locked_by}
                  {lockStatus.locked_at && (
                    <> lúc {new Date(lockStatus.locked_at).toLocaleString('vi-VN')}</>
                  )})
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              setLockStartAt(toLocalInput(lockStatus?.lock_start_at ?? null) || toLocalInput(new Date().toISOString()));
              setLockNote(lockStatus?.note ?? '');
              setShowLockConfirm(true);
            }}
            className="flex-shrink-0 inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50"
          >
            <LockOpenIcon className="w-3.5 h-3.5 mr-1" />
            Mở khóa
          </button>
        </div>
      )}

      {/* Finalize-all result summary */}
      {finalizeAllResult && (
        <div className="bg-white shadow rounded-lg p-4 border border-indigo-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <BoltIcon className="w-4 h-4 text-indigo-500" />
              Kết quả chốt công toàn công ty — Tháng {finalizeAllResult.month}/{finalizeAllResult.year}
            </span>
            <button
              onClick={() => setFinalizeAllResult(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Đóng
            </button>
          </div>
          <div className="flex gap-4 text-sm mb-3">
            <span className="text-green-700 font-medium">✓ Đã xử lý: {finalizeAllResult.total_processed}</span>
            {finalizeAllResult.total_errors > 0 && (
              <span className="text-red-600 font-medium">✗ Lỗi: {finalizeAllResult.total_errors}</span>
            )}
          </div>
          {finalizeAllResult.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-red-700 mb-1">Chi tiết lỗi:</p>
              <ul className="space-y-1">
                {finalizeAllResult.errors.map((e) => (
                  <li key={e.employee_code} className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                    <span className="font-mono">{e.employee_code}</span> — {e.ho_va_ten}: {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Finalize-department result summary */}
      {finalizeDepartmentResult && (
        <div className="bg-white shadow rounded-lg p-4 border border-purple-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <BoltIcon className="w-4 h-4 text-purple-500" />
              Kết quả chốt công phòng ban — Tháng {finalizeDepartmentResult.month}/{finalizeDepartmentResult.year}
            </span>
            <button
              onClick={() => setFinalizeDepartmentResult(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Đóng
            </button>
          </div>
          <div className="flex gap-4 text-sm mb-3">
            <span className="text-green-700 font-medium">✓ Đã xử lý: {finalizeDepartmentResult.total_processed}</span>
            {finalizeDepartmentResult.total_errors > 0 && (
              <span className="text-red-600 font-medium">✗ Lỗi: {finalizeDepartmentResult.total_errors}</span>
            )}
          </div>
          {finalizeDepartmentResult.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-red-700 mb-1">Chi tiết lỗi:</p>
              <ul className="space-y-1">
                {finalizeDepartmentResult.errors.map((e) => (
                  <li key={e.employee_code} className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                    <span className="font-mono">{e.employee_code}</span> — {e.ho_va_ten}: {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center mb-3">
          <FunnelIcon className="w-4 h-4 mr-2 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Bộ lọc & Tìm kiếm</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <SelectBox
            label="Tháng"
            value={selectedMonth}
            options={months.map((m) => ({ value: m, label: `Tháng ${m}` }))}
            onChange={(v) => setSelectedMonth(v)}
          />
          <SelectBox
            label="Năm"
            value={selectedYear}
            options={years.map((y) => ({ value: y, label: String(y) }))}
            onChange={(v) => setSelectedYear(v)}
          />
          <SelectBox
            label="Phòng Ban"
            value={selectedDepartment}
            options={[
              { value: '', label: 'Chưa chọn phòng ban' },
              { value: 'all', label: 'Tất cả phòng ban' },
              ...departments.map((d) => ({ value: String(d.id), label: d.name })),
            ]}
            onChange={(v) => {
              setSelectedDepartment(v);
              setSelectedEmployee(null);
            }}
          />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tìm kiếm</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedEmployee(null);
                }}
                placeholder="Tên hoặc mã NV..."
                className="block w-full pl-10 pr-10 py-2 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedEmployee(null);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { loadEmployees(); loadRecords(); }}
              className="inline-flex items-center px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ArrowPathIcon className="w-4 h-4 mr-1" />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Main two-panel layout */}
      <div className="flex gap-4 min-h-[600px]">
        {/* Left: Employee list */}
        <div className="w-80 flex-shrink-0 bg-white shadow rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">
              Danh sách nhân sự
            </span>
            <span className="text-xs text-gray-500">
              {employees.length} NV · {records.length} đã chốt
            </span>
          </div>
          {loadingEmployees ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : employees.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-4 text-center">
              {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Không có nhân viên nào'}
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {employees.map((emp) => (
                <EmployeeListItem
                  key={emp.id}
                  emp={emp}
                  rec={recordsMap.get(emp.employee_id)}
                  isSelected={selectedEmployee?.id === emp.id}
                  isBeingFinalized={finalizing === emp.employee_id}
                  isLocked={isLocked}
                  canBypassLock={canBypassLock}
                  onSelect={handleSelectEmployee}
                  onFinalize={handleFinalize}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Right: Calendar / Detail panel */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {!selectedEmployee ? (
            <div className="flex-1 bg-white shadow rounded-lg flex flex-col items-center justify-center text-gray-400 p-10">
              <CalendarIcon className="h-16 w-16 mb-4 text-gray-200" />
              <p className="text-base font-medium">Chọn một nhân viên</p>
              <p className="text-sm mt-1">để xem lịch chấm công</p>
            </div>
          ) : (
            <>
              {/* Employee info bar */}
              <div className="bg-white shadow rounded-lg px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedEmployee.full_name}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {selectedEmployee.employee_id}
                      {selectedEmployee.department && ` · ${selectedEmployee.department.name}`}
                      {selectedEmployee.position && ` · ${selectedEmployee.position.title}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {finalizedRec ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      Đã chốt công tháng {selectedMonth}/{selectedYear}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      Chưa chốt công tháng {selectedMonth}/{selectedYear}
                    </span>
                  )}
                  <button
                    onClick={() => handleFinalize(selectedEmployee)}
                    disabled={(isLocked && !canBypassLock) || finalizing === selectedEmployee.employee_id}
                    title={isLocked ? 'Tháng này đã khóa chốt công' : undefined}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {finalizing === selectedEmployee.employee_id ? (
                      <ArrowPathIcon className="w-4 h-4 animate-spin mr-1" />
                    ) : isLocked ? (
                      <LockClosedIcon className="w-4 h-4 mr-1" />
                    ) : (
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                    )}
                    {finalizedRec ? 'Chốt lại' : 'Chốt công'}
                  </button>
                </div>
              </div>

              {/* Attendance Calendar */}
              <AttendanceCalendar
                year={selectedYear}
                month={selectedMonth - 1}
                employeeId={selectedEmployee.id}
                showInternalDialog={true}
              />

              {/* Finalization details if finalized */}
              {finalizedRec && (
                <div className="bg-white shadow rounded-lg p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">
                    Kết quả chốt công tháng {selectedMonth}/{selectedYear}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {[
                      { label: 'Công thử việc', value: String(finalizedRec.cong_thu_viec), cardCls: 'bg-blue-50', labelCls: 'text-blue-700', valCls: 'text-blue-800 font-bold' },
                      { label: 'Công chính thức', value: `${finalizedRec.cong_chinh_thuc} công`, cardCls: 'bg-indigo-50', labelCls: 'text-indigo-700', valCls: 'text-indigo-800 font-bold' },
                      { label: 'Công thực tế', value: `${finalizedRec.cong_thuc_te} công`, cardCls: 'bg-green-50', labelCls: 'text-green-700', valCls: 'text-green-800 font-bold' },
                      { label: 'Tổng công', value: `${finalizedRec.tong_cong} công`, cardCls: 'bg-emerald-50', labelCls: 'text-emerald-700', valCls: 'text-emerald-800 font-extrabold' },
                      { label: 'Nghỉ phép tháng', value: `${finalizedRec.nghi_phep} ngày`, cardCls: 'bg-indigo-50/50', labelCls: 'text-indigo-700', valCls: 'text-indigo-800 font-bold' },
                      { label: 'Làm việc online', value: `${finalizedRec.lam_viec_online ?? 0} ngày`, cardCls: 'bg-cyan-50', labelCls: 'text-cyan-700', valCls: 'text-cyan-800 font-bold' },
                      { label: 'Tăng ca', value: `${finalizedRec.tang_ca} giờ`, cardCls: 'bg-orange-50', labelCls: 'text-orange-700', valCls: 'text-orange-800 font-bold' },
                      { label: 'Trực tối', value: `${finalizedRec.truc_toi} buổi`, cardCls: 'bg-purple-50', labelCls: 'text-purple-700', valCls: 'text-purple-800 font-bold' },
                      { label: 'Làm thêm giờ', value: `${finalizedRec.lam_them_gio} giờ`, cardCls: 'bg-yellow-50', labelCls: 'text-yellow-700', valCls: 'text-yellow-800 font-bold' },
                      { label: 'Live', value: `${finalizedRec.live} ca`, cardCls: 'bg-pink-50', labelCls: 'text-pink-700', valCls: 'text-pink-800 font-bold' },
                      { label: 'PC Gửi xe', value: `${formatNumber(finalizedRec.phu_cap_gui_xe)}đ`, cardCls: 'bg-teal-50', labelCls: 'text-teal-700', valCls: 'text-teal-800 font-bold' },
                      { label: 'Tổng phạt', value: `${formatNumber(finalizedRec.tong_phat)}đ`, cardCls: 'bg-red-50', labelCls: 'text-red-700', valCls: 'text-red-800 font-bold' },
                    ].map((item) => (
                      <div key={item.label} className={`${item.cardCls} rounded-lg p-3`}>
                        <p className={`text-xs font-medium ${item.labelCls}`}>{item.label}</p>
                        <p className={`text-lg mt-0.5 ${item.valCls}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Excel Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center">
                  <EyeIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Xem trước dữ liệu Excel
                  </h2>
                  <p className="text-xs text-gray-500">
                    Tháng {selectedMonth}/{selectedYear} · {records.length} bản ghi đã chốt
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {[
                      'STT', 'Mã NV', 'Họ và Tên', 'Phòng Ban', 'Vị Trí',
                      'Bác Sĩ', 'Ngày BĐ Làm Việc', 'Ngày KT Thử Việc',
                      'ON/OFF', 'Ngày Nghỉ Việc', 'Hình Thức LV',
                      'Công Thử Việc', 'Công Chính Thức', 'Có Lễ',
                      'Công Thực Tế', 'Tổng Công', 'Nghỉ Phép',
                      'Làm Việc Online', 'Tổng Phạt', 'Tăng Ca',
                      'Làm Tối', 'Trực Tối', 'Làm Thêm Giờ', 'Live',
                      'Phụ Cấp Gửi Xe',
                    ].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-3 py-2 text-center font-semibold text-white bg-blue-700 border border-blue-800"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec, idx) => {
                    const rowCls = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                    return (
                      <tr key={rec.ma_nv} className={`${rowCls} hover:bg-blue-50 transition-colors`}>
                        <td className="px-3 py-1.5 text-center border border-gray-200">{rec.stt}</td>
                        <td className="px-3 py-1.5 font-mono border border-gray-200">{rec.ma_nv}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap border border-gray-200">{rec.ho_va_ten}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap border border-gray-200">{rec.phong_ban ?? '—'}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap border border-gray-200">{rec.vi_tri ?? '—'}</td>
                        <td className="px-3 py-1.5 text-center border border-gray-200">{rec.bac_si ?? '—'}</td>
                        <td className="px-3 py-1.5 text-center whitespace-nowrap border border-gray-200">{formatDate(rec.ngay_bat_dau_lam_viec)}</td>
                        <td className="px-3 py-1.5 text-center whitespace-nowrap border border-gray-200">{formatDate(rec.ngay_ket_thuc_thu_viec)}</td>
                        <td className="px-3 py-1.5 text-center border border-gray-200">{rec.on_off ?? '—'}</td>
                        <td className="px-3 py-1.5 text-center whitespace-nowrap border border-gray-200">{formatDate(rec.ngay_nghi_viec)}</td>
                        <td className="px-3 py-1.5 text-center whitespace-nowrap border border-gray-200">{rec.hinh_thuc_lam_viec ?? '—'}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200">{rec.cong_thu_viec}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200">{rec.cong_chinh_thuc}</td>
                        <td className="px-3 py-1.5 text-center border border-gray-200">{rec.co_le ?? '—'}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200">{rec.cong_thuc_te}</td>
                        <td className="px-3 py-1.5 text-right font-semibold border border-gray-200">{rec.tong_cong}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200">{rec.nghi_phep}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200">{rec.lam_viec_online ?? 0}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200">{formatNumber(rec.tong_phat)}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200">{rec.tang_ca}</td>
                        <td className="px-3 py-1.5 text-center border border-gray-200">{rec.lam_toi ?? '—'}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200">{rec.truc_toi}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200">{rec.lam_them_gio}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200">{rec.live}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200">{formatNumber(rec.phu_cap_gui_xe)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <span className="text-xs text-gray-500">
                Hiển thị {records.length} bản ghi · Tháng {selectedMonth}/{selectedYear}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviewExport}
                  disabled={exporting}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-1.5" />
                  {exporting ? 'Đang xuất...' : 'Xuất Excel'}
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Violation Report Modal */}
      {showViolationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center">
                  <ShieldExclamationIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Báo cáo vi phạm chấm công
                  </h2>
                  {violationReport && (
                    <p className="text-xs text-gray-500">
                      {violationReport.department_name} · Tháng {violationReport.month}/{violationReport.year} ·{' '}
                      {violationReport.total_violations} vi phạm / {violationReport.total_employees} nhân viên
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowViolationModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {loadingViolation ? (
                <div className="flex items-center justify-center h-40">
                  <ArrowPathIcon className="w-6 h-6 animate-spin text-orange-500" />
                  <span className="ml-2 text-sm text-gray-500">Đang tải dữ liệu...</span>
                </div>
              ) : violationReport && violationReport.data.length > 0 ? (
                <table className="min-w-full text-xs border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {[
                        'Mã NV', 'Tên Nhân Viên', 'Phòng Ban', 'Chức Danh',
                        'Vị Trí', 'Bác Sĩ', 'Tổng Công', 'Số Lần VP',
                        'Số Lần Đi Muộn', 'Số Lần Về Sớm', 'Quên Chấm Công',
                        'Phạt Đi Muộn', 'Phạt Về Sớm', 'Tổng Phạt',
                      ].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-3 py-2 text-center font-semibold text-white bg-red-700 border border-red-800"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {violationReport.data.map((item, idx) => {
                      const rowCls = idx % 2 === 0 ? 'bg-white' : 'bg-red-50';
                      return (
                        <tr key={`${item.ma_nhan_vien}-${idx}`} className={`${rowCls} hover:bg-orange-50 transition-colors`}>
                          <td className="px-3 py-1.5 font-mono border border-gray-200">{item.ma_nhan_vien}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap border border-gray-200">{item.ten_nhan_vien}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap border border-gray-200">{item.phong_ban}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap border border-gray-200">{item.chuc_danh}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap border border-gray-200">{item.vi_tri}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap border border-gray-200">{item.bac_si}</td>
                          <td className="px-3 py-1.5 text-right border border-gray-200">{item.tong_cong}</td>
                          <td className="px-3 py-1.5 text-right font-semibold text-red-700 border border-gray-200">{item.so_lan_vi_pham}</td>
                          <td className="px-3 py-1.5 text-right border border-gray-200">{item.so_lan_di_muon}</td>
                          <td className="px-3 py-1.5 text-right border border-gray-200">{item.so_lan_ve_som}</td>
                          <td className="px-3 py-1.5 text-right border border-gray-200">{item.so_lan_quen_cham_cong}</td>
                          <td className="px-3 py-1.5 text-right border border-gray-200">{formatNumber(item.tong_phat_di_muon)}</td>
                          <td className="px-3 py-1.5 text-right border border-gray-200">{formatNumber(item.tong_phat_ve_som)}</td>
                          <td className="px-3 py-1.5 text-right font-semibold text-red-600 border border-gray-200">{formatNumber(item.tong_phat)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-40">
                  <p className="text-sm text-gray-500">Không có dữ liệu vi phạm.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <span className="text-xs text-gray-500">
                {violationReport
                  ? `${violationReport.total_violations} vi phạm · Tháng ${violationReport.month}/${violationReport.year}`
                  : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportViolation}
                  disabled={exportingViolation || !violationReport || violationReport.data.length === 0}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-1.5" />
                  {exportingViolation ? 'Đang xuất...' : 'Tải Excel'}
                </button>
                <button
                  onClick={() => setShowViolationModal(false)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lock Confirm Modal */}
      {showLockConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className={`px-6 py-4 flex items-center gap-3 ${isLocked ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'}`}>
              {isLocked ? (
                <LockOpenIcon className="w-6 h-6 text-green-600" />
              ) : (
                <LockClosedIcon className="w-6 h-6 text-red-600" />
              )}
              <div>
                <h3 className={`text-base font-semibold ${isLocked ? 'text-green-900' : 'text-red-900'}`}>
                  {isLocked ? 'Mở khóa chốt công' : 'Khóa chốt công'}
                </h3>
                <p className="text-sm text-gray-600">
                  Tháng {selectedMonth}/{selectedYear}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-700">
                {isLocked ? (
                  <>
                    Mở khóa sẽ cho phép <strong>tạo đơn</strong>, <strong>phê duyệt</strong> và <strong>chốt công</strong> cho tháng {selectedMonth}/{selectedYear} cho tất cả người dùng.
                  </>
                ) : (
                  <div className="space-y-2">
                    <p>Khóa chốt công tháng {selectedMonth}/{selectedYear} sẽ ảnh hưởng như sau:</p>
                    <ul className="text-xs space-y-1 ml-1">
                      <li className="flex items-start gap-1.5">
                        <span className="text-red-500 mt-0.5 font-bold">✕</span>
                        <span><strong>Nhân viên, Quản lý:</strong> Không thể tạo đơn, phê duyệt</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5 font-bold">⚡</span>
                        <span><strong>Admin:</strong> Vẫn được phê duyệt và từ chối</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5 font-bold">⚡</span>
                        <span><strong>HR:</strong> Vẫn được phê duyệt và từ chối (không tạo đơn)</span>
                      </li>
                    </ul>
                  </div>
                )}
              </p>

              {/* Đặt lịch tự động */}
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                    <ClockIcon className="w-4 h-4 text-indigo-500" />
                    Đặt lịch tự động
                  </div>
                  {lockStartAt && (
                    <button
                      type="button"
                      onClick={() => setLockStartAt('')}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                      Xóa lịch
                    </button>
                  )}
                </div>

                <div className="p-3 space-y-3">
                  {lockStartAt ? (
                    <div className="flex items-start gap-3 bg-indigo-50 rounded-lg px-3 py-2.5">
                      <div className="flex-shrink-0 mt-0.5 h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                        <ClockIcon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-medium text-indigo-800 mb-1">Lịch đã đặt</p>
                        <p className="text-indigo-700">
                          <span className="text-indigo-500">Tự động khóa lúc:</span>{' '}
                          <strong>{new Date(lockStartAt).toLocaleString('vi-VN')}</strong>
                        </p>
                        <p className="text-amber-600 mt-0.5">
                          Mở khóa thủ công khi cần.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Bắt đầu khóa
                    </label>
                    <input
                      type="datetime-local"
                      value={lockStartAt}
                      onChange={(e) => setLockStartAt(e.target.value)}
                      className="block w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {!lockStartAt && (
                    <p className="text-xs text-gray-400 italic">
                      Để trống nếu muốn khóa/mở thủ công.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Ghi chú (tùy chọn)
                </label>
                <textarea
                  value={lockNote}
                  onChange={(e) => setLockNote(e.target.value)}
                  placeholder={isLocked ? 'Lý do mở khóa...' : 'Lý do khóa...'}
                  rows={2}
                  className="block w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {lockStatus?.locked_by && isLocked && (
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-md px-3 py-2">
                  <ClockIcon className="w-4 h-4" />
                  <span>
                    Khóa bởi <strong>{lockStatus.locked_by}</strong>
                    {lockStatus.locked_at && (
                      <> lúc {new Date(lockStatus.locked_at).toLocaleString('vi-VN')}</>
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => { setShowLockConfirm(false); setLockNote(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleToggleLock}
                disabled={togglingLock}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  isLocked
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {togglingLock ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin mr-1.5" />
                ) : isLocked ? (
                  <LockOpenIcon className="w-4 h-4 mr-1.5" />
                ) : (
                  <LockClosedIcon className="w-4 h-4 mr-1.5" />
                )}
                {togglingLock
                  ? 'Đang xử lý...'
                  : isLocked
                    ? 'Xác nhận mở khóa'
                    : 'Xác nhận khóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Pivot Preview Modal */}
      {showDailyPreviewModal && dailyPivotRecords.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[98vw] max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <TableCellsIcon className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Bảng công chi tiết
                  </h2>
                  <p className="text-xs text-gray-500">
                    Tháng {selectedMonth}/{selectedYear} · {dailyPivotRecords.length} nhân viên đã chốt
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDailyPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Pivot Table */}
            <div className="flex-1 overflow-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="whitespace-nowrap px-2 py-2 text-center font-semibold text-white bg-indigo-700 border border-indigo-800">
                      STT
                    </th>
                    <th className="whitespace-nowrap px-2 py-2 text-center font-semibold text-white bg-indigo-700 border border-indigo-800">
                      Mã NV
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-white bg-indigo-700 border border-indigo-800">
                      Họ và Tên
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-white bg-indigo-700 border border-indigo-800">
                      Phòng Ban
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-white bg-indigo-700 border border-indigo-800">
                      Vị Trí
                    </th>
                    {pivotDayHeaders.map((h) => (
                      <th
                        key={h.day}
                        className="whitespace-nowrap px-1.5 py-2 text-center font-semibold text-white bg-indigo-700 border border-indigo-800 min-w-[52px]"
                      >
                        {h.label}
                      </th>
                    ))}
                    <th className="whitespace-nowrap px-2 py-2 text-center font-bold text-white bg-indigo-900 border border-indigo-800">
                      Tổng
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dailyPivotRecords.map((rec, idx) => {
                    const rowCls = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                    return (
                      <tr key={rec.ma_nv} className={`${rowCls} hover:bg-indigo-50/40 transition-colors`}>
                        <td className="px-2 py-1.5 text-center border border-gray-200">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-center border border-gray-200">
                          {rec.ma_nv}
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap border border-gray-200">
                          {rec.ho_va_ten}
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap border border-gray-200 text-gray-600">
                          {rec.phong_ban ?? '—'}
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap border border-gray-200 text-gray-600">
                          {rec.vi_tri ?? '—'}
                        </td>
                        {(rec.daily_summary || []).map((d) => {
                          const creditStr = formatDailyCredit(d);
                          const cellCls =
                            d.day_type === 'P' ? 'bg-amber-50 text-amber-700 font-medium'
                            : d.day_type === 'OLW' ? 'bg-cyan-50 text-cyan-700 font-medium'
                            : d.day_type === 'L' ? 'bg-blue-50 text-blue-600 font-medium'
                            : d.is_weekend && !creditStr ? 'bg-gray-100 text-gray-400'
                            : d.work_credit >= 1 ? 'text-green-700 font-medium'
                            : d.work_credit > 0 ? 'text-orange-600 font-medium'
                            : '';
                          return (
                            <td
                              key={d.date}
                              className={`px-1.5 py-1.5 text-center border border-gray-200 ${cellCls}`}
                              title={d.holiday_name || d.weekday_label}
                            >
                              {creditStr}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1.5 text-center font-bold text-indigo-700 border border-gray-200 bg-indigo-50/50">
                          {rec.tong_cong}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <span className="text-xs text-gray-500">
                {dailyPivotRecords.length} nhân viên · Tháng {selectedMonth}/{selectedYear}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportDailyPivot}
                  disabled={exportingDaily}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-1.5" />
                  {exportingDaily ? 'Đang xuất...' : 'Xuất Excel'}
                </button>
                <button
                  onClick={() => setShowDailyPreviewModal(false)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkFinalization;

