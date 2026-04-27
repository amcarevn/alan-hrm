import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesAPI, departmentsAPI, Employee, sendAccountEmailsAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { SelectBox } from '../components/LandingLayout/SelectBox';
import Pagination from '../components/Pagination';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';


const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    probation: 0,
    inactive: 0,
    male: 0,
    female: 0,
    other: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [contractTypeFilter, setContractTypeFilter] = useState<string>('all');
  const [expiringSoonFilter, setExpiringSoonFilter] = useState<string>('all');
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
  const isAdmin = user?.role === 'admin' || user?.is_super_admin === true;
  const isSuperUser = user?.is_superuser === true || user?.is_super_admin === true;

  const SEND_EMAIL_COOLDOWN_KEY = 'send_all_emails_cooldown_until';
  const COOLDOWN_DURATION = 120; // 2 phút (giây)
  const fetchEmployees = async (search = '', status = 'all', department = 'all', page = 1, pageSize = 20, contractType = 'all', expiringSoon = 'all') => {
    try {
      setLoading(true);
      const params: any = { page, page_size: pageSize };
      if (search) params.search = search;
      if (status !== 'all') params.employment_status = status;
      if (department !== 'all') params.department = department;
      if (contractType !== 'all') params.contract_type = contractType;
      
      if (expiringSoon === 'expiring') {
        const today = new Date();
        const deadline = new Date();
        deadline.setDate(today.getDate() + 5);
        params.expiring_soon_before = deadline.toISOString().split('T')[0];
        // We also send a flag so the backend knows to filter by either probation or contract end date
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

  const fetchStats = async () => {
    try {
      const statsData = await employeesAPI.stats();
      
      // Fetch active employees to calculate gender stats
      const activeEmployees = await employeesAPI.list({ 
        employment_status: 'ACTIVE',
        page_size: 10000
      });
      
      const employees = activeEmployees.results || [];
      const male = employees.filter((emp: any) => emp.is_active && emp.gender === 'M').length;
      const female = employees.filter((emp: any) => emp.is_active && emp.gender === 'F').length;
      const other = employees.filter((emp: any) => emp.is_active && emp.gender === 'O').length;
      
      setStats({
        total: statsData.total,
        active: statsData.active,
        probation: statsData.probation,
        inactive: statsData.inactive,
        male,
        female,
        other
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

  useEffect(() => {
    fetchStats();
    fetchDepartments();
  }, []);

  // Chặn scroll khi mở dialog import
  useLockBodyScroll(showImportDialog);

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
      fetchEmployees(searchTerm, statusFilter, departmentFilter, currentPage, itemsPerPage, contractTypeFilter, expiringSoonFilter);
    }, 300); // 300ms debounce delay

    setSearchTimeout(timeout);

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTerm, statusFilter, departmentFilter, currentPage, itemsPerPage, contractTypeFilter, expiringSoonFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmployees(searchTerm, statusFilter, departmentFilter, 1, itemsPerPage, contractTypeFilter, expiringSoonFilter);
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setContractTypeFilter('all');
    setExpiringSoonFilter('all');
    setCurrentPage(1);
    // Don't call fetchEmployees here, the useEffect will handle it
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
      try {
        await employeesAPI.delete(id);
        fetchEmployees(searchTerm, statusFilter, departmentFilter, currentPage, itemsPerPage, contractTypeFilter);
        fetchStats(); // Refresh stats
      } catch (err: any) {
        alert('Xóa thất bại: ' + (err.message || 'Lỗi không xác định'));
      }
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await employeesAPI.activate(id);
      fetchEmployees(searchTerm, statusFilter, departmentFilter, currentPage, itemsPerPage, contractTypeFilter);
      fetchStats(); // Refresh stats
    } catch (err: any) {
      alert('Kích hoạt thất bại: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await employeesAPI.deactivate(id);
      fetchEmployees(searchTerm, statusFilter, departmentFilter, currentPage, itemsPerPage, contractTypeFilter);
      fetchStats(); // Refresh stats
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
          case 'PROBATION': return 'Thử việc';
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

  const handleExportAll = async () => {
    try {
      const response = await employeesAPI.exportAll();
      const allEmployees = response.results;

      const getStatusLabel = (status: string) => {
        switch (status) {
          case 'ACTIVE': return 'Đang làm việc';
          case 'INACTIVE': return 'Đã nghỉ';
          case 'PROBATION': return 'Thử việc';
          case 'PAUSED': return 'Tạm dừng';
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

      const getProbationRateLabel = (rate: string) => {
        switch (rate) {
          case 'OPTION_1': return 'Tháng đầu 85%, tháng sau 85%';
          case 'OPTION_2': return 'Tháng đầu 85%, tháng sau 100%';
          case 'OPTION_3': return 'Tháng đầu 100%, tháng sau 100%';
          default: return rate;
        }
      };

      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Toàn bộ nhân viên');

      const HEADER_FILL = {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FF1E3A5F' },
      };

      sheet.columns = [
        // Thông tin cơ bản
        { header: 'Mã NV', key: 'employee_id', width: 12 },
        { header: 'Họ tên', key: 'full_name', width: 25 },
        { header: 'Giới tính', key: 'gender', width: 10 },
        { header: 'Ngày sinh', key: 'date_of_birth', width: 14 },
        { header: 'Số điện thoại', key: 'phone_number', width: 15 },
        { header: 'Email', key: 'personal_email', width: 28 },
        { header: 'Facebook', key: 'facebook_link', width: 28 },
        // CCCD / VNEID
        { header: 'Số CCCD', key: 'cccd_number', width: 16 },
        { header: 'Số CMND cũ', key: 'old_id_number', width: 14 },
        { header: 'Ngày cấp CCCD', key: 'cccd_issue_date', width: 16 },
        { header: 'Nơi cấp CCCD', key: 'cccd_issue_place', width: 20 },
        { header: 'Link CCCD/CMT', key: 'link_cccd', width: 28 },
        { header: 'Quê quán', key: 'birth_place', width: 20 },
        { header: 'Hộ khẩu thường trú', key: 'permanent_residence', width: 30 },
        { header: 'Địa chỉ hiện tại', key: 'current_address', width: 30 },
        { header: 'Tình trạng hôn nhân', key: 'marital_status', width: 20 },
        { header: 'Dân tộc', key: 'ethnicity', width: 14 },
        { header: 'Quốc tịch', key: 'nationality', width: 14 },
        // Tổ chức
        { header: 'Phòng ban', key: 'department', width: 20 },
        { header: 'Chức vụ', key: 'position', width: 20 },
        { header: 'Vùng/Miền', key: 'region', width: 14 },
        { header: 'Khối', key: 'block', width: 14 },
        { header: 'Bộ phận', key: 'section', width: 16 },
        { header: 'Cấp bậc', key: 'rank', width: 14 },
        { header: 'Địa điểm làm việc', key: 'work_location', width: 20 },
        { header: 'Team Bác sĩ', key: 'doctor_team', width: 16 },
        { header: 'Hình thức làm việc', key: 'work_form', width: 20 },
        { header: 'Loại hình làm việc', key: 'work_type', width: 18 },
        { header: 'Trình độ học vấn', key: 'education_level', width: 18 },
        // Quản lý
        { header: 'Quản lý trực tiếp', key: 'manager', width: 22 },
        { header: 'Quản lý cấp 2', key: 'manager_level_2', width: 22 },
        { header: 'Quản lý cấp 3', key: 'manager_level_3', width: 22 },
        // Hợp đồng & trạng thái
        { header: 'Trạng thái', key: 'employment_status', width: 16 },
        { header: 'Ghi chú trạng thái', key: 'employment_status_notes', width: 24 },
        { header: 'Loại hợp đồng', key: 'contract_type', width: 18 },
        { header: 'Tỉ lệ thử việc', key: 'probation_rate', width: 16 },
        { header: 'Số tháng thử việc', key: 'probation_months', width: 18 },
        { header: 'Ngày vào làm', key: 'start_date', width: 14 },
        { header: 'Ngày nghỉ việc', key: 'end_date', width: 14 },
        { header: 'Ngày kết thúc thử việc', key: 'probation_end_date', width: 22 },
        { header: 'Ngày lên chính thức', key: 'official_start_date', width: 20 },
        { header: 'Lý do nghỉ việc', key: 'termination_reason', width: 24 },
        { header: 'Tổng TG làm việc (tháng)', key: 'total_work_months', width: 24 },
        // Hồ sơ
        { header: 'Trạng thái hồ sơ', key: 'file_status', width: 18 },
        { header: 'Hạn nộp hồ sơ', key: 'file_submission_deadline', width: 16 },
        { header: 'Ngày nộp hồ sơ', key: 'file_submission_date', width: 16 },
        { header: 'Sơ yếu lý lịch', key: 'doc_resume', width: 16 },
        { header: 'Căn cước công dân', key: 'doc_cccd', width: 18 },
        { header: 'Bằng cấp', key: 'doc_degree', width: 12 },
        { header: 'Giấy khám sức khỏe', key: 'doc_health', width: 20 },
        // Lương & ngân hàng
        { header: 'Lương cơ bản', key: 'basic_salary', width: 16 },
        { header: 'Phụ cấp', key: 'allowance', width: 14 },
        { header: 'Ghi chú lương', key: 'salary_notes', width: 24 },
        { header: 'Ghi chú phụ cấp', key: 'allowance_notes', width: 24 },
        { header: 'Ngân hàng', key: 'bank_name', width: 18 },
        { header: 'Chi nhánh NH', key: 'bank_branch', width: 20 },
        { header: 'Số tài khoản', key: 'bank_account', width: 20 },
        // BHXH & thuế
        { header: 'Mã số BHXH', key: 'social_insurance_number', width: 16 },
        { header: 'Mã số thuế TNCN', key: 'tax_code', width: 16 },
        { header: 'Mã hộ gia đình', key: 'household_code', width: 16 },
        { header: 'Đóng BHXH tại', key: 'insurance_participation', width: 24 },
        { header: 'Thời điểm báo tăng', key: 'insurance_increase_time', width: 20 },
        // Nghỉ phép
        { header: 'Số ngày phép còn lại', key: 'annual_leave_balance', width: 20 },
        { header: 'Năm số dư phép', key: 'annual_leave_balance_year', width: 16 },
        // Người liên hệ khẩn cấp
        { header: 'Người LH khẩn cấp', key: 'emergency_contact_name', width: 22 },
        { header: 'Mối quan hệ', key: 'emergency_contact_relationship', width: 16 },
        { header: 'SĐT người thân', key: 'emergency_contact_phone', width: 16 },
        { header: 'Ngày sinh người thân', key: 'emergency_contact_dob', width: 20 },
        { header: 'Nghề nghiệp người thân', key: 'emergency_contact_occupation', width: 22 },
        { header: 'Địa chỉ người LH', key: 'emergency_contact_address', width: 28 },
        // Ghi chú
        { header: 'Ghi chú', key: 'notes', width: 28 },
        // Ngày tạo
        { header: 'Ngày tạo', key: 'created_at', width: 14 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = HEADER_FILL;
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      allEmployees.forEach((emp) => {
        sheet.addRow({
          employee_id: emp.employee_id,
          full_name: emp.full_name,
          gender: getGenderLabel(emp.gender),
          date_of_birth: emp.date_of_birth || '',
          phone_number: emp.phone_number || '',
          personal_email: emp.personal_email || '',
          facebook_link: emp.facebook_link || '',
          cccd_number: emp.cccd_number || '',
          old_id_number: emp.old_id_number || '',
          cccd_issue_date: emp.cccd_issue_date || '',
          cccd_issue_place: emp.cccd_issue_place || '',
          birth_place: emp.birth_place || '',
          permanent_residence: emp.permanent_residence || '',
          current_address: emp.current_address || '',
          link_cccd: (emp as any).link_cccd || '',
          marital_status: emp.marital_status || '',
          ethnicity: emp.ethnicity || '',
          nationality: emp.nationality || '',
          department: emp.department?.name || '',
          position: emp.position?.title || '',
          region: emp.region || '',
          block: emp.block || '',
          section: emp.section || '',
          rank: emp.rank || '',
          work_location: emp.work_location || '',
          doctor_team: emp.doctor_team || '',
          work_form: emp.work_form || '',
          work_type: (() => {
            try {
              const ei = typeof (emp as any).extra_info === 'string'
                ? JSON.parse((emp as any).extra_info || '{}')
                : ((emp as any).extra_info || {});
              return ei?.work_type || '';
            } catch { return ''; }
          })(),
          education_level: emp.education_level || '',
          manager: emp.manager?.full_name || emp.manager_name || '',
          manager_level_2: emp.manager_level_2?.full_name || '',
          manager_level_3: emp.manager_level_3?.full_name || '',
          employment_status: getStatusLabel(emp.employment_status),
          employment_status_notes: emp.employment_status_notes || '',
          contract_type: emp.contract_type_display || emp.contract_type || '',
          probation_rate: getProbationRateLabel(emp.probation_rate || ''),
          probation_months: emp.probation_months ?? '',
          start_date: emp.start_date || '',
          end_date: emp.end_date || '',
          probation_end_date: emp.probation_end_date || '',
          official_start_date: emp.official_start_date || '',
          termination_reason: emp.termination_reason || '',
          total_work_months: emp.total_work_months ?? '',
          file_status: emp.file_status_display || emp.file_status || '',
          file_submission_deadline: emp.file_submission_deadline || '',
          file_submission_date: emp.file_submission_date || '',
          doc_resume: emp.doc_resume ? 'x' : '',
          doc_cccd: emp.doc_cccd ? 'x' : '',
          doc_degree: emp.doc_degree ? 'x' : '',
          doc_health: emp.doc_health ? 'x' : '',
          basic_salary: emp.basic_salary ?? '',
          allowance: emp.allowance ?? '',
          salary_notes: emp.salary_notes || '',
          allowance_notes: emp.allowance_notes || '',
          bank_name: emp.bank_name || '',
          bank_branch: emp.bank_branch || '',
          bank_account: emp.bank_account || '',
          social_insurance_number: emp.social_insurance_number || '',
          tax_code: emp.tax_code || '',
          household_code: emp.household_code || '',
          insurance_participation: emp.insurance_participation || '',
          insurance_increase_time: emp.insurance_increase_time || '',
          annual_leave_balance: emp.annual_leave_balance ?? '',
          annual_leave_balance_year: emp.annual_leave_balance_year ?? '',
          emergency_contact_name: emp.emergency_contact_name || '',
          emergency_contact_relationship: emp.emergency_contact_relationship || '',
          emergency_contact_phone: emp.emergency_contact_phone || '',
          emergency_contact_dob: emp.emergency_contact_dob || '',
          emergency_contact_occupation: emp.emergency_contact_occupation || '',
          emergency_contact_address: emp.emergency_contact_address || '',
          notes: emp.notes || '',
          created_at: emp.created_at ? emp.created_at.slice(0, 10) : '',
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `xuat-toan-bo-nhan-vien-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Xuất toàn bộ thất bại: ' + (err.message || 'Lỗi không xác định'));
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

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const result = await employeesAPI.importFile(importFile);
      setImportResult(result);
      if (result.summary.created > 0 || result.summary.updated > 0) {
        fetchEmployees(searchTerm, statusFilter, departmentFilter, currentPage, itemsPerPage, contractTypeFilter);
        fetchStats();
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
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Đang làm việc</span>;
      case 'SUSPENDED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Tạm dừng</span>;
      case 'INACTIVE':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Đã nghỉ</span>;
      case 'PROBATION':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Thử việc</span>;
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
    deadline.setDate(today.getDate() + 5);

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý nhân viên</h1>
        <p className="text-gray-600 mt-2">
          Quản lý thông tin nhân viên, phòng ban, chức vụ và các thông tin liên quan.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* Statistics Section - At the top as requested */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Thống kê nhân viên</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 text-sm">Tổng số</h3>
              <p className="text-2xl font-bold text-blue-700 mt-1">{stats.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 text-sm">Đang làm việc</h3>
              <p className="text-2xl font-bold text-green-700 mt-1">{stats.active}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-medium text-yellow-900 text-sm">Thử việc</h3>
              <p className="text-2xl font-bold text-yellow-700 mt-1">{stats.probation}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-medium text-red-900 text-sm">Đã nghỉ</h3>
              <p className="text-2xl font-bold text-red-700 mt-1">{stats.inactive}</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="font-medium text-indigo-900 text-sm">Nam</h3>
              <p className="text-2xl font-bold text-indigo-700 mt-1">{stats.male}</p>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg">
              <h3 className="font-medium text-pink-900 text-sm">Nữ</h3>
              <p className="text-2xl font-bold text-pink-700 mt-1">{stats.female}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-900 text-sm">Khác</h3>
              <p className="text-2xl font-bold text-purple-700 mt-1">{stats.other}</p>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tìm kiếm nhân viên</h3>
            {loading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Đang tìm kiếm...
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tìm kiếm theo mã, tên, số điện thoại
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập mã NV, tên hoặc số điện thoại..."
                />
                <p className="text-xs text-gray-500 mt-1">Tìm kiếm tự động khi bạn gõ</p>
              </div>
              <div>
                <SelectBox<string>
                  label="Trạng thái"
                  value={statusFilter}
                  options={[
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'ACTIVE', label: 'Đang làm việc' },
                    { value: 'PROBATION', label: 'Thử việc' },
                    { value: 'INACTIVE', label: 'Đã nghỉ' },
                  ]}
                  onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
                />
              </div>
              <div>
                <SelectBox<string>
                  label="Phòng ban"
                  value={departmentFilter}
                  options={[
                    { value: 'all', label: 'Tất cả phòng ban' },
                    ...departments.map((dept) => ({ value: String(dept.id), label: dept.name })),
                  ]}
                  onChange={(v) => { setDepartmentFilter(v); setCurrentPage(1); }}
                />
              </div>
              <div>
                <SelectBox<string>
                  label="Loại hợp đồng"
                  value={contractTypeFilter}
                  options={[
                    { value: 'all', label: 'Tất cả loại hợp đồng' },
                    { value: 'PROBATION', label: 'Hợp đồng thử việc' },
                    { value: 'INTERN', label: 'Hợp đồng thực tập sinh' },
                    { value: 'COLLABORATOR', label: 'Hợp đồng cộng tác viên' },
                    { value: 'ONE_YEAR', label: 'Hợp đồng lao động 12 tháng' },
                    { value: 'TWO_YEAR', label: 'Hợp đồng lao động 24 tháng' },
                    { value: 'INDEFINITE', label: 'Hợp đồng vô thời hạn' },
                    { value: 'SERVICE', label: 'Hợp đồng dịch vụ' },
                  ]}
                  onChange={(v) => { setContractTypeFilter(v); setCurrentPage(1); }}
                />
              </div>
              <div>
                <SelectBox<string>
                  label="Hạn HĐ/Thử việc"
                  value={expiringSoonFilter}
                  options={[
                    { value: 'all', label: 'Tất cả' },
                    { value: 'expiring', label: 'Sắp hết hạn (≤ 5 ngày)' },
                  ]}
                  onChange={(v) => { setExpiringSoonFilter(v); setCurrentPage(1); }}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Danh sách nhân viên</h2>
            <p className="text-gray-500 text-sm">Tổng số: {totalCount} nhân viên</p>
          </div>
            <div className="flex space-x-2">
              {isAdmin &&(
                <button 
                  className={`px-4 py-2 rounded-md transition-colors flex items-center ${
                    isSendingEmails || emailCooldownRemaining > 0
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
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
              )}
              {(isAdmin || isSuperUser) && (
                <button
                  className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors flex items-center"
                  onClick={() => { setShowImportDialog(true); setImportFile(null); setImportResult(null); }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Nhập từ file
                </button>
              )}
              <button
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center"
                onClick={handleExport}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Xuất danh sách
              </button>
              {(isAdmin || isSuperUser) && (
                <button
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center"
                  onClick={handleExportAll}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Xuất toàn bộ
                </button>
              )}

              <button 
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
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
              onClick={() => fetchEmployees()}
              className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : employees.length === 0 ? (
          <div className="border rounded-lg overflow-hidden">
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
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
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
            <div className="border rounded-lg overflow-hidden">
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
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee.id} className={`hover:bg-gray-50 ${isExpiringSoon(employee) ? 'bg-orange-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{employee.employee_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                          {isExpiringSoon(employee) && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800" title="Sắp hết hạn hợp đồng/thử việc (≤ 5 ngày)">
                              ⚠️
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{employee.phone_number || 'Chưa có số điện thoại'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getGenderText(employee.gender)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.department?.name || 'Chưa phân phòng'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.position?.title || 'Chưa phân chức vụ'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(employee.employment_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/dashboard/employees/${employee.id}`)}
                            className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-100 transition-colors"
                          >
                            Xem
                          </button>
                          <button
                            onClick={() => navigate(`/dashboard/employees/${employee.id}/edit`)}
                            className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-100 transition-colors"
                          >
                            Sửa
                          </button>
                          {employee.employment_status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleDeactivate(employee.id)}
                              className="px-2 py-1 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded border border-amber-100 transition-colors"
                            >
                              Vô hiệu hóa
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(employee.id)}
                              className="px-2 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded border border-green-100 transition-colors"
                            >
                              Kích hoạt
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(employee.id)}
                            className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-100 transition-colors"
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
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-1">Bước 1: Tải file mẫu</p>
              <p className="text-xs text-blue-700 mb-3">
                Phòng ban/vị trí: nhập tên tiếng Việt. Cột hồ sơ: <strong>x</strong> = đã nộp, để trống = chưa nộp.
              </p>
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
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
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-10 h-10 text-gray-400 mb-3 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mb-2 text-sm text-gray-700 font-medium">
                      <span className="text-blue-600">Nhấn để chọn file</span> hoặc kéo thả vào đây
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
                <div className="relative flex items-center p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                  <div className="flex-shrink-0 bg-green-100 p-2 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-900 truncate">
                      {importFile.name}
                    </p>
                    <p className="text-xs text-green-600">
                      {(importFile.size / 1024).toFixed(1)} KB • Sẵn sàng để import
                    </p>
                  </div>
                  <button
                    onClick={() => { setImportFile(null); setImportResult(null); }}
                    className="ml-4 p-1 text-green-500 hover:text-green-700 hover:bg-green-100 rounded-full transition-colors"
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
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600">Tạo mới</p>
                    <p className="text-xl font-bold text-green-700">{importResult.summary.created}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-600">Cập nhật</p>
                    <p className="text-xl font-bold text-blue-700">{importResult.summary.updated}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-red-600">Thất bại</p>
                    <p className="text-xl font-bold text-red-700">{importResult.summary.failed}</p>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 border-b">
                      Chi tiết lỗi / cảnh báo
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
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handleImportSubmit}
              disabled={!importFile || isImporting}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                !importFile || isImporting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
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
    </>
  );
};

export default EmployeeList;
