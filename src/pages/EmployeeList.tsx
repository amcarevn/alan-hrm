import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesAPI, departmentsAPI, Employee, sendAccountEmailsAPI, managementApi } from '../utils/api';
import { WORK_LOCATION_OPTIONS } from '../constants/onboarding';

const WORK_LOCATION_LABELS: Record<string, string> = Object.fromEntries(
  WORK_LOCATION_OPTIONS.map(o => [o.value, o.label])
);
import { useAuth } from '../contexts/AuthContext';
import { SelectBox } from '../components/LandingLayout/SelectBox';
import Pagination from '../components/Pagination';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { UsersIcon } from '@heroicons/react/24/outline';

const getExportStatusLabel = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'Đang làm việc';
    case 'INACTIVE': return 'Đã nghỉ';
    case 'PROBATION': return 'Thử việc';
    case 'PAUSED': return 'Tạm dừng';
    case 'MATERNITY_LEAVE': return 'Nghỉ thai sản';
    default: return status;
  }
};

const getExportGenderLabel = (gender: string) => {
  switch (gender) {
    case 'M': return 'Nam';
    case 'F': return 'Nữ';
    case 'O': return 'Khác';
    default: return gender;
  }
};

const getExportProbationRateLabel = (rate: string) => {
  switch (rate) {
    case 'OPTION_1': return 'Tháng đầu 85%, tháng sau 85%';
    case 'OPTION_2': return 'Tháng đầu 85%, tháng sau 100%';
    case 'OPTION_3': return 'Tháng đầu 100%, tháng sau 100%';
    default: return rate;
  }
};

// Nguồn dùng chung cho "Xuất toàn bộ" (mọi cột) và "Xuất tùy chọn" (HR tự chọn cột).
// Thêm/bớt cột chỉ cần sửa ở đây, cả hai nút xuất đều tự động theo.
type ExportFieldDef = {
  key: string;
  header: string;
  width: number;
  group: string;
  getValue: (emp: Employee) => string | number;
};

const EXPORT_FIELD_GROUPS = [
  'Thông tin cơ bản',
  'CCCD / VNEID',
  'Tổ chức',
  'Quản lý',
  'Hợp đồng & trạng thái',
  'Hồ sơ',
  'Lương & ngân hàng',
  'BHXH & thuế',
  'Nghỉ phép',
  'Người liên hệ khẩn cấp',
  'Khác',
];

