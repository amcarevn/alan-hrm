import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  UsersIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  PhotoIcon,
  ArrowPathIcon,
  UserPlusIcon,
  ExclamationCircleIcon,
  CloudArrowUpIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { ctvAPI, doctorAPI } from '../utils/api/ctv.api';
import type { CTV, CTVStats, CTVFilterEmployee, CTVCreateData, Doctor } from '../utils/api/types';
import type { CTVListParams } from '../utils/api/ctv.api';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { SelectBox, MultiSelectBox } from '../components/LandingLayout/SelectBox';
import { toDisplayDate } from '../utils/dateUtils';

// ============================================================
// HELPERS / CONSTANTS
// ============================================================


const SERVICE_TAGS = ['Nám, Tàn Nhang, Sắc Tố', 'Mụn', 'Sẹo Rỗ', 'Làm Đầy', 'Thon Gọn'];

const WORK_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'HIRE_IMAGE_MEDIA', label: 'Thuê hình ảnh + kênh truyền thông' },
  { value: 'HIRE_PER_POST', label: 'Thuê theo bài đăng' },
  { value: 'FREE_3_MONTHS', label: 'Free 3 tháng đầu' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'DISCUSSING', label: 'Đang trao đổi' },
  { value: 'INACTIVE', label: 'Không hoạt động' },
];

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const PAID_WORK_TYPES = new Set(['HIRE_IMAGE_MEDIA', 'HIRE_PER_POST']);

function calcNextPaymentDate(baseDate: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = baseDate.getDate();
  const tryDate = (y: number, m: number) => {
    const lastDay = new Date(y, m, 0).getDate();
    return new Date(y, m - 1, Math.min(day, lastDay));
  };
  const thisMonth = tryDate(today.getFullYear(), today.getMonth() + 1);
  if (thisMonth >= today) return thisMonth.toISOString().slice(0, 10);
  const next =
    today.getMonth() === 11
      ? tryDate(today.getFullYear() + 1, 1)
      : tryDate(today.getFullYear(), today.getMonth() + 2);
  return next.toISOString().slice(0, 10);
}

function toDatetimeLocal(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 16);
}

// ============================================================
// SMALL SHARED COMPONENTS
// ============================================================

const emptyVal = (value: string | null | undefined) =>
  value
    ? <span>{value}</span>
    : <span className="text-gray-400 italic">Chưa có dữ liệu</span>;

const DetailRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div>
    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</dt>
    <dd className={`text-sm font-medium ${value ? 'text-gray-900' : 'text-gray-400 italic font-normal'}`}>
      {value || 'Chưa có dữ liệu'}
    </dd>
  </div>
);

// ============================================================
// CTV FORM
// ============================================================

interface CTVFormProps {
  mode: 'create' | 'edit';
  initialData?: CTV | null;
  onClose: () => void;
  onSuccess: () => void;
  defaultLeaderId?: number;
  defaultLeaderLabel?: string;
}

