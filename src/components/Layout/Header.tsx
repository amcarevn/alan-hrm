import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BellIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { hrmAPI } from '@/utils/api';
import { ssoSwitchToLavian } from '@/utils/api/auth.api';
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
  const [bellOpen, setBellOpen] = useState(false);
  const [lavianLoading, setLavianLoading] = useState(false);
  const [lavianDialog, setLavianDialog] = useState<{ message: string; canRetry: boolean } | null>(null);
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
  };

  const handleGoToLavian = async () => {
    if (lavianLoading) return;
    setLavianLoading(true);
    try {
      const { redirect_url } = await ssoSwitchToLavian();
      window.location.href = redirect_url;
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Không thể kết nối. Vui lòng thử lại.';
      const canRetry = err?.response?.status === 503;
      setLavianDialog({ message, canRetry });
      setLavianLoading(false);
    }
  };

  return (
    <>
      {lavianDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 text-center">
            <div className="mb-3 flex justify-center">
              <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                </svg>
              </span>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Không thể chuyển hệ thống</h3>
            <p className="text-sm text-gray-500 mb-4">{lavianDialog.message}</p>
            <div className="flex gap-2">
              {lavianDialog.canRetry && (
                <button
                  onClick={() => { setLavianDialog(null); handleGoToLavian(); }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Thử lại
                </button>
              )}
              <button
                onClick={() => setLavianDialog(null)}
                className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6">
        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">

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
                className="-m-1.5 flex items-center p-1.5 text-gray-400 hover:text-gray-500 relative"
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

            {/* Nút chuyển sang Lavian Spa (System B) */}
            <div className="relative">
              <button
                type="button"
                onClick={handleGoToLavian}
                disabled={lavianLoading}
                title="Qua Lavian Spa"
                className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 shadow-sm transition-all duration-200 hover:bg-primary-100 hover:border-primary-400 hover:shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {lavianLoading ? (
                  <svg className="h-3.5 w-3.5 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">App Alan</span>
              </button>

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

    </>
  );
}
