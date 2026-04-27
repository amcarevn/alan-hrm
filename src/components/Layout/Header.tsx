import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BellIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  KeyIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import ChangePasswordModal from '@/components/Layout/ChangePasswordModal';
import { hrmAPI } from '@/utils/api';
import { useNotificationDrawer } from '@/contexts/NotificationDrawerContext';

const PRIORITY_BORDER: Record<string, string> = {
  URGENT: 'border-red-500',
  HIGH: 'border-orange-400',
  MEDIUM: 'border-blue-400',
  LOW: 'border-gray-300',
};

const PRIORITY_BADGE: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  LOW: 'bg-gray-100 text-gray-600',
};

const TYPE_BADGE: Record<string, string> = {
  ANNOUNCEMENT: 'bg-indigo-100 text-indigo-700',
  DECISION: 'bg-purple-100 text-purple-700',
  NOTICE: 'bg-teal-100 text-teal-700',
  CIRCULAR: 'bg-cyan-100 text-cyan-700',
  DIRECTIVE: 'bg-amber-100 text-amber-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

export default function Header() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordModalKey, setChangePasswordModalKey] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const bellListRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { unreadIds, markRead, openDrawer } = useNotificationDrawer();

  const fetchPage = useCallback(async (pageNum: number, replace: boolean) => {
    try {
      if (!replace) setLoadingMore(true);
      const res = await hrmAPI.getCompanyAnnouncements({ is_current: true, page: pageNum, page_size: 20 });
      const results = res.results || [];
      if (replace) setAnnouncements(results);
      else setAnnouncements(prev => [...prev, ...results]);
      setHasMore(!!res.next);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchPage(1, true); }, [fetchPage]);

  useEffect(() => {
    if (page === 1) return;
    fetchPage(page, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // IntersectionObserver trong dropdown list
  useEffect(() => {
    if (!bellOpen) return;
    const sentinel = sentinelRef.current;
    const container = bellListRef.current;
    if (!sentinel || !container) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore) {
          setPage(prev => prev + 1);
        }
      },
      { root: container, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [bellOpen, hasMore, loadingMore]);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    setChangePasswordModalKey(0);
  };

  const handleOpenChangePassword = () => {
    setUserMenuOpen(false);
    setChangePasswordModalKey(prev => prev + 1);
    setShowChangePasswordModal(true);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6">
        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo-trung-anh.png" alt="Trung Anh Group" className="h-8 w-auto max-w-[130px] object-contain" />
            </Link>
          </div>
          <form className="relative flex flex-1" action="#" method="GET">
            <label htmlFor="search-field" className="sr-only">
              Tìm kiếm
            </label>
            <MagnifyingGlassIcon
              className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400"
              aria-hidden="true"
            />
            <input
              id="search-field"
              className="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
              placeholder="Search..."
              type="search"
              name="search"
            />
          </form>
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            {/* Bell + Notification Dropdown */}
            <div className="relative" ref={bellRef}>
              <button
                type="button"
                onClick={() => setBellOpen((o) => !o)}
                className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 relative"
              >
                <span className="sr-only">Xem thông báo</span>
                <BellIcon className="h-6 w-6" aria-hidden="true" />
                {unreadIds.size > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-white">
                    {unreadIds.size > 9 ? '9+' : unreadIds.size}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 z-30 mt-2 w-80 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-gray-200 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <span className="text-sm font-semibold text-gray-900">Thông báo</span>
                    {unreadIds.size > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                        {unreadIds.size} mới
                      </span>
                    )}
                  </div>

                  {/* List */}
                  <div ref={bellListRef} className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {announcements.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-400 text-center">Không có thông báo nào.</p>
                    ) : (
                      announcements.map((ann) => {
                        const isUnread = unreadIds.has(ann.id);
                        return (
                          <div
                            key={ann.id}
                            onClick={() => { markRead(ann.id); setBellOpen(false); openDrawer(ann); }}
                            className={`flex gap-2 px-4 py-3 cursor-pointer transition-colors border-l-4 ${PRIORITY_BORDER[ann.priority] || 'border-gray-200'} ${isUnread ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
                          >
                            {isUnread && (
                              <span className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap mb-0.5">
                                <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TYPE_BADGE[ann.announcement_type] || 'bg-gray-100 text-gray-600'}`}>
                                  {ann.announcement_type_display || ann.announcement_type}
                                </span>
                                <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_BADGE[ann.priority] || 'bg-gray-100 text-gray-600'}`}>
                                  {ann.priority_display || ann.priority}
                                </span>
                              </div>
                              <p className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{ann.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {ann.effective_from ? new Date(ann.effective_from).toLocaleDateString('vi-VN') : ''}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {/* Infinite scroll sentinel */}
                    <div ref={sentinelRef} className="py-2 flex justify-center">
                      {loadingMore && (
                        <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full" />
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-gray-100">
                    <button
                      onClick={() => { setBellOpen(false); openDrawer(); }}
                      className="w-full px-4 py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors text-center"
                    >
                      Xem tất cả thông báo →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

            {/* Profile dropdown */}
            <div className="relative">
              <button
                type="button"
                className="-m-1.5 flex items-center p-1.5"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <span className="sr-only">Mở menu người dùng</span>
                {user?.hrm_user?.avatar_url ? (
                  <img
                    src={user.hrm_user.avatar_url}
                    alt="Avatar"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <UserCircleIcon
                    className="h-8 w-8 text-gray-400"
                    aria-hidden="true"
                  />
                )}
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2.5 w-56 origin-top-right rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-900/5">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="font-medium text-sm text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{user?.email}</div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={handleOpenChangePassword}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <KeyIcon className="h-4 w-4 mr-3 text-gray-400" />
                        Đổi mật khẩu
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3 text-red-500" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <ChangePasswordModal
          key={changePasswordModalKey}
          onClose={() => setShowChangePasswordModal(false)}
          onSuccess={() => { setShowChangePasswordModal(false); }}
        />
      )}
    </>
  );
}