const EXPORT_FIELD_DEFS: ExportFieldDef[] = [
  // Thông tin cơ bản
  { key: 'employee_id', header: 'Mã NV', width: 12, group: 'Thông tin cơ bản', getValue: (emp) => emp.employee_id },
  { key: 'full_name', header: 'Họ tên', width: 25, group: 'Thông tin cơ bản', getValue: (emp) => emp.full_name },
  { key: 'gender', header: 'Giới tính', width: 10, group: 'Thông tin cơ bản', getValue: (emp) => getExportGenderLabel(emp.gender) },
  { key: 'date_of_birth', header: 'Ngày sinh', width: 14, group: 'Thông tin cơ bản', getValue: (emp) => emp.date_of_birth || '' },
  { key: 'phone_number', header: 'Số điện thoại', width: 15, group: 'Thông tin cơ bản', getValue: (emp) => emp.phone_number || '' },
  { key: 'personal_email', header: 'Email', width: 28, group: 'Thông tin cơ bản', getValue: (emp) => emp.personal_email || '' },
  { key: 'facebook_link', header: 'Facebook', width: 28, group: 'Thông tin cơ bản', getValue: (emp) => emp.facebook_link || '' },
  // CCCD / VNEID
  { key: 'cccd_number', header: 'Số CCCD', width: 16, group: 'CCCD / VNEID', getValue: (emp) => emp.cccd_number || '' },
  { key: 'old_id_number', header: 'Số CMND cũ', width: 14, group: 'CCCD / VNEID', getValue: (emp) => emp.old_id_number || '' },
  { key: 'cccd_issue_date', header: 'Ngày cấp CCCD', width: 16, group: 'CCCD / VNEID', getValue: (emp) => emp.cccd_issue_date || '' },
  { key: 'cccd_issue_place', header: 'Nơi cấp CCCD', width: 20, group: 'CCCD / VNEID', getValue: (emp) => emp.cccd_issue_place || '' },
  { key: 'link_cccd', header: 'Link CCCD/CMT', width: 28, group: 'CCCD / VNEID', getValue: (emp) => (emp as any).link_cccd || '' },
  { key: 'birth_place', header: 'Quê quán', width: 20, group: 'CCCD / VNEID', getValue: (emp) => emp.birth_place || '' },
  { key: 'permanent_residence', header: 'Hộ khẩu thường trú', width: 30, group: 'CCCD / VNEID', getValue: (emp) => emp.permanent_residence || '' },
  { key: 'current_address', header: 'Địa chỉ hiện tại', width: 30, group: 'CCCD / VNEID', getValue: (emp) => emp.current_address || '' },
  { key: 'marital_status', header: 'Tình trạng hôn nhân', width: 20, group: 'CCCD / VNEID', getValue: (emp) => emp.marital_status || '' },
  { key: 'ethnicity', header: 'Dân tộc', width: 14, group: 'CCCD / VNEID', getValue: (emp) => emp.ethnicity || '' },
  { key: 'nationality', header: 'Quốc tịch', width: 14, group: 'CCCD / VNEID', getValue: (emp) => emp.nationality || '' },
  // Tổ chức
  { key: 'department', header: 'Phòng ban', width: 20, group: 'Tổ chức', getValue: (emp) => emp.department?.name || '' },
  { key: 'position', header: 'Chức vụ', width: 20, group: 'Tổ chức', getValue: (emp) => emp.position?.title || '' },
  { key: 'region', header: 'Vùng/Miền', width: 14, group: 'Tổ chức', getValue: (emp) => emp.region || '' },
  { key: 'block', header: 'Khối', width: 14, group: 'Tổ chức', getValue: (emp) => emp.block || '' },
  { key: 'section', header: 'Bộ phận', width: 16, group: 'Tổ chức', getValue: (emp) => emp.section || '' },
  { key: 'rank', header: 'Cấp bậc', width: 14, group: 'Tổ chức', getValue: (emp) => emp.rank || '' },
  { key: 'work_location', header: 'Địa điểm làm việc', width: 20, group: 'Tổ chức', getValue: (emp) => emp.work_location ? (WORK_LOCATION_LABELS[emp.work_location] || emp.work_location) : '' },
  { key: 'doctor_team', header: 'Team Bác sĩ', width: 16, group: 'Tổ chức', getValue: (emp) => emp.doctor_team || '' },
  { key: 'work_form', header: 'Hình thức làm việc', width: 20, group: 'Tổ chức', getValue: (emp) => emp.work_form || '' },
  {
    key: 'work_type', header: 'Loại hình làm việc', width: 18, group: 'Tổ chức', getValue: (emp) => {
      try {
        const ei = typeof (emp as any).extra_info === 'string'
          ? JSON.parse((emp as any).extra_info || '{}')
          : ((emp as any).extra_info || {});
        return ei?.work_type || '';
      } catch { return ''; }
    },
  },
  { key: 'education_level', header: 'Trình độ học vấn', width: 18, group: 'Tổ chức', getValue: (emp) => emp.education_level || '' },
  // Quản lý
  { key: 'manager', header: 'Quản lý trực tiếp', width: 22, group: 'Quản lý', getValue: (emp) => emp.manager?.full_name || emp.manager_name || '' },
  { key: 'manager_level_2', header: 'Quản lý cấp 2', width: 22, group: 'Quản lý', getValue: (emp) => emp.manager_level_2?.full_name || '' },
  { key: 'manager_level_3', header: 'Quản lý cấp 3', width: 22, group: 'Quản lý', getValue: (emp) => emp.manager_level_3?.full_name || '' },
  // Hợp đồng & trạng thái
  { key: 'employment_status', header: 'Trạng thái', width: 16, group: 'Hợp đồng & trạng thái', getValue: (emp) => getExportStatusLabel(emp.employment_status) },
  { key: 'employment_status_notes', header: 'Ghi chú trạng thái', width: 24, group: 'Hợp đồng & trạng thái', getValue: (emp) => emp.employment_status_notes || '' },
  { key: 'contract_type', header: 'Loại hợp đồng', width: 18, group: 'Hợp đồng & trạng thái', getValue: (emp) => emp.contract_type_display || emp.contract_type || '' },
  { key: 'probation_rate', header: 'Tỉ lệ thử việc', width: 16, group: 'Hợp đồng & trạng thái', getValue: (emp) => getExportProbationRateLabel(emp.probation_rate || '') },
  { key: 'probation_months', header: 'Số tháng thử việc', width: 18, group: 'Hợp đồng & trạng thái', getValue: (emp) => emp.probation_months ?? '' },
  { key: 'start_date', header: 'Ngày vào làm', width: 14, group: 'Hợp đồng & trạng thái', getValue: (emp) => emp.start_date || '' },
  { key: 'end_date', header: 'Ngày nghỉ việc', width: 14, group: 'Hợp đồng & trạng thái', getValue: (emp) => emp.end_date || '' },
  { key: 'probation_end_date', header: 'Ngày kết thúc thử việc', width: 22, group: 'Hợp đồng & trạng thái', getValue: (emp) => emp.probation_end_date || '' },
  { key: 'official_start_date', header: 'Ngày lên chính thức', width: 20, group: 'Hợp đồng & trạng thái', getValue: (emp) => emp.official_start_date || '' },
  { key: 'termination_reason', header: 'Lý do nghỉ việc', width: 24, group: 'Hợp đồng & trạng thái', getValue: (emp) => emp.termination_reason || '' },
  { key: 'total_work_months', header: 'Tổng TG làm việc (tháng)', width: 24, group: 'Hợp đồng & trạng thái', getValue: (emp) => emp.total_work_months ?? '' },
  // Hồ sơ
  { key: 'file_status', header: 'Trạng thái hồ sơ', width: 18, group: 'Hồ sơ', getValue: (emp) => emp.file_status_display || emp.file_status || '' },
  { key: 'file_submission_deadline', header: 'Hạn nộp hồ sơ', width: 16, group: 'Hồ sơ', getValue: (emp) => emp.file_submission_deadline || '' },
  { key: 'file_submission_date', header: 'Ngày nộp hồ sơ', width: 16, group: 'Hồ sơ', getValue: (emp) => emp.file_submission_date || '' },
  { key: 'doc_resume', header: 'Sơ yếu lý lịch', width: 16, group: 'Hồ sơ', getValue: (emp) => emp.doc_resume ? 'x' : '' },
  { key: 'doc_cccd', header: 'Căn cước công dân', width: 18, group: 'Hồ sơ', getValue: (emp) => emp.doc_cccd ? 'x' : '' },
  { key: 'doc_degree', header: 'Bằng cấp', width: 12, group: 'Hồ sơ', getValue: (emp) => emp.doc_degree ? 'x' : '' },
  { key: 'doc_health', header: 'Giấy khám sức khỏe', width: 20, group: 'Hồ sơ', getValue: (emp) => emp.doc_health ? 'x' : '' },
  // Lương & ngân hàng
  { key: 'basic_salary', header: 'Lương cơ bản', width: 16, group: 'Lương & ngân hàng', getValue: (emp) => emp.basic_salary ?? '' },
  { key: 'allowance', header: 'Phụ cấp', width: 14, group: 'Lương & ngân hàng', getValue: (emp) => emp.allowance ?? '' },
  { key: 'salary_notes', header: 'Ghi chú lương', width: 24, group: 'Lương & ngân hàng', getValue: (emp) => emp.salary_notes || '' },
  { key: 'allowance_notes', header: 'Ghi chú phụ cấp', width: 24, group: 'Lương & ngân hàng', getValue: (emp) => emp.allowance_notes || '' },
  { key: 'bank_name', header: 'Ngân hàng', width: 18, group: 'Lương & ngân hàng', getValue: (emp) => emp.bank_name || '' },
  { key: 'bank_branch', header: 'Chi nhánh NH', width: 20, group: 'Lương & ngân hàng', getValue: (emp) => emp.bank_branch || '' },
  { key: 'bank_account', header: 'Số tài khoản', width: 20, group: 'Lương & ngân hàng', getValue: (emp) => emp.bank_account || '' },
  // BHXH & thuế
  { key: 'social_insurance_number', header: 'Mã số BHXH', width: 16, group: 'BHXH & thuế', getValue: (emp) => emp.social_insurance_number || '' },
  { key: 'tax_code', header: 'Mã số thuế TNCN', width: 16, group: 'BHXH & thuế', getValue: (emp) => emp.tax_code || '' },
  { key: 'household_code', header: 'Mã hộ gia đình', width: 16, group: 'BHXH & thuế', getValue: (emp) => emp.household_code || '' },
  { key: 'insurance_participation', header: 'Đóng BHXH tại', width: 24, group: 'BHXH & thuế', getValue: (emp) => emp.insurance_participation || '' },
  { key: 'insurance_increase_time', header: 'Thời điểm báo tăng', width: 20, group: 'BHXH & thuế', getValue: (emp) => emp.insurance_increase_time || '' },
  // Nghỉ phép
  { key: 'annual_leave_balance', header: 'Số ngày phép còn lại', width: 20, group: 'Nghỉ phép', getValue: (emp) => emp.annual_leave_balance ?? '' },
  { key: 'annual_leave_balance_year', header: 'Năm số dư phép', width: 16, group: 'Nghỉ phép', getValue: (emp) => emp.annual_leave_balance_year ?? '' },
  // Người liên hệ khẩn cấp
  { key: 'emergency_contact_name', header: 'Người LH khẩn cấp', width: 22, group: 'Người liên hệ khẩn cấp', getValue: (emp) => emp.emergency_contact_name || '' },
  { key: 'emergency_contact_relationship', header: 'Mối quan hệ', width: 16, group: 'Người liên hệ khẩn cấp', getValue: (emp) => emp.emergency_contact_relationship || '' },
  { key: 'emergency_contact_phone', header: 'SĐT người thân', width: 16, group: 'Người liên hệ khẩn cấp', getValue: (emp) => emp.emergency_contact_phone || '' },
  { key: 'emergency_contact_dob', header: 'Ngày sinh người thân', width: 20, group: 'Người liên hệ khẩn cấp', getValue: (emp) => emp.emergency_contact_dob || '' },
  { key: 'emergency_contact_occupation', header: 'Nghề nghiệp người thân', width: 22, group: 'Người liên hệ khẩn cấp', getValue: (emp) => emp.emergency_contact_occupation || '' },
  { key: 'emergency_contact_address', header: 'Địa chỉ người LH', width: 28, group: 'Người liên hệ khẩn cấp', getValue: (emp) => emp.emergency_contact_address || '' },
  // Khác
  { key: 'notes', header: 'Ghi chú', width: 28, group: 'Khác', getValue: (emp) => emp.notes || '' },
  { key: 'created_at', header: 'Ngày tạo', width: 14, group: 'Khác', getValue: (emp) => emp.created_at ? emp.created_at.slice(0, 10) : '' },
];

