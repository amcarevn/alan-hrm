import React, { useState, useEffect } from 'react';
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { employeePermissionService, EmployeePermission } from '../services/employee-permission.service';
import { employeesAPI } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const RoleCreate: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    can_approve_attendance: false,
    can_create_employee: false,
    can_manage_attendance: false,
    can_manage_assets: false,
    can_approve_leave: false,
    can_approve_overtime: false,
    can_view_all_employees: false,
    can_manage_departments: false,
    can_manage_positions: false,
    can_manage_company_config: false,
    can_manage_attendance_rules: false,
    can_manage_leave_policies: false,
    can_view_reports: false,
    can_export_reports: false,
    notes: '',
  });

  // Validation state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      // Only load employees from HR department (Hành chính nhân sự)
      // We need to filter by department. First, let's get all employees and filter client-side
      // or we could add department filter to API call if supported
      const response = await employeesAPI.list({ page_size: 100 });
      
      // Filter employees to only include those from HR department
      // Assuming HR department has name containing "Hành chính" or "Nhân sự"
      const hrEmployees = response.results.filter(employee => {
        const deptName = employee.department?.name?.toLowerCase() || '';
        return deptName.includes('hành chính') || 
               deptName.includes('nhân sự') || 
               deptName.includes('hr') ||
               deptName.includes('human resource');
      });
      
      setEmployees(hrEmployees);
      
      if (hrEmployees.length === 0) {
        setError('Không tìm thấy nhân viên nào thuộc phòng Hành chính Nhân sự');
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
      setError('Lỗi khi tải danh sách nhân viên');
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Employee validation
    if (!formData.employee_id) {
      newErrors.employee_id = 'Vui lòng chọn nhân viên';
    }

    // At least one permission should be selected
    const hasAnyPermission = 
      formData.can_approve_attendance ||
      formData.can_create_employee ||
      formData.can_manage_attendance ||
      formData.can_manage_assets ||
      formData.can_approve_leave ||
      formData.can_approve_overtime ||
      formData.can_view_all_employees ||
      formData.can_manage_departments ||
      formData.can_manage_positions ||
      formData.can_manage_company_config ||
      formData.can_manage_attendance_rules ||
      formData.can_manage_leave_policies ||
      formData.can_view_reports ||
      formData.can_export_reports;

    if (!hasAnyPermission) {
      newErrors.permissions = 'Vui lòng chọn ít nhất một quyền';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // If employee is selected, load their existing permissions
      if (name === 'employee_id' && value) {
        loadEmployeePermissions(parseInt(value));
      }
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSelectAllPermissions = () => {
    setFormData((prev) => ({
      ...prev,
      can_approve_attendance: true,
      can_create_employee: true,
      can_manage_attendance: true,
      can_manage_assets: true,
      can_approve_leave: true,
      can_approve_overtime: true,
      can_view_all_employees: true,
      can_manage_departments: true,
      can_manage_positions: true,
      can_manage_company_config: true,
      can_manage_attendance_rules: true,
      can_manage_leave_policies: true,
      can_view_reports: true,
      can_export_reports: true,
    }));
  };

  const handleClearAllPermissions = () => {
    setFormData((prev) => ({
      ...prev,
      can_approve_attendance: false,
      can_create_employee: false,
      can_manage_attendance: false,
      can_manage_assets: false,
      can_approve_leave: false,
      can_approve_overtime: false,
      can_view_all_employees: false,
      can_manage_departments: false,
      can_manage_positions: false,
      can_manage_company_config: false,
      can_manage_attendance_rules: false,
      can_manage_leave_policies: false,
      can_view_reports: false,
      can_export_reports: false,
    }));
  };

  const loadEmployeePermissions = async (employeeId: number) => {
    try {
      const permission = await employeePermissionService.getEmployeePermissionByEmployeeId(employeeId);
      
      // Update form with existing permissions
      setFormData(prev => ({
        ...prev,
        can_approve_attendance: permission.can_approve_attendance,
        can_create_employee: permission.can_create_employee,
        can_manage_attendance: permission.can_manage_attendance,
        can_manage_assets: permission.can_manage_assets,
        can_approve_leave: permission.can_approve_leave,
        can_approve_overtime: permission.can_approve_overtime,
        can_view_all_employees: permission.can_view_all_employees,
        can_manage_departments: permission.can_manage_departments,
        can_manage_positions: permission.can_manage_positions,
        can_manage_company_config: permission.can_manage_company_config,
        can_manage_attendance_rules: permission.can_manage_attendance_rules,
        can_manage_leave_policies: permission.can_manage_leave_policies,
        can_view_reports: permission.can_view_reports,
        can_export_reports: permission.can_export_reports,
        notes: permission.notes || '',
      }));

      setSuccess(`Đã tải quyền hiện có của nhân viên`);
    } catch (error: any) {
      // If employee doesn't have permissions yet, clear the form (except employee_id)
      if (error.response?.status === 404) {
        setFormData(prev => ({
          ...prev,
          can_approve_attendance: false,
          can_create_employee: false,
          can_manage_attendance: false,
          can_manage_assets: false,
          can_approve_leave: false,
          can_approve_overtime: false,
          can_view_all_employees: false,
          can_manage_departments: false,
          can_manage_positions: false,
          can_manage_company_config: false,
          can_manage_attendance_rules: false,
          can_manage_leave_policies: false,
          can_view_reports: false,
          can_export_reports: false,
          notes: '',
        }));
        setSuccess('Nhân viên chưa có quyền nào. Bạn có thể tạo quyền mới.');
      } else {
        console.error('Failed to load employee permissions:', error);
        setError('Lỗi khi tải quyền của nhân viên');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Find the selected employee
      const selectedEmployee = employees.find(emp => emp.id.toString() === formData.employee_id);
      if (!selectedEmployee) {
        throw new Error('Nhân viên không tồn tại');
      }

      const permissionData = {
        employee: selectedEmployee.id,
        employee_id: selectedEmployee.id,
        can_approve_attendance: formData.can_approve_attendance,
        can_create_employee: formData.can_create_employee,
        can_manage_attendance: formData.can_manage_attendance,
        can_manage_assets: formData.can_manage_assets,
        can_approve_leave: formData.can_approve_leave,
        can_approve_overtime: formData.can_approve_overtime,
        can_view_all_employees: formData.can_view_all_employees,
        can_manage_departments: formData.can_manage_departments,
        can_manage_positions: formData.can_manage_positions,
        can_manage_company_config: formData.can_manage_company_config,
        can_manage_attendance_rules: formData.can_manage_attendance_rules,
        can_manage_leave_policies: formData.can_manage_leave_policies,
        can_view_reports: formData.can_view_reports,
        can_export_reports: formData.can_export_reports,
        notes: formData.notes,
      };

      await employeePermissionService.createEmployeePermission(permissionData);

      setSuccess('Tạo phân quyền thành công!');

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/dashboard/roles');
      }, 2000);
    } catch (err: any) {
      console.error('Failed to create permission:', err);
      setError(err.response?.data?.message || err.message || 'Lỗi khi tạo phân quyền');
    } finally {
      setLoading(false);
    }
  };

  const permissionGroups = [
    {
      title: 'Quyền phê duyệt',
      permissions: [
        { id: 'can_approve_attendance', label: 'Phê duyệt công', description: 'Có quyền phê duyệt chấm công của nhân viên' },
        { id: 'can_approve_leave', label: 'Phê duyệt nghỉ phép', description: 'Có quyền phê duyệt đơn xin nghỉ phép' },
        { id: 'can_approve_overtime', label: 'Phê duyệt làm thêm giờ', description: 'Có quyền phê duyệt đơn xin làm thêm giờ' },
      ],
    },
    {
      title: 'Quyền quản lý nhân sự',
      permissions: [
        { id: 'can_create_employee', label: 'Tạo nhân viên', description: 'Có quyền tạo tài khoản nhân viên mới' },
        { id: 'can_view_all_employees', label: 'Xem tất cả nhân viên', description: 'Có quyền xem thông tin tất cả nhân viên' },
        { id: 'can_manage_departments', label: 'Quản lý phòng ban', description: 'Có quyền thêm/sửa/xóa phòng ban' },
        { id: 'can_manage_positions', label: 'Quản lý vị trí', description: 'Có quyền thêm/sửa/xóa vị trí công việc' },
      ],
    },
    {
      title: 'Quyền quản lý chấm công',
      permissions: [
        { id: 'can_manage_attendance', label: 'Quản lý chấm công', description: 'Có quyền quản lý và điều chỉnh chấm công' },
      ],
    },
    {
      title: 'Quyền quản lý tài sản',
      permissions: [
        { id: 'can_manage_assets', label: 'Quản lý tài sản', description: 'Có quyền quản lý tài sản công ty' },
      ],
    },
    {
      title: 'Quyền cấu hình hệ thống',
      permissions: [
        { id: 'can_manage_company_config', label: 'Quản lý cấu hình công ty', description: 'Có quyền cấu hình thông tin công ty' },
        { id: 'can_manage_attendance_rules', label: 'Quản lý quy tắc chấm công', description: 'Có quyền quản lý quy tắc tính công' },
        { id: 'can_manage_leave_policies', label: 'Quản lý chính sách nghỉ phép', description: 'Có quyền quản lý chính sách nghỉ phép' },
      ],
    },
    {
      title: 'Quyền báo cáo',
      permissions: [
        { id: 'can_view_reports', label: 'Xem báo cáo', description: 'Có quyền xem các báo cáo thống kê' },
        { id: 'can_export_reports', label: 'Xuất báo cáo', description: 'Có quyền xuất báo cáo ra file' },
      ],
    },
  ];

  const getSelectedCount = () => {
    return Object.entries(formData).filter(([key, value]) => 
      key.startsWith('can_') && value === true
    ).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard/roles')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Quay lại
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Thêm phân quyền mới
              </h1>
              <p className="mt-2 text-gray-600">
                Phân quyền cho nhân viên: phê duyệt công, tạo nhân viên, quản lý chấm công, quản lý tài sản, v.v.
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Lỗi</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-green-800">
                  Thành công
                </h3>
                <p className="text-sm text-green-700 mt-1">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Chọn nhân viên
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nhân viên <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.employee_id ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.employee_id} - {employee.full_name} 
                        {employee.department && ` (${employee.department.name})`}
                      </option>
                    ))}
                  </select>
                  {errors.employee_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.employee_id}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Quyền hạn</h3>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSelectAllPermissions}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearAllPermissions}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
              </div>

              {errors.permissions && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{errors.permissions}</p>
                </div>
              )}

              <div className="space-y-6">
                {permissionGroups.map((group) => (
                  <div
                    key={group.title}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      {group.title}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {group.permissions.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex items-start p-2 hover:bg-gray-50 rounded-lg"
                        >
                          <input
                            type="checkbox"
                            name={permission.id}
                            checked={formData[permission.id as keyof typeof formData] as boolean}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
                          />
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {permission.label}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {permission.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm text-gray-600">
                Đã chọn {getSelectedCount()} trong tổng số 14 quyền
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Ghi chú
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú (tùy chọn)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập ghi chú về phân quyền này..."
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/roles')}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Đang xử lý...
                    </span>
                  ) : (
                    'Tạo phân quyền'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoleCreate;
