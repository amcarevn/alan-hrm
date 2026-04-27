import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotificationDrawer } from '../contexts/NotificationDrawerContext';
import { hrmAPI } from '../utils/api';
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

  useEffect(() => {
    fetchEmployeeData();
    fetchBirthdaysToday();
    fetchBirthdaysTomorrow();
    fetchAttendanceRanking();
  }, []);

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
    { label: 'Ngày làm việc', value: employee ? calculateWorkingDays().toString() : '0', change: '', icon: CalendarIcon, color: 'bg-blue-100 text-blue-600' },
    { label: 'Điểm danh', value: '0%', change: '', icon: ClockIcon, color: 'bg-green-100 text-green-600' },
  ];

  const quickActions = [
    { title: 'Xin nghỉ phép', description: 'Đăng ký nghỉ phép năm, nghỉ ốm', icon: CalendarIcon, color: 'bg-blue-50 text-blue-700', path: '/dashboard/approvals' },
    { title: 'Báo cáo công việc', description: 'Gửi báo cáo tuần/tháng', icon: DocumentTextIcon, color: 'bg-green-50 text-green-700', path: '/company/internal-forms' },
    { title: 'Đề xuất', description: 'Đề xuất công tác, mua sắm', icon: ScaleIcon, color: 'bg-yellow-50 text-yellow-700', path: '/dashboard/approvals' },
    { title: 'Đào tạo', description: 'Đăng ký khóa đào tạo', icon: UserGroupIcon, color: 'bg-purple-50 text-purple-700', path: '/company/training' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Chào mừng trở lại, {user?.username || 'Nhân viên'}!</h1>
            <p className="mt-2 text-primary-100">
              Hôm nay là {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <div className="mt-4 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5" />
                <span>Mã NV: {user?.username || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <BuildingOfficeIcon className="h-5 w-5" />
                <span>Phòng: {loading ? 'Đang tải...' : (department?.name || employee?.department?.name || 'Chưa phân phòng')}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 md:mt-0">
            <button
              onClick={() => navigate('/dashboard/me')}
              className="inline-flex items-center px-6 py-3 border-2 border-white text-sm font-medium rounded-lg text-white hover:bg-white hover:text-primary-700 transition-colors"
            >
              <UserIcon className="h-5 w-5 mr-2" />
              Xem hồ sơ cá nhân
            </button>
          </div>
        </div>
      </div>

      {/* Thông báo chưa đọc — highlight để kéo sự chú ý */}
      {unreadAnnouncements.filter(ann => unreadIds.has(ann.id)).length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                <MegaphoneIcon className="w-6 h-6 text-white" />
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-white">
                  {unreadAnnouncements.filter(ann => unreadIds.has(ann.id)).length}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Thông báo chưa đọc</h2>
                <p className="text-sm text-gray-600">Bấm vào để đọc ngay</p>
              </div>
            </div>
            <button
              onClick={() => openDrawer()}
              className="text-sm font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1"
            >
              Xem tất cả <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {unreadAnnouncements.filter(ann => unreadIds.has(ann.id)).map((ann) => (
              <button
                key={ann.id}
                onClick={() => { markRead(ann.id); setUnreadAnnouncements(prev => prev.filter(a => a.id !== ann.id)); openDrawer(ann); }}
                className="w-full text-left flex items-start gap-3 bg-white hover:bg-amber-50 border border-amber-100 hover:border-amber-300 rounded-xl px-4 py-3 transition-all group"
              >
                <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0 group-hover:bg-amber-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{ann.title}</p>
                  {ann.content && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{ann.content}</p>
                  )}
                  <p className="text-xs text-amber-600 mt-1">
                    {ann.effective_from ? new Date(ann.effective_from).toLocaleDateString('vi-VN') : ''}
                    {ann.announcement_type_display ? ` · ${ann.announcement_type_display}` : ''}
                  </p>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-gray-300 group-hover:text-amber-500 flex-shrink-0 mt-1 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tài liệu onboarding cần đọc */}
      {(() => {
        const requiredDocs = (onboarding?.documents || []).filter(
          (d: any) => d.document_type === 'REGULATION' && d.is_required
        );
        if (requiredDocs.length === 0) return null;
        const unreadCount = requiredDocs.filter((d: any) => !d.is_read).length;
        if (unreadCount === 0) return null; // Đã đọc hết → ẩn section

        return (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/20">
                <DocumentTextIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Tài liệu cần đọc</h2>
                <p className="text-sm text-gray-600">
                  Bạn có <span className="font-semibold text-blue-700">{unreadCount}</span> tài liệu bắt buộc chưa đọc
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requiredDocs.map((doc: any) => (
                <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{doc.document_name}</p>
                      {doc.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{doc.description}</p>
                      )}
                      {doc.is_read ? (
                        <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircleIcon className="w-3.5 h-3.5" /> Đã đọc
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          <ClockIcon className="w-3.5 h-3.5" /> Chưa đọc
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setViewingDoc(doc);
                        setDocReadable(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex-shrink-0 inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <EyeIcon className="w-4 h-4" />
                      Xem
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {userStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`h-12 w-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Birthday Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="h-10 w-10 bg-pink-100 rounded-lg flex items-center justify-center">
            <CakeIcon className="h-6 w-6 text-pink-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">🎂 Chúc mừng sinh nhật</h2>
        </div>
        {birthdayEmployees.length === 0 ? (
          <p className="text-sm text-gray-500">Hôm nay không có nhân viên nào có sinh nhật.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {birthdayEmployees.map((emp) => (
              <div key={emp.employee_id} className="flex flex-col p-4 bg-pink-50 border border-pink-200 rounded-xl">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full flex-shrink-0 overflow-hidden bg-pink-100">
                    {emp.avatar_url ? (
                      <img src={emp.avatar_url} alt={emp.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: stringToColor(emp.full_name) }}>
                        <span className="text-white text-sm font-bold">{getInitials(emp.full_name)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{emp.full_name}</p>
                    {emp.department && (
                      <p className="text-sm text-gray-500">{emp.department.name}</p>
                    )}
                    <p className="text-xs text-pink-600 mt-1">
                      {formatBirthDate(emp.date_of_birth)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {wishSent.has(emp.employee_id) ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                      ✅ Đã gửi lời chúc
                    </span>
                  ) : (
                    <button
                      onClick={() => openWishModal(emp)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <PaperAirplaneIcon className="h-3.5 w-3.5" />
                      Gửi lời chúc
                    </button>
                  )}
                  <button
                    onClick={() => openWishListModal(emp)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-pink-300 hover:bg-pink-50 text-pink-600 text-xs font-medium rounded-lg transition-colors"
                  >
                    <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
                    Xem lời chúc
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tomorrow's Birthdays */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center space-x-2 mb-4">
            <CakeIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-base font-semibold text-gray-500">Sinh nhật ngày mai</h3>
          </div>
          {tomorrowBirthdayEmployees.length === 0 ? (
            <p className="text-sm text-gray-400">Ngày mai không có nhân viên nào có sinh nhật.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tomorrowBirthdayEmployees.map((emp) => (
                <div key={emp.employee_id} className="flex items-center space-x-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="h-12 w-12 rounded-full flex-shrink-0 overflow-hidden bg-gray-100">
                    {emp.avatar_url ? (
                      <img src={emp.avatar_url} alt={emp.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: stringToColor(emp.full_name) }}>
                        <span className="text-white text-sm font-bold">{getInitials(emp.full_name)}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500">{emp.full_name}</p>
                    {emp.department && (
                      <p className="text-sm text-gray-400">{emp.department.name}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatBirthDate(emp.date_of_birth)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attendance Ranking Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrophyIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">🏆 Bảng vinh danh đi sớm</h2>
              <p className="text-sm text-gray-500">
                Top 10 nhân viên đi sớm nhất tháng {rankingPeriod.month}/{rankingPeriod.year}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/attendance/ranking')}
            className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center"
          >
            Xem chi tiết <ArrowRightIcon className="h-4 w-4 ml-1" />
          </button>
        </div>

        {rankingLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-yellow-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-sm text-gray-500">Đang tải bảng xếp hạng...</span>
          </div>
        ) : attendanceRankings.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">Chưa có dữ liệu xếp hạng cho tháng này.</p>
        ) : (
          <div className="space-y-3">
            {attendanceRankings.map((entry, index) => {
              const rankNum = entry.rank_early ?? index + 1;
              const medal = RANK_MEDALS[rankNum - 1] ?? null;
              const initials = getInitials(entry.full_name);
              const avatarBg = stringToColor(entry.full_name);
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
                  {/* Rank badge */}
                  <div className="w-8 text-center flex-shrink-0">
                    {medal ? (
                      <span className="text-xl">{medal}</span>
                    ) : (
                      <span className="text-sm font-bold text-gray-500">#{rankNum}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full flex-shrink-0 overflow-hidden">
                    {entry.avatar ? (
                      <img
                        src={entry.avatar}
                        alt={entry.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="h-full w-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: avatarBg }}
                      >
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Name & department */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{entry.full_name}</p>
                    {entry.department && (
                      <p className="text-xs text-gray-500 truncate">{entry.department}</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 flex-shrink-0 text-right">
                    <div>
                      <p className="text-xs text-gray-400">Ngày đi sớm</p>
                      <p className="text-sm font-bold text-yellow-600">{entry.early_days}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs text-gray-400">TB sớm</p>
                      <p className="text-sm font-bold text-gray-700">{entry.avg_early_minutes} phút</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Thao tác nhanh</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center"
          >
            Xem Dashboard <ArrowRightIcon className="h-4 w-4 ml-1" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <div className={`h-12 w-12 ${action.color} rounded-lg flex items-center justify-center mb-4`}>
                <action.icon className="h-6 w-6" />
              </div>
              <h3 className="font-medium text-gray-900 text-center">{action.title}</h3>
              <p className="text-sm text-gray-500 text-center mt-2">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Company Information Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Thông tin công ty</h2>
            <p className="mt-1 text-sm text-gray-600">
              Tài liệu đào tạo, thông báo, quyết định, nội quy lao động và các thông tin nội bộ
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Nội bộ công ty</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Training Documents Button */}
          <button
            onClick={() => navigate('/company/training')}
            className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 text-center">Tài liệu đào tạo hội nhập</h3>
            <p className="text-sm text-gray-500 text-center mt-2">Tài liệu hướng dẫn và đào tạo nhân viên mới</p>
          </button>

          {/* Labor Rules Button */}
          <button
            onClick={() => navigate('/company/labor-rules')}
            className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 text-center">Nội quy lao động</h3>
            <p className="text-sm text-gray-500 text-center mt-2">Quy định và nội quy làm việc trong công ty</p>
          </button>

          {/* Internal Forms Button */}
          <button
            onClick={() => navigate('/company/internal-forms')}
            className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 text-center">Mẫu giấy tờ nội bộ</h3>
            <p className="text-sm text-gray-500 text-center mt-2">Các mẫu đơn, biểu mẫu sử dụng nội bộ</p>
          </button>

          {/* Work Procedures Button */}
          <button
            onClick={() => navigate('/company/work-procedures')}
            className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 text-center">Quy trình làm việc</h3>
            <p className="text-sm text-gray-500 text-center mt-2">Quy trình làm việc của các bộ phận</p>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Liên kết nhanh</h3>
              <div className="space-y-2">
                <button onClick={() => navigate('/company/policies')} className="flex items-center justify-between w-full p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                  <span>Chính sách công ty</span>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button onClick={() => navigate('/company/decisions')} className="flex items-center justify-between w-full p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                  <span>Quyết định ban hành</span>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button onClick={() => navigate('/dashboard/organization-chart')} className="flex items-center justify-between w-full p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                  <span>Sơ đồ tổ chức</span>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Music Order Floating Bubble */}
      <a
        href="https://music-player.thammytrunganh.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        title="Order nhạc ở đây"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        <span className="text-sm font-medium whitespace-nowrap">Order nhạc ở đây</span>
      </a>

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
    </div>
  );
};

export default Home;
