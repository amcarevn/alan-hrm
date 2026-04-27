import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationDrawer from './NotificationDrawer';
import { NotificationDrawerProvider, useNotificationDrawer } from '@/contexts/NotificationDrawerContext';

function LayoutInner({ children }: { children: ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { drawerOpen, drawerInitialItem, unreadIds, markRead, closeDrawer } = useNotificationDrawer();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar onCollapseChange={setIsSidebarCollapsed} />

      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <Header />

        <main className="py-6">
          <div className="mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      <NotificationDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        initialItem={drawerInitialItem}
        unreadIds={unreadIds}
        onMarkRead={markRead}
      />
    </div>
  );
}

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <NotificationDrawerProvider>
      <LayoutInner>{children}</LayoutInner>
    </NotificationDrawerProvider>
  );
}
