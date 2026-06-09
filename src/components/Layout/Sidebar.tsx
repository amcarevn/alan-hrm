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
  ExclamationCircleIcon,
  TrophyIcon,
  GiftIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  UsersIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

// Define interface for navigation items
interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  roles: string[];
  bodOnly?: boolean;
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
    roles: ['ADMIN','HR'],
    children: [
      {
        name: 'Quản lý nhân viên',
        href: '/dashboard/employees',
        icon: UserIcon,
        roles: ['ADMIN', 'HR'],
      },
      {
        name: 'Quản lý BHXH',
        href: '/dashboard/social-insurance',
        icon: ShieldCheckIcon,
        roles: ['ADMIN', 'HR'],
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
        roles: ['ADMIN', 'HR'],
      },
      {
        name: 'Quản lý phân quyền',
        href: '/dashboard/roles',
        icon: ShieldCheckIcon,
        roles: ['ADMIN', 'HR'],
      },
      {
        name: 'Cấp lại mật khẩu',
        href: '/dashboard/password-reset',
        icon: KeyIcon,
        roles: ['ADMIN', 'HR'],
      },
    ],
  },

  // --- Quản lý CTV ---
  {
    name: 'Quản lý CTV',
    href: '/dashboard/ctv',
    icon: UsersIcon,
    roles: ['ADMIN'],
    children: [
      {
        name: 'Danh sách CTV',
        href: '/dashboard/ctv',
        icon: UsersIcon,
        roles: ['ADMIN'],
        employeePermission: 'can_manage_ctv',
      },
      {
        name: 'Quản lý Bác sĩ',
        href: '/dashboard/doctors',
        icon: UserGroupIcon,
        roles: ['ADMIN'],
        employeePermission: 'can_manage_doctor',
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
        roles: ['ADMIN', 'HR'],
      },
    ],
  },

  // --- Khen thưởng & Kỷ luật ---
  {
    name: 'Khen thưởng & Kỷ luật',
    href: '/dashboard/rewards',
    icon: GiftIcon,
    roles: ['ADMIN', 'HR'],
    children: [
      {
        name: 'Xếp hạng chấm công',
        href: '/dashboard/attendance/ranking',
        icon: TrophyIcon,
        roles: ['ADMIN', 'HR'],
      },
    ],
  },

  // --- Lương ---
  {
    name: 'Quản lý tính lương',
    href: '/dashboard/salary-management/config',
    icon: CurrencyDollarIcon,
    roles: ['ADMIN', 'HR'],
    bodOnly: true,
    children: [
      {
        name: 'Bảng lương',
        href: '/dashboard/salary-management/payroll',
        icon: TableCellsIcon,
        roles: ['ADMIN', 'USER', 'HR', 'STAFF'],
        bodOnly: true,
      },
      {
        name: 'Cấu hình tính lương',
        href: '/dashboard/salary-management/config',
        icon: CurrencyDollarIcon,
        roles: ['ADMIN', 'USER', 'HR', 'STAFF'],
        bodOnly: true,
      },
      {
        name: 'Dữ liệu',
        href: '/dashboard/salary-management/penalty',
        icon: ExclamationCircleIcon,
        roles: ['ADMIN'],
        bodOnly: true,
      },
      {
        name: 'Cấu hình tăng ca',
        href: '/dashboard/salary-management/overtime',
        icon: ClockIcon,
        roles: ['ADMIN', 'USER', 'HR', 'STAFF'],
        bodOnly: true,
      },
    ],
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
        <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-primary-700 via-primary-800 to-primary-900 border-r border-primary-900">
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
  const isBod = Boolean(
    user?.employee_profile?.is_bod ||
    user?.hrm_user?.is_bod ||
    (user as any)?.is_bod
  );

  const canAccessItem = (item: NavigationItem): boolean => {
    if (item.bodOnly && !isBod) {
      return false;
    }

    // 1. Check if item requires a specific employee permission
    if (item.employeePermission && employeePermission?.[item.employeePermission as keyof typeof employeePermission]) {
      return true;
    }
    // Fallback: check hrm_user (available immediately after login, before getProfile)
    if (item.employeePermission === 'can_manage_ctv' && user?.hrm_user?.can_manage_ctv) {
      return true;
    }
    if (item.employeePermission === 'can_manage_doctor' && user?.hrm_user?.can_manage_doctor) {
      return true;
    }
    // CTV leader hoặc nhân sự đảm nhận CTV → luôn thấy menu Quản lý CTV
    if (item.href === '/dashboard/ctv' && (
      user?.is_ctv_leader || user?.hrm_user?.is_ctv_leader ||
      user?.hrm_user?.is_ctv_assigned
    )) {
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
    // 4. If item has children, show parent when any child is accessible
    if (item.children && item.children.some(child => canAccessItem(child))) {
      return true;
    }
    // 5. Check role access
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
            className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all ${
              active
                ? 'bg-white/25 text-white font-semibold'
                : 'text-white hover:bg-white/10'
            } ${collapsed ? 'justify-center' : 'justify-between'}`}
            title={collapsed ? item.name : undefined}
          >
            <span className={`flex items-center ${collapsed ? '' : ''}`}>
              <item.icon
                className={`h-5 w-5 flex-shrink-0 ${active ? 'text-white' : 'text-white/95 group-hover:text-white'} ${collapsed ? '' : 'mr-3'}`}
              />
              {!collapsed && item.name}
            </span>
            {!collapsed && (
              <ChevronRightIcon
                className={`h-4 w-4 transition-transform ${active ? 'text-white' : 'text-white/80'} ${expanded ? 'rotate-90' : ''}`}
              />
            )}
          </button>
          {!collapsed && expanded && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-white/20 pl-3">
              {visibleChildren.map(child => {
                const childActive = location.pathname === child.href;
                return (
                  <Link
                    key={child.name}
                    to={child.href}
                    className={`group flex items-center px-2 py-1.5 text-sm rounded-md transition-all font-medium ${
                      childActive
                        ? 'bg-white/25 text-white font-semibold'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <child.icon
                      className={`h-4 w-4 flex-shrink-0 mr-2 ${childActive ? 'text-white' : 'text-white/90 group-hover:text-white'}`}
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
        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all ${
          isActive
            ? 'bg-white/25 text-white font-semibold'
            : 'text-white hover:bg-white/10'
        } ${collapsed ? 'justify-center' : ''}`}
        title={collapsed ? item.name : undefined}
      >
        <item.icon
          className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-white/95 group-hover:text-white'} ${collapsed ? '' : 'mr-3'}`}
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
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-gradient-to-b from-primary-700 via-primary-800 to-primary-900">
          <div className="relative flex h-16 items-center justify-center border-b border-primary-600">
            <img src="/logo_alan.png" alt="Trung Anh Group" className="h-10 w-auto max-w-[140px] object-contain drop-shadow-sm brightness-[400]" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 text-white/70 hover:text-white"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto space-y-1 px-2 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {navigation.map((item) => renderNavItem(item, false))}
          </nav>

          {/* User Info Section */}
          {user && (
            <div className="border-t border-primary-600 px-2 py-4">
              <Link to="/dashboard/settings" className="block">
                <div className="flex items-center space-x-3 hover:bg-white/10 p-2 rounded-lg transition-colors">
                  {user.hrm_user?.avatar_url ? (
                    <img
                      src={user.hrm_user.avatar_url}
                      alt="Avatar"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 bg-gradient-to-br from-white/30 to-white/10 rounded-full flex items-center justify-center shadow-lg shadow-black/10">
                      <span className="text-sm font-medium text-white">
                        {user.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.username}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${userRole === 'ADMIN'
    ? 'bg-red-900/60 text-red-300'
                        : 'bg-primary-700 text-primary-200'
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
        <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-primary-700 via-primary-800 to-primary-900 border-r border-primary-900">
          <div className="relative flex h-16 items-center justify-center border-b border-primary-600">
            {!isCollapsed && (
              <img src="/logo_alan.png"
                alt="Trung Anh Group"
                className="h-12 w-auto max-w-[140px] object-contain drop-shadow-sm  brightness-[400]"
              />
            )}
            <button
              onClick={handleCollapseToggle}
              className="absolute right-2 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-primary-800 transition-all duration-150"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRightIcon className="h-4 w-4" />
              ) : (
                <ChevronLeftIcon className="h-4 w-4" />
              )}
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto space-y-1 px-2 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {navigation.map((item) => renderNavItem(item, isCollapsed))}
          </nav>

          {/* User Info Section */}
          {!isCollapsed && user && (
            <div className="border-t border-primary-600 px-2 py-3">

              <Link to="/dashboard/settings" className="block">
                <div className="flex items-center space-x-3 hover:bg-primary-800 p-2 rounded-lg transition-colors">
                  {user.hrm_user?.avatar_url ? (
                    <img
                      src={user.hrm_user.avatar_url}
                      alt="Avatar"
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-primary-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center ring-2 ring-primary-700 flex-shrink-0">
                      <span className="text-sm font-semibold text-white">
                        {(user.employee_profile?.full_name || user.hrm_user?.full_name || user.firstName || user.username)?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.employee_profile?.full_name || user.hrm_user?.full_name || user.firstName || user.username}
                    </p>
                    <p className="text-xs text-primary-400 truncate">{user.username}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${
                      userRole === 'ADMIN'
                        ? 'bg-red-900/60 text-red-300'
                        : 'bg-primary-700 text-primary-200'
                    }`}>
                      {userRole}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )}

        </div>
      </div>

      {/* Mobile menu button */}
      <div className="sticky top-0 z-40 relative flex h-16 shrink-0 items-center border-b border-primary-800 bg-gradient-to-r from-primary-700 to-primary-800 px-4 sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-white/80 hover:text-white"
          onClick={() => setSidebarOpen(true)}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Link to="/" className="pointer-events-auto">
            <img src="/logo_alan.png" alt="Alan HRM" className="h-10 w-auto object-contain drop-shadow-sm brightness-[400]" />
          </Link>
        </div>
      </div>
    </>
  );
}