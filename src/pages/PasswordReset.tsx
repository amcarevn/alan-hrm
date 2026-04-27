// pages/PasswordReset.tsx

import { useState, useEffect } from 'react';
import { employeesAPI, departmentsAPI, managementApi } from '../utils/api';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { SelectBox } from '../components/LandingLayout/SelectBox';

interface Employee {
  id: number;
  employee_id: string;
  full_name: string;
  personal_email?: string;
  department?: {
    id: number;
    name: string;
    code: string;
  };
}

interface FilterParams {
  employee_id: string;
  full_name: string;
  department: string;
}

export default function PasswordReset() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [filters, setFilters] = useState<FilterParams>({
    employee_id: '',
    full_name: '',
    department: '',
  });
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch employees on component mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Fetch employees whenever page, itemsPerPage, or employee_id filter change
  useEffect(() => {
    fetchEmployees();
  }, [currentPage, itemsPerPage, filters.employee_id]);

  // Client-side filter for full_name and department on current page
  useEffect(() => {
    let filtered = employees;

    if (filters.full_name) {
      filtered = filtered.filter(emp =>
        emp.full_name?.toLowerCase().includes(filters.full_name.toLowerCase())
      );
    }

    if (filters.department) {
      filtered = filtered.filter(emp =>
        emp.department?.code === filters.department
      );
    }

    setFilteredEmployees(filtered);
    setSelectedEmployee(null);
  }, [employees, filters.full_name, filters.department]);

  // ========================================
  // FIX: Sửa lại fetchEmployees function
  // ========================================
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      console.log('🔄 Fetching employees...', { page: currentPage, page_size: itemsPerPage });
      
      // ✅ ĐÚNG: Sử dụng employeesAPI từ utils/api.ts với endpoint /api-hrm/employees/ và phân trang
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage,
      };
      
      // Thêm search parameters nếu có filter
      if (filters.employee_id) {
        params.search = filters.employee_id;
      }
      
      const response = await employeesAPI.list(params);
      
      console.log('📊 Response data:', response);
      console.log('✅ Employees loaded:', response.results);
      setEmployees(response.results);
      setTotalCount(response.count);
      setFilteredEmployees(response.results);
      
    } catch (error: any) {
      console.error('❌ Error fetching employees:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      setMessage({ 
        type: 'error', 
        text: `Không thể tải danh sách nhân viên: ${error.response?.data?.detail || error.message}` 
      });
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // FIX: Sửa lại fetchDepartments function
  // ========================================
  const fetchDepartments = async () => {
    try {
      console.log('🔄 Fetching departments...');
      
      // ✅ ĐÚNG: Sử dụng departmentsAPI từ utils/api.ts
      const response = await departmentsAPI.list({
        page_size: 1000
      });
      
      console.log('📊 Departments response:', response);
      console.log('✅ Departments loaded:', response.results);
      setDepartments(response.results);
      
    } catch (error: any) {
      console.error('❌ Error fetching departments:', error);
      setDepartments([]);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
    // Reset to first page only when employee_id (server-side filter) changes
    if (name === 'employee_id') {
      setCurrentPage(1);
    }
  };

  const handleResetPassword = async () => {
    if (!confirmTarget) return;

    try {
      setResetting(true);
      setMessage(null);

      console.log('🔄 Resetting password for employee:', confirmTarget.id);

      // ✅ ĐÚNG: POST /api-hrm/employees/{id}/reset-password/ (action của EmployeeViewSet)
      const response = await managementApi.post(
        `/api-hrm/employees/${confirmTarget.id}/reset-password/`,
        {}
      );

      console.log('✅ Reset password response:', response.data);

      setMessage({
        type: 'success',
        text: `✅ Đã reset mật khẩu thành công cho ${confirmTarget.full_name}. Hệ thống đã gửi email thông tin tài khoản mới.`,
      });

      setCurrentPage(1);
      setSelectedEmployee(null);
      setConfirmTarget(null);

    } catch (error: any) {
      console.error('❌ Error resetting password:', error);
      console.error('Error response:', error.response?.data);

      const errorMsg = error.response?.data?.error || error.response?.data?.detail || error.message || 'Lỗi khi reset mật khẩu';
      setMessage({
        type: 'error',
        text: `❌ ${errorMsg}`,
      });
      setConfirmTarget(null);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reset Mật Khẩu Nhân Viên</h1>
        <p className="mt-2 text-gray-600">
          Sử dụng công cụ này để reset mật khẩu cho nhân viên quên mật khẩu. Hệ thống sẽ gửi email tài khoản mới đến nhân viên.
        </p>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <p
            className={`text-sm font-medium ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Main card */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Filter section */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tìm kiếm nhân viên</h3>
            {loading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Đang tìm kiếm...
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã nhân viên
                </label>
                <input
                  type="text"
                  name="employee_id"
                  value={filters.employee_id}
                  onChange={handleFilterChange}
                  placeholder="VD: TA00001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ tên
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={filters.full_name}
                  onChange={handleFilterChange}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <SelectBox<string>
                  label="Phòng ban"
                  value={filters.department}
                  options={[
                    { value: '', label: '-- Tất cả phòng ban --' },
                    ...departments.map(dept => ({ value: dept.code, label: dept.name })),
                  ]}
                  onChange={(v) => setFilters(prev => ({ ...prev, department: v }))}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setFilters({ employee_id: '', full_name: '', department: '' });
                  setCurrentPage(1);
                  setSelectedEmployee(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>

        {/* List header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Danh sách nhân viên</h2>
            <p className="text-gray-500 text-sm">Tổng số: {totalCount} nhân viên</p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Đang tải danh sách nhân viên...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NV</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ tên</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phòng ban</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="text-lg font-medium text-gray-900">Không tìm thấy nhân viên</p>
                      <p className="text-gray-500 mt-1">Thay đổi bộ lọc để tìm kiếm</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NV</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ tên</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phòng ban</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map(employee => (
                  <tr
                    key={employee.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      selectedEmployee?.id === employee.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {employee.employee_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {employee.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {employee.personal_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {employee.department?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setConfirmTarget(employee)}
                        disabled={resetting}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          resetting
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                      >
                        {resetting ? 'Đang xử lý...' : 'Reset'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredEmployees.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalCount / itemsPerPage)}
              totalItems={totalCount}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              showItemsPerPage={true}
            />
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Thông tin cần biết</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Mật khẩu mới sẽ được tạo ngẫu nhiên: <code className="bg-blue-100 px-2 py-1 rounded">amcare@XXXXX</code></li>
          <li>✓ Email thông tin tài khoản sẽ được gửi đến nhân viên</li>
          <li>✓ Nhân viên PHẢI đổi mật khẩu sau lần đăng nhập đầu tiên</li>
          <li>✓ Hệ thống sẽ ghi nhận lịch sử reset mật khẩu</li>
        </ul>
      </div>

      {/* Debug Info - Chỉ hiển thị khi có lỗi */}
      {employees.length === 0 && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Debug Info</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Không có dữ liệu nhân viên được tải</li>
            <li>• Vui lòng mở DevTools (F12) → Console để xem chi tiết lỗi</li>
            <li>• Kiểm tra API endpoint: /api-hrm/employees/</li>
            <li>• Kiểm tra authentication token</li>
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        variant="warning"
        title="Reset mật khẩu nhân viên"
        message={confirmTarget ? `Bạn có chắc muốn reset mật khẩu cho nhân viên ${confirmTarget.full_name}?` : ''}
        confirmLabel="Reset"
        loading={resetting}
        onConfirm={handleResetPassword}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}