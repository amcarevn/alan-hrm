import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { positionsAPI, employeesAPI } from '../utils/api';
import {
  ArrowPathIcon,
  LinkIcon,
  EnvelopeIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import onboardingService from '../services/onboarding.service';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';
import { SelectBox } from '../components/LandingLayout/SelectBox';
import { useDebounce } from '../hooks/useDebounce';

// ============================================
// TYPES
// ============================================

type TokenStatus = 'not_generated' | 'active' | 'expired' | 'completed';

type OnboardingItem = {
  id: number;
  onboarding_code?: string | null;
  employee_id?: string | null;        // ✅ thêm mã nhân viên
  candidate_name: string;
  candidate_email?: string | null;
  position?: { id: number; title: string; code: string } | null;
  department?: { id: number; name: string; code: string } | null;
  department_name?: string | null;
  start_date: string;
  status?: string | null;
  progress_percentage?: number | string | null;
  full_name?: string | null;
  position_title?: string | null;
  token_status?: TokenStatus | null;
  token_expires_at?: string | null;
  employee_form_url?: string | null;
  employee_info_completed?: boolean;
  task1_status?: string; // PENDING, IN_PROGRESS, COMPLETED
};

// ── Bỏ candidate_phone, thêm direct_manager_id ──
type CreateOnboardingForm = {
  candidate_name: string;
  gender: 'M' | 'F' | 'O';
  candidate_email: string;
  direct_manager_id: string;
};

type EmployeeOption = {
  id: number;
  full_name: string;
  employee_id: string;
};

type ApiResponse<T> = { results?: T[]; count?: number } | T[];

const getProgressPercentage = (value?: number | string | null): number => {
  if (value == null) return 0;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

const getStatusBadge = (status?: string | null) => {
  const map: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Nháp', color: 'bg-gray-100 text-gray-700' },
    PENDING: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-700' },
    IN_PROGRESS: { label: 'Đang thực hiện', color: 'bg-blue-100 text-blue-700' },
    COMPLETED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
  };
  if (!status) return null;
  const cfg = map[status] ?? map.DRAFT;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};


// ============================================
// CREATE ONBOARDING MODAL
// ============================================

type CreateModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

const CreateOnboardingModal: React.FC<CreateModalProps> = ({ onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [form, setForm] = useState<CreateOnboardingForm>({
    candidate_name: '',
    gender: 'M',
    candidate_email: '',
    direct_manager_id: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateOnboardingForm, string>>>({});

  useEffect(() => {
    const fetchManagers = async () => {
      setLoadingEmployees(true);
      try {
        const posData = await positionsAPI.list({ is_management: true, page_size: 100 });
        const managementPositions = posData.results ?? [];
        if (managementPositions.length === 0) {
          setEmployees([]);
          setLoadingEmployees(false);
          return;
        }
        const empRequests = managementPositions.map((pos) =>
          employeesAPI.list({ position: pos.id, page_size: 1000 })
        );
        const empResults = await Promise.all(empRequests);
        const seenIds = new Set<number>();
        const list: EmployeeOption[] = [];
        for (const result of empResults) {
          for (const e of result.results ?? []) {
            if (!seenIds.has(e.id)) {
              seenIds.add(e.id);
              list.push({ id: e.id, full_name: e.full_name, employee_id: e.employee_id });
            }
          }
        }
        setEmployees(list);
      } catch (err) {
        console.error('Failed to load managers:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchManagers();
  }, []);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof CreateOnboardingForm, string>> = {};
    if (!form.candidate_name.trim()) errs.candidate_name = 'Vui lòng nhập họ và tên';
    else if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(form.candidate_name.trim())) errs.candidate_name = 'Họ tên không được chứa số hoặc ký tự đặc biệt';
    else if (form.candidate_name.trim().length > 50) errs.candidate_name = 'Họ tên tối đa 50 ký tự';
    if (!form.candidate_email.trim()) errs.candidate_email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.candidate_email))
      errs.candidate_email = 'Email không hợp lệ';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: any = {
        candidate_name: form.candidate_name,
        full_name: form.candidate_name,
        gender: form.gender,
        candidate_email: form.candidate_email,
        start_date: new Date().toISOString().slice(0, 10),
      };
      if (form.direct_manager_id) {
        payload.direct_manager_id = parseInt(form.direct_manager_id);
      }
      await onboardingService.create(payload);
      alert(`✅ Tạo quy trình thành công!\n`);
      onSuccess();
    } catch (e: any) {
      console.error(e);
      const errData = e.response?.data || {};
      let msg = 'Tạo quy trình thất bại. Vui lòng thử lại.';
      if (errData.non_field_errors) {
        msg = Array.isArray(errData.non_field_errors)
          ? errData.non_field_errors[0]
          : errData.non_field_errors;
      } else if (typeof errData === 'string') {
        msg = errData;
      } else if (errData.detail) {
        msg = errData.detail;
      }
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const field = (
    key: keyof CreateOnboardingForm,
    label: string,
    required: boolean,
    input: React.ReactNode
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {input}
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <UserPlusIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Tạo quy trình onboarding</h2>
              <p className="text-xs text-gray-500">Nhân viên sẽ tự điền thông tin chi tiết qua link riêng</p>
            </div>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            <p className="font-medium mb-1">📋 Quy trình 2 bước:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>HR điền thông tin cơ bản bên dưới → Tạo quy trình</li>
              <li>Tạo link → Gửi cho nhân viên tự điền thông tin chi tiết</li>
            </ol>
          </div>

          {field('candidate_name', 'Họ và tên', true,
            <input
              type="text"
              maxLength={50}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.candidate_name ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="Nguyễn Văn A"
              value={form.candidate_name}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, candidate_name: v });
                if (v && !/^[a-zA-ZÀ-ỹ\s]+$/.test(v)) setErrors(prev => ({ ...prev, candidate_name: 'Không được chứa số hoặc ký tự đặc biệt' }));
                else if (v.length > 50) setErrors(prev => ({ ...prev, candidate_name: 'Tối đa 50 ký tự' }));
                else setErrors(prev => { const { candidate_name, ...rest } = prev; return rest; });
              }}
            />
          )}

          {field('gender', 'Giới tính', true,
            <SelectBox
              label=""
              value={form.gender}
              options={[
                { value: 'M', label: 'Nam' },
                { value: 'F', label: 'Nữ' },
                { value: 'O', label: 'Khác' },
              ]}
              onChange={(v) => setForm({ ...form, gender: v as 'M' | 'F' | 'O' })}
            />
          )}

          {field('candidate_email', 'Email', true,
            <input
              type="email"
              maxLength={100}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.candidate_email ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="example@email.com"
              value={form.candidate_email}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, candidate_email: v });
                if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) setErrors(prev => ({ ...prev, candidate_email: 'Email không hợp lệ' }));
                else setErrors(prev => { const { candidate_email, ...rest } = prev; return rest; });
              }}
            />
          )}

          {field('direct_manager_id', 'Quản lý trực tiếp', false,
            <SelectBox
              label=""
              value={form.direct_manager_id}
              options={employees.map((e) => ({ value: String(e.id), label: `${e.full_name} (${e.employee_id})` }))}
              onChange={(v) => setForm({ ...form, direct_manager_id: v })}
              searchable
              placeholder={loadingEmployees ? 'Đang tải...' : 'Chọn quản lý trực tiếp'}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            Hủy
          </button>
          {(() => {
            const nameValid = form.candidate_name.trim().length > 0 && /^[a-zA-ZÀ-ỹ\s]+$/.test(form.candidate_name.trim()) && form.candidate_name.trim().length <= 50;
            const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.candidate_email.trim());
            const isFormValid = nameValid && emailValid && Object.keys(errors).length === 0;
            return (
              <button
                onClick={handleSubmit}
                disabled={submitting || !isFormValid}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
              >
                {submitting && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                {submitting ? 'Đang tạo...' : 'Tạo quy trình'}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isHR =
    user?.employee_profile?.is_hr === true ||
    user?.hrm_user?.is_hr === true ||
    (user as any)?.is_super_admin === true ||
    (user as any)?.role === 'admin';

  const [onboardings, setOnboardings] = useState<OnboardingItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterSearch, setFilterSearch] = useState<string>('');
  const debouncedSearch = useDebounce(filterSearch, 400);

  // ✅ Pagination — dùng cùng pattern với EmployeeList
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const fetchOnboardings = async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof onboardingService.list>[0] = {
        page: currentPage,
        page_size: itemsPerPage,
      };
      if (filterStatus) params.status = filterStatus;
      if (filterMonth > 0) {
        params.month = filterMonth;
        params.year = filterYear;
      }
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const data = await onboardingService.list(params);
      const items = Array.isArray(data) ? data : data.results ?? [];
      setTotalCount(Array.isArray(data) ? items.length : (data.count ?? items.length));
      setOnboardings(
        items.map((item) => ({
          ...item,
          full_name: item.candidate_name || item.full_name || 'N/A',
          position_title: item.position_name || item.position_title || 'N/A',
          department_name: item.department_name || 'N/A',
          progress_percentage: getProgressPercentage(item.progress_percentage),
        }))
      );
    } catch (e) {
      console.error(e);
      alert('Không thể tải danh sách. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboardings();
  }, [filterStatus, filterMonth, filterYear, debouncedSearch, currentPage, itemsPerPage]);

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn chắc chắn muốn xoá quy trình này?')) return;
    try {
      await onboardingService.delete(id);
      alert('Xoá thành công');
      await fetchOnboardings();
    } catch (e) {
      console.error(e);
      alert('Xoá thất bại. Vui lòng thử lại.');
    }
  };

  const handleGenerateToken = async (item: OnboardingItem) => {
    setTokenLoading(item.id);
    try {
      await onboardingService.generateToken(item.id);
      alert('Đã tạo link thành công! Bạn có thể copy hoặc gửi email cho nhân viên.');
      await fetchOnboardings();
    } catch (e) {
      console.error(e);
      alert('Tạo link thất bại. Vui lòng thử lại.');
    } finally {
      setTokenLoading(null);
    }
  };

  const handleSendEmail = async (item: OnboardingItem) => {
    if (!item.candidate_email) {
      alert('Ứng viên chưa có email. Vui lòng cập nhật thông tin trước.');
      return;
    }
    setTokenLoading(item.id);
    try {
      await onboardingService.sendEmployeeEmail(item.id);
      alert(`Đã gửi email đến ${item.candidate_email}`);
    } catch (e) {
      console.error(e);
      alert('Gửi email thất bại. Kiểm tra cấu hình email hoặc thử lại.');
    } finally {
      setTokenLoading(null);
    }
  };

  const handleResendWelcomeEmail = async (item: OnboardingItem) => {
    if (!item.candidate_email) {
      alert('Ứng viên chưa có email. Vui lòng cập nhật thông tin trước.');
      return;
    }
    if (!confirm(`Gửi lại email chào mừng đến ${item.candidate_email}?`)) return;
    setTokenLoading(item.id);
    try {
      await onboardingService.resendWelcomeEmail(item.id);
      alert(`✅ Đã gửi lại email chào mừng đến ${item.candidate_email}`);
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Gửi email thất bại. Vui lòng kiểm tra log hoặc thử lại.');
    } finally {
      setTokenLoading(null);
    }
  };

  const handleCopyLink = async (item: OnboardingItem) => {
    const url = item.employee_form_url;
    if (!url) { alert('Chưa có link. Hãy tạo link trước.'); return; }
    try {
      await navigator.clipboard.writeText(url);
      alert('Đã copy link vào clipboard!');
    } catch {
      prompt('Copy link này và gửi cho nhân viên:', url);
    }
  };

  const renderTokenActions = (item: OnboardingItem) => {
    const isLoading = tokenLoading === item.id;
    const resendEmailButton = item.candidate_email ? (
      <button
        onClick={() => handleResendWelcomeEmail(item)}
        disabled={isLoading}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 disabled:opacity-50"
        title="Gửi lại email chào mừng với thông tin đăng nhập"
      >
        {isLoading ? (
          <ArrowPathIcon className="w-3 h-3 animate-spin" />
        ) : (
          <EnvelopeIcon className="w-3 h-3" />
        )}
        Gửi lại email
      </button>
    ) : null;

    // 1. Đã điền thông tin
    if (item.task1_status === 'COMPLETED') {
      return (
        <div className="flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircleIcon className="w-3 h-3" /> Đã điền thông tin
          </span>
          {resendEmailButton}
        </div>
      );
    }

    // 2. Chờ nhân viên điền (link còn hạn)
    if (item.token_status === 'active') {
      return (
        <div className="flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <ClockIcon className="w-3 h-3" /> Chờ nhân viên điền
          </span>
          {resendEmailButton}
          <button
            onClick={() => handleCopyLink(item)}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
          >
            <ClipboardDocumentIcon className="w-3 h-3" /> Copy link
          </button>
        </div>
      );
    }

    // 3. Link hết hạn
    if (item.token_status === 'expired') {
      return (
        <div className="flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <ExclamationCircleIcon className="w-3 h-3" /> Link hết hạn
          </span>
          <button
            onClick={() => handleGenerateToken(item)}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
          >
            {isLoading ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <LinkIcon className="w-3 h-3" />}
            Tạo lại link
          </button>
        </div>
      );
    }

    // 4. Chưa gửi link
    return (
      <div className="flex flex-col gap-1.5">
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          Chưa gửi link
        </span>
        <button
          onClick={() => handleGenerateToken(item)}
          disabled={isLoading}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
        >
          {isLoading ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <LinkIcon className="w-3 h-3" />}
          Tạo link
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Onboard nhân sự</h1>
        <p className="text-gray-600 mt-2">
          Quản lý quy trình tuyển dụng và onboarding nhân viên mới.
        </p>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">HR</span>
          </div>
          <div>
            <p className="font-semibold text-blue-900 text-sm">Luồng HR</p>
            <p className="text-blue-700 text-xs mt-0.5">
              Điền thông tin cơ bản → Tạo quy trình → Tạo link → Gửi email cho nhân viên
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">NV</span>
          </div>
          <div>
            <p className="font-semibold text-green-900 text-sm">Luồng Nhân viên mới</p>
            <p className="text-green-700 text-xs mt-0.5">
              Nhận link → Không cần đăng nhập → Tự điền đầy đủ thông tin cá nhân
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* Table header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Quy trình onboarding</h2>
            <p className="text-gray-500 text-sm">
              Tổng: {totalCount} ứng viên đang trong quá trình onboarding
            </p>
          </div>
          {isHR && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <UserPlusIcon className="w-4 h-4" />
              Tạo quy trình mới
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="w-44">
            <SelectBox
              label="Trạng thái"
              value={filterStatus}
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                { value: 'DRAFT', label: 'Nháp' },
                { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
                { value: 'COMPLETED', label: 'Hoàn thành' },
              ]}
              onChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}
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
              onChange={(v) => { setFilterMonth(v); setCurrentPage(1); }}
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
                onChange={(v) => { setFilterYear(v); setCurrentPage(1); }}
              />
            </div>
          )}
          <div className="relative">
            <label className="block text-sm font-medium mb-1 text-gray-700">Tìm kiếm</label>
            <div className="relative">
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => { setFilterSearch(e.target.value); }}
                placeholder="Tìm tên hoặc mã NV..."
                className="border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              />
              <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {(filterStatus !== '' || filterMonth > 0 || filterSearch !== '') && (
            <button
              onClick={() => { setFilterStatus(''); setFilterMonth(0); setFilterSearch(''); setCurrentPage(1); }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              Xóa bộ lọc
            </button>
          )}

          <button
            onClick={() => fetchOnboardings()}
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
                {/* ✅ Đổi "Mã onboarding" → "Mã NV" */}
                {['Mã NV', 'Ứng viên', 'Vị trí', 'Phòng ban', 'Ngày bắt đầu', 'Trạng thái', 'Tiến độ', 'Link nhân viên', 'Thao tác'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">Đang tải...</td>
                </tr>
              ) : onboardings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    Chưa có ứng viên nào{filterStatus || filterMonth > 0 || filterSearch ? ' khớp với bộ lọc' : ''}.
                  </td>
                </tr>
              ) : (
                onboardings.map((item) => {
                  const progress = getProgressPercentage(item.progress_percentage);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {/* ✅ Hiển thị employee_id hoặc onboarding_code */}
                      <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">
                        <span className="font-medium">
                          {item.employee_id || item.onboarding_code || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">
                        <div className="font-medium">{item.full_name || item.candidate_name}</div>
                        {item.candidate_email && (
                          <div className="text-xs text-gray-400">{item.candidate_email}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {item.position_title || item.position?.title || 'N/A'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {item.department_name || item.department?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {item.start_date}
                      </td>
                      <td className="px-4 py-4 text-sm whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 shrink-0">{Math.round(progress)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {renderTokenActions(item)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/dashboard/onboarding/${item.id}`)}
                            className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-white border border-indigo-300 rounded hover:bg-indigo-50"
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination — dùng component Pagination giống EmployeeList */}
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalCount / itemsPerPage)}
            totalItems={totalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={(page: number) => setCurrentPage(page)}
            onItemsPerPageChange={(size: number) => { setItemsPerPage(size); setCurrentPage(1); }}
          />
        </div>

        {/* Onboarding steps info */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Các bước onboarding tiêu chuẩn</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { num: 1, title: 'Đào tạo', desc: 'Đào tạo nội quy, hội nhập nhân sự' },
              { num: 2, title: 'Ký hợp đồng', desc: 'Chuẩn bị và ký kết hợp đồng lao động' },
              { num: 3, title: 'Tiếp nhận hồ sơ', desc: 'Kiểm tra và xác nhận hồ sơ ứng viên' },
              { num: 4, title: 'Bàn giao công việc', desc: 'Bàn giao thiết bị và công việc chính thức' },
            ].map((step) => (
              <div key={step.num} className="bg-white p-4 rounded-lg border">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-bold text-sm">{step.num}</span>
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm">{step.title}</h4>
                </div>
                <p className="text-gray-600 text-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal tạo quy trình mới */}
      {showCreateModal && (
        <CreateOnboardingModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchOnboardings();
          }}
        />
      )}
    </div>
  );
};

export default Onboarding;