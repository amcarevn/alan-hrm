import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { positionsAPI, employeesAPI, Employee, Position } from '../utils/api';

const PositionEmployees: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const positionId = id ? parseInt(id) : 0;

  const [position, setPosition] = useState<Position | null>(null);
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

  const fetchPosition = async () => {
    try {
      if (positionId) {
        const data = await positionsAPI.getById(positionId);
        setPosition(data);
      }
    } catch (err: any) {
      console.error('Error fetching position:', err);
    }
  };

  const fetchEmployees = async (search = '', status = 'all') => {
    try {
      setLoading(true);
      const params: any = { position: positionId, page_size: 1000 };
      if (search) params.search = search;
      if (status !== 'all') params.employment_status = status;

      const response = await employeesAPI.list(params);
      setEmployees(response.results || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách nhân viên');
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (positionId) {
      fetchPosition();
      fetchEmployees();
    } else {
      setError('Không tìm thấy vị trí');
      setLoading(false);
    }
  }, [positionId]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      fetchEmployees(searchTerm, statusFilter);
    }, 300);
    setSearchTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [searchTerm, statusFilter]);

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  // Search employees for adding to position
  const searchEmployeesForAdd = async (search: string) => {
    if (!search.trim()) { setAddSearchResults([]); return; }
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
    const timeout = setTimeout(() => searchEmployeesForAdd(addSearchTerm), 300);
    setAddSearchTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [addSearchTerm]);

  useEffect(() => {
    if (showAddModal && addSearchRef.current) addSearchRef.current.focus();
    if (!showAddModal) { setAddSearchTerm(''); setAddSearchResults([]); }
  }, [showAddModal]);

  const handleAssignEmployee = async (employee: Employee) => {
    try {
      setAssigningId(employee.id);
      await employeesAPI.partialUpdate(employee.id, { position_id: positionId });
      setShowAddModal(false);
      fetchEmployees();
    } catch (err: any) {
      alert('Gán nhân viên thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setAssigningId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      ACTIVE: { label: 'Đang làm việc', color: 'bg-green-100 text-green-700' },
      SUSPENDED: { label: 'Tạm dừng', color: 'bg-yellow-100 text-yellow-700' },
      INACTIVE: { label: 'Đã nghỉ', color: 'bg-red-100 text-red-700' },
      PROBATION: { label: 'Thử việc', color: 'bg-yellow-100 text-yellow-700' },
    };
    const cfg = map[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Nhân viên vị trí: {position?.title || 'Đang tải...'}
            </h1>
            <p className="text-gray-600 mt-1">
              {position?.code && `Mã vị trí: ${position.code}`}
              {position?.department && position.department.length > 0 && ` • Phòng ban: ${position.department.map((dept) => dept.name).join(', ')}`}
            </p>
          </div>
          <button
            className="text-gray-600 hover:text-gray-900 transition-colors"
            onClick={() => navigate('/dashboard/positions')}
          >
            ← Quay lại danh sách vị trí
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* Search & Filter */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tìm kiếm nhân viên trong vị trí</h3>
            {loading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
                Đang tìm kiếm...
              </div>
            )}
          </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang làm việc</option>
                <option value="PROBATION">Thử việc</option>
                <option value="INACTIVE">Đã nghỉ</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Danh sách nhân viên</h2>
            <p className="text-gray-500 text-sm">Tổng số: {employees.length} nhân viên</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
          >
            + Thêm nhân viên vào vị trí
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-lg font-medium text-gray-900 text-red-600">Đã xảy ra lỗi</p>
            <p className="text-gray-500 mt-1">{error}</p>
            <button onClick={() => fetchEmployees()} className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
              Thử lại
            </button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Mã NV', 'Họ tên', 'Phòng ban', 'Trạng thái', 'Ngày bắt đầu', 'Thao tác'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <p className="text-lg font-medium text-gray-900">Không có nhân viên nào ở vị trí này</p>
                      <p className="text-gray-500 mt-1">Thêm nhân viên bằng nút bên trên</p>
                    </td>
                  </tr>
                ) : (
                  employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {emp.employee_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{emp.full_name}</div>
                        {emp.personal_email && (
                          <div className="text-xs text-gray-400">{emp.personal_email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp.department?.name || 'Chưa phân phòng ban'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(emp.employment_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp.start_date
                          ? new Date(emp.start_date).toLocaleDateString('vi-VN')
                          : 'Chưa có'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/dashboard/employees/${emp.id}`)}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-100 text-sm"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Thêm nhân viên vào vị trí</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
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
                    {addSearchResults.map(emp => (
                      <li key={emp.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{emp.full_name}</div>
                          <div className="text-xs text-gray-500">
                            {emp.employee_id}
                            {emp.position?.title ? ` • Vị trí hiện tại: ${emp.position.title}` : ''}
                            {emp.department?.name ? ` • ${emp.department.name}` : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAssignEmployee(emp)}
                          disabled={assigningId === emp.id}
                          className="ml-4 px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 disabled:opacity-60"
                        >
                          {assigningId === emp.id ? 'Đang gán...' : 'Gán vào vị trí'}
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

export default PositionEmployees;