const CTVForm: React.FC<CTVFormProps> = ({ mode, initialData, onClose, onSuccess, defaultLeaderId, defaultLeaderLabel }) => {
  const { user } = useAuth();
  const isAdminLike = !!(
    user?.is_super_admin ||
    user?.is_superuser ||
    user?.hrm_user?.is_hr ||
    user?.employee_profile?.is_hr
  );
  const isCtvLeader = !!(user?.is_ctv_leader || user?.hrm_user?.is_ctv_leader);
  const isCtvAssigned = !isAdminLike && !isCtvLeader && !!(user?.hrm_user?.is_ctv_assigned);
  const isLeaderMode = !isAdminLike && (!!user?.is_manager || isCtvLeader);

  const myEmployeeId = user?.employee_profile?.id ?? null;
  const myEmployeeName = user?.employee_profile?.full_name ?? '';
  const myEmployeeCode = user?.employee_profile?.employee_id ?? '';

  const [form, setForm] = useState<CTVCreateData>({
    leader: initialData?.leader ?? (isLeaderMode && myEmployeeId ? myEmployeeId : null) ?? (defaultLeaderId ?? null),
    assigned_employee: initialData?.assigned_employee ?? (isCtvAssigned && myEmployeeId ? myEmployeeId : null),
    name: initialData?.name ?? '',
    phone: initialData?.phone ?? '',
    service: initialData?.service ?? '',
    date_received: initialData?.date_received ?? '',
    first_post_time: toDatetimeLocal(initialData?.first_post_time),
    end_time: toDatetimeLocal(initialData?.end_time),
    work_type: initialData?.work_type ?? '',
    status: initialData?.status ?? 'ACTIVE',
    note_marketing: initialData?.note_marketing ?? '',
    previous_doctor: initialData?.previous_doctor ?? '',
    doctor: initialData?.doctor ?? null,
    cccd_number: initialData?.cccd_number ?? '',
    email: initialData?.email ?? '',
    bank_account: initialData?.bank_account ?? '',
    bank_name: initialData?.bank_name ?? '',
    payment_date: initialData?.payment_date ?? '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.cccd_image_url ?? initialData?.cccd_image ?? null
  );
  const [doctorOptions, setDoctorOptions] = useState<Doctor[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<CTVFilterEmployee[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>(
    initialData?.leader
      ? String(initialData.leader)
      : isLeaderMode && myEmployeeId
      ? String(myEmployeeId)
      : defaultLeaderId
      ? String(defaultLeaderId)
      : ''
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildErrors = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Vui lòng nhập tên cộng tác viên';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Địa chỉ email không hợp lệ';
    if (form.cccd_number && !/^\d{9}(\d{3})?$/.test(form.cccd_number))
      errs.cccd_number = 'Số CCCD phải gồm 9 hoặc 12 chữ số';
    if (form.date_received && form.first_post_time) {
      if (form.first_post_time.slice(0, 10) < form.date_received)
        errs.first_post_time = 'Thời gian đăng bài không được trước ngày tiếp nhận';
    }
    if (form.first_post_time && form.end_time) {
      if (form.end_time.slice(0, 10) < form.first_post_time.slice(0, 10))
        errs.end_time = 'Thời gian kết thúc không được trước TG đăng bài đầu tiên';
    }
    if (form.bank_account && !form.bank_name) errs.bank_name = 'Vui lòng nhập tên ngân hàng';
    if (form.bank_name && !form.bank_account) errs.bank_account = 'Vui lòng nhập số tài khoản';
    return errs;
  };


  const previewPaymentDate = useMemo(() => {
    if (!PAID_WORK_TYPES.has(form.work_type ?? '')) return null;
    const workTypeChanged = mode === 'edit' && initialData?.work_type !== form.work_type;
    const baseIso = workTypeChanged
      ? new Date().toISOString().slice(0, 10)
      : form.first_post_time?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    return calcNextPaymentDate(new Date(baseIso));
  }, [form.work_type, form.first_post_time, mode, initialData?.work_type]);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const data = await ctvAPI.allEmployees();
        setEmployeeOptions(data);
      } catch (err) {
        console.error('Error loading employees:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    // is_ctv_leader: chỉ lấy bác sĩ đang gắn với CTV của leader đó
    const params: { is_active: boolean; leader_id?: number } = { is_active: true };
    if (isCtvLeader && myEmployeeId) params.leader_id = myEmployeeId;
    doctorAPI.list(params).then(setDoctorOptions).catch(console.error);
  }, []);

  const validate = (): boolean => {
    const errs = buildErrors();
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const blurField = (field: keyof CTVCreateData) => {
    const errs = buildErrors();
    setErrors((prev) => {
      const next = { ...prev };
      if (errs[field]) next[field] = errs[field];
      else delete next[field];
      return next;
    });
  };

  const set = (field: keyof CTVCreateData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setErrors((prev) => ({ ...prev, cccd_image: 'Chỉ chấp nhận file JPG hoặc PNG' }));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrors((prev) => ({ ...prev, cccd_image: 'Kích thước file tối đa là 10MB' }));
      return;
    }
    setErrors((prev) => { const next = { ...prev }; delete next.cccd_image; return next; });
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const fd = ctvAPI.buildFormData(form, imageFile);
      if (mode === 'create') {
        await ctvAPI.create(fd);
      } else if (initialData) {
        await ctvAPI.update(initialData.id, fd);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        const messages = Object.entries(data)
          .map(([f, v]) => `${f}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('\n');
        alert(messages || 'Lưu thất bại. Vui lòng thử lại.');
      } else {
        alert('Có lỗi xảy ra khi kết nối server. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field: string) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${
      errors[field]
        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200'
        : 'border-gray-200 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
    }`;

  const errMsg = (field: string) =>
    errors[field] ? (
      <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
        <ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0" />
        {errors[field]}
      </p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
              {mode === 'create'
                ? <UserPlusIcon className="w-5 h-5 text-primary-600" />
                : <PencilSquareIcon className="w-5 h-5 text-primary-600" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {mode === 'create' ? 'Thêm cộng tác viên mới' : 'Chỉnh sửa cộng tác viên'}
              </h2>
              <p className="text-xs text-gray-600 font-medium mt-0.5">
                {mode === 'create'
                  ? 'Điền thông tin để tạo hồ sơ cộng tác viên'
                  : <span>Đang chỉnh sửa: <span className="font-bold text-gray-900">{initialData?.name ?? ''}</span></span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Section 1: Phân công */}
          <div className="rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-primary-700 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block" />
              Phân công
            </p>

            <div>
              <SelectBox<string>
                label="Bác sĩ theo dõi"
                value={form.doctor ? String(form.doctor) : ''}
                options={[
                  { value: '', label: '— Chọn bác sĩ —' },
                  ...doctorOptions.map((d) => ({ value: String(d.id), label: d.name })),
                ]}
                onChange={(val) => set('doctor', val ? Number(val) : null)}
                searchable
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leader</label>
              {isLeaderMode ? (
                <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 select-none">
                  {myEmployeeName
                    ? `${myEmployeeName}${myEmployeeCode ? ` (${myEmployeeCode})` : ''}`
                    : 'Đang tải...'}
                </div>
              ) : isCtvAssigned ? (
                <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 select-none">
                  {defaultLeaderLabel || 'Đang tải...'}
                </div>
              ) : (
                <SelectBox<string>
                  label=""
                  value={selectedLeaderId}
                  options={[
                    { value: '', label: '' },
                    ...employeeOptions.map((l) => ({
                      value: String(l.id),
                      label: `${l.full_name} (${l.employee_id})${l.doctor_team ? ` — ${l.doctor_team}` : ''}`,
                    })),
                  ]}
                  onChange={(val) => {
                    setSelectedLeaderId(val);
                    set('leader', val ? Number(val) : null);
                    set('assigned_employee', null);
                  }}
                  placeholder={loadingEmployees ? 'Đang tải...' : '— Chọn leader —'}
                  searchable
                />
              )}
            </div>

            {!isCtvAssigned && (
              <div>
                <label className={`block text-sm font-medium mb-1 ${!selectedLeaderId && !isLeaderMode ? 'text-gray-400' : 'text-gray-700'}`}>
                  Nhân viên đảm nhận
                  {!selectedLeaderId && !isLeaderMode && (
                    <span className="ml-2 text-xs font-normal text-gray-400">(chọn leader trước)</span>
                  )}
                </label>
                <div className={!selectedLeaderId && !isLeaderMode ? 'pointer-events-none opacity-40' : ''}>
                  <SelectBox<string>
                    label=""
                    value={form.assigned_employee ? String(form.assigned_employee) : ''}
                    options={[
                      { value: '', label: '' },
                      ...employeeOptions.map((s) => ({
                        value: String(s.id),
                        label: `${s.full_name} (${s.employee_id})${s.doctor_team ? ` — ${s.doctor_team}` : ''}`,
                      })),
                    ]}
                    onChange={(val) => set('assigned_employee', val ? Number(val) : null)}
                    placeholder={loadingEmployees ? 'Đang tải...' : 'Tìm và chọn nhân viên...'}
                    searchable
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Thông tin cơ bản */}
          <div className="rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
              Thông tin cơ bản
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên cộng tác viên <span className="text-primary-500">*</span>
                </label>
                <input type="text" className={inputCls('name')} placeholder="Nguyễn Văn A"
                  value={form.name} onChange={(e) => set('name', e.target.value)} onBlur={() => blurField('name')} />
                {errMsg('name')}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số điện thoại
                </label>
                <input type="text" className={inputCls('phone')} placeholder="0900 000 000"
                  value={form.phone} onChange={(e) => set('phone', e.target.value)} onBlur={() => blurField('phone')} />
                {errMsg('phone')}
              </div>
              <div className="sm:col-span-2">
                <SelectBox<string>
                  label="Dịch vụ"
                  value={form.service ?? ''}
                  options={SERVICE_TAGS.map((tag) => ({ value: tag, label: tag }))}
                  onChange={(val) => set('service', val)}
                  placeholder="— Chọn dịch vụ —"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Thời gian & Hình thức */}
          <div className="rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Thời gian & Hình thức
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày tiếp nhận</label>
                <input type="date" className={inputCls('date_received')}
                  value={form.date_received ?? ''} onChange={(e) => set('date_received', e.target.value)} onBlur={() => blurField('date_received')} />
                {errMsg('date_received')}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TG đăng bài đầu tiên</label>
                <input type="date" className={inputCls('first_post_time')}
                  value={(form.first_post_time ?? '').slice(0, 10)} onChange={(e) => set('first_post_time', e.target.value)} onBlur={() => blurField('first_post_time')} />
                {errMsg('first_post_time')}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian kết thúc</label>
                <input type="date" className={inputCls('end_time')}
                  value={(form.end_time ?? '').slice(0, 10)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm(prev => ({ ...prev, end_time: val, ...(val ? { status: 'INACTIVE' } : {}) }));
                    setErrors(prev => { const next = { ...prev }; delete next['end_time']; return next; });
                  }}
                  onBlur={() => blurField('end_time')} />
                {form.end_time && form.status === 'INACTIVE' && (
                  <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                    <span>⚠</span> Trạng thái sẽ chuyển sang Không hoạt động
                  </p>
                )}
                {errMsg('end_time')}
              </div>
              <div>
                <SelectBox<string>
                  label="Hình thức làm việc"
                  value={form.work_type ?? ''}
                  options={WORK_TYPE_OPTIONS}
                  onChange={(val) => set('work_type', val)}
                  placeholder="Chọn hình thức làm việc..."
                />
              </div>
              <div>
                <SelectBox<string>
                  label="Trạng thái"
                  value={form.status ?? ''}
                  options={[{ value: '', label: '' }, ...STATUS_OPTIONS]}
                  onChange={(val) => {
                    const today = new Date().toISOString().slice(0, 10);
                    setForm(prev => ({
                      ...prev,
                      status: val,
                      ...(val === 'INACTIVE' && !prev.end_time ? { end_time: today } : {}),
                    }));
                  }}
                  placeholder="Chọn trạng thái..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian thanh toán</label>
                <input type="text" className={inputCls('payment_date')}
                  placeholder="VD: 4 hàng tháng, 23 hàng tháng..."
                  value={form.payment_date ?? ''}
                  onChange={(e) => set('payment_date', e.target.value || null)} />
              </div>
            </div>
          </div>

          {/* Section 4: Cá nhân & Tài chính */}
          <div className="rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-amber-700 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              Cá nhân & Tài chính
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bác sĩ trước đây làm CTV</label>
                <input type="text" className={inputCls('previous_doctor')} placeholder="Tên bác sĩ"
                  value={form.previous_doctor ?? ''} onChange={(e) => set('previous_doctor', e.target.value)} />
              </div> */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số căn cước công dân</label>
                <input type="text" className={inputCls('cccd_number')} placeholder="012345678901"
                  value={form.cccd_number ?? ''} onChange={(e) => set('cccd_number', e.target.value)} onBlur={() => blurField('cccd_number')} />
                {errMsg('cccd_number')}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ email</label>
                <input type="email" className={inputCls('email')} placeholder="example@email.com"
                  value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} onBlur={() => blurField('email')} />
                {errMsg('email')}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản ngân hàng</label>
                <input type="text" className={inputCls('bank_account')} placeholder="0123456789"
                  value={form.bank_account ?? ''} onChange={(e) => set('bank_account', e.target.value)} onBlur={() => blurField('bank_account')} />
                {errMsg('bank_account')}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngân hàng</label>
                <input type="text" className={inputCls('bank_name')} placeholder="Vietcombank, Techcombank..."
                  value={form.bank_name ?? ''} onChange={(e) => set('bank_name', e.target.value)} onBlur={() => blurField('bank_name')} />
                {errMsg('bank_name')}
              </div>
            </div>
          </div>

          {/* Section 5: Ghi chú & Ảnh */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú Marketing</label>
              <textarea rows={3} className={inputCls('note_marketing') + ' resize-none'} placeholder="Nhập ghi chú..."
                value={form.note_marketing ?? ''} onChange={(e) => set('note_marketing', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh căn cước công dân</label>
              <p className="text-xs text-gray-400 mb-2">Chấp nhận JPG, PNG — tối đa 10MB</p>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Xem trước ảnh CCCD"
                    className="max-h-48 rounded-lg border border-gray-200 object-contain" />
                  <button type="button" onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow">
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 w-full border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors justify-center">
                  <PhotoIcon className="w-5 h-5" />
                  Nhấn để chọn ảnh
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleImageChange} />
              {errMsg('cccd_image')}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/80 rounded-b-2xl sticky bottom-0">
          <button type="button" onClick={onClose} disabled={loading}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
            Hủy
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading}
            className="min-w-[130px] px-5 py-2 text-sm rounded-lg flex items-center justify-center gap-2 font-medium transition-colors bg-primary-600 hover:bg-primary-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            {loading && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
            {loading ? 'Đang lưu...' : mode === 'create' ? 'Tạo mới' : 'Lưu thay đổi'}
          </button>
        </div>

      </div>
    </div>
  );
};

// ============================================================
// CTV IMPORT DIALOG
// ============================================================

interface CTVImportDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

const TEMPLATE_COLUMNS = [
  'Mã nhân viên đảm nhận',
  'Tên cộng tác viên',
  'Số điện thoại',
  'Dịch vụ',
  'Ngày tiếp nhận (dd/mm/yyyy)',
  'TG đăng bài đầu tiên (dd/mm/yyyy)',
  'Thời gian kết thúc (dd/mm/yyyy)',
  'Hình thức làm việc (HIRE_IMAGE_MEDIA/HIRE_PER_POST/FREE_3_MONTHS)',
  'Trạng thái (ACTIVE/DISCUSSING/INACTIVE)',
  'Ghi chú Marketing',
  'Bác sĩ trước đây',
  'Số CCCD',
  'Email',
  'Số tài khoản',
  'Ngân hàng',
];

const CTVImportDialog: React.FC<CTVImportDialogProps> = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    errors: { row: number; error: string }[];
  } | null>(null);
  const [error, setError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Mẫu import CTV');

      const HEADER_FILL = {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FF1E3A5F' },
      };

      sheet.columns = TEMPLATE_COLUMNS.map((header) => ({
        header,
        key: header,
        width: Math.max(header.length + 4, 20),
      }));

      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = HEADER_FILL;
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
      headerRow.height = 36;

      sheet.addRow({
        'Mã nhân viên đảm nhận': 'TA00001',
        'Tên cộng tác viên': 'Nguyễn Văn A',
        'Số điện thoại': '0901234567',
        'Dịch vụ': 'Chụp ảnh sản phẩm',
        'Ngày tiếp nhận (dd/mm/yyyy)': '01/01/2024',
        'TG đăng bài đầu tiên (dd/mm/yyyy)': '15/01/2024',
        'Thời gian kết thúc (dd/mm/yyyy)': '',
        'Hình thức làm việc (HIRE_IMAGE_MEDIA/HIRE_PER_POST/FREE_3_MONTHS)': 'HIRE_IMAGE_MEDIA',
        'Trạng thái (ACTIVE/DISCUSSING/INACTIVE)': 'ACTIVE',
        'Ghi chú Marketing': '',
        'Bác sĩ trước đây': '',
        'Số CCCD': '012345678901',
        'Email': 'nguyenvana@email.com',
        'Số tài khoản': '1234567890',
        'Ngân hàng': 'Vietcombank',
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mau_import_ctv.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Tải file mẫu thất bại: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx')) {
      setError('Chỉ hỗ trợ file .xlsx');
      return;
    }
    setError('');
    setResult(null);
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await ctvAPI.importFile(file);
      setResult({ created: res.created, errors: res.errors });
      if (res.created > 0) onSuccess();
    } catch (err: any) {
      setError('Import thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Import CTV từ Excel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-900 mb-1">Bước 1: Tải file mẫu</p>
            <p className="text-xs text-blue-700 mb-3">
              Điền thông tin CTV vào file mẫu theo đúng định dạng cột yêu cầu rồi lưu lại.
            </p>
            <button type="button" onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
              <DocumentArrowDownIcon className="w-4 h-4" />
              Tải file mẫu (.xlsx)
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">Bước 2: Upload file đã điền</p>
            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                  isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <CloudArrowUpIcon className={`w-10 h-10 mb-2 transition-colors ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                <p className="text-sm text-gray-700 font-medium">
                  <span className="text-blue-600">Nhấn để chọn file</span> hoặc kéo thả vào đây
                </p>
                <p className="text-xs text-gray-500 mt-1">Chỉ hỗ trợ .xlsx</p>
                <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden"
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected) handleFileSelect(selected);
                    e.target.value = '';
                  }} />
              </div>
            ) : (
              <div className="relative flex items-center p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                <div className="flex-shrink-0 bg-emerald-100 p-2 rounded-lg mr-3">
                  <CloudArrowUpIcon className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-900 truncate">{file.name}</p>
                  <p className="text-xs text-emerald-600">{(file.size / 1024).toFixed(1)} KB — Sẵn sàng import</p>
                </div>
                <button type="button" onClick={() => { setFile(null); setResult(null); setError(''); }}
                  className="ml-3 p-1 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 rounded-full transition-colors">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {result && (
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Kết quả import</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-600 font-medium">Tạo mới thành công</p>
                  <p className="text-2xl font-extrabold text-emerald-700 mt-1">{result.created}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-red-600 font-medium">Lỗi</p>
                  <p className="text-2xl font-extrabold text-red-700 mt-1">{result.errors.length}</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 border-b border-gray-200">
                    Chi tiết lỗi theo dòng
                  </div>
                  <div className="max-h-44 overflow-y-auto divide-y divide-gray-100">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="px-3 py-2 text-xs">
                        <span className="font-semibold text-gray-700">Dòng {err.row}:</span>
                        <span className="text-red-600 ml-2">{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.created > 0 && result.errors.length === 0 && (
                <p className="text-sm text-emerald-700 font-medium text-center mt-1">Import hoàn tất thành công!</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
            Hủy
          </button>
          <button type="button" onClick={handleImport} disabled={!file || loading}
            className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-xl transition-colors ${
              !file || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}>
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Đang import...
              </>
            ) : (
              <>
                <CloudArrowUpIcon className="w-4 h-4" />
                Import
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// CTVLIST PAGE
// ============================================================

const CTVList: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.is_super_admin || user?.is_superuser;

  // isRealAdminOrHR: ADMIN/HR thật sự — thấy tất cả CTV, không lock
  const isRealAdminOrHR =
    isSuperAdmin ||
    user?.hrm_user?.is_hr ||
    user?.employee_profile?.is_hr ||
    user?.role?.toUpperCase() === 'ADMIN' ||
    user?.role?.toUpperCase() === 'HR';

  // isAdminLike: dùng để hiển thị cột Leader, nút xóa/sửa, v.v.
  const isAdminLike =
    isRealAdminOrHR ||
    user?.hrm_user?.can_manage_ctv ||
    user?.employee_permission?.can_manage_ctv;

  // isCtvLeaderOnly: leader CTV nhưng không phải ADMIN/HR → lock về CTV của leader đó
  const isCtvLeaderOnly = !isRealAdminOrHR && !!(user?.is_ctv_leader || user?.hrm_user?.is_ctv_leader);
  // isCtvAssignedOnly: nhân sự được gán CTV, không phải admin/HR/leader → chỉ thấy CTV mình đảm nhận
  const isCtvAssignedOnly = !isRealAdminOrHR && !isCtvLeaderOnly && !!(user?.hrm_user?.is_ctv_assigned);
  const currentEmployeeId = user?.hrm_user?.employee_id || user?.employee_profile?.employee_id;

  const [ctvList, setCtvList] = useState<CTV[]>([]);
  const [stats, setStats] = useState<CTVStats | null>(null);
  const [leaders, setLeaders] = useState<CTVFilterEmployee[]>([]);
  const [staffList, setStaffList] = useState<CTVFilterEmployee[]>([]);

  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [workTypeFilter, setWorkTypeFilter] = useState<string[]>([]);
  const [leaderFilter, setLeaderFilter] = useState<string[]>([]);
  const [staffFilter, setStaffFilter] = useState<string[]>([]);
  const [doctorFilter, setDoctorFilter] = useState<string[]>([]);
  const [filterDoctors, setFilterDoctors] = useState<Doctor[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingCTV, setEditingCTV] = useState<CTV | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CTV | null>(null);
  const [viewingCTV, setViewingCTV] = useState<CTV | null>(null);
  const [confirmExpiredId, setConfirmExpiredId] = useState<number | null>(null);
  const [confirmExpiredPos, setConfirmExpiredPos] = useState<{ top: number; left: number } | null>(null);
  const [updatingExpired, setUpdatingExpired] = useState(false);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set([
    'doctor', 'leader', 'assigned', 'name', 'phone', 'service',
    'date_received', 'status', 'note_marketing',
  ]));
  const columnToggleRef = useRef<HTMLDivElement>(null);

  const OPTIONAL_COLUMNS = [
    { key: 'doctor',        label: 'Bác sĩ theo dõi' },
    { key: 'leader',        label: 'Leader' },
    { key: 'assigned',      label: 'Nhân viên đảm nhận' },
    { key: 'phone',         label: 'Số điện thoại' },
    { key: 'service',       label: 'Dịch vụ' },
    { key: 'date_received', label: 'Ngày tiếp nhận' },
    { key: 'end_time',      label: 'Thời gian kết thúc' },
    { key: 'work_type',     label: 'Hình thức làm việc' },
    { key: 'first_post',    label: 'TG đăng bài đầu tiên' },
    { key: 'payment_date',  label: 'Thời gian thanh toán' },
    { key: 'note_marketing',label: 'Ghi chú Marketing' },
  ];

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };


  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const leaderLockedRef = useRef(false);
  const staffLockedRef = useRef(false);

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, wasDragging: false });

  const onTableMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = tableScrollRef.current;
    if (!el) return;
    dragState.current = { isDown: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft, wasDragging: false };
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  };
  const onTableMouseLeave = () => {
    const el = tableScrollRef.current;
    if (!el) return;
    dragState.current.isDown = false;
    el.style.cursor = '';
    el.style.userSelect = '';
  };
  const onTableMouseUp = () => {
    const el = tableScrollRef.current;
    if (!el) return;
    dragState.current.isDown = false;
    el.style.cursor = '';
    el.style.userSelect = '';
  };
  const onTableMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = tableScrollRef.current;
    if (!dragState.current.isDown || !el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const moved = Math.abs(x - dragState.current.startX);
    if (moved > 5) dragState.current.wasDragging = true;
    el.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX);
  };

  const fetchCTVs = async () => {
    try {
      setLoading(true);
      const params: CTVListParams = { page: currentPage, page_size: itemsPerPage, ordering: 'status,id' };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter.length) params.status = statusFilter.join(',');
      if (workTypeFilter.length) params.work_type = workTypeFilter.join(',');
      if (leaderFilter.length) params.leader_id = leaderFilter.join(',') as any;
      if (staffFilter.length) params.staff_id = staffFilter.join(',') as any;
      if (doctorFilter.length) params.doctor = doctorFilter.join(',') as any;

      const response = await ctvAPI.list(params);
      setCtvList(response.results);
      setTotalCount(response.count);
    } catch (err) {
      console.error('Error fetching CTVs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (doctorId?: number) => {
    try {
      const data = await ctvAPI.stats(doctorId ? { doctor_id: doctorId } : undefined);
      setStats(data);
    } catch (err) {
      console.error('Error fetching CTV stats:', err);
    }
  };

  const fetchFilters = async (leaderId?: number) => {
    try {
      const [leaderData, staffData] = await Promise.all([
        ctvAPI.myLeaders(),
        ctvAPI.myStaff(leaderId),
      ]);
      setLeaders(leaderData);
      setStaffList(staffData);
    } catch (err) {
      console.error('Error fetching filters:', err);
    }
  };

  const fetchFilterDoctors = (leaderId?: number) => {
    const params: { is_active: boolean; leader_id?: number } = { is_active: true };
    if (leaderId) params.leader_id = leaderId;
    doctorAPI.list(params).then(setFilterDoctors).catch(console.error);
  };

  useEffect(() => {
    fetchStats();
    fetchFilters();
    fetchFilterDoctors();
  }, []);

  useEffect(() => {
    if (!isCtvLeaderOnly || leaderLockedRef.current || !leaders.length || !currentEmployeeId) return;
    const myRecord = leaders.find((l) => l.employee_id === currentEmployeeId);
    if (myRecord) {
      leaderLockedRef.current = true;
      setLeaderFilter([String(myRecord.id)]);
    }
  }, [leaders]);

  useEffect(() => {
    if (!isCtvAssignedOnly || staffLockedRef.current || !staffList.length || !currentEmployeeId) return;
    const myRecord = staffList.find((s) => s.employee_id === currentEmployeeId);
    if (myRecord) {
      staffLockedRef.current = true;
      setStaffFilter([String(myRecord.id)]);
    }
  }, [staffList]);

  useEffect(() => {
    fetchStats(doctorFilter.length === 1 ? Number(doctorFilter[0]) : undefined);
  }, [doctorFilter]);

  useEffect(() => {
    const lid = leaderFilter.length === 1 ? Number(leaderFilter[0]) : undefined;
    fetchFilters(lid);
    fetchFilterDoctors(isCtvLeaderOnly ? lid : undefined);
    setStaffFilter([]);
  }, [leaderFilter]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => { fetchCTVs(); }, 400);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchTerm, statusFilter, workTypeFilter, leaderFilter, staffFilter, doctorFilter, currentPage, itemsPerPage]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (columnToggleRef.current && !columnToggleRef.current.contains(e.target as Node)) {
        setShowColumnToggle(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (confirmExpiredId === null) return;
    const close = () => { setConfirmExpiredId(null); setConfirmExpiredPos(null); };
    window.addEventListener('scroll', close, true);
    tableScrollRef.current?.addEventListener('scroll', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      tableScrollRef.current?.removeEventListener('scroll', close);
    };
  }, [confirmExpiredId]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await ctvAPI.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchCTVs();
      fetchStats();
    } catch (err: any) {
      alert('Xóa thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmExpired = async (ctvId: number) => {
    setUpdatingExpired(true);
    try {
      const fd = new FormData();
      fd.append('status', 'INACTIVE');
      await ctvAPI.update(ctvId, fd);
      setConfirmExpiredId(null);
      fetchCTVs();
      fetchStats();
    } catch (err: any) {
      alert('Cập nhật thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setUpdatingExpired(false);
    }
  };

  const handleExport = async () => {
    try {
      const params: CTVListParams = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter.length) params.status = statusFilter.join(',');
      if (workTypeFilter.length) params.work_type = workTypeFilter.join(',');
      if (leaderFilter.length) params.leader_id = leaderFilter.join(',') as any;
      if (staffFilter.length) params.staff_id = staffFilter.join(',') as any;
      if (doctorFilter.length) params.doctor = doctorFilter.join(',') as any;

      const blob = await ctvAPI.exportAll(params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `danh-sach-ctv-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Xuất file thất bại: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCTV(null);
    fetchCTVs();
    fetchStats();
    fetchFilters(leaderFilter.length === 1 ? Number(leaderFilter[0]) : undefined);
  };

  const handleImportSuccess = () => {
    setShowImport(false);
    fetchCTVs();
    fetchStats();
    fetchFilters();
  };

  const formatEmployee = (emp: CTVFilterEmployee) =>
    `${emp.employee_id} - ${emp.full_name}${emp.doctor_team ? ` (${emp.doctor_team})` : ''}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">Đang hoạt động</span>;
      case 'DISCUSSING':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Đang trao đổi</span>;
      case 'INACTIVE':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-600">Không hoạt động</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const STATUS_PRIORITY: Record<string, number> = { ACTIVE: 0, DISCUSSING: 1, INACTIVE: 2 };
  const sortedCtvList = [...ctvList].sort(
    (a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9)
  );

  const getWorkTypeLabel = (workType?: string) => {
    switch (workType) {
      case 'HIRE_IMAGE_MEDIA': return 'Thuê ảnh media';
      case 'HIRE_PER_POST': return 'Thuê theo bài';
      case 'FREE_3_MONTHS': return 'Miễn phí 3 tháng';
      default: return workType || null;
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Quản lý Cộng Tác Viên</h1>
            <p className="text-sm text-gray-500">Quản lý danh sách cộng tác viên, trạng thái và thông tin liên quan.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {/* Stats cards */}
          {stats && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900">Thống kê cộng tác viên</h2>
                {doctorFilter.length === 1 && (
                  <span className="text-xs text-primary-600 font-medium">
                    {filterDoctors.find(d => String(d.id) === doctorFilter[0])?.name ?? 'Bác sĩ đã chọn'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-emerald-500 shadow-sm p-4">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Đang hoạt động</p>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.active}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-amber-500 shadow-sm p-4">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Đang trao đổi</p>
                  <p className="text-2xl font-extrabold text-amber-600 mt-1">{stats.discussing}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-blue-500 shadow-sm p-4">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Tổng đã tiếp nhận</p>
                  <p className="text-2xl font-extrabold text-blue-600 mt-1">{stats.active + stats.discussing}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-red-400 shadow-sm p-4">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Không hoạt động</p>
                  <p className="text-2xl font-extrabold text-red-500 mt-1">{stats.inactive}</p>
                </div>
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div className="mb-6 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="input-field w-full pr-8"
                    placeholder="Tên, SĐT, mã CTV..."
                  />
                  {loading && (
                    <div className="absolute inset-y-0 right-2 flex items-center">
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-600" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <MultiSelectBox<string>
                  label="Trạng thái"
                  value={statusFilter}
                  options={[
                    { value: 'ACTIVE', label: 'Đang hoạt động' },
                    { value: 'DISCUSSING', label: 'Đang trao đổi' },
                    { value: 'INACTIVE', label: 'Không hoạt động' },
                  ]}
                  allLabel="Tất cả trạng thái"
                  onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <MultiSelectBox<string>
                  label="Hình thức làm việc"
                  value={workTypeFilter}
                  options={[
                    { value: 'HIRE_IMAGE_MEDIA', label: 'Thuê hình ảnh + kênh truyền thông' },
                    { value: 'HIRE_PER_POST', label: 'Thuê Theo Bài Đăng' },
                    { value: 'FREE_3_MONTHS', label: 'Free 3 tháng đầu' },
                  ]}
                  allLabel="Tất cả hình thức"
                  onChange={(val) => { setWorkTypeFilter(val); setCurrentPage(1); }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <MultiSelectBox<string>
                  label="Bác sĩ theo dõi"
                  value={doctorFilter}
                  options={filterDoctors.map((d) => ({ value: String(d.id), label: d.name }))}
                  allLabel="Tất cả bác sĩ"
                  onChange={(val) => { setDoctorFilter(val); setCurrentPage(1); }}
                />
              </div>

              {!isCtvLeaderOnly && !isCtvAssignedOnly && (
                <div className="flex-1 min-w-0">
                  <MultiSelectBox<string>
                    label="Leader"
                    value={leaderFilter}
                    options={leaders.map((l) => ({ value: String(l.id), label: formatEmployee(l) }))}
                    allLabel="Tất cả leader"
                    onChange={(val) => { setLeaderFilter(val); setCurrentPage(1); }}
                  />
                </div>
              )}

              {!isCtvAssignedOnly && (
                <div className="flex-1 min-w-0">
                  <MultiSelectBox<string>
                    label="Nhân viên đảm nhận"
                    value={staffFilter}
                    options={staffList.map((s) => ({ value: String(s.id), label: formatEmployee(s) }))}
                    allLabel="Tất cả nhân viên"
                    onChange={(val) => { setStaffFilter(val); setCurrentPage(1); }}
                  />
                </div>
              )}

            </div>
          </div>

          {/* Action bar */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Danh sách cộng tác viên</h2>
              <p className="text-gray-500 text-sm">Tổng số: {stats ? stats.active + stats.discussing : totalCount} CTV</p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Column toggle */}
              <div className="relative" ref={columnToggleRef}>
                <button onClick={() => setShowColumnToggle(v => !v)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 4v16M15 4v16M4 9h16M4 15h16" />
                  </svg>
                  Cột hiển thị
                  <span className="text-xs bg-primary-100 text-primary-700 rounded-full px-1.5 py-0.5 font-semibold">
                    {visibleColumns.size}
                  </span>
                </button>
                {showColumnToggle && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 p-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1 mb-1">Tùy chỉnh cột</p>
                    <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer border-b border-gray-100 mb-1">
                      <input type="checkbox"
                        checked={OPTIONAL_COLUMNS.every(c => visibleColumns.has(c.key))}
                        onChange={() => {
                          const allVisible = OPTIONAL_COLUMNS.every(c => visibleColumns.has(c.key));
                          setVisibleColumns(allVisible
                            ? new Set(['name', 'status'])
                            : new Set(OPTIONAL_COLUMNS.map(c => c.key))
                          );
                        }}
                        className="w-3.5 h-3.5 accent-primary-600 rounded" />
                      <span className="text-sm font-semibold text-gray-700">Hiện tất cả</span>
                    </label>
                    {OPTIONAL_COLUMNS.map(col => (
                      <label key={col.key} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={visibleColumns.has(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          className="w-3.5 h-3.5 accent-primary-600 rounded" />
                        <span className="text-sm text-gray-700">{col.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={handleExport}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Xuất Excel
              </button>
              <button onClick={() => setShowImport(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-emerald-700 bg-white border border-emerald-400 rounded-xl hover:bg-emerald-50 transition-colors">
                <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                Import Excel
              </button>
              <button onClick={() => { setEditingCTV(null); setShowForm(true); }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors">
                <PlusIcon className="w-4 h-4 mr-2" />
                Thêm CTV
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
            </div>
          ) : ctvList.length === 0 ? (
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Nhân viên đảm nhận','Tên cộng tác viên','Số điện thoại','Dịch vụ','Ngày tiếp nhận','Thời gian kết thúc','Hình thức làm việc','Thời gian đăng bài đầu tiên','Thời gian thanh toán',/* 'Bác sĩ trước đây làm', */'Trạng thái','Thao tác'].map((col) => (
                      <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td colSpan={13} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <div className="h-12 w-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <UsersIcon className="h-7 w-7" />
                        </div>
                        <p className="text-lg font-medium text-gray-900">Chưa có cộng tác viên nào</p>
                        <p className="text-gray-500 mt-1">Bắt đầu bằng cách thêm cộng tác viên mới hoặc điều chỉnh bộ lọc.</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <>
              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <div ref={tableScrollRef} className="overflow-x-auto cursor-grab"
                  onMouseDown={onTableMouseDown} onMouseLeave={onTableMouseLeave}
                  onMouseUp={onTableMouseUp} onMouseMove={onTableMouseMove}>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {/* Sticky left — Tên CTV */}
                        <th className="sticky left-0 z-20 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">Tên cộng tác viên</th>
                        {visibleColumns.has('doctor') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Bác sĩ theo dõi</th>}
                        {visibleColumns.has('leader') && isAdminLike && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Leader</th>}
                        {visibleColumns.has('assigned') && !isCtvAssignedOnly && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Nhân viên đảm nhận</th>}
                        {visibleColumns.has('phone') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Số điện thoại</th>}
                        {visibleColumns.has('service') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Dịch vụ</th>}
                        {visibleColumns.has('date_received') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Ngày tiếp nhận</th>}
                        {visibleColumns.has('end_time') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Thời gian kết thúc</th>}
                        {visibleColumns.has('work_type') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Hình thức làm việc</th>}
                        {visibleColumns.has('first_post') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">TG đăng bài đầu tiên</th>}
                        {visibleColumns.has('payment_date') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Thời gian thanh toán</th>}
                        {visibleColumns.has('note_marketing') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Ghi chú Marketing</th>}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Trạng thái</th>
                        {/* Sticky right — Thao tác */}
                        <th className="sticky right-0 z-20 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedCtvList.map((ctv, idx) => {
                        const prevStatus = idx > 0 ? sortedCtvList[idx - 1].status : null;
                        const showDivider = idx > 0 && prevStatus !== ctv.status;
                        const statusLabel = ctv.status === 'ACTIVE' ? 'Đang hoạt động' : ctv.status === 'DISCUSSING' ? 'Đang trao đổi' : 'Không hoạt động';
                        return (
                        <React.Fragment key={ctv.id}>
                        {showDivider && (
                          <tr className="bg-gray-50">
                            <td colSpan={99} className="px-6 py-1.5">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-xs font-medium text-gray-400 whitespace-nowrap">{statusLabel}</span>
                                <div className="flex-1 h-px bg-gray-200" />
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { if (!dragState.current.wasDragging) setViewingCTV(ctv); }}>
                          {/* Sticky left */}
                          <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                            <span className="text-sm font-medium text-gray-900">{ctv.name}</span>
                          </td>
                          {visibleColumns.has('doctor') && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">{emptyVal(ctv.doctor_name)}</span>
                            </td>
                          )}
                          {visibleColumns.has('leader') && isAdminLike && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              {ctv.leader_name ? (
                                <span className="text-sm text-gray-900">{ctv.leader_code} – {ctv.leader_name}</span>
                              ) : (
                                <span className="text-sm text-gray-400 italic">Chưa có dữ liệu</span>
                              )}
                            </td>
                          )}
                          {visibleColumns.has('assigned') && !isCtvAssignedOnly && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              {ctv.assigned_employee_code && ctv.assigned_employee_name ? (
                                <span className="text-sm text-gray-900">{ctv.assigned_employee_code} – {ctv.assigned_employee_name}</span>
                              ) : (
                                <span className="text-sm text-gray-400 italic">Chưa phân công</span>
                              )}
                            </td>
                          )}
                          {visibleColumns.has('phone') && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{emptyVal(ctv.phone)}</span>
                            </td>
                          )}
                          {visibleColumns.has('service') && (
                            <td className="px-6 py-4 max-w-[160px]">
                              <span className="text-sm text-gray-900 block truncate" title={ctv.service || ''}>{emptyVal(ctv.service)}</span>
                            </td>
                          )}
                          {visibleColumns.has('date_received') && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{emptyVal(toDisplayDate(ctv.date_received))}</span>
                            </td>
                          )}
                          {visibleColumns.has('end_time') && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              {(() => {
                                const isExpired = ctv.end_time && ctv.end_time.slice(0, 10) <= todayStr && ctv.status !== 'INACTIVE';
                                if (!ctv.end_time) return <span className="text-sm text-gray-400 italic">Chưa có dữ liệu</span>;
                                return (
                                  <div className="flex flex-col gap-1">
                                    <span className={`text-sm font-medium ${isExpired ? 'text-orange-600' : 'text-gray-900'}`}>
                                      {isExpired && <span className="mr-1">⚠</span>}
                                      {toDisplayDate(ctv.end_time)}
                                    </span>
                                    {isExpired && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirmExpiredId === ctv.id) {
                                            setConfirmExpiredId(null);
                                            setConfirmExpiredPos(null);
                                          } else {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setConfirmExpiredPos({ top: rect.top, left: rect.left });
                                            setConfirmExpiredId(ctv.id);
                                          }
                                        }}
                                        className="text-xs font-medium text-orange-600 underline underline-offset-2 hover:text-orange-700 transition-colors"
                                      >
                                        Chuyển Không hoạt động?
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                          )}
                          {visibleColumns.has('work_type') && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{emptyVal(ctv.work_type_display || getWorkTypeLabel(ctv.work_type))}</span>
                            </td>
                          )}
                          {visibleColumns.has('first_post') && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{emptyVal(toDisplayDate(ctv.first_post_time))}</span>
                            </td>
                          )}
                          {visibleColumns.has('payment_date') && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{emptyVal(ctv.payment_date)}</span>
                            </td>
                          )}
                          {visibleColumns.has('note_marketing') && (
                            <td className="px-6 py-4 max-w-[180px]">
                              <span className="text-sm text-gray-900 block truncate" title={ctv.note_marketing || ''}>{emptyVal(ctv.note_marketing)}</span>
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(ctv.status)}</td>
                          {/* Sticky right */}
                          <td className="sticky right-0 z-10 bg-white px-6 py-4 whitespace-nowrap shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => setViewingCTV(ctv)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                                <EyeIcon className="w-3.5 h-3.5" />
                                Chi tiết
                              </button>
                              <button onClick={() => { setEditingCTV(ctv); setShowForm(true); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors">
                                <PencilSquareIcon className="w-3.5 h-3.5" />
                                Sửa
                              </button>
                              <button onClick={() => setDeleteTarget(ctv)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                                <TrashIcon className="w-3.5 h-3.5" />
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                        </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title="Xóa cộng tác viên"
        message={deleteTarget ? `Bạn có chắc chắn muốn xóa CTV "${deleteTarget.name}" (${deleteTarget.ctv_id})?\nHành động này không thể hoàn tác.` : ''}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* CTV Form */}
      {showForm && (
        <CTVForm
          mode={editingCTV ? 'edit' : 'create'}
          initialData={editingCTV}
          onSuccess={handleFormSuccess}
          onClose={() => { setShowForm(false); setEditingCTV(null); }}
          defaultLeaderId={isCtvAssignedOnly && !editingCTV ? leaders[0]?.id : undefined}
          defaultLeaderLabel={isCtvAssignedOnly && !editingCTV ? `${leaders[0]?.full_name ?? ''}${leaders[0]?.employee_id ? ` (${leaders[0].employee_id})` : ''}` : undefined}
        />
      )}

      {/* Import dialog */}
      {showImport && (
        <CTVImportDialog
          onSuccess={handleImportSuccess}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Detail modal */}
      {viewingCTV && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setViewingCTV(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">

            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                  <UsersIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{viewingCTV.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 font-mono">{viewingCTV.ctv_id}</span>
                    <span className="text-gray-200">·</span>
                    {getStatusBadge(viewingCTV.status)}
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingCTV(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-primary-700 uppercase tracking-wider mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block" />
                  Phân công
                </p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div className="col-span-2 flex items-center gap-3 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2">
                    <span className="text-xs font-medium text-primary-500 shrink-0">Bác sĩ theo dõi</span>
                    <span className="text-sm font-semibold text-primary-700">
                      {viewingCTV.doctor_name || <span className="text-gray-400 italic font-normal">Chưa có dữ liệu</span>}
                    </span>
                  </div>
                  <DetailRow label="Leader" value={viewingCTV.leader_name ? `${viewingCTV.leader_code} – ${viewingCTV.leader_name}` : undefined} />
                  <DetailRow label="Nhân viên đảm nhận" value={viewingCTV.assigned_employee_name ? `${viewingCTV.assigned_employee_code} – ${viewingCTV.assigned_employee_name}` : undefined} />
                  {/* <DetailRow label="Bác sĩ trước đây làm CTV" value={viewingCTV.previous_doctor} /> */}
                </dl>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                  Thông tin cơ bản
                </p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <DetailRow label="Số điện thoại" value={viewingCTV.phone} />
                  <DetailRow label="Địa chỉ email" value={viewingCTV.email} />
                  <div className="col-span-2">
                    <DetailRow label="Dịch vụ" value={viewingCTV.service} />
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Thời gian & Hình thức
                </p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <DetailRow label="Ngày tiếp nhận" value={toDisplayDate(viewingCTV.date_received)} />
                  <DetailRow label="TG đăng bài đầu tiên" value={toDisplayDate(viewingCTV.first_post_time)} />
                  <DetailRow label="Thời gian kết thúc" value={toDisplayDate(viewingCTV.end_time)} />
                  <div>
                    <dt className="text-xs text-gray-400 mb-0.5">Thời gian thanh toán</dt>
                    <dd>
                      {viewingCTV.payment_date ? (
                        <span className="text-sm text-gray-900">{viewingCTV.payment_date}</span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Chưa có dữ liệu</span>
                      )}
                    </dd>
                  </div>
                  <DetailRow label="Hình thức làm việc" value={viewingCTV.work_type_display || getWorkTypeLabel(viewingCTV.work_type)} />
                </dl>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  Cá nhân & Tài chính
                </p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <DetailRow label="Số CCCD" value={viewingCTV.cccd_number} />
                  <DetailRow label="Số tài khoản" value={viewingCTV.bank_account} />
                  <DetailRow label="Ngân hàng" value={viewingCTV.bank_name} />
                </dl>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ghi chú Marketing</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 leading-relaxed overflow-hidden min-h-[48px]">
                  {viewingCTV.note_marketing || <span className="text-gray-400 italic">Không có ghi chú</span>}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ảnh căn cước công dân</p>
                {viewingCTV.cccd_image ? (
                  <img src={viewingCTV.cccd_image} alt="CCCD" className="rounded-xl max-h-64 object-contain border border-gray-200 shadow-sm" />
                ) : (
                  <div className="flex items-center justify-center h-24 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400 italic">
                    Chưa có ảnh
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50/80 border-t border-gray-100 px-6 py-4 flex justify-between items-center rounded-b-2xl">
              <button onClick={() => setViewingCTV(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors">
                Đóng
              </button>
              <button onClick={() => { setViewingCTV(null); setEditingCTV(viewingCTV); setShowForm(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm">
                <PencilSquareIcon className="w-4 h-4" />
                Chỉnh sửa
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Tooltip xác nhận chuyển INACTIVE — fixed để thoát overflow table */}
      {confirmExpiredId !== null && confirmExpiredPos && (() => {
        const ctv = sortedCtvList.find(c => c.id === confirmExpiredId);
        if (!ctv) return null;
        return (
          <div
            style={{ position: 'fixed', top: confirmExpiredPos.top - 8, left: confirmExpiredPos.left, transform: 'translateY(-100%)', zIndex: 9999 }}
            className="bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-52"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs text-gray-700 mb-2 leading-relaxed">
              Chuyển <span className="font-semibold">{ctv.name}</span> sang Không hoạt động?
            </p>
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleConfirmExpired(ctv.id); }}
                disabled={updatingExpired}
                className="flex-1 px-2 py-1 text-xs font-medium rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {updatingExpired ? '...' : 'Xác nhận'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmExpiredId(null); setConfirmExpiredPos(null); }}
                className="flex-1 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        );
      })()}
    </>
  );
};

export default CTVList;
