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
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const WorkFinalizationApprovals: React.FC = () => {
  const { user } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  
  const userRole = user?.role ? user.role.toUpperCase() : 'USER';
  
  const isAdmin = (user as any)?.is_superuser || (user as any)?.is_staff || userRole === 'ADMIN';
  const isHR = (user as any)?.employee_profile?.is_hr || 
               userRole === 'HR' || 
               (user as any)?.hrm_user?.department_code === 'HCNS';
  
  const isHROrAdmin = isAdmin || isHR;
  const isManager = !!(user as any)?.is_manager;

  // Department code of the currently logged-in manager
  const managerDeptCode: string | null =
    (user as any)?.employee_profile?.department_code ||
    (user as any)?.hrm_user?.department_code ||
    (user as any)?.department_code ||
    null;

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(
    now.getMonth() + 1
  );
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [approvals, setApprovals] = useState<DepartmentWorkFinalizationApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sending state
  const [sendingDept, setSendingDept] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendAllResult, setSendAllResult] =
    useState<SendAllApprovalsResponse | null>(null);

  // Action modal (approve/reject)
  const [actionTarget, setActionTarget] =
    useState<DepartmentWorkFinalizationApproval | null>(null);
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
      userRole,
      isAdmin,
      isHR,
      isManager,
      username: user?.username
    });
  }, [userRole, isAdmin, isHR]);

  // Load departments — managers only see their own department
  useEffect(() => {
    departmentsAPI
      .list({ page_size: 200 })
      .then((res) => {
        if (!isHROrAdmin && isManager && managerDeptCode) {
          // Filter to only the manager's department
          setDepartments(
            res.results.filter((d) => d.code === managerDeptCode)
          );
        } else {
          setDepartments(res.results);
        }
      })
      .catch(() => {});
  }, [isHROrAdmin, isManager, managerDeptCode]);

  // Load approvals list
  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ApprovalListParams = { year: selectedYear, month: selectedMonth };
      if (filterStatus) params.status = filterStatus as ApprovalStatus;
      const res = await workFinalizationApprovalService.list(params);
      setApprovals(res.results);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          'Không thể tải dữ liệu phê duyệt. Vui lòng thử lại.'
      );
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, filterStatus]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  // HR/Admin: send approval request for a single department
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
      setError(
        err?.response?.data?.error ||
          `Lỗi khi gửi yêu cầu phê duyệt cho "${deptCode}"`
      );
    } finally {
      setSendingDept(null);
    }
  };

  // HR/Admin: send all department approval requests
  const handleSendAll = async () => {
    if (
      !window.confirm(
        `Bạn có chắc muốn gửi yêu cầu phê duyệt cho tất cả phòng ban tháng ${selectedMonth}/${selectedYear}?`
      )
    )
      return;
    setSendingAll(true);
    setError(null);
    setSuccessMsg(null);
    setSendAllResult(null);
    try {
      const res = await workFinalizationApprovalService.sendAll({
        year: selectedYear,
        month: selectedMonth,
      });
      setSendAllResult(res);
      setSuccessMsg(
        `Đã gửi yêu cầu phê duyệt cho ${res.total_processed} phòng ban tháng ${selectedMonth}/${selectedYear}` +
          (res.total_errors > 0 ? ` (${res.total_errors} lỗi)` : '')
      );
      await loadApprovals();
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          'Lỗi khi gửi yêu cầu phê duyệt. Vui lòng thử lại.'
      );
    } finally {
      setSendingAll(false);
    }
  };

  // Open approve/reject modal
  const openActionModal = (
    approval: DepartmentWorkFinalizationApproval,
    type: 'APPROVE' | 'REJECT'
  ) => {
    setActionTarget(approval);
    setActionType(type);
    setActionNote('');
    setShowActionModal(true);
  };

  // Submit approve or reject
  const handleAction = async () => {
    if (!actionTarget) return;
    setActionProcessing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (actionType === 'APPROVE') {
        await workFinalizationApprovalService.approve(actionTarget.id, {
          note: actionNote.trim() || undefined,
        });
        setSuccessMsg(
          `Đã duyệt chốt công phòng ban "${actionTarget.department_name || actionTarget.department_code}" tháng ${selectedMonth}/${selectedYear}`
        );
      } else {
        await workFinalizationApprovalService.reject(actionTarget.id, {
          note: actionNote.trim() || undefined,
        });
        setSuccessMsg(
          `Đã từ chối chốt công phòng ban "${actionTarget.department_name || actionTarget.department_code}" tháng ${selectedMonth}/${selectedYear}`
        );
      }
      setShowActionModal(false);
      await loadApprovals();
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          `Lỗi khi ${actionType === 'APPROVE' ? 'phê duyệt' : 'từ chối'}. Vui lòng thử lại.`
      );
    } finally {
      setActionProcessing(false);
    }
  };

  // Merge department list with existing approval records
  const getDeptApproval = (
    deptCode: string
  ): DepartmentWorkFinalizationApproval | undefined =>
    approvals.find((a) => a.department_code === deptCode);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Phê duyệt chốt công
        </h1>
        {isAdmin && (
          <button
            onClick={handleSendAll}
            disabled={sendingAll || departments.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <PaperAirplaneIcon className="w-4 h-4 mr-2" />
            {sendingAll
              ? 'Đang gửi...'
              : `Gửi phê duyệt tất cả (Tháng ${selectedMonth}/${selectedYear})`}
          </button>
        )}
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

      {/* Send-all result summary */}
      {sendAllResult && (
        <div className="bg-white shadow rounded-lg p-4 border border-indigo-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <BoltIcon className="w-4 h-4 text-indigo-500" />
              Kết quả gửi phê duyệt — Tháng {sendAllResult.month}/
              {sendAllResult.year}
            </span>
            <button
              onClick={() => setSendAllResult(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Đóng
            </button>
          </div>
          <div className="flex gap-4 text-sm mb-3">
            <span className="text-green-700 font-medium">
              ✓ Đã xử lý: {sendAllResult.total_processed}
            </span>
            {sendAllResult.total_errors > 0 && (
              <span className="text-red-600 font-medium">
                ✗ Lỗi: {sendAllResult.total_errors}
              </span>
            )}
          </div>
          {sendAllResult.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-red-700 mb-1">
                Chi tiết lỗi:
              </p>
              <ul className="space-y-1">
                {sendAllResult.errors.map((e) => (
                  <li
                    key={e.department_code}
                    className="text-xs text-red-600 bg-red-50 rounded px-2 py-1"
                  >
                    <span className="font-mono">{e.department_code}</span>:{' '}
                    {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Manager: prominent pending-approval card for their own department */}
      {isManager && managerDeptCode && (() => {
        const myApproval = getDeptApproval(managerDeptCode);
        if (!myApproval || myApproval.status !== 'PENDING') return null;
        return (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <ClockIcon className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-900">
                  Yêu cầu phê duyệt chốt công đang chờ xử lý
                </p>
                <p className="text-sm text-yellow-800 mt-0.5">
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
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-green-400 text-green-800 bg-green-100 hover:bg-green-200"
              >
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                Duyệt
              </button>
              <button
                onClick={() => openActionModal(myApproval, 'REJECT')}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-red-400 text-red-800 bg-red-100 hover:bg-red-200"
              >
                <XCircleIcon className="w-4 h-4 mr-1" />
                Từ chối
              </button>
            </div>
          </div>
        );
      })()}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center mb-3">
          <FunnelIcon className="w-4 h-4 mr-2 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Bộ lọc</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <SelectBox<number>
              label="Tháng"
              value={selectedMonth}
              options={months.map((m) => ({ value: m, label: `Tháng ${m}` }))}
              onChange={setSelectedMonth}
            />
          </div>
          <div>
            <SelectBox<number>
              label="Năm"
              value={selectedYear}
              options={years.map((y) => ({ value: y, label: String(y) }))}
              onChange={setSelectedYear}
            />
          </div>
          <div>
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
          </div>
          <div className="flex items-end">
            <button
              onClick={loadApprovals}
              className="inline-flex items-center px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ArrowPathIcon className="w-4 h-4 mr-1" />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">
            Danh sách phê duyệt theo phòng ban
          </span>
          <span className="text-xs text-gray-500">
            {approvals.length} bản ghi
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            Không có phòng ban nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phòng ban
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Người gửi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Người duyệt
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian duyệt
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ghi chú
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {departments.map((dept) => {
                  const approval = getDeptApproval(dept.code);
                  const isMyDept = isManager && dept.code === managerDeptCode;
                  return (
                    <tr
                      key={dept.id}
                      className={`hover:bg-gray-50 ${isMyDept && approval?.status === 'PENDING' ? 'bg-yellow-50' : ''}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {dept.name}
                          {isMyDept && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                              Phòng của bạn
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {dept.code}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {approval ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[approval.status]}`}
                          >
                            {approval.status === 'PENDING' && (
                              <ClockIcon className="w-3 h-3 mr-1" />
                            )}
                            {approval.status === 'APPROVED' && (
                              <CheckCircleIcon className="w-3 h-3 mr-1" />
                            )}
                            {approval.status === 'REJECTED' && (
                              <XCircleIcon className="w-3 h-3 mr-1" />
                            )}
                            {STATUS_LABELS[approval.status]}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Chưa gửi
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {approval?.sent_by_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {approval?.approved_by_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {approval?.approved_at
                          ? new Date(approval.approved_at).toLocaleString(
                              'vi-VN'
                            )
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                        {approval?.note ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* HR: Chốt, Admin: Gửi */}
                          {isHROrAdmin && (
                            <button
                              onClick={() => handleSendOne(dept.code)}
                              disabled={sendingDept === dept.code}
                              className={`inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded border ${
                                approval
                                  ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                  : 'border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                              } disabled:opacity-50`}
                            >
                              <PaperAirplaneIcon className="w-3 h-3 mr-1" />
                              {sendingDept === dept.code
                                ? 'Đang xử lý...'
                                : isAdmin
                                ? (approval ? 'Gửi lại' : 'Gửi phê duyệt')
                                : (approval ? 'Chốt lại' : 'Chốt công')}
                            </button>
                          )}
                          {/* Dept head / HR / Admin: approve or reject PENDING requests */}
                          {approval && approval.status === 'PENDING' &&
                            (isHROrAdmin || (isManager && isMyDept)) && (
                            <>
                              <button
                                onClick={() =>
                                  openActionModal(approval, 'APPROVE')
                                }
                                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded border border-green-300 text-green-700 bg-green-50 hover:bg-green-100"
                              >
                                <CheckCircleIcon className="w-3 h-3 mr-1" />
                                Duyệt
                              </button>
                              <button
                                onClick={() =>
                                  openActionModal(approval, 'REJECT')
                                }
                                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                              >
                                <XCircleIcon className="w-3 h-3 mr-1" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {actionType === 'APPROVE' ? 'Phê duyệt' : 'Từ chối'} chốt công
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Phòng ban:{' '}
              <span className="font-medium text-gray-700">
                {actionTarget.department_name || actionTarget.department_code}
              </span>{' '}
              — Tháng {actionTarget.month}/{actionTarget.year}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú{' '}
                {actionType === 'REJECT' && (
                  <span className="text-gray-400">(tuỳ chọn)</span>
                )}
              </label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={3}
                placeholder={
                  actionType === 'APPROVE'
                    ? 'Nhận xét (tuỳ chọn)...'
                    : 'Lý do từ chối (tuỳ chọn)...'
                }
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            {error && (
              <div className="mb-3 flex items-center text-sm text-red-700 bg-red-50 rounded p-2">
                <ExclamationCircleIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setError(null);
                }}
                disabled={actionProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                onClick={handleAction}
                disabled={actionProcessing}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  actionType === 'APPROVE'
                    ? 'bg-green-600 hover:bg-green-700'
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