const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    maternity_leave: 0,
    inactive: 0,
    male: 0,
    female: 0,
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [contractTypeFilter, setContractTypeFilter] = useState<string>('all');
  const [expiringSoonFilter, setExpiringSoonFilter] = useState<string>('all');
  const [legalEntityFilter, setLegalEntityFilter] = useState<string>('all');
  const [legalEntities, setLegalEntities] = useState<{ value: string; label: string }[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailCooldownRemaining, setEmailCooldownRemaining] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    summary: { total: number; created: number; updated: number; failed: number };
    errors: Array<{ row: number; employee_id?: string; warnings?: string[]; errors?: string[] }>;
  } | null>(null);
  const [showCustomExportDialog, setShowCustomExportDialog] = useState(false);
  const [customExportSelectedKeys, setCustomExportSelectedKeys] = useState<Set<string>>(
    () => new Set(['employee_id', 'full_name', 'gender', 'date_of_birth', 'phone_number', 'department', 'position', 'start_date'])
  );
  const [isExportingCustom, setIsExportingCustom] = useState(false);
  const isAdmin = user?.role === 'admin' || user?.is_super_admin === true;
  const isSuperUser = user?.is_superuser === true || user?.is_super_admin === true;

  const SEND_EMAIL_COOLDOWN_KEY = 'send_all_emails_cooldown_until';
  const COOLDOWN_DURATION = 120; // 2 phút (giây)
  const fetchEmployees = async (search = '', status = 'all', department = 'all', page = 1, pageSize = 20, contractType = 'all', expiringSoon = 'all', month?: string, legalEntity = 'all') => {
    try {
      setLoading(true);
      const params: any = { page, page_size: pageSize };
      if (search) params.search = search;
      if (status !== 'all') params.employment_status = status;
      if (search || status === 'PAUSED') params.include_inactive = true;
      if (department !== 'all') params.department = department;
      if (contractType !== 'all') params.contract_type = contractType;
      if (month) params.month = month;
      if (legalEntity !== 'all') params.subsidiary_legal_entity = legalEntity;

      if (expiringSoon === 'expiring') {
        const today = new Date();
        const deadline = new Date();
        deadline.setDate(today.getDate() + 7);
        params.expiring_soon_before = deadline.toISOString().split('T')[0];
        params.is_expiring_soon = true;
      }

      const response = await employeesAPI.list(params);
      setEmployees(response.results);
      setTotalCount(response.count);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách nhân viên');
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (month?: string) => {
    try {
      const statsData: any = await employeesAPI.stats(month ? { month } : undefined);
      setStats({
        total: statsData.total,
        active: statsData.active,
        paused: statsData.paused ?? 0,
        maternity_leave: statsData.maternity_leave ?? 0,
        inactive: statsData.inactive,
        male: statsData.gender_stats?.male ?? 0,
        female: statsData.gender_stats?.female ?? 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.list();
      setDepartments(response.results || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchLegalEntities = async () => {
    try {
      const response = await managementApi.get<{ value: string; label: string }[]>(
        '/api/v1/salary/records/legal-entities/'
      );
      const data = Array.isArray(response.data) ? response.data : [];
      setLegalEntities(data);
    } catch (err) {
      console.error('Error fetching legal entities:', err);
    }
  };

  useEffect(() => {
    fetchStats(selectedMonth);
    fetchDepartments();
    fetchLegalEntities();
  }, []);

  useEffect(() => {
    fetchStats(selectedMonth);
  }, [selectedMonth]);

  // Chặn scroll khi mở dialog import
  useLockBodyScroll(showImportDialog);
  // Chặn scroll khi mở dialog xuất tùy chọn
  useLockBodyScroll(showCustomExportDialog);

  // Khởi tạo cooldown từ localStorage và đếm ngược
  useEffect(() => {
    const stored = localStorage.getItem(SEND_EMAIL_COOLDOWN_KEY);
    if (stored) {
      const cooldownUntil = parseInt(stored, 10);
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (remaining > 0) {
        setEmailCooldownRemaining(remaining);
      } else {
        localStorage.removeItem(SEND_EMAIL_COOLDOWN_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (emailCooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setEmailCooldownRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [emailCooldownRemaining]);

  // Effect for real-time search with debouncing
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      fetchEmployees(searchTerm, statusFilter, departmentFilter, currentPage, itemsPerPage, contractTypeFilter, expiringSoonFilter, selectedMonth, legalEntityFilter);
    }, 300); // 300ms debounce delay

    setSearchTimeout(timeout);

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTerm, statusFilter, departmentFilter, currentPage, itemsPerPage, contractTypeFilter, expiringSoonFilter, selectedMonth, legalEntityFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmployees(searchTerm, statusFilter, departmentFilter, 1, itemsPerPage, contractTypeFilter, expiringSoonFilter, selectedMonth, legalEntityFilter);
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setContractTypeFilter('all');
    setExpiringSoonFilter('all');
    setLegalEntityFilter('all');
    setCurrentPage(1);
    // Don't call fetchEmployees here, the useEffect will handle it
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
      try {
        await employeesAPI.delete(id);
        fetchEmployees(searchTerm, statusFilter, departmentFilter, currentPage, itemsPerPage, contractTypeFilter, expiringSoonFilter, selectedMonth, legalEntityFilter);
        fetchStats(selectedMonth); // Refresh stats
      } catch (err: any) {
        alert('Xóa thất bại: ' + (err.message || 'Lỗi không xác định'));
      }
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await employeesAPI.activate(id);
      fetchEmployees(searchTerm, statusFilter, departmentFilter, currentPage, itemsPerPage, contractTypeFilter, expiringSoonFilter, selectedMonth, legalEntityFilter);
      fetchStats(selectedMonth);
    } catch (err: any) {
      alert('Kích hoạt thất bại: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await employeesAPI.deactivate(id);
      fetchEmployees(searchTerm, statusFilter, departmentFilter, currentPage, itemsPerPage, contractTypeFilter, expiringSoonFilter, selectedMonth, legalEntityFilter);
      fetchStats(selectedMonth);
    } catch (err: any) {
      alert('Vô hiệu hóa thất bại: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const handleExport = async () => {
    try {
      const exportPageSize = Math.max(totalCount, 1000);
      const params: any = { page: 1, page_size: exportPageSize };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.employment_status = statusFilter;
      if (departmentFilter !== 'all') params.department = departmentFilter;
      if (contractTypeFilter !== 'all') params.contract_type = contractTypeFilter;

      const response = await employeesAPI.list(params);
      const allEmployees = response.results;

      const getStatusLabel = (status: string) => {
        switch (status) {
          case 'ACTIVE': return 'Đang làm việc';
          case 'INACTIVE': return 'Đã nghỉ';
          case 'PAUSED': return 'Tạm dừng';
          case 'PROBATION': return 'Thử việc';
          case 'DEACTIVATED': return 'Vô hiệu hoá';
          default: return status;
        }
      };

      const getGenderLabel = (gender: string) => {
        switch (gender) {
          case 'M': return 'Nam';
          case 'F': return 'Nữ';
          case 'O': return 'Khác';
          default: return gender;
        }
      };

      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Danh sách nhân viên');

      const HEADER_FILL = {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FF4472C4' },
      };

      const columns = [
        { header: 'Mã NV', key: 'employee_id', width: 12 },
        { header: 'Họ tên', key: 'full_name', width: 25 },
        { header: 'Giới tính', key: 'gender', width: 10 },
        { header: 'Số điện thoại', key: 'phone_number', width: 15 },
        { header: 'Email', key: 'personal_email', width: 28 },
        { header: 'Phòng ban', key: 'department', width: 20 },
        { header: 'Chức vụ', key: 'position', width: 20 },
        { header: 'Trạng thái', key: 'employment_status', width: 16 },
        { header: 'Ngày vào làm', key: 'start_date', width: 14 },
        { header: 'Ngày nghỉ việc', key: 'end_date', width: 14 },
        { header: 'Sơ yếu lý lịch', key: 'doc_resume', width: 16 },
        { header: 'Căn cước công dân', key: 'doc_cccd', width: 18 },
        { header: 'Bằng cấp', key: 'doc_degree', width: 12 },
        { header: 'Giấy khám sức khỏe', key: 'doc_health', width: 20 },

      ];
      sheet.columns = columns;

      // Style header row
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = HEADER_FILL;
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Add data rows
      allEmployees.forEach((emp) => {
        sheet.addRow({
          employee_id: emp.employee_id,
          full_name: emp.full_name,
          gender: getGenderLabel(emp.gender),
          phone_number: emp.phone_number || '',
          personal_email: emp.personal_email || '',
          department: emp.department?.name || '',
          position: emp.position?.title || '',
          employment_status: getStatusLabel(emp.employment_status),
          start_date: emp.start_date || '',
          end_date: emp.end_date || '',
          doc_resume: emp.doc_resume ? 'x' : '',
          doc_cccd: emp.doc_cccd ? 'x' : '',
          doc_degree: emp.doc_degree ? 'x' : '',
          doc_health: emp.doc_health ? 'x' : '',
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `danh-sach-nhan-vien-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Xuất file thất bại: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  // `fieldDefs` cho phép "Xuất tùy chọn" tái dùng hàm này với danh sách cột đã lọc theo lựa chọn của HR.
  const exportEmployeesToExcel = async (
    fieldDefs: ExportFieldDef[],
    sheetName: string,
    filenamePrefix: string,
  ) => {
    const response = await employeesAPI.exportAll();
    const allEmployees = response.results;

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName);

    const HEADER_FILL = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FF1E3A5F' },
    };

    sheet.columns = fieldDefs.map((f) => ({ header: f.header, key: f.key, width: f.width }));

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    allEmployees.forEach((emp) => {
      const row: Record<string, string | number> = {};
      fieldDefs.forEach((f) => { row[f.key] = f.getValue(emp); });
      sheet.addRow(row);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = async () => {
    try {
      await exportEmployeesToExcel(EXPORT_FIELD_DEFS, 'Toàn bộ nhân viên', 'xuat-toan-bo-nhan-vien');
    } catch (err: any) {
      alert('Xuất toàn bộ thất bại: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const handleExportCustom = async () => {
    const fieldDefs = EXPORT_FIELD_DEFS.filter((f) => customExportSelectedKeys.has(f.key));
    if (fieldDefs.length === 0) return;
    setIsExportingCustom(true);
    try {
      await exportEmployeesToExcel(fieldDefs, 'Danh sách nhân viên', 'xuat-tuy-chon-nhan-vien');
      setShowCustomExportDialog(false);
    } catch (err: any) {
      alert('Xuất file thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsExportingCustom(false);
    }
  };

  const handleSendAllEmails = async () => {
    if (isSendingEmails || emailCooldownRemaining > 0) return;

    if (!window.confirm(
      '⚠️ BẠN CÓ CHẮC CHẮN?\n\n' +
      'Hành động này sẽ:\n' +
      '✓ Reset password TẤT CẢ nhân viên đang làm việc\n' +
      '✓ Gửi email thông tin đăng nhập mới cho họ\n\n' +
      'Bạn có muốn tiếp tục?'
    )) {
      return;
    }

    setIsSendingEmails(true);
    try {
      const response = await sendAccountEmailsAPI.sendEmails({ send_all: true });
      
      if (response.success) {
        // Lưu thời điểm hết cooldown vào localStorage
        const cooldownUntil = Date.now() + COOLDOWN_DURATION * 1000;
        localStorage.setItem(SEND_EMAIL_COOLDOWN_KEY, cooldownUntil.toString());
        setEmailCooldownRemaining(COOLDOWN_DURATION);

        // Hiển thị thông báo chi tiết
        alert(
          `✅ THÀNH CÔNG!\n\n` +
          `${response.message}\n\n` +
          `📊 Thống kê:\n` +
          `- Tổng số email: ${response.total}\n` +
          `- Số password đã reset: ${response.passwords_reset}\n` +
          `- Thời gian ước tính: ${response.estimated_time}\n` +
          // `- Batch ID: ${response.batch_id}\n\n` +
          `💡 Email sẽ được gửi tự động trong background.`
        );
        
        // Optional: Poll status để hiển thị progress
        if (response.batch_id) {
          pollBatchStatus(response.batch_id);
        }
      } else {
        alert(`❌ ${response.message}`);
      }
    } catch (error: any) {
      alert(`❌ Lỗi: ${error.message || 'Không thể gửi email'}`);
    } finally {
      setIsSendingEmails(false);
    }
  };

  // ✅ THÊM function poll status (optional)
  const pollBatchStatus = async (batchId: string) => {
    let pollCount = 0;
    const maxPolls = 30; // Poll tối đa 30 lần (5 phút nếu 10s/lần)
    
    const checkStatus = async () => {
      try {
        const status = await sendAccountEmailsAPI.checkBatchStatus(batchId);
        
        console.log(
          `📧 Email Progress [${status.status}]: ` +
          `${status.sent}/${status.total} sent ` +
          `(${status.progress_percentage}%) | ` +
          `Failed: ${status.failed} | Pending: ${status.pending}`
        );
        
        pollCount++;
        
        // Nếu chưa hoàn thành và chưa poll quá nhiều lần
        if (status.status !== 'COMPLETED' && pollCount < maxPolls) {
          setTimeout(checkStatus, 10000); // Check lại sau 10 giây
        } else if (status.status === 'COMPLETED') {
          console.log('✅ All emails sent successfully!');
          // Optional: Hiển thị notification
          if (status.sent > 0) {
            alert(
              `🎉 ĐÃ GỬI XONG TẤT CẢ EMAIL!\n\n` +
              `✓ Đã gửi: ${status.sent}/${status.total}\n` +
              `✗ Thất bại: ${status.failed}\n` +
              `📅 Hoàn thành lúc: ${new Date(status.completed_at || '').toLocaleString('vi-VN')}`
            );
          }
        }
      } catch (error) {
        console.error('Error checking batch status:', error);
      }
    };
    
    // Bắt đầu check sau 10 giây
    setTimeout(checkStatus, 10000);
  };

  const handleDownloadTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Template nhân viên');

    const HEADER_FILL = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FF1E3A5F' },
    };

    sheet.columns = [
      { header: 'Mã nhân viên', key: 'employee_id', width: 14 },
      { header: 'Ngày bắt đầu làm việc', key: 'start_date', width: 22 },
      { header: 'Họ và tên', key: 'full_name', width: 25 },
      { header: 'Trạng thái làm việc', key: 'employment_status', width: 20 },
      { header: 'Vùng/Miền', key: 'region', width: 14 },
      { header: 'Khối', key: 'block', width: 14 },
      { header: 'Phòng/Ban', key: 'department', width: 25 },
      { header: 'Bộ phận', key: 'section', width: 20 },
      { header: 'Cấp bậc', key: 'rank', width: 22 },
      { header: 'Vị trí', key: 'position', width: 25 },
      { header: 'Quản lý trực tiếp', key: 'manager', width: 16 },
      { header: 'Bác sĩ Chính', key: 'doctor_team', width: 20 },
      { header: 'Hình thức làm việc', key: 'work_form', width: 22 },
      { header: 'Trình độ học vấn', key: 'education_level', width: 20 },
      { header: 'Ngày sinh', key: 'date_of_birth', width: 14 },
      { header: 'Giới tính', key: 'gender', width: 10 },
      { header: 'Số tài khoản đăng ký nhận lương', key: 'bank_account', width: 30 },
      { header: 'Tên ngân hàng', key: 'bank_name', width: 20 },
      { header: 'Chi nhánh ngân hàng', key: 'bank_branch', width: 22 },
      { header: 'Chủ tài khoản', key: 'chu_tai_khoan', width: 24 },
      { header: 'Số điện thoại', key: 'phone_number', width: 16 },
      { header: 'Email', key: 'personal_email', width: 28 },
      { header: 'Địa điểm làm việc', key: 'work_location', width: 22 },
      { header: 'Link facebook', key: 'facebook_link', width: 28 },
      { header: 'Mã số BHXH', key: 'social_insurance_number', width: 16 },
      { header: 'Mã số TNCN', key: 'tax_code', width: 16 },
      { header: 'Mã hộ gia đình', key: 'household_code', width: 18 },
      { header: 'Số CCCD', key: 'cccd_number', width: 16 },
      { header: 'Ngày cấp CCCD', key: 'cccd_issue_date', width: 16 },
      { header: 'Nơi cấp CCCD', key: 'cccd_issue_place', width: 22 },
      { header: 'Nơi đăng ký khai sinh', key: 'birth_place', width: 24 },
      { header: 'Dân tộc', key: 'ethnicity', width: 14 },
      { header: 'Quốc tịch', key: 'nationality', width: 14 },
      { header: 'Địa chỉ thường trú', key: 'permanent_residence', width: 32 },
      { header: 'Địa chỉ hiện tại', key: 'current_address', width: 32 },
      { header: 'Link CCCD/CMT', key: 'link_cccd', width: 28 },
      { header: 'Tình trạng hôn nhân', key: 'marital_status', width: 20 },
      { header: 'Khi cần liên hệ với ai?', key: 'emergency_contact_name', width: 24 },
      { header: 'Mối quan hệ của người thân với ai?', key: 'emergency_contact_relationship', width: 30 },
      { header: 'Số điện thoại người thân', key: 'emergency_contact_phone', width: 22 },
      { header: 'Ngày sinh người thân', key: 'emergency_contact_dob', width: 20 },
      { header: 'Nghề nghiệp người thân', key: 'emergency_contact_occupation', width: 22 },
      { header: 'Địa chỉ của người khi cần liên hệ', key: 'emergency_contact_address', width: 32 },
      { header: 'Ngày nghỉ việc', key: 'end_date', width: 16 },
      { header: 'Lý do nghỉ việc', key: 'termination_reason', width: 28 },
      { header: 'Lương', key: 'basic_salary', width: 16 },
      { header: 'Phụ cấp', key: 'allowance', width: 14 },
      { header: 'Tỷ lệ % doanh số hưởng', key: 'revenue_percentage', width: 24 },
      { header: 'Tỷ lệ % lợi nhuận hưởng', key: 'profit_percentage', width: 24 },
      { header: 'Tỉ lệ hưởng thử việc', key: 'probation_rate', width: 30 },
      { header: 'Thời gian thử việc(tháng)', key: 'probation_months', width: 24 },
      { header: 'Ghi chú công việc', key: 'employment_status_notes', width: 28 },
      { header: 'Ngày kết thúc thử việc', key: 'probation_end_date', width: 22 },
      { header: 'Ngày chính thức', key: 'official_start_date', width: 18 },
      { header: 'Đơn vị', key: 'company_unit', width: 20 },
      { header: 'Loại hợp đồng', key: 'contract_type', width: 28 },
      { header: 'Ngày bắt đầu hợp đồng', key: 'contract_start_date', width: 22 },
      { header: 'Ngày kết thúc hợp đồng', key: 'contract_end_date', width: 22 },
      { header: 'CCCD (hồ sơ)', key: 'doc_cccd', width: 14 },
      { header: 'Sơ yếu lý lịch', key: 'doc_resume', width: 16 },
      { header: 'Bằng cấp', key: 'doc_degree', width: 12 },
      { header: 'Giấy khám sức khỏe', key: 'doc_health', width: 20 },
      { header: 'Trạng thái nộp hồ sơ', key: 'file_status', width: 22 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
    headerRow.height = 30;

    // Ép kiểu text để giữ số 0 đầu và ký tự đặc biệt (%, dấu phẩy...)
    const TEXT_FORMAT_COLS = [
      'phone_number', 'cccd_number', 'social_insurance_number',
      'tax_code', 'bank_account', 'revenue_percentage', 'profit_percentage',
    ];
    TEXT_FORMAT_COLS.forEach(key => {
      const col = sheet.getColumn(key);
      if (col?.number) col.numFmt = '@';
    });

    // Sheet ẩn chứa các options có dấu phẩy (tránh bị Excel parse sai)
    const dropdownSheet = workbook.addWorksheet('_Dropdowns');
    dropdownSheet.state = 'veryHidden';
    const probationRateOptions = [
      'Tháng đầu 85%, tháng sau 85%',
      'Tháng đầu 85%, tháng sau 100%',
      'Tháng đầu 100%, tháng sau 100%',
    ];
    probationRateOptions.forEach((v, i) => { dropdownSheet.getCell(i + 1, 1).value = v; });

    const workLocationOptions = [
      '789/C9 Lê Hồng Phong, Phường 12, Quận 10, Thành phố Hồ Chí Minh',
      '16 Nguyễn Như Đổ, Văn Miếu, Đống Đa, Hà Nội',
      '61 Vũ Thạnh, Ô Chợ Dừa, Đống Đa, Hà Nội',
      '9 Sư Vạn Hạnh, Phường 9, Quận 5, Thành phố Hồ Chí Minh',
      '355 An Dương Vương',
      'Số 1E Trường Trinh, Hà Nội',
      'Số 50 Trung Phụng, Hà Nội',
      'Số 219 Trung Kính, Cầu Giấy, Hà Nội',
    ];
    workLocationOptions.forEach((v, i) => { dropdownSheet.getCell(i + 1, 2).value = v; });

    // Helper: áp dropdown validation cho 1 cột (rows 2→1001)
    const applyDropdown = (colKey: string, values: string[]) => {
      const colNumber = sheet.getColumn(colKey).number;
      if (!colNumber) return;
      const formulae = [`"${values.join(',')}"`];
      for (let r = 2; r <= 1001; r++) {
        sheet.getCell(r, colNumber).dataValidation = {
          type: 'list',
          allowBlank: true,
          showErrorMessage: true,
          errorStyle: 'warning',
          errorTitle: 'Giá trị không hợp lệ',
          error: `Vui lòng chọn: ${values.join(' / ')}`,
          formulae,
        };
      }
    };

    // Helper: dùng cell range thay vì inline list (cho options có dấu phẩy)
    const applyDropdownRange = (colKey: string, formula: string, values: string[]) => {
      const colNumber = sheet.getColumn(colKey).number;
      if (!colNumber) return;
      for (let r = 2; r <= 1001; r++) {
        sheet.getCell(r, colNumber).dataValidation = {
          type: 'list',
          allowBlank: true,
          showErrorMessage: true,
          errorStyle: 'warning',
          errorTitle: 'Giá trị không hợp lệ',
          error: `Vui lòng chọn: ${values.join(' / ')}`,
          formulae: [formula],
        };
      }
    };

    applyDropdown('employment_status', ['Đang làm việc', 'Tạm dừng', 'Đã nghỉ']);
    applyDropdown('rank', ['Chủ tịch', 'Giám đốc', 'Phó Giám đốc', 'Leader', 'Trưởng phòng', 'Trưởng phòng tập sự', 'Phó phòng', 'Nhân viên', 'Thực tập sinh']);
    applyDropdown('work_form', ['Toàn thời gian', 'Bán thời gian', 'Hợp đồng', 'Thực tập', 'Cộng tác viên']);
    applyDropdown('education_level', ['Trung học phổ thông', 'Cao đẳng', 'Đại học', 'Thạc sĩ', 'Tiến sĩ', 'Khác']);
    applyDropdown('gender', ['Nam', 'Nữ', 'Khác']);
    applyDropdown('marital_status', ['Độc thân', 'Đã kết hôn', 'Ly hôn', 'Góa']);
    applyDropdownRange(
      'probation_rate',
      "'_Dropdowns'!$A$1:$A$3",
      ['Tháng đầu 85%, tháng sau 85%', 'Tháng đầu 85%, tháng sau 100%', 'Tháng đầu 100%, tháng sau 100%'],
    );
    applyDropdownRange(
      'work_location',
      "'_Dropdowns'!$B$1:$B$8",
      workLocationOptions,
    );
    applyDropdown('contract_type', [
      'Hợp đồng thử việc',
      'Hợp đồng thực tập sinh',
      'Hợp đồng cộng tác viên',
      'Hợp đồng lao động 12 tháng',
      'Hợp đồng lao động 24 tháng',
      'Hợp đồng vô thời hạn',
      'Hợp đồng dịch vụ',
      'Thoả thuận bảo mật',
      'Cam kết đọc hiểu nội quy công ty',
      'Cam kết của CBNV Điều dưỡng',
    ]);
    applyDropdown('cccd_issue_place', [
      'Cục cảnh sát Quản lý hành chính về Trật tự xã hội',
      'Bộ Công An',
    ]);
    applyDropdown('doc_cccd', ['x', '']);
    applyDropdown('doc_resume', ['x', '']);
    applyDropdown('doc_degree', ['x', '']);
    applyDropdown('doc_health', ['x', '']);
    applyDropdown('file_status', ['Nộp đủ', 'Cần bổ sung hồ sơ', 'Chưa nộp', 'Chờ rà soát']);

    // Dòng mẫu
    sheet.addRow({
      employee_id: 'TA00001',
      start_date: '01/01/2024',
      full_name: 'Nguyễn Văn A',
      employment_status: 'Đang làm việc',
      region: '',
      block: '',
      department: 'Phòng Nhân sự',
      section: '',
      rank: 'Nhân viên',
      position: 'Chuyên viên nhân sự',
      manager: 'TA00002',
      doctor_team: '',
      work_form: 'Toàn thời gian',
      education_level: 'Đại học',
      date_of_birth: '01/01/1990',
      gender: 'Nam',
      bank_account: '1234567890',
      bank_name: 'Vietcombank',
      bank_branch: 'Chi nhánh Hà Nội',
      chu_tai_khoan: 'NGUYEN VAN A',
      phone_number: '0901234567',
      personal_email: 'nguyenvana@email.com',
      work_location: '',
      facebook_link: '',
      social_insurance_number: '',
      tax_code: '',
      cccd_number: '',
      cccd_issue_date: '',
      cccd_issue_place: '',
      birth_place: '',
      ethnicity: '',
      nationality: '',
      permanent_residence: '',
      current_address: '',
      link_cccd: '',
      marital_status: 'Độc thân',
      emergency_contact_name: '',
      emergency_contact_relationship: '',
      emergency_contact_phone: '',
      emergency_contact_dob: '',
      emergency_contact_occupation: '',
      emergency_contact_address: '',
      end_date: '',
      termination_reason: '',
      basic_salary: 8000000,
      allowance: 500000,
      revenue_percentage: '',
      profit_percentage: '',
      probation_rate: '',
      probation_months: '',
      employment_status_notes: '',
      probation_end_date: '',
      official_start_date: '',
      company_unit: '',
      contract_type: 'Hợp đồng lao động 12 tháng',
      contract_start_date: '01/01/2024',
      contract_end_date: '31/12/2024',
      doc_cccd: 'x',
      doc_resume: 'x',
      doc_degree: '',
      doc_health: '',
      file_status: 'Nộp đủ',
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template-import-nhan-vien.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportErrors = async () => {
    if (!importResult || importResult.errors.length === 0 || !importFile) return;

    const ExcelJS = (await import('exceljs')).default;
    const arrayBuffer = await importFile.arrayBuffer();
    const srcWorkbook = new ExcelJS.Workbook();
    const ext = importFile.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      await srcWorkbook.xlsx.load(arrayBuffer);
    } else {
      // CSV fallback
      const text = new TextDecoder().decode(arrayBuffer);
      const lines = text.split('\n').map(l => l.split(','));
      const outWb = new ExcelJS.Workbook();
      const outWs = outWb.addWorksheet('Lỗi import');
      const errorRowNums = new Set(importResult.errors.map(e => e.row));
      const errorMap = new Map(importResult.errors.map(e => [e.row, (e.errors || e.warnings || []).join('; ')]));
      if (lines.length > 0) {
        outWs.addRow([...lines[0], 'Lỗi / Cảnh báo']);
        outWs.getRow(1).font = { bold: true };
        outWs.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      }
      lines.slice(1).forEach((cells, i) => {
        const rowNum = i + 2;
        if (errorRowNums.has(rowNum)) {
          const r = outWs.addRow([...cells, errorMap.get(rowNum) || '']);
          r.getCell(cells.length + 1).font = { color: { argb: 'FFCC0000' } };
        }
      });
      const buf = await outWb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `loi-import-nhan-vien-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
      return;
    }

    const srcSheet = srcWorkbook.worksheets[0];
    const errorRowNums = new Set(importResult.errors.map(e => e.row));
    const errorMap = new Map(importResult.errors.map(e => [e.row, (e.errors || e.warnings || []).join('; ')]));

    const outWorkbook = new ExcelJS.Workbook();
    const outSheet = outWorkbook.addWorksheet('Lỗi import');

    const headerRow = srcSheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      headers.push(String(cell.value ?? ''));
    });
    headers.push('Lỗi / Cảnh báo');

    const outHeader = outSheet.addRow(headers);
    outHeader.font = { bold: true };
    outHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    outSheet.columns = headers.map((h, i) => ({
      key: String(i),
      width: i === headers.length - 1 ? 60 : Math.max(h.length + 2, 15),
    }));

    srcSheet.eachRow({ includeEmpty: false }, (srcRow, rowNumber) => {
      if (rowNumber === 1) return;
      if (!errorRowNums.has(rowNumber)) return;

      const values: (string | number | null)[] = [];
      srcRow.eachCell({ includeEmpty: true }, (cell) => {
        const v = cell.value;
        if (v === null || v === undefined) { values.push(''); return; }
        if (typeof v === 'object' && 'result' in v) { values.push(String((v as any).result ?? '')); return; }
        values.push(v as string | number);
      });
      values.push(errorMap.get(rowNumber) || '');

      const outRow = outSheet.addRow(values);
      outRow.getCell(values.length).font = { color: { argb: 'FFCC0000' } };
    });

    const buffer = await outWorkbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loi-import-nhan-vien-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const result = await employeesAPI.importFile(importFile);
      setImportResult(result);
      if (result.summary.created > 0 || result.summary.updated > 0) {
        fetchEmployees(searchTerm, statusFilter, departmentFilter, currentPage, itemsPerPage, contractTypeFilter, expiringSoonFilter, selectedMonth, legalEntityFilter);
        fetchStats(selectedMonth);
      }
    } catch (err: any) {
      alert('Import thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-600">Đang làm việc</span>;
      case 'INACTIVE':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-600">Đã nghỉ</span>;
      case 'MATERNITY_LEAVE':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-pink-100 text-pink-700">Nghỉ thai sản</span>;
      case 'PAUSED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Tạm dừng</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getGenderText = (gender: string) => {
    switch (gender) {
      case 'M': return 'Nam';
      case 'F': return 'Nữ';
      case 'O': return 'Khác';
      default: return gender;
    }
  };

  const isExpiringSoon = (employee: Employee) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(today);
    deadline.setDate(today.getDate() + 7);

    const probEnd = employee.probation_end_date ? new Date(employee.probation_end_date) : null;
    const contEnd = employee.contract_end_date ? new Date(employee.contract_end_date) : null;

    if (probEnd) probEnd.setHours(0, 0, 0, 0);
    if (contEnd) contEnd.setHours(0, 0, 0, 0);

    return (probEnd && probEnd >= today && probEnd <= deadline) ||
           (contEnd && contEnd >= today && contEnd <= deadline);
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Quản lý nhân viên</h1>
          <p className="text-sm text-gray-900">Quản lý thông tin nhân viên, phòng ban, chức vụ và các thông tin liên quan.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {/* Statistics Section - At the top as requested */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">Thống kê nhân viên</h2>
            <div className="w-44">
              <SelectBox
                label=""
                value={selectedMonth}
                options={(() => {
                  const now = new Date();
                  const currentYear = now.getFullYear();
                  const currentMonth = now.getMonth() + 1;
                  const opts = [];
                  for (let y = 2026; y <= currentYear; y++) {
                    const maxMonth = y === currentYear ? currentMonth : 12;
                    for (let m = 1; m <= maxMonth; m++) {
                      const val = `${y}-${String(m).padStart(2, '0')}`;
                      opts.push({ value: val, label: `Tháng ${m}/${y}` });
                    }
                  }
                  return opts;
                })()}
                onChange={(val) => setSelectedMonth(val)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-primary-500 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Tổng số</p>
              <p className="text-2xl font-extrabold text-primary-600 mt-1">{stats.total}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-emerald-500 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Đang làm việc</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.active}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-yellow-500 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Tạm dừng</p>
              <p className="text-2xl font-extrabold text-yellow-600 mt-1">{stats.paused}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-pink-500 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Nghỉ thai sản</p>
              <p className="text-2xl font-extrabold text-pink-600 mt-1">{stats.maternity_leave}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-red-500 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Đã nghỉ</p>
              <p className="text-2xl font-extrabold text-red-600 mt-1">{stats.inactive}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-primary-300 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Nam</p>
              <p className="text-2xl font-extrabold text-primary-500 mt-1">{stats.male}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-pink-400 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Nữ</p>
              <p className="text-2xl font-extrabold text-pink-500 mt-1">{stats.female}</p>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Tìm kiếm nhân viên</h3>
            <div className="flex items-center gap-3">
              {loading && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-600"></div>
                  Đang tìm kiếm...
                </div>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="btn-secondary text-xs"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tìm kiếm
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="input-field w-full"
                placeholder="Mã NV, tên, số điện thoại..."
              />
            </div>
            <SelectBox<string>
              label="Trạng thái"
              value={statusFilter}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'ACTIVE', label: 'Đang làm việc' },
                { value: 'INACTIVE', label: 'Đã nghỉ' },
                { value: 'MATERNITY_LEAVE', label: 'Nghỉ thai sản' },
                { value: 'PAUSED', label: 'Tạm dừng' },
              ]}
              onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
            />
            <SelectBox<string>
              label="Phòng ban"
              value={departmentFilter}
              options={[
                { value: 'all', label: 'Tất cả phòng ban' },
                ...departments.map((dept) => ({ value: String(dept.id), label: dept.name })),
              ]}
              onChange={(v) => { setDepartmentFilter(v); setCurrentPage(1); }}
            />
            <SelectBox<string>
              label="Loại hợp đồng"
              value={contractTypeFilter}
              options={[
                { value: 'all', label: 'Tất cả loại hợp đồng' },
                { value: 'ONE_YEAR', label: 'Hợp đồng lao động 12 tháng' },
                { value: 'TWO_YEAR', label: 'Hợp đồng lao động 24 tháng' },
                { value: 'THREE_YEAR', label: 'Hợp đồng lao động 36 tháng' },
                { value: 'INDEFINITE', label: 'Không xác định thời hạn' },
                { value: 'PROBATION_1M', label: 'Thử việc 1 tháng' },
                { value: 'PROBATION_2M', label: 'Thử việc 2 tháng' },
                { value: 'COLLABORATOR', label: 'Cộng tác viên' },
                { value: 'INTERN', label: 'Thực tập sinh' },
                { value: 'SERVICE', label: 'Hợp đồng dịch vụ' },
              ]}
              onChange={(v) => { setContractTypeFilter(v); setCurrentPage(1); }}
            />
            <SelectBox<string>
              label="Hạn HĐ/Thử việc"
              value={expiringSoonFilter}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'expiring', label: 'Sắp hết hạn (≤ 7 ngày)' },
              ]}
              onChange={(v) => { setExpiringSoonFilter(v); setCurrentPage(1); }}
            />
            <SelectBox<string>
              label="Pháp nhân"
              value={legalEntityFilter}
              options={[
                { value: 'all', label: 'Tất cả pháp nhân' },
                { value: '__none__', label: 'Chưa gắn pháp nhân' },
                ...legalEntities.map((e) => ({ value: e.value, label: e.label })),
              ]}
              onChange={(v) => { setLegalEntityFilter(v); setCurrentPage(1); }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Danh sách nhân viên</h2>
            <p className="text-gray-500 text-sm">Tổng số: {totalCount} nhân viên</p>
          </div>
            <div className="flex space-x-2">
              <button
                  className={`px-4 py-2 rounded-xl transition-colors flex items-center ${
                    isSendingEmails || emailCooldownRemaining > 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                  onClick={handleSendAllEmails}
                  disabled={isSendingEmails || emailCooldownRemaining > 0}
                >
                  {isSendingEmails ? (
                    <>
                      <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      Đang gửi...
                    </>
                  ) : emailCooldownRemaining > 0 ? (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Gửi lại sau {emailCooldownRemaining}s
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      📧 Gửi email cho tất cả
                    </>
                  )}
                </button>
              <button
                  className="bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors flex items-center"
                  onClick={() => { setShowImportDialog(true); setImportFile(null); setImportResult(null); }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Nhập từ file
                </button>
              <button
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors flex items-center"
                onClick={handleExport}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Xuất danh sách
              </button>
              <button
                  className="bg-primary-700 text-white px-4 py-2 rounded-xl hover:bg-primary-800 transition-colors flex items-center"
                  onClick={handleExportAll}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Xuất toàn bộ
                </button>
              <button
                  className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors flex items-center"
                  onClick={() => setShowCustomExportDialog(true)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  Xuất tùy chọn
                </button>

              <button
                className="btn-primary"
                onClick={() => navigate('/dashboard/employees/create')}
              >
                + Thêm nhân viên
              </button>
            </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900">Đã xảy ra lỗi</p>
            <p className="text-gray-500 mt-1">{error}</p>
            <button 
              onClick={() => fetchEmployees(searchTerm, statusFilter, departmentFilter, currentPage, itemsPerPage, contractTypeFilter, expiringSoonFilter, selectedMonth, legalEntityFilter)}
              className="mt-4 btn-primary"
            >
              Thử lại
            </button>
          </div>
        ) : employees.length === 0 ? (
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã NV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Họ tên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phòng ban
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chức vụ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pháp nhân
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <UsersIcon className="h-7 w-7" />
                      </div>
                      <p className="text-lg font-medium text-gray-900">Chưa có nhân viên nào</p>
                      <p className="text-gray-500 mt-1">Bắt đầu bằng cách thêm nhân viên mới</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã NV
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Họ tên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Giới tính
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phòng ban
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chức vụ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pháp nhân
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee.id} className={`hover:bg-gray-50 ${isExpiringSoon(employee) ? 'bg-amber-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{employee.employee_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                          {isExpiringSoon(employee) && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-600" title="Sắp hết hạn hợp đồng/thử việc (≤ 7 ngày)">
                              ⚠️
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{employee.phone_number || <span className="text-gray-400 italic">Chưa có dữ liệu</span>}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getGenderText(employee.gender)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.department?.name || <span className="text-gray-400 italic">Chưa có dữ liệu</span>}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.position?.title || <span className="text-gray-400 italic">Chưa có dữ liệu</span>}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{(employee as any).subsidiary_legal_entity || <span className="text-gray-400 italic">Chưa có dữ liệu</span>}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(employee.employment_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/dashboard/employees/${employee.id}`)}
                            className="px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition-colors"
                          >
                            Xem
                          </button>
                          <button
                            onClick={() => navigate(`/dashboard/employees/${employee.id}/edit`)}
                            className="px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition-colors"
                          >
                            Sửa
                          </button>
                          {employee.is_active !== false ? (
                            <button
                              onClick={() => handleDeactivate(employee.id)}
                              className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
                            >
                              Vô hiệu hóa
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(employee.id)}
                              className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                            >
                              Kích hoạt
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(employee.id)}
                            className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalCount / itemsPerPage)}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
                onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
              />
            </div>
          </>
        )}
      </div>
    </div>

    {/* Import Dialog */}
    {showImportDialog && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Nhập danh sách nhân viên từ file</h2>
            <button
              onClick={() => { setShowImportDialog(false); setImportResult(null); setImportFile(null); }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
            {/* Tải template */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <p className="text-sm font-medium text-primary-900 mb-1">Bước 1: Tải file mẫu</p>
              <p className="text-xs text-primary-700 mb-3">
                Phòng ban/vị trí: nhập tên tiếng Việt. Cột hồ sơ: <strong>x</strong> = đã nộp, để trống = chưa nộp.
              </p>
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Tải file mẫu (.xlsx)
              </button>
            </div>

            {/* Upload file */}
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Bước 2: Upload file đã điền</p>
              {!importFile ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all duration-200 group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-10 h-10 text-gray-400 mb-3 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mb-2 text-sm text-gray-700 font-medium">
                      <span className="text-primary-600">Nhấn để chọn file</span> hoặc kéo thả vào đây
                    </p>
                    <p className="text-xs text-gray-500">Hỗ trợ .xlsx, .xls, .csv</p>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => { setImportFile(e.target.files?.[0] || null); setImportResult(null); }}
                  />
                </label>
              ) : (
                <div className="relative flex items-center p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                  <div className="flex-shrink-0 bg-emerald-100 p-2 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-900 truncate">
                      {importFile.name}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {(importFile.size / 1024).toFixed(1)} KB • Sẵn sàng để import
                    </p>
                  </div>
                  <button
                    onClick={() => { setImportFile(null); setImportResult(null); }}
                    className="ml-4 p-1 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 rounded-full transition-colors"
                    title="Xóa file"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Kết quả */}
            {importResult && (
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">Kết quả import</p>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="bg-gray-100 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Tổng</p>
                    <p className="text-xl font-bold text-gray-800">{importResult.summary.total}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-emerald-600">Tạo mới</p>
                    <p className="text-xl font-bold text-emerald-700">{importResult.summary.created}</p>
                  </div>
                  <div className="bg-primary-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-primary-600">Cập nhật</p>
                    <p className="text-xl font-bold text-primary-700">{importResult.summary.updated}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-red-600">Thất bại</p>
                    <p className="text-xl font-bold text-red-700">{importResult.summary.failed}</p>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 border-b flex items-center justify-between">
                      <span>Chi tiết lỗi / cảnh báo</span>
                      <button
                        onClick={handleExportErrors}
                        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                        title="Xuất danh sách lỗi ra file Excel"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Xuất file
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {importResult.errors.map((err, idx) => (
                        <div key={idx} className="px-3 py-2 text-xs border-b last:border-b-0">
                          <span className="font-medium text-gray-700">Dòng {err.row}</span>
                          {err.employee_id && <span className="text-gray-500 ml-1">({err.employee_id})</span>}
                          <span className="text-red-600 ml-2">
                            {(err.errors || err.warnings || []).join('; ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
            <button
              onClick={() => { setShowImportDialog(false); setImportResult(null); setImportFile(null); }}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handleImportSubmit}
              disabled={!importFile || isImporting}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors ${
                !importFile || isImporting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {isImporting ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Đang import...
                </>
              ) : (
                'Bắt đầu import'
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Custom Export Dialog */}
    {showCustomExportDialog && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Xuất danh sách theo tiêu chí tự chọn</h2>
              <p className="text-xs text-gray-500 mt-0.5">Chọn các cột thông tin muốn xuất ra file Excel</p>
            </div>
            <button
              onClick={() => setShowCustomExportDialog(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Toolbar chọn nhanh */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-600">
              Đã chọn <strong className="text-gray-900">{customExportSelectedKeys.size}</strong>/{EXPORT_FIELD_DEFS.length} cột
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCustomExportSelectedKeys(new Set(EXPORT_FIELD_DEFS.map((f) => f.key)))}
                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                Chọn tất cả
              </button>
              <button
                onClick={() => setCustomExportSelectedKeys(new Set())}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Bỏ chọn tất cả
              </button>
            </div>
          </div>

          {/* Danh sách cột theo nhóm */}
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
            {EXPORT_FIELD_GROUPS.map((group) => {
              const fieldsInGroup = EXPORT_FIELD_DEFS.filter((f) => f.group === group);
              const selectedInGroup = fieldsInGroup.filter((f) => customExportSelectedKeys.has(f.key)).length;
              const allSelected = selectedInGroup === fieldsInGroup.length;
              return (
                <div key={group}>
                  <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = selectedInGroup > 0 && !allSelected; }}
                      onChange={() => {
                        setCustomExportSelectedKeys((prev) => {
                          const next = new Set(prev);
                          fieldsInGroup.forEach((f) => {
                            if (allSelected) next.delete(f.key);
                            else next.add(f.key);
                          });
                          return next;
                        });
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-semibold text-gray-800">{group}</span>
                    <span className="text-xs text-gray-400">({selectedInGroup}/{fieldsInGroup.length})</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 pl-6">
                    {fieldsInGroup.map((f) => (
                      <label key={f.key} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={customExportSelectedKeys.has(f.key)}
                          onChange={() => {
                            setCustomExportSelectedKeys((prev) => {
                              const next = new Set(prev);
                              if (next.has(f.key)) next.delete(f.key);
                              else next.add(f.key);
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{f.header}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
            <button
              onClick={() => setShowCustomExportDialog(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handleExportCustom}
              disabled={customExportSelectedKeys.size === 0 || isExportingCustom}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors ${
                customExportSelectedKeys.size === 0 || isExportingCustom
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isExportingCustom ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Đang xuất...
                </>
              ) : (
                `Xuất file (${customExportSelectedKeys.size} cột)`
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default EmployeeList;
