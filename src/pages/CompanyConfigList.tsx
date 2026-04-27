import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { companyConfigAPI, CompanyConfig } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { SelectBox } from '../components/LandingLayout/SelectBox';

const CompanyConfigList: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Xác định tab hiện tại từ URL
  const getCurrentTab = () => {
    if (location.pathname.includes('/dashboard/attendance-rules')) return 'attendance-rules';
    if (location.pathname.includes('/dashboard/leave-policies')) return 'leave-policies';
    return 'company-configs';
  };
  
  const [currentTab, setCurrentTab] = useState(getCurrentTab());
  const [configs, setConfigs] = useState<CompanyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('all');
  const [isCurrentFilter, setIsCurrentFilter] = useState<string>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<CompanyConfig | null>(null);

  const loadConfigs = async (page = 1) => {
    try {
      setLoading(true);
      const params: any = {
        page,
        page_size: 50,
        ordering: '-effective_from',
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (isActiveFilter !== 'all') {
        params.is_active = isActiveFilter === 'active';
      }

      if (isCurrentFilter !== 'all') {
        params.is_current = isCurrentFilter;
      }

      const response = await companyConfigAPI.listCompanyConfigs(params);
      setConfigs(response.results);
      setTotalPages(Math.ceil(response.count / 20));
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading company configs:', error);
      alert('Không thể tải danh sách cấu hình công ty');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentTab(getCurrentTab());
  }, [location.pathname]);

  useEffect(() => {
    if (currentTab === 'company-configs') {
      loadConfigs();
    }
  }, [searchTerm, isActiveFilter, isCurrentFilter, currentTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadConfigs(1);
  };

  const handleDeleteClick = (config: CompanyConfig) => {
    setConfigToDelete(config);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!configToDelete) return;

    try {
      await companyConfigAPI.deleteCompanyConfig(configToDelete.id);
      alert('Đã xóa cấu hình công ty thành công');
      loadConfigs(currentPage);
    } catch (error) {
      console.error('Error deleting company config:', error);
      alert('Không thể xóa cấu hình công ty');
    } finally {
      setShowDeleteModal(false);
      setConfigToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (config: CompanyConfig) => {
    if (!config.is_active) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <XCircleIcon className="w-3 h-3 mr-1" />
          Không hoạt động
        </span>
      );
    }

    if (config.is_current) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          Đang áp dụng
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <ClockIcon className="w-3 h-3 mr-1" />
        Chưa áp dụng
      </span>
    );
  };

  const getEffectiveDateRange = (config: CompanyConfig) => {
    const from = formatDate(config.effective_from);
    const to = config.effective_to ? formatDate(config.effective_to) : 'Không giới hạn';
    return `${from} - ${to}`;
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (tab === 'attendance-rules') {
      navigate('/dashboard/attendance-rules');
    } else if (tab === 'leave-policies') {
      navigate('/dashboard/leave-policies');
    } else {
      navigate('/dashboard/company-configs');
    }
  };

  const renderTabContent = () => {
    if (currentTab === 'attendance-rules') {
      return (
        <div className="text-center py-12">
          <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Quản lý quy tắc chấm công</h3>
          <p className="mt-1 text-sm text-gray-500">
            Chuyển đến trang quản lý quy tắc chấm công để xem và quản lý các quy tắc.
          </p>
          <div className="mt-6">
            <Link
              to="/dashboard/attendance-rules"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              Xem quy tắc chấm công
            </Link>
          </div>
        </div>
      );
    }

    if (currentTab === 'leave-policies') {
      return (
        <div className="text-center py-12">
          <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Quản lý chính sách nghỉ phép</h3>
          <p className="mt-1 text-sm text-gray-500">
            Chuyển đến trang quản lý chính sách nghỉ phép để xem và quản lý các chính sách.
          </p>
          <div className="mt-6">
            <Link
              to="/dashboard/leave-policies"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              Xem chính sách nghỉ phép
            </Link>
          </div>
        </div>
      );
    }

    // Tab company-configs
    return (
      <>
        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                  Tìm kiếm
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-10 py-2 sm:text-sm border-gray-300 rounded-md"
                    placeholder="Tìm theo tên, mã, mô tả..."
                  />
                </div>
              </div>

              {/* Active Status */}
              <div>
                <SelectBox<string>
                  label="Trạng thái"
                  value={isActiveFilter}
                  options={[
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'active', label: 'Đang hoạt động' },
                    { value: 'inactive', label: 'Không hoạt động' },
                  ]}
                  onChange={setIsActiveFilter}
                />
              </div>

              {/* Current Status */}
              <div>
                <SelectBox<string>
                  label="Áp dụng hiện tại"
                  value={isCurrentFilter}
                  options={[
                    { value: 'all', label: 'Tất cả' },
                    { value: 'true', label: 'Đang áp dụng' },
                    { value: 'false', label: 'Không áp dụng' },
                  ]}
                  onChange={setIsCurrentFilter}
                />
              </div>

              {/* Search Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Tìm kiếm
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <InformationCircleIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Tổng cấu hình</dt>
                    <dd className="text-lg font-medium text-gray-900">{configs.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Đang hoạt động</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {configs.filter(c => c.is_active).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Đang áp dụng</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {configs.filter(c => c.is_current).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Giờ làm/ngày</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {configs[0]?.default_working_hours_per_day || 0}h
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configs Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500">Đang tải dữ liệu...</p>
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-12">
              <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Không có cấu hình nào</h3>
              <p className="mt-1 text-sm text-gray-500">
                Bắt đầu bằng cách tạo một cấu hình công ty mới.
              </p>
              <div className="mt-6">
                <Link
                  to="/dashboard/company-configs/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Thêm cấu hình mới
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên cấu hình
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thời gian áp dụng
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Giờ làm việc
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {configs.map((config) => (
                    <tr key={config.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{config.name}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {config.description || 'Không có mô tả'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">{config.code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1 text-gray-400" />
                            {getEffectiveDateRange(config)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <ClockIcon className="w-4 h-4 mr-1 text-gray-400" />
                            {config.default_working_hours_per_day}h/ngày
                          </div>
                          <div className="text-xs text-gray-500">
                            {config.default_working_days_per_week} ngày/tuần
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(config)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(config.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            to={`/dashboard/company-configs/${config.id}/edit`}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Xem/Chỉnh sửa"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/dashboard/company-configs/${config.id}/edit`}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Chỉnh sửa"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(config)}
                            className="text-red-600 hover:text-red-900"
                            title="Xóa"
                            disabled={config.is_current}
                          >
                            <TrashIcon className={`w-4 h-4 ${config.is_current ? 'opacity-50 cursor-not-allowed' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => loadConfigs(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trang trước
                </button>
                <button
                  onClick={() => loadConfigs(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trang sau
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Hiển thị <span className="font-medium">{(currentPage - 1) * 20 + 1}</span> đến{' '}
                    <span className="font-medium">{Math.min(currentPage * 20, configs.length + (currentPage - 1) * 20)}</span> trong{' '}
                    <span className="font-medium">{configs.length + (currentPage - 1) * 20}</span> kết quả
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => loadConfigs(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Trang trước</span>
                      &larr;
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => loadConfigs(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => loadConfigs(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Trang sau</span>
                      &rarr;
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cấu hình công ty</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý cấu hình giờ làm việc, ngày nghỉ lễ và các chính sách công ty
          </p>
        </div>
        <div className="flex space-x-3">
          {/* Tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleTabChange('company-configs')}
              className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                currentTab === 'company-configs'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cấu hình công ty
            </button>
            <button
              onClick={() => handleTabChange('attendance-rules')}
              className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                currentTab === 'attendance-rules'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Quy tắc chấm công
            </button>
            <button
              onClick={() => handleTabChange('leave-policies')}
              className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                currentTab === 'leave-policies'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Chính sách nghỉ phép
            </button>
          </div>
          
          {currentTab === 'company-configs' && (
            <Link
              to="/dashboard/company-configs/create"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Thêm cấu hình mới
            </Link>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && configToDelete && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Xóa cấu hình công ty</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Bạn có chắc chắn muốn xóa cấu hình "{configToDelete.name}" ({configToDelete.code})?
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan đến cấu hình này sẽ bị xóa vĩnh viễn.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfigToDelete(null);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyConfigList;
