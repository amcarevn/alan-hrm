import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { approvalService } from '../services/approval.service';
import { attendanceService } from '../services/attendance.service';
import FinalizationLockBanner from '../components/FinalizationLockBanner';
import { workFinalizationApprovalService } from '../services/workFinalizationApproval.service';
import { SelectBox } from '../components/LandingLayout/SelectBox';
import { useAuth } from '../contexts/AuthContext';
import AttendanceCalendar from '../components/AttendanceCalendar';
import ApprovalActionModals from '../components/approvals/ApprovalActionModals';
import WorkFinalizationApprovalPanel from '../components/approvals/WorkFinalizationApprovalPanel';

// Giá trị đặc biệt cho lựa chọn "Tôi là QLTT" trong dropdown Phòng ban —
// không phải tên phòng ban thật nên không bao giờ trùng.
const MY_DIRECT_REPORTS_SENTINEL = '__MY_DIRECT_REPORTS__';

// Danh sách sub-filter — tách ra hằng số để dùng chung cho hàng chip "Chi tiết"
// (trước đây 2 mảng này viết inline trong JSX của 2 khối riêng). Giữ đúng các
// loại Alan đang có (Alan không có Nghỉ không phép / Đổi ca / Ca 2 như TA).
const EXPLANATION_SUB_TYPES = [
  { value: 'LATE', label: 'Đi muộn' },
  { value: 'EARLY_LEAVE', label: 'Về sớm' },
  { value: 'LATE_EARLY', label: 'Đi muộn/Về sớm' },
  { value: 'INCOMPLETE_ATTENDANCE', label: 'Quên chấm công' },
  { value: 'BUSINESS_TRIP', label: 'Đi công tác' },
  { value: 'FIRST_DAY', label: 'Ngày đầu đi làm' },
];

const REGISTRATION_SUB_TYPES = [
  { value: 'OVERTIME', label: 'Tăng ca' },
  { value: 'NIGHT_SHIFT', label: 'Trực tối' },
  { value: 'LIVE', label: 'Live stream' },
  { value: 'OFF_DUTY', label: 'Vào/Ra trực' },
];

// Màu cho chip lọc loại đơn. PHẢI viết đủ chuỗi class tĩnh — trước đây dùng
// `bg-${opt.color}-600` và Tailwind JIT không quét được chuỗi ghép động (dự án
// cũng không có safelist), nên các chip này thực tế ĐANG MẤT MÀU trên bản
// build. Cùng cách làm với VARIANT_STYLES ở ConfirmDialog.tsx.
const TYPE_CHIP_STYLES: Record<string, { active: string; idle: string; badge: string }> = {
  amber: {
    active: 'bg-amber-600 text-white border-transparent',
    idle: 'bg-white text-gray-600 border-gray-200 hover:border-amber-300',
    badge: 'bg-amber-50 text-amber-600',
  },
  primary: {
    active: 'bg-primary-600 text-white border-transparent',
    idle: 'bg-white text-gray-600 border-gray-200 hover:border-primary-300',
    badge: 'bg-primary-50 text-primary-600',
  },
  emerald: {
    active: 'bg-emerald-600 text-white border-transparent',
    idle: 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300',
    badge: 'bg-emerald-50 text-emerald-600',
  },
};

