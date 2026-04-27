import React, { useEffect, useState } from 'react';
import { ArrowPathIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Pagination from '../components/Pagination';
import { SelectBox } from '../components/LandingLayout/SelectBox';
import { useDebounce } from '../hooks/useDebounce';
import genericRequestService, {
  GenericRequest,
  GenericRequestStatus,
  GenericRequestType,
} from '../services/genericRequest.service';
import RequestFormDialog from '../components/MyRequests/RequestFormDialog';
import RequestDetailDialog from '../components/MyRequests/RequestDetailDialog';
import FeedbackDialog, { FeedbackVariant } from '../components/FeedbackDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import PdfPreviewModal from '../components/Common/PdfPreviewModal';

const STATUS_LABELS: Record<GenericRequestStatus, string> = {
  DRAFT: 'Nháp',
  PENDING_MANAGER: 'Chờ Quản lý duyệt',
  PENDING_ADMIN: 'Chờ HCNS duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã huỷ',
};

const STATUS_COLORS: Record<GenericRequestStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_MANAGER: 'bg-yellow-100 text-yellow-800',
  PENDING_ADMIN: 'bg-orange-100 text-orange-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-200 text-gray-600',
};

const formatDate = (s: string | null) => {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('vi-VN');
  } catch {
    return s;
  }
};

