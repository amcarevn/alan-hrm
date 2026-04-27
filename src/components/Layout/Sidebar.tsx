import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Cog6ToothIcon,
  Squares2X2Icon,
  XMarkIcon,
  Bars3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  UserPlusIcon,
  UserMinusIcon,
  BuildingOfficeIcon,
  CloudArrowUpIcon,
  ComputerDesktopIcon,
  UserCircleIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  TableCellsIcon,
  DocumentTextIcon,
  KeyIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  GiftIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline';

// Define interface for navigation items
interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  roles: string[];
  departments?: string[]; // Optional department codes
  employeePermission?: string; // Optional employee_permission key that grants access
  children?: NavigationItem[]; // Sub-items for collapsible groups
}

// Define navigation items with role requirements
const navigationItems: NavigationItem[] = [
  // --- Tổng quan ---
  {
    name: 'Trang chủ',
    href: '/home',
    icon: Squares2X2Icon,
    roles: ['ADMIN', 'USER', 'CUSTOMER', 'STAFF', 'HR'],
  },
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: ChartBarIcon,
    roles: ['ADMIN', 'USER', 'CUSTOMER'],
  },
  {
    name: 'Bảng thông báo',
    href: '/dashboard/announcements',
    icon: MegaphoneIcon,
    roles: ['ADMIN','HR'],
  },
  {
    name: 'Me',
    href: '/dashboard/me',
    icon: UserCircleIcon,
    roles: ['ADMIN', 'USER', 'CUSTOMER', 'STAFF', 'HR'],
  },

  // --- Nhân sự ---
  {
    name: 'Nhân sự',
    href: '/dashboard/employees',
    icon: UserIcon,
    roles: ['ADMIN', 'USER', 'HR'],
    children: [
      {
        name: 'Quản lý nhân viên',
        href: '/dashboard/employees',
        icon: UserIcon,
        roles: ['ADMIN', 'USER'],
      },
      {
        name: 'Onboard nhân sự',
        href: '/dashboard/onboarding',
        icon: UserPlusIcon,
        roles: ['ADMIN', 'HR'],
      },
      {
        name: 'Offboard nhân sự',
        href: '/dashboard/offboarding',
        icon: UserMinusIcon,
        roles: ['ADMIN'],
      },
      {
        name: 'Quản lý phân quyền',
        href: '/dashboard/roles',
        icon: ShieldCheckIcon,
        roles: ['ADMIN'],
      },
      {
        name: 'Reset mật khẩu',
        href: '/dashboard/password-reset',
        icon: KeyIcon,
        roles: ['ADMIN', 'HR'],
      },
    ],
  },

  // --- Cơ cấu tổ chức ---
  {
    name: 'Cơ cấu tổ chức',
    href: '/dashboard/departments',
    icon: BuildingOfficeIcon,
    roles: ['ADMIN'],
    children: [
      {
        name: 'Quản lý phòng ban',
        href: '/dashboard/departments',
        icon: BuildingOfficeIcon,
        roles: ['ADMIN'],
        employeePermission: 'can_manage_departments',
      },
      {
        name: 'Quản lý bộ phận',
        href: '/dashboard/sections',
        icon: BuildingOfficeIcon,
        roles: ['ADMIN'],
        employeePermission: 'can_manage_departments',
      },
      {
        name: 'Quản lý vị trí',
        href: '/dashboard/positions',
        icon: BriefcaseIcon,
        roles: ['ADMIN'],
        employeePermission: 'can_manage_positions',
      },
    ],
  },

  // --- Chấm công ---
  {
    name: 'Chấm công',
    href: '/dashboard/attendance',
    icon: ClockIcon,
    roles: ['ADMIN', 'USER', 'CUSTOMER', 'STAFF', 'HR'],
    children: [
      {
        name: 'Chấm công',
        href: '/dashboard/attendance',
        icon: ClockIcon,
        roles: ['ADMIN', 'USER', 'CUSTOMER', 'STAFF', 'HR'],
      },
      {
        name: 'Quản lý chấm công',
        href: '/dashboard/attendance/upload',
        icon: CloudArrowUpIcon,
        roles: ['ADMIN', 'HR'],
        departments: ['HCNS'],
      },
      {
        name: 'Cấu hình ca làm',
        href: '/dashboard/shift-configuration',
        icon: ClockIcon,
        roles: ['ADMIN', 'HR'],
      },
      {
        name: 'Chốt công',
        href: '/dashboard/work-finalization',
        icon: TableCellsIcon,
        roles: ['ADMIN', 'HR'],
      },
      {
        name: 'Phê duyệt chốt công',
        href: '/dashboard/work-finalization/approvals',
        icon: CheckCircleIcon,
        roles: ['ADMIN'],
      },
    ],
  },

  // --- Khen thưởng & Kỷ luật ---
  {
    name: 'Khen thưởng & Kỷ luật',
    href: '/dashboard/rewards',
    icon: GiftIcon,
    roles: ['ADMIN'],
    children: [
      {
        name: 'Xếp hạng chấm công',
        href: '/dashboard/attendance/ranking',
        icon: TrophyIcon,
        roles: ['ADMIN'],
      },
    ],
  },

  // --- Lương ---
  {
    name: 'Quản lý tính lương',
    href: '/dashboard/salary-management',
    icon: CurrencyDollarIcon,
    roles: ['ADMIN'],
  },

  // --- Tài sản ---
  {
    name: 'Tài sản',
    href: '/dashboard/assigned-assets',
    icon: ComputerDesktopIcon,
    roles: ['ADMIN', 'USER', 'CUSTOMER', 'STAFF', 'HR'],
    children: [
      {
        name: 'Tài sản được bàn giao',
        href: '/dashboard/assigned-assets',
        icon: ComputerDesktopIcon,
        roles: ['ADMIN', 'USER', 'CUSTOMER', 'STAFF', 'HR'],
      },
      {
        name: 'Quản lý tài sản',
        href: '/dashboard/assets',
        icon: ComputerDesktopIcon,
        roles: ['ADMIN', 'HR'],
      },
    ],
  },

  // --- Đơn từ & Phê duyệt ---
  {
    name: 'Đơn từ & Phê duyệt',
    href: '/dashboard/my-requests',
    icon: ClipboardDocumentListIcon,
    roles: ['ADMIN', 'USER', 'CUSTOMER', 'STAFF', 'HR'],
    children: [
      {
        name: 'Yêu cầu & Đơn từ',
        href: '/dashboard/my-requests',
        icon: ClipboardDocumentListIcon,
        roles: ['ADMIN', 'USER', 'CUSTOMER', 'STAFF', 'HR'],
      },
      {
        name: 'Phê duyệt',
        href: '/dashboard/approvals',
        icon: CheckCircleIcon,
        roles: ['ADMIN', 'USER', 'CUSTOMER', 'STAFF', 'HR'],
      },
      {
        name: 'Template đơn từ',
        href: '/dashboard/request-templates',
        icon: DocumentTextIcon,
        roles: ['ADMIN', 'HR'],
      },
      {
        name: 'Template hợp đồng',
        href: '/dashboard/contract-templates',
        icon: DocumentTextIcon,
        roles: ['ADMIN', 'HR'],
      },
      {
        name: 'Template tài liệu',
        href: '/dashboard/document-templates',
        icon: DocumentTextIcon,
        roles: ['ADMIN', 'HR'],
      },
    ],
  },

  // --- Tuyển dụng ---
  {
    name: 'Tuyển dụng',
    href: '/dashboard/recruitment',
    icon: MagnifyingGlassIcon,
    roles: ['ADMIN', 'HR'],
    children: [
      {
        name: 'Nhu cầu tuyển dụng',
        href: '/dashboard/recruitment/needs',
        icon: DocumentTextIcon,
        roles: ['ADMIN', 'HR'],
      },
      {
        name: 'Quản lý JD',
        href: '/dashboard/recruitment/jobs',
        icon: BriefcaseIcon,
        roles: ['ADMIN', 'HR'],
      },
      {
        name: 'Ứng viên',
        href: '/dashboard/recruitment/candidates',
        icon: UserIcon,
        roles: ['ADMIN', 'HR'],
      },
    ],
  },

  // --- Cấu hình ---
  {
    name: 'Cấu hình công ty',
    href: '/dashboard/company-configs',
    icon: Cog6ToothIcon,
    roles: ['ADMIN'],
  },

  // --- AI ---
  {
    name: 'AI',
    href: '/dashboard/ai',
    icon: SparklesIcon,
    roles: ['ADMIN', 'USER', 'CUSTOMER', 'STAFF', 'HR'],
  },
];

