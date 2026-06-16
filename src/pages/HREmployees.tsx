import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesAPI, departmentsAPI, Employee } from '../utils/api';
import { SelectBox } from '../components/LandingLayout/SelectBox';

const HREmployees: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    maternity_leave: 0,
    inactive: 0,
    male: 0,
    female: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const fetchHREmployees = async (search = '', status = 'all', department = 'all') => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (status !== 'all') params.employment_status = status;
      if (department !== 'all') params.department = department;

      const response = await employeesAPI.hr_employees(params);
      setEmployees(response.results || response);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách nhân viên nhân sự');
      console.error('Error fetching HR employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData: any = await employeesAPI.stats();
      setStats({
        total: statsData.total,
        active: statsData.active,
        paused: statsData.paused ?? 0,
        maternity_leave: statsData.maternity_leave ?? 0,
        inactive: statsData.inactive,
        male: statsData.gender_stats?.male ?? 0,
        female: statsData.gender_stats?.female ?? 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.list();
      setDepartments(response.results || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  useEffect(() => {
    fetchHREmployees();
    fetchStats();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      fetchHREmployees(searchTerm, statusFilter, departmentFilter);
    }, 300);
    setSearchTimeout(timeout);
    return () => { if (searchTimeout) clearTimeout(searchTimeout); };
  }, [searchTerm, statusFilter, departmentFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHREmployees(searchTerm, statusFilter, departmentFilter);
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDepartmentFilter('all');
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
      try {
        await employeesAPI.delete(id);
        fetchHREmployees(searchTerm, statusFilter, departmentFilter);
        fetchStats();
      } catch (err: any) {
        alert('Xóa thất bại: ' + (err.message || 'Lỗi không xác định'));
      }
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await employeesAPI.activate(id);
      fetchHREmployees(searchTerm, statusFilter, departmentFilter);
      fetchStats();
    } catch (err: any) {
      alert('Kích hoạt thất bại: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await employeesAPI.deactivate(id);
      fetchHREmployees(searchTerm, statusFilter, departmentFilter);
      fetchStats();
    } catch (err: any) {
      alert('Vô hiệu hóa thất bại: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Đang làm việc</span>;
      case 'PAUSED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Tạm dừng</span>;
      case 'MATERNITY_LEAVE':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-pink-100 text-pink-800">Nghỉ thai sản</span>;
      case 'INACTIVE':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Đã nghỉ</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getGenderText = (gender: string) => {
    switch (gender) {
      case 'M': return 'Nam';
      case 'F': return 'Nữ';
      default: return gender;
    }
  };

  const STATUS_OPTIONS = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'ACTIVE', label: 'Đang làm việc' },
    { value: 'PAUSED', label: 'Tạm dừng' },
    { value: 'MATERNITY_LEAVE', label: 'Nghỉ thai sản' },
    { value: 'INACTIVE', label: 'Đã nghỉ' },
  ];

  const departmentOptions = [
    { value: 'all', label: 'Tất cả phòng ban' },
    ...departments.map(d => ({ value: String(d.id), label: d.name })),
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý nhân viên nhân sự</h1>
        <p className="text-gray-600 mt-2">Quản lý thông tin nhân viên thuộc bộ phận nhân sự (HR).</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {/* Statistics Section */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Thống kê nhân viên nhân sự</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-primary-500 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Tổng số</p>
              <p className="text-2xl font-extrabold text-primary-600 mt-1">{stats.total}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-emerald-500 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Đang làm việc</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.active}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-yellow-500 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Tạm dừng</p>
              <p className="text-2xl font-extrabold text-yellow-600 mt-1">{stats.paused}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-pink-500 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Nghỉ thai sản</p>
              <p className="text-2xl font-extrabold text-pink-600 mt-1">{stats.maternity_leave}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-red-500 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Đã nghỉ</p>
              <p className="text-2xl font-extrabold text-red-600 mt-1">{stats.inactive}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-primary-300 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Nam</p>
              <p className="text-2xl font-extrabold text-primary-500 mt-1">{stats.male}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-pink-400 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Nữ</p>
              <p className="text-2xl font-extrabold text-pink-500 mt-1">{stats.female}</p>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Tìm kiếm nhân viên nhân sự</h3>
            {loading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                Đang tìm kiếm...
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tìm kiếm theo mã, tên, số điện thoại
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                placeholder="Nhập mã NV, tên hoặc số điện thoại..."
              />
            </div>
            <SelectBox
              label="Trạng thái"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={(val) => setStatusFilter(val)}
            />
            <SelectBox
              label="Phòng ban"
              value={departmentFilter}
              options={departmentOptions}
              onChange={(val) => setDepartmentFilter(val)}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Danh sách nhân viên nhân sự</h2>
            <p className="text-gray-500 text-xs mt-0.5">Tổng số: {employees.length} nhân viên</p>
          </div>
          <button
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 transition-colors"
            onClick={() => navigate('/dashboard/employees/create')}
          >
            + Thêm nhân viên
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-lg font-medium text-gray-900">Đã xảy ra lỗi</p>
            <p className="text-gray-500 mt-1">{error}</p>
            <button
              onClick={() => fetchHREmployees()}
              className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Mã NV', 'Họ tên', 'Giới tính', 'Phòng ban', 'Chức vụ', 'Trạng thái', 'Thao tác'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Chưa có nhân viên nhân sự nào
                    </td>
                  </tr>
                ) : employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{employee.employee_id}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                      <div className="text-xs text-gray-500">{employee.phone_number || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{getGenderText(employee.gender)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{employee.department?.name || 'Chưa phân phòng'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{employee.position?.title || 'Chưa phân chức vụ'}</td>
                    <td className="px-4 py-3">{getStatusBadge(employee.employment_status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/dashboard/employees/${employee.id}`)} className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50">Xem</button>
                        <button onClick={() => navigate(`/dashboard/employees/${employee.id}/edit`)} className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50">Sửa</button>
                        {employee.is_active ? (
                          <button onClick={() => handleDeactivate(employee.id)} className="text-xs px-2 py-1 rounded border border-yellow-200 text-yellow-600 hover:bg-yellow-50">Vô hiệu hóa</button>
                        ) : (
                          <button onClick={() => handleActivate(employee.id)} className="text-xs px-2 py-1 rounded border border-emerald-200 text-emerald-600 hover:bg-emerald-50">Kích hoạt</button>
                        )}
                        <button onClick={() => handleDelete(employee.id)} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HREmployees;
