import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { employeesAPI, departmentsAPI, Employee, Department } from '../utils/api';
import onboardingService, { OnboardingProcess, OnboardingDocument } from '../services/onboarding.service';
import { SelectBox } from '../components/LandingLayout/SelectBox';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import {
  UserIcon, BuildingOfficeIcon, PhoneIcon, EnvelopeIcon, CalendarIcon,
  BanknotesIcon, XMarkIcon, UserGroupIcon, PencilIcon,
  IdentificationIcon, DocumentTextIcon, DocumentCheckIcon, DocumentDuplicateIcon,
  ClockIcon, PhotoIcon, MapPinIcon, HomeIcon,
  AcademicCapIcon, MagnifyingGlassIcon, TrashIcon, EyeIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';

// ─── Shared components ────────────────────────────────────────────────────────

const ReadField: React.FC<{
  label: string;
  value: string;
  icon?: React.ElementType<React.SVGProps<SVGSVGElement>>;
}> = ({ label, value, icon: Icon }) => (
  <div>
    <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  </div>
);

const inputCls =
  'block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm';

const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: number;
  employee_id: string;
  full_name: string;
  position_title: string;
  phone_number?: string;
  personal_email?: string;
}

type EditForm = {
  phone_number: string;
  personal_email: string;
  bank_name: string;
  bank_account: string;
  date_of_birth: string;
  cccd_number: string;
  cccd_issue_date: string;
  cccd_issue_place: string;
  permanent_residence: string;
  current_address: string;
};

const emptyForm = (emp?: Employee | null): EditForm => ({
  phone_number:        emp?.phone_number        || '',
  personal_email:      emp?.personal_email      || '',
  bank_name:           emp?.bank_name           || '',
  bank_account:        emp?.bank_account        || '',
  date_of_birth:       emp?.date_of_birth       || '',
  cccd_number:         emp?.cccd_number         || '',
  cccd_issue_date:     emp?.cccd_issue_date     || '',
  cccd_issue_place:    emp?.cccd_issue_place    || '',
  permanent_residence: emp?.permanent_residence || '',
  current_address:     emp?.current_address     || '',
});

const ALL_EDITABLE_FIELDS: (keyof EditForm)[] = [
  'date_of_birth', 'phone_number', 'personal_email',
  'bank_name', 'bank_account',
  'cccd_number', 'cccd_issue_date', 'cccd_issue_place', 'permanent_residence', 'current_address',
];

const CCCD_ISSUE_PLACE_OPTIONS = [
  { label: 'Cục cảnh sát Quản lý hành chính về Trật tự xã hội', value: 'POLICE_ADMIN' },
  { label: 'Bộ Công An', value: 'MINISTRY_PUBLIC_SECURITY' },
];

const getCccdIssuePlaceLabel = (value?: string) =>
  CCCD_ISSUE_PLACE_OPTIONS.find((o) => o.value === value)?.label || value || 'Chưa cập nhật';

const FIELD_LABELS: Record<keyof EditForm, string> = {
  date_of_birth:       'Ngày sinh',
  phone_number:        'Số điện thoại',
  personal_email:      'Email cá nhân',
  bank_name:           'Tên ngân hàng',
  bank_account:        'Số tài khoản',
  cccd_number:         'Số CCCD',
  cccd_issue_date:     'Ngày cấp',
  cccd_issue_place:    'Nơi cấp',
  permanent_residence: 'Hộ khẩu thường trú',
  current_address:     'Địa chỉ hiện tại',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('vi-VN') : 'Chưa cập nhật';

const getGenderText = (g: string) =>
  g === 'M' ? 'Nam' : g === 'F' ? 'Nữ' : g === 'O' ? 'Khác' : g;

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: 'Đang làm việc', cls: 'bg-green-100 text-green-800' },
  PROBATION: { label: 'Đang thử việc', cls: 'bg-blue-100 text-blue-800' },
};

