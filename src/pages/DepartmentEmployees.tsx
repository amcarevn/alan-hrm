import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { departmentsAPI, employeesAPI, Employee, Department } from '../utils/api';
import { SelectBox } from '../components/LandingLayout/SelectBox';

const DepartmentEmployees: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const departmentId = id ? parseInt(id) : 0;
  
  const [department, setDepartment] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Add employee modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearchTerm, setAddSearchTerm] = useState('');
  const [addSearchResults, setAddSearchResults] = useState<Employee[]>([]);
  const [addSearchLoading, setAddSearchLoading] = useState(false);
  const [addSearchTimeout, setAddSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const addSearchRef = useRef<HTMLInputElement>(null);

  const fetchDepartment = async () => {
    try {
      if (departmentId) {
        const deptData = await departmentsAPI.getById(departmentId);
        setDepartment(deptData);
      }
    } catch (err: any) {
      console.error('Error fetching department:', err);
    }
  };

  const fetchEmployees = async (search = '', status = 'all') => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (status !== 'all') params.employment_status = status;
      
      if (departmentId) {
        const response = await departmentsAPI.employees(departmentId, params);
        setEmployees(response.results);
      } else {
        // Fallback to regular employee list if no department ID
        const response = await employeesAPI.list({ ...params, department: departmentId });
        setEmployees(response.results);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách nhân viên');
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (departmentId) {
      fetchDepartment();
      fetchEmployees();
    } else {
      setError('Không tìm thấy phòng ban');
      setLoading(false);
    }
  }, [departmentId]);

  // Effect for real-time search with debouncing
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      fetchEmployees(searchTerm, statusFilter);
    }, 300); // 300ms debounce delay

    setSearchTimeout(timeout);

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTerm, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmployees(searchTerm, statusFilter);
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    // Don't call fetchEmployees here, the useEffect will handle it
  };

  // Search employees for adding to department
  const searchEmployeesForAdd = async (search: string) => {
    if (!search.trim()) {
      setAddSearchResults([]);
      return;
    }
    try {
      setAddSearchLoading(true);
      const response = await employeesAPI.list({ search });
      setAddSearchResults(response.results || []);
    } catch (err: any) {
      console.error('Error searching employees:', err);
    } finally {
      setAddSearchLoading(false);
    }
  };

  useEffect(() => {
    if (addSearchTimeout) clearTimeout(addSearchTimeout);
    const timeout = setTimeout(() => {
      searchEmployeesForAdd(addSearchTerm);
    }, 300);
    setAddSearchTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [addSearchTerm]);

  useEffect(() => {
    if (showAddModal && addSearchRef.current) {
      addSearchRef.current.focus();
    }
    if (!showAddModal) {
      setAddSearchTerm('');
      setAddSearchResults([]);
    }
  }, [showAddModal]);

  const handleAssignEmployee = async (employee: Employee) => {
    try {
      setAssigningId(employee.id);
      await employeesAPI.partialUpdate(employee.id, { department_id: departmentId });
      setShowAddModal(false);
      fetchEmployees();
    } catch (err: any) {
      alert('Gán nhân viên thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Nhân viên phòng ban: {department?.name || 'Đang tải...'}
            </h1>
            <p className="text-gray-600 mt-2">
              {department?.code && `Mã phòng ban: ${department.code}`}
              {department?.description && ` • ${department.description}`}
            </p>
          </div>
          <button 
            className="text-gray-600 hover:text-gray-900"
            onClick={() => navigate('/dashboard/departments')}
          >
            ← Quay lại danh sách phòng ban
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* Search and Filter Section */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tìm kiếm nhân viên trong phòng ban</h3>
            {loading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Đang tìm kiếm...
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tìm kiếm theo mã, tên, số điện thoại
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập mã NV, tên hoặc số điện thoại..."
                />
                <p className="text-xs text-gray-500 mt-1">Tìm kiếm tự động khi bạn gõ</p>
              </div>
              <div>
                <SelectBox<string>
                  label="Trạng thái"
                  value={statusFilter}
                  options={[
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'ACTIVE', label: 'Đang làm việc' },
                    { value: 'PROBATION', label: 'Thử việc' },
                    { value: 'INACTIVE', label: 'Đã nghỉ' },
                  ]}
                  onChange={setStatusFilter}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Danh sách nhân viên</h2>
            <p className="text-gray-500 text-sm">Tổng số: {employees.length} nhân viên</p>
          </div>
          <div className="flex space-x-2">
            <button 
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
              onClick={() => setShowAddModal(true)}
            >
              + Thêm nhân viên vào phòng ban
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900">Đã xảy ra lỗi</p>
            <p className="text-gray-500 mt-1">{error}</p>
            <button 
              onClick={() => fetchEmployees()}
              className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : employees.length === 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã NV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Họ tên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vị trí
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-lg font-medium text-gray-900">Không có nhân viên nào trong phòng ban này</p>
                      <p className="text-gray-500 mt-1">Thêm nhân viên mới hoặc phân công nhân viên vào phòng ban</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã NV
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Họ tên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vị trí
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{employee.employee_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.position?.title || 'Chưa phân vị trí'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Thêm nhân viên vào phòng ban</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tìm kiếm nhân viên theo mã hoặc tên
              </label>
              <div className="relative">
                <input
                  ref={addSearchRef}
                  type="text"
                  value={addSearchTerm}
                  onChange={(e) => setAddSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  placeholder="Nhập mã NV hoặc họ tên..."
                />
                {addSearchLoading && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              <div className="mt-3 max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
                {addSearchTerm.trim() === '' ? (
                  <div className="px-4 py-6 text-center text-gray-500 text-sm">Nhập từ khóa để tìm kiếm nhân viên</div>
                ) : addSearchResults.length === 0 && !addSearchLoading ? (
                  <div className="px-4 py-6 text-center text-gray-500 text-sm">Không tìm thấy nhân viên</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {addSearchResults.map((emp) => (
                      <li key={emp.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{emp.full_name}</div>
                          <div className="text-xs text-gray-500">{emp.employee_id} {emp.position?.title ? `• ${emp.position.title}` : ''}</div>
                        </div>
                        <button
                          onClick={() => handleAssignEmployee(emp)}
                          disabled={assigningId === emp.id}
                          className="ml-4 px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors disabled:opacity-60"
                        >
                          {assigningId === emp.id ? 'Đang gán...' : 'Gán vào phòng ban'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex justify-end p-4 border-t">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentEmployees;
