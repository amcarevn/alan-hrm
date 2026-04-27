import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import  API_BASE_URL from '../utils/api';
import ContractSection from './ContractSection';
import {
  CheckCircleIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
  PencilIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import onboardingService from '../services/onboarding.service';
import TasksSection from './TasksSection';
import ConfirmDialog from '../components/ConfirmDialog';
import FeedbackDialog from '../components/FeedbackDialog';
import DocumentsSection from './DocumentsSection';
import { useAuth } from '../contexts/AuthContext';
import { employeesAPI, SuperAdminEmployee, departmentsAPI, sectionsAPI, positionsAPI, companyUnitsAPI, Department, Position, CompanyUnit } from '../utils/api';
import { SelectBox } from '../components/LandingLayout/SelectBox';
import {
  CITIZEN_ID_ISSUE_PLACE_OPTIONS as CCCD_ISSUE_PLACE_OPTIONS,
  PROBATION_RATE_OPTIONS, ETHNICITY_OPTIONS, NATIONALITY_OPTIONS, GENDER_OPTIONS, MARITAL_STATUS_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '../constants/onboarding';

// ============================================
// TYPE DEFINITIONS
// ============================================

type OnboardingTask = {
  id: number;
  name: string;
  description: string;
  task_type: string;
  order: number;
  deadline: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  assigned_to: number | null;
  assigned_to_name: string | null;
  completion_note: string;
  attachment: string | null;
  started_at: string | null;
  completed_at: string | null;
  is_overdue: boolean;
  days_until_deadline: number | null;
  checklist_items: ChecklistItem[];
};

type ChecklistItem = {
  id: number;
  title: string;
  description: string;
  order: number;
  is_completed: boolean;
  is_required: boolean;
  completed_at: string | null;
  completed_by: number | null;
  completed_by_name: string | null;
};

type OnboardingDocument = {
  id: number;
  document_name: string;
  document_type: 'CONTRACT' | 'REGULATION' | 'HANDBOOK' | 'FORM' | 'TRAINING' | 'SAFETY' | 'POLICY' | 'OTHER';
  description: string;
  file: string;
  file_url?: string;
  is_required: boolean;
  requires_signature: boolean;
  is_read: boolean;
  is_signed: boolean;
  signed_at: string | null;
  signature_file: string | null;
  signature_file_url?: string;
  uploaded_at: string;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  template_source?: number | null;
  template_source_name?: string | null;
};

type OnboardingDetail = {
  id: number;
  onboarding_code: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  position: { id: number; title: string } | null;
  department: { id: number; name: string } | null;
  direct_manager: { id: number; full_name: string } | null;
  hr_responsible: { id: number; full_name: string } | null;
  start_date: string;
  expected_end_date: string | null;
  contract_type: string;
  probation_period_months?: number;
  rank?: string;
  section?: string;
  doctor_team?: string;
  birth_place?: string;
  ethnicity?: string;
  nationality?: string;
  marital_status?: string;
  company_unit?: string;
  work_form?: string;
  region?: string;
  block?: string;
  employment_status_notes?: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  progress_percentage: number;
  employee: { id: number; full_name: string; employee_id: string } | null;
  created_by?: { id: number; full_name: string; employee_id: string } | null;
  tasks: OnboardingTask[];
  documents: OnboardingDocument[];
  contracts?: { id: number }[];
  created_at: string;
  notes: string;
  desired_employee_id?: string;
  citizen_id?: string;
  date_of_birth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  permanent_address?: string;
  current_address?: string;
  education_level?: string;
  university?: string;
  major?: string;
  graduation_year?: number | null;
  salary?: number | string | null;
  salary_note?: string;
  allowance?: number | string | null;
  bank_name?: string;
  bank_account?: string;
  bank_account_holder?: string;
  bank_branch?: string;
  tax_code?: string;
  tax_dependents?: number;
  social_insurance_number?: string | null;
  cv_file?: string | null;
  cv_file_url?: string | null;
  id_card_front?: string | null;
  id_card_front_url?: string | null;
  id_card_back?: string | null;
  id_card_back_url?: string | null;
  diploma_file?: string | null;
  diploma_file_url?: string | null;
  citizen_id_file?: string | null;
  citizen_id_file_url?: string | null;
  vneid_screenshot_url?: string | null;
  employee_info_completed?: boolean;
  employee_info_completed_at?: string | null;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// showError / showSuccess sẽ dùng state dialog bên trong component

const MARITAL_STATUS_LABELS: Record<string, string> = {
  SINGLE: 'Độc thân',
  MARRIED: 'Đã kết hôn',
  DIVORCED: 'Ly hôn',
  WIDOWED: 'Góa',
};

const WORK_FORM_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  PROBATION: 'Thử việc',
  DEFINITE: 'Có thời hạn',
  INDEFINITE: 'Vô thời hạn',
  SEASONAL: 'Theo mùa vụ',
  PART_TIME: 'Bán thời gian',
};

const getStatusBadge = (status: string) => {
  const statusConfig = {
    DRAFT: { label: 'Nháp', color: 'bg-gray-100 text-gray-800' },
    IN_PROGRESS: { label: 'Đang thực hiện', color: 'bg-blue-100 text-blue-800' },
    COMPLETED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
    CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-800' },
  };
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

// ============================================
// EDIT SECTION TYPES & CONSTANTS
// ============================================

type EditSection =
  | 'employee_info'
  | 'job'
  | 'personal'
  | 'education'
  | 'financial'
  | 'emp_cccd'
  | 'emp_salary'
  | 'emp_file_status'
  | 'attached_files';

const CONTRACT_OPTIONS = [
  { value: 'PROBATION', label: 'Hợp đồng thử việc' },
  { value: 'INTERN', label: 'Hợp đồng thực tập sinh' },
  { value: 'COLLABORATOR', label: 'Hợp đồng cộng tác viên' },
  { value: 'ONE_YEAR', label: 'Hợp đồng lao động 12 tháng' },
  { value: 'TWO_YEAR', label: 'Hợp đồng lao động 24 tháng' },
  { value: 'INDEFINITE', label: 'Hợp đồng vô thời hạn' },
  { value: 'SERVICE', label: 'Hợp đồng dịch vụ' },
  { value: 'CONFIDENTIALITY', label: 'Thoả thuận bảo mật' },
  { value: 'COMPANY_RULES', label: 'Cam kết đọc hiểu nội quy công ty' },
  { value: 'NURSING_COMMITMENT', label: 'Cam kết của CBNV Điều dưỡng' },
];

const withCurrentOption = (
  options: { value: string; label: string }[],
  currentValue: string | undefined
) => {
  if (!currentValue) return options;
  const exists = options.some(opt => opt.value === currentValue);
  return exists ? options : [{ value: currentValue, label: currentValue }, ...options];
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'Chưa có dữ liệu';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/** Hiển thị giá trị hoặc 'Chưa có dữ liệu', lọc cả string "NULL"/"null"/"None" */
const safeDisplay = (value: any, fallback = 'Chưa có dữ liệu'): string => {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  if (!str || str === 'NULL' || str === 'null' || str === 'None' || str === 'undefined') return fallback;
  return str;
};

// ============================================
// EDIT FIELD — defined OUTSIDE main component to prevent focus loss on re-render
// ============================================

interface EditFieldProps {
  label: string;
  name: string;
  type?: string;
  options?: { value: string; label: string }[];
  readOnly?: boolean;
  editData: Record<string, any>;
  onChange: (name: string, value: any) => void;
  placeholder?: string;
  validate?: (value: string) => string;
}

const EditField: React.FC<EditFieldProps> = ({
  label, name, type = 'text', options, readOnly = false, editData, onChange, placeholder, validate,
}) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (readOnly) return;
    const value = type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value;
    onChange(name, value);
  };

  const val = editData[name] ?? '';
  const error = validate && val ? validate(val) : '';
  const baseClass = `w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
    readOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-300 focus:ring-blue-500' :
    error ? 'border-red-400 focus:ring-red-500/20' : 'border-gray-300 focus:ring-blue-500'
  }`;

  if (options) {
    return (
      <SelectBox
        label={label}
        value={val}
        options={[{ value: '', label: '-- Chọn --' }, ...options]}
        onChange={(v) => { if (!readOnly) onChange(name, v); }}
        searchable={options.length > 8}
        placeholder="Tìm kiếm..."
      />
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={val}
          onChange={handleChange}
          rows={3}
          readOnly={readOnly}
          className={baseClass}
        />
      ) : (
        <input
          type={type}
          value={val}
          onChange={handleChange}
          readOnly={readOnly}
          placeholder={placeholder}
          className={baseClass}
        />
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const getFileType = (url: string): 'image' | 'pdf' | 'other' => {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff?)$/)) return 'image';
  if (clean.endsWith('.pdf')) return 'pdf';
  return 'other';
};

const normalizeFileUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/${url}`;
};

const OnboardingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role?.toUpperCase() || 'USER';
  const isManager = user?.employee_profile?.is_manager || user?.hrm_user?.is_manager || false;
  const isEmployee = (userRole === 'STAFF' || userRole === 'CUSTOMER') && !isManager;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingDetail | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<SuperAdminEmployee | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'tasks' | 'documents' | 'contracts'>('info');
  const [previewFile, setPreviewFile] = useState<{ url: string; label: string; type: 'image' | 'pdf' } | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [editSection, setEditSection] = useState<EditSection | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [editLoading, setEditLoading] = useState(false);

  // Dialog states
  const [dialogMsg, setDialogMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ text: string; onConfirm: () => void } | null>(null);

  const showSuccess = (msg: string) => setDialogMsg({ type: 'success', text: msg });
  const showError = (msg: string) => setDialogMsg({ type: 'error', text: msg });

  // Lock body scroll khi modal mở
  useEffect(() => {
    if (editSection) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [editSection]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [allPositions, setAllPositions] = useState<Position[]>([]);
  const [allCompanyUnits, setAllCompanyUnits] = useState<CompanyUnit[]>([]);
  const [allSections, setAllSections] = useState<Department[]>([]);

  // Stable handler — prevents EditField re-mount on every keystroke
  const handleEditFieldChange = React.useCallback((name: string, value: any) => {
    setEditData(prev => ({ ...prev, [name]: value }));
  }, []);

  useEffect(() => {
    if (isEmployee) setActiveTab('documents');
  }, [isEmployee]);

  // ============================================
  // API CALLS
  // ============================================

  const fetchOnboardingDetail = async () => {
    if (!id) {
      setError('Không tìm thấy ID onboarding');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await onboardingService.get(parseInt(id));
      if (data.progress_percentage !== undefined && data.progress_percentage !== null) {
        data.progress_percentage = typeof data.progress_percentage === 'string'
          ? parseFloat(data.progress_percentage)
          : data.progress_percentage;
      }
      setOnboarding(data as any);
      if (userRole === 'ADMIN' && (data as any).employee?.employee_id) {
        try {
          const profile = await employeesAPI.getByEmployeeId((data as any).employee.employee_id);
          setEmployeeProfile(profile);
        } catch (profileErr) {
          console.warn('Could not load employee profile:', profileErr);
          setEmployeeProfile(null);
        }
      }
    } catch (error: any) {
      console.error('❌ FETCH DETAIL ERROR:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tải thông tin quy trình onboarding';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveEmployeeInfo = () => {
    if (!id || !onboarding) return;
    setConfirmDialog({
      text: 'Xác nhận duyệt thông tin nhân viên đã điền?',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const task4 = onboarding.tasks?.find(t => t.order === 4);
          if (!task4) return;
          await onboardingService.completeTask(task4.id, 'Quản lý trực tiếp đã xác nhận thông tin nhân viên');
          showSuccess('Đã duyệt thông tin nhân viên');
          await fetchOnboardingDetail();
        } catch (error: any) {
          showError(error.response?.data?.message || 'Không thể duyệt thông tin');
        }
      },
    });
  };

  const handleCompleteProcess = () => {
    if (!id || !onboarding) return;
    setConfirmDialog({
      text: 'Bạn có chắc muốn hoàn thành quy trình onboarding này?',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await onboardingService.complete(parseInt(id));
          showSuccess('Đã hoàn thành quy trình onboarding');
          await fetchOnboardingDetail();
        } catch (error: any) {
          showError(error.response?.data?.message || 'Không thể hoàn thành quy trình onboarding');
        }
      },
    });
  };

  const openEdit = (section: EditSection, initialData: Record<string, any>) => {
    setEditSection(section);
    setEditData(initialData);
  };

  const handleSaveEdit = async () => {
    if (!id || !editSection) return;
    setEditLoading(true);
    try {
      const empId = employeeProfile?.employee_id;

      // ── Thông tin nhân viên ──
      if (editSection === 'employee_info') {
        await onboardingService.superAdminPartialUpdate(parseInt(id), {
          candidate_name: editData.full_name,
          candidate_email: editData.personal_email,
          candidate_phone: editData.phone_number,
          marital_status: editData.marital_status || null,
        });
        if (empId) {
          await employeesAPI.partialUpdateByEmployeeId(empId, {
            full_name: editData.full_name,
            gender: editData.gender,
            date_of_birth: editData.date_of_birth || null,
            phone_number: editData.phone_number,
            personal_email: editData.personal_email,
            ethnicity: editData.ethnicity,
            nationality: editData.nationality,
            marital_status: editData.marital_status || null,
            start_date: editData.start_date || null,
            end_date: editData.end_date || null,
          });
        }
        await fetchOnboardingDetail();
      }
      // ── Thông tin công việc ──
      else if (editSection === 'job') {
        const onboardingData: Record<string, any> = {};
        const employeeData: Record<string, any> = {};

        // Fields to update in onboarding
        if ('company_unit' in editData) onboardingData.company_unit = editData.company_unit;
        if ('department_id' in editData && editData.department_id) onboardingData.department = Number(editData.department_id);
        if ('position_id' in editData && editData.position_id) onboardingData.position = Number(editData.position_id);
        if ('rank' in editData) onboardingData.rank = editData.rank;
        if ('section' in editData) onboardingData.section = editData.section;
        if ('doctor_team' in editData) onboardingData.doctor_team = editData.doctor_team;
        if ('work_form' in editData) onboardingData.work_form = editData.work_form;
        if ('region' in editData) onboardingData.region = editData.region;
        if ('block' in editData) onboardingData.block = editData.block;
        if ('start_date' in editData) onboardingData.start_date = editData.start_date;

        // Fields to update in employee
        if ('department_id' in editData && editData.department_id) employeeData.department_id = Number(editData.department_id);
        if ('position_id' in editData && editData.position_id) employeeData.position_id = Number(editData.position_id);
        if ('rank' in editData) employeeData.rank = editData.rank;
        if ('section' in editData) employeeData.section = editData.section;
        if ('doctor_team' in editData) employeeData.doctor_team = editData.doctor_team;
        if ('work_form' in editData) employeeData.work_form = editData.work_form;
        if ('region' in editData) employeeData.region = editData.region;
        if ('block' in editData) employeeData.block = editData.block;
        if ('employment_status' in editData) employeeData.employment_status = editData.employment_status;
        if ('employment_status_notes' in editData) employeeData.employment_status_notes = editData.employment_status_notes;
        if ('start_date' in editData) employeeData.start_date = editData.start_date;
        if ('work_location' in editData) employeeData.work_location = editData.work_location || null;

        // work_type lưu vào employee.extra_info (JSON)
        if ('work_type' in editData) {
          const prevExtra = (() => {
            try {
              return typeof employeeProfile?.extra_info === 'string'
                ? JSON.parse(employeeProfile.extra_info || '{}')
                : (employeeProfile?.extra_info || {});
            } catch { return {}; }
          })();
          employeeData.extra_info = JSON.stringify({
            ...prevExtra,
            work_type: editData.work_type || undefined,
          });
        }

        // Update onboarding
        if (Object.keys(onboardingData).length > 0) {
          await onboardingService.superAdminPartialUpdate(parseInt(id), onboardingData);
        }

        // Update employee profile
        if (empId && Object.keys(employeeData).length > 0) {
          await employeesAPI.partialUpdateByEmployeeId(empId, employeeData);
        }

        await fetchOnboardingDetail();
      }
      // ── Giấy tờ tùy thân & địa chỉ ──
      else if (editSection === 'personal') {
        const onboardingData: Record<string, any> = {};
        const employeeData: Record<string, any> = {};

        // Fields to update in onboarding — map tên employee → tên onboarding để tránh stale
        if ('cccd_number' in editData) onboardingData.citizen_id = editData.cccd_number;
        if ('cccd_issue_date' in editData) onboardingData.citizen_id_issue_date = editData.cccd_issue_date || null;
        if ('cccd_issue_place' in editData) onboardingData.citizen_id_issue_place = editData.cccd_issue_place;
        if ('birth_place' in editData) onboardingData.birth_place = editData.birth_place;
        if ('permanent_residence' in editData) onboardingData.permanent_address = editData.permanent_residence;
        if ('current_address' in editData) onboardingData.current_address = editData.current_address;
        if ('social_insurance_number' in editData) onboardingData.social_insurance_number = editData.social_insurance_number;
        if ('tax_code' in editData) onboardingData.tax_code = editData.tax_code;

        // Fields to update in employee
        if ('cccd_number' in editData) employeeData.cccd_number = editData.cccd_number;
        if ('cccd_issue_date' in editData) employeeData.cccd_issue_date = editData.cccd_issue_date || null;
        if ('cccd_issue_place' in editData) employeeData.cccd_issue_place = editData.cccd_issue_place;
        if ('old_id_number' in editData) employeeData.old_id_number = editData.old_id_number || null;
        if ('birth_place' in editData) employeeData.birth_place = editData.birth_place;
        if ('permanent_residence' in editData) employeeData.permanent_residence = editData.permanent_residence;
        if ('current_address' in editData) employeeData.current_address = editData.current_address;
        if ('social_insurance_number' in editData) employeeData.social_insurance_number = editData.social_insurance_number;
        if ('tax_code' in editData) employeeData.tax_code = editData.tax_code;

        // Update onboarding
        if (Object.keys(onboardingData).length > 0) {
          await onboardingService.superAdminPartialUpdate(parseInt(id), onboardingData);
        }

        // Update employee profile
        if (empId && Object.keys(employeeData).length > 0) {
          await employeesAPI.partialUpdateByEmployeeId(empId, employeeData);
        }

        await fetchOnboardingDetail();
      }
      // ── Trình độ học vấn ──
      else if (editSection === 'education') {
        const onboardingData: Record<string, any> = {};
        const employeeData: Record<string, any> = {};

        // Fields to update in onboarding
        if ('education_level' in editData) onboardingData.education_level = editData.education_level;
        if ('university' in editData) onboardingData.university = editData.university;
        if ('major' in editData) onboardingData.major = editData.major;
        if ('graduation_year' in editData) onboardingData.graduation_year = editData.graduation_year || null;

        // Fields to update in employee (extra_info)
        if ('education_level' in editData) employeeData.education_level = editData.education_level;

        // Update onboarding
        if (Object.keys(onboardingData).length > 0) {
          await onboardingService.superAdminPartialUpdate(parseInt(id), onboardingData);
        }

        // Update employee profile
        if (empId && (Object.keys(employeeData).length > 0 || ('university' in editData || 'major' in editData || 'graduation_year' in editData))) {
          const updateData = { ...employeeData };
          if ('university' in editData || 'major' in editData || 'graduation_year' in editData) {
            updateData.extra_info = JSON.stringify({
              ...(() => {
                try {
                  return typeof employeeProfile?.extra_info === 'string'
                    ? JSON.parse(employeeProfile.extra_info || '{}')
                    : (employeeProfile?.extra_info || {});
                } catch {
                  return {};
                }
              })(),
              university: editData.university || undefined,
              major: editData.major || undefined,
              graduation_year: editData.graduation_year || undefined,
            });
          }
          await employeesAPI.partialUpdateByEmployeeId(empId, updateData);
        }

        await fetchOnboardingDetail();
      }
      // ── Thông tin tài chính & ngân hàng ──
      else if (editSection === 'financial') {
        const onboardingData: Record<string, any> = {};
        const employeeData: Record<string, any> = {};

        // Fields to update in onboarding
        if ('bank_name' in editData) onboardingData.bank_name = editData.bank_name;
        if ('bank_account' in editData) onboardingData.bank_account = editData.bank_account;
        if ('bank_account_holder' in editData) onboardingData.bank_account_holder = editData.bank_account_holder;
        if ('bank_branch' in editData) onboardingData.bank_branch = editData.bank_branch;

        // Fields to update in employee
        if ('bank_name' in editData) employeeData.bank_name = editData.bank_name;
        if ('bank_account' in editData) employeeData.bank_account = editData.bank_account;
        if ('bank_branch' in editData) employeeData.bank_branch = editData.bank_branch;

        // Update onboarding
        if (Object.keys(onboardingData).length > 0) {
          await onboardingService.superAdminPartialUpdate(parseInt(id), onboardingData);
        }

        // Update employee profile
        if (empId && Object.keys(employeeData).length > 0) {
          const updateData = { ...employeeData };
          if ('bank_account_holder' in editData) {
            updateData.extra_info = JSON.stringify({
              ...(() => {
                try {
                  return typeof employeeProfile?.extra_info === 'string'
                    ? JSON.parse(employeeProfile.extra_info || '{}')
                    : (employeeProfile?.extra_info || {});
                } catch {
                  return {};
                }
              })(),
              bank_account_holder: editData.bank_account_holder || undefined,
            });
          }
          await employeesAPI.partialUpdateByEmployeeId(empId, updateData);
        }

        await fetchOnboardingDetail();
      }
      // ── CCCD (emp_cccd) ──
      else if (editSection === 'emp_cccd') {
        const employeeData: Record<string, any> = {};

        if ('cccd_number' in editData) employeeData.cccd_number = editData.cccd_number;
        if ('cccd_issue_date' in editData) employeeData.cccd_issue_date = editData.cccd_issue_date || null;
        if ('cccd_issue_place' in editData) employeeData.cccd_issue_place = editData.cccd_issue_place;
        if ('birth_place' in editData) employeeData.birth_place = editData.birth_place;
        if ('permanent_residence' in editData) employeeData.permanent_residence = editData.permanent_residence;

        if (empId && Object.keys(employeeData).length > 0) {
          await employeesAPI.partialUpdateByEmployeeId(empId, employeeData);
        }

        await fetchOnboardingDetail();
      }
      // ── Lương & Hợp đồng (emp_salary) ──
      else if (editSection === 'emp_salary') {
        const employeeData: Record<string, any> = {};

        if ('basic_salary' in editData) employeeData.basic_salary = editData.basic_salary || null;
        if ('allowance' in editData) employeeData.allowance = editData.allowance || null;
        if ('contract_type' in editData) employeeData.contract_type = editData.contract_type;
        if ('probation_months' in editData) employeeData.probation_months = editData.probation_months || null;
        // probation_end_date do BE tự tính từ start_date + probation_months - 1 ngày, FE không gửi lên
        if ('probation_rate' in editData) employeeData.probation_rate = editData.probation_rate;

        if (empId && Object.keys(employeeData).length > 0) {
          await employeesAPI.partialUpdateByEmployeeId(empId, employeeData);
        }
      }
      // ── Hồ sơ đính kèm (attached_files) ──
      else if (editSection === 'attached_files') {
        // Files thuộc onboarding: diploma_file, citizen_id_file
        const onboardingFd = new FormData();
        if (editData.diploma_file instanceof File) onboardingFd.append('diploma_file', editData.diploma_file);
        if (editData.citizen_id_file instanceof File) onboardingFd.append('citizen_id_file', editData.citizen_id_file);

        if ([...onboardingFd.keys()].length > 0 && id) {
          await onboardingService.superAdminUploadFiles(parseInt(id), onboardingFd);
        }

        // File thuộc employee: vneid_screenshot
        if (editData.vneid_screenshot instanceof File && empId) {
          const employeeFd = new FormData();
          employeeFd.append('vneid_screenshot', editData.vneid_screenshot);
          await employeesAPI.uploadFilesByEmployeeId(empId, employeeFd);
        }

        // Facebook link lưu trong employee.extra_info (JSON)
        if ('facebook_link' in editData && empId) {
          const prevExtra = (() => {
            try {
              return typeof employeeProfile?.extra_info === 'string'
                ? JSON.parse(employeeProfile.extra_info || '{}')
                : (employeeProfile?.extra_info || {});
            } catch {
              return {};
            }
          })();
          const nextExtra = { ...prevExtra, facebook_link: editData.facebook_link || undefined };
          await employeesAPI.partialUpdateByEmployeeId(empId, {
            extra_info: JSON.stringify(nextExtra),
          } as any);
        }

        if (empId) {
        }

        await fetchOnboardingDetail();
      }
      // ── Trạng thái hồ sơ (emp_file_status) ──
      else if (editSection === 'emp_file_status') {
        const employeeData: Record<string, any> = {};

        if ('file_status' in editData) employeeData.file_status = editData.file_status;
        if ('file_review_notes' in editData) employeeData.file_review_notes = editData.file_review_notes;

        if (empId && Object.keys(employeeData).length > 0) {
          await employeesAPI.partialUpdateByEmployeeId(empId, employeeData);
        }
      }

      setEditSection(null);
      showSuccess('Đã cập nhật thành công');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Không thể cập nhật thông tin');
    } finally {
      setEditLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboardingDetail();
  }, [id]);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [deptRes, posRes, cuRes, secRes] = await Promise.all([
          departmentsAPI.list({ page_size: 1000 }),
          positionsAPI.list({ page_size: 1000 }),
          companyUnitsAPI.list({ active_only: true, page_size: 100 }),
          sectionsAPI.list({ page_size: 1000 }),
        ]);
        setAllDepartments(deptRes.results || []);
        setAllPositions(posRes.results || []);
        setAllCompanyUnits(Array.isArray(cuRes) ? cuRes : (cuRes.results || []));
        setAllSections(secRes.results || []);
        console.log('[MasterData] CompanyUnits:', Array.isArray(cuRes) ? cuRes.length : cuRes.results?.length);
        console.log('[MasterData] Departments:', deptRes.results?.length, 'Positions:', posRes.results?.length, 'Sections:', secRes.results?.length);
      } catch (e) {
        console.warn('Could not load master data:', e);
      }
    };
    loadMasterData();
  }, []);

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderInfoTab = () => {
    if (!onboarding) return null;

    // Parse extra_info một lần để dùng nhiều chỗ
    const extraInfo = (() => {
      try {
        return typeof employeeProfile?.extra_info === 'string'
          ? JSON.parse(employeeProfile.extra_info || '{}')
          : (employeeProfile?.extra_info || {});
      } catch {
        return {};
      }
    })();
    const vneidScreenshotUrl =
      onboarding.vneid_screenshot_url ||
      (employeeProfile as any)?.vneid_screenshot_url ||
      normalizeFileUrl(employeeProfile?.vneid_screenshot);

    // Helper: Section header with edit button
    const SectionHeader: React.FC<{ title: string; color: string; onEdit?: () => void }> = ({ title, color, onEdit }) => {
      const borderColors: Record<string, string> = { blue: 'border-blue-300', indigo: 'border-indigo-300', amber: 'border-amber-300', emerald: 'border-emerald-300', rose: 'border-rose-300', purple: 'border-purple-300', gray: 'border-gray-300' };
      const textColors: Record<string, string> = { blue: 'text-blue-700', indigo: 'text-indigo-700', amber: 'text-amber-700', emerald: 'text-emerald-700', rose: 'text-rose-700', purple: 'text-purple-700', gray: 'text-gray-700' };
      return (
        <div className={`flex items-center justify-between pb-3 mb-4 border-b-2 ${borderColors[color] || 'border-gray-200'}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wide ${textColors[color] || 'text-gray-700'}`}>{title}</h3>
          {onEdit && userRole === 'ADMIN' && (
            <button onClick={onEdit} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
              <PencilIcon className="w-3.5 h-3.5" />
              Chỉnh sửa
            </button>
          )}
        </div>
      );
    };

    // Helper: Field display — inline label: value
    const InfoField: React.FC<{ label: string; value?: string | null; highlight?: boolean; full?: boolean }> = ({ label, value, highlight, full }) => (
      <div className={`flex items-baseline justify-between py-2.5 border-b border-gray-100 ${full ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
        <span className="text-sm text-gray-500 shrink-0 mr-3">{label}:</span>
        <span className={`text-sm text-right truncate max-w-[60%] ${value && value !== 'Chưa có dữ liệu' ? (highlight ? 'font-semibold text-indigo-600' : 'font-semibold text-gray-800') : 'text-gray-300 italic'}`}>
          {value || '—'}
        </span>
      </div>
    );

    return (
      <div className="space-y-6">

        {/* ── Thông tin nhân viên ── */}
        <div className="bg-white rounded-xl border p-5">
          <SectionHeader title="Thông tin nhân viên" color="blue" onEdit={() => openEdit('employee_info', {
            employee_id: employeeProfile?.employee_id ?? onboarding.employee?.employee_id ?? '',
            full_name: employeeProfile?.full_name ?? onboarding.candidate_name ?? '',
            personal_email: employeeProfile?.personal_email ?? onboarding.candidate_email ?? '',
            phone_number: employeeProfile?.phone_number ?? onboarding.candidate_phone ?? '',
            gender: employeeProfile?.gender ?? '',
            date_of_birth: employeeProfile?.date_of_birth ?? '',
            ethnicity: employeeProfile?.ethnicity || onboarding.ethnicity || 'Chưa có dữ liệu',
            nationality: employeeProfile?.nationality || onboarding.nationality || 'Chưa có dữ liệu',
            marital_status: (employeeProfile as any)?.marital_status ?? (onboarding as any)?.marital_status ?? '',
            start_date: employeeProfile?.start_date ?? onboarding.start_date ?? '',
            end_date: (employeeProfile as any)?.end_date ?? '',
          })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
            <InfoField label="Mã nhân viên" value={employeeProfile?.employee_id ?? onboarding.employee?.employee_id ?? 'Chưa có'} highlight />
            <InfoField label="Họ và tên" value={employeeProfile?.full_name ?? onboarding.candidate_name} />
            <InfoField label="Email" value={employeeProfile?.personal_email ?? onboarding.candidate_email} />
            <InfoField label="Số điện thoại" value={employeeProfile?.phone_number ?? onboarding.candidate_phone} />
            <InfoField label="Giới tính" value={
              employeeProfile?.gender
                ? (employeeProfile.gender === 'M' ? 'Nam' : employeeProfile.gender === 'F' ? 'Nữ' : 'Khác')
                : onboarding.gender
                ? (onboarding.gender === 'MALE' ? 'Nam' : onboarding.gender === 'FEMALE' ? 'Nữ' : 'Khác')
                : null
            } />
            <InfoField label="Ngày sinh" value={employeeProfile?.date_of_birth ? formatDate(employeeProfile.date_of_birth) : formatDate(onboarding.date_of_birth)} />
            <InfoField label="Dân tộc" value={safeDisplay((employeeProfile as any)?.ethnicity || onboarding.ethnicity)} />
            <InfoField label="Quốc tịch" value={safeDisplay((employeeProfile as any)?.nationality || onboarding.nationality)} />
            <InfoField label="Hôn nhân" value={(() => {
              const ms = employeeProfile?.marital_status || (onboarding as any)?.marital_status;
              return ms ? (MARITAL_STATUS_LABELS[ms] || ms) : null;
            })()} />
            <InfoField label="Ngày bắt đầu làm việc" value={formatDate(employeeProfile?.start_date ?? onboarding.start_date)} />
            <InfoField label="Ngày nghỉ việc" value={(employeeProfile as any)?.end_date ? formatDate((employeeProfile as any).end_date) : null} />
          </div>
        </div>

        {/* ── Thông tin công việc ── */}
        <div className="bg-white rounded-xl border p-5">
          <SectionHeader title="Thông tin công việc" color="indigo" onEdit={() => openEdit('job', {
            company_unit: onboarding.company_unit ?? '',
            department_id: onboarding.department?.id ? String(onboarding.department.id) : '',
            department_name: (employeeProfile as any)?.department?.name ?? onboarding.department?.name ?? '',
            position_id: (employeeProfile as any)?.position?.id ? String((employeeProfile as any).position.id) : (onboarding.position?.id ? String(onboarding.position.id) : ''),
            position_title: (employeeProfile as any)?.position?.title ?? onboarding.position?.title ?? '',
            rank: employeeProfile?.rank ?? onboarding.rank ?? '',
            section: employeeProfile?.section ?? onboarding.section ?? '',
            doctor_team: employeeProfile?.doctor_team ?? onboarding.doctor_team ?? '',
            work_form: employeeProfile?.work_form ?? onboarding.work_form ?? '',
            region: employeeProfile?.region ?? onboarding.region ?? '',
            block: employeeProfile?.block ?? onboarding.block ?? '',
            employment_status: employeeProfile?.employment_status ?? 'ACTIVE',
            employment_status_notes: (employeeProfile as any)?.employment_status_notes ?? onboarding.employment_status_notes ?? '',
            start_date: employeeProfile?.start_date ?? onboarding.start_date ?? '',
            work_location: (employeeProfile as any)?.work_location ?? '',
            work_type: extraInfo.work_type ?? '',
          })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
            <InfoField label="Đơn vị" value={allCompanyUnits.find(cu => cu.code === onboarding.company_unit)?.name || safeDisplay(onboarding.company_unit)} />
            <InfoField label="Phòng ban" value={safeDisplay((employeeProfile as any)?.department?.name || onboarding.department?.name)} />
            <InfoField label="Vị trí" value={safeDisplay((employeeProfile as any)?.position?.title || onboarding.position?.title)} />
            <InfoField label="Cấp bậc" value={safeDisplay(employeeProfile?.rank || onboarding.rank)} />
            <InfoField label="Bộ phận" value={safeDisplay(employeeProfile?.section || onboarding.section)} />
            <InfoField label="Quản lý" value={safeDisplay(onboarding.direct_manager?.full_name)} />
            <InfoField label="Team bác sĩ" value={safeDisplay(employeeProfile?.doctor_team || onboarding.doctor_team)} />
            <InfoField label="Ngày bắt đầu" value={employeeProfile?.start_date ? formatDate(employeeProfile.start_date) : formatDate(onboarding.start_date)} />
            <InfoField label="Hình thức" value={(employeeProfile?.work_form || onboarding.work_form) ? (WORK_FORM_LABELS[employeeProfile?.work_form || onboarding.work_form!] || employeeProfile?.work_form || onboarding.work_form) : null} />
            <InfoField label="Loại hình làm việc" value={safeDisplay(extraInfo.work_type)} />
            <InfoField label="Địa điểm làm việc" value={safeDisplay((employeeProfile as any)?.work_location_display || (employeeProfile as any)?.work_location)} />
            <InfoField label="Vùng/Miền" value={safeDisplay(employeeProfile?.region || onboarding.region)} />
            <InfoField label="Khối" value={safeDisplay(employeeProfile?.block || onboarding.block)} />
            <InfoField label="Trạng thái" value={
              employeeProfile?.employment_status === 'PAUSED' ? 'Tạm dừng' :
              employeeProfile?.employment_status === 'INACTIVE' ? 'Đã nghỉ' :
              'Đang làm việc'
            } />
            <InfoField label="Ghi chú công việc" value={safeDisplay((employeeProfile as any)?.employment_status_notes || onboarding.employment_status_notes)} full />
          </div>
        </div>

        {/* Employee-filled sections — only visible to admin */}
        {userRole === 'ADMIN' && onboarding.employee_info_completed && (
          <>
            {/* ── Giấy tờ tùy thân & địa chỉ ── */}
            <div className="bg-white rounded-xl border p-5">
              <SectionHeader title="Giấy tờ tùy thân & địa chỉ" color="amber" onEdit={() => openEdit('personal', {
                cccd_number: employeeProfile?.cccd_number ?? onboarding.citizen_id ?? '',
                cccd_issue_date: employeeProfile?.cccd_issue_date ?? (onboarding as any).citizen_id_issue_date ?? '',
                cccd_issue_place: employeeProfile?.cccd_issue_place ?? (onboarding as any).citizen_id_issue_place ?? '',
                old_id_number: (employeeProfile as any)?.old_id_number ?? extraInfo.old_id_number ?? '',
                birth_place: employeeProfile?.birth_place ?? onboarding.birth_place ?? '',
                permanent_residence: employeeProfile?.permanent_residence ?? onboarding.permanent_address ?? '',
                current_address: employeeProfile?.current_address ?? onboarding.current_address ?? '',
                social_insurance_number: employeeProfile?.social_insurance_number ?? onboarding.social_insurance_number ?? '',
                tax_code: employeeProfile?.tax_code ?? onboarding.tax_code ?? '',
              })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                <InfoField label="Số CCCD" value={safeDisplay(employeeProfile?.cccd_number || onboarding.citizen_id)} />
                <InfoField label="Số CMND cũ" value={safeDisplay((employeeProfile as any)?.old_id_number || extraInfo.old_id_number)} />
                <InfoField label="Ngày cấp" value={(() => {
                  const d = employeeProfile?.cccd_issue_date || (onboarding as any).citizen_id_issue_date;
                  return d ? formatDate(d) : null;
                })()} />
                <InfoField label="Nơi cấp" value={(() => {
                  const place = employeeProfile?.cccd_issue_place || (onboarding as any).citizen_id_issue_place;
                  if (place === 'POLICE_ADMIN') return 'Cục CS QLHC về TTXH';
                  if (place === 'MINISTRY_PUBLIC_SECURITY') return 'Bộ Công An';
                  return place || null;
                })()} />
                <InfoField label="Nơi khai sinh" value={safeDisplay(employeeProfile?.birth_place || onboarding.birth_place)} />
                <InfoField label="Mã BHXH" value={safeDisplay(employeeProfile?.social_insurance_number || onboarding.social_insurance_number)} />
                <InfoField label="Mã thuế" value={safeDisplay(employeeProfile?.tax_code || onboarding.tax_code)} />
                <InfoField label="Địa chỉ thường trú" value={safeDisplay(employeeProfile?.permanent_residence || onboarding.permanent_address)} full />
                <InfoField label="Địa chỉ hiện tại" value={safeDisplay(employeeProfile?.current_address || onboarding.current_address)} full />
              </div>
            </div>

            {/* ── Trình độ học vấn ── */}
            <div className="bg-white rounded-xl border p-5">
              <SectionHeader title="Trình độ học vấn" color="emerald" onEdit={() => openEdit('education', {
                education_level: employeeProfile?.education_level ?? onboarding.education_level ?? '',
                university: (extraInfo.university || onboarding.university) ?? '',
                major: (extraInfo.major || onboarding.major) ?? '',
                graduation_year: (extraInfo.graduation_year || onboarding.graduation_year) ?? '',
              })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                <InfoField label="Trình độ" value={safeDisplay(employeeProfile?.education_level || onboarding.education_level)} />
                <InfoField label="Trường" value={safeDisplay(extraInfo.university || onboarding.university)} />
                <InfoField label="Chuyên ngành" value={safeDisplay(extraInfo.major || onboarding.major)} />
                <InfoField label="Năm tốt nghiệp" value={String(extraInfo.graduation_year || onboarding.graduation_year || '') || null} />
              </div>
            </div>

            {/* ── Thông tin tài chính & ngân hàng ── */}
            <div className="bg-white rounded-xl border p-5">
              <SectionHeader title="Tài chính & ngân hàng" color="purple" onEdit={() => openEdit('financial', {
                bank_name: employeeProfile?.bank_name ?? onboarding.bank_name ?? '',
                bank_account: employeeProfile?.bank_account ?? onboarding.bank_account ?? '',
                bank_account_holder: (extraInfo.bank_account_holder || onboarding.bank_account_holder) ?? '',
                bank_branch: employeeProfile?.bank_branch ?? onboarding.bank_branch ?? '',
              })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                <InfoField label="Ngân hàng" value={safeDisplay(employeeProfile?.bank_name || onboarding.bank_name)} />
                <InfoField label="Số tài khoản" value={safeDisplay(employeeProfile?.bank_account || onboarding.bank_account)} />
                <InfoField label="Chủ tài khoản" value={safeDisplay(extraInfo.bank_account_holder || onboarding.bank_account_holder)} />
                <InfoField label="Chi nhánh" value={safeDisplay(employeeProfile?.bank_branch || onboarding.bank_branch)} />
              </div>
            </div>

            {/* ── Hồ sơ đính kèm ── */}
            {(onboarding.cv_file || onboarding.id_card_front || onboarding.id_card_back || onboarding.diploma_file || onboarding.citizen_id_file || onboarding.citizen_id_file_url || vneidScreenshotUrl || extraInfo.facebook_link) && (
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    Hồ sơ đính kèm
                  </h3>
                  {userRole === 'ADMIN' && (
                    <button
                      onClick={() => openEdit('attached_files', {
                        diploma_file: null,
                        citizen_id_file: null,
                        vneid_screenshot: null,
                        facebook_link: extraInfo.facebook_link ?? '',
                      })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                      Chỉnh sửa
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Files */}
                  {([
                    { key: 'cv_file', label: 'CV', url: onboarding.cv_file_url || onboarding.cv_file },
                    { key: 'id_card_front', label: 'CCCD mặt trước', url: onboarding.id_card_front_url || onboarding.id_card_front },
                    { key: 'id_card_back', label: 'CCCD mặt sau', url: onboarding.id_card_back_url || onboarding.id_card_back },
                    { key: 'diploma_file', label: 'Bằng cấp', url: onboarding.diploma_file_url || onboarding.diploma_file },
                    { key: 'citizen_id_file', label: 'File CMND/CCCD', url: onboarding.citizen_id_file_url || onboarding.citizen_id_file },
                    { key: 'vneid_screenshot', label: 'Ảnh chụp màn hình VNeID', url: vneidScreenshotUrl },
                  ] as { key: string; label: string; url: string | null | undefined }[])
                    .filter(f => f.url)
                    .map(f => {
                      const fileUrl = f.url as string;
                      const fileType = getFileType(fileUrl);
                      const isImage = fileType === 'image' && !imgErrors[f.key];
                      return (
                        <div key={f.key} className="border rounded-lg overflow-hidden">
                          {isImage ? (
                            <div
                              className="h-32 bg-gray-100 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                              onClick={() => setPreviewFile({ url: fileUrl, label: f.label, type: 'image' })}
                            >
                              <img
                                src={fileUrl}
                                alt={f.label}
                                className="object-cover w-full h-full"
                                onError={() => setImgErrors(prev => ({ ...prev, [f.key]: true }))}
                              />
                            </div>
                          ) : (
                            <div
                              className="h-32 bg-red-50 flex flex-col items-center justify-center cursor-pointer hover:bg-red-100 transition-colors"
                              onClick={() => setPreviewFile({ url: fileUrl, label: f.label, type: fileType === 'image' ? 'image' : 'pdf' })}
                            >
                              <DocumentTextIcon className="w-10 h-10 text-red-500 mb-1" />
                              <span className="text-xs text-red-600 font-medium">PDF</span>
                            </div>
                          )}
                          <div className="p-2 bg-white flex items-center justify-between">
                            <label className="text-xs text-gray-600 font-medium truncate">{f.label}</label>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => setPreviewFile({ url: fileUrl, label: f.label, type: fileType === 'image' ? 'image' : 'pdf' })}
                                className="p-1 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Xem trước"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded text-gray-500 hover:bg-gray-100 transition-colors"
                                title="Mở tab mới"
                              >
                                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  }

                  {!vneidScreenshotUrl && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="h-32 bg-gray-50 flex flex-col items-center justify-center">
                        <span className="text-3xl mb-1">🖼️</span>
                        <span className="text-xs text-gray-500 font-medium px-2 text-center">
                          Chưa tải ảnh VNeID
                        </span>
                      </div>
                      <div className="p-2 bg-white">
                        <label className="text-xs text-gray-600 font-medium truncate">
                          Ảnh chụp màn hình VNeID
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Facebook — cùng grid với các file */}
                  {extraInfo.facebook_link && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="h-32 bg-blue-50 flex flex-col items-center justify-center">
                        <span className="text-3xl mb-1">👤</span>
                        <span className="text-xs text-blue-500 font-medium px-2 text-center truncate w-full">
                          Facebook
                        </span>
                      </div>
                      <div className="p-2 bg-white flex items-center justify-between">
                        <label className="text-xs text-gray-600 font-medium truncate">Facebook</label>
                        <a
                          href={extraInfo.facebook_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-gray-500 hover:bg-gray-100 transition-colors"
                          title="Mở Facebook"
                        >
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Admin-only: remaining employee profile sections */}
        {userRole === 'ADMIN' && employeeProfile && (
          <>
            {/* Salary & Contract */}
            {(employeeProfile.basic_salary != null || employeeProfile.contract_type) && (
              <div className="bg-white rounded-xl border p-5">
                <SectionHeader title="Lương & Hợp đồng" color="rose" onEdit={() => openEdit('emp_salary', {
                  basic_salary: employeeProfile.basic_salary ?? '',
                  allowance: employeeProfile.allowance ?? '',
                  contract_type: employeeProfile.contract_type ?? '',
                  probation_months: employeeProfile.probation_months ?? '',
                  probation_end_date: employeeProfile.probation_end_date ?? '',
                  probation_rate: (employeeProfile as any).probation_rate ?? '',
                })} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                  <InfoField label="Lương cơ bản" value={employeeProfile.basic_salary != null ? `${Number(employeeProfile.basic_salary).toLocaleString('vi-VN')} đ` : null} highlight />
                  <InfoField label="Phụ cấp" value={employeeProfile.allowance != null ? `${Number(employeeProfile.allowance).toLocaleString('vi-VN')} đ` : null} />
                  <InfoField label="Loại hợp đồng" value={employeeProfile.contract_type ? (employeeProfile.contract_type_display || CONTRACT_TYPE_LABELS[employeeProfile.contract_type] || employeeProfile.contract_type) : null} />
                  <InfoField label="Thử việc" value={employeeProfile.probation_months != null ? `${employeeProfile.probation_months} tháng` : null} />
                  <InfoField label="Kết thúc thử việc" value={employeeProfile.probation_end_date ? formatDate(employeeProfile.probation_end_date) : null} />
                  <InfoField label="Tỉ lệ thử việc" value={(employeeProfile as any).probation_rate ? (PROBATION_RATE_OPTIONS.find(o => o.value === (employeeProfile as any).probation_rate)?.label || (employeeProfile as any).probation_rate) : null} />
                </div>
              </div>
            )}

            {/* File Status */}
            <div className="bg-white rounded-xl border p-5">
              <SectionHeader title="Trạng thái hồ sơ" color="gray" onEdit={() => openEdit('emp_file_status', {
                file_status: employeeProfile?.file_status ?? 'NOT_SUBMITTED',
                file_review_notes: (employeeProfile as any)?.file_review_notes ?? '',
              })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 mb-4">
                <InfoField label="Trạng thái" value={employeeProfile?.file_status_display || employeeProfile?.file_status || 'Chưa nộp'} />
                <InfoField label="Ghi chú" value={(employeeProfile as any)?.file_review_notes || null} full />
              </div>
            </div>

            {/* Liên hệ khẩn cấp */}
            {(employeeProfile as any).emergency_contact_name && (
              <div className="bg-white rounded-xl border p-5">
                <SectionHeader title="Liên hệ khẩn cấp" color="rose" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                  <InfoField label="Họ tên" value={safeDisplay((employeeProfile as any).emergency_contact_name)} />
                  <InfoField label="Quan hệ" value={safeDisplay((employeeProfile as any).emergency_contact_relationship)} />
                  <InfoField label="SĐT" value={safeDisplay((employeeProfile as any).emergency_contact_phone)} />
                  <InfoField label="Ngày sinh" value={(employeeProfile as any).emergency_contact_dob ? formatDate((employeeProfile as any).emergency_contact_dob) : null} />
                  <InfoField label="Nghề nghiệp" value={safeDisplay((employeeProfile as any).emergency_contact_occupation)} />
                  <InfoField label="Địa chỉ" value={safeDisplay((employeeProfile as any).emergency_contact_address)} full />
                </div>
              </div>
            )}
          </>
        )}

        {/* Chờ duyệt */}
        {(() => {
          const task4 = onboarding.tasks?.find(t => t.order === 4);
          if (!task4 || task4.status !== 'IN_PROGRESS') return null;
          return (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-amber-700 mb-2">Chờ duyệt thông tin nhân viên</h3>
              <p className="text-amber-700 text-sm mb-4">Nhân viên đã điền xong thông tin. Vui lòng kiểm tra và xác nhận.</p>
              <button onClick={handleApproveEmployeeInfo} className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
                <CheckCircleIcon className="w-4 h-4" />
                Duyệt thông tin
              </button>
            </div>
          );
        })()}

        {/* Ghi chú */}
        {onboarding.notes && (
          <div className="bg-white rounded-xl border p-5">
            <SectionHeader title="Ghi chú" color="gray" />
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{onboarding.notes}</p>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // EDIT MODAL
  // ============================================

  const renderEditModal = () => {
    if (!editSection) return null;

    const sectionTitles: Record<EditSection, string> = {
      employee_info: 'Sửa thông tin nhân viên',
      job: 'Sửa thông tin công việc',
      personal: 'Sửa giấy tờ tùy thân & địa chỉ',
      education: 'Sửa trình độ học vấn',
      financial: 'Sửa thông tin tài chính & ngân hàng',
      emp_cccd: 'Sửa thông tin CCCD / Giấy tờ tùy thân',
      emp_salary: 'Sửa lương & hợp đồng',
      emp_file_status: 'Sửa trạng thái hồ sơ',
      attached_files: 'Sửa hồ sơ đính kèm',
    };

    // Helper để render EditField ngắn gọn hơn
    const ef = (
      label: string,
      name: string,
      type?: string,
      options?: { value: string; label: string }[],
      readOnly?: boolean,
      placeholder?: string,
      validate?: (v: string) => string,
    ) => (
      <EditField
        key={name}
        placeholder={placeholder}
        validate={validate}
        label={label}
        name={name}
        type={type}
        options={options}
        readOnly={readOnly}
        editData={editData}
        onChange={handleEditFieldChange}
      />
    );

    const renderFields = () => {
      switch (editSection) {

        // ── Thông tin nhân viên ──
        case 'employee_info':
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Mã nhân viên', 'employee_id', 'text', undefined, true)}
                {ef('Họ và tên', 'full_name', undefined, undefined, undefined, 'Nguyễn Văn A')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Email cá nhân', 'personal_email', 'email', undefined, undefined, 'example@email.com', (v) =>
                  v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Email không hợp lệ' : ''
                )}
                {ef('Số điện thoại', 'phone_number', undefined, undefined, undefined, '0123456789', (v) => {
                  if (!/^\d*$/.test(v)) return 'Chỉ được nhập số';
                  if (v.length > 10) return 'Tối đa 10 chữ số';
                  if (v.length > 0 && v.length < 10) return `Còn thiếu ${10 - v.length} số`;
                  return '';
                })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Giới tính', 'gender', undefined, GENDER_OPTIONS)}
                {ef('Ngày sinh', 'date_of_birth', 'date')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Dân tộc', 'ethnicity', undefined, ETHNICITY_OPTIONS.map(e => ({ value: e, label: e })))}
                {ef('Quốc tịch', 'nationality', undefined, NATIONALITY_OPTIONS.map(n => ({ value: n, label: n })))}
              </div>
              {ef('Tình trạng hôn nhân', 'marital_status', undefined, MARITAL_STATUS_OPTIONS)}
              {ef('Ngày bắt đầu làm việc', 'start_date', 'date')}
              {ef('Ngày nghỉ việc', 'end_date', 'date')}
            </div>
          );

        // ── Thông tin công việc ──
        case 'job':
          const departmentSelectOptions = withCurrentOption(
            allDepartments.map(dep => ({ value: String(dep.id), label: dep.name })),
            editData.department_id
          );
          const positionSelectOptions = withCurrentOption(
            allPositions.map(pos => ({ value: String(pos.id), label: pos.title })),
            editData.position_id
          );
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Đơn vị làm việc', 'company_unit', undefined,
                  allCompanyUnits.map(cu => ({ value: cu.code, label: cu.name }))
                )}
                {ef('Phòng ban', 'department_id', undefined, departmentSelectOptions)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Vị trí', 'position_id', undefined, positionSelectOptions)}
                {ef('Cấp bậc', 'rank')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Bộ phận', 'section', undefined, withCurrentOption(allSections.map(s => ({ value: s.name, label: s.name })), editData.section))}
                {ef('Team Bác sĩ', 'doctor_team')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Hình thức làm việc', 'work_form', undefined, [
                  { value: 'FULL_TIME', label: 'Full-time' },
                  { value: 'PART_TIME', label: 'Part-time' },
                ])}
                {ef('Loại hình làm việc', 'work_type', undefined, undefined, undefined, 'Full-time, Part-time, ...')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Địa điểm làm việc', 'work_location', undefined, WORK_LOCATION_OPTIONS)}
                {ef('Ngày bắt đầu làm việc', 'start_date', 'date')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Vùng/Miền', 'region', undefined, [
                  { value: 'Miền Bắc', label: 'Miền Bắc' },
                  { value: 'Miền Nam', label: 'Miền Nam' },
                ])}
                {ef('Khối', 'block', undefined, [
                  { value: 'Khối Back office', label: 'Khối Back office' },
                  { value: 'Khối Marketing', label: 'Khối Marketing' },
                  { value: 'Khối Kinh doanh', label: 'Khối Kinh doanh' },
                ])}
              </div>
              {ef('Trạng thái làm việc', 'employment_status', undefined, [
                { value: 'ACTIVE', label: 'Đang làm việc' },
                { value: 'PAUSED', label: 'Tạm dừng' },
                { value: 'INACTIVE', label: 'Đã nghỉ' },
              ])}
              {ef('Ghi chú tình trạng công việc', 'employment_status_notes', 'textarea')}
            </div>
          );

        // ── Giấy tờ tùy thân & địa chỉ ──
        // Phải khớp với các field hiển thị trong section: cccd_number, cccd_issue_date,
        // cccd_issue_place, birth_place, social_insurance_number, tax_code,
        // permanent_residence, current_address
        case 'personal':
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Số CCCD', 'cccd_number', undefined, undefined, undefined, '001234567890')}
                {ef('Ngày cấp CCCD', 'cccd_issue_date', 'date')}
              </div>
              {ef('Nơi cấp CCCD', 'cccd_issue_place', undefined, CCCD_ISSUE_PLACE_OPTIONS)}
              {ef('Số CMND cũ', 'old_id_number', undefined, undefined, undefined, '123456789')}
              {ef('Nơi đăng ký khai sinh', 'birth_place', undefined, undefined, undefined, 'Xã/Phường, Tỉnh/TP')}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Mã số BHXH', 'social_insurance_number', undefined, undefined, undefined, '1234567890')}
                {ef('Mã số thuế', 'tax_code', undefined, undefined, undefined, '0123456789')}
              </div>
              {ef('Địa chỉ thường trú', 'permanent_residence', 'textarea')}
              {ef('Địa chỉ hiện tại', 'current_address', 'textarea')}
            </div>
          );

        // ── Trình độ học vấn ──
        case 'education':
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Trình độ học vấn', 'education_level', undefined, undefined, undefined, 'Cử nhân đại học')}
                {ef('Năm tốt nghiệp', 'graduation_year', 'number', undefined, undefined, '2020')}
              </div>
              {ef('Trường đại học / cao đẳng', 'university', undefined, undefined, undefined, 'Đại học Bách Khoa Hà Nội')}
              {ef('Chuyên ngành', 'major', undefined, undefined, undefined, 'Công nghệ thông tin')}
            </div>
          );

        // ── Thông tin tài chính & ngân hàng ──
        case 'financial':
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Ngân hàng', 'bank_name', undefined, undefined, undefined, 'ACB, Vietcombank...')}
                {ef('Chi nhánh', 'bank_branch', undefined, undefined, undefined, 'Chi nhánh Hà Nội')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Số tài khoản', 'bank_account', undefined, undefined, undefined, '123456789012')}
                {ef('Chủ tài khoản', 'bank_account_holder', undefined, undefined, undefined, 'NGUYEN VAN A')}
              </div>
            </div>
          );

        // ── CCCD ──
        case 'emp_cccd':
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Số CCCD', 'cccd_number', undefined, undefined, undefined, '001234567890')}
                {ef('Ngày cấp CCCD', 'cccd_issue_date', 'date')}
              </div>
              {ef('Nơi cấp CCCD', 'cccd_issue_place', undefined, CCCD_ISSUE_PLACE_OPTIONS)}
              {ef('Nơi sinh', 'birth_place', undefined, undefined, undefined, 'Xã/Phường, Tỉnh/TP')}
              {ef('Địa chỉ thường trú', 'permanent_residence', 'textarea')}
            </div>
          );

        // ── Lương & Hợp đồng ──
        // Phải khớp với openEdit('emp_salary'): basic_salary, allowance, contract_type,
        // probation_months, probation_end_date, probation_rate, bank_name, bank_account
        case 'emp_salary':
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Lương cơ bản', 'basic_salary', 'number', undefined, undefined, '10000000')}
                {ef('Phụ cấp', 'allowance', 'number', undefined, undefined, '2000000')}
              </div>
              {ef('Loại hợp đồng', 'contract_type', undefined, CONTRACT_OPTIONS)}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ef('Thời gian thử việc (tháng)', 'probation_months', 'number', undefined, undefined, '2')}
                {ef('Ngày kết thúc thử việc (tự tính)', 'probation_end_date', 'date', undefined, true)}
              </div>
              {ef('Tỉ lệ thử việc', 'probation_rate', undefined, PROBATION_RATE_OPTIONS)}
            </div>
          );

        // ── Trạng thái hồ sơ ──
        case 'emp_file_status':
          return (
            <div className="space-y-4">
              {ef('Trạng thái hồ sơ', 'file_status', undefined, [
                { value: 'NOT_SUBMITTED', label: 'Chưa nộp' },
                { value: 'NEED_SUPPLEMENT', label: 'Cần bổ sung hồ sơ' },
                { value: 'PENDING_REVIEW', label: 'Chờ rà soát' },
                { value: 'COMPLETE', label: 'Nộp đủ' },
              ])}
              {ef('Ghi chú', 'file_review_notes', 'textarea')}
            </div>
          );

        // ── Hồ sơ đính kèm (attached_files) ──
        case 'attached_files': {
          const fileRow = (
            label: string,
            name: 'diploma_file' | 'citizen_id_file' | 'vneid_screenshot',
            currentUrl?: string | null,
          ) => {
            const file = editData[name] as File | null | undefined;
            return (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  {currentUrl && !file && (
                    <a
                      href={currentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Xem file hiện tại
                    </a>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    handleEditFieldChange(name, f);
                  }}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {file && (
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span className="truncate">📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      onClick={() => handleEditFieldChange(name, null)}
                      className="text-red-600 hover:underline ml-2"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                )}
              </div>
            );
          };
          return (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Chọn file mới để thay thế file cũ. Bỏ trống ô nào thì giữ nguyên file cũ.
              </p>
              {fileRow('Bằng cấp', 'diploma_file', onboarding?.diploma_file_url || onboarding?.diploma_file)}
              {fileRow('File CMND/CCCD', 'citizen_id_file', onboarding?.citizen_id_file_url || onboarding?.citizen_id_file)}
              {fileRow('Ảnh chụp màn hình VNeID', 'vneid_screenshot',
                onboarding?.vneid_screenshot_url
                  || (employeeProfile as any)?.vneid_screenshot_url
                  || (employeeProfile?.vneid_screenshot ? String(employeeProfile.vneid_screenshot) : null))}
              {ef('Link Facebook', 'facebook_link', 'text', undefined, undefined, 'https://facebook.com/...')}
            </div>
          );
        }

        default:
          return null;
      }
    };

    return (
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={() => setEditSection(null)}
      >
        <div className="flex items-center justify-center min-h-full p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col animate-in fade-in zoom-in duration-200 overflow-visible"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <PencilIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">{sectionTitles[editSection]}</h4>
                <p className="text-xs text-gray-500">Chỉnh sửa và lưu thay đổi</p>
              </div>
            </div>
            <button
              onClick={() => setEditSection(null)}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 px-6 py-5">
            {renderFields()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <button
              onClick={() => setEditSection(null)}
              className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={() => setConfirmDialog({ text: 'Bạn có chắc muốn lưu thay đổi?', onConfirm: () => { setConfirmDialog(null); handleSaveEdit(); } })}
              disabled={editLoading}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-200 transition-colors"
            >
              {editLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <span className="text-lg text-gray-600">Đang tải thông tin...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/dashboard/onboarding')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Quay lại danh sách
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Lỗi tải dữ liệu</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchOnboardingDetail}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Thử lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!onboarding) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/dashboard/onboarding')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Quay lại danh sách
        </button>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900">Không tìm thấy dữ liệu</h3>
              <p className="text-yellow-700 mt-1">Không tìm thấy quy trình onboarding với ID: {id}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPct = (() => {
    const p = onboarding.progress_percentage;
    if (p == null || typeof p !== 'number' || isNaN(p)) return 0;
    return Math.max(0, Math.min(100, Math.round(p)));
  })();
  const completedTasks = onboarding.tasks?.filter(t => t.status === 'COMPLETED').length || 0;
  const totalTasks = onboarding.tasks?.length || 0;

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header — compact, full width */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <button
            onClick={() => navigate('/dashboard/onboarding')}
            className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-3 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1.5" />
            Quay lại danh sách
          </button>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar placeholder */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {onboarding.candidate_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{onboarding.candidate_name}</h1>
                  {getStatusBadge(onboarding.status)}
                </div>
                <p className="text-gray-500 mt-0.5">
                  {onboarding.position?.title || '—'} — {onboarding.department?.name || '—'}
                  {employeeProfile?.employee_id && <span className="ml-2 text-blue-600 font-mono text-sm">{employeeProfile.employee_id}</span>}
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              {/* Progress ring */}
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke={progressPct >= 100 ? '#22c55e' : '#3b82f6'} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 28}`} strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPct / 100)}`}
                    className="transition-all duration-500" />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${progressPct >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                  {progressPct}%
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Tiến độ</p>
                <p className="text-sm font-semibold text-gray-700">{completedTasks}/{totalTasks} tasks</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Body: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <div className="lg:w-72 shrink-0 border-r border-gray-200 bg-white">
          <div className="p-5 space-y-5 lg:sticky lg:top-0">
            {/* Mobile progress */}
            <div className="sm:hidden">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-gray-500">Tiến độ</span>
                <span className="font-bold text-blue-600">{progressPct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all duration-500 ${progressPct >= 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{completedTasks}/{totalTasks} tasks</p>
            </div>

            {/* Quick info */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Thông tin nhanh</p>
              {([
                ['SĐT', employeeProfile?.phone_number || onboarding.candidate_phone],
                ['Email', employeeProfile?.personal_email || onboarding.candidate_email],
                ['Ngày bắt đầu', onboarding.start_date ? new Date(onboarding.start_date).toLocaleDateString('vi-VN') : null],
              ] as [string, string | null | undefined][]).map(([label, val]) => {
                const display = safeDisplay(val);
                const isEmpty = display === 'Chưa có dữ liệu';
                return (
                  <div key={label} className="flex items-baseline justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className={`truncate max-w-[55%] text-right ${isEmpty ? 'text-gray-400 italic font-normal' : 'text-gray-900 font-medium'}`}>
                      {display}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Checklist hồ sơ */}
            {employeeProfile?.file_status && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Hồ sơ</p>
                {([
                  ['doc_resume', 'Sơ yếu lý lịch', true],
                  ['doc_cccd', 'Căn cước công dân', true],
                  ['doc_degree', 'Bằng cấp', false],
                  ['doc_health', 'Giấy khám sức khỏe', true],
                ] as [string, string, boolean][]).map(([field, label, required]) => (
                  <label key={field} className="flex items-center gap-2 text-sm cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={(employeeProfile as any)[field] || false}
                      onChange={async (e) => {
                        const empId = employeeProfile?.employee_id;
                        if (!empId) return;
                        try {
                          // Tính trạng thái mới sau khi toggle
                          const newDocs = {
                            doc_resume: (employeeProfile as any).doc_resume || false,
                            doc_cccd: (employeeProfile as any).doc_cccd || false,
                            doc_health: (employeeProfile as any).doc_health || false,
                            [field]: e.target.checked,
                          };
                          // 3 trường bắt buộc: doc_resume, doc_cccd, doc_health
                          const hasAny = newDocs.doc_resume || newDocs.doc_cccd || newDocs.doc_health;
                          const hasAll = newDocs.doc_resume && newDocs.doc_cccd && newDocs.doc_health;
                          const fileStatus = hasAll ? 'COMPLETE' : hasAny ? 'NEED_SUPPLEMENT' : 'NOT_SUBMITTED';

                          await employeesAPI.partialUpdateByEmployeeId(empId, {
                            [field]: e.target.checked,
                            file_status: fileStatus,
                          } as any);
                        } catch { /* ignore */ }
                      }}
                      className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500"
                    />
                    <span className={`${(employeeProfile as any)[field] ? 'text-green-700 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
                      {label}
                    </span>
                    {!required && <span className="text-xs text-gray-400">(không bắt buộc)</span>}
                  </label>
                ))}
              </div>
            )}

            {/* Tasks mini */}
            {totalTasks > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tasks</p>
                {onboarding.tasks?.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      t.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                      t.status === 'IN_PROGRESS' ? 'bg-blue-500 text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {t.status === 'COMPLETED' ? '✓' : i + 1}
                    </div>
                    <span className={`truncate ${t.status === 'COMPLETED' ? 'text-green-700 font-medium' : t.status === 'IN_PROGRESS' ? 'text-blue-700 font-medium' : 'text-gray-500'}`}>
                      {t.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="bg-white border-b sticky top-0 z-10">
            <nav className="flex space-x-1 px-4">
              {!isEmployee && (
                <button
                  onClick={() => setActiveTab('info')}
                  className={`py-3 px-4 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === 'info'
                      ? 'bg-slate-50 text-blue-600 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Thông tin chung
                </button>
              )}
              {!isEmployee && (
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`py-3 px-4 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === 'tasks'
                      ? 'bg-slate-50 text-blue-600 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Tasks ({totalTasks})
                </button>
              )}
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-3 px-4 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'documents'
                    ? 'bg-slate-50 text-blue-600 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tài liệu ({onboarding.documents?.length || 0})
              </button>
              {userRole === 'ADMIN' && (
                <button
                  onClick={() => setActiveTab('contracts')}
                  className={`py-3 px-4 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === 'contracts'
                      ? 'bg-slate-50 text-blue-600 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Hợp đồng ({onboarding.contracts?.length || 0})
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'info' && renderInfoTab()}
            {activeTab === 'tasks' && (
              <TasksSection
                tasks={onboarding.tasks || []}
                onboardingId={onboarding.id}
                onUpdate={fetchOnboardingDetail}
                canCompleteTask={(task) => {
                  const docs = onboarding.documents || [];
                  const taskName = (task.name || '').toLowerCase();

                  // Task "Đọc nội quy" → check documents REGULATION required đã đọc
                  if (taskName.includes('nội quy công ty')) {
                    const unread = docs.filter(
                      (d) => d.document_type === 'REGULATION' && d.is_required && !d.is_read
                    );
                    if (unread.length > 0) {
                      return {
                        allowed: false,
                        reason: `Nhân viên chưa đọc ${unread.length} tài liệu nội quy bắt buộc`,
                      };
                    }
                  }

                  return { allowed: true };
                }}
              />
            )}
            {activeTab === 'documents' && (
              <DocumentsSection
                documents={onboarding.documents || []}
                onboardingId={onboarding.id}
                onUpdate={fetchOnboardingDetail}
                isReadOnly={isEmployee}
              />
            )}
            {activeTab === 'contracts' && (
              <ContractSection
                onboardingId={onboarding.id}
                employeeId={onboarding.employee?.id || null}
              />
            )}
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                {previewFile.label}
              </h4>
              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  Mở tab mới
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-100 min-h-0">
              {previewFile.type === 'image' ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.label}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <iframe
                  src={previewFile.url}
                  title={previewFile.label}
                  className="w-full h-full min-h-[70vh]"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {renderEditModal()}

      {/* Success/Error Dialog */}
      <FeedbackDialog
        open={!!dialogMsg}
        variant={dialogMsg?.type === 'success' ? 'success' : 'error'}
        title={dialogMsg?.type === 'success' ? 'Thành công' : 'Có lỗi xảy ra'}
        message={dialogMsg?.text}
        onClose={() => setDialogMsg(null)}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmDialog}
        variant="info"
        title="Xác nhận"
        message={confirmDialog?.text}
        confirmLabel="Xác nhận"
        cancelLabel="Huỷ"
        onConfirm={() => confirmDialog?.onConfirm()}
        onClose={() => setConfirmDialog(null)}
      />
    </div>
  );
};

export default OnboardingDetail;