import React, { useState, useEffect, useCallback } from 'react';
import { SelectBox } from '../components/LandingLayout/SelectBox';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  XCircleIcon,
  ClockIcon,
  BoltIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { departmentsAPI, Department } from '../utils/api';
import {
  workFinalizationApprovalService,
  DepartmentWorkFinalizationApproval,
  ApprovalStatus,
  ApprovalListParams,
  SendAllApprovalsResponse,
} from '../services/workFinalizationApproval.service';
import { approvalService } from '../services/approval.service';

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  PENDING:  'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const WorkFinalizationApprovals: React.FC = () => {
  const { user } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);

  const userRole = user?.role ? user.role.toUpperCase() : 'USER';
  const isAdmin = (user as any)?.is_superuser || (user as any)?.is_staff || userRole === 'ADMIN';
  const isHR =
    (user as any)?.employee_profile?.is_hr ||
    userRole === 'HR' ||
    (user as any)?.hrm_user?.department_code === 'HCNS';
  const isHROrAdmin = isAdmin || isHR;
  const isManager = !!(user as any)?.is_manager;

  const managerDeptCode: string | null =
    (user as any)?.employee_profile?.department_code ||
    (user as any)?.hrm_user?.department_code ||
    (user as any)?.department_code ||
    null;

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [approvals, setApprovals] = useState<DepartmentWorkFinalizationApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [sendingDept, setSendingDept] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendAllResult, setSendAllResult] = useState<SendAllApprovalsResponse | null>(null);

  const [actionTarget, setActionTarget] = useState<DepartmentWorkFinalizationApproval | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [actionNote, setActionNote] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const emp = await approvalService.getCurrentEmployee();
        setCurrentEmployee(emp);
      } catch (e) {
        console.error('Error fetching employee in WorkFinalization:', e);
      }
    };
    fetchEmployee();
  }, []);

  useEffect(() => {
    console.log('👤 [ROLE CHECK] WorkFinalizationApprovals:', {
      userRole, isAdmin, isHR, isManager, username: user?.username,
    });
  }, [userRole, isAdmin, isHR]);

  useEffect(() => {
    departmentsAPI.list({ page_size: 200 }).then((res) => {
      if (!isHROrAdmin && isManager && managerDeptCode) {
        setDepartments(res.results.filter((d) => d.code === managerDeptCode));
      } else {
        setDepartments(res.results);
      }
    }).catch(() => {});
  }, [isHROrAdmin, isManager, managerDeptCode]);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ApprovalListParams = { year: selectedYear, month: selectedMonth };
      if (filterStatus) params.status = filterStatus as ApprovalStatus;
      const res = await workFinalizationApprovalService.list(params);
      setApprovals(res.results);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Không thể tải dữ liệu phê duyệt. Vui lòng thử lại.');
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, filterStatus]);

  useEffect(() => { loadApprovals(); }, [loadApprovals]);

  const handleSendOne = async (deptCode: string) => {
    setSendingDept(deptCode);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await workFinalizationApprovalService.send({
        department_code: deptCode,
        year: selectedYear,
        month: selectedMonth,
      });
      setSuccessMsg(
        `${res.created ? 'Đã gửi yêu cầu' : 'Đã cập nhật yêu cầu'} phê duyệt cho phòng ban "${deptCode}"`
      );
      await loadApprovals();
    } catch (err: any) {
      setError(err?.response?.data?.error || `Lỗi khi gửi yêu cầu phê duyệt cho "${deptCode}"`);
    } finally {
      setSendingDept(null);
    }
  };

  const handleSendAll = async () => {
    if (!window.confirm(
      `Bạn có chắc muốn gửi yêu cầu phê duyệt cho tất cả phòng ban tháng ${selectedMonth}/${selectedYear}?`
    )) return;
    setSendingAll(true);
    setError(null);
    setSuccessMsg(null);
    setSendAllResult(null);
    try {
      const res = await workFinalizationApprovalService.sendAll({ year: selectedYear, month: selectedMonth });
      setSendAllResult(res);
      setSuccessMsg(
        `Đã gửi yêu cầu phê duyệt cho ${res.total_processed} phòng ban tháng ${selectedMonth}/${selectedYear}` +
          (res.total_errors > 0 ? ` (${res.total_errors} lỗi)` : '')
      );
      await loadApprovals();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Lỗi khi gửi yêu cầu phê duyệt. Vui lòng thử lại.');
    } finally {
      setSendingAll(false);
    }
  };

  const openActionModal = (approval: DepartmentWorkFinalizationApproval, type: 'APPROVE' | 'REJECT') => {
    setActionTarget(approval);
    setActionType(type);
    setActionNote('');
    setShowActionModal(true);
  };

  const handleAction = async () => {
    if (!actionTarget) return;
    setActionProcessing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (actionType === 'APPROVE') {
        await workFinalizationApprovalService.approve(actionTarget.id, { note: actionNote.trim() || undefined });
        setSuccessMsg(
          `Đã duyệt chốt công phòng ban "${actionTarget.department_name || actionTarget.department_code}" tháng ${selectedMonth}/${selectedYear}`
        );
      } else {
        await workFinalizationApprovalService.reject(actionTarget.id, { note: actionNote.trim() || undefined });
        setSuccessMsg(
          `Đã từ chối chốt công phòng ban "${actionTarget.department_name || actionTarget.department_code}" tháng ${selectedMonth}/${selectedYear}`
        );
      }
      setShowActionModal(false);
      await loadApprovals();
    } catch (err: any) {
      setError(err?.response?.data?.error ||
        `Lỗi khi ${actionType === 'APPROVE' ? 'phê duyệt' : 'từ chối'}. Vui lòng thử lại.`);
    } finally {
      setActionProcessing(false);
    }
  };

  const getDeptApproval = (deptCode: string): DepartmentWorkFinalizationApproval | undefined =>
    approvals.find((a) => a.department_code === deptCode);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Phê duyệt chốt công</h1>
            <p className="text-sm text-gray-600 mt-0.5">Quản lý bảng tính công hàng tháng và xuất báo cáo tính lương.</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={handleSendAll}
            disabled={sendingAll || departments.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            {sendingAll ? 'Đang gửi...' : `Gửi phê duyệt tất cả (Tháng ${selectedMonth}/${selectedYear})`}
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 p-4 text-sm text-red-700 bg-red-50 rounded-2xl border border-red-200">
          <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 text-sm text-emerald-700 bg-emerald-50 rounded-2xl border border-emerald-200">
          <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Send-all result summary */}
      {sendAllResult && (
        <div className="bg-white rounded-2xl border border-primary-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <BoltIcon className="w-4 h-4 text-primary-500" />
              Kết quả gửi phê duyệt — Tháng {sendAllResult.month}/{sendAllResult.year}
            </span>
            <button onClick={() => setSendAllResult(null)} className="text-xs text-gray-400 hover:text-gray-600">
              Đóng
            </button>
          </div>
          <div className="flex gap-4 text-sm mb-3">
            <span className="text-emerald-700 font-medium">✓ Đã xử lý: {sendAllResult.total_processed}</span>
            {sendAllResult.total_errors > 0 && (
              <span className="text-red-600 font-medium">✗ Lỗi: {sendAllResult.total_errors}</span>
            )}
          </div>
          {sendAllResult.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-red-700 mb-1">Chi tiết lỗi:</p>
              <ul className="space-y-1">
                {sendAllResult.errors.map((e) => (
                  <li key={e.department_code} className="text-xs text-red-600 bg-red-50 rounded-xl px-2 py-1">
                    <span className="font-mono">{e.department_code}</span>: {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Manager: pending-approval card */}
      {isManager && managerDeptCode && (() => {
        const myApproval = getDeptApproval(managerDeptCode);
        if (!myApproval || myApproval.status !== 'PENDING') return null;
        return (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <ClockIcon className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Yêu cầu phê duyệt chốt công đang chờ xử lý
                </p>
                <p className="text-sm text-amber-800 mt-0.5">
                  Phòng ban <span className="font-medium">{myApproval.department_name || myApproval.department_code}</span>{' '}
                  — Tháng {myApproval.month}/{myApproval.year}
                  {myApproval.sent_by_name && (
                    <> · Gửi bởi <span className="font-medium">{myApproval.sent_by_name}</span></>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => openActionModal(myApproval, 'APPROVE')}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                <CheckCircleIcon className="w-4 h-4" />
                Duyệt
              </button>
              <button
                onClick={() => openActionModal(myApproval, 'REJECT')}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <XCircleIcon className="w-4 h-4" />
                Từ chối
              </button>
            </div>
          </div>
        );
      })()}

      {/* Filters */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-bold text-gray-900">Bộ lọc</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <SelectBox<number>
            label="Tháng"
            value={selectedMonth}
            options={months.map((m) => ({ value: m, label: `Tháng ${m}` }))}
            onChange={setSelectedMonth}
          />
          <SelectBox<number>
            label="Năm"
            value={selectedYear}
            options={years.map((y) => ({ value: y, label: String(y) }))}
            onChange={setSelectedYear}
          />
          <SelectBox<string>
            label="Trạng thái"
            value={filterStatus}
            options={[
              { value: '', label: 'Tất cả' },
              { value: 'PENDING', label: 'Chờ duyệt' },
              { value: 'APPROVED', label: 'Đã duyệt' },
              { value: 'REJECTED', label: 'Từ chối' },
            ]}
            onChange={setFilterStatus}
          />
          <div>
            <button
              onClick={loadApprovals}
              className="btn-secondary flex items-center gap-1.5 w-full justify-center"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">Danh sách phê duyệt theo phòng ban</span>
          <span className="text-xs text-gray-400">{approvals.length} bản ghi</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">Không có phòng ban nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Phòng ban', 'Trạng thái', 'Người gửi', 'Người duyệt', 'Thời gian duyệt', 'Ghi chú', 'Thao tác'].map((h, i) => (
                    <th
                      key={h}
                      className={`table-header ${i === 6 ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {departments.map((dept) => {
                  const approval = getDeptApproval(dept.code);
                  const isMyDept = isManager && dept.code === managerDeptCode;
                  return (
                    <tr
                      key={dept.id}
                      className={`hover:bg-gray-50 transition-colors ${isMyDept && approval?.status === 'PENDING' ? 'bg-amber-50' : ''}`}
                    >
                      <td className="table-cell">
                        <div className="font-medium text-gray-900">
                          {dept.name}
                          {isMyDept && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                              Phòng của bạn
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">{dept.code}</div>
                      </td>
                      <td className="table-cell">
                        {approval ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[approval.status]}`}>
                            {approval.status === 'PENDING' && <ClockIcon className="w-3 h-3" />}
                            {approval.status === 'APPROVED' && <CheckCircleIcon className="w-3 h-3" />}
                            {approval.status === 'REJECTED' && <XCircleIcon className="w-3 h-3" />}
                            {STATUS_LABELS[approval.status]}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Chưa gửi</span>
                        )}
                      </td>
                      <td className="table-cell text-gray-500">{approval?.sent_by_name ?? '—'}</td>
                      <td className="table-cell text-gray-500">{approval?.approved_by_name ?? '—'}</td>
                      <td className="table-cell text-gray-500 whitespace-nowrap">
                        {approval?.approved_at ? new Date(approval.approved_at).toLocaleString('vi-VN') : '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{approval?.note ?? '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {isHROrAdmin && (
                            <button
                              onClick={() => handleSendOne(dept.code)}
                              disabled={sendingDept === dept.code}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                                approval
                                  ? 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
                                  : 'border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100'
                              }`}
                            >
                              <PaperAirplaneIcon className="w-3 h-3" />
                              {sendingDept === dept.code
                                ? 'Đang xử lý...'
                                : isAdmin
                                  ? (approval ? 'Gửi lại' : 'Gửi phê duyệt')
                                  : (approval ? 'Chốt lại' : 'Chốt công')}
                            </button>
                          )}
                          {approval && approval.status === 'PENDING' && (isHROrAdmin || (isManager && isMyDept)) && (
                            <>
                              <button
                                onClick={() => openActionModal(approval, 'APPROVE')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                              >
                                <CheckCircleIcon className="w-3 h-3" />
                                Duyệt
                              </button>
                              <button
                                onClick={() => openActionModal(approval, 'REJECT')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                              >
                                <XCircleIcon className="w-3 h-3" />
                                Từ chối
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve / Reject modal */}
      {showActionModal && actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                actionType === 'APPROVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
              }`}>
                {actionType === 'APPROVE'
                  ? <CheckCircleIcon className="h-5 w-5" />
                  : <XCircleIcon className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  {actionType === 'APPROVE' ? 'Phê duyệt' : 'Từ chối'} chốt công
                </h2>
                <p className="text-xs text-gray-400">
                  {actionTarget.department_name || actionTarget.department_code} — Tháng {actionTarget.month}/{actionTarget.year}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Ghi chú{' '}
                {actionType === 'REJECT' && <span className="text-gray-400">(tuỳ chọn)</span>}
              </label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={3}
                placeholder={actionType === 'APPROVE' ? 'Nhận xét (tuỳ chọn)...' : 'Lý do từ chối (tuỳ chọn)...'}
                className="input-field"
              />
              {error && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-xl p-3">
                  <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => { setShowActionModal(false); setError(null); }}
                disabled={actionProcessing}
                className="btn-secondary disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                onClick={handleAction}
                disabled={actionProcessing}
                className={`px-4 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  actionType === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionProcessing
                  ? 'Đang xử lý...'
                  : actionType === 'APPROVE'
                    ? 'Xác nhận duyệt'
                    : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkFinalizationApprovals;
