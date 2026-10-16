import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  requireBod?: boolean;
}

export default function ProtectedRoute({ children, allowedRoles, requireBod = false }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Cờ BOD là thẩm quyền cho các route gác bằng `requireBod` — khớp với backend,
  // nơi `SalaryDepartmentView` cũng chỉ xét `is_bod`.
  const isBod = Boolean(
    user?.employee_profile?.is_bod ||
    user?.hrm_user?.is_bod ||
    (user as any)?.is_bod
  );

  // Always check staff access restrictions
  if (user) {
    const userRole = user.role ? user.role.toUpperCase() : '';
    const isSuperAdmin = user.is_super_admin || false;
    
    // Get user's department code from various possible locations in user object
    const userDepartmentCode = (
      user.employee_profile?.department_code ||
      user.hrm_user?.department_code ||
      (user as any)?.department_code ||
      null
    );
    
    // Super admin can access everything.
    //
    // `requireBod && isBod` cũng được miễn danh sách trắng dưới đây: route đó đã
    // tự gác bằng cờ BOD ở cuối hàm, và backend cũng chỉ xét `is_bod`. Danh sách
    // trắng này liệt kê cứng từng đường dẫn cho vai trò STAFF, không có nhóm
    // salary-management — nên người được cấp `is_bod` mà vai trò vẫn là STAFF
    // (vd kế toán thuế cần đọc bảng lương) sẽ bị đá về /home dù đã có quyền.
    //
    // Lỗi này nằm im lâu nay vì mọi người có `is_bod` trước đó đều là superuser,
    // thoát ở nhánh `isSuperAdmin` ngay phía trên.
    if (!isSuperAdmin && userRole === 'STAFF' && !(requireBod && isBod)) {
      // Staff can only access specific routes
      // These routes correspond to: Home, Me, Attendance, Organization Chart, Approvals
      // PLUS attendance upload for HCNS department staff
      const currentPath = window.location.pathname;
      
      // Define allowed paths for staff
      const isManager = user?.is_manager || false
      const employeePermission = user?.employee_permission;
      const isCtvLeader = user?.is_ctv_leader || user?.hrm_user?.is_ctv_leader || false;
      const isCtvAssigned = user?.hrm_user?.is_ctv_assigned || false;
      const isCtvManager = user?.hrm_user?.can_manage_ctv || employeePermission?.can_manage_ctv || false;

      const isAllowedForStaff =
        currentPath === '/home' ||
        currentPath === '/dashboard/me' ||
        (currentPath === '/dashboard/attendance' || currentPath === '/dashboard/attendance/view') ||
        currentPath === '/dashboard/organization-chart' ||
        currentPath === '/dashboard/approvals' ||
        currentPath === '/dashboard/my-requests' ||
        currentPath === '/dashboard/salary-advance' ||
        (currentPath === '/dashboard/attendance/upload' && userDepartmentCode === 'HCNS') ||
        currentPath === '/dashboard/onboarding' ||
        currentPath.startsWith('/dashboard/onboarding/') ||
        (isManager && (currentPath === '/dashboard/onboarding' || currentPath.startsWith('/dashboard/onboarding/'))) ||
        (employeePermission?.can_manage_departments && (currentPath === '/dashboard/departments' || currentPath.startsWith('/dashboard/departments/'))) ||
        (employeePermission?.can_manage_positions && (currentPath === '/dashboard/positions' || currentPath.startsWith('/dashboard/positions/'))) ||
        (isCtvManager && currentPath === '/dashboard/ctv') ||
        (isCtvLeader && currentPath === '/dashboard/ctv') ||
        (isCtvAssigned && currentPath === '/dashboard/ctv') ||
        (isCtvManager && currentPath === '/dashboard/doctors') ||
        currentPath === '/dashboard/assigned-assets' ||
        currentPath === '/dashboard/ai' ||
        currentPath === '/dashboard/announcements';

      if (!isAllowedForStaff) {
        return <Navigate to="/home" replace />;
      }
    }
    if (!isSuperAdmin && userRole === 'CUSTOMER') {
      const currentPath = window.location.pathname;
      
      const isManager = user?.is_manager || false

      const isAllowedForCustomer = 
        currentPath === '/home' ||
        currentPath === '/dashboard/me' ||
        currentPath === '/dashboard/attendance' ||
        currentPath === '/dashboard/attendance/view' ||
        currentPath === '/dashboard/organization-chart' ||
        currentPath === '/dashboard/approvals' ||
        currentPath === '/dashboard/onboarding' ||  
        currentPath.startsWith('/dashboard/onboarding/') ||
        currentPath === '/dashboard/assigned-assets' ||
        currentPath === '/dashboard/ai' ||
        currentPath === '/dashboard/announcements';

      if (!isAllowedForCustomer) {
        return <Navigate to="/home" replace />;
      }
}
  }

  // Check role-based access if allowedRoles is provided
  if (allowedRoles && user) {
    const userRole = user.role ? user.role.toUpperCase() : '';
    const isSuperAdmin = user.is_super_admin || false;
    
    // Super admin can access everything
    if (!isSuperAdmin && userRole !== 'STAFF') {
      // For non-staff users, check allowedRoles normally
      const hasAccess = allowedRoles.some(role => 
        role.toUpperCase() === userRole
      );
      
      if (!hasAccess) {
        // Redirect to home page if user doesn't have required role
        return <Navigate to="/home" replace />;
      }
    }
  }

  if (requireBod && user && !isBod) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
