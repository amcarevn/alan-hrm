import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheckIcon,
  UsersIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  employeePermissionService,
  EmployeePermission,
  EmployeePermissionStats,
} from '../services/employee-permission.service';
import { employeesAPI } from '../utils/api';
import { SelectBox } from '../components/LandingLayout/SelectBox';

const RoleList: React.FC = () => {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<EmployeePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<EmployeePermissionStats>({
    total: 0,
    employees_with_permissions: 0,
    employees_without_permissions: 0,
    permission_stats: {},
    department_stats: [],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [permissionFilter, setPermissionFilter] = useState<string>('all');
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const fetchPermissions = async (
    search = '',
    department = 'all',
    permission = 'all'
  ) => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (department !== 'all') params.department_id = department;
      if (permission !== 'all') params[permission] = true;

      const response = await employeePermissionService.getEmployeePermissions(
        params
      );
      setPermissions(response.results);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách phân quyền');
      console.error('Error fetching permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await employeePermissionService.getPermissionStats();
      setStats(statsData);
    } catch (err: any) {
      console.error('Error fetching permission stats:', err);
      setStats({
        total: 0,
        employees_with_permissions: 0,
        employees_without_permissions: 0,
        permission_stats: {},
        department_stats: [],
      });
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await employeesAPI.list({ page_size: 100 });
      const deptSet = new Set();
      const deptList: any[] = [];

      response.results.forEach((employee: any) => {
        if (employee.department && !deptSet.has(employee.department.id)) {
          deptSet.add(employee.department.id);
          deptList.push(employee.department);
        }
      });

      setDepartments(deptList);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  useEffect(() => {
    fetchPermissions();
    fetchStats();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      fetchPermissions(searchTerm, departmentFilter, permissionFilter);
    }, 300);
    setSearchTimeout(timeout);

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTerm, departmentFilter, permissionFilter]);

  const handleReset = () => {
    setSearchTerm('');
    setDepartmentFilter('all');
    setPermissionFilter('all');
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phân quyền này?')) {
      try {
        await employeePermissionService.deleteEmployeePermission(id);
        fetchPermissions();
        fetchStats();
      } catch (err: any) {
        alert('Xóa thất bại: ' + (err.message || 'Lỗi không xác định'));
      }
    }
  };

  const getBadge = (hasPermission: boolean) => (
    hasPermission ? (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-600">Có quyền</span>
    ) : (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">Không có</span>
    )
  );

  const permissionOptions = [
    { value: 'all', label: 'Tất cả quyền' },
    { value: 'can_approve_attendance', label: 'Phê duyệt công' },
    { value: 'can_create_employee', label: 'Tạo nhân viên' },
    { value: 'can_manage_attendance', label: 'Quản lý chấm công' },
    { value: 'can_manage_assets', label: 'Quản lý tài sản' },
    { value: 'can_approve_leave', label: 'Phê duyệt nghỉ phép' },
    { value: 'can_approve_overtime', label: 'Phê duyệt OT' },
    { value: 'can_view_all_employees', label: 'Xem tất cả NV' },
    { value: 'can_manage_departments', label: 'Quản lý phòng ban' },
    { value: 'can_manage_positions', label: 'Quản lý chức vụ' },
    { value: 'can_manage_company_config', label: 'Quản lý cấu hình' },
    { value: 'can_manage_attendance_rules', label: 'Quản lý quy tắc công' },
    { value: 'can_manage_leave_policies', label: 'Quản lý chính sách nghỉ' },
    { value: 'can_view_reports', label: 'Xem báo cáo' },
    { value: 'can_export_reports', label: 'Xuất báo cáo' },
  ];

  const tableHeaders = [
    'Mã NV', 'Họ tên', 'Phòng ban', 'Chức vụ',
    'Phê duyệt công', 'Tạo nhân viên', 'Quản lý chấm công', 'Quản lý tài sản',
    'Có quyền', 'Thao tác',
  ];

  return (
    <div className="flex flex-col gap-6 flex-1 min-h-0">
      {/* Page header */}
      <div className="flex items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Quản lý phân quyền nhân viên
          </h1>
          <p className="text-sm text-gray-900 mt-0.5">
            Quản lý quyền hạn: phê duyệt công, tạo nhân viên, chấm công, tài sản, v.v.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col flex-1 min-h-0 gap-6">
        {/* Statistics */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
              <ShieldCheckIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Thống kê phân quyền</h2>
              <p className="text-xs text-gray-400">Tổng quan trạng thái phân quyền</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-primary-500 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                  <UsersIcon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Tổng nhân viên</p>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight mt-1">{stats.total}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-emerald-500 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                  <ShieldCheckIcon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Có phân quyền</p>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight mt-1">{stats.employees_with_permissions}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-amber-500 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                  <UserGroupIcon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Chưa phân quyền</p>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight mt-1">{stats.employees_without_permissions}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-violet-500 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center">
                  <BuildingOfficeIcon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Phòng ban</p>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight mt-1">{stats.department_stats.length}</p>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-900">Tìm kiếm phân quyền</h3>
            {loading && (
              <div className="flex items-center text-xs text-gray-500 gap-1.5">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                Đang tìm kiếm...
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Tìm kiếm theo mã, tên nhân viên
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                placeholder="Nhập mã NV, tên nhân viên..."
              />
            </div>
            <div>
              <SelectBox<string>
                label="Phòng ban"
                value={departmentFilter}
                options={[
                  { value: 'all', label: 'Tất cả phòng ban' },
                  ...departments.map((dept) => ({ value: String(dept.id), label: dept.name })),
                ]}
                onChange={setDepartmentFilter}
              />
            </div>
            <div>
              <SelectBox<string>
                label="Loại quyền"
                value={permissionFilter}
                options={permissionOptions}
                onChange={setPermissionFilter}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleReset}
                className="btn-secondary w-full"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          </div>
        </div>

        {/* Header + Add button */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Danh sách phân quyền</h2>
            <p className="text-xs text-gray-400 mt-0.5">Tổng số: {permissions.length} phân quyền</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => navigate('/permissions/dashboard/roles/create')}
          >
            + Thêm phân quyền
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 min-h-0">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-sm text-gray-500">Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="h-12 w-12 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ExclamationCircleIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-gray-900">Đã xảy ra lỗi</p>
            <p className="text-xs text-gray-400 mt-1">{error}</p>
            <button
              onClick={() => fetchPermissions()}
              className="btn-primary mt-4"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="border border-gray-100 rounded-2xl overflow-hidden flex-1">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {tableHeaders.map((h) => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {permissions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 bg-primary-100 text-primary-400 rounded-2xl flex items-center justify-center">
                          <ShieldCheckIcon className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-gray-900">Chưa có phân quyền nào</p>
                        <p className="text-xs text-gray-400">Bắt đầu bằng cách thêm phân quyền mới</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  permissions.map((perm: any) => (
                    <tr key={perm.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell font-medium">
                        {perm.employee_code || perm.employee?.employee_id || '-'}
                      </td>
                      <td className="table-cell font-medium">
                        {perm.employee_name || perm.employee?.full_name || '-'}
                      </td>
                      <td className="table-cell">
                        {perm.department_name || perm.employee?.department?.name || '-'}
                      </td>
                      <td className="table-cell">
                        {perm.position_title || perm.employee?.position?.title || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getBadge(perm.can_approve_attendance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getBadge(perm.can_create_employee)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getBadge(perm.can_manage_attendance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getBadge(perm.can_manage_assets)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getBadge(perm.has_any_permission)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/permissions/dashboard/roles/${perm.id}`)}
                            className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Xem"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/permissions/dashboard/roles/${perm.id}/edit`)}
                            className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(perm.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default RoleList;