const Offboarding: React.FC = () => {
  const [requests, setRequests] = useState<GenericRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters — mặc định hiển thị PENDING_ADMIN (đơn đang chờ Admin xử lý)
  const [filterType, setFilterType] = useState<GenericRequestType | ''>('');
  const [filterStatus, setFilterStatus] = useState<GenericRequestStatus | ''>('PENDING_ADMIN');
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterSearch, setFilterSearch] = useState('');
  const debouncedSearch = useDebounce(filterSearch, 400);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Dialogs
  const [editingRequest, setEditingRequest] = useState<GenericRequest | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [detailRequest, setDetailRequest] = useState<GenericRequest | null>(null);
  const [previewRequest, setPreviewRequest] = useState<GenericRequest | null>(null);

  // Confirm dialog xoá đơn
  const [deleteTarget, setDeleteTarget] = useState<GenericRequest | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Loading state cho nút "Xuất Excel" ở stat card "Đã nghỉ việc"
  const [exporting, setExporting] = useState(false);

  // Feedback dialog (thành công / lỗi)
  const [feedback, setFeedback] = useState<{
    open: boolean;
    variant: FeedbackVariant;
    title: string;
    message?: string;
  }>({ open: false, variant: 'success', title: '' });

  const showFeedback = (variant: FeedbackVariant, title: string, message?: string) => {
    setFeedback({ open: true, variant, title, message });
  };
  const [approveTarget, setApproveTarget] = useState<GenericRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<GenericRequest | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    resigned: 0,       // Tổng số người đã nghỉ việc (RESIGNATION approved + expected_date <= hôm nay)
    upcomingResign: 0, // Sắp nghỉ việc (RESIGNATION approved + expected_date > hôm nay)
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Admin xem tất cả đơn — BE visible-Q tự cho phép is_staff/is_superuser thấy hết.
      // Không cần truyền owner; chỉ filter theo status để nhận đúng đơn cần xử lý.
      const data = await genericRequestService.list({
        page: currentPage,
        page_size: itemsPerPage,
        request_type: filterType || undefined,
        status: filterStatus || undefined,
        month: filterMonth > 0 ? filterMonth : undefined,
        year: filterMonth > 0 ? filterYear : undefined,
        search: debouncedSearch.trim() || undefined,
      });
      setRequests(data.results || []);
      setTotalCount(data.count || 0);
    } catch (e) {
      console.error(e);
      alert('Không thể tải danh sách đơn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [pending, approved, rejected, resignedApproved] = await Promise.all([
        genericRequestService.list({ status: 'PENDING_ADMIN', page_size: 1 }),
        genericRequestService.list({ status: 'APPROVED', page_size: 1 }),
        genericRequestService.list({ status: 'REJECTED', page_size: 1 }),
        // Lấy toàn bộ đơn nghỉ việc đã duyệt để đếm theo ngày dự kiến
        genericRequestService.list({
          status: 'APPROVED',
          request_type: 'RESIGNATION',
          page_size: 500,
        }),
      ]);

      // Tách resigned / upcoming dựa trên expected_date
      const todayStr = new Date().toISOString().slice(0, 10);
      let resignedCount = 0;
      let upcomingCount = 0;
      (resignedApproved.results || []).forEach((r) => {
        if (!r.expected_date) return; // bỏ qua đơn thiếu ngày nghỉ dự kiến
        if (r.expected_date <= todayStr) {
          resignedCount += 1;
        } else {
          upcomingCount += 1;
        }
      });

      setStats({
        pending: pending.count || 0,
        approved: approved.count || 0,
        rejected: rejected.count || 0,
        resigned: resignedCount,
        upcomingResign: upcomingCount,
      });
    } catch (e) {
      // silent fail
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, filterType, filterStatus, filterMonth, filterYear, debouncedSearch]);

  useEffect(() => {
    fetchStats();
  }, []);

  const openEdit = (req: GenericRequest) => {
    setEditingRequest(req);
    setShowFormDialog(true);
  };

  const handleDelete = (req: GenericRequest) => {
    setDeleteTarget(req);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await genericRequestService.remove(deleteTarget.id);
      const title = deleteTarget.title;
      setDeleteTarget(null);
      await fetchRequests();
      await fetchStats();
      showFeedback('success', 'Xoá đơn thành công', `Đơn "${title}" đã được xoá.`);
    } catch (e: any) {
      setDeleteTarget(null);
      showFeedback(
        'error',
        'Xoá đơn thất bại',
        e?.response?.data?.detail || e?.message || 'Có lỗi xảy ra khi xoá đơn.'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // Xuất Excel danh sách "Đã nghỉ việc" — RESIGNATION approved + expected_date <= today
  const handleExportResigned = async () => {
    setExporting(true);
    try {
      const data = await genericRequestService.list({
        status: 'APPROVED',
        request_type: 'RESIGNATION',
        page_size: 500,
      });

      const todayStr = new Date().toISOString().slice(0, 10);
      const rows = (data.results || []).filter(
        (r) => r.expected_date && r.expected_date <= todayStr
      );

      if (rows.length === 0) {
        showFeedback(
          'info',
          'Không có dữ liệu',
          'Hiện chưa có nhân viên nào đã nghỉ việc để xuất.'
        );
        return;
      }

      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Đã nghỉ việc', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      sheet.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Mã đơn', key: 'request_code', width: 18 },
        { header: 'Mã NV', key: 'employee_code', width: 14 },
        { header: 'Họ và tên', key: 'employee_name', width: 25 },
        { header: 'Chức vụ', key: 'position', width: 20 },
        { header: 'Phòng ban', key: 'department', width: 20 },
        { header: 'Ngày bắt đầu nghỉ', key: 'expected_date', width: 18 },
        { header: 'Ngày HCNS duyệt', key: 'approved_at', width: 18 },
        { header: 'Lý do', key: 'reason', width: 40 },
        { header: 'Người phê duyệt cuối', key: 'admin_approved_by_name', width: 22 },
      ];

      // Style header row
      const headerRow = sheet.getRow(1);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' },
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      const fmtDate = (iso: string | null) => {
        if (!iso) return '';
        const d = iso.slice(0, 10).split('-');
        return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso;
      };

      rows.forEach((req, idx) => {
        const row = sheet.addRow({
          stt: idx + 1,
          request_code: req.request_code || '',
          employee_code: req.employee_code || '',
          employee_name: req.employee_name || '',
          position: req.extra_data?.position_override || req.employee_position || '',
          department: req.extra_data?.department_override || req.employee_department || '',
          expected_date: fmtDate(req.expected_date),
          approved_at: fmtDate(req.approved_at),
          reason: req.reason || '',
          admin_approved_by_name: req.admin_approved_by_name || '',
        });
        row.eachCell((cell, colIdx) => {
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          };
          cell.alignment = {
            vertical: 'middle',
            horizontal: colIdx === 1 ? 'center' : 'left',
            wrapText: colIdx === 9,
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `danh-sach-nghi-viec-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showFeedback(
        'success',
        'Xuất Excel thành công',
        `Đã xuất ${rows.length} nhân viên đã nghỉ việc.`
      );
    } catch (e: any) {
      showFeedback(
        'error',
        'Xuất Excel thất bại',
        e?.message || 'Có lỗi xảy ra khi tạo file Excel.'
      );
    } finally {
      setExporting(false);
    }
  };

  const confirmAdminApprove = async () => {
    if (!approveTarget) return;
    setActionLoading(true);
    try {
      await genericRequestService.adminApprove(approveTarget.id, approvalNote);
      setApproveTarget(null);
      setApprovalNote('');
      await fetchRequests();
      await fetchStats();
    } catch (e: any) {
      alert('Duyệt thất bại: ' + (e?.response?.data?.error || e?.message || 'Lỗi'));
    } finally {
      setActionLoading(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!approvalNote.trim()) {
      alert('Vui lòng nhập lý do từ chối.');
      return;
    }
    setActionLoading(true);
    try {
      await genericRequestService.reject(rejectTarget.id, approvalNote);
      setRejectTarget(null);
      setApprovalNote('');
      await fetchRequests();
      await fetchStats();
    } catch (e: any) {
      alert('Từ chối thất bại: ' + (e?.response?.data?.error || e?.message || 'Lỗi'));
    } finally {
      setActionLoading(false);
    }
  };

  const hasFilter =
    filterType !== '' || filterStatus !== 'PENDING_ADMIN' || filterMonth > 0 || filterSearch !== '';

  const resetFilters = () => {
    setFilterType('');
    setFilterStatus('PENDING_ADMIN');
    setFilterMonth(0);
    setFilterSearch('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Offboard nhân sự</h1>
        <p className="text-gray-600 mt-2">
          Quản lý đơn nghỉ việc & các yêu cầu offboard. Admin xử lý cuối ở đây sau khi Quản lý đã duyệt.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
          <h3 className="font-medium text-orange-900">Chờ HCNS duyệt</h3>
          <p className="text-3xl font-bold text-orange-700 mt-2">{stats.pending}</p>
          <p className="text-orange-600 text-sm mt-1">Cần xử lý</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <h3 className="font-medium text-green-900">Đã duyệt</h3>
          <p className="text-3xl font-bold text-green-700 mt-2">{stats.approved}</p>
          <p className="text-green-600 text-sm mt-1">Tổng số đã duyệt</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
          <h3 className="font-medium text-red-900">Từ chối</h3>
          <p className="text-3xl font-bold text-red-700 mt-2">{stats.rejected}</p>
          <p className="text-red-600 text-sm mt-1">Tổng số từ chối</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col">
          <h3 className="font-medium text-gray-900">Đã nghỉ việc</h3>
          <p className="text-3xl font-bold text-gray-700 mt-2">{stats.resigned}</p>
          <p className="text-gray-600 text-sm mt-1">Ngày nghỉ ≤ hôm nay</p>
          {stats.resigned > 0 && (
            <button
              onClick={handleExportResigned}
              disabled={exporting}
              className="mt-2 px-3 py-1.5 text-xs font-medium text-white bg-gray-700 rounded hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 self-start"
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              {exporting ? 'Đang xuất...' : 'Xuất Excel'}
            </button>
          )}
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="font-medium text-blue-900">Sắp nghỉ việc</h3>
          <p className="text-3xl font-bold text-blue-700 mt-2">{stats.upcomingResign}</p>
          <p className="text-blue-600 text-sm mt-1">Ngày nghỉ &gt; hôm nay</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Đơn nghỉ việc & yêu cầu cần xử lý</h2>
          <p className="text-gray-500 text-sm">Tổng: {totalCount} đơn</p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="w-52">
            <SelectBox
              label="Loại đơn"
              value={filterType}
              options={[
                { value: '', label: 'Tất cả loại đơn' },
                { value: 'RESIGNATION', label: 'Đơn xin nghỉ việc' },
                { value: 'PROPOSAL', label: 'Đơn đề xuất' },
                { value: 'CONFIRMATION', label: 'Đơn xác nhận' },
                { value: 'COMPLAINT', label: 'Đơn khiếu nại' },
                { value: 'OTHER', label: 'Đơn khác' },
              ]}
              onChange={(v) => { setFilterType(v as GenericRequestType | ''); setCurrentPage(1); }}
            />
          </div>
          <div className="w-52">
            <SelectBox
              label="Trạng thái"
              value={filterStatus}
              options={[
                { value: 'PENDING_ADMIN', label: 'Chờ HCNS duyệt' },
                { value: '', label: 'Tất cả' },
                { value: 'APPROVED', label: 'Đã duyệt' },
                { value: 'REJECTED', label: 'Từ chối' },
                { value: 'CANCELLED', label: 'Đã huỷ' },
              ]}
              onChange={(v) => { setFilterStatus(v as GenericRequestStatus | ''); setCurrentPage(1); }}
            />
          </div>
          <div className="w-40">
            <SelectBox
              label="Tháng"
              value={filterMonth}
              options={[
                { value: 0, label: 'Tất cả tháng' },
                ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` })),
              ]}
              onChange={(v) => { setFilterMonth(Number(v)); setCurrentPage(1); }}
            />
          </div>
          {filterMonth > 0 && (
            <div className="w-32">
              <SelectBox
                label="Năm"
                value={filterYear}
                options={Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - i;
                  return { value: y, label: String(y) };
                })}
                onChange={(v) => { setFilterYear(Number(v)); setCurrentPage(1); }}
              />
            </div>
          )}
          <div className="relative">
            <label className="block text-sm font-medium mb-1 text-gray-700">Tìm kiếm</label>
            <div className="relative">
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => { setFilterSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Tên NV, mã đơn, lý do..."
                className="border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-60"
              />
              <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {hasFilter && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              Đặt lại bộ lọc
            </button>
          )}

          <button
            onClick={() => { fetchRequests(); fetchStats(); }}
            disabled={loading}
            className="ml-auto px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center gap-1.5 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto w-full">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Mã đơn', 'Nhân viên', 'Phòng ban', 'Loại đơn', 'Ngày nghỉ dự kiến', 'Manager duyệt', 'Trạng thái', 'Thao tác'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">Đang tải...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    Không có đơn nào{hasFilter ? ' khớp với bộ lọc' : ''}.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">
                      {req.request_code || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {req.employee_name}
                      <div className="text-xs text-gray-500 font-mono">{req.employee_code}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {req.employee_department || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {req.request_type_display}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(req.expected_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {req.manager_approved_by_name ? (
                        <>
                          <div>{req.manager_approved_by_name}</div>
                          <div className="text-xs text-gray-400">{formatDate(req.manager_approved_at)}</div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[req.status]}`}>
                        {STATUS_LABELS[req.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Action chính (Duyệt/Từ chối) — ưu tiên hiển thị đầu tiên */}
                        {req.status === 'PENDING_ADMIN' && (
                          <>
                            <button
                              onClick={() => { setApproveTarget(req); setApprovalNote(''); }}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-green-600 border border-green-600 rounded hover:bg-green-700"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => { setRejectTarget(req); setApprovalNote(''); }}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 border border-red-600 rounded hover:bg-red-700"
                            >
                              Từ chối
                            </button>
                            <button
                              onClick={() => openEdit(req)}
                              className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50"
                            >
                              Sửa
                            </button>
                          </>
                        )}

                        {/* Xoá — Admin có thể xoá ở MỌI status (soft delete từ BE) */}
                        <button
                          onClick={() => handleDelete(req)}
                          className="px-2.5 py-1 text-xs font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50"
                        >
                          Xoá
                        </button>

                        {/* View buttons (Xem PDF + Chi tiết) — đẩy xuống cuối */}
                        {req.request_type === 'RESIGNATION' && (
                          <button
                            onClick={() => setPreviewRequest(req)}
                            className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-white border border-purple-300 rounded hover:bg-purple-50"
                          >
                            Xem PDF
                          </button>
                        )}
                        <button
                          onClick={() => setDetailRequest(req)}
                          className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                        >
                          Chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalCount / itemsPerPage) || 1}
            totalItems={totalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={(page: number) => setCurrentPage(page)}
            onItemsPerPageChange={(size: number) => { setItemsPerPage(size); setCurrentPage(1); }}
          />
        </div>
      </div>

      <RequestFormDialog
        open={showFormDialog}
        editing={editingRequest}
        editMode="admin"
        onClose={() => setShowFormDialog(false)}
        onSaved={fetchRequests}
      />

      <RequestDetailDialog
        request={detailRequest}
        onClose={() => setDetailRequest(null)}
        onPreviewPdf={(r) => { setDetailRequest(null); setPreviewRequest(r); }}
      />

      <PdfPreviewModal
        open={!!previewRequest}
        title={previewRequest ? `Xem trước: ${previewRequest.title}` : 'Xem PDF'}
        loader={previewRequest ? () => genericRequestService.previewPdf(previewRequest.id) : null}
        downloadFilename={previewRequest ? `${previewRequest.request_code || 'don'}.pdf` : 'don.pdf'}
        onClose={() => setPreviewRequest(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title="Xoá đơn"
        message={
          deleteTarget
            ? `Bạn có chắc muốn xoá đơn "${deleteTarget.title}" (mã ${deleteTarget.request_code || 'N/A'})? Đơn sẽ bị đánh dấu xoá và không hiển thị nữa.`
            : undefined
        }
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <FeedbackDialog
        open={feedback.open}
        variant={feedback.variant}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((f) => ({ ...f, open: false }))}
      />

      {/* Modal Admin duyệt cuối */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Duyệt đơn (HCNS)</h3>
            <p className="text-sm text-gray-600 mb-1">
              Bạn sẽ duyệt cuối đơn <span className="font-medium">{approveTarget.title}</span> của{' '}
              <span className="font-medium">{approveTarget.employee_name}</span>.
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Đơn sau khi duyệt sẽ chuyển sang trạng thái "Đã duyệt" và có hiệu lực.
            </p>
            <textarea
              rows={3}
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder="Ghi chú (tuỳ chọn)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setApproveTarget(null); setApprovalNote(''); }}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                onClick={confirmAdminApprove}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? 'Đang duyệt...' : 'Xác nhận duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal từ chối */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Từ chối đơn (Admin)</h3>
            <p className="text-sm text-gray-600 mb-3">
              Từ chối đơn <span className="font-medium">{rejectTarget.title}</span> của{' '}
              <span className="font-medium">{rejectTarget.employee_name}</span>.
            </p>
            <textarea
              rows={3}
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder="Lý do từ chối (bắt buộc)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setRejectTarget(null); setApprovalNote(''); }}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                onClick={confirmReject}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Offboarding;
