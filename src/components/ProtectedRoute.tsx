import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
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
    
    // Super admin can access everything
    if (!isSuperAdmin && userRole === 'STAFF') {
      // Staff can only access specific routes
      // These routes correspond to: Home, Me, Attendance, Organization Chart, Approvals
      // PLUS attendance upload for HCNS department staff
      const currentPath = window.location.pathname;
      
      // Define allowed paths for staff
      const isManager = user?.is_manager || false
      const employeePermission = user?.employee_permission;

      const isAllowedForStaff =
        currentPath === '/home' ||
        currentPath === '/dashboard/me' ||
        (currentPath === '/dashboard/attendance' || currentPath === '/dashboard/attendance/view') ||
        currentPath === '/dashboard/organization-chart' ||
        currentPath === '/dashboard/approvals' ||
        currentPath === '/dashboard/my-requests' ||
        (currentPath === '/dashboard/attendance/upload' && userDepartmentCode === 'HCNS') ||
        currentPath === '/dashboard/onboarding' ||
        currentPath.startsWith('/dashboard/onboarding/') ||
        (isManager && (currentPath === '/dashboard/onboarding' || currentPath.startsWith('/dashboard/onboarding/'))) ||
        (employeePermission?.can_manage_departments && (currentPath === '/dashboard/departments' || currentPath.startsWith('/dashboard/departments/'))) ||
        (employeePermission?.can_manage_positions && (currentPath === '/dashboard/positions' || currentPath.startsWith('/dashboard/positions/'))) ||
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

  return <>{children}</>;
}
