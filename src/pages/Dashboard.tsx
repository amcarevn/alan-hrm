import { useEffect, useState } from 'react';
import {
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UserPlusIcon,
  UsersIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Label,
} from 'recharts';
import { dashboardAPI } from '@/utils/api';
import HRStats from '../components/HRStats';

interface HRMDashboardStats {
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

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const Dashboard = () => {
  const [stats, setStats] = useState<HRMDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await dashboardAPI.getHRMStats();
        setStats(response);
      } catch (err: any) {
        setError(err.message || 'Lỗi khi tải dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 text-lg font-medium">
          Error loading dashboard: {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-gray-600 text-lg">Không có dữ liệu</div>
      </div>
    );
  }

  // Employee overview stats
  const employeeStats = [
    {
      name: 'Tổng nhân viên',
      value: stats.employee_stats.total,
      subtext: `${stats.employee_stats.active} đang làm việc`,
      icon: UsersIcon,
      color: 'bg-blue-500',
      trend: stats.trends.employee_growth > 0 ? `+${stats.trends.employee_growth}` : `${stats.trends.employee_growth}`,
      trendUp: stats.trends.employee_growth > 0,
    },
    {
      name: 'Nhân viên thử việc',
      value: stats.employee_stats.probation,
      subtext: `${stats.employee_stats.new_last_30_days} mới trong 30 ngày`,
      icon: UserPlusIcon,
      color: 'bg-yellow-500',
      trend: '',
      trendUp: true,
    },
    {
      name: 'Tài sản đang sử dụng',
      value: stats.asset_stats.in_use,
      subtext: `${stats.asset_stats.total} tổng tài sản`,
      icon: ComputerDesktopIcon,
      color: 'bg-green-500',
      trend: stats.trends.asset_growth > 0 ? `+${stats.trends.asset_growth}` : `${stats.trends.asset_growth}`,
      trendUp: stats.trends.asset_growth > 0,
    },
    {
      name: 'Giá trị tài sản',
      value: `$${stats.asset_stats.total_value.toLocaleString('vi-VN')}`,
      subtext: `${stats.asset_stats.current_assignments} đang được gán`,
      icon: CurrencyDollarIcon,
      color: 'bg-purple-500',
      trend: '',
      trendUp: true,
    },
  ];

  // Department stats for chart
  const departmentChartData = stats.department_stats
    .sort((a, b) => b.employee_count - a.employee_count)
    .slice(0, 6)
    .map(dept => ({
      name: dept.name,
      employees: dept.employee_count,
    }));

  // Asset type distribution for chart
  const assetTypeChartData = stats.asset_stats.type_distribution
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map(type => ({
      name: type.display_name,
      count: type.count,
    }));

  // Gender distribution for pie chart
  const genderData = [
    { name: 'Nam', value: stats.employee_stats.gender_distribution.male, color: '#3b82f6' },
    { name: 'Nữ', value: stats.employee_stats.gender_distribution.female, color: '#ec4899' },
    { name: 'Khác', value: stats.employee_stats.gender_distribution.other, color: '#8b5cf6' },
  ];

  // Recent activities
  const activityData = [
    { name: 'Gán tài sản', value: stats.recent_activities.asset_assignments, color: '#10b981' },
    { name: 'Trả tài sản', value: stats.recent_activities.asset_returns, color: '#f59e0b' },
    { name: 'Bảo trì', value: stats.recent_activities.maintenance, color: '#3b82f6' },
  ];

  const totalActivities = activityData.reduce((sum, d) => sum + d.value, 0);

  // Asset status data
  const assetStatusData = [
    { name: 'Đang sử dụng', value: stats.asset_stats.in_use, color: '#10b981' },
    { name: 'Không sử dụng', value: stats.asset_stats.idle, color: '#6b7280' },
    { name: 'Đang bảo trì', value: stats.asset_stats.under_maintenance, color: '#f59e0b' },
  ];

  // Department summary donut data: top 5 + "Khác"
  const sortedDepts = [...stats.department_stats].sort((a, b) => b.employee_count - a.employee_count);
  const deptSummaryData = [
    ...sortedDepts.slice(0, 5).map(d => ({ name: d.name, value: d.employee_count })),
    ...(sortedDepts.length > 5
      ? [{ name: 'Khác', value: sortedDepts.slice(5).reduce((s, d) => s + d.employee_count, 0) }]
      : []),
  ];

  // Asset type details donut data
  const assetTypeDetailsData = stats.asset_stats.type_distribution.map(type => ({
    name: type.display_name,
    value: type.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard HRM</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tổng quan nhân sự và tài sản
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Cập nhật lần cuối: {new Date().toLocaleString('vi-VN')}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {employeeStats.map((item) => (
          <div key={item.name} className="card p-6 shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${item.color} rounded-md p-3`}>
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {item.value.toLocaleString('vi-VN')}
                    </dd>
                    <dd className="text-sm text-gray-500">{item.subtext}</dd>
                  </dl>
                </div>
              </div>
              {item.trend && (
                <div
                  className={`flex items-center text-sm ${item.trendUp ? 'text-green-600' : 'text-red-600'}`}
                >
                  {item.trendUp ? (
                    <ArrowUpIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 mr-1" />
                  )}
                  {item.trend}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* HR Stats Component */}
      <HRStats />

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Department Distribution */}
        <div className="card p-6 shadow-none">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Phân bố nhân sự theo phòng ban (Top 6)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentChartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                dataKey="employees"
                nameKey="name"
              >
                {departmentChartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value, 'Nhân viên']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Asset Type Distribution */}
        <div className="card p-6 shadow-none">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Phân bố loại tài sản (Top 6)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={assetTypeChartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                dataKey="count"
                nameKey="name"
              >
                {assetTypeChartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value, 'Tài sản']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gender Distribution */}
        <div className="card p-6 shadow-none">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Phân bố giới tính
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                dataKey="value"
                nameKey="name"
              >
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value, 'Người']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activities */}
        <div className="card p-6 shadow-none">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Hoạt động gần đây (7 ngày)
          </h3>
          {totalActivities === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
              Không có hoạt động trong 7 ngày qua
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={activityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  dataKey="value"
                  nameKey="name"
                >
                  {activityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      const { cx, cy } = viewBox as { cx: number; cy: number };
                      return (
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={cx} dy="-0.6em" fontSize="28" fontWeight="bold" fill="#111827">
                            {totalActivities}
                          </tspan>
                          <tspan x={cx} dy="1.6em" fontSize="12" fill="#6b7280">
                            Hoạt động
                          </tspan>
                        </text>
                      );
                    }}
                    position="center"
                  />
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Hoạt động']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Asset Status and Department Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Asset Status */}
        <div className="card p-6 shadow-none">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Trạng thái tài sản
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={assetStatusData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                dataKey="value"
                nameKey="name"
              >
                {assetStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    const { cx, cy } = viewBox as { cx: number; cy: number };
                    return (
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={cx} dy="-0.6em" fontSize="28" fontWeight="bold" fill="#111827">
                          {stats.asset_stats.total}
                        </tspan>
                        <tspan x={cx} dy="1.6em" fontSize="12" fill="#6b7280">
                          Tổng tài sản
                        </tspan>
                      </text>
                    );
                  }}
                  position="center"
                />
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value} (${((value / stats.asset_stats.total) * 100).toFixed(1)}%)`,
                  name,
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department Summary */}
        <div className="card p-6 shadow-none">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Tóm tắt phòng ban
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={deptSummaryData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                dataKey="value"
                nameKey="name"
              >
                {deptSummaryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    const { cx, cy } = viewBox as { cx: number; cy: number };
                    return (
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={cx} dy="-0.6em" fontSize="28" fontWeight="bold" fill="#111827">
                          {stats.employee_stats.active}
                        </tspan>
                        <tspan x={cx} dy="1.6em" fontSize="12" fill="#6b7280">
                          Đang làm việc
                        </tspan>
                      </text>
                    );
                  }}
                  position="center"
                />
              </Pie>
              <Tooltip formatter={(value: number) => [value, 'Nhân viên']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Asset Type Details */}
      <div className="card p-6 shadow-none">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Chi tiết loại tài sản
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={assetTypeDetailsData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              dataKey="value"
              nameKey="name"
            >
              {assetTypeDetailsData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
              <Label
                content={({ viewBox }) => {
                  const { cx, cy } = viewBox as { cx: number; cy: number };
                  return (
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={cx} dy="-0.6em" fontSize="28" fontWeight="bold" fill="#111827">
                        {stats.asset_stats.total}
                      </tspan>
                      <tspan x={cx} dy="1.6em" fontSize="12" fill="#6b7280">
                        Tổng TS
                      </tspan>
                    </text>
                  );
                }}
                position="center"
              />
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value} (${((value / stats.asset_stats.total) * 100).toFixed(1)}%)`,
                name,
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