const Approvals: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'pending' | 'approved' | 'rejected'
  >('pending');
  // Trang này gánh 2 nghiệp vụ khác nhau (duyệt đơn từ + duyệt bảng công
  // tháng). Trước đây xếp chồng trên CÙNG 1 màn; nay tách thành "khu vực"
  // riêng chọn bằng thanh tab (yêu cầu HCNS: "tách thành các tab riêng trong
  // cùng trang").
  // CHỦ Ý: dùng state RIÊNG chứ không nhét thêm giá trị vào `activeTab` — vì
  // `activeTab` đang được nhiều useMemo/filter dùng để lọc trạng thái đơn
  // (PENDING/APPROVED/REJECTED); thêm giá trị lạ vào đó sẽ làm các filter kia
  // trả kết quả rỗng hoặc sai. Tách state giữ toàn bộ logic cũ nguyên vẹn.
  type ApprovalSection = 'requests' | 'work_finalization';
  const [activeSection, setActiveSection] = useState<ApprovalSection>('requests');
  const [attendanceExplanations, setAttendanceExplanations] = useState<any[]>(
    []
  );
  const [approvedExplanations, setApprovedExplanations] = useState<any[]>([]);
  const [rejectedExplanations, setRejectedExplanations] = useState<any[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);
  const [approvedRegistrations, setApprovedRegistrations] = useState<any[]>([]);
  const [rejectedRegistrations, setRejectedRegistrations] = useState<any[]>([]);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState<any[]>([]);
  const [approvedLeaveRequests, setApprovedLeaveRequests] = useState<any[]>([]);
  const [rejectedLeaveRequests, setRejectedLeaveRequests] = useState<any[]>([]);
  const [pendingOvertimeRequests, setPendingOvertimeRequests] = useState<any[]>([]);
  const [approvedOvertimeRequests, setApprovedOvertimeRequests] = useState<any[]>([]);
  const [rejectedOvertimeRequests, setRejectedOvertimeRequests] = useState<any[]>([]);
  const [pendingOnlineWorkRequests, setPendingOnlineWorkRequests] = useState<any[]>([]);
  const [approvedOnlineWorkRequests, setApprovedOnlineWorkRequests] = useState<any[]>([]);
  const [rejectedOnlineWorkRequests, setRejectedOnlineWorkRequests] = useState<any[]>([]);
  const [workFinalizationApprovals, setWorkFinalizationApprovals] = useState<any[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterExplanationSubTypes, setFilterExplanationSubTypes] = useState<string[]>([]);
  const [filterRegistrationSubTypes, setFilterRegistrationSubTypes] = useState<string[]>([]);
  const [filterName, setFilterName] = useState('');
  const debouncedFilterName = useDebounce(filterName, 300);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [fetchProgress, setFetchProgress] = useState<{ loaded: number; total: number | null } | null>(null);
  const nowForInit = new Date();
  const isEarlyMonth = nowForInit.getDate() <= 15;
  const initialMonth = isEarlyMonth
    ? (nowForInit.getMonth() === 0 ? 12 : nowForInit.getMonth())
    : nowForInit.getMonth() + 1;
  const initialYear = isEarlyMonth && nowForInit.getMonth() === 0
    ? nowForInit.getFullYear() - 1
    : nowForInit.getFullYear();

  const [filterMonth, setFilterMonth] = useState<number>(initialMonth);
  const [filterYear, setFilterYear] = useState<number>(initialYear);
  const [filterOnlyMine, setFilterOnlyMine] = useState(false);
  // "Tôi là QLTT" — chỉ hiện đơn của cấp dưới trực tiếp của mình. Khác
  // filterOnlyMine (đơn CỦA chính mình). Chủ yếu hữu ích cho HR/Admin — nhân
  // viên/quản lý thường đã tự động bị giới hạn xuống đúng phạm vi này rồi
  // (xem block "isTrueSuperAdmin/isTrueHR" bên dưới), nên với họ lựa chọn này
  // không đổi gì thêm — chỉ thật sự cần khi 1 người VỪA là QLTT VỪA là
  // HR/Admin (mặc định thấy toàn công ty, khó tìm đúng cấp dưới của mình).
  const [filterOnlyMyDirectReports, setFilterOnlyMyDirectReports] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [selectedExplanation, setSelectedExplanation] = useState<any>(null);
  const [selectedOnlineWorkRequest, setSelectedOnlineWorkRequest] =
    useState<any>(null);
  const [selectedWfApproval, setSelectedWfApproval] = useState<any>(null);
  const [wfEmployees, setWfEmployees] = useState<any[]>([]);
  const [showWfDetailModal, setShowWfDetailModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedDepartments, setExpandedDepartments] = useState<string[]>([]);
  const [expandedEmployees, setExpandedEmployees] = useState<string[]>([]);
  // Nhóm được TỰ mở sẵn (danh sách ít) mà người dùng chủ động đóng lại — phải
  // nhớ riêng, nếu không thì bấm đóng xong nó tự mở lại ngay.
  const [collapsedDepartments, setCollapsedDepartments] = useState<string[]>([]);
  const [collapsedEmployees, setCollapsedEmployees] = useState<string[]>([]);
  // Khối "Đang chờ quản lý trực tiếp" ở tab Chờ duyệt của HCNS — thu gọn sẵn vì
  // đó là việc của QLTT, HCNS chưa thao tác gì được.
  const [showWaitingManagerSection, setShowWaitingManagerSection] = useState(false);
  const [calendarModalEmployee, setCalendarModalEmployee] = useState<{ id: number; name: string; month: number; year: number } | null>(null);

  // Debug log cho Quota và dữ liệu được chọn
  useEffect(() => {
    if (selectedExplanation) {
      console.log('🔵 [DEBUG] Đơn giải trình được chọn:', {
        id: selectedExplanation.id,
        type: selectedExplanation.explanation_type,
        attendance_date: selectedExplanation.attendance_date,
        quota_used: selectedExplanation.quota_used,
        quota_remaining: selectedExplanation.quota_remaining,
        full_data: selectedExplanation
      });
    }
  }, [selectedExplanation]);

  useEffect(() => {
    if (workFinalizationApprovals.length > 0) {
      console.log('💎 [DATA UPDATE] Work Finalization list updated:', workFinalizationApprovals);
    }
  }, [workFinalizationApprovals]);

  useEffect(() => {
    if (selectedOnlineWorkRequest) {
      console.log('🟢 [DEBUG] Đơn làm việc online được chọn:', selectedOnlineWorkRequest);
    }
  }, [selectedOnlineWorkRequest]);
  interface StatsType {
    pending_leave: number;
    pending_overtime: number;
    pending_explanation: number;
    pending_registration: number;
    pending_online_work: number;
    total_pending: number;
    total_approved: number;
    total_rejected: number;
  }

  const [stats, setStats] = useState<StatsType>({
    pending_leave: 0,
    pending_overtime: 0,
    pending_explanation: 0,
    pending_registration: 0,
    pending_online_work: 0,
    total_pending: 0,
    total_approved: 0,
    total_rejected: 0,
  });

  // Role-based permissions for UI elements
  const isAdmin = (user as any)?.is_superuser ||
    (user as any)?.is_staff ||
    user?.role?.toUpperCase() === 'ADMIN' ||
    currentEmployee?.user?.is_staff ||
    currentEmployee?.user?.is_superuser;

  const isHR = currentEmployee?.is_hr === true || user?.role?.toUpperCase() === 'HR';

  const isDepartmentManager = currentEmployee?.department?.manager_id === currentEmployee?.id;

  const isManagement = currentEmployee?.is_manager === true ||
    currentEmployee?.position?.is_management === true ||
    isDepartmentManager ||
    false;

  const hasBulkApprovePermission = isAdmin || isHR || isManagement;
  // Khối duyệt bảng công tháng chỉ dành cho Admin / Quản lý (giữ đúng điều
  // kiện cũ của Alan).
  const showWorkFinalizationPanel = !!(isAdmin || isManagement);


  // States cho các modal Dialog mới
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetItem, setTargetItem] = useState<any>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'DELETE'>(
    'APPROVE'
  );
  const [approvalNote, setApprovalNote] = useState('');
  const [selectedCredit, setSelectedCredit] = useState<0.5 | 1 | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // States cho Duyệt hàng loạt (Bulk Action)
  const [bulkActionResult, setBulkActionResult] = useState<{ success: number; error: number; groupName: string; approvalItems: any[]; rejectionItems: any[] } | null>(null);
  const [bulkConfirmModal, setBulkConfirmModal] = useState<{ items: any[]; name: string } | null>(null);

  // Lock body scroll khi modal mở
  useEffect(() => {
    const anyModalOpen = actionModalOpen || deleteModalOpen || errorModalOpen || !!bulkConfirmModal || !!bulkActionResult || showDetailModal || showWfDetailModal;
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [actionModalOpen, deleteModalOpen, errorModalOpen, bulkConfirmModal, bulkActionResult, showDetailModal, showWfDetailModal]);

  const currentItem = selectedExplanation || selectedOnlineWorkRequest;
  const isViewingExp = currentItem?._itemType === 'EXPLANATION' || (!currentItem?._itemType && currentItem?.explanation_type && currentItem?.explanation_type !== 'LEAVE');
  const isViewingOnl = currentItem?._itemType === 'ONLINE_WORK';
  const isViewingReg = currentItem?._itemType === 'REGISTRATION' || currentItem?._itemType === 'OVERTIME';
  const isViewingLea = currentItem?._itemType === 'LEAVE' || currentItem?.explanation_type === 'LEAVE';

  const statsCount = (isViewingExp ? 1 : 0) + (isViewingOnl ? 1 : 0) + (isViewingReg ? 1 : 0) + (isViewingLea ? 1 : 0);

  const allRequestsForDepList = [
    ...attendanceExplanations || [], ...approvedExplanations || [], ...rejectedExplanations || [],
    ...pendingRegistrations || [], ...approvedRegistrations || [], ...rejectedRegistrations || [],
    ...pendingLeaveRequests || [], ...approvedLeaveRequests || [], ...rejectedLeaveRequests || [],
    ...pendingOvertimeRequests || [], ...approvedOvertimeRequests || [], ...rejectedOvertimeRequests || [],
    ...pendingOnlineWorkRequests || [], ...approvedOnlineWorkRequests || [], ...rejectedOnlineWorkRequests || []
  ];

  const uniqueDepts = Array.from(new Set(
    allRequestsForDepList.map(r => r.employee_department || r.department_name).filter(Boolean)
  )).sort();

  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [showRefreshToast, setShowRefreshToast] = useState(false);

  // Skeleton component for better UX
  const SkeletonItem = () => (
    <div className="animate-pulse bg-white border border-gray-100 rounded-lg p-6 mb-4 shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-3 bg-gray-100 rounded w-1/6"></div>
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-50 rounded-lg border border-gray-100/50"></div>
        ))}
      </div>
    </div>
  );

  // HIện thị tính số giờ/phút từ giờ bắt đầu → giờ kết thúc
  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return null;
    try {
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);

      if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return null;

      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff <= 0) diff += 24 * 60; // Xử lý qua đêm

      const hours = Math.floor(diff / 60);
      const mins = diff % 60;

      if (hours > 0) {
        return mins > 0 ? `${hours}h ${mins}p` : `${hours}h`;
      }
      return `${mins}p`;
    } catch (e) {
      return null;
    }
  };

  const deptOptions = [
    { value: '', label: 'Tất cả phòng ban' },
    // Đặt ngay đầu — dành cho người VỪA là QLTT VỪA có quyền HR/Admin (nếu
    // không thì đã chỉ thấy đúng cấp dưới trực tiếp từ trước, không cần mục
    // này). Dropdown "Phòng ban" chỉ hiện cho isAdmin/isHR nên tự động đúng
    // đối tượng, không cần điều kiện riêng ở đây.
    { value: MY_DIRECT_REPORTS_SENTINEL, label: '★ Tôi là QLTT' },
    ...uniqueDepts.map(dept => ({ value: dept as string, label: dept as string }))
  ];




  // Move fetch helpers here (above useEffect)
  const fetchCurrentEmployee = async () => {
    try {
      const employee = await approvalService.getCurrentEmployee();
      setCurrentEmployee(employee);
      return employee;
    } catch (error) {
      console.error('Error fetching current employee:', error);
      return null;
    }
  };

  const fetchPendingRequests = async (signal?: AbortSignal) => {
    try {
      const applyPendingResult = (result: any) => {
        if (signal?.aborted) return;
        setAttendanceExplanations(result.attendance_explanations);
        setPendingRegistrations(result.registration_requests || []);
        setPendingLeaveRequests(result.leave_requests || []);
        setPendingOvertimeRequests(result.overtime_requests || []);
        setPendingOnlineWorkRequests(result.online_work_requests || []);
        setStats((prev: StatsType) => ({
          ...prev,
          pending_leave: result.leave_requests.length,
          pending_overtime: result.overtime_requests.length,
          pending_explanation: result.attendance_explanations.length,
          pending_registration: (result.registration_requests || []).length,
          pending_online_work: result.online_work_requests.length,
          total_pending: result.total_pending || 0,
        }));
      };

      const result = await (approvalService as any).getAllPendingRequests(
        { day: 0, month: filterMonth, year: filterYear },
        (loaded: number, total: number | null) => { if (!signal?.aborted) setFetchProgress({ loaded, total }); },
        applyPendingResult,
        signal
      );
      applyPendingResult(result);
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
      console.error('× [APPROVALS] Error fetching pending requests:', error);
    }
  };

  const fetchApprovedRequests = async (signal?: AbortSignal) => {
    try {
      const applyApprovedResult = (result: any) => {
        if (signal?.aborted) return;
        setApprovedExplanations(result.attendance_explanations);
        setApprovedRegistrations(result.registration_requests || []);
        setApprovedLeaveRequests(result.leave_requests || []);
        setApprovedOvertimeRequests(result.overtime_requests || []);
        setApprovedOnlineWorkRequests(result.online_work_requests || []);
        setStats((prev: StatsType) => ({
          ...prev,
          total_approved: result.total_approved || 0,
        }));
      };

      const result = await (approvalService as any).getAllApprovedRequests(
        { day: 0, month: filterMonth, year: filterYear },
        (loaded: number, total: number | null) => { if (!signal?.aborted) setFetchProgress({ loaded, total }); },
        applyApprovedResult,
        signal
      );
      applyApprovedResult(result);
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
      console.error('Error fetching approved requests:', error);
    }
  };

  const fetchRejectedRequests = async (signal?: AbortSignal) => {
    try {
      const applyRejectedResult = (result: any) => {
        if (signal?.aborted) return;
        setRejectedExplanations(result.attendance_explanations);
        setRejectedRegistrations(result.registration_requests || []);
        setRejectedLeaveRequests(result.leave_requests || []);
        setRejectedOvertimeRequests(result.overtime_requests || []);
        setRejectedOnlineWorkRequests(result.online_work_requests || []);
        setStats((prev: StatsType) => ({
          ...prev,
          total_rejected: result.total_rejected || 0,
        }));
      };

      const result = await (approvalService as any).getAllRejectedRequests(
        { day: 0, month: filterMonth, year: filterYear },
        (loaded: number, total: number | null) => { if (!signal?.aborted) setFetchProgress({ loaded, total }); },
        applyRejectedResult,
        signal
      );
      applyRejectedResult(result);
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
      console.error('Error fetching rejected requests:', error);
    }
  };

  const fetchWorkFinalizationData = async (empContext?: any, isAdminArg?: boolean, isHRArg?: boolean) => {
    try {
      const activeAdmin = isAdminArg !== undefined ? isAdminArg : isAdmin;
      const activeEmp = empContext || currentEmployee;

      const fetchMonth = async (m: number, y: number) => {
        try {
          const res = await workFinalizationApprovalService.list({ year: y, month: m });
          return res.results || [];
        } catch (err: any) {
          return [];
        }
      };

      const m0 = filterMonth;
      const y0 = filterYear;
      const res0 = await fetchMonth(m0, y0);
      const combined = res0;

      const uniqueMap = new Map();
      combined.forEach(item => uniqueMap.set(item.id, item));

      const pendingWfItems = Array.from(uniqueMap.values())
        .filter(item => item.status === 'PENDING' || item.status === 'APPROVED')
        .map(item => ({
          ...item,
          _itemType: 'WORK_FINALIZATION',
          employee_name: `Phòng ${item.department_name || item.department_code}`,
          employee_code: item.department_code,
          reason: item.note || `Chốt công tháng ${item.month}/${item.year}`
        }));

      const userDeptCode = activeEmp?.department?.code ||
        activeEmp?.hrm_user?.department_code ||
        activeEmp?.employee_profile?.department_code ||
        (user as any)?.department_code ||
        (user as any)?.employee_profile?.department_code;

      let filteredWfItems = pendingWfItems;
      if (!activeAdmin) {
        if (!userDeptCode) {
          filteredWfItems = [];
        } else {
          filteredWfItems = pendingWfItems.filter(item => {
            const itemDept = item.department_code?.toString().trim().toUpperCase();
            const userDept = userDeptCode.toString().trim().toUpperCase();
            return itemDept === userDept;
          });
        }
      }

      setWorkFinalizationApprovals(filteredWfItems);
    } catch (error) {
      console.error('× [APPROVALS] Error fetching work finalization data:', error);
    }
  };

  const fetchAllData = async (force = false) => {
    const nowValue = Date.now();

    // Cancel any in-flight pagination loop
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    try {
      isFetchingRef.current = true;
      const prevFetchTime = lastFetchTimeRef.current;
      lastFetchTimeRef.current = nowValue;
      setLoading(true);
      setFetchProgress(null);

      const emp = await fetchCurrentEmployee();
      const currentIsAdmin = emp?.user?.is_staff || emp?.user?.is_superuser || (user as any)?.is_superuser || (user as any)?.is_staff || user?.role?.toUpperCase() === 'ADMIN';
      const currentIsHR = emp?.is_hr === true || user?.role?.toUpperCase() === 'HR';

      const tasks = [];

      // Only fetch the active tab to optimize performance
      // Bảng công tháng giờ là 1 tab riêng (activeSection) có badge số chờ
      // duyệt — tải ở MỌI tab để badge luôn đúng và mở tab là có dữ liệu.
      tasks.push(fetchWorkFinalizationData(emp, currentIsAdmin, currentIsHR));
      if (activeTab === 'pending') {
        tasks.push(fetchPendingRequests(signal));
      } else if (activeTab === 'approved') {
        tasks.push(fetchApprovedRequests(signal));
      } else if (activeTab === 'rejected') {
        tasks.push(fetchRejectedRequests(signal));
      }

      await Promise.all(tasks);

      if (signal.aborted) return;

      setLastRefreshedAt(new Date());
      // Chỉ hiện toast nếu là refresh thủ công/focus sau khi đã có dữ liệu (không hiện lần đầu)
      if (prevFetchTime > 0 && nowValue - prevFetchTime > 1000) {
        setShowRefreshToast(true);
        setTimeout(() => setShowRefreshToast(false), 3000);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
      console.error('❌ [APPROVALS] Error fetching all data:', error);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        setFetchProgress(null);
      }
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [activeTab, filterMonth, filterYear]);

  const EXPLANATION_TYPE_MAP: Record<string, string> = {
    explanation: 'Giải trình',
    registration: 'Đăng ký',
    LATE: 'Đi muộn',
    EARLY_LEAVE: 'Về sớm',
    LATE_EARLY: 'Đi muộn/Về sớm',
    INCOMPLETE_ATTENDANCE: 'Quên chấm công',
    BUSINESS_TRIP: 'Đi công tác',
    FIRST_DAY: 'Ngày đầu đi làm',
    OTHER: 'Giải trình khác',
    OVERTIME: 'Tăng ca',
    NIGHT_SHIFT: 'Trực tối',
    LIVE: 'Live stream',
    LEAVE: 'Nghỉ phép tháng',
    OFF_DUTY: 'Vào/Ra trực',
  };

  const getExplanationTypeLabel = (type: string): string => {
    if (!type) return '';
    const upperType = type.toUpperCase();
    return EXPLANATION_TYPE_MAP[upperType] || EXPLANATION_TYPE_MAP[type] || type;
  };

  // Mapping trạng thái chấm công sang tiếng Việt
  const ATTENDANCE_STATUS_MAP: Record<string, string> = {
    PRESENT: 'Có mặt',
    LATE: 'Đi muộn',
    EARLY_LEAVE: 'Về sớm',
    ABSENT: 'Vắng mặt',
    HALF_DAY: 'Nửa ngày',
    INCOMPLETE_ATTENDANCE: 'Quên chấm công',
    OFF: 'Nghỉ',
  };

  const EXPECTED_STATUS_MAP: Record<string, string> = {
    ...ATTENDANCE_STATUS_MAP,
    PRESENT: 'Tính đủ công',
    ABSENT: 'Vắng mặt',
    INCOMPLETE_ATTENDANCE: 'Xác nhận đủ công',
    HALF_DAY: 'Tính nửa ngày công',
  };

  const getOriginalStatusText = (status: string): string =>
    ATTENDANCE_STATUS_MAP[status] || status;

  const getExpectedStatusText = (status: string): string =>
    EXPECTED_STATUS_MAP[status] || status;

  // Returns icon path and color classes for each item type / registration sub-type
  const getItemTypeConfig = (item: any): { tableCls: string; mobileBg: string; iconPath: string } => {
    if (item._itemType === 'LEAVE') return {
      tableCls: 'bg-primary-50 text-primary-600 border-primary-100',
      mobileBg: 'bg-primary-500',
      iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    };
    if (item._itemType === 'OVERTIME') return {
      tableCls: 'bg-violet-50 text-violet-600 border-violet-100',
      mobileBg: 'bg-violet-500',
      iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
    };
    if (item._itemType === 'ONLINE_WORK') return {
      tableCls: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      mobileBg: 'bg-emerald-500',
      iconPath: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    };
    if (item._itemType === 'REGISTRATION') {
      // registration_type is the legacy field; event_type is returned by the unified API
      const regType = (item.registration_type || item.event_type || '').toUpperCase();
      switch (regType) {
        case 'OVERTIME':
          return { tableCls: 'bg-violet-50 text-violet-600 border-violet-100', mobileBg: 'bg-violet-500', iconPath: 'M13 10V3L4 14h7v7l9-11h-7z' };
        case 'NIGHT_SHIFT':
          return { tableCls: 'bg-primary-50 text-primary-600 border-primary-100', mobileBg: 'bg-primary-500', iconPath: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' };
        case 'LIVE':
          return { tableCls: 'bg-rose-50 text-rose-600 border-rose-100', mobileBg: 'bg-rose-500', iconPath: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' };
        case 'OFF_DUTY':
          return { tableCls: 'bg-amber-50 text-amber-600 border-amber-100', mobileBg: 'bg-amber-500', iconPath: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' };
        default:
          return { tableCls: 'bg-primary-50 text-primary-600 border-primary-100', mobileBg: 'bg-primary-500', iconPath: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' };
      }
    }
    // EXPLANATION (default)
    return {
      tableCls: 'bg-amber-50 text-amber-600 border-amber-100',
      mobileBg: 'bg-amber-500',
      iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    };
  };

  const getRequestTypeLabel = (req: any): string => {
    let label = '';
    if (req._itemType === 'ONLINE_WORK') label = 'làm việc online';
    else if (req.explanation_type === 'LEAVE' || req._itemType === 'LEAVE') label = 'nghỉ phép tháng';
    else if (req._itemType === 'REGISTRATION' || req._itemType === 'OVERTIME') {
      // registration_type is the legacy field; event_type is returned by the unified API
      const type = req.registration_type || req.event_type || (req._itemType === 'OVERTIME' ? 'OVERTIME' : '');
      label = getExplanationTypeLabel(type) || 'Đăng ký';
    }
    else if (req._itemType === 'WORK_FINALIZATION') label = 'chốt công tháng';
    else {
      label = req.explanation_type_display || (req.explanation_type ? (getExplanationTypeLabel(req.explanation_level || req.explanation_type)) : 'Giải trình');
    }

    if (!label) return 'Đơn';
    // Đảm bảo viết hoa chữ cái đầu cho tiêu đề
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  /**
   * Render badge hiển thị thống kê quota/số lần duyệt của nhân viên trong tháng
   */
  const renderRequestStatsBadge = (item: any) => {
    const isOnline = item._itemType === 'ONLINE_WORK';
    const isLeave = item._itemType === 'LEAVE';
    const isReg = item._itemType === 'REGISTRATION' || item._itemType === 'OVERTIME';

    if (isReg) return null; // Không hiện hạn mức cho đơn đăng ký/tăng ca

    // Thống kê từ backend (đã bọc trong item khi list)
    const qUsed = item.quota_used ?? 0;
    const mExp = item.max_explanation_quota ?? 3;
    const owUsed = item.online_work_used ?? 0;
    const mOnl = item.max_online_quota ?? 3;
    const lUsed = item.leave_used ?? 0;
    const mLea = item.max_leave_quota ?? 1;

    let used = 0;
    let max = 0;
    let label = '';

    if (isOnline) {
      used = owUsed;
      max = mOnl;
      label = 'Online';
    }
    else if (isLeave) {
      used = lUsed;
      max = mLea;
      label = 'Phép';
    }
    else {
      used = qUsed;
      max = mExp;
      label = 'Giải trình';
    }

    const ratio = max > 0 ? used / max : 0;

    // Premium color palette based on ratio
    const colors = ratio >= 1
      ? 'bg-rose-50 text-rose-600 border-rose-100'
      : ratio >= 0.7
        ? 'bg-amber-50 text-amber-600 border-amber-100'
        : 'bg-gray-50 text-gray-500 border-gray-100';

    return (
      <div className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-xs font-bold tracking-tighter uppercase transition-colors ${colors}`}>
        {label} {used}/{max}
      </div>
    );
  };

  /**
   * Làm sạch nội dung lý do: loại bỏ các prefixes lặp lại
   */
  const cleanReasonText = (rawReason: string, itemTypeLabel: string): string => {
    if (!rawReason) return '';
    let clean = rawReason.trim();

    // 0. Bóc các tiền tố trong ngoặc vuông [] (ví dụ: [Đi muộn: 5 phút])
    if (clean.startsWith('[')) {
      const closingBracketIndex = clean.indexOf(']');
      if (closingBracketIndex !== -1) {
        clean = clean.substring(closingBracketIndex + 1).replace(/^[\:\-\s]+/, '').trim();
      }
    }

    // Danh sách các tiền tố cần bóc tách
    const prefixes = [
      itemTypeLabel,
      itemTypeLabel.replace(/^Giải trình\s+/i, ''),
      itemTypeLabel.replace(/^Đăng ký\s+/i, ''),
      'Lý do:', 'Kế hoạch:', 'Nội dung:',
    ].filter(Boolean);

    // Sắp xếp theo chiều dài giảm dần để ưu tiên bóc chuỗi dài nhất trước
    prefixes.sort((a, b) => b.length - a.length);

    for (const p of prefixes) {
      if (p && clean.toLowerCase().startsWith(p.toLowerCase())) {
        // Tách bỏ prefix
        const temp = clean.substring(p.length).trim();
        // Xóa thêm các ký tự ngăn cách nếu có (: - )
        const afterStrip = temp.replace(/^[\:\-\s\.]+/i, '').trim();

        // Chỉ cập nhật nếu sau khi bóc vẫn còn nội dung (tránh bóc sạch trơn)
        if (afterStrip) {
          clean = afterStrip;
        }
        break;
      }
    }

    return clean;
  };

  // Kiểm tra xem người dùng hiện tại có quyền duyệt giải trình không
  const canApproveExplanation = (explanation: any): boolean => {
    if (!currentEmployee) return false;

    // Kiểm tra quyền dựa trên vai trò và cấp bậc
    const isAdminUser =
      currentEmployee.user?.is_staff || currentEmployee.user?.is_superuser;
    const isHRUser = currentEmployee.is_hr === true;
    const hasApprovalPermission =
      currentEmployee.permissions?.can_approve_attendance || false;
    const canActAsHR = isHRUser || hasApprovalPermission;

    const employeeIsHR = explanation.employee_is_hr || false;

    // HR tự duyệt đơn của chính mình được (ở bước HR, sau khi manager đã duyệt)
    const isSelf = explanation.employee_id === currentEmployee.id;
    if (isSelf) {
      // Cho phép nếu là bước HR (manager đã duyệt, chưa có HR duyệt) và người dùng là HR
      if (canActAsHR && explanation.direct_manager_approved === true && !explanation.hr_approved) {
        return true;
      }
      return false;
    }

    // Nếu người làm đơn là HR: 2 bước — manager rồi đến HR (kể cả chính mình lẫn HR khác)
    if (employeeIsHR) {
      if (isAdminUser) return true;

      // Bước 1: chỉ quản lý trực tiếp
      if (explanation.employee_manager_id === currentEmployee.id && !explanation.direct_manager_approved) {
        return true;
      }

      // Bước 2: bất kỳ HR nào (kể cả chính nhân viên đó) đều có thể duyệt
      if (canActAsHR && explanation.direct_manager_approved === true && !explanation.hr_approved) {
        return true;
      }

      return false;
    }

    // Nếu người làm đơn KHÔNG phải HR
    // Kiểm tra nếu là quản lý trực tiếp (ƯU TIÊN TRƯỚC)
    if (explanation.employee_manager_id === currentEmployee.id) {
      // Nếu quản lý trực tiếp đã duyệt rồi thì không thể duyệt nữa
      if (explanation.direct_manager_approved) {
        return false;
      }
      return true;
    }

    // Admin, HR, và người có quyền can_approve_attendance có quyền duyệt
    if (isAdminUser || isHRUser || hasApprovalPermission) {
      // NẾU LÀ HR (hoặc có quyền tương đương) nhưng KHÔNG PHẢI QLTT
      // THÌ CHỈ ĐƯỢC DUYỆT KHI:
      // 1. Quản lý trực tiếp đã duyệt rồi (direct_manager_approved === true)
      // 2. HOẶC người tạo đơn là Senior Manager (employee_is_senior_manager === true)
      const directManagerAlreadyApproved =
        explanation.direct_manager_approved === true;
      const isCreatorSeniorManager =
        explanation.employee_is_senior_manager === true;

      if (directManagerAlreadyApproved || (isCreatorSeniorManager && !explanation.employee_manager_id)) {
        return true;
      }

      // Nếu chưa thỏa mãn các điều kiện trên, HR chưa được duyệt
      return false;
    }

    return false;

  };

  /**
   * Kiểm tra xem có thể xóa đơn không (Giải trình, Đăng ký, Online)
   * - Người tạo đơn mới có quyền xóa khi đơn ở trạng thái PENDING/DRAFT
   * - Admin/HR có quyền xóa đơn bất kỳ khi chưa được xử lý xong
   */
  const canDeleteRequest = (req: any): boolean => {
    if (!currentEmployee || !req) return false;

    const requesterId = req.employee_id ||
      (typeof req.employee === 'object' ? req.employee.id : req.employee);
    const isOwner = requesterId === currentEmployee.id;

    // QUY TẮC MỚI: 
    // 2. Nhân sự (HR) và Quản lý (Manager) được phép xóa ở tab "Đã duyệt" để xử lý các trường hợp duyệt nhầm
    if ((isHR || isManagement) && activeTab === 'approved') {
      return true;
    }

    // 3. Admin vẫn giữ toàn quyền xóa ở cả hai tab
    if (isAdmin && (activeTab === 'approved' || activeTab === 'pending')) {
      return true;
    }

    // 2. Đối với người tạo đơn (Owner): Chỉ được xóa ở tab "Chờ duyệt" (hoặc đơn chưa được duyệt)
    if (isOwner) {
      // Nếu đã có cấp nào duyệt hoặc trạng thái là APPROVED thì không được xóa (hủy) nữa 
      if (req.direct_manager_approved || req.hr_approved || req.status === 'APPROVED') {
        return false;
      }
      // Chỉ xóa được khi đơn còn ở trạng thái sơ thảo hoặc đang chờ xử lý
      return ['DRAFT', 'PENDING'].includes(req.status);
    }

    return false;
  };

  // Generic function to check if current user can approve any request type
  const canApproveRequest = (request: any): boolean => {
    if (!currentEmployee || !request) return false;

    const isOnlineWork = request._itemType === 'ONLINE_WORK';
    const isRegistration = request._itemType === 'REGISTRATION' || request._itemType === 'OVERTIME';
    const isWorkFinalization = request._itemType === 'WORK_FINALIZATION';
    const isExplanation = !isOnlineWork && !isRegistration && !isWorkFinalization;

    if (isWorkFinalization) {
      // Admin/HR hoặc Quản lý trực tiếp của phòng ban đó
      const isAdminUser =
        currentEmployee.user?.is_staff ||
        currentEmployee.user?.is_superuser ||
        (user as any)?.is_superuser ||
        (user as any)?.is_staff;

      // Chỉ dùng cờ is_hr
      const isHRUser = currentEmployee.is_hr === true;

      const myDeptCode = currentEmployee.department?.code ||
        currentEmployee.hrm_user?.department_code ||
        currentEmployee.employee_profile?.department_code;

      const isMyDept = request.department_code === myDeptCode;

      return isAdminUser || isMyDept;
    }

    // For explanations and leaves, use the dedicated logic
    if (isExplanation) {
      return canApproveExplanation(request);
    }

    // ==================== TWO-STEP WORKFLOW (ONLINE WORK / REGISTRATION) ====================
    // Creator cannot approve their own request
    if (request.employee_id === currentEmployee.id) {
      return false;
    }

    // Check user roles
    const isAdminUser = currentEmployee.user?.is_staff || currentEmployee.user?.is_superuser;
    // Chỉ dùng cờ is_hr
    const isHRUser = currentEmployee.is_hr === true;
    const isDirectManager = request.employee_manager_id === currentEmployee.id;
    const hasApprovalPermission = currentEmployee.permissions?.can_approve_attendance || false;

    // Nếu đã bị từ chối -> không thể duyệt
    if (request.direct_manager_rejected || request.hr_rejected || request.status === 'REJECTED') {
      return false;
    }

    if (isAdminUser) return !request.hr_approved;

    const requesterIsHR = request.employee_is_hr || request.is_hr || false;

    // Nếu người làm đơn là HR: chỉ 1 bước (QLTT duyệt là xong)
    if (requesterIsHR) {
      if (isDirectManager) return !request.direct_manager_approved;
      return false;
    }

    // Người làm đơn KHÔNG phải HR: bắt buộc 2 bước
    if (isDirectManager) {
      return !request.direct_manager_approved;
    }

    if (isHRUser || hasApprovalPermission) {
      // HR/Admin chỉ được duyệt SAU KHI QLTT đã duyệt (hoặc senior manager không có QLTT)
      if (request.direct_manager_approved === true || (request.employee_is_senior_manager && !request.employee_manager_id)) {
        return !request.hr_approved;
      }
    }



    return false;


  };

  // --- Triggers for Modals ---
  const openApproveModal = (item: any) => {
    setTargetItem(item);
    setActionType('APPROVE');
    setApprovalNote('Đã duyệt');
    setSelectedCredit(null);
    setActionModalOpen(true);
  };

  const openRejectModal = (item: any) => {
    setTargetItem(item);
    setActionType('REJECT');
    setApprovalNote('Không hợp lệ');
    setActionModalOpen(true);
  };

  const openDeleteModal = (item: any) => {
    setTargetItem(item);
    setActionType('DELETE');
    setDeleteModalOpen(true);
  };

  // --- Confirm Actions (API Calls) ---
  const confirmAction = async () => {
    if (!targetItem) return;

    try {
      setIsProcessing(true);
      const isRegistration = targetItem._itemType === 'REGISTRATION';
      const isOnlineWork = targetItem._itemType === 'ONLINE_WORK';
      const isExplanation = targetItem._itemType === 'EXPLANATION' || (!isRegistration && !isOnlineWork);
      const isApprove = actionType === 'APPROVE';

      const note = approvalNote || (isApprove ? 'Đã duyệt' : 'Đã từ chối');

      // Kiểm tra HR cần chọn target_credit cho INSUFFICIENT_HOURS
      const itemData = targetItem.data || targetItem;
      const isInsufficientHoursApproval =
        isApprove &&
        itemData?.explanation_type === 'INSUFFICIENT_HOURS' &&
        itemData?.direct_manager_approved === true &&
        !itemData?.hr_approved;
      if (isInsufficientHoursApproval && selectedCredit === null) {
        setErrorMessage('Vui lòng chọn số công phê duyệt (0.5 hoặc 1 công)');
        setErrorModalOpen(true);
        setIsProcessing(false);
        return;
      }

      if (isApprove) {
        if (targetItem._itemType === 'WORK_FINALIZATION') {
          await workFinalizationApprovalService.approve(targetItem.id, { note });
        } else if (isRegistration || targetItem._itemType === 'OVERTIME') {
          await approvalService.approveRegistrationRequest(targetItem.id, note);
        } else if (isOnlineWork) {
          await approvalService.approveOnlineWorkRequest(targetItem.id, note);
        } else if (targetItem._itemType === 'LEAVE') {
          await approvalService.approveMonthlyLeaveRequest(targetItem.id, note);
        } else {
          await approvalService.approveAttendanceExplanation(
            targetItem.id,
            note,
            isInsufficientHoursApproval ? (selectedCredit ?? undefined) : undefined,
          );
        }
      } else {
        if (targetItem._itemType === 'WORK_FINALIZATION') {
          await workFinalizationApprovalService.reject(targetItem.id, { note });
        } else if (isRegistration || targetItem._itemType === 'OVERTIME') {
          await approvalService.rejectRegistrationRequest(targetItem.id, note);
        } else if (isOnlineWork) {
          await approvalService.rejectOnlineWorkRequest(targetItem.id, note);
        } else if (targetItem._itemType === 'LEAVE') {
          await approvalService.rejectMonthlyLeaveRequest(targetItem.id, note);
        } else {
          await approvalService.rejectAttendanceExplanation(targetItem.id, note);
        }
      }

      setActionModalOpen(false);
      setTargetItem(null);
      setApprovalNote('');
      fetchAllData(true); // Forced refresh to update all stats counts after action
    } catch (error: any) {
      console.error(`Error ${actionType}:`, error);
      const data = error.response?.data;
      if (error.response?.status === 423 && data?.error === 'FINALIZATION_LOCKED') {
        setErrorMessage(data.message || 'Tháng này đã đóng chốt công. Không thể phê duyệt/từ chối. Vui lòng liên hệ HCNS để biết chi tiết.');
      } else if (data?.quota_exceeded) {
        let msg = data.error || 'Hết hạn mức';
        if (targetItem?._itemType === 'LEAVE') {
          const used = data.leave_used ?? '?';
          const max = data.max_leave ?? '?';
          const remaining = data.remaining ?? 0;
          msg = `Hết hạn mức nghỉ phép tháng này.\nĐã dùng: ${used}/${max} ngày — Còn lại: ${remaining} ngày.`;
        } else if (targetItem?._itemType === 'ONLINE_WORK') {
          const used = data.online_work_used ?? '?';
          const max = data.max_online ?? '?';
          const remaining = data.remaining ?? 0;
          msg = `Hết hạn mức làm việc online tháng này.\nĐã dùng: ${used}/${max} ngày — Còn lại: ${remaining} ngày.`;
        }
        setErrorMessage(msg);
      } else {
        setErrorMessage(data?.error || data?.detail || 'Thao tác thất bại');
      }
      setErrorModalOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = async () => {
    if (!targetItem) return;

    try {
      setIsProcessing(true);
      const isRegistration = targetItem._itemType === 'REGISTRATION';
      const isOnlineWork = targetItem._itemType === 'ONLINE_WORK';

      if (isOnlineWork) {
        await approvalService.deleteOnlineWorkRequest(targetItem.id);
      } else if (isRegistration || targetItem._itemType === 'OVERTIME') {
        await approvalService.deleteRegistrationRequest(targetItem.id);
      } else if (targetItem._itemType === 'LEAVE') {
        await attendanceService.deleteMonthlyLeaveRequest(targetItem.id);
      } else {
        await attendanceService.deleteAttendanceExplanation(targetItem.id);
      }

      setDeleteModalOpen(false);
      setTargetItem(null);
      fetchAllData(true);
    } catch (error: any) {
      console.error('Error deleting:', error);
      const msg = error.response?.data?.error || error.response?.data?.detail || 'Xóa thất bại';
      setErrorMessage(msg);
      setErrorModalOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewOnlineWorkDetails = async (request: any) => {
    console.log('📂 [VIEW] Mở chi tiết đơn làm việc online');
    setSelectedOnlineWorkRequest(request);
    setSelectedExplanation(null);
    setShowDetailModal(true);
    if (request.employee_id || request.employee) {
      const empId = request.employee_id || (typeof request.employee === 'object' ? request.employee.id : request.employee);
    }
  };

  const handleViewDetails = async (explanation: any) => {
    console.log('📂 [VIEW] Mở chi tiết đơn giải trình');
    setSelectedExplanation(explanation);
    setShowDetailModal(true);
    if (explanation.employee_id) {
    }
  };

  const handleViewWfDetails = async (approval: any) => {
    try {
      console.log('📂 [VIEW] Mở chi tiết chốt công:', approval.department_code);
      setLoading(true);
      const data = await workFinalizationApprovalService.get(approval.id);
      setSelectedWfApproval(data);
      setWfEmployees(data.employees || []);
      setShowWfDetailModal(true);
    } catch (error: any) {
      console.error("Lỗi khi lấy chi tiết chốt công:", error);
      setErrorMessage("Không thể tải danh sách nhân viên phòng ban này. Vui lòng thử lại.");
      setErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // --- Bulk Approval Handlers ---
  const handleBulkApproveItems = async (items: any[], groupName: string) => {
    // Chỉ lấy những đơn mà người dùng CÓ QUYỀN DUYỆT
    const approvableItems = items.filter(item => canApproveRequest(item));

    if (approvableItems.length === 0) {
      setErrorMessage(`Không có đơn nào trong ${groupName} đủ điều kiện để bạn duyệt nhanh.`);
      setErrorModalOpen(true);
      return;
    }

    // Các loại giải trình tính và quota
    const quotaSubjectTypes = ['LATE', 'EARLY_LEAVE', 'LATE_EARLY', 'INCOMPLETE_ATTENDANCE'];

    let approvalItems: any[] = [];
    let rejectionItems: any[] = [];

    const quotaItems: any[] = [];
    const leaveItems: any[] = [];
    const onlineWorkItems: any[] = [];
    const freeItems: any[] = [];

    approvableItems.forEach(item => {
      const isExplanation = item._itemType === 'EXPLANATION' || (item.explanation_type && item._itemType !== 'LEAVE' && item._itemType !== 'REGISTRATION');

      if (isExplanation && quotaSubjectTypes.includes(item.explanation_type)) {
        quotaItems.push(item);
      } else if (item._itemType === 'LEAVE' || item.explanation_type === 'LEAVE') {
        leaveItems.push(item);
      } else if (item._itemType === 'ONLINE_WORK') {
        onlineWorkItems.push(item);
      } else {
        freeItems.push(item);
      }
    });

    // Helper gom nhóm theo nhân viên + tháng
    const groupByEmpMonth = (list: any[]): Record<string, any[]> => {
      const groups: Record<string, any[]> = {};
      list.forEach(item => {
        const empId = Number(item.employee_id || (typeof item.employee === 'object' ? item.employee.id : item.employee));
        const dateStr = item.event_date || item.attendance_date || item.date || item.created_at;
        const d = new Date(dateStr);
        const key = `${empId}-${d.getFullYear()}-${d.getMonth() + 1}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });
      return groups;
    };

    // 1. Đơn Giải trình — check quota (LATE, EARLY_LEAVE, LATE_EARLY, INCOMPLETE_ATTENDANCE)
    if (quotaItems.length > 0) {
      Object.entries(groupByEmpMonth(quotaItems)).forEach(([_key, group]) => {
        const defaultMax = Number(group[0]?.max_explanation_quota) || 3;
        const minRemaining = group.reduce((min, item) => {
          const rem = item.quota_remaining !== undefined ? Number(item.quota_remaining) : (Number(item.max_explanation_quota || 3) - Number(item.quota_used || 0));
          return Math.min(min, isNaN(rem) ? defaultMax : rem);
        }, defaultMax);

        const sortedGroup = [...group].sort((a, b) => {
          const isAForget = (a.explanation_type || '').toUpperCase() === 'INCOMPLETE_ATTENDANCE';
          const isBForget = (b.explanation_type || '').toUpperCase() === 'INCOMPLETE_ATTENDANCE';
          if (isAForget !== isBForget) return isAForget ? -1 : 1;
          const penaltyA = Number(a.penalty_amount) || 0;
          const penaltyB = Number(b.penalty_amount) || 0;
          if (penaltyA !== penaltyB) return penaltyB - penaltyA;
          // FCFS: đơn tạo sớm nhất được ưu tiên duyệt trước
          const tsA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tsB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tsA - tsB;
        });

        let currentRemaining = Math.max(0, minRemaining);
        sortedGroup.forEach(item => {
          const isForget = (item.explanation_type || '').toUpperCase() === 'INCOMPLETE_ATTENDANCE';
          if (isForget) {
            if (currentRemaining > 0) { approvalItems.push(item); currentRemaining--; }
            else { approvalItems.push({ ...item, is_penalty: true }); }
          } else {
            if (currentRemaining > 0) { approvalItems.push(item); currentRemaining--; }
            else { rejectionItems.push(item); }
          }
        });
      });
    }

    // 2. Đơn Nghỉ phép (LEAVE) — check quota từ item.max_leave_quota & item.leave_used
    if (leaveItems.length > 0) {
      Object.entries(groupByEmpMonth(leaveItems)).forEach(([_key, group]) => {
        const firstItem = group[0];
        const maxLeave = Number(firstItem.max_leave_quota ?? 1);
        const leaveUsed = Number(firstItem.leave_used ?? 0);
        let remaining = Math.max(0, maxLeave - leaveUsed);

        // FCFS: đơn tạo sớm nhất được ưu tiên duyệt trước
        const sorted = [...group].sort((a, b) => {
          const tsA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tsB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tsA - tsB;
        });

        sorted.forEach(item => {
          const amount = item.expected_status === 'HALF_DAY' ? 0.5 : 1.0;
          if (remaining >= amount) {
            approvalItems.push(item);
            remaining -= amount;
          } else {
            rejectionItems.push(item);
          }
        });
      });
    }

    // 3. Đơn Online Work — check quota từ item.max_online_quota & item.online_work_used
    if (onlineWorkItems.length > 0) {
      Object.entries(groupByEmpMonth(onlineWorkItems)).forEach(([_key, group]) => {
        const firstItem = group[0];
        const maxOnline = Number(firstItem.max_online_quota ?? 3);
        const onlineUsed = Number(firstItem.online_work_used ?? 0);
        let remaining = Math.max(0, maxOnline - onlineUsed);

        // FCFS: đơn tạo sớm nhất được ưu tiên duyệt trước
        const sorted = [...group].sort((a, b) => {
          const tsA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tsB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tsA - tsB;
        });

        sorted.forEach(item => {
          const amount = item.expected_status === 'HALF_DAY' ? 0.5 : 1.0;
          if (remaining >= amount) {
            approvalItems.push(item);
            remaining -= amount;
          } else {
            rejectionItems.push(item);
          }
        });
      });
    }

    // 4. Đơn tự do (Đăng ký OT, Live...) — approve hết, không tính quota
    approvalItems = [...approvalItems, ...freeItems];

    // Sort cả 2 danh sách theo FCFS (đơn gửi sớm nhất lên đầu)
    const fcfsSort = (a: any, b: any) => {
      const tsA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tsB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tsA - tsB;
    };
    approvalItems.sort(fcfsSort);
    rejectionItems.sort(fcfsSort);

    // Mở Modal xác nhận chi tiết
    setBulkConfirmModal({
      items: approvableItems,
      name: groupName,
      approvalItems,
      rejectionItems
    } as any);
  };

  const executeBulkApprove = async () => {
    if (!bulkConfirmModal) return;
    const { items: approvableItems, name: groupName } = bulkConfirmModal;
    const savedApprovalItems = (bulkConfirmModal as any).approvalItems || [];
    const savedRejectionItems = (bulkConfirmModal as any).rejectionItems || [];
    setBulkConfirmModal(null);

    try {
      setIsBulkProcessing(true);
      const note = 'Duyệt nhanh hàng loạt';

      const explanations = approvableItems.filter(i => i._itemType === 'EXPLANATION');
      const leaveRequests = approvableItems.filter(i => i._itemType === 'LEAVE');
      const registrations = approvableItems.filter(i => i._itemType === 'REGISTRATION' || i._itemType === 'OVERTIME');
      const onlineWorks = approvableItems.filter(i => i._itemType === 'ONLINE_WORK');

      const promises = [];
      if (explanations.length > 0) {
        // Sử dụng API Duyệt nhanh thông minh: BE tự tính toán quota và từ chối các đơn dư thừa
        promises.push(approvalService.smartBulkApproveAttendanceExplanations(explanations.map(i => i.id), note));
      }
      if (leaveRequests.length > 0) promises.push(approvalService.bulkApproveMonthlyLeaveRequests(leaveRequests.map(i => i.id), note));
      if (registrations.length > 0) promises.push(approvalService.bulkApproveRegistrationRequests(registrations.map(i => i.id), note));
      if (onlineWorks.length > 0) promises.push(approvalService.bulkApproveOnlineWorkRequests(onlineWorks.map(i => i.id), note));


      const results = await Promise.all(promises);
      let totalSuccess = 0;
      let totalError = 0;

      results.forEach(res => {
        totalSuccess += (res.success_count || 0);
        totalError += (res.error_count || 0);
      });

      // Hiển thị kết quả qua Modal thay vì alert
      setBulkActionResult({ success: totalSuccess, error: totalError, groupName: groupName, approvalItems: savedApprovalItems, rejectionItems: savedRejectionItems });
      fetchAllData(true);
    } catch (error: any) {
      console.error(`Error bulk approving ${groupName}:`, error);
      const msg = error.response?.status === 423 && error.response?.data?.error === 'FINALIZATION_LOCKED'
        ? error.response.data.message || 'Tháng này đã đóng chốt công. Không thể phê duyệt. Vui lòng liên hệ HCNS để biết chi tiết.'
        : `Lỗi khi duyệt hàng loạt ${groupName}: ` + (error.response?.data?.error || error.message);
      setErrorMessage(msg);
      setErrorModalOpen(true);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  /**
   * @param deptKey  khoá đã kèm cấp duyệt ('L1::Phòng X') — cùng 1 phòng ban
   *                 có thể xuất hiện ở cả 2 dải, dùng chung tên phòng làm khoá
   *                 sẽ khiến đóng bên này kéo theo bên kia.
   * @param isCurrentlyOpen  trạng thái ĐANG HIỂN THỊ, do nơi render truyền
   *                 vào. Trước đây hàm này tự suy đoán lại bằng 1 công thức
   *                 KHÁC công thức lúc render (thiếu vế `totalDepts <= 3`),
   *                 nên khi có trên 3 phòng ban thì 1 phòng đang đóng lại bị
   *                 coi là đang mở -> bấm lần đầu không có tác dụng gì.
   */
  const toggleDepartmentGroup = (deptKey: string, isCurrentlyOpen: boolean) => {
    if (isCurrentlyOpen) {
      setExpandedDepartments(prev => prev.filter(d => d !== deptKey));
      setCollapsedDepartments(prev => (prev.includes(deptKey) ? prev : [...prev, deptKey]));
    } else {
      setExpandedDepartments(prev => (prev.includes(deptKey) ? prev : [...prev, deptKey]));
      setCollapsedDepartments(prev => prev.filter(d => d !== deptKey));
    }
  };

  // mode: 'full' (badge + stepper, dùng ở bảng desktop) | 'stepper' (chỉ
  // stepper — card mobile đã có badge riêng ở đầu thẻ).
  const getStatusBadge = (item: any, onlyBadge?: boolean, mode: 'full' | 'stepper' = 'full') => {
    const status = item.status;
    const isApproved = status === 'APPROVED';
    const isRejected = status === 'REJECTED';
    const mgrApproved = item.direct_manager_approved || false;
    const hrApproved = item.hr_approved || (isApproved && !item.employee_is_hr);
    const isRequesterHR = item.employee_is_hr || false;

    // Xác định trạng thái từng bước
    const step1 = { label: 'QLTT', active: mgrApproved || isApproved, rejected: isRejected && !mgrApproved };
    const step2 = { label: 'Nhân sự', active: hrApproved || isApproved, rejected: isRejected && mgrApproved };

    if (onlyBadge) {
      return (
        <div className="flex items-center shrink-0">
          {isApproved ? (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 whitespace-nowrap">Hoàn tất</span>
          ) : isRejected ? (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 whitespace-nowrap">Từ chối</span>
          ) : (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 whitespace-nowrap">Đang duyệt</span>
          )}
        </div>
      );
    }

    return (
      <div className={mode === 'stepper' ? 'flex items-center' : 'flex flex-col gap-2.5 min-w-[140px] group'}>
        {/* Main Status Badge */}
        {mode !== 'stepper' && (
        <div className="flex items-center">
          {isApproved ? (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">Hoàn tất</span>
          ) : isRejected ? (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">Từ chối</span>
          ) : (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">Đang duyệt</span>
          )}
        </div>
        )}

        {/* Stepper Timeline UI */}
        <div className="flex items-center gap-0">
          {/* Step 1: Manager */}
          <div className="flex flex-col items-center relative">
            <div className={`z-10 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${step1.rejected ? 'bg-red-500 border-red-100 text-white' :
              step1.active ? 'bg-emerald-500 border-emerald-100 text-white' :
                'bg-white border-gray-200 text-gray-400'
              }`}>
              {step1.rejected ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : step1.active ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <span className="text-xs font-bold">1</span>
              )}
            </div>
            <span className={`text-xs font-medium mt-1 ${step1.active ? 'text-emerald-600' : step1.rejected ? 'text-red-600' : 'text-gray-400'}`}>QLTT</span>
          </div>

          {!isRequesterHR && (
            <>
              {/* Connecting Line */}
              <div className="flex-1 h-[2px] w-8 mx-0 mb-3.5 relative overflow-hidden bg-gray-100 -translate-y-0.5">
                <div className={`absolute inset-0 transition-transform duration-300 ${step1.active ? 'translate-x-0 bg-emerald-400' : '-translate-x-full'}`} />
              </div>

              {/* Step 2: HR */}
              <div className="flex flex-col items-center relative">
                <div className={`z-10 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${step2.rejected ? 'bg-red-500 border-red-100 text-white' :
                  step2.active ? 'bg-emerald-500 border-emerald-100 text-white' :
                    'bg-white border-gray-200 text-gray-400'
                  }`}>
                  {step2.rejected ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  ) : step2.active ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <span className="text-xs font-bold">2</span>
                  )}
                </div>
                <span className={`text-xs font-medium mt-1 ${step2.active ? 'text-emerald-600' : step2.rejected ? 'text-red-600' : 'text-gray-400'}`}>Nhân sự</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };



  const getDayOfWeek = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return days[date.getDay()];
  };

  const formatTimeOnly = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
  };

  const getApprovalWorkflow = (explanation: any) => {
    const workflow = [];

    // Kiểm tra xem người làm đơn có phải HR không
    const employeeIsHR = explanation.employee_is_hr || false;
    let currentStep = 1;

    // Bước 1: Quản lý trực tiếp
    const hasManager =
      explanation.employee_manager_name &&
      explanation.employee_manager_name !== 'None';
    const managerApproved = explanation.direct_manager_approved || false;
    // LƯU Ý: Nếu trưởng phòng duyệt hoặc ai đó duyệt vòng 1 rồi thì managerApproved = true.
    // Nếu status = REJECTED mà chưa ai duyệt thì vòng 1 bị từ chối.
    const managerStatus = managerApproved
      ? 'Đã duyệt'
      : (explanation.status === 'REJECTED' && (explanation.rejection_level === 'DIRECT_MANAGER' || (!explanation.rejection_level && !explanation.hr_rejected_by_name)))
        ? 'Đã từ chối'
        : 'Chưa duyệt';

    // Ưu tiên hiển thị tên người đã duyệt thực tế. Nếu bị từ chối ở bước này thì dùng rejected_by_name.
    const actualManagerName =
      explanation.direct_manager_approved_by_name ||
      (managerStatus === 'Đã từ chối' ? explanation.rejected_by_name : null) ||
      explanation.employee_manager_name ||
      'Chưa xác định';

    workflow.push({
      step: currentStep++,
      role: 'Quản lý trực tiếp',
      approver: hasManager ? actualManagerName : 'Chưa xác định',
      status: managerStatus,
      date: explanation.direct_manager_approved_at || (managerStatus === 'Đã từ chối' ? explanation.rejected_at : null),
      note: explanation.approval_note || '',
    });



    // Bước 3: Nhân sự HR
    // CHỈ HIỂN THỊ bước HR nếu người làm đơn KHÔNG PHẢI HR
    // Nếu người làm đơn là HR, chỉ cần quản lý trực tiếp duyệt là đủ
    if (!employeeIsHR) {
      const hrStatus = explanation.hr_approved
        ? 'Đã duyệt'
        : (explanation.status === 'REJECTED' && (explanation.hr_rejected_by_name || explanation.rejection_level === 'HR' || managerApproved))
          ? 'Đã từ chối'
          : 'Chưa duyệt';

      const hrApproverName = hrStatus === 'Đã duyệt'
        ? (explanation.hr_approved_by_name || 'Nhân sự HR')
        : hrStatus === 'Đã từ chối'
          ? (explanation.hr_rejected_by_name ||
            explanation.rejected_by_name ||
            explanation.approved_by_name ||
            'Nhân sự HR')
          : 'Nhân sự HR'; // Chưa duyệt

      workflow.push({
        step: currentStep++,
        role: 'Nhân sự HR',
        approver: hrApproverName,
        status: hrStatus,
        date: explanation.hr_approved_at || (hrStatus === 'Đã từ chối' ? explanation.rejected_at : null),
        note: explanation.approval_note || '',
        approved_by: explanation.hr_approved_by_name || null,
      });
    }

    if (
      explanation.status === 'APPROVED' ||
      explanation.status === 'REJECTED'
    ) {
      const requestName = getRequestTypeLabel(explanation);
      const finalStatus =
        explanation.status === 'APPROVED'
          ? `${requestName} đã duyệt`
          : `${requestName} đã từ chối`;
      const finalApprover =
        explanation.status === 'REJECTED'
          ? (explanation.hr_rejected_by_name ||
            explanation.direct_manager_rejected_by_name ||
            explanation.rejected_by_name ||
            (explanation.rejection_level === 'HR' ? 'Nhân sự HR' : 'Hệ thống'))
          : (explanation.hr_approved_by_name ||
            explanation.approved_by_name ||
            explanation.direct_manager_approved_by_name ||
            'Chưa xác định');



      workflow.push({
        step: currentStep++,
        role: 'Kết quả cuối cùng',
        approver: finalApprover,
        status: finalStatus,
        date: explanation.approved_at || explanation.rejected_at || explanation.updated_at,
        note: explanation.approval_note || '',

      });
    }

    return workflow;
  };

  /**
   * Helper function cho timeline duyệt đơn làm việc online và đăng ký (2 bước)
   */
  const getOnlineWorkApprovalWorkflow = (request: any) => {
    const workflow = [];
    const employeeIsHR = request.employee_is_hr || false;
    // Registration requests have registration_type, online work requests have work_date mostly
    const isRegistration = !!request.registration_type;
    const requestName = isRegistration ? 'Đăng ký' : 'Làm việc online';
    let currentStep = 1;

    // Bước 1: Quản lý trực tiếp
    const managerStatus = request.direct_manager_approved
      ? 'Đã duyệt'
      : (request.status === 'REJECTED' && (request.rejection_level === 'DIRECT_MANAGER' || request.direct_manager_rejected || (!request.rejection_level && !request.hr_rejected_by_name)))
        ? 'Đã từ chối'
        : 'Chưa duyệt';

    const managerApproverName =
      request.direct_manager_approved_by_name ||
      request.direct_manager_rejected_by_name ||
      request.employee_manager_name ||
      'Chưa xác định';

    workflow.push({
      step: currentStep++,
      role: 'Quản lý trực tiếp',
      approver: managerApproverName,
      status: managerStatus,
      date:
        request.direct_manager_approved_at ||
        request.direct_manager_rejected_at ||
        null,
      note: request.direct_manager_note || '',
    });


    // Bước 3: Nhân sự HR
    if (!employeeIsHR) {
      const hrStatus = request.hr_approved
        ? 'Đã duyệt'
        : (request.status === 'REJECTED' && (request.hr_rejected_by_name || request.hr_rejected || request.rejection_level === 'HR' || request.direct_manager_approved))
          ? 'Đã từ chối'
          : 'Chưa duyệt';

      const hrApproverName =
        hrStatus === 'Đã duyệt'
          ? (request.hr_approved_by_name || 'Nhân sự HR')
          : hrStatus === 'Đã từ chối'
            ? (request.hr_rejected_by_name ||
              request.rejected_by_name ||
              request.approved_by_name ||
              'Nhân sự HR')
            : 'Nhân sự HR'; // Chưa duyệt

      workflow.push({
        step: currentStep++,
        role: 'Nhân sự HR',
        approver: hrApproverName,
        status: hrStatus,
        date: request.hr_approved_at || request.hr_rejected_at || null,
        note: request.hr_note || '',
      });
    }

    // Bước 4: Tổng hợp trạng thái cuối cùng
    if (request.status === 'APPROVED' || request.status === 'REJECTED') {
      const requestName = getRequestTypeLabel(request);
      const finalStatus =
        request.status === 'APPROVED'
          ? `${requestName} đã duyệt`
          : `${requestName} đã từ chối`;
      const finalApprover =
        request.hr_rejected_by_name ||
        (request.status === 'REJECTED' && request.rejected_by_name) ||
        request.direct_manager_rejected_by_name ||
        request.hr_approved_by_name ||
        request.direct_manager_approved_by_name ||
        request.approved_by_name ||
        (request.status === 'REJECTED' ? 'Hệ thống' : 'Chưa xác định');


      workflow.push({
        step: currentStep++,
        role: 'Kết quả cuối cùng',
        approver: finalApprover,
        status: finalStatus,
        date: request.approved_at || request.rejected_at || request.updated_at,
        note: request.approval_note || request.hr_note || request.direct_manager_note || '',

      });
    }

    return workflow;
  };
  const getCurrentTitle = () => {
    if (activeTab === 'pending') return 'Yêu cầu chờ duyệt';
    if (activeTab === 'approved') return 'Yêu cầu đã duyệt';
    return 'Yêu cầu đã từ chối';
  };

  const toggleFilter = (type: string) => {
    setFilterTypes(prev => {
      const isRemoving = prev.includes(type);
      const next = isRemoving ? prev.filter(t => t !== type) : [...prev, type];

      // Nếu bỏ chọn EXPLANATION, xóa luôn các sub-types
      if (isRemoving && type === 'EXPLANATION') {
        setFilterExplanationSubTypes([]);
      }
      // Nếu bỏ chọn REGISTRATION, xóa luôn các sub-types
      if (isRemoving && type === 'REGISTRATION') {
        setFilterRegistrationSubTypes([]);
      }
      return next;
    });
  };

  const toggleSubTypeFilter = (subType: string) => {
    setFilterExplanationSubTypes(prev =>
      prev.includes(subType) ? prev.filter(t => t !== subType) : [...prev, subType]
    );
  };

  const toggleRegSubTypeFilter = (subType: string) => {
    setFilterRegistrationSubTypes(prev =>
      prev.includes(subType) ? prev.filter(t => t !== subType) : [...prev, subType]
    );
  };

  // "Tôi là QLTT": khớp CẢ quản lý trực tiếp cá nhân (employee_manager_id,
  // Employee.manager) LẪN trưởng phòng ban (employee_department_manager_id,
  // Department.manager) — 1 người có thể là QLTT của cả phòng ban mà không
  // đứng tên manager riêng cho từng nhân viên. LƯU Ý: backend Alan hiện chưa
  // trả employee_department_manager_id (field luôn undefined) nên thực tế chỉ
  // khớp theo employee_manager_id cho tới khi backend bổ sung.
  const isMyDirectReportItem = (item: any): boolean =>
    !!currentEmployee && (
      item.employee_manager_id === currentEmployee.id ||
      (item.employee_department_manager_id != null && item.employee_department_manager_id === currentEmployee.id)
    );

  const matchesTextFilters = (req: any) => {
    const name = (req.employee_name || '').toLowerCase();
    const dept = (req.employee_department || req.department_name || '').toLowerCase();
    const nameFilter = debouncedFilterName.toLowerCase();
    const deptFilter = filterDepartment.toLowerCase();

    if (debouncedFilterName && !name.includes(nameFilter) && !(req.employee_code || '').toLowerCase().includes(nameFilter)) return false;
    if (filterDepartment && !dept.includes(deptFilter)) return false;
    return true;
  };


  // Áp TOÀN BỘ bộ lọc (tên, phòng ban, "Tôi là QLTT", phạm vi QLTT, loại đơn,
  // đơn của tôi...) lên 5 mảng nguồn — dùng chung cho danh sách hiển thị lẫn
  // việc tách 2 dải duyệt (memoizedApprovalLevelSplit).
  const buildFilteredCombinedList = (
    explanations: any[], registrations: any[], leaveRequests: any[], overtimeRequests: any[], onlineWorks: any[],
  ) => {
    // 2. Map and filter
    const mappedExplanations = (explanations || [])
      .filter(matchesTextFilters)
      .map(e => ({ ...e, _itemType: 'EXPLANATION' }));

    const mappedRegistrations = (registrations || [])
      .filter(matchesTextFilters)
      .map(r => ({ ...r, _itemType: 'REGISTRATION' }));

    const mappedOnlineWorks = (onlineWorks || [])
      .filter(matchesTextFilters)
      .map(o => ({ ...o, _itemType: 'ONLINE_WORK' }));

    const mappedLeaves = (leaveRequests || [])
      .filter(matchesTextFilters)
      .map(l => ({ ...l, _itemType: 'LEAVE' }));

    const mappedOvertimes = (overtimeRequests || [])
      .filter(matchesTextFilters)
      .map(ov => ({
        ...ov,
        _itemType: 'REGISTRATION',
        registration_type: 'OVERTIME'
      }));

    // 3. Combine and filter by type (search bar filters)
    let all = [
      ...mappedExplanations,
      ...mappedRegistrations,
      ...mappedOnlineWorks,
      ...mappedLeaves,
      ...mappedOvertimes
    ];

    // Đơn đã qua QLTT duyệt (đang chờ HCNS) là việc của HCNS/Admin — QLTT
    // thuần tuý không cần thấy nữa ở tab Chờ duyệt (yêu cầu HCNS TA
    // 2026-09-23). Tab Đã duyệt/Từ chối vẫn hiện đủ để họ tra cứu lại.
    if (activeTab === 'pending' && !isAdmin && !isHR) {
      all = all.filter(item => !item.direct_manager_approved);
    }

    if (filterOnlyMine) {
      all = all.filter(item => {
        const itemEmpId = item.employee_id || (typeof item.employee === 'object' ? item.employee?.id : item.employee);
        return itemEmpId === currentEmployee?.id;
      });
    }

    // "Tôi là QLTT" — cho phép HR/Admin (vốn mặc định thấy toàn công ty ở
    // block dưới) tự lọc riêng xuống đúng những đơn của cấp dưới trực tiếp
    // của chính họ, khi họ VỪA là quản lý VỪA có quyền HR/Admin.
    if (filterOnlyMyDirectReports && currentEmployee) {
      all = all.filter(isMyDirectReportItem);
    }

    // Nếu không phải superadmin hoặc HR thật sự: chỉ hiển thị đơn của nhân viên mà mình là QLTT trực tiếp
    const isTrueSuperAdmin = (user as any)?.is_superuser || currentEmployee?.user?.is_superuser;
    const isTrueHR = currentEmployee?.is_hr === true || user?.role?.toUpperCase() === 'HR';

    if (!isTrueSuperAdmin && !isTrueHR && currentEmployee) {
      all = all.filter(item => {
        const itemEmpId = item.employee_id || (typeof item.employee === 'object' ? item.employee?.id : item.employee);
        const isMine = itemEmpId === currentEmployee.id;
        const isMyDirectReport = item.employee_manager_id === currentEmployee.id;
        return isMine || isMyDirectReport;
      });
    }

    if (filterTypes.length > 0) {
      all = all.filter(item => {
        if (filterTypes.includes('EXPLANATION') && item._itemType === 'EXPLANATION') {
          if (filterExplanationSubTypes.length > 0) {
            const type = (item.explanation_type || '').toUpperCase();
            return filterExplanationSubTypes.includes(type);
          }
          return true;
        }
        if (filterTypes.includes('REGISTRATION') && (item._itemType === 'REGISTRATION' || item._itemType === 'OVERTIME')) {
          if (filterRegistrationSubTypes.length > 0) {
            const type = (item.registration_type || item.event_type || item._itemType || '').toUpperCase();
            return filterRegistrationSubTypes.includes(type);
          }
          return true;
        }
        if (filterTypes.includes('ONLINE_WORK') && item._itemType === 'ONLINE_WORK') return true;
        if (filterTypes.includes('LEAVE') && item._itemType === 'LEAVE') return true;
        return false;
      });
    }

    return all;
  };

  // 4. Sort by created_at ascending (FCFS: đơn gửi trước hiện trước)
  const sortByCreatedAtAsc = (items: any[]) => [...items].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });

  // 5. Group by Department -> Position -> Employee for Accordion view.
  // Factor riêng để dùng lại cho việc tách 2 dải duyệt.
  const buildDeptPosEmpGroups = (items: any[]) => {
    const groups: Record<string, Record<string, Record<string, any[]>>> = {};
    items.forEach(item => {
      const itemEmpId = item.employee_id || (typeof item.employee === 'object' ? item.employee?.id : item.employee);
      const isMine = itemEmpId === currentEmployee?.id;

      const dept = isMine ? 'Đơn của Tôi' : (item.employee_department || item.department_name || 'Khác');
      const pos = item.employee_position || item.position_name || 'Nhân viên';
      const empName = item.employee_name || 'Không rõ';

      if (!groups[dept]) groups[dept] = {};
      if (!groups[dept][pos]) groups[dept][pos] = {};
      if (!groups[dept][pos][empName]) groups[dept][pos][empName] = [];
      groups[dept][pos][empName].push(item);
    });

    // Ensure "Đơn của Tôi" is first if it exists
    const finalGroups: Record<string, Record<string, Record<string, any[]>>> = {};
    if (groups['Đơn của Tôi']) {
      finalGroups['Đơn của Tôi'] = groups['Đơn của Tôi'];
    }

    Object.keys(groups).sort().forEach(dept => {
      if (dept !== 'Đơn của Tôi') {
        finalGroups[dept] = groups[dept];
      }
    });

    return finalGroups;
  };

  const memoizedGroupedRequests = useMemo(() => {
    // 1. Get base data based on active tab
    const explanations = activeTab === 'pending' ? attendanceExplanations : activeTab === 'approved' ? approvedExplanations : rejectedExplanations;
    const registrations = activeTab === 'pending' ? pendingRegistrations : activeTab === 'approved' ? approvedRegistrations : rejectedRegistrations;
    const leaveRequests = activeTab === 'pending' ? pendingLeaveRequests : activeTab === 'approved' ? approvedLeaveRequests : rejectedLeaveRequests;
    const overtimeRequests = activeTab === 'pending' ? pendingOvertimeRequests : activeTab === 'approved' ? approvedOvertimeRequests : rejectedOvertimeRequests;
    const onlineWorks = activeTab === 'pending' ? pendingOnlineWorkRequests : activeTab === 'approved' ? approvedOnlineWorkRequests : rejectedOnlineWorkRequests;

    const all = buildFilteredCombinedList(explanations, registrations, leaveRequests, overtimeRequests, onlineWorks);
    return buildDeptPosEmpGroups(sortByCreatedAtAsc(all));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    attendanceExplanations, approvedExplanations, rejectedExplanations,
    pendingRegistrations, approvedRegistrations, rejectedRegistrations,
    pendingLeaveRequests, approvedLeaveRequests, rejectedLeaveRequests,
    pendingOvertimeRequests, approvedOvertimeRequests, rejectedOvertimeRequests,
    pendingOnlineWorkRequests, approvedOnlineWorkRequests, rejectedOnlineWorkRequests,
    filterOnlyMine, filterOnlyMyDirectReports,
    filterTypes, filterExplanationSubTypes, filterRegistrationSubTypes,
    debouncedFilterName, filterDepartment,
    currentEmployee,
    user, isAdmin, isHR,
  ]);

  // Tách đơn chờ duyệt thành 2 dải theo việc-cần-làm (port từ TA 594010b +
  // cbba949): "Cấp 1" = direct_manager_approved chưa có (đang chờ QLTT duyệt),
  // "Cấp 2" = QLTT đã duyệt, đang chờ Nhân sự duyệt nốt. Field
  // direct_manager_approved có ở MỌI loại đơn hiện trong trang này nên tách
  // được đồng nhất, không cần biết loại đơn.
  //
  // Chỉ tách khi đang ở tab "Chờ duyệt" VÀ người xem thực sự thấy CẢ 2 cấp
  // cùng lúc. Cấp 2 chỉ HCNS/Admin thấy (yêu cầu HCNS TA 2026-09-23: "để cho
  // QLTT nhìn thấy cấp 1 thôi") — với QLTT thuần tuý hàm này luôn null nên họ
  // xem danh sách phẳng như cũ.
  const memoizedApprovalLevelSplit = useMemo(() => {
    if (activeTab !== 'pending') return null;

    const sorted = sortByCreatedAtAsc(buildFilteredCombinedList(
      attendanceExplanations, pendingRegistrations, pendingLeaveRequests, pendingOvertimeRequests, pendingOnlineWorkRequests
    ));

    const level1Items = sorted.filter(item => !item.direct_manager_approved);
    // Cấp 2 = đơn đã qua QLTT, đang chờ HCNS duyệt -> việc của HCNS/Admin.
    const canSeeLevel2 = isAdmin || isHR;
    const level2Items = canSeeLevel2 ? sorted.filter(item => !!item.direct_manager_approved) : [];

    if (level1Items.length === 0 || level2Items.length === 0) return null;

    return {
      level1Groups: buildDeptPosEmpGroups(level1Items),
      level2Groups: buildDeptPosEmpGroups(level2Items),
      level1Count: level1Items.length,
      level2Count: level2Items.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    attendanceExplanations, pendingRegistrations, pendingLeaveRequests, pendingOvertimeRequests, pendingOnlineWorkRequests,
    filterOnlyMine, filterOnlyMyDirectReports, filterTypes, filterExplanationSubTypes, filterRegistrationSubTypes,
    debouncedFilterName, filterDepartment,
    currentEmployee,
    user, isAdmin, isHR,
  ]);

  const getGroupedRequests = () => memoizedGroupedRequests;

  const getTotalCount = () => {
    const groups = getGroupedRequests();
    let count = 0;
    Object.values(groups).forEach(posGroup => {
      Object.values(posGroup).forEach(empGroup => {
        Object.values(empGroup).forEach(items => {
          count += items.length;
        });
      });
    });
    return count;
  };

  const getTabCount = (type: string) => {
    let requests: any[] = [];
    if (type === 'EXPLANATION') {
      requests = activeTab === 'pending' ? attendanceExplanations : activeTab === 'approved' ? approvedExplanations : rejectedExplanations;
    } else if (type === 'REGISTRATION') {
      const regs = activeTab === 'pending' ? pendingRegistrations : activeTab === 'approved' ? approvedRegistrations : rejectedRegistrations;
      const ots = activeTab === 'pending' ? pendingOvertimeRequests : activeTab === 'approved' ? approvedOvertimeRequests : rejectedOvertimeRequests;
      requests = [...regs, ...ots];
    } else if (type === 'LEAVE') {
      requests = activeTab === 'pending' ? pendingLeaveRequests : activeTab === 'approved' ? approvedLeaveRequests : rejectedLeaveRequests;
    } else if (type === 'ONLINE_WORK') {
      requests = activeTab === 'pending' ? pendingOnlineWorkRequests : activeTab === 'approved' ? approvedOnlineWorkRequests : rejectedOnlineWorkRequests;
    }

    let filtered = requests.filter(matchesTextFilters);
    if (filterOnlyMine) {
      filtered = filtered.filter(item => {
        const itemEmpId = item.employee_id || (typeof item.employee === 'object' ? item.employee?.id : item.employee);
        return itemEmpId === currentEmployee?.id;
      });
    }
    if (filterOnlyMyDirectReports) {
      filtered = filtered.filter(isMyDirectReportItem);
    }
    return filtered.length;
  };


  const now = new Date();
  const isEarly = now.getDate() <= 15;
  const currentMonth = isEarly
    ? (now.getMonth() === 0 ? 12 : now.getMonth())
    : now.getMonth() + 1;
  const currentYear = isEarly && now.getMonth() === 0
    ? now.getFullYear() - 1
    : now.getFullYear();

  const hasActiveFilters = filterTypes.length > 0 || filterName !== '' || filterDepartment !== '' || filterOnlyMine || filterOnlyMyDirectReports || filterMonth !== currentMonth || filterYear !== currentYear;

  const clearAllFilters = () => {
    setFilterTypes([]);
    setFilterExplanationSubTypes([]);
    setFilterRegistrationSubTypes([]);
    setFilterName('');
    setFilterDepartment('');
    setFilterOnlyMine(false);
    setFilterOnlyMyDirectReports(false);
    setFilterMonth(currentMonth);
    setFilterYear(currentYear);
  };

  const getTotalFilteredCount = () => getTotalCount();

  // ── Cấu hình 2 nhóm tab (xem chú thích ở state `activeSection`) ──────────
  const REQUEST_TABS: {
    key: 'pending' | 'approved' | 'rejected';
    label: string; count: number; activeClass: string; badgeClass: string; icon: JSX.Element;
  }[] = [
    {
      key: 'pending', label: 'Chờ duyệt', count: stats.total_pending,
      activeClass: 'border-primary-600 text-primary-600', badgeClass: 'bg-red-500',
      icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    },
    {
      key: 'approved', label: 'Đã duyệt', count: stats.total_approved,
      activeClass: 'border-emerald-600 text-emerald-600', badgeClass: 'bg-emerald-500',
      icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>),
    },
    {
      key: 'rejected', label: 'Từ chối', count: stats.total_rejected,
      activeClass: 'border-red-600 text-red-600', badgeClass: 'bg-amber-500',
      icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>),
    },
  ];

  // Alan chỉ có 1 nghiệp vụ phụ là duyệt bảng công tháng (không có "Chốt
  // công" kiểu attendance-finalization hay "Ca 2" như TA). Tab chỉ hiện với
  // đúng đối tượng trước đây nhìn thấy panel (Admin/Quản lý).
  const SECTION_TABS: {
    key: 'work_finalization';
    label: string; title: string; count: number; icon: JSX.Element;
  }[] = showWorkFinalizationPanel ? [
    {
      key: 'work_finalization', label: 'Bảng công tháng',
      title: 'Phê duyệt chốt công nhân viên (bảng công tháng theo phòng ban)',
      count: workFinalizationApprovals.filter((i: any) => i?.status === 'PENDING').length,
      icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>),
    },
  ] : [];

  return (
    <div>
      {/* Cập nhật nhanh - Floating indicator */}
      <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[60] transition-all duration-500 transform ${showRefreshToast ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0 pointer-events-none'}`}>
        <div className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium">Đã cập nhật dữ liệu mới</span>
        </div>
      </div>

      {/* Header trang — gộp 3 lớp tiêu đề cũ (h1 "Phê duyệt" + đoạn mô tả +
          h2 "Yêu cầu chờ duyệt/Có N yêu cầu") làm 1 cho gọn, theo pattern
          MyRequests.tsx. Bỏ nút "Lịch sử duyệt" (không có onClick). */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Phê duyệt</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeSection === 'requests'
              ? `${getCurrentTitle()} · ${getTotalFilteredCount()} yêu cầu`
              : 'Duyệt đơn từ và bảng công tháng của nhân viên'}
            {' · '}Cập nhật {lastRefreshedAt.toLocaleTimeString('vi-VN')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => fetchAllData(true)}
            className="flex-1 sm:flex-none justify-center border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center gap-2 text-sm font-medium"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span>Làm mới</span>
          </button>
        </div>

        {/* Nút làm mới nổi trên mobile */}
        <button
          onClick={() => fetchAllData(true)}
          className={`fixed bottom-6 right-6 sm:hidden z-50 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center border-4 border-white transition-all active:scale-90 ${loading ? 'animate-pulse' : ''}`}
        >
          <svg className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      {/* Banner hạn chốt công */}
      <div className="mb-4">
        <FinalizationLockBanner year={filterYear} month={filterMonth} bypassRoles={['ADMIN', 'HR']} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {/* Thanh tab 2 nhóm — nhóm trái là 3 trạng thái duyệt đơn từ (giữ y
            như cũ), nhóm phải là nghiệp vụ trước đây xếp chồng ngay dưới danh
            sách đơn (bảng công tháng). Badge số để không ai bỏ sót việc khi
            panel không còn tự hiện. */}
        <div className="flex flex-wrap items-center border-b border-gray-200 mb-6 gap-y-1">
          {REQUEST_TABS.map((t) => {
            const isActive = activeSection === 'requests' && activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => { setActiveSection('requests'); setActiveTab(t.key); }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  isActive ? t.activeClass : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.icon}
                {t.label}
                {t.count > 0 && (
                  <span className={`ml-1 min-w-[20px] h-5 inline-flex items-center justify-center px-1.5 rounded-full text-xs font-bold text-white ${t.badgeClass}`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}

          {SECTION_TABS.length > 0 && (
            <span className="mx-2 hidden h-6 w-px self-center bg-gray-200 sm:block" />
          )}

          {SECTION_TABS.map((t) => {
            const isActive = activeSection === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveSection(t.key)}
                title={t.title}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.icon}
                {t.label}
                {t.count > 0 && (
                  <span className="ml-1 min-w-[20px] h-5 inline-flex items-center justify-center px-1.5 rounded-full text-xs font-bold bg-indigo-500 text-white">
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Khu vực ĐƠN TỪ (3 tab trạng thái bên trái) — bộ lọc + danh sách.
            4 thẻ thống kê + thẻ "Tháng này" cũ ở đây đã bỏ: chúng hiện đúng
            cùng con số với 4 chip lọc bên dưới mà lại không bấm được, progress
            bar viết cứng 100% (HCNS duyệt bỏ). */}
        {activeSection === 'requests' && (
        <>

        {/* Bộ lọc — gom về 1 hàng điều khiển + 2 hàng chip (port từ TA).
            Bản cũ xếp 5 hàng rời nhau cao ~275px (mobile ~700px): nhãn có icon
            3x3 gần như vô hình, nút "Đơn của tôi" trôi sang tận mép phải. */}
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6 space-y-3">
          {/* Hàng 1: các ô nhập/chọn */}
          <div className="flex flex-wrap items-end gap-3">
            {(isAdmin || isHR || isManagement) && (
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tìm nhân viên</label>
                <div className="relative">
                  <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                  </svg>
                  <input
                    type="text"
                    value={filterName}
                    onChange={e => setFilterName(e.target.value)}
                    placeholder="Tên hoặc mã nhân viên..."
                    className="h-[42px] w-full pl-9 pr-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  />
                </div>
              </div>
            )}

            {(isAdmin || isHR) && (
              <div className="w-full sm:w-[220px]">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Phòng ban</label>
                <SelectBox
                  label=""
                  value={filterOnlyMyDirectReports ? MY_DIRECT_REPORTS_SENTINEL : filterDepartment}
                  options={deptOptions}
                  onChange={(v) => {
                    if (v === MY_DIRECT_REPORTS_SENTINEL) {
                      setFilterOnlyMyDirectReports(true);
                      setFilterDepartment('');
                    } else {
                      setFilterOnlyMyDirectReports(false);
                      setFilterDepartment(v);
                    }
                  }}
                  placeholder="Tất cả phòng ban"
                />
              </div>
            )}

            <div className="w-[104px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tháng</label>
              <SelectBox
                label=""
                value={filterMonth.toString()}
                options={Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: `Tháng ${i + 1}` }))}
                onChange={(val) => setFilterMonth(parseInt(val))}
              />
            </div>

            <div className="w-[100px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Năm</label>
              <SelectBox
                label=""
                value={filterYear.toString()}
                options={Array.from({ length: 5 }, (_, i) => {
                  const y = 2026 + i;
                  return { value: y.toString(), label: y.toString() };
                })}
                onChange={(val) => setFilterYear(parseInt(val))}
              />
            </div>

            <button
              onClick={() => setFilterOnlyMine(!filterOnlyMine)}
              className={`h-[42px] flex items-center gap-2 px-3 rounded-lg text-sm font-medium border transition-colors ${filterOnlyMine
                ? 'bg-primary-600 text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Đơn của tôi
            </button>

            {/* 1 nút "Xoá lọc" duy nhất (trước có 2 nút "Xoá loại đơn" và
                "Đặt lại tất cả"). */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="h-[42px] ml-auto flex items-center gap-1.5 px-3 rounded-lg text-sm font-medium text-gray-500 bg-white border border-gray-200 hover:text-rose-600 hover:border-rose-200 transition-colors"
                title="Đặt lại toàn bộ bộ lọc về mặc định"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Xoá lọc
              </button>
            )}
          </div>

          {/* Hàng 2: chip loại đơn */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-200/70">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0">Loại đơn</span>
            {[
              { value: 'EXPLANATION', label: 'Giải trình', count: getTabCount('EXPLANATION'), color: 'amber' },
              { value: 'REGISTRATION', label: 'Đăng ký', count: getTabCount('REGISTRATION'), color: 'primary' },
              { value: 'LEAVE', label: 'Nghỉ phép tháng', count: getTabCount('LEAVE'), color: 'primary' },
              { value: 'ONLINE_WORK', label: 'Làm việc online', count: getTabCount('ONLINE_WORK'), color: 'emerald' },
            ].map(opt => {
              const isActive = filterTypes.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleFilter(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    isActive ? TYPE_CHIP_STYLES[opt.color].active : TYPE_CHIP_STYLES[opt.color].idle
                  }`}
                >
                  {opt.label}
                  {opt.count > 0 && (
                    <span className={`px-1.5 rounded text-[11px] font-bold ${isActive ? 'bg-white/20 text-white' : TYPE_CHIP_STYLES[opt.color].badge}`}>
                      {opt.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Hàng 3: chip chi tiết — chỉ hiện khi đã chọn nhóm tương ứng.
              Gộp 2 khối sub-filter cũ, vẫn chọn nhiều như trước. */}
          {(filterTypes.includes('EXPLANATION') || filterTypes.includes('REGISTRATION')) && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-200/70">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0">Chi tiết</span>
              {filterTypes.includes('EXPLANATION') && EXPLANATION_SUB_TYPES.map((sub) => {
                const isSubActive = filterExplanationSubTypes.includes(sub.value);
                return (
                  <button
                    key={sub.value}
                    onClick={() => toggleSubTypeFilter(sub.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                      isSubActive
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-amber-200'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
              {filterTypes.includes('REGISTRATION') && REGISTRATION_SUB_TYPES.map((sub) => {
                const isSubActive = filterRegistrationSubTypes.includes(sub.value);
                return (
                  <button
                    key={sub.value}
                    onClick={() => toggleRegSubTypeFilter(sub.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                      isSubActive
                        ? 'bg-primary-50 text-primary-700 border-primary-300'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-200'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {loading && fetchProgress && (
            <div className="px-4 py-3 bg-primary-50 border border-primary-100 rounded-lg flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-primary-600 font-medium">
                <span>Đang tải dữ liệu...</span>
                <span>{fetchProgress.loaded}{fetchProgress.total ? ` / ${fetchProgress.total}` : ''} đơn</span>
              </div>
              {fetchProgress.total && (
                <div className="h-1.5 bg-primary-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (fetchProgress.loaded / fetchProgress.total) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}
          {loading && Object.keys(getGroupedRequests()).length === 0 ? (
            <div className="space-y-6">
              <SkeletonItem />
              <SkeletonItem />
            </div>
          ) : Object.keys(getGroupedRequests()).length === 0 ? (
            <div className="bg-white border rounded-lg overflow-hidden p-12 text-center shadow-sm">
              <div className="flex flex-col items-center justify-center">
                <svg
                  className="h-12 w-12 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-xl font-medium text-gray-900">
                  {activeTab === 'pending' ? 'Không có yêu cầu nào chờ duyệt' : 'Không có yêu cầu nào'}
                </p>
                <p className="text-gray-500 mt-1 text-base">
                  Tất cả yêu cầu đã được xử lý hoặc không tìm thấy kết quả phù hợp.
                </p>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="mt-4 text-primary-600 font-bold hover:underline text-base">
                    Xóa bộ lọc để xem tất cả
                  </button>
                )}
              </div>
            </div>
          ) : (() => {
            const groupedRequests = getGroupedRequests();
            const deptEntries = Object.entries(groupedRequests);
            const totalDepts = deptEntries.length;
            const approvalLevelSplit = memoizedApprovalLevelSplit;

            // `levelKey` tách khoá đóng/mở của 2 dải Cấp 1 / Cấp 2: cùng 1
            // phòng ban có thể xuất hiện ở CẢ 2 dải, nếu dùng chung deptName
            // làm khoá thì đóng phòng ở dải này là đóng luôn ở dải kia.
            const renderDeptCard = (levelKey: string) => ([deptName, posGroups]: [string, any]) => {
              const deptKey = levelKey ? `${levelKey}::${deptName}` : deptName;
              // Mặc định mở sẵn khi danh sách ít (<= 3 phòng) thay vì chỉ khi
              // đúng 1 phòng như trước — trước đây cả 3 cấp đều đóng nên vào
              // trang KHÔNG thấy đơn nào, phải bấm 2 lần mới thấy dòng đầu tiên.
              // Người dùng vẫn đóng/mở tay được y như cũ.
              const isDeptExpanded =
                expandedDepartments.includes(deptKey)
                || (totalDepts <= 3 && !collapsedDepartments.includes(deptKey));

              // Correctly flatten 3-level groups: posGroups -> empGroups -> items
              const allItemsInDept = Object.values(posGroups as Record<string, any>).reduce((acc: any[], empGroup: any) =>
                acc.concat(...Object.values(empGroup as Record<string, any>)), []
              );

              const deptItemCount = allItemsInDept.length;
              const pendingInDept = allItemsInDept.filter((r: any) => r.status === 'PENDING' && canApproveRequest(r)).length;

              return (
                <div key={deptKey} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm mb-3">
                  {/* Department Header */}
                  <div className={`w-full flex items-center justify-between p-3 sm:p-4 ${deptName === 'Đơn của Tôi' ? 'bg-rose-50/80 border-rose-100' : 'bg-gray-50 border-gray-200'} border-b`}>
                    <button
                      onClick={() => toggleDepartmentGroup(deptKey, isDeptExpanded)}
                      className="flex items-center gap-2 sm:gap-3 text-left focus:outline-none flex-1 min-w-0"
                    >
                      <div className={`p-1.5 sm:p-2 rounded-lg ${isDeptExpanded ? 'bg-primary-600 text-white shadow-md' : 'bg-primary-50 text-primary-600'}`}>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 overflow-hidden">
                        <h3 className="font-semibold text-gray-800 text-base truncate">{deptName}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{allItemsInDept.length} đơn</span>
                          {pendingInDept > 0 && (activeTab === 'pending') && (
                            <span className="text-xs sm:text-sm font-semibold text-rose-600 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                              {pendingInDept} mới
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 sm:gap-4">
                      {hasBulkApprovePermission && activeTab === 'pending' && pendingInDept > 0 && (
                        <button
                          disabled={isBulkProcessing}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBulkApproveItems(allItemsInDept, `phòng ${deptName}`);
                          }}
                          className="flex items-center gap-2 h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                          title={`Duyệt nhanh tất cả đơn của phòng ${deptName}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          <span>Duyệt nhanh</span>
                        </button>
                      )}

                      <button
                        onClick={() => toggleDepartmentGroup(deptKey, isDeptExpanded)}
                        className={`p-2 hover:bg-gray-200 rounded-full transition-transform duration-300 ${isDeptExpanded ? 'rotate-180' : ''}`}
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                  </div>

                  {/* Accordion Content - Positions */}
                  {isDeptExpanded && (
                    <div className="p-2 sm:p-4 space-y-6 bg-gray-50/30">
                      {Object.entries(posGroups as Record<string, any>).map(([posName, empGroups]: [string, any]) => {
                        const allItemsInPos = ([] as any[]).concat(...Object.values(empGroups as Record<string, any>));
                        const pendingInPos = allItemsInPos.filter((r: any) => r.status === 'PENDING' && canApproveRequest(r)).length;

                        return (
                          <div key={posName} className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden border-l-4 border-l-primary-500">
                            {/* Position Sub-Header */}
                            <div className="flex items-center justify-between px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-800">
                                    Vị trí: {posName}
                                  </h4>
                                  <span className="text-xs font-bold text-gray-400">
                                    Tổng: {allItemsInPos.length} đơn đang xử lý
                                  </span>
                                </div>
                              </div>

                              {hasBulkApprovePermission && activeTab === 'pending' && pendingInPos > 0 && (
                                <button
                                  disabled={isBulkProcessing}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBulkApproveItems(allItemsInPos, `vị trí ${posName}`);
                                  }}
                                  className="flex items-center gap-2 h-8 px-4 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white text-xs font-medium rounded-md border border-emerald-200 transition-colors disabled:opacity-50"
                                  title={`Duyệt nhanh tất cả đơn của vị trí ${posName}`}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                  <span>Duyệt nhanh {pendingInPos} đơn</span>
                                </button>
                              )}
                            </div>

                            {/* New Level: Employee Accordion */}
                            <div className="p-4 space-y-4">
                              {Object.entries(empGroups as Record<string, any>).map(([empName, items]: [string, any[]]) => {
                                const accordionKey = `${deptKey}-${posName}-${empName}`;
                                // Mở sẵn nhân viên khi phòng đang mở và ít đơn
                                // (<= 10) — xem chú thích isDeptExpanded ở trên.
                                const isEmpExpanded =
                                  expandedEmployees.includes(accordionKey)
                                  || (isDeptExpanded
                                      && deptItemCount <= 10
                                      && !collapsedEmployees.includes(accordionKey));
                                const pendingInEmp = (items || []).filter((r: any) => r.status === 'PENDING' && canApproveRequest(r)).length;
                                const firstItem = items[0];

                                return (
                                  <div key={empName} className={`border rounded-lg overflow-hidden transition-colors ${isEmpExpanded ? 'border-primary-100 shadow-sm' : 'border-gray-100 hover:border-primary-200'}`}>
                                    {/* Employee Accordion Header */}
                                    <div
                                      className={`flex flex-col px-4 py-3 cursor-pointer transition-colors ${isEmpExpanded ? 'bg-primary-50/40' : 'bg-white hover:bg-gray-50'}`}
                                      onClick={() => {
                                        if (!isEmpExpanded) {
                                          setExpandedEmployees((prev: string[]) =>
                                            prev.includes(accordionKey) ? prev : [...prev, accordionKey]);
                                          setCollapsedEmployees((prev: string[]) => prev.filter(k => k !== accordionKey));
                                        } else {
                                          setExpandedEmployees((prev: string[]) => prev.filter(k => k !== accordionKey));
                                          setCollapsedEmployees((prev: string[]) =>
                                            prev.includes(accordionKey) ? prev : [...prev, accordionKey]);
                                        }
                                      }}
                                    >
                                      {/* Row 1: Info and Actions */}
                                      <div className="flex items-start justify-between w-full">
                                        <div className="flex items-center gap-3">
                                          <div className="relative">
                                            <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-white text-xs font-semibold">
                                              {empName.charAt(0)}
                                            </div>
                                            {pendingInEmp > 0 && activeTab === 'pending' && (
                                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-xs font-semibold flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                                                {pendingInEmp}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex flex-col">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                              <div className="text-base font-semibold text-gray-800 leading-tight">
                                                {empName}
                                              </div>
                                              <span className="w-fit px-2 py-0.5 bg-primary-50 text-primary-600 rounded-lg text-xs font-semibold border border-primary-100 uppercase tracking-widest leading-none">
                                                {posName}
                                              </span>
                                            </div>
                                            <div className="mt-1">
                                              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200/50">Mã nhân viên: {firstItem?.employee_code}</span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 sm:gap-4 mt-0.5 sm:mt-0">
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const empId = firstItem.employee_id || (typeof firstItem.employee === 'object' ? firstItem.employee?.id : firstItem.employee);
                                                if (empId) {
                                                  setCalendarModalEmployee({ id: Number(empId), name: empName, month: filterMonth, year: filterYear });
                                                }
                                              }}
                                              className="flex items-center justify-center w-9 h-9 rounded-lg border border-primary-100 bg-white hover:bg-primary-50 text-primary-500 hover:text-primary-700 transition-all shadow-sm"
                                              title={`Xem lịch công của ${empName}`}
                                            >
                                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </button>
                                          </div>
                                          <div className={`p-2 rounded-full transition-transform duration-500 ${isEmpExpanded ? 'rotate-180 bg-primary-100 text-primary-600' : 'bg-gray-50 text-gray-400'}`}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Row 2: Full Width Quotas */}
                                      <div className="mt-2.5 w-full">
                                        <div className="grid grid-cols-2 xs:grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full">
                                          {(() => {
                                            const empId = firstItem?.employee_id || (typeof firstItem?.employee === 'object' ? firstItem?.employee?.id : firstItem?.employee);

                                            const getMonthlyQuota = (type: string) => {
                                              const getAllTypedItems = () => {
                                                if (type === 'EXPLANATION') return [...attendanceExplanations, ...approvedExplanations, ...rejectedExplanations];
                                                if (type === 'LEAVE') return [...pendingLeaveRequests, ...approvedLeaveRequests];
                                                if (type === 'ONLINE_WORK') return [...pendingOnlineWorkRequests, ...approvedOnlineWorkRequests, ...rejectedOnlineWorkRequests];
                                                if (type === 'REGISTRATION') return [...pendingRegistrations, ...approvedRegistrations, ...pendingOvertimeRequests, ...approvedOvertimeRequests];
                                                return [];
                                              };

                                              const allOfThisType = getAllTypedItems().filter(i => {
                                                const iEmpId = i.employee_id || (typeof i.employee === 'object' ? i.employee?.id : i.employee);
                                                return iEmpId === empId;
                                              });

                                              if (allOfThisType.length === 0) return null;
                                              const itemWithQuota = allOfThisType.find(i => i.quota_used !== undefined);
                                              if (itemWithQuota && itemWithQuota.quota_used !== undefined) return itemWithQuota.quota_used;
                                              return allOfThisType.filter(i => (i.status === 'APPROVED' || i.hr_approved === true)).length;
                                            };

                                            const quotas = [
                                              { id: 'exp', label: 'Giải trình', value: getMonthlyQuota('EXPLANATION'), max: 3, color: 'amber', bg: 'bg-amber-50/70', text: 'text-amber-700', border: 'border-amber-200' },
                                              { id: 'leave', label: 'Nghỉ phép tháng', value: getMonthlyQuota('LEAVE'), max: 1, color: 'primary', bg: 'bg-primary-50/70', text: 'text-primary-700', border: 'border-primary-200' },
                                              { id: 'online', label: 'Làm việc online', value: getMonthlyQuota('ONLINE_WORK'), max: 3, color: 'emerald', bg: 'bg-emerald-50/70', text: 'text-emerald-700', border: 'border-emerald-200' },
                                              { id: 'reg', label: 'Đăng ký', value: getMonthlyQuota('REGISTRATION'), max: null, color: 'primary', bg: 'bg-primary-50/70', text: 'text-primary-700', border: 'border-primary-200' },
                                            ];

                                            return quotas.map(q => (
                                              <div key={q.id} className={`flex flex-col items-center justify-center p-1.5 rounded-lg border ${q.border} ${q.bg} min-w-[75px] flex-1 sm:flex-none transition-all shadow-sm`}>
                                                <span className={`text-[8px] font-semibold ${q.text} mb-0.5 text-center leading-none`}>{q.label}</span>
                                                <span className={`text-xs font-semibold ${q.text} leading-none truncate`}>
                                                  {q.value || 0}{q.max ? `/${q.max}` : ''}
                                                </span>
                                              </div>
                                            ));
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                    {/* Employee Accordion Content */}
                                    {isEmpExpanded && (
                                      <div className="bg-white">
                                        {/* Desktop Table */}
                                        <div className="hidden lg:block overflow-x-auto">
                                          <table className="min-w-full divide-y divide-gray-100">
                                            <thead className="bg-gray-50/50">
                                              <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại đơn & Lý do</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chi tiết</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest">Thao tác</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                              {items.map((item) => {
                                                const itemKey = `${item._itemType}-${item.id}`;
                                                const itemTypeConfig = getItemTypeConfig(item);
                                                return (
                                                  <tr key={itemKey} className="group hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                      <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${itemTypeConfig.tableCls}`}>
                                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={itemTypeConfig.iconPath} /></svg>
                                                        </div>
                                                        <div>
                                                          <div className="text-sm font-medium text-gray-900">{getRequestTypeLabel(item)}</div>
                                                          <div className="text-xs text-gray-400 italic line-clamp-1 max-w-[200px]">{cleanReasonText(item.reason || item.work_plan || '', getRequestTypeLabel(item))}</div>
                                                        </div>
                                                      </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                      <div className="text-sm font-semibold text-gray-700">
                                                        {getDayOfWeek(item.attendance_date || item.registration_date || item.work_date || item.start_date || item.date)}, {formatDate(item.attendance_date || item.registration_date || item.work_date || item.start_date || item.date)}
                                                      </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                      <div className="flex flex-col gap-1">
                                                        {item.late_minutes > 0 && (
                                                          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 w-fit">Muộn {item.late_minutes} phút</span>
                                                        )}
                                                        {item.early_leave_minutes > 0 && (
                                                          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 w-fit">Về sớm {item.early_leave_minutes} phút</span>
                                                        )}
                                                        {item.penalty_amount > 0 && (
                                                          <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 w-fit">-{(item.penalty_amount).toLocaleString('vi-VN')} VNĐ</span>
                                                        )}
                                                        {item._itemType === 'REGISTRATION' && calculateDuration(item.start_time, item.end_time) && (
                                                          <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100 w-fit">
                                                            {calculateDuration(item.start_time, item.end_time)}
                                                          </span>
                                                        )}
                                                        {item.explanation_type === 'INCOMPLETE_ATTENDANCE' && (
                                                          (() => {
                                                            const checkIn = item.actual_check_in || item.forgot_checkin_time;
                                                            const checkOut = item.actual_check_out || item.forgot_checkout_time;
                                                            return (
                                                              <>
                                                                {checkIn && (
                                                                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 w-fit">
                                                                    Vào: {checkIn}
                                                                  </span>
                                                                )}
                                                                {checkOut && (
                                                                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 w-fit">
                                                                    Ra: {checkOut}
                                                                  </span>
                                                                )}
                                                              </>
                                                            );
                                                          })()
                                                        )}
                                                      </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                      <div className="flex flex-col items-center gap-2">
                                                        <div className="flex items-center justify-center gap-2">
                                                          {activeTab === 'pending' && canApproveRequest(item) && (
                                                            <div className="flex items-center gap-2 mr-2">
                                                              <button
                                                                onClick={() => openApproveModal(item)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-md border border-emerald-200 transition-colors"
                                                                title="Phê duyệt yêu cầu"
                                                              >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                <span className="text-xs font-semibold uppercase tracking-wider">Phê duyệt</span>
                                                              </button>
                                                              <button
                                                                onClick={() => openRejectModal(item)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-md border border-red-200 transition-colors"
                                                                title="Từ chối yêu cầu"
                                                              >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                <span className="text-xs font-semibold uppercase tracking-wider">Từ chối</span>
                                                              </button>
                                                            </div>
                                                          )}

                                                          <button
                                                            onClick={() => (item._itemType === 'ONLINE_WORK' || item._itemType === 'REGISTRATION' || item._itemType === 'OVERTIME') ? handleViewOnlineWorkDetails(item) : handleViewDetails(item)}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-white hover:bg-primary-600 rounded-md text-xs font-medium transition-colors"
                                                          >
                                                            <span>Chi tiết</span>
                                                            <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                                          </button>

                                                          {canDeleteRequest(item) && (
                                                            <button
                                                              onClick={() => openDeleteModal(item)}
                                                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                              title="Xóa đơn"
                                                            >
                                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                              </svg>
                                                            </button>
                                                          )}
                                                        </div>

                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded border border-gray-200 text-xs text-gray-400">
                                                          Gửi lúc: <span className="text-gray-600">{formatTimeOnly(item.created_at)}</span> • {formatDate(item.created_at)}
                                                        </div>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                              {(() => {
                                                const totalPenalty = items.reduce((sum, i) => sum + (i.penalty_amount || 0), 0);
                                                if (totalPenalty === 0) return null;
                                                return (
                                                  <tr className="bg-rose-50/30 border-t-2 border-rose-100/50">
                                                    <td colSpan={5} className="px-6 py-5 text-center">
                                                      <div className="flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all duration-300">
                                                        <span className="text-xs font-semibold text-rose-400 uppercase tracking-widest">TỔNG CỘNG TIỀN PHẠT</span>
                                                        <div className="inline-flex items-center gap-2 px-8 py-2.5 bg-rose-600 shadow-xl shadow-rose-200 rounded-lg transform hover:scale-105 transition-transform duration-300">
                                                          <span className="text-2xl font-semibold text-white tracking-tighter drop-shadow-sm">
                                                            {totalPenalty.toLocaleString('vi-VN')} VNĐ
                                                          </span>
                                                        </div>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                );
                                              })()}
                                            </tbody>
                                          </table>
                                        </div>

                                        {/* Mobile Cards */}
                                        <div className="lg:hidden p-4 space-y-4 bg-gray-50/50">
                                          {items.map((item) => {
                                            const itemKey = `${item._itemType}-${item.id}`;
                                            const itemTypeConfig = getItemTypeConfig(item);
                                            return (
                                              <div key={itemKey} className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm transition-colors">
                                                <div className="flex justify-between items-start mb-4 gap-2">
                                                  <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`p-2.5 rounded-lg shadow-md ${itemTypeConfig.mobileBg} text-white shrink-0`}>
                                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={itemTypeConfig.iconPath} /></svg>
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                      <h3 className="text-[14px] font-semibold text-gray-900 leading-tight mb-0.5 truncate">{item.employee_name}</h3>
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100 shrink-0">{item.employee_position || item.position_name || 'NV'}</span>
                                                        <span className="w-1 h-1 rounded-full bg-gray-200 shrink-0"></span>
                                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest truncate">{getRequestTypeLabel(item)}</h4>
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="shrink-0 pt-1">
                                                    {getStatusBadge(item, true)}
                                                  </div>
                                                </div>

                                                {/* Reason Box - Thiết kế hiện đại & nổi bật */}
                                                <div className="relative p-4 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                                                  <div className="absolute top-0 left-0 w-1 h-full bg-primary-500/20"></div>
                                                  <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1 min-w-0">
                                                      <div className="text-[12px] font-bold text-gray-700 leading-relaxed italic line-clamp-2">
                                                        "{cleanReasonText(item.reason || item.work_plan || '', getRequestTypeLabel(item))}"
                                                      </div>
                                                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                        <span className="px-2 py-0.5 bg-white text-gray-400 text-xs font-semibold rounded-lg border border-gray-100 uppercase tracking-tighter">
                                                          {getDayOfWeek(item.attendance_date || item.registration_date || item.work_date || item.start_date || item.date)}, {formatDate(item.attendance_date || item.registration_date || item.work_date || item.start_date || item.date)}
                                                        </span>
                                                        {item.late_minutes > 0 && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-medium rounded border border-amber-100">Muộn {item.late_minutes}m</span>}
                                                        {item.early_leave_minutes > 0 && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-medium rounded border border-amber-100">Về sớm {item.early_leave_minutes}m</span>}
                                                        {item.explanation_type === 'INCOMPLETE_ATTENDANCE' && (item.actual_check_in || item.forgot_checkin_time) && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-medium rounded border border-amber-100">Vào: {(item.actual_check_in || item.forgot_checkin_time)?.substring(0, 5)}</span>}
                                                        {item.explanation_type === 'INCOMPLETE_ATTENDANCE' && (item.actual_check_out || item.forgot_checkout_time) && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-medium rounded border border-amber-100">Ra: {(item.actual_check_out || item.forgot_checkout_time)?.substring(0, 5)}</span>}
                                                      </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                      {item.penalty_amount > 0 && (
                                                        <div className="px-3 py-1 bg-rose-500 text-white rounded-lg shadow-sm">
                                                          <span className="text-xs font-semibold">-{item.penalty_amount.toLocaleString('vi-VN')}</span>
                                                        </div>
                                                      )}
                                                      {item._itemType === 'REGISTRATION' && calculateDuration(item.start_time, item.end_time) && (
                                                        <div className="px-2.5 py-1 bg-primary-100 text-primary-700 rounded-lg border border-primary-200">
                                                          <span className="text-xs font-semibold">{calculateDuration(item.start_time, item.end_time)}</span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Tiến độ duyệt (mobile) — dùng chung getStatusBadge với
                                                    desktop. Bản viết tay cũ đọc thẳng
                                                    direct_manager_approved/hr_approved mà KHÔNG xét
                                                    status==='APPROVED', nên đơn đã duyệt xong vẫn hiện
                                                    "1  2" xám như chưa ai duyệt; gạch nối cũng nằm ngoài
                                                    điều kiện employee_is_hr nên bị thừa 1 gạch cụt. */}
                                                <div className="mt-3 px-3 py-2.5 bg-primary-50/30 rounded-lg border border-primary-100/50 flex items-center justify-between">
                                                  <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-400"></div>
                                                    <span className="text-xs font-semibold text-primary-400 uppercase tracking-widest">Tiến độ</span>
                                                  </div>
                                                  {getStatusBadge(item, false, 'stepper')}
                                                </div>
                                                <div className="mt-4 space-y-2">
                                                  {( (activeTab === 'pending' && canApproveRequest(item)) || canDeleteRequest(item) ) && (
                                                    <div className="flex gap-2">
                                                      {activeTab === 'pending' && canApproveRequest(item) && (
                                                        <>
                                                          <button onClick={() => openApproveModal(item)} className="flex-[2] py-3 bg-emerald-600 text-white rounded-md transition-colors flex items-center justify-center gap-2" title="Phê duyệt nhanh">
                                                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                            <span className="text-xs font-semibold uppercase tracking-wider">Phê duyệt</span>
                                                          </button>
                                                          <button onClick={() => openRejectModal(item)} className="flex-[2] py-3 bg-red-600 text-white rounded-md transition-colors flex items-center justify-center gap-2" title="Từ chối nhanh">
                                                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            <span className="text-xs font-semibold uppercase tracking-wider">Từ chối</span>
                                                          </button>
                                                        </>
                                                      )}
                                                      {canDeleteRequest(item) && (
                                                        <button
                                                          onClick={() => openDeleteModal(item)}
                                                          className="flex-1 py-3.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg active:scale-95 transition-all outline-none flex items-center justify-center gap-2"
                                                          title="Xóa đơn"
                                                        >
                                                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                          </svg>
                                                          <span className="text-xs font-semibold uppercase tracking-tight">Xóa đơn</span>
                                                        </button>
                                                      )}
                                                    </div>
                                                  )}
                                                  <button onClick={() => (item._itemType === 'ONLINE_WORK' || item._itemType === 'REGISTRATION' || item._itemType === 'OVERTIME') ? handleViewOnlineWorkDetails(item) : handleViewDetails(item)} className="w-full py-3 bg-gray-800 text-white rounded-md text-xs font-medium transition-colors">Chi tiết</button>
                                                  
                                                  <div className="flex items-center justify-center gap-2 py-2 bg-gray-50 rounded-lg border border-dashed border-gray-200 mt-3">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">
                                                      Gửi lúc: <span className="text-gray-600 font-semibold">{formatTimeOnly(item.created_at)}</span> • {formatDate(item.created_at)}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                          {(() => {
                                            const totalPenalty = items.reduce((sum, i) => sum + (i.penalty_amount || 0), 0);
                                            if (totalPenalty === 0) return null;
                                            return (
                                              <div className="p-5 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg shadow-xl shadow-rose-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                <div className="flex flex-col items-center text-center gap-2">
                                                  <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-white mt-1 uppercase tracking-tight">
                                                      Tổng cộng tiền phạt
                                                    </span>
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="text-2xl font-semibold text-white tracking-tighter drop-shadow-md">
                                                      {totalPenalty.toLocaleString('vi-VN')} <span className="text-xs text-rose-100 ml-0.5">VNĐ</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                        {/* 
                                          QUY TẮC HIỂN THỊ: 
                                          - Duyệt nhanh tất cả đơn (cấp nhân viên): CHỈ dành cho Admin và Nhân sự (HR).
                                          - Quản lý (Manager) thông thường KHÔNG được sử dụng nút này để buộc phải xem chi tiết hoặc duyệt theo nhóm lớn hơn.
                                        */}
                                        {hasBulkApprovePermission && activeTab === 'pending' && pendingInEmp > 0 && (
                                          <div className="p-4 flex justify-end bg-gray-50/30 border-t border-gray-50">
                                            <button
                                              disabled={isBulkProcessing}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleBulkApproveItems(items, `nhân viên ${empName}`);
                                              }}
                                              className="flex items-center gap-2 h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-100 transition-all uppercase tracking-wider disabled:opacity-50"
                                            >

                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                              Duyệt nhanh tất cả đơn
                                            </button>
                                          </div>
                                        )}

                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            };

            // Tách 2 dải rõ ràng khi người xem có cả 2 loại quyền cùng lúc
            // (vừa là QLTT trực tiếp của 1 số nhân viên, vừa có quyền HR/Admin
            // nên thấy thêm đơn cấp 2 của nhân viên KHÁC) — tránh loạn giữa 2
            // loại đơn khác bản chất hành động cần làm.
            if (approvalLevelSplit) {
              const { level1Groups, level2Groups, level1Count, level2Count } = approvalLevelSplit;
              // Đơn ĐÃ qua QLTT mới là việc của HCNS nên đưa lên TRƯỚC; đơn
              // đang chờ QLTT duyệt (HCNS chưa làm gì được) xuống dưới và THU
              // GỌN sẵn. Đặt tên theo việc-cần-làm thay vì "Cấp 1/Cấp 2" (ngôn
              // ngữ quy trình, người dùng phải tự dịch). Dải này chỉ HCNS/Admin
              // thấy — với QLTT approvalLevelSplit luôn null.
              return (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg uppercase tracking-wide shadow-sm shrink-0">
                      Cần bạn duyệt · đã qua quản lý trực tiếp
                    </span>
                    <span className="text-xs text-gray-400 font-semibold shrink-0">{level2Count} đơn</span>
                    <span className="h-[1px] flex-1 bg-gray-200"></span>
                  </div>
                  {Object.entries(level2Groups).map(renderDeptCard('L2'))}

                  <div className="flex items-center gap-3 mb-3 mt-8">
                    <button
                      onClick={() => setShowWaitingManagerSection(v => !v)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-gray-500 border border-gray-200 text-xs font-bold rounded-lg uppercase tracking-wide hover:text-gray-700 hover:border-gray-300 transition-colors shrink-0"
                      title="Các đơn này đang chờ quản lý trực tiếp duyệt bước 1 — bạn chưa cần làm gì"
                    >
                      <svg className={`w-3.5 h-3.5 transition-transform ${showWaitingManagerSection ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                      Đang chờ quản lý trực tiếp
                    </button>
                    <span className="text-xs text-gray-400 font-semibold shrink-0">{level1Count} đơn</span>
                    <span className="h-[1px] flex-1 bg-gray-200"></span>
                  </div>
                  {showWaitingManagerSection && Object.entries(level1Groups).map(renderDeptCard('L1'))}
                </>
              );
            }

            return deptEntries.map(renderDeptCard(''));
          })()
          }
        </div>

        </>
        )}

        {/* Khu vực BẢNG CÔNG THÁNG (trước đây là panel chèn dưới danh sách
            tab Chờ duyệt) — đã tách sang components/approvals/WorkFinalizationApprovalPanel.
            Khối tĩnh "Quy trình & Quyền hạn của bạn" (nội dung viết cứng + nút
            "CẤU HÌNH QUY TRÌNH" không có onClick) đã bỏ. */}
        {activeSection === 'work_finalization' && (
          <WorkFinalizationApprovalPanel
            loading={loading}
            showWorkFinalizationPanel={showWorkFinalizationPanel}
            isAdmin={isAdmin}
            isManagement={isManagement}
            workFinalizationApprovals={workFinalizationApprovals}
            openApproveModal={openApproveModal}
            openRejectModal={openRejectModal}
            handleViewDetails={handleViewDetails}
            handleViewOnlineWorkDetails={handleViewOnlineWorkDetails}
            handleViewWfDetails={handleViewWfDetails}
            formatDateTime={formatDateTime}
            getDayOfWeek={getDayOfWeek}
          />
        )}

      </div>

      {/* Modal Chi tiết Chốt công (Danh sách nhân viên) */}
      {showWfDetailModal && selectedWfApproval && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-lg shadow-lg max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-semibold text-gray-800 uppercase tracking-tight line-clamp-2">Chi tiết bảng công {selectedWfApproval.department_name || selectedWfApproval.department_code}</h3>
                  <p className="text-xs text-gray-400 font-bold">Tháng {selectedWfApproval.month}/{selectedWfApproval.year} • {wfEmployees.length} nhân sự</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowWfDetailModal(false);
                  setSelectedWfApproval(null);
                  setWfEmployees([]);
                }}
                className="absolute sm:relative top-4 right-4 sm:top-auto sm:right-auto text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 font-semibold text-xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Body - Responsive Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-gray-50/30">
              <div className="bg-white border border-gray-200 rounded-lg sm:rounded-3xl overflow-hidden shadow-sm">

                {/* Desktop View (Table) */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest">Nhân viên</th>
                        <th className="px-3 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest">Công thực tế</th>
                        <th className="px-3 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest">Tăng ca</th>
                        <th className="px-3 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest">Làm thêm giờ</th>
                        <th className="px-3 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest">Trực tối</th>
                        <th className="px-3 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest">Live</th>
                        <th className="px-3 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest">Nghỉ phép tháng</th>
                        <th className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-widest">Tổng phạt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {wfEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-10 text-center text-gray-400 italic">Không tìm thấy dữ liệu nhân viên</td>
                        </tr>
                      ) : (
                        wfEmployees.map((emp) => (
                          <tr key={`wf-emp-${emp.employee_id}`} className="hover:bg-gray-50/50 group">
                            <td className="px-5 py-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-semibold text-gray-800 tracking-tight group-hover:text-primary-600">{emp.ho_va_ten}</span>
                                  {emp.is_locked && (
                                    <div className="bg-amber-100 text-amber-600 p-0.5 rounded shadow-sm" title="Dữ liệu đã khóa">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs font-bold text-gray-400 mt-0.5">{emp.ma_nv} • {emp.vi_tri || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="px-3 py-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-lg">{emp.cong_thuc_te}</span>
                                <span className="text-xs font-bold text-gray-400 mt-1">Tổng: {emp.tong_cong}</span>
                              </div>
                            </td>
                            <td className="px-3 py-4 text-center">
                              {emp.tang_ca > 0 ? (
                                <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">{emp.tang_ca}h</span>
                              ) : (
                                <span className="text-xs text-gray-300">-</span>
                              )}
                            </td>
                            <td className="px-3 py-4 text-center">
                              {emp.lam_them_gio > 0 ? (
                                <span className="text-sm font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-lg">{emp.lam_them_gio}h</span>
                              ) : (
                                <span className="text-xs text-gray-300">-</span>
                              )}
                            </td>
                            <td className="px-3 py-4 text-center">
                              {emp.truc_toi > 0 ? (
                                <span className="text-sm font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg">{emp.truc_toi}</span>
                              ) : (
                                <span className="text-xs text-gray-300">-</span>
                              )}
                            </td>
                            <td className="px-3 py-4 text-center">
                              {emp.live > 0 ? (
                                <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{emp.live}</span>
                              ) : (
                                <span className="text-xs text-gray-300">-</span>
                              )}
                            </td>
                            <td className="px-3 py-4 text-center text-sm font-bold text-gray-500">{emp.nghi_phep_thang > 0 ? emp.nghi_phep_thang : '-'}</td>
                            <td className="px-5 py-4 text-right">
                              <span className="text-sm font-semibold text-rose-600">{(emp.tong_phat || 0) > 0 ? `${(emp.tong_phat || 0).toLocaleString('vi-VN')} VNĐ` : '-'}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet View (Cards) */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {wfEmployees.length === 0 ? (
                    <div className="px-6 py-10 text-center text-gray-400 italic">Không tìm thấy dữ liệu nhân viên</div>
                  ) : (
                    wfEmployees.map((emp) => (
                      <div key={`wf-emp-mobile-${emp.employee_id}`} className="p-4 sm:p-6 space-y-5 bg-white">
                        {/* Header: Name & Info */}
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-800 tracking-tight truncate">{emp.ho_va_ten}</span>
                              {emp.is_locked && (
                                <div className="bg-amber-100 text-amber-600 p-0.5 rounded shadow-sm shrink-0">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter mt-1">{emp.ma_nv} • {emp.vi_tri || 'N/A'}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-semibold text-rose-600 uppercase block mb-1">Tổng phạt</span>
                            <span className="text-sm font-semibold text-rose-600">{(emp.tong_phat || 0) > 0 ? `${(emp.tong_phat || 0).toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}</span>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 xs:grid-cols-3 gap-3">
                          <div className="bg-primary-50/50 p-2.5 rounded-lg border border-primary-100/50">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">Công thực tế</span>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base font-semibold text-primary-600">{emp.cong_thuc_te}</span>
                              <span className="text-xs font-bold text-gray-400">/ {emp.tong_cong}</span>
                            </div>
                          </div>
                          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">Tăng ca</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-amber-600">{emp.tang_ca}h</span>
                            </div>
                          </div>
                          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">Trực tối/Live</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-violet-600">{emp.truc_toi}</span>
                              <span className="text-gray-300">|</span>
                              <span className="text-xs font-semibold text-emerald-600">{emp.live}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-5 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary-500 shrink-0"></div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest italic leading-tight">Toàn bộ dữ liệu đã được đối soát tự động</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                {selectedWfApproval.status === 'APPROVED' && (
                  <span className="w-full sm:w-auto text-center px-4 py-3 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-lg border border-emerald-100 uppercase tracking-widest">
                    Bảng công đã được phê duyệt
                  </span>
                )}
                {selectedWfApproval.status === 'REJECTED' && (
                  <span className="w-full sm:w-auto text-center px-4 py-3 bg-rose-50 text-rose-600 text-xs font-semibold rounded-lg border border-rose-100 uppercase tracking-widest">
                    Bảng công đã bị từ chối
                  </span>
                )}
                {selectedWfApproval.can_approve && selectedWfApproval.status === 'PENDING' && !isAdmin && (
                  <button
                    onClick={() => {
                      setShowWfDetailModal(false);
                      openApproveModal(selectedWfApproval);
                    }}
                    className="w-full sm:w-auto h-12 px-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-xl shadow-emerald-100 uppercase tracking-widest"
                  >
                    Duyệt bảng công này
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết */}
      {showDetailModal &&
        (selectedExplanation || selectedOnlineWorkRequest) && (
          <div className="fixed inset-0 bg-gray-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 transition-all duration-300">
            <div className="bg-white rounded-t-xl sm:rounded-lg shadow-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              {/* Modal Header - Sticky */}
              <div className="sticky top-0 z-20 px-6 py-4 border-b border-gray-100 bg-white/95 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 leading-none">
                        Thông tin đơn
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-bold text-gray-400">Loại đơn:</span>
                        <span className="text-xs font-semibold text-primary-600">
                          {getRequestTypeLabel(selectedExplanation || selectedOnlineWorkRequest)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedExplanation(null);
                      setSelectedOnlineWorkRequest(null);
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <div className="px-4 sm:px-6 py-4 sm:py-6">
                {/* 1. Kế hoạch / Lý do (Ẩn nếu là Nghỉ phép tháng theo yêu cầu) */}
                {!(selectedExplanation?._itemType === 'LEAVE') && (
                  <div className="mb-6">
                    <div className="bg-primary-50 border-l-4 border-primary-500 p-4 rounded-r-xl shadow-sm">
                      <h4 className="text-sm font-bold text-primary-800 uppercase tracking-wider mb-2">
                        NỘI DUNG
                      </h4>
                      <p className="text-gray-800 font-medium whitespace-pre-wrap text-base leading-relaxed">
                        {selectedExplanation
                          ? cleanReasonText(selectedExplanation.reason, getRequestTypeLabel(selectedExplanation))
                          : (selectedOnlineWorkRequest.work_plan || selectedOnlineWorkRequest.reason || selectedOnlineWorkRequest.note || 'N/A')}
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Grid Thông tin Nhân viên & Chi tiết Đơn */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Cột 1: Profile Card */}
                  <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-shadow">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      Thông tin nhân viên
                    </h4>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="relative group">
                        <div className="h-16 w-16 bg-gradient-to-tr from-primary-500 to-primary-400 rounded-lg flex items-center justify-center text-white text-2xl font-semibold shadow-lg shadow-primary-100 ring-4 ring-white transition-transform group-hover:scale-105 duration-300">
                          {(selectedExplanation ? selectedExplanation.employee_name : selectedOnlineWorkRequest.employee_name)?.charAt(0) || 'U'}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full shadow-sm flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-gray-800 leading-tight tracking-tight">
                          {selectedExplanation ? selectedExplanation.employee_name : selectedOnlineWorkRequest.employee_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100 uppercase tracking-wider">
                            {selectedExplanation ? selectedExplanation.employee_code : selectedOnlineWorkRequest.employee_code}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-50">
                      {/* Department */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors group/item">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover/item:bg-primary-50 group-hover/item:text-primary-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                          </div>
                          <span className="text-sm font-bold text-gray-400 uppercase tracking-tighter">Phòng ban</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">
                          {(selectedExplanation ? (selectedExplanation.employee_department || selectedExplanation.department_name) : selectedOnlineWorkRequest.department_name) || 'N/A'}
                        </span>
                      </div>

                      {/* Position */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors group/item">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover/item:bg-primary-50 group-hover/item:text-primary-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          </div>
                          <span className="text-sm font-bold text-gray-400 uppercase tracking-tighter">Vị trí</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">
                          {(selectedExplanation ? (selectedExplanation.employee_position || selectedExplanation.position_name) : (selectedOnlineWorkRequest.employee_position || selectedOnlineWorkRequest.position_name)) || 'N/A'}
                        </span>
                      </div>

                      {/* Manager */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors group/item">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover/item:bg-emerald-50 group-hover/item:text-emerald-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          </div>
                          <span className="text-sm font-bold text-gray-400 uppercase tracking-tighter">Quản lý duyệt</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">
                          {(selectedExplanation ? (selectedExplanation.employee_manager_name || selectedExplanation.employee_department_manager_name) : (selectedOnlineWorkRequest.employee_manager_name || selectedOnlineWorkRequest.employee_department_manager_name)) || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cột 2: Request Info (Meta Data) */}
                  <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-shadow">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Cụ thể yêu cầu
                    </h4>

                    <div className="space-y-4">
                      {/* Priority Status Section */}
                      <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-100 flex items-center justify-between group/status">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 group-hover/status:text-primary-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-tight">Trạng thái duyệt</span>
                        </div>
                        {getStatusBadge(selectedExplanation || selectedOnlineWorkRequest)}
                      </div>

                      {/* Info List */}
                      <div className="space-y-3 px-1">
                        {/* Request ID */}
                        <div className="flex justify-between items-center py-2.5 border-b border-gray-50 gap-4">
                          <span className="text-sm font-bold text-gray-400 uppercase tracking-tight shrink-0 whitespace-nowrap">Mã định danh đơn</span>
                          <span className="text-xs font-mono font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 whitespace-nowrap">
                            {selectedExplanation?.request_code || selectedOnlineWorkRequest?.request_code || '---'}
                          </span>
                        </div>

                        {selectedExplanation ? (
                          <>
                            {/* Date Detail */}
                            <div className="flex justify-between items-center py-2.5 border-b border-gray-50 gap-4">
                              <span className="text-sm font-bold text-gray-400 uppercase tracking-tight shrink-0 whitespace-nowrap">
                                {selectedExplanation._itemType === 'REGISTRATION' ? 'Ngày đăng ký' :
                                  selectedExplanation._itemType === 'LEAVE' ? 'Thời gian nghỉ' :
                                    'Ngày hiệu lực'}
                              </span>
                              <span className="text-[15px] font-semibold text-gray-700 whitespace-nowrap">
                                {selectedExplanation._itemType === 'LEAVE'
                                  ? (selectedExplanation.start_date === selectedExplanation.end_date
                                    ? formatDate(selectedExplanation.start_date)
                                    : `${formatDate(selectedExplanation.start_date)} - ${formatDate(selectedExplanation.end_date)}`)
                                  : formatDate(selectedExplanation.attendance_date || selectedExplanation.registration_date || selectedExplanation.event_date || selectedExplanation.start_date)}
                              </span>
                            </div>

                            {/* Time Range (if applicable) */}
                            {selectedExplanation._itemType === 'REGISTRATION' && (selectedExplanation.start_time || selectedExplanation.end_time) && (
                              <div className="flex justify-between items-center py-2.5 border-b border-gray-50 gap-4">
                                <span className="text-sm font-bold text-gray-400 uppercase tracking-tight shrink-0 whitespace-nowrap">Khung thời gian</span>
                                <span className="text-sm font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full border border-primary-100 whitespace-nowrap">
                                  {selectedExplanation.start_time?.substring(0, 5) || '??:??'} - {selectedExplanation.end_time?.substring(0, 5) || '??:??'}
                                </span>
                              </div>
                            )}

                            {/* Status Transitions (Attendance only) */}
                            {selectedExplanation._itemType !== 'REGISTRATION' && (
                              <>
                                <div className="flex flex-col gap-3 py-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dữ liệu gốc</span>
                                    <span className="text-sm font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                                      {selectedExplanation.original_status_display || getOriginalStatusText(selectedExplanation.original_status)}
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Kỳ vọng thay đổi</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full shadow-sm">
                                      <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                                      <span className="text-sm font-semibold text-emerald-700">
                                        {selectedExplanation.expected_status_display?.includes('đủ công đúng công') ? 'Tính đủ công' : (selectedExplanation.expected_status_display || getExpectedStatusText(selectedExplanation.expected_status))}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Hiển thị chi tiết vi phạm và phạt nếu có */}
                                {(selectedExplanation.late_minutes > 0 || selectedExplanation.early_leave_minutes > 0 || selectedExplanation.penalty_amount > 0) && (
                                  <div className="mt-4 p-4 rounded-lg bg-rose-50/50 border border-rose-100 shadow-sm relative overflow-hidden group/violation">
                                    {/* Decorative background element */}
                                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-100/30 rounded-full blur-2xl group-hover/violation:bg-rose-100/50 transition-colors duration-500" />

                                    <div className="flex items-center gap-3 mb-4 scale-in-center">
                                      <div className="flex-shrink-0 w-9 h-9 bg-rose-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-rose-200">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                      </div>
                                      <div>
                                        <span className="text-sm font-semibold text-rose-800 uppercase tracking-widest block leading-none">Thông tin vi phạm & Phạt</span>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {/* Thời gian vi phạm card */}
                                      {(selectedExplanation.late_minutes > 0 || selectedExplanation.early_leave_minutes > 0) && (
                                        <div className="bg-white/80 p-3 rounded-lg border border-rose-100/50 shadow-sm hover:shadow-md transition-shadow duration-300">
                                          <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest block mb-3">Thời gian vi phạm</span>
                                          <div className="space-y-2">
                                            {selectedExplanation.late_minutes > 0 && (
                                              <div className="flex justify-between items-center p-2 rounded-lg bg-amber-50/80 border border-amber-100/50 group/item">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-tighter">Đi muộn:</span>
                                                </div>
                                                <div className="flex items-baseline gap-0.5">
                                                  <span className="text-base font-semibold text-amber-600 tracking-tighter">{selectedExplanation.late_minutes}</span>
                                                  <span className="text-xs font-bold text-amber-400 uppercase ml-0.5">phút</span>
                                                </div>
                                              </div>
                                            )}
                                            {selectedExplanation.early_leave_minutes > 0 && (
                                              <div className="flex justify-between items-center p-2 rounded-lg bg-rose-50/80 border border-rose-100/50 group/item">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                                                  <span className="text-xs font-semibold text-rose-700 uppercase tracking-tighter">Về sớm:</span>
                                                </div>
                                                <div className="flex items-baseline gap-0.5">
                                                  <span className="text-base font-semibold text-rose-600 tracking-tighter">{selectedExplanation.early_leave_minutes}</span>
                                                  <span className="text-xs font-bold text-rose-400 uppercase ml-0.5">phút</span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Tiền phạt card */}
                                      {selectedExplanation.penalty_amount > 0 && (
                                        <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-3 rounded-lg shadow-lg shadow-rose-200 flex flex-col justify-between group/total">
                                          <span className="text-xs text-rose-100 font-semibold uppercase tracking-widest block mb-1">Tiền phạt</span>
                                          <div className="flex items-baseline gap-1.5 justify-end">
                                            <span className="text-2xl font-semibold text-white font-mono tracking-tighter drop-shadow-sm">
                                              {(selectedExplanation.penalty_amount || 0).toLocaleString('vi-VN')}
                                            </span>
                                            <span className="text-xs font-semibold text-rose-100 uppercase tracking-tighter">VNĐ</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Hiển thị timeline quên chấm công */}
                                {selectedExplanation.explanation_type === 'INCOMPLETE_ATTENDANCE' && (
                                  <div className="mt-4 p-4 rounded-lg bg-primary-50/50 border border-primary-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                      <div className="flex-shrink-0 w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary-200">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                      </div>
                                      <span className="text-sm font-semibold text-primary-800 uppercase tracking-widest">Timeline chấm công</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      {/* Giờ vào */}
                                      <div className="bg-white/80 p-3 rounded-lg border border-primary-100/50 shadow-sm">
                                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest block mb-1">Giờ vào</span>
                                        <span className="text-lg font-semibold text-amber-600">
                                          {(selectedExplanation.actual_check_in || selectedExplanation.forgot_checkin_time)?.substring(0, 5) || '--:--'}
                                        </span>
                                        {selectedExplanation.forgot_punch_type === 'checkin' || selectedExplanation.forgot_punch_type === 'both' ? (
                                          <span className="block text-xs font-bold text-amber-500 uppercase mt-0.5">NV khai</span>
                                        ) : (
                                          <span className="block text-xs font-bold text-emerald-500 uppercase mt-0.5">Máy chấm</span>
                                        )}
                                      </div>
                                      {/* Giờ ra */}
                                      <div className="bg-white/80 p-3 rounded-lg border border-primary-100/50 shadow-sm">
                                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest block mb-1">Giờ ra</span>
                                        <span className="text-lg font-semibold text-amber-600">
                                          {(selectedExplanation.actual_check_out || selectedExplanation.forgot_checkout_time)?.substring(0, 5) || '--:--'}
                                        </span>
                                        {selectedExplanation.forgot_punch_type === 'checkout' || selectedExplanation.forgot_punch_type === 'both' ? (
                                          <span className="block text-xs font-bold text-amber-500 uppercase mt-0.5">NV khai</span>
                                        ) : (
                                          <span className="block text-xs font-bold text-emerald-500 uppercase mt-0.5">Máy chấm</span>
                                        )}
                                      </div>
                                      {/* Tổng giờ */}
                                      {(() => {
                                        const ci = (selectedExplanation.actual_check_in || selectedExplanation.forgot_checkin_time)?.substring(0, 5);
                                        const co = (selectedExplanation.actual_check_out || selectedExplanation.forgot_checkout_time)?.substring(0, 5);
                                        if (ci && co) {
                                          const [h1, m1] = ci.split(':').map(Number);
                                          const [h2, m2] = co.split(':').map(Number);
                                          const hours = ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
                                          return (
                                            <div className={`p-3 rounded-lg border shadow-sm ${hours >= 5.5 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                              <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest block mb-1">Tổng giờ</span>
                                              <span className={`text-lg font-semibold ${hours >= 5.5 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {hours.toFixed(1)}h
                                              </span>
                                              <span className={`block text-xs font-bold uppercase mt-0.5 ${hours >= 5.5 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {hours >= 5.5 ? '→ 1.0 công' : '→ 0.5 công'}
                                              </span>
                                            </div>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          /* Online Work / Registration specifics */
                          <>
                            <div className="flex justify-between items-center py-2.5 border-b border-gray-50">
                              <span className="text-sm font-bold text-gray-400 uppercase tracking-tight shrink-0 whitespace-nowrap">Ngày thực hiện</span>
                              <span className="text-sm font-semibold text-gray-700">
                                {formatDate(selectedOnlineWorkRequest.work_date || selectedOnlineWorkRequest.attendance_date || selectedOnlineWorkRequest.registration_date || selectedOnlineWorkRequest.event_date)}
                              </span>
                            </div>
                            {/* Giờ bắt đầu / Giờ kết thúc / Tổng thời gian — luôn hiện cho REGISTRATION */}
                            {(selectedOnlineWorkRequest._itemType === 'REGISTRATION' || selectedOnlineWorkRequest._itemType === 'OVERTIME') && (
                              <>
                                <div className="flex justify-between items-center py-2.5 border-b border-gray-50 gap-4">
                                  <span className="text-sm font-bold text-gray-400 uppercase tracking-tight shrink-0 whitespace-nowrap">Giờ bắt đầu</span>
                                  <span className="text-sm font-semibold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 whitespace-nowrap">
                                    {selectedOnlineWorkRequest.start_time?.substring(0, 5) || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-2.5 border-b border-gray-50 gap-4">
                                  <span className="text-sm font-bold text-gray-400 uppercase tracking-tight shrink-0 whitespace-nowrap">Giờ kết thúc</span>
                                  <span className="text-sm font-semibold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 whitespace-nowrap">
                                    {selectedOnlineWorkRequest.end_time?.substring(0, 5) || 'N/A'}
                                  </span>
                                </div>
                                {calculateDuration(selectedOnlineWorkRequest.start_time, selectedOnlineWorkRequest.end_time) && (
                                  <div className="flex justify-between items-center py-2.5 border-b border-gray-50 gap-4">
                                    <span className="text-sm font-bold text-gray-400 uppercase tracking-tight shrink-0 whitespace-nowrap">Tổng thời gian</span>
                                    <span className="text-sm font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full border border-primary-100 whitespace-nowrap">
                                      {calculateDuration(selectedOnlineWorkRequest.start_time, selectedOnlineWorkRequest.end_time)}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}


                          </>
                        )}

                        {/* Common metadata footer */}
                        <div className="flex justify-between items-center pt-2.5 border-t border-gray-100 mt-2">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ngày tạo đơn</span>
                          <span className="text-sm font-bold text-gray-600">
                            {formatDateTime(
                              selectedExplanation
                                ? selectedExplanation.created_at
                                : selectedOnlineWorkRequest.created_at
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>



                {/* Additional Fields for Online Work (Mở rộng) */}
                {!selectedExplanation && selectedOnlineWorkRequest.actual_result && (
                  <div className="mb-6">
                    <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl shadow-sm">
                      <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-2">
                        Kết quả thực tế
                      </h4>
                      <p className="text-gray-800 font-medium whitespace-pre-wrap text-base leading-relaxed">
                        {selectedOnlineWorkRequest.actual_result}
                      </p>
                    </div>
                  </div>
                )}

                {/* Approval Note (Common) */}

                {/* Workflow Timeline */}
                <div className="mt-8">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Quy trình duyệt
                  </h4>
                  <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm ring-1 ring-black/5">
                    <div className="relative border-l-2 border-gray-100 ml-4 space-y-8">
                      {(() => {
                        const workflowSteps = selectedExplanation
                          ? getApprovalWorkflow(selectedExplanation)
                          : getOnlineWorkApprovalWorkflow(selectedOnlineWorkRequest);

                        return workflowSteps.map((step, index) => {
                          const isRejected = step.status.includes('từ chối');
                          const isApproved = step.status.includes('duyệt') && !step.status.includes('Chưa');
                          const isPending = !isRejected && !isApproved;

                          // Determine the node icon and color
                          const nodeColor = isRejected
                            ? 'bg-red-100 text-red-600 border-red-200 shadow-red-100'
                            : isApproved
                              ? 'bg-emerald-100 text-emerald-600 border-emerald-200 shadow-emerald-100'
                              : 'bg-white text-gray-400 border-gray-200 outline-dashed outline-2 outline-gray-300 outline-offset-2';

                          return (
                            <div key={step.step} className="relative pl-8">
                              {/* Timeline Node */}
                              <div className={`absolute -left-[17px] top-1 h-8 w-8 rounded-full border-2 bg-white flex items-center justify-center shadow-sm z-10 ${nodeColor}`}>
                                {isRejected ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                ) : isApproved ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                  <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse"></span>
                                )}
                              </div>

                              {/* Step Content */}
                              <div className={`bg-gray-50/50 p-4 rounded-lg border ${isRejected ? 'border-red-100/60' : isApproved ? 'border-emerald-100/60' : 'border-gray-100 opacity-80'}`}>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                  <div>
                                    <p className="text-base font-bold text-gray-900 flex items-center">
                                      {step.role}
                                      {/* Mini Badge */}
                                      <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isRejected ? 'bg-red-100 text-red-700' :
                                        isApproved ? 'bg-emerald-100 text-emerald-700' :
                                          'bg-amber-100 text-amber-700'
                                        }`}
                                      >
                                        {step.status}
                                      </span>
                                    </p>
                                    <p className="text-base text-gray-600 mt-1">
                                      <span className="text-gray-400 mr-1">{isRejected ? 'Người từ chối:' : 'Người duyệt:'}</span>
                                      <span className="font-medium text-gray-700">{step.approver}</span>
                                    </p>
                                  </div>

                                  {step.date && (
                                    <div className="text-left sm:text-right bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Thời gian</p>
                                      <p className="text-base font-semibold text-gray-800">{formatDateTime(step.date)}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer / Actions */}
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-wrap sm:flex-nowrap justify-end gap-3 rounded-b-lg">
                <div className="mr-auto w-full sm:w-auto mb-2 sm:mb-0 order-last sm:order-first">
                  {((selectedExplanation && canDeleteRequest(selectedExplanation)) || (selectedOnlineWorkRequest && canDeleteRequest(selectedOnlineWorkRequest))) && (
                    <button
                      onClick={() => {
                        openDeleteModal(selectedExplanation || selectedOnlineWorkRequest);
                        setShowDetailModal(false);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg sm:rounded-md hover:bg-red-100 transition-colors font-semibold"
                    >
                      Xoá đơn
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedExplanation(null);
                    setSelectedOnlineWorkRequest(null);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg sm:rounded-md hover:bg-gray-50 transition-colors order-1"
                >
                  Đóng
                </button>
                {activeTab === 'pending' && (
                  <>
                    {selectedExplanation &&
                      canApproveExplanation(selectedExplanation) && (
                        <>
                          <button
                            onClick={() => {
                              openApproveModal(selectedExplanation);
                              setShowDetailModal(false);
                            }}
                            className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-emerald-600 text-white font-semibold rounded-lg sm:rounded-md hover:bg-emerald-700 transition-colors order-3"
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() => {
                              openRejectModal(selectedExplanation);
                              setShowDetailModal(false);
                            }}
                            className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-red-600 text-white font-semibold rounded-lg sm:rounded-md hover:bg-red-700 transition-colors order-2"
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                    {selectedOnlineWorkRequest &&
                      canApproveRequest(selectedOnlineWorkRequest) && (
                        <>
                          <button
                            onClick={() => {
                              openApproveModal(selectedOnlineWorkRequest);
                              setShowDetailModal(false);
                            }}
                            className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-emerald-600 text-white font-semibold rounded-lg sm:rounded-md hover:bg-emerald-700 transition-colors order-3"
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() => {
                              openRejectModal(selectedOnlineWorkRequest);
                              setShowDetailModal(false);
                            }}
                            className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-red-600 text-white font-semibold rounded-lg sm:rounded-md hover:bg-red-700 transition-colors order-2"
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      {/* 5 modal thao tác (duyệt/từ chối, xoá đơn, lỗi, duyệt hàng loạt +
          kết quả) — đã tách sang components/approvals/ApprovalActionModals */}
      <ApprovalActionModals
        actionModalOpen={actionModalOpen}
        setActionModalOpen={setActionModalOpen}
        actionType={actionType}
        targetItem={targetItem}
        approvalNote={approvalNote}
        setApprovalNote={setApprovalNote}
        selectedCredit={selectedCredit}
        setSelectedCredit={setSelectedCredit}
        isProcessing={isProcessing}
        confirmAction={confirmAction}
        deleteModalOpen={deleteModalOpen}
        setDeleteModalOpen={setDeleteModalOpen}
        confirmDelete={confirmDelete}
        currentEmployee={currentEmployee}
        errorModalOpen={errorModalOpen}
        setErrorModalOpen={setErrorModalOpen}
        errorMessage={errorMessage}
        bulkConfirmModal={bulkConfirmModal}
        setBulkConfirmModal={setBulkConfirmModal}
        executeBulkApprove={executeBulkApprove}
        bulkActionResult={bulkActionResult}
        setBulkActionResult={setBulkActionResult}
        formatDate={formatDate}
        getRequestTypeLabel={getRequestTypeLabel}
      />

      {/* Employee Attendance Calendar Modal */}
      {calendarModalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Lịch công của {calendarModalEmployee.name}</h2>
                  <p className="text-xs text-gray-400 font-semibold">Tháng {calendarModalEmployee.month}/{calendarModalEmployee.year}</p>
                </div>
              </div>
              <button
                onClick={() => setCalendarModalEmployee(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <AttendanceCalendar
                year={calendarModalEmployee.year}
                month={calendarModalEmployee.month - 1}
                employeeId={calendarModalEmployee.id}
                showInternalDialog={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;