// ─── Profile page ─────────────────────────────────────────────────────────────

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [employee, setEmployee]       = useState<Employee | null>(null);
  const [department, setDepartment]   = useState<Department | null>(null);
  const [manager, setManager]         = useState<Employee | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Edit dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  useLockBodyScroll(showEditDialog);
  const [editForm, setEditForm]             = useState<EditForm>(emptyForm());
  const [formErrors, setFormErrors]         = useState<Partial<Record<keyof EditForm, string>>>({});
  const [saving, setSaving]                 = useState(false);

  // Avatar
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);


  // Manager modal
  const [showManagerModal, setShowManagerModal]         = useState(false);
  const [managerSearch, setManagerSearch]               = useState('');
  const [managerResults, setManagerResults]             = useState<Employee[]>([]);
  const [managerSearchLoading, setManagerSearchLoading] = useState(false);
  const [managerSaving, setManagerSaving]               = useState(false);
  const managerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Onboarding docs
  const [onboarding, setOnboarding]       = useState<OnboardingProcess | null>(null);
  const [viewingDoc, setViewingDoc]       = useState<OnboardingDocument | null>(null);
  const [docReadable, setDocReadable]     = useState(false);
  const [markingReadId, setMarkingReadId] = useState<number | null>(null);

  useEffect(() => { fetchProfileData(); }, []);


  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const emp = await employeesAPI.me();
      setEmployee(emp);
      setEditForm(emptyForm(emp));

      try { setOnboarding(await onboardingService.myOnboarding()); } catch { /* no onboarding */ }

      if (emp.department?.id) {
        try { setDepartment(await departmentsAPI.getById(emp.department.id)); } catch { /* ignore */ }
      }

      try {
        let managerId: number | null = null;
        if (emp.manager && typeof emp.manager === 'object' && emp.manager.id) {
          managerId = emp.manager.id;
        } else if (emp.manager && !isNaN(Number(emp.manager))) {
          managerId = Number(emp.manager);
        }
        if (managerId) {
          try { setManager(await employeesAPI.getById(managerId)); }
          catch { if (emp.manager_name) setManager({ id: managerId, full_name: emp.manager_name } as unknown as Employee); }
        } else if (emp.manager_name) {
          setManager({ id: 0, full_name: emp.manager_name } as unknown as Employee);
        }
      } catch { /* ignore */ }

      if (emp.department?.id) {
        try {
          const res = await departmentsAPI.employees(emp.department.id, { page_size: 50 });
          setTeamMembers(
            res.results
              .filter((e) => e.id !== emp.id)
              .map((e) => ({
                id: e.id,
                employee_id: e.employee_id,
                full_name: e.full_name,
                position_title: e.position?.title || 'Chưa phân chức vụ',
                phone_number: e.phone_number,
                personal_email: e.personal_email,
              })),
          );
        } catch { /* ignore */ }
      }
      setError(null);
    } catch {
      setError('Không thể tải thông tin cá nhân. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // ── Edit dialog ────────────────────────────────────────────────────────────

  const openEdit = () => {
    setEditForm(emptyForm(employee));
    setFormErrors({});
    setShowEditDialog(true);
  };

  const closeEdit = () => { setShowEditDialog(false); setFormErrors({}); };

  const handleFieldChange = (field: keyof EditForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const isFormValid = ALL_EDITABLE_FIELDS.every((f) => editForm[f].trim() !== '');

  const validate = (): boolean => {
    const errors: Partial<Record<keyof EditForm, string>> = {};
    ALL_EDITABLE_FIELDS.forEach((f) => {
      if (!editForm[f].trim()) errors[f] = `${FIELD_LABELS[f]} là bắt buộc`;
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!employee) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const patch = Object.fromEntries(
        ALL_EDITABLE_FIELDS.map((f) => [f, editForm[f]]),
      );
      await employeesAPI.partialUpdate(employee.id, patch);
      setEmployee((prev) => (prev ? { ...prev, ...patch } : null));
      closeEdit();
    } catch {
      alert('Cập nhật thất bại. Vui lòng thử lại sau.');
    } finally {
      setSaving(false);
    }
  };

  // ── Avatar ─────────────────────────────────────────────────────────────────

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh không được vượt quá 5MB.');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }
    setAvatarUploading(true);
    try {
      const result = await employeesAPI.changeAvatar(file);
      setEmployee((prev) => (prev ? { ...prev, avatar_url: result.avatar_url } : prev));
      if (user?.hrm_user) updateUser({ hrm_user: { ...user.hrm_user, avatar_url: result.avatar_url } });
    } catch {
      alert('Tải ảnh đại diện thất bại. Vui lòng thử lại.');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // ── Manager ────────────────────────────────────────────────────────────────

  const handleManagerSearch = (query: string) => {
    setManagerSearch(query);
    if (managerSearchTimer.current) clearTimeout(managerSearchTimer.current);
    if (!query.trim()) { setManagerResults([]); return; }
    managerSearchTimer.current = setTimeout(async () => {
      setManagerSearchLoading(true);
      try {
        const res = await employeesAPI.list({ search: query, page_size: 10 });
        setManagerResults(res.results);
      } catch { setManagerResults([]); }
      finally { setManagerSearchLoading(false); }
    }, 300);
  };

  const handleSelectManager = async (sel: Employee) => {
    setManagerSaving(true);
    try {
      await employeesAPI.setManager(sel.employee_id);
      setManager(sel);
      setShowManagerModal(false);
      setManagerSearch('');
      setManagerResults([]);
    } catch { alert('Cập nhật quản lý thất bại. Vui lòng thử lại.'); }
    finally { setManagerSaving(false); }
  };

  const handleClearManager = async () => {
    if (!window.confirm('Bạn có chắc muốn xoá quản lý trực tiếp?')) return;
    setManagerSaving(true);
    try {
      await employeesAPI.setManager(null);
      setManager(null);
    } catch { alert('Xoá quản lý thất bại. Vui lòng thử lại.'); }
    finally { setManagerSaving(false); }
  };

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600">Đang tải thông tin cá nhân...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex gap-3">
        <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <div>
          <h3 className="text-sm font-medium text-red-800">Đã xảy ra lỗi</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
          <button onClick={fetchProfileData} className="mt-3 text-sm font-medium text-red-700 underline">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Không tìm thấy thông tin nhân viên</h3>
        <p className="mt-1 text-sm text-gray-500">Vui lòng liên hệ quản trị viên để được hỗ trợ.</p>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[employee.employment_status] ?? { label: 'Đã nghỉ việc', cls: 'bg-gray-100 text-gray-600' };
  const requiredDocs = (onboarding?.documents || []).filter((d) => d.document_type === 'REGULATION' && d.is_required);
  const unreadCount  = requiredDocs.filter((d) => !d.is_read).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Profile banner ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">

          {/* Avatar with hover-upload overlay */}
          <div className="relative flex-shrink-0 group self-start">
            {employee.avatar_url ? (
              <img src={employee.avatar_url} alt="Avatar" className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-200" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-2 ring-gray-200">
                <span className="text-2xl font-bold text-white">{employee.full_name?.charAt(0).toUpperCase() || '?'}</span>
              </div>
            )}
            <label
              htmlFor="avatar-upload"
              title="Thay đổi ảnh đại diện"
              className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/40 cursor-pointer transition-opacity ${avatarUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              {avatarUploading
                ? <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <PhotoIcon className="h-6 w-6 text-white" />}
            </label>
            <input ref={avatarInputRef} id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Identity info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900 truncate">{employee.full_name}</h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  {employee.employee_id}
                  {(department?.name || employee.department?.name) && <> · {department?.name || employee.department?.name}</>}
                  {employee.position?.title && <> · {employee.position.title}</>}
                </p>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.cls}`}>
                  <UserIcon className="h-3.5 w-3.5" />
                  {statusInfo.label}
                </span>
                <button
                  onClick={openEdit}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                  Chỉnh sửa thông tin
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Main content 3-col ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left 2/3 ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Thông tin cá nhân */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Thông tin cá nhân</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ReadField label="Họ và tên"     value={employee.full_name}                           icon={UserIcon} />
              <ReadField label="Giới tính"     value={getGenderText(employee.gender)} />
              <ReadField label="Ngày sinh"     value={formatDate(employee.date_of_birth)}            icon={CalendarIcon} />
              <ReadField label="Ngày vào làm"  value={formatDate(employee.start_date)}               icon={CalendarIcon} />
              <ReadField label="Số điện thoại" value={employee.phone_number   || 'Chưa cập nhật'}   icon={PhoneIcon} />
              <ReadField label="Email cá nhân" value={employee.personal_email || 'Chưa cập nhật'}   icon={EnvelopeIcon} />
            </div>
          </div>

          {/* Ngân hàng & CCCD — gom 1 card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Ngân hàng &amp; CCCD</h2>

            {/* Ngân hàng */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ReadField label="Tên ngân hàng" value={employee.bank_name    || 'Chưa cập nhật'} icon={BanknotesIcon} />
              <ReadField label="Số tài khoản"  value={employee.bank_account || 'Chưa cập nhật'} icon={BanknotesIcon} />
            </div>

            <hr className="border-gray-100 my-5" />

            {/* CCCD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <ReadField label="Số CCCD" value={employee.cccd_number || 'Chưa cập nhật'} icon={IdentificationIcon} />
              </div>
              <ReadField label="Ngày cấp" value={formatDate(employee.cccd_issue_date)} />
              <ReadField label="Nơi cấp"  value={getCccdIssuePlaceLabel(employee.cccd_issue_place)} />
              <div className="sm:col-span-2">
                <ReadField label="Nơi khai sinh"      value={employee.birth_place         || 'Chưa cập nhật'} icon={MapPinIcon} />
              </div>
              <div className="sm:col-span-2">
                <ReadField label="Hộ khẩu thường trú" value={employee.permanent_residence || 'Chưa cập nhật'} icon={HomeIcon} />
              </div>
              <div className="sm:col-span-2">
                <ReadField label="Địa chỉ hiện tại"   value={employee.current_address     || 'Chưa cập nhật'} icon={MapPinIcon} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right 1/3 ── */}
        <div className="space-y-6">

          {/* Thông tin công việc — gom phòng ban + hợp đồng */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Thông tin công việc</h2>
            <div className="space-y-4">
              <ReadField label="Phòng ban"    value={department?.name || employee.department?.name || 'Chưa phân phòng'} icon={BuildingOfficeIcon} />
              <ReadField label="Mã phòng ban" value={department?.code || employee.department?.code || 'N/A'} />
              <ReadField label="Chức vụ"      value={employee.position?.title || 'Không có chức vụ'} />
            </div>
            <hr className="border-gray-100 my-4" />
            <div className="space-y-4">
              <ReadField label="Loại hợp đồng"     value={employee.contract_type_display || employee.contract_type || 'Chưa cập nhật'} icon={DocumentTextIcon} />
              <ReadField label="Lương cơ bản"
                value={employee.basic_salary
                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(employee.basic_salary)
                  : 'Chưa cập nhật'}
              />
              <ReadField label="Thời gian thử việc"    value={employee.probation_months ? `${employee.probation_months} tháng` : 'Chưa cập nhật'} />
              <ReadField label="KT thử việc"            value={formatDate(employee.probation_end_date)} icon={ClockIcon} />
            </div>
          </div>

          {/* Quản lý trực tiếp */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Quản lý trực tiếp</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowManagerModal(true)}
                  disabled={managerSaving}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                >
                  <MagnifyingGlassIcon className="h-3.5 w-3.5" />
                  Tìm &amp; gán
                </button>
                {(manager || employee.manager_name) && (
                  <button
                    onClick={handleClearManager}
                    disabled={managerSaving}
                    title="Xoá quản lý"
                    className="p-1.5 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            {manager || employee.manager_name ? (
              <div className="space-y-3">
                <ReadField label="Họ tên"        value={manager?.full_name || employee.manager_name || ''} icon={UserIcon} />
                {manager?.employee_id         && <ReadField label="Mã nhân viên"  value={manager.employee_id} />}
                {manager?.position?.title     && <ReadField label="Chức vụ"       value={manager.position.title} />}
                {manager?.phone_number        && <ReadField label="Số điện thoại" value={manager.phone_number} icon={PhoneIcon} />}
              </div>
            ) : (
              <div className="text-center py-6">
                <UserIcon className="mx-auto h-10 w-10 text-gray-200" />
                <p className="mt-2 text-sm text-gray-400">Không có quản lý trực tiếp</p>
              </div>
            )}
          </div>

          {/* Thành viên team — scrollable inline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Thành viên team</h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{teamMembers.length}</span>
            </div>
            {teamMembers.length > 0 ? (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {teamMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-white">{m.full_name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{m.position_title}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <UserGroupIcon className="mx-auto h-10 w-10 text-gray-200" />
                <p className="mt-2 text-sm text-gray-400">Không có thành viên</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom row: Hồ sơ + Đào tạo ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Trạng thái hồ sơ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Trạng thái hồ sơ</h2>
            <DocumentCheckIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Trạng thái</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                employee.file_status === 'COMPLETE'          ? 'bg-green-50 text-green-700'
                : employee.file_status === 'NEED_SUPPLEMENT' ? 'bg-yellow-50 text-yellow-700'
                : employee.file_status === 'NOT_SUBMITTED'   ? 'bg-red-50 text-red-700'
                : 'bg-gray-50 text-gray-700'
              }`}>
                <DocumentDuplicateIcon className="h-4 w-4" />
                {employee.file_status_display || employee.file_status || 'Chưa cập nhật'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ReadField label="Hạn nộp hồ sơ" value={formatDate(employee.file_submission_deadline)} />
              <ReadField label="Ngày nộp"        value={employee.file_submission_date ? formatDate(employee.file_submission_date) : 'Chưa nộp'} />
            </div>
            {employee.file_review_notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Ghi chú rà soát</p>
                <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">{employee.file_review_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Đào tạo hội nhập */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Đào tạo hội nhập</h2>
            <AcademicCapIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Bài thuyết trình đào tạo</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${employee.training_presentation_viewed ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                <DocumentTextIcon className="h-4 w-4" />
                {employee.training_presentation_viewed ? 'Đã xem' : 'Chưa xem'}
                {employee.training_presentation_viewed_at && (
                  <span className="text-xs font-normal ml-1">({formatDate(employee.training_presentation_viewed_at)})</span>
                )}
              </span>
            </div>
            <ReadField label="Ảnh chụp VNEID" value={employee.vneid_screenshot ? 'Đã tải lên' : 'Chưa tải lên'} icon={PhotoIcon} />
          </div>
        </div>
      </div>

      {/* ── Tài liệu onboarding ─────────────────────────────────────────────────── */}
      {requiredDocs.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
              <DocumentTextIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Tài liệu onboarding cần đọc</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {unreadCount === 0 ? '✓ Bạn đã đọc hết tài liệu bắt buộc' : `${unreadCount} / ${requiredDocs.length} chưa đọc`}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {requiredDocs.map((doc) => (
              <div key={doc.id} className="bg-white rounded-lg border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{doc.document_name}</p>
                  {doc.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{doc.description}</p>}
                  <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${doc.is_read ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {doc.is_read ? <><CheckCircleIcon className="w-3 h-3" /> Đã đọc</> : <><ClockIcon className="w-3 h-3" /> Chưa đọc</>}
                  </span>
                </div>
                <button
                  onClick={() => { setViewingDoc(doc); setDocReadable(false); }}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  <EyeIcon className="w-3.5 h-3.5" /> Xem
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ MODALS ══════════════════════════════════════════════════════════════ */}

      {/* Edit dialog */}
      {showEditDialog && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Chỉnh sửa thông tin cá nhân</h2>
                <p className="text-xs text-gray-500 mt-0.5">Cập nhật thông tin cá nhân, ngân hàng và CCCD</p>
              </div>
              <button onClick={closeEdit} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-6 max-h-[65vh] overflow-y-auto">

              {/* Thông tin cá nhân */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Thông tin cá nhân</p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Ngày sinh */}
                  <div>
                    <label className={labelCls}>Ngày sinh <span className="text-red-500">*</span></label>
                    <input type="date" value={editForm.date_of_birth}
                      onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
                      className={`${inputCls} ${formErrors.date_of_birth ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`} />
                    {formErrors.date_of_birth && <p className="mt-1 text-xs text-red-500">{formErrors.date_of_birth}</p>}
                  </div>
                  {/* Số điện thoại */}
                  <div>
                    <label className={labelCls}>Số điện thoại <span className="text-red-500">*</span></label>
                    <input type="tel" placeholder="Nhập số điện thoại" value={editForm.phone_number}
                      onChange={(e) => handleFieldChange('phone_number', e.target.value)}
                      className={`${inputCls} ${formErrors.phone_number ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`} />
                    {formErrors.phone_number && <p className="mt-1 text-xs text-red-500">{formErrors.phone_number}</p>}
                  </div>
                  {/* Email */}
                  <div className="col-span-2">
                    <label className={labelCls}>Email cá nhân <span className="text-red-500">*</span></label>
                    <input type="email" placeholder="Nhập email cá nhân" value={editForm.personal_email}
                      onChange={(e) => handleFieldChange('personal_email', e.target.value)}
                      className={`${inputCls} ${formErrors.personal_email ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`} />
                    {formErrors.personal_email && <p className="mt-1 text-xs text-red-500">{formErrors.personal_email}</p>}
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Ngân hàng */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Thông tin ngân hàng</p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Tên ngân hàng */}
                  <div>
                    <label className={labelCls}>Tên ngân hàng <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="VD: Vietcombank..." value={editForm.bank_name}
                      onChange={(e) => handleFieldChange('bank_name', e.target.value)}
                      className={`${inputCls} ${formErrors.bank_name ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`} />
                    {formErrors.bank_name && <p className="mt-1 text-xs text-red-500">{formErrors.bank_name}</p>}
                  </div>
                  {/* Số tài khoản */}
                  <div>
                    <label className={labelCls}>Số tài khoản <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="Nhập số tài khoản" value={editForm.bank_account}
                      onChange={(e) => handleFieldChange('bank_account', e.target.value)}
                      className={`${inputCls} ${formErrors.bank_account ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`} />
                    {formErrors.bank_account && <p className="mt-1 text-xs text-red-500">{formErrors.bank_account}</p>}
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* CCCD */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Thông tin CCCD</p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Số CCCD */}
                  <div>
                    <label className={labelCls}>Số CCCD <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="Nhập số CCCD (12 số)" value={editForm.cccd_number}
                      onChange={(e) => handleFieldChange('cccd_number', e.target.value)}
                      className={`${inputCls} ${formErrors.cccd_number ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`} />
                    {formErrors.cccd_number && <p className="mt-1 text-xs text-red-500">{formErrors.cccd_number}</p>}
                  </div>
                  {/* Ngày cấp */}
                  <div>
                    <label className={labelCls}>Ngày cấp <span className="text-red-500">*</span></label>
                    <input type="date" value={editForm.cccd_issue_date}
                      onChange={(e) => handleFieldChange('cccd_issue_date', e.target.value)}
                      className={`${inputCls} ${formErrors.cccd_issue_date ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`} />
                    {formErrors.cccd_issue_date && <p className="mt-1 text-xs text-red-500">{formErrors.cccd_issue_date}</p>}
                  </div>
                  {/* Nơi cấp */}
                  <div className="col-span-2">
                    <label className={labelCls}>Nơi cấp <span className="text-red-500">*</span></label>
                    <div className={formErrors.cccd_issue_place ? 'ring-1 ring-red-400 rounded-lg' : ''}>
                      <SelectBox
                        label=""
                        value={editForm.cccd_issue_place}
                        options={CCCD_ISSUE_PLACE_OPTIONS}
                        onChange={(v) => handleFieldChange('cccd_issue_place', v)}
                        placeholder="-- Chọn nơi cấp --"
                      />
                    </div>
                    {formErrors.cccd_issue_place && <p className="mt-1 text-xs text-red-500">{formErrors.cccd_issue_place}</p>}
                  </div>
                  {/* Hộ khẩu thường trú */}
                  <div className="col-span-2">
                    <label className={labelCls}>Hộ khẩu thường trú <span className="text-red-500">*</span></label>
                    <textarea rows={2} placeholder="Nhập địa chỉ hộ khẩu thường trú" value={editForm.permanent_residence}
                      onChange={(e) => handleFieldChange('permanent_residence', e.target.value)}
                      className={`${inputCls} ${formErrors.permanent_residence ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`} />
                    {formErrors.permanent_residence && <p className="mt-1 text-xs text-red-500">{formErrors.permanent_residence}</p>}
                  </div>
                  {/* Địa chỉ hiện tại */}
                  <div className="col-span-2">
                    <label className={labelCls}>Địa chỉ hiện tại <span className="text-red-500">*</span></label>
                    <textarea rows={2} placeholder="Nhập địa chỉ nơi đang ở" value={editForm.current_address}
                      onChange={(e) => handleFieldChange('current_address', e.target.value)}
                      className={`${inputCls} ${formErrors.current_address ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`} />
                    {formErrors.current_address && <p className="mt-1 text-xs text-red-500">{formErrors.current_address}</p>}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={closeEdit}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isFormValid}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


      {/* Manager search modal */}
      {showManagerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="manager-modal-title">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 id="manager-modal-title" className="text-base font-bold text-gray-900">Tìm kiếm quản lý trực tiếp</h2>
              <button onClick={() => { setShowManagerModal(false); setManagerSearch(''); setManagerResults([]); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 border-b">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tên hoặc mã nhân viên..."
                  value={managerSearch}
                  onChange={(e) => handleManagerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
              {managerSearchLoading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                </div>
              )}
              {!managerSearchLoading && managerSearch && managerResults.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-8">Không tìm thấy nhân viên nào</p>
              )}
              {!managerSearchLoading && !managerSearch && (
                <p className="text-center text-sm text-gray-400 py-8">Nhập tên hoặc mã nhân viên để tìm kiếm</p>
              )}
              {managerResults.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleSelectManager(emp)}
                  disabled={managerSaving}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 disabled:opacity-50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-white">{emp.full_name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{emp.full_name}</p>
                    <p className="text-xs text-gray-500">Mã NV: {emp.employee_id}{emp.position?.title ? ` · ${emp.position.title}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
            {managerSaving && (
              <div className="px-6 py-3 border-t flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
                Đang lưu...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document viewer modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewingDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">{viewingDoc.document_name}</h3>
                {viewingDoc.description && <p className="text-xs text-gray-500 mt-0.5">{viewingDoc.description}</p>}
              </div>
              <button onClick={() => setViewingDoc(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-gray-100">
              {viewingDoc.file_url || viewingDoc.file ? (
                <iframe
                  src={viewingDoc.file_url || viewingDoc.file}
                  className="w-full h-full border-0"
                  title={viewingDoc.document_name}
                  onLoad={() => setTimeout(() => setDocReadable(true), 10000)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">Không có file đính kèm</div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                {viewingDoc.is_read ? '✓ Bạn đã đọc tài liệu này' : docReadable ? '✓ Có thể xác nhận đã đọc' : '⏳ Vui lòng đọc ít nhất 10 giây...'}
              </p>
              {!viewingDoc.is_read && (
                <button
                  disabled={!docReadable || markingReadId === viewingDoc.id}
                  onClick={async () => {
                    if (!viewingDoc) return;
                    setMarkingReadId(viewingDoc.id);
                    try {
                      await onboardingService.markDocumentAsRead(viewingDoc.id);
                      setOnboarding(await onboardingService.myOnboarding());
                      setViewingDoc(null);
                    } catch { /* silent */ }
                    finally { setMarkingReadId(null); }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  {markingReadId === viewingDoc.id ? 'Đang lưu...' : 'Đánh dấu đã đọc'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
