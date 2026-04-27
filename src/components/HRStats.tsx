import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../utils/api';
import {
  UserGroupIcon,
  UserPlusIcon,
  UserMinusIcon,
  ClockIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface HRStatsData {
  employee_stats: {
    total: number;
    active: number;
    probation: number;
    inactive: number;
    new_last_30_days: number;
    recent_hires: number;
    gender_distribution: {
      male: number;
      female: number;
      other: number;
    };
  };
  department_stats: Array<{
    id: number;
    name: string;
    code: string;
    employee_count: number;
  }>;
  asset_stats: {
    total: number;
    in_use: number;
    idle: number;
    under_maintenance: number;
    total_value: number;
    current_assignments: number;
    upcoming_maintenance: number;
    type_distribution: Array<{
      type: string;
      display_name: string;
      count: number;
    }>;
  };
  recent_activities: {
    asset_assignments: number;
    asset_returns: number;
    maintenance: number;
  };
  trends: {
    employee_growth: number;
    asset_growth: number;
  };
}

const HRStats: React.FC = () => {
  const [stats, setStats] = useState<HRStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'overview' | 'employees' | 'assets'>('overview');

  useEffect(() => {
    fetchHRStats();
  }, []);

  const fetchHRStats = async () => {
    try {
      setLoading(true);
      const dashboardStats = await dashboardAPI.getHRMStats();
      setStats(dashboardStats);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching HR dashboard stats:', err);
      setError('Không thể tải thống kê dashboard. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const calculateEmployeeGrowthRate = () => {
    if (!stats) return 0;
    const { total, new_last_30_days } = stats.employee_stats;
    if (total === 0) return 0;
    return (new_last_30_days / total) * 100;
  };

  const calculateAssetUtilizationRate = () => {
    if (!stats) return 0;
    const { total, in_use } = stats.asset_stats;
    if (total === 0) return 0;
    return (in_use / total) * 100;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchHRStats}
            className="mt-2 text-sm text-primary-600 hover:text-primary-800"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const employeeGrowthRate = calculateEmployeeGrowthRate();
  const assetUtilizationRate = calculateAssetUtilizationRate();

  const DEPT_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
  ];
  const OTHER_COLOR = '#6b7280';

  const sortedDepts = [...stats.department_stats].sort((a, b) => b.employee_count - a.employee_count);
  const top8Depts = sortedDepts.slice(0, 8);
  const otherDepts = sortedDepts.slice(8);
  const othersCount = otherDepts.reduce((sum, d) => sum + d.employee_count, 0);
  const donutData = [
    ...top8Depts.map((d, i) => ({ name: d.name, value: d.employee_count, color: DEPT_COLORS[i] })),
    ...(othersCount > 0 ? [{ name: 'Khác', value: othersCount, color: OTHER_COLOR }] : []),
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Dashboard HRM</h3>
            <p className="text-sm text-gray-500">Tổng quan về nhân sự và tài sản</p>
          </div>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('overview')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                view === 'overview'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tổng quan
            </button>
            <button
              onClick={() => setView('employees')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                view === 'employees'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Nhân sự
            </button>
            <button
              onClick={() => setView('assets')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                view === 'assets'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tài sản
            </button>
          </div>
        </div>

        {/* Overview View */}
        {view === 'overview' && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <UserGroupIcon className="h-6 w-6 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Tổng nhân viên</p>
                    <p className="text-2xl font-bold text-blue-700">{stats.employee_stats.total}</p>
                    <div className="flex items-center text-xs text-blue-600 mt-1">
                      <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                      <span>+{stats.employee_stats.new_last_30_days} trong 30 ngày</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Nhân viên đang làm việc</p>
                    <p className="text-2xl font-bold text-green-700">{stats.employee_stats.active}</p>
                    <div className="text-xs text-green-600 mt-1">
                      {formatPercentage((stats.employee_stats.active / stats.employee_stats.total) * 100)} tổng số
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <BuildingOfficeIcon className="h-6 w-6 text-purple-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-purple-900">Tổng tài sản</p>
                    <p className="text-2xl font-bold text-purple-700">{stats.asset_stats.total}</p>
                    <div className="text-xs text-purple-600 mt-1">
                      {formatPercentage(assetUtilizationRate)} đang sử dụng
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-6 w-6 text-orange-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-orange-900">Tổng giá trị tài sản</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {formatCurrency(stats.asset_stats.total_value)}
                    </p>
                    <div className="text-xs text-orange-600 mt-1">
                      {stats.asset_stats.current_assignments} đang được gán
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Hoạt động gần đây (7 ngày)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <UserPlusIcon className="h-5 w-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Gán tài sản</p>
                      <p className="text-lg font-bold text-gray-900">{stats.recent_activities.asset_assignments}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <UserMinusIcon className="h-5 w-5 text-red-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Trả tài sản</p>
                      <p className="text-lg font-bold text-gray-900">{stats.recent_activities.asset_returns}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <WrenchScrewdriverIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Bảo trì</p>
                      <p className="text-lg font-bold text-gray-900">{stats.recent_activities.maintenance}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Distribution */}
            {stats.department_stats.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Phân bổ theo phòng ban</h4>
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  {/* Donut Chart */}
                  <div className="relative mx-auto lg:mx-0 w-[220px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          dataKey="value"
                          strokeWidth={2}
                          stroke="#fff"
                        >
                          {donutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            `${value} người (${((value / stats.employee_stats.active) * 100).toFixed(1)}%)`,
                            name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-gray-900">{stats.employee_stats.active}</span>
                      <span className="text-xs text-gray-500">đang làm việc</span>
                    </div>
                  </div>

                  {/* 2-column grid on xl */}
                  <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                      {sortedDepts.map((dept, index) => {
                        const color = index < 8 ? DEPT_COLORS[index] : OTHER_COLOR;
                        const pct = stats.employee_stats.active > 0
                          ? (dept.employee_count / stats.employee_stats.active) * 100
                          : 0;
                        return (
                          <div key={dept.id} className="flex items-center gap-2 py-0.5">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-sm text-gray-700 flex-1 truncate min-w-0">{dept.name}</span>
                            <span className="text-sm font-semibold text-gray-900 flex-shrink-0 w-8 text-right">{dept.employee_count}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0 w-11 text-right">{pct.toFixed(1)}%</span>
                            <div className="w-14 bg-gray-100 rounded-full h-1.5 flex-shrink-0">
                              <div className="h-1.5 rounded-full" style={{ width: `${Math.min(pct * 3, 100)}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trends */}
            <div className="pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Xu hướng</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                  <div className="flex items-center">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Tăng trưởng nhân sự (30 ngày)</p>
                      <p className="text-lg font-bold text-blue-700">
                        +{stats.trends.employee_growth} nhân viên
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Tỷ lệ tăng trưởng: {formatPercentage(employeeGrowthRate)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                  <div className="flex items-center">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Tăng trưởng tài sản (30 ngày)</p>
                      <p className="text-lg font-bold text-green-700">
                        +{stats.trends.asset_growth} tài sản
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Tổng giá trị: {formatCurrency(stats.asset_stats.total_value)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Employees View */}
        {view === 'employees' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <UserGroupIcon className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Tổng số nhân viên</p>
                    <p className="text-3xl font-bold text-blue-700">{stats.employee_stats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Đang làm việc</p>
                    <p className="text-3xl font-bold text-green-700">{stats.employee_stats.active}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {formatPercentage((stats.employee_stats.active / stats.employee_stats.total) * 100)} tổng số
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Đang thử việc</p>
                    <p className="text-3xl font-bold text-yellow-700">{stats.employee_stats.probation}</p>
                    <p className="text-xs text-yellow-600 mt-1">
                      {formatPercentage((stats.employee_stats.probation / stats.employee_stats.total) * 100)} tổng số
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <XCircleIcon className="h-8 w-8 text-red-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Đã nghỉ việc</p>
                    <p className="text-3xl font-bold text-red-700">{stats.employee_stats.inactive}</p>
                    <p className="text-xs text-red-600 mt-1">
                      {formatPercentage((stats.employee_stats.inactive / stats.employee_stats.total) * 100)} tổng số
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <UserPlusIcon className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-purple-900">Tuyển mới (30 ngày)</p>
                    <p className="text-3xl font-bold text-purple-700">{stats.employee_stats.new_last_30_days}</p>
                    <p className="text-xs text-purple-600 mt-1">
                      Tỷ lệ tăng trưởng: {formatPercentage(employeeGrowthRate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <ChartBarIcon className="h-8 w-8 text-indigo-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-indigo-900">Phân bổ giới tính</p>
                    <div className="flex space-x-4 mt-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{stats.employee_stats.gender_distribution.male}</div>
                        <div className="text-xs text-gray-600">Nam</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-pink-600">{stats.employee_stats.gender_distribution.female}</div>
                        <div className="text-xs text-gray-600">Nữ</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-600">{stats.employee_stats.gender_distribution.other}</div>
                        <div className="text-xs text-gray-600">Khác</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Stats */}
            {stats.department_stats.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Phân bổ theo phòng ban</h4>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-2">
                  {sortedDepts.map((dept, index) => {
                    const color = index < 8 ? DEPT_COLORS[index] : OTHER_COLOR;
                    const pct = stats.employee_stats.active > 0
                      ? (dept.employee_count / stats.employee_stats.active) * 100
                      : 0;
                    return (
                      <div key={dept.id} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-sm font-medium text-gray-700 truncate">
                              {dept.name}
                              <span className="text-xs text-gray-400 ml-1">({dept.code})</span>
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <span className="text-sm font-bold text-gray-900">{dept.employee_count}</span>
                              <span className="text-xs text-gray-400 w-10 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Assets View */}
        {view === 'assets' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <BuildingOfficeIcon className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-purple-900">Tổng tài sản</p>
                    <p className="text-3xl font-bold text-purple-700">{stats.asset_stats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Đang sử dụng</p>
                    <p className="text-3xl font-bold text-green-700">{stats.asset_stats.in_use}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {formatPercentage(assetUtilizationRate)} tổng số
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Đang rảnh</p>
                    <p className="text-3xl font-bold text-yellow-700">{stats.asset_stats.idle}</p>
                    <p className="text-xs text-yellow-600 mt-1">
                      {formatPercentage((stats.asset_stats.idle / stats.asset_stats.total) * 100)} tổng số
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <WrenchScrewdriverIcon className="h-8 w-8 text-red-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Đang bảo trì</p>
                    <p className="text-3xl font-bold text-red-700">{stats.asset_stats.under_maintenance}</p>
                    <p className="text-xs text-red-600 mt-1">
                      {formatPercentage((stats.asset_stats.under_maintenance / stats.asset_stats.total) * 100)} tổng số
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-8 w-8 text-orange-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-orange-900">Tổng giá trị</p>
                    <p className="text-3xl font-bold text-orange-700">
                      {formatCurrency(stats.asset_stats.total_value)}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Trung bình: {formatCurrency(stats.asset_stats.total_value / stats.asset_stats.total)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <UserGroupIcon className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Đang được gán</p>
                    <p className="text-3xl font-bold text-blue-700">{stats.asset_stats.current_assignments}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {stats.asset_stats.upcoming_maintenance} cần bảo trì sắp tới
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Asset Type Distribution */}
            {stats.asset_stats.type_distribution.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Phân loại tài sản</h4>
                <div className="space-y-3">
                  {stats.asset_stats.type_distribution.map((type) => (
                    <div key={type.type} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-700">{type.display_name}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm font-bold text-gray-900 mr-2">{type.count}</span>
                          <span className="text-xs text-gray-500">
                            {formatPercentage((type.count / stats.asset_stats.total) * 100)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activities */}
            <div className="pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Hoạt động gần đây (7 ngày)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <UserPlusIcon className="h-5 w-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Gán tài sản</p>
                      <p className="text-lg font-bold text-gray-900">{stats.recent_activities.asset_assignments}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <UserMinusIcon className="h-5 w-5 text-red-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Trả tài sản</p>
                      <p className="text-lg font-bold text-gray-900">{stats.recent_activities.asset_returns}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <WrenchScrewdriverIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Bảo trì</p>
                      <p className="text-lg font-bold text-gray-900">{stats.recent_activities.maintenance}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HRStats;
