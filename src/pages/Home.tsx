import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotificationDrawer } from '../contexts/NotificationDrawerContext';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { hrmAPI, managementApi } from '../utils/api';
import { employeesAPI, departmentsAPI, birthdayWishesAPI, BirthdayWish } from '../utils/api';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  CalendarIcon,
  DocumentTextIcon,
  ScaleIcon,
  ArrowRightIcon,
  UserIcon,
  ClockIcon,
  CakeIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  CheckCircleIcon,
  TrophyIcon,
  MegaphoneIcon,
  ExclamationTriangleIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon } from '@heroicons/react/24/solid';
import onboardingService from '../services/onboarding.service';
import { attendanceService, AttendanceRankingEntry } from '../services/attendance.service';

const formatBirthDate = (dateOfBirth: string): string => {
  const parts = dateOfBirth.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateOfBirth;
};

/** Get initials from a full name (max 2 characters) */
const getInitials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/** Deterministic HSL hue from a string */
const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 55%)`;
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [birthdayEmployees, setBirthdayEmployees] = useState<Array<{
    employee_id: number;
    full_name: string;
    date_of_birth: string;
    avatar_url?: string | null;
    department: { id: number; name: string; code: string } | null;
  }>>([]);
  const [tomorrowBirthdayEmployees, setTomorrowBirthdayEmployees] = useState<Array<{
    employee_id: number;
    full_name: string;
    date_of_birth: string;
    avatar_url?: string | null;
    department: { id: number; name: string; code: string } | null;
  }>>([]);
  const [wishModal, setWishModal] = useState<{
    open: boolean;
    employee: { employee_id: number; full_name: string; avatar_url?: string | null } | null;
  }>({ open: false, employee: null });
  const [wishMessage, setWishMessage] = useState('');
  const [wishSent, setWishSent] = useState<Set<number>>(new Set());

  // Onboarding documents state
  const [onboarding, setOnboarding] = useState<any>(null);
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [docReadable, setDocReadable] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<number | null>(null);
  const [wishSending, setWishSending] = useState(false);
  const [wishError, setWishError] = useState<string | null>(null);
  const [wishListModal, setWishListModal] = useState<{
    open: boolean;
    employee: { employee_id: number; full_name: string; avatar_url?: string | null } | null;
    wishes: BirthdayWish[];
    loading: boolean;
  }>({ open: false, employee: null, wishes: [], loading: false });

  // Attendance ranking state
  const [attendanceRankings, setAttendanceRankings] = useState<AttendanceRankingEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingPeriod] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  // Unread announcements for highlight section
  const { unreadIds, markRead, openDrawer } = useNotificationDrawer();
  const [unreadAnnouncements, setUnreadAnnouncements] = useState<any[]>([]);

  // Contract expiry alert (ADMIN/HR only)
  type ExpiringContract = {
    id: number;
    employee_name: string;
    end_date: string | null;
    contract_type_display: string;
    contract_number: string | null;
    days: number;
  };
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([]);
  const [showContractAlert, setShowContractAlert] = useState(false);

  useEffect(() => {
    fetchEmployeeData();
    fetchBirthdaysToday();
    fetchBirthdaysTomorrow();
    fetchAttendanceRanking();
    fetchExpiringContracts();
  }, []);

  useLockBodyScroll(showContractAlert);

  useEffect(() => {
    hrmAPI.getCompanyAnnouncements({ is_current: true, unread_only: true, page_size: 5 })
      .then((res) => setUnreadAnnouncements(res.results || []))
      .catch(() => {});
  }, []);

  // Lock body scroll khi modal tài liệu mở
  useEffect(() => {
    if (viewingDoc) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [viewingDoc]);

  const fetchBirthdaysToday = async () => {
    try {
      const data = await employeesAPI.birthdays_today();
      setBirthdayEmployees(data);
    } catch (err) {
      console.error('Error fetching birthdays:', err);
    }
  };

  const fetchBirthdaysTomorrow = async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      const tomorrowStr = `${year}-${month}-${day}`;
      const data = await employeesAPI.birthdays_today(tomorrowStr);
      setTomorrowBirthdayEmployees(data);
    } catch (err) {
      console.error('Error fetching tomorrow birthdays:', err);
    }
  };

  const fetchAttendanceRanking = async () => {
    setRankingLoading(true);
    try {
      const data = await attendanceService.getRanking({
        year: rankingPeriod.year,
        month: rankingPeriod.month,
        type: 'early',
        top: 10,
      });
      setAttendanceRankings(data);
    } catch (err) {
      console.error('Error fetching attendance ranking:', err);
    } finally {
      setRankingLoading(false);
    }
  };

  const fetchExpiringContracts = async () => {
    try {
      const res = await managementApi.get('/api-hrm/employee-contracts/expiring-alert/');
      const { dismissed_today, contracts } = res.data;
      if (!contracts?.length) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiring: ExpiringContract[] = contracts.map((c: any) => {
        const expiry = new Date(c.end_date);
        expiry.setHours(0, 0, 0, 0);
        const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { id: c.id, employee_name: c.employee_name, end_date: c.end_date, contract_type_display: c.contract_type_display, contract_number: c.contract_number, days };
      });

      setExpiringContracts(expiring);
      if (!dismissed_today) setShowContractAlert(true);
    } catch {
      // Không có quyền (nhân viên thường) → bỏ qua
      setExpiringContracts([]);
      setShowContractAlert(false);
    }
  };

  const dismissContractAlert = async () => {
    setShowContractAlert(false);
    try {
      await managementApi.post('/api-hrm/employee-contracts/expiring-alert/');
    } catch { }
  };

  const fetchSentWishes = async (senderEmployeeId: number) => {
    try {
      const currentYear = new Date().getFullYear();
      const wishes = await birthdayWishesAPI.list({ sender: senderEmployeeId, year: currentYear });
      const sentIds = new Set(wishes.map((w) => w.recipient.id));
      setWishSent(sentIds);
    } catch (err) {
      console.error('Error fetching sent wishes:', err);
    }
  };

  const openWishModal = (emp: { employee_id: number; full_name: string; avatar_url?: string | null }) => {
    setWishMessage(`Chúc mừng sinh nhật ${emp.full_name}! 🎂🎉 Chúc bạn luôn vui vẻ, mạnh khỏe và thành công!`);
    setWishError(null);
    setWishModal({ open: true, employee: emp });
  };

  const closeWishModal = () => {
    setWishModal({ open: false, employee: null });
    setWishMessage('');
    setWishError(null);
  };

  const sendWish = async () => {
    if (!wishModal.employee || !wishMessage.trim()) return;
    if (!employee) {
      setWishError('Không thể xác định thông tin người gửi. Vui lòng tải lại trang.');
      return;
    }
    setWishSending(true);
    setWishError(null);
    try {
      await birthdayWishesAPI.create({
        recipient: wishModal.employee.employee_id,
        sender: employee.id,
        message: wishMessage.trim(),
        year: new Date().getFullYear(),
      });
      setWishSent(prev => new Set(prev).add(wishModal.employee!.employee_id));
      closeWishModal();
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Gửi lời chúc thất bại. Vui lòng thử lại.';
      setWishError(detail);
    } finally {
      setWishSending(false);
    }
  };

  const openWishListModal = async (emp: { employee_id: number; full_name: string; avatar_url?: string | null }) => {
    setWishListModal({ open: true, employee: emp, wishes: [], loading: true });
    try {
      const wishes = await birthdayWishesAPI.list({ recipient: emp.employee_id, year: new Date().getFullYear() });
      setWishListModal(prev => ({ ...prev, wishes, loading: false }));
    } catch {
      setWishListModal(prev => ({ ...prev, wishes: [], loading: false }));
    }
  };

  const closeWishListModal = () => {
    setWishListModal({ open: false, employee: null, wishes: [], loading: false });
  };

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const emp = await employeesAPI.me();
      setEmployee(emp);
      fetchSentWishes(emp.id);

      if (emp.department?.id) {
        try {
          const dept = await departmentsAPI.getById(emp.department.id);
          setDepartment(dept);
        } catch (err) {
          console.error('Error fetching department:', err);
        }
      }

      // Fetch onboarding documents (detail endpoint để có documents nested)
      try {
        const myOb = await onboardingService.myOnboarding();
        if (myOb?.id) {
          const fullOb = await onboardingService.get(myOb.id);
          setOnboarding(fullOb);
        }
      } catch (err) {
        // Không có onboarding — bỏ qua
      }
    } catch (err) {
      console.error('Error fetching employee data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate working days based on start date
  const calculateWorkingDays = () => {
    if (!employee?.start_date) return 0;
    
    const startDate = new Date(employee.start_date);
    const today = new Date();
    
    // Calculate difference in days
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const userStats = [
    { label: 'Ngày làm việc', value: employee ? calculateWorkingDays().toString() : '0', icon: CalendarIcon, color: 'bg-primary-100 text-primary-600' },
    { label: 'Điểm danh', value: '0%', icon: ClockIcon, color: 'bg-emerald-100 text-emerald-600' },
  ];

  const quickActions = [
    { title: 'Xin nghỉ phép', description: 'Đăng ký nghỉ phép năm, nghỉ ốm', icon: CalendarIcon, color: 'bg-primary-100 text-primary-700', path: '/dashboard/approvals' },
    { title: 'Báo cáo công việc', description: 'Gửi báo cáo tuần/tháng', icon: DocumentTextIcon, color: 'bg-emerald-100 text-emerald-700', path: '/company/internal-forms' },
    { title: 'Đề xuất', description: 'Đề xuất công tác, mua sắm', icon: ScaleIcon, color: 'bg-amber-100 text-amber-700', path: '/dashboard/approvals' },
    { title: 'Đào tạo', description: 'Đăng ký khóa đào tạo', icon: UserGroupIcon, color: 'bg-violet-100 text-violet-700', path: '/company/training' },
  ];

  return (
    <div className="space-y-5">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-500 to-primary-700 rounded-2xl text-white shadow-lg">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/[0.03]" />

        <div className="relative px-10 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="h-20 w-20 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0 ring-2 ring-white/20 shadow-lg">
              {employee?.avatar_url ? (
                <img src={employee.avatar_url} alt="" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <span className="text-3xl font-extrabold text-white">
                  {(employee?.full_name || user?.username || 'N')?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white/80 tracking-widest uppercase mb-1">Chào mừng trở lại</p>
              <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
                {employee?.full_name || user?.username || 'Nhân viên'}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/90">
                <span className="flex items-center gap-1.5">
                  <UserIcon className="h-4 w-4 text-white/70" />
                  {user?.username || 'N/A'}
                </span>
                <span className="flex items-center gap-1.5">
                  <BuildingOfficeIcon className="h-4 w-4 text-white/70" />
                  {loading ? 'Đang tải...' : (department?.name || employee?.department?.name || 'Chưa phân phòng')}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4 text-white/70" />
                  {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/me')}
            className="self-start md:self-auto inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-sm font-semibold text-white backdrop-blur transition-all duration-200 shadow-sm"
          >
            <UserIcon className="h-4 w-4" />
            Hồ sơ cá nhân
          </button>
        </div>
      </div>

      {/* Thông báo chưa đọc — chỉ hiển thị 1 mới nhất */}
      {(() => {
        const unread = unreadAnnouncements.filter(ann => unreadIds.has(ann.id));
        if (unread.length === 0) return null;
        const latest = unread[0];
        const extra = unread.length - 1;
        return (
          <button
            onClick={() => { markRead(latest.id); openDrawer(latest); }}
            className="w-full text-left rounded-2xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors px-4 py-3.5 flex items-center gap-3 shadow-sm group"
          >
            {/* Icon */}
            <div className="relative h-9 w-9 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
              <MegaphoneIcon className="w-5 h-5 text-white" />
              {unread.length > 1 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold ring-2 ring-white">
                  {unread.length > 9 ? '9+' : unread.length}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Thông báo mới</span>
                {latest.announcement_type_display && (
                  <span className="text-[10px] text-amber-600">· {latest.announcement_type_display}</span>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 truncate">{latest.title}</p>
              {extra > 0 && (
                <p className="text-xs text-amber-600 mt-0.5">+{extra} thông báo chưa đọc khác</p>
              )}
            </div>

            {/* CTA */}
            <div className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-amber-700 group-hover:text-amber-900">
              Xem <ArrowRightIcon className="h-3.5 w-3.5" />
            </div>
          </button>
        );
      })()}

      {/* Tài liệu onboarding cần đọc */}
      {(() => {
        const requiredDocs = (onboarding?.documents || []).filter(
          (d: any) => d.document_type === 'REGULATION' && d.is_required
        );
        if (requiredDocs.length === 0) return null;
        const unreadCount = requiredDocs.filter((d: any) => !d.is_read).length;
        if (unreadCount === 0) return null; // Đã đọc hết → ẩn section

        return (
          <div className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-blue-50 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
                <DocumentTextIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Tài liệu cần đọc</h2>
                <p className="text-xs text-gray-500">Bạn có <span className="font-bold text-primary-700">{unreadCount}</span> tài liệu bắt buộc chưa đọc</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {requiredDocs.map((doc: any) => (
                <div key={doc.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-3 hover:shadow-sm transition-shadow">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{doc.document_name}</p>
                    {doc.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{doc.description}</p>}
                    {doc.is_read ? (
                      <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <CheckCircleIcon className="w-3 h-3" /> Đã đọc
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        <ClockIcon className="w-3 h-3" /> Chưa đọc
                      </span>
                    )}
                  </div>
                  <button onClick={() => { setViewingDoc(doc); setDocReadable(false); }} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition-colors flex-shrink-0 inline-flex items-center gap-1">
                    <EyeIcon className="w-3.5 h-3.5" /> Xem
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {userStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 border-l-4 border-l-primary-500">
            <div className={`h-11 w-11 ${stat.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{stat.label}</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-0.5 tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Birthday Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-pink-100 rounded-xl flex items-center justify-center">
              <CakeIcon className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Chúc mừng sinh nhật hôm nay</h2>
              <p className="text-xs text-gray-600">{birthdayEmployees.length === 0 ? 'Không có sinh nhật hôm nay' : `${birthdayEmployees.length} nhân viên`}</p>
            </div>
          </div>
        </div>

        {birthdayEmployees.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {birthdayEmployees.map((emp) => (
              <div key={emp.employee_id} className="flex flex-col gap-3 p-4 bg-pink-50 border border-pink-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-pink-200">
                    {emp.avatar_url ? (
                      <img src={emp.avatar_url} alt={emp.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: stringToColor(emp.full_name) }}>
                        <span className="text-white text-sm font-bold">{getInitials(emp.full_name)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{emp.full_name}</p>
                    {emp.department && <p className="text-xs text-gray-500 truncate">{emp.department.name}</p>}
                    <p className="text-xs text-pink-500 font-medium mt-0.5">{formatBirthDate(emp.date_of_birth)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {wishSent.has(emp.employee_id) ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> Đã gửi lời chúc
                    </span>
                  ) : (
                    <button onClick={() => openWishModal(emp)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold rounded-lg transition-colors">
                      <PaperAirplaneIcon className="h-3.5 w-3.5" /> Gửi lời chúc
                    </button>
                  )}
                  <button onClick={() => openWishListModal(emp)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-pink-200 hover:bg-pink-50 text-pink-600 text-xs font-semibold rounded-lg transition-colors">
                    <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" /> Lời chúc
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tomorrow's Birthdays */}
        <div className={birthdayEmployees.length > 0 ? 'pt-4 border-t border-gray-100' : ''}>
          <div className="flex items-center gap-2 mb-3">
            <CakeIcon className="h-4 w-4 text-gray-300" />
            <h3 className="text-sm font-semibold text-gray-600">Sinh nhật ngày mai</h3>
          </div>
          {tomorrowBirthdayEmployees.length === 0 ? (
            <p className="text-sm text-gray-600">Không có sinh nhật ngày mai.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tomorrowBirthdayEmployees.map((emp) => (
                <div key={emp.employee_id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="h-10 w-10 rounded-full flex-shrink-0 overflow-hidden">
                    {emp.avatar_url ? (
                      <img src={emp.avatar_url} alt={emp.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: stringToColor(emp.full_name) }}>
                        <span className="text-white text-sm font-bold">{getInitials(emp.full_name)}</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-500 text-sm truncate">{emp.full_name}</p>
                    {emp.department && <p className="text-xs text-gray-400 truncate">{emp.department.name}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{formatBirthDate(emp.date_of_birth)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attendance Ranking Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <TrophyIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Bảng vinh danh đi sớm</h2>
              <p className="text-xs text-gray-400">Top 10 · tháng {rankingPeriod.month}/{rankingPeriod.year}</p>
            </div>
          </div>
          <button onClick={() => navigate('/dashboard/attendance/ranking')} className="text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1">
            Xem chi tiết <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {rankingLoading ? (
          <div className="flex items-center justify-center py-8 gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full" />
            <span className="text-sm text-gray-400">Đang tải...</span>
          </div>
        ) : attendanceRankings.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu xếp hạng.</p>
        ) : (
          <div className="space-y-2">
            {attendanceRankings.map((entry, index) => {
              const rankNum = entry.rank_early ?? index + 1;
              const medal = RANK_MEDALS[rankNum - 1] ?? null;
              return (
                <div
                  key={entry.employee_id}
                  className={`flex items-center gap-4 p-3 rounded-xl border transition-shadow hover:shadow-md ${
                    rankNum === 1
                      ? 'bg-yellow-50 border-yellow-200'
                      : rankNum === 2
                      ? 'bg-gray-50 border-gray-200'
                      : rankNum === 3
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-white border-gray-100'
                  }`}
                >
                  <div className="w-7 text-center flex-shrink-0">
                    {medal ? <span className="text-lg">{medal}</span> : <span className="text-xs font-bold text-gray-400">#{rankNum}</span>}
                  </div>
                  <div className="h-9 w-9 rounded-full flex-shrink-0 overflow-hidden">
                    {entry.avatar ? (
                      <img src={entry.avatar} alt={entry.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: stringToColor(entry.full_name) }}>
                        {getInitials(entry.full_name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{entry.full_name}</p>
                    {entry.department && <p className="text-xs text-gray-400 truncate">{entry.department}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-right">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Ngày sớm</p>
                      <p className="text-sm font-bold text-amber-600">{entry.early_days}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">TB sớm</p>
                      <p className="text-sm font-bold text-gray-700">{entry.avg_early_minutes}p</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Thao tác nhanh</h2>
          <button onClick={() => navigate('/dashboard')} className="text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1">
            Dashboard <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-3 p-4 border border-gray-100 rounded-2xl hover:border-primary-200 hover:bg-primary-50 transition-all duration-200 group"
            >
              <div className={`h-11 w-11 ${action.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                <action.icon className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">{action.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Company Information Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 bg-primary-100 rounded-xl flex items-center justify-center">
            <BuildingOfficeIcon className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Thông tin công ty</h2>
            <p className="text-xs text-gray-400">Tài liệu, nội quy và quy trình nội bộ</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Tài liệu đào tạo', desc: 'Hướng dẫn nhân viên mới', path: '/company/training', color: 'bg-primary-100 text-primary-600',
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
            { label: 'Nội quy lao động', desc: 'Quy định làm việc', path: '/company/labor-rules', color: 'bg-emerald-100 text-emerald-600',
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /> },
            { label: 'Mẫu giấy tờ', desc: 'Biểu mẫu nội bộ', path: '/company/internal-forms', color: 'bg-amber-100 text-amber-600',
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
            { label: 'Quy trình làm việc', desc: 'Quy trình các bộ phận', path: '/company/work-procedures', color: 'bg-violet-100 text-violet-600',
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /> },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-3 p-4 border border-gray-100 rounded-2xl hover:border-primary-200 hover:bg-primary-50 transition-all duration-200 group"
            >
              <div className={`h-11 w-11 ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">{item.icon}</svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Liên kết nhanh</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Chính sách công ty', path: '/company/policies' },
              { label: 'Quyết định ban hành', path: '/company/decisions' },
              { label: 'Sơ đồ tổ chức', path: '/dashboard/organization-chart' },
            ].map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-primary-50 hover:text-primary-700 border border-gray-100 hover:border-primary-200 rounded-lg transition-all"
              >
                {link.label}
                <ArrowRightIcon className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      </div>



      {/* Birthday Wish Modal */}
      {wishModal.open && wishModal.employee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">🎂</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Gửi lời chúc sinh nhật</h3>
                  <p className="text-sm text-gray-500">Tới: {wishModal.employee.full_name}</p>
                </div>
              </div>
              <button
                onClick={closeWishModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Lời chúc của bạn</label>
              <textarea
                value={wishMessage}
                onChange={(e) => setWishMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent resize-none"
                placeholder="Nhập lời chúc..."
              />
              {wishError && (
                <p className="mt-2 text-xs text-red-600">{wishError}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 pb-5">
              <button
                onClick={closeWishModal}
                disabled={wishSending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={sendWish}
                disabled={!wishMessage.trim() || wishSending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
                {wishSending ? 'Đang gửi...' : 'Gửi lời chúc'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wishes List Modal */}
      {wishListModal.open && wishListModal.employee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Danh sách lời chúc</h3>
                  <p className="text-sm text-gray-500">{wishListModal.employee.full_name}</p>
                </div>
              </div>
              <button
                onClick={closeWishListModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {wishListModal.loading ? (
                <p className="text-sm text-gray-500 text-center py-4">Đang tải...</p>
              ) : wishListModal.wishes.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Chưa có lời chúc nào.</p>
              ) : (
                <ul className="space-y-3">
                  {wishListModal.wishes.map((wish) => (
                    <li key={wish.id} className="p-3 bg-pink-50 rounded-xl text-sm text-gray-700">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className="h-8 w-8 rounded-full flex-shrink-0 overflow-hidden bg-pink-200">
                            {wish.sender.avatar_url ? (
                              <img src={wish.sender.avatar_url} alt={wish.sender.full_name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: stringToColor(wish.sender.full_name) }}>
                                <span className="text-white text-xs font-bold">{getInitials(wish.sender.full_name)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-pink-700 mb-1">{wish.sender.full_name}</p>
                            <p className="whitespace-pre-wrap">{wish.message}</p>
                          </div>
                        </div>
                        {wish.is_liked && (
                          <div
                            className="flex-shrink-0 group relative"
                            title={`Đã tim bởi ${wish.recipient.full_name}`}
                          >
                            <HeartIcon className="h-5 w-5 text-pink-500" />
                            <span className="pointer-events-none absolute right-0 top-6 z-10 hidden w-max rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                              Đã tim bởi {wish.recipient.full_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end px-5 pb-5">
              <button
                onClick={closeWishListModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xem tài liệu onboarding — dùng Portal để thoát Layout stacking context */}
      {viewingDoc && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" onClick={() => setViewingDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl" style={{ height: '90vh' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{viewingDoc.document_name}</h3>
                {viewingDoc.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{viewingDoc.description}</p>
                )}
              </div>
              <button onClick={() => setViewingDoc(null)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* PDF iframe */}
            <div className="bg-gray-100" style={{ height: 'calc(90vh - 128px)' }}>
              {viewingDoc.file_url || viewingDoc.file ? (
                <iframe
                  src={viewingDoc.file_url || viewingDoc.file}
                  className="w-full h-full border-0"
                  title={viewingDoc.document_name}
                  onLoad={() => { setTimeout(() => setDocReadable(true), 10000); }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">Không có file đính kèm</div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between gap-3 rounded-b-2xl">
              <p className="text-xs text-gray-500">
                {viewingDoc.is_read ? '✓ Bạn đã đọc tài liệu này'
                  : docReadable ? '✓ Có thể xác nhận đã đọc'
                  : '⏳ Vui lòng đọc hết tài liệu (tối thiểu 10 giây)...'}
              </p>
              {!viewingDoc.is_read && (
                <button
                  disabled={!docReadable || markingReadId === viewingDoc.id}
                  onClick={async () => {
                    if (!viewingDoc) return;
                    setMarkingReadId(viewingDoc.id);
                    try {
                      await onboardingService.markDocumentAsRead(viewingDoc.id);
                      if (onboarding?.id) {
                        const updated = await onboardingService.get(onboarding.id);
                        setOnboarding(updated);
                      }
                      setViewingDoc(null);
                    } catch (err: any) {
                      console.error('Failed to mark document as read:', err);
                    } finally {
                      setMarkingReadId(null);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  {markingReadId === viewingDoc.id ? 'Đang lưu...' : 'Đánh dấu đã đọc'}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Contract expiry alert dialog */}
      {showContractAlert && expiringContracts.length > 0 && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-t-2xl px-6 py-5 flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BellAlertIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white">Cảnh báo hợp đồng sắp hết hạn</h3>
                <p className="text-sm text-white/80 mt-0.5">
                  {expiringContracts.filter(c => c.days <= 0).length > 0
                    ? `${expiringContracts.filter(c => c.days <= 0).length} hợp đồng đã hết hạn · ${expiringContracts.filter(c => c.days > 0).length} sắp hết hạn`
                    : `${expiringContracts.length} hợp đồng sắp hết hạn trong 5 ngày tới`
                  }
                </p>
              </div>
              <button
                onClick={dismissContractAlert}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Contract list */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
              {expiringContracts.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${c.days <= 0
                      ? 'bg-red-50 border-red-200'
                      : 'bg-orange-50 border-orange-200'
                    }`}
                >
                  <ExclamationTriangleIcon className={`w-5 h-5 flex-shrink-0 ${c.days <= 0 ? 'text-red-500' : 'text-orange-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.employee_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {c.contract_type_display}
                      {c.contract_number ? ` · ${c.contract_number}` : ''}
                      {c.end_date ? ` · HH: ${new Date(c.end_date).toLocaleDateString('vi-VN')}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-bold whitespace-nowrap px-2.5 py-1 rounded-full ${c.days <= 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-orange-100 text-orange-700'
                    }`}>
                    {c.days <= 0 ? 'Đã hết hạn' : `Còn ${c.days} ngày`}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                onClick={dismissContractAlert}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Không nhắc lại hôm nay
              </button>
              <button
                onClick={() => {
                  dismissContractAlert();
                  navigate('/dashboard/bulk-contracts');
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Xử lý ngay
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Home;
