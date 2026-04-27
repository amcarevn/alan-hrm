import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sectionsAPI, departmentsAPI, Department } from '../utils/api';
import { SelectBox } from '../components/LandingLayout/SelectBox';

const SectionList: React.FC = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState<Department[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const fetchSections = async (search = '', departmentId = '') => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (departmentId) params.parent_department = Number(departmentId);

      const response = await sectionsAPI.list(params);
      setSections(response.results || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách bộ phận');
      console.error('Error fetching sections:', err);
    } finally {
      setLoading(false);
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
    fetchSections();
    fetchDepartments();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      fetchSections(searchTerm, departmentFilter);
    }, 300);
    setSearchTimeout(timeout);
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchTerm, departmentFilter]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bộ phận này?')) {
      try {
        await sectionsAPI.delete(id);
        fetchSections(searchTerm, departmentFilter);
      } catch (err: any) {
        alert('Xóa thất bại: ' + (err.message || 'Lỗi không xác định'));
      }
    }
  };

  const getParentName = (parentId?: number | null) => {
    if (!parentId) return '—';
    const parent = departments.find((d) => d.id === parentId);
    return parent ? parent.name : `ID: ${parentId}`;
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý bộ phận</h1>
        <p className="text-gray-600 mt-2">
          Quản lý các bộ phận trực thuộc phòng ban trong tổ chức.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* Search and Filter Section */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tìm kiếm bộ phận</h3>
            {loading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Đang tìm kiếm...
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tìm kiếm theo tên, mã bộ phận
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm shadow-sm"
                  placeholder="Nhập tên hoặc mã bộ phận..."
                />
                <p className="text-xs text-gray-500 mt-1">Tìm kiếm tự động khi bạn gõ</p>
              </div>
              <div>
                <SelectBox<string>
                  label="Phòng ban"
                  value={departmentFilter}
                  placeholder="Tất cả phòng ban"
                  searchable
                  options={[
                    { value: '', label: 'Tất cả phòng ban' },
                    ...departments.map((dept) => ({
                      value: String(dept.id),
                      label: dept.name,
                    })),
                  ]}
                  onChange={(val) => setDepartmentFilter(val)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Danh sách bộ phận</h2>
            <p className="text-gray-500 text-sm">Tổng số: {sections.length} bộ phận</p>
          </div>
          <button
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
            onClick={() => navigate('/dashboard/sections/create')}
          >
            + Thêm bộ phận
          </button>
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
              onClick={() => fetchSections()}
              className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : sections.length === 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã bộ phận</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên bộ phận</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phòng ban</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mô tả</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="text-lg font-medium text-gray-900">Chưa có bộ phận nào</p>
                      <p className="text-gray-500 mt-1">Bắt đầu bằng cách thêm bộ phận mới</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã bộ phận</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên bộ phận</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phòng ban</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mô tả</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sections.map((section) => (
                  <tr key={section.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{section.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{section.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getParentName(section.parent_department)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">{section.description || 'Không có mô tả'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => navigate(`/dashboard/sections/${section.id}/edit`)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Sửa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(section.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Xóa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
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

export default SectionList;