interface SidebarProps {
  onCollapseChange?: (isCollapsed: boolean) => void;
}

export default function Sidebar({ onCollapseChange }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [collapsedByUser, setCollapsedByUser] = useState<Set<string>>(new Set());
  const location = useLocation();
  const { user, loading } = useAuth();

  // If still loading auth data, show minimal sidebar
  if (loading) {
    return (
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4">
            <div className="h-8 w-8 rounded-lg bg-gray-200 animate-pulse"></div>
            <div className="ml-2 h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-md animate-pulse"></div>
            ))}
          </nav>
        </div>
      </div>
    );
  }

  // Filter navigation items based on user role and department
  const userRole = user?.role ? user.role.toUpperCase() : 'USER';
  const isSuperAdmin = user?.is_super_admin || (user as any)?.is_superuser || false;
  const isManager = user?.is_manager || false;

  // Get user's department code
  const userDepartmentCode = (
    user?.employee_profile?.department_code ||
    user?.hrm_user?.department_code ||
    (user as any)?.department_code ||
    null
  );

  // Get employee_permission from user profile
  const employeePermission = user?.employee_permission;

  const canAccessItem = (item: NavigationItem): boolean => {
    // 1. Check if item requires a specific employee permission
    if (item.employeePermission && employeePermission?.[item.employeePermission as keyof typeof employeePermission]) {
      return true;
    }
    // 2. Check department access
    if (item.departments && userDepartmentCode) {
      if (item.departments.includes(userDepartmentCode)) {
        return item.roles.some(role => role.toUpperCase() === userRole);
      }
    }
    // 3. Special case: Managers can access Onboarding
    if (isManager && item.name === 'Onboard nhân sự') {
      return true;
    }
    // 4. Check role access
    return item.roles.some(role => role.toUpperCase() === userRole);
  };

  // Unified filtering logic
  const navigation = isSuperAdmin
    ? navigationItems
    : navigationItems.filter(canAccessItem);

  const toggleGroup = (name: string, currentlyExpanded: boolean) => {
    if (currentlyExpanded) {
      setExpandedGroups(prev => { const next = new Set(prev); next.delete(name); return next; });
      setCollapsedByUser(prev => new Set(prev).add(name));
    } else {
      setExpandedGroups(prev => new Set(prev).add(name));
      setCollapsedByUser(prev => { const next = new Set(prev); next.delete(name); return next; });
    }
  };

  // Check if any child of a group is currently active (auto-expand)
  const isGroupActive = (item: NavigationItem) =>
    item.children?.some(child => location.pathname.startsWith(child.href)) ?? false;

  const handleCollapseToggle = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onCollapseChange?.(newCollapsedState);
  };

  const renderNavItem = (item: NavigationItem, collapsed: boolean) => {
    // Group item with children
    if (item.children && item.children.length > 0) {
      const visibleChildren = isSuperAdmin ? item.children : item.children.filter(canAccessItem);
      if (visibleChildren.length === 0) return null;
      const active = isGroupActive(item);
      const expanded = collapsedByUser.has(item.name) ? false : (expandedGroups.has(item.name) || active);
      return (
        <div key={item.name}>
          <button
            onClick={collapsed ? undefined : () => toggleGroup(item.name, expanded)}
            className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
              active ? 'bg-primary-100 text-primary-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } ${collapsed ? 'justify-center' : 'justify-between'}`}
            title={collapsed ? item.name : undefined}
          >
            <span className={`flex items-center ${collapsed ? '' : ''}`}>
              <item.icon
                className={`h-6 w-6 flex-shrink-0 ${active ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'} ${collapsed ? '' : 'mr-3'}`}
              />
              {!collapsed && item.name}
            </span>
            {!collapsed && (
              <ChevronRightIcon
                className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
              />
            )}
          </button>
          {!collapsed && expanded && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3">
              {visibleChildren.map(child => {
                const childActive = location.pathname === child.href;
                return (
                  <Link
                    key={child.name}
                    to={child.href}
                    className={`group flex items-center px-2 py-1.5 text-sm font-medium rounded-md ${
                      childActive ? 'bg-primary-100 text-primary-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <child.icon
                      className={`h-4 w-4 flex-shrink-0 mr-2 ${childActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`}
                    />
                    {child.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Regular flat item
    const isActive = location.pathname === item.href;
    return (
      <Link
        key={item.name}
        to={item.href}
        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
          isActive ? 'bg-primary-100 text-primary-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        } ${collapsed ? 'justify-center' : ''}`}
        title={collapsed ? item.name : undefined}
      >
        <item.icon
          className={`h-6 w-6 flex-shrink-0 ${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'} ${collapsed ? '' : 'mr-3'}`}
        />
        {!collapsed && item.name}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo-trung-anh.png" alt="Trung Anh Group" className="h-8 w-auto max-w-[130px] object-contain" />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto space-y-1 px-2 py-4">
            {navigation.map((item) => renderNavItem(item, false))}
          </nav>

          {/* User Info Section */}
          {user && (
            <div className="border-t border-gray-200 px-2 py-4">
              <Link to="/dashboard/settings" className="block">
                <div className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                  {user.hrm_user?.avatar_url ? (
                    <img
                      src={user.hrm_user.avatar_url}
                      alt="Avatar"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.username}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${userRole === 'ADMIN'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                          }`}
                      >
                        {userRole}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

        </div>
      </div>

      {/* Desktop sidebar */}
      <div
        className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${isCollapsed ? 'lg:w-16' : 'lg:w-64'}`}
      >
        <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
          <div className="relative flex h-16 items-center justify-center">
            {!isCollapsed && (
              <Link to="/" className="flex items-center justify-center">
                <img src="/logo-trung-anh.png" alt="Trung Anh Group" className="h-10 w-auto object-contain" />
              </Link>
            )}
            <button
              onClick={handleCollapseToggle}
              className="absolute right-2 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRightIcon className="h-4 w-4" />
              ) : (
                <ChevronLeftIcon className="h-4 w-4" />
              )}
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto space-y-1 px-2 py-4">
            {navigation.map((item) => renderNavItem(item, isCollapsed))}
          </nav>

          {/* User Info Section */}
          {!isCollapsed && user && (
            <div className="border-t border-gray-200 px-2 py-3">
              {/* Music Order Badge - above user info */}
              <a
                href="https://music-player.thammytrunganh.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-colors w-fit"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-xs font-medium text-white">Order nhạc ở đây</span>
              </a>
              <Link to="/dashboard/settings" className="block">
                <div className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                  {user.hrm_user?.avatar_url ? (
                    <img
                      src={user.hrm_user.avatar_url}
                      alt="Avatar"
                      className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-white">
                        {(user.employee_profile?.full_name || user.hrm_user?.full_name || user.firstName || user.username)?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.employee_profile?.full_name || user.hrm_user?.full_name || user.firstName || user.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.username}</p>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${userRole === 'ADMIN'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                          }`}
                      >
                        {userRole}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

        </div>
      </div>

      {/* Mobile menu button */}
      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-900 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-xs tracking-tight">TAG</span>
            </div>
            <span className="text-sm font-bold text-gray-900">Trung Anh Group</span>
          </Link>
        </div>
      </div>
    </>
  );
}