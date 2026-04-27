import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { hrmAPI } from '@/utils/api';

interface NotificationDrawerContextType {
  drawerOpen: boolean;
  drawerInitialItem: any | null;
  unreadIds: Set<number>;
  openDrawer: (item?: any | null) => void;
  closeDrawer: () => void;
  markRead: (id: number) => void;
  refreshUnread: () => void;
}

const NotificationDrawerContext = createContext<NotificationDrawerContextType | null>(null);

export function NotificationDrawerProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialItem, setDrawerInitialItem] = useState<any | null>(null);
  const [unreadIds, setUnreadIds] = useState<Set<number>>(new Set());

  const refreshUnread = useCallback(() => {
    hrmAPI.getCompanyAnnouncements({ is_current: true, unread_only: true, page_size: 100 })
      .then((res) => setUnreadIds(new Set((res.results || []).map((a: any) => a.id))))
      .catch(() => {});
  }, []);

  useEffect(() => { refreshUnread(); }, [refreshUnread]);

  const openDrawer = useCallback((item?: any | null) => {
    setDrawerInitialItem(item ?? null);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerInitialItem(null);
  }, []);

  const markRead = useCallback((id: number) => {
    setUnreadIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    hrmAPI.recordAnnouncementView(id).catch(() => {});
  }, []);

  return (
    <NotificationDrawerContext.Provider value={{ drawerOpen, drawerInitialItem, unreadIds, openDrawer, closeDrawer, markRead, refreshUnread }}>
      {children}
    </NotificationDrawerContext.Provider>
  );
}

export function useNotificationDrawer() {
  const ctx = useContext(NotificationDrawerContext);
  if (!ctx) throw new Error('useNotificationDrawer must be used within NotificationDrawerProvider');
  return ctx;
}
