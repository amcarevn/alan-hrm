import React, { useEffect, useState } from 'react';
import { usePieAnimation } from '@/hooks/usePieAnimation';
import {
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UserPlusIcon,
  UsersIcon,
  ComputerDesktopIcon,

  WrenchScrewdriverIcon,
  ArchiveBoxIcon,
  Squares2X2Icon,
  UserGroupIcon,
  ChartPieIcon,
} from '@heroicons/react/24/outline';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Label,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { dashboardAPI } from '@/utils/api';
import HRStats from '../components/HRStats';
import { AnimatedNum } from '../components/AnimatedNum';
import { DonutCenter } from '../components/DonutCenter';
import { ProgressBar } from '../components/ProgressBar';

interface HRMDashboardStats {
  employee_stats: {
    total: number;
    active: number;
    probation: number;
    inactive: number;
    new_last_30_days: number;
    recent_hires: number;
    gender_distribution: { male: number; female: number; other: number };
  };
  department_stats: Array<{ id: number; name: string; code: string; employee_count: number }>;
  asset_stats: {
    total: number;
    in_use: number;
    idle: number;
    under_maintenance: number;
    total_value: number;
    current_assignments: number;
    upcoming_maintenance: number;
    type_distribution: Array<{ type: string; display_name: string; count: number }>;
  };
  recent_activities: { asset_assignments: number; asset_returns: number; maintenance: number };
  trends: { employee_growth: number; asset_growth: number };
}

interface WorkforceAnalytics {
  salary_reference_period: { year: number | null; month: number | null; label: string | null };
  summary: {
    total_employees: number;
    estimated_monthly_payroll: number;
    estimated_cost_from_year_start: number;
    estimated_cost_to_year_end: number;
    estimated_full_year_cost: number;
  };
  tenure_analysis: {
    average_tenure_years: number;
    distribution: Array<{ bucket: string; count: number }>;
  };
  charts: {
    cost_split: Array<{ name: string; value: number }>;
    monthly_projection: Array<{ month: string; estimated_cost: number }>;
  };
  department_analysis: Array<{
    department_name: string;
    employee_count: number;
    average_tenure_years: number;
    estimated_monthly_payroll: number;
  }>;
  employee_analysis: Array<{
    employee_id: string;
    full_name: string;
    tenure_years: number;
    estimated_monthly_salary: number;
  }>;
}

const CHART_COLORS = [
  '#1B65B8', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16',
];

const formatNumber = (n: number) =>
  n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const formatCurrency = (n: number) => `${formatNumber(n)} VNĐ`;

const formatDate = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

// Modern custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-gray-900/95 backdrop-blur rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-white/60 mb-0.5">{p.name}</p>
      <p className="text-white font-bold text-sm">{formatNumber(p.value ?? 0)}</p>
    </div>
  );
};

// Modern donut chart card with side legend
const DonutCard = ({
  title,
  sub,
  data,
  centerValue,
  centerLabel,
}: {
  title: string;
  sub?: string;
  data: { name: string; value: number; color: string }[];
  centerValue: string | number;
  centerLabel: string;
}) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const numericCenter = typeof centerValue === 'number' ? centerValue : 0;
  const { endAngle, startAngle, animationDuration } = usePieAnimation();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-primary-500 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-5">
        {/* Donut */}
        <div className="flex-shrink-0">
          <ResponsiveContainer width={160} height={160}>
            <PieChart key={numericCenter}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={76}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                strokeWidth={0}
                startAngle={startAngle}
                endAngle={endAngle}
                isAnimationActive={true}
                animationBegin={0}
                animationDuration={animationDuration}
                animationEasing="ease-out"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    const { cx, cy } = viewBox as any;
                    return <DonutCenter value={numericCenter} label={centerLabel} cx={cx} cy={cy} />;
                  }}
                  position="center"
                />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2.5 min-w-0">
          {data.filter(d => d.value > 0).map((item) => {
            const pct = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] text-gray-600 truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-[11px] font-bold text-gray-900 tabular-nums">
                      <AnimatedNum value={item.value} />
                    </span>
                    <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <ProgressBar pct={pct} color={item.color} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  name,
  rawValue,
  formatter,
  subtext,
  icon: Icon,
  iconBg,
  trend,
}: {
  name: string;
  rawValue: number;
  formatter: (v: number) => string;
  subtext: string;
  icon: React.ElementType;
  iconBg: string;
  trend: number | null;
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-primary-500 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`h-9 w-9 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== null && trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
            trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}>
            {trend >= 0 ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
            {Math.abs(trend)}
          </span>
        )}
      </div>
      <p className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">{name}</p>
      <p className="text-2xl font-extrabold text-gray-900 tracking-tight mt-0.5 truncate">
        {formatter(rawValue)}
      </p>
      <p className="text-xs text-gray-600 mt-1">{subtext}</p>
    </div>
  );
};

type TabKey = 'overview' | 'employee' | 'asset';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Tổng quan', icon: Squares2X2Icon },
  { key: 'employee', label: 'Nhân viên', icon: UserGroupIcon },
  { key: 'asset', label: 'Tài sản', icon: ChartPieIcon },
];

const Dashboard = () => {
  const [stats, setStats] = useState<HRMDashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<WorkforceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [employeeCodeInput, setEmployeeCodeInput] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | ''>('');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const fetchWorkforceAnalytics = async (params?: { employee_code?: string; department_id?: number }) => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const data = await dashboardAPI.getWorkforceAnalytics(params);
      setAnalytics(data);
    } catch (err: any) {
      setAnalyticsError(err?.response?.data?.detail || err.message || 'Lỗi khi tải phân tích nhân sự');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    dashboardAPI.getHRMStats()
      .then(setStats)
      .catch((err: any) => setError(err.message || 'Lỗi khi tải dashboard'))
      .finally(() => setLoading(false));

    fetchWorkforceAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-sm font-semibold text-red-500">Lỗi tải dữ liệu</p>
          <p className="text-xs text-gray-400 mt-1">{error ?? 'Không có dữ liệu'}</p>
        </div>
      </div>
    );
  }

  // ── Dữ liệu charts ──
  const genderData = [
    { name: 'Nam', value: stats.employee_stats.gender_distribution.male, color: '#1B65B8' },
    { name: 'Nữ', value: stats.employee_stats.gender_distribution.female, color: '#ec4899' },
    { name: 'Khác', value: stats.employee_stats.gender_distribution.other, color: '#8b5cf6' },
  ];

  const activityData = [
    { name: 'Gán tài sản', value: stats.recent_activities.asset_assignments, color: '#10b981' },
    { name: 'Trả tài sản', value: stats.recent_activities.asset_returns, color: '#f59e0b' },
    { name: 'Bảo trì', value: stats.recent_activities.maintenance, color: '#1B65B8' },
  ];
  const totalActivities = activityData.reduce((s, d) => s + d.value, 0);
  const safeActivityData = activityData.filter(d => d.value > 0).length > 0
    ? activityData
    : [{ name: 'Không có dữ liệu', value: 1, color: '#e5e7eb' }];

  const assetStatusData = [
    { name: 'Đang sử dụng', value: stats.asset_stats.in_use, color: '#10b981' },
    { name: 'Không sử dụng', value: stats.asset_stats.idle, color: '#6b7280' },
    { name: 'Bảo trì', value: stats.asset_stats.under_maintenance, color: '#f59e0b' },
  ];

  const sortedDepts = [...stats.department_stats].sort((a, b) => b.employee_count - a.employee_count);
  const deptDonutData = [
    ...sortedDepts.slice(0, 5).map((d, i) => ({ name: d.name, value: d.employee_count, color: CHART_COLORS[i] })),
    ...(sortedDepts.length > 5
      ? [{ name: 'Khác', value: sortedDepts.slice(5).reduce((s, d) => s + d.employee_count, 0), color: '#9ca3af' }]
      : []),
  ];

  const deptBarData = [...stats.department_stats]
    .sort((a, b) => b.employee_count - a.employee_count)
    .slice(0, 6)
    .map((d, i) => ({ name: d.name, value: d.employee_count, color: CHART_COLORS[i % CHART_COLORS.length] }));

  const assetTypeData = [...stats.asset_stats.type_distribution]
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((t, i) => ({ name: t.display_name, value: t.count, color: CHART_COLORS[i % CHART_COLORS.length] }));

  const tenureChartData = (analytics?.tenure_analysis.distribution || []).map((item, i) => ({
    name: item.bucket,
    value: item.count,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const costSplitData = (analytics?.charts.cost_split || []).map((item, i) => ({
    name: item.name,
    value: item.value,
    color: i === 0 ? '#1B65B8' : '#10b981',
  }));

  const handleAnalyze = () => {
    const params: { employee_code?: string; department_id?: number } = {};
    if (employeeCodeInput.trim()) {
      params.employee_code = employeeCodeInput.trim();
    }
    if (selectedDepartmentId !== '') {
      params.department_id = selectedDepartmentId;
    }
    fetchWorkforceAnalytics(params);
  };

  const handleResetAnalysis = () => {
    setEmployeeCodeInput('');
    setSelectedDepartmentId('');
    fetchWorkforceAnalytics();
  };

  return (
    <div className="flex flex-col gap-5 min-h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-2 sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard HRM</h1>
          <p className="text-sm text-gray-900 mt-0.5">Tổng quan nhân sự & tài sản</p>
        </div>
        <span className="text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 flex-shrink-0">
          {formatDate(new Date())}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-full sm:w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                active
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Tổng quan ── */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-5 flex-1">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard name="Tổng nhân viên" rawValue={stats.employee_stats.active + stats.employee_stats.probation} formatter={formatNumber}
              subtext=""
              icon={UsersIcon} iconBg="bg-primary-100 text-primary-600" trend={stats.trends.employee_growth} />
            <StatCard name="Thử việc" rawValue={stats.employee_stats.probation} formatter={formatNumber}
              subtext=""
              icon={UserPlusIcon} iconBg="bg-amber-100 text-amber-600" trend={null} />
            <StatCard name="Tài sản đang dùng" rawValue={stats.asset_stats.in_use} formatter={formatNumber}
              subtext={`${formatNumber(stats.asset_stats.total)} tổng tài sản`}
              icon={ComputerDesktopIcon} iconBg="bg-emerald-100 text-emerald-600" trend={stats.trends.asset_growth} />
            <StatCard name="Giá trị tài sản" rawValue={stats.asset_stats.total_value} formatter={formatCurrency}
              subtext={`${formatNumber(stats.asset_stats.current_assignments)} đang gán`}
              icon={CurrencyDollarIcon} iconBg="bg-violet-100 text-violet-600" trend={null} />
          </div>
          <div className="flex-1">
            <HRStats />
          </div>
        </div>
      )}

      {/* ── Tab: Nhân viên ── */}
      {activeTab === 'employee' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard name="Đang làm việc" rawValue={stats.employee_stats.active} formatter={formatNumber}
              subtext={`Tổng ${formatNumber(stats.employee_stats.active + stats.employee_stats.probation)} nhân viên`}
              icon={UsersIcon} iconBg="bg-primary-100 text-primary-600" trend={stats.trends.employee_growth} />
            <StatCard name="Thử việc" rawValue={stats.employee_stats.probation} formatter={formatNumber}
              subtext={`${formatNumber(stats.employee_stats.new_last_30_days)} mới / 30 ngày`}
              icon={UserPlusIcon} iconBg="bg-amber-100 text-amber-600" trend={null} />
            <StatCard name="Mới tuyển dụng" rawValue={stats.employee_stats.recent_hires} formatter={formatNumber}
              subtext="Trong 30 ngày gần nhất"
              icon={UserGroupIcon} iconBg="bg-emerald-100 text-emerald-600" trend={null} />
            <StatCard name="Tổng cộng" rawValue={stats.employee_stats.active + stats.employee_stats.probation} formatter={formatNumber}
              subtext="Đang hoạt động"
              icon={UserGroupIcon} iconBg="bg-violet-100 text-violet-600" trend={null} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DonutCard title="Phân bố giới tính" data={genderData}
              centerValue={stats.employee_stats.active + stats.employee_stats.probation} centerLabel="Nhân viên" />
            <DonutCard title="Tóm tắt phòng ban" sub="Top 5 phòng ban" data={deptDonutData}
              centerValue={stats.employee_stats.active + stats.employee_stats.probation} centerLabel="Đang làm & TV" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DonutCard title="Phân bố nhân sự theo phòng ban" sub="Top 6 phòng ban" data={deptBarData}
              centerValue={stats.employee_stats.active + stats.employee_stats.probation} centerLabel="Tổng NV" />
            <DonutCard title="Hoạt động gần đây" sub="7 ngày qua" data={safeActivityData}
              centerValue={totalActivities} centerLabel="Hoạt động" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-primary-500 shadow-sm p-5 space-y-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-gray-900">Phân tích thâm niên & dự báo chi phí lương</h3>
              <p className="text-xs text-gray-600">
                Dữ liệu lương tham chiếu: {analytics?.salary_reference_period?.label || 'Chưa có dữ liệu bảng lương'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={employeeCodeInput}
                onChange={(e) => setEmployeeCodeInput(e.target.value)}
                placeholder="Nhập mã nhân viên"
                className="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value ? Number(e.target.value) : '')}
                className="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">Tất cả phòng ban</option>
                {stats.department_stats.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleAnalyze}
                  disabled={analyticsLoading}
                  className="flex-1 h-10 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60"
                >
                  {analyticsLoading ? 'Đang phân tích...' : 'Phân tích'}
                </button>
                <button
                  onClick={handleResetAnalysis}
                  disabled={analyticsLoading}
                  className="h-10 px-4 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
                >
                  Reset
                </button>
              </div>
            </div>

            {analyticsError && (
              <p className="text-xs font-semibold text-red-500">{analyticsError}</p>
            )}

            {analytics && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    name="Nhân sự phân tích"
                    rawValue={analytics.summary.total_employees}
                    formatter={formatNumber}
                    subtext="Theo bộ lọc hiện tại"
                    icon={UsersIcon}
                    iconBg="bg-primary-100 text-primary-600"
                    trend={null}
                  />
                  <StatCard
                    name="Ước lương tháng"
                    rawValue={analytics.summary.estimated_monthly_payroll}
                    formatter={formatCurrency}
                    subtext="Theo kỳ lương gần nhất"
                    icon={CurrencyDollarIcon}
                    iconBg="bg-emerald-100 text-emerald-600"
                    trend={null}
                  />
                  <StatCard
                    name="Từ đầu năm đến nay"
                    rawValue={analytics.summary.estimated_cost_from_year_start}
                    formatter={formatCurrency}
                    subtext="Chi phí đã ước tính"
                    icon={ChartPieIcon}
                    iconBg="bg-amber-100 text-amber-600"
                    trend={null}
                  />
                  <StatCard
                    name="Từ nay đến cuối năm"
                    rawValue={analytics.summary.estimated_cost_to_year_end}
                    formatter={formatCurrency}
                    subtext="Chi phí dự kiến"
                    icon={ChartPieIcon}
                    iconBg="bg-violet-100 text-violet-600"
                    trend={null}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <DonutCard
                    title="Phân bố thâm niên"
                    sub={`Thâm niên trung bình: ${analytics.tenure_analysis.average_tenure_years} năm`}
                    data={tenureChartData.length ? tenureChartData : [{ name: 'Chưa có dữ liệu', value: 1, color: '#e5e7eb' }]}
                    centerValue={analytics.summary.total_employees}
                    centerLabel="Nhân sự"
                  />
                  <DonutCard
                    title="So sánh chi phí năm"
                    sub={`Cả năm ước tính: ${formatCurrency(analytics.summary.estimated_full_year_cost)}`}
                    data={costSplitData.length ? costSplitData : [{ name: 'Chưa có dữ liệu', value: 1, color: '#e5e7eb' }]}
                    centerValue={analytics.summary.estimated_full_year_cost}
                    centerLabel="VNĐ"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-bold text-gray-800 mb-3">Biểu đồ dự báo chi phí theo tháng</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={analytics.charts.monthly_projection}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(v) => `${Math.round((v || 0) / 1000000)}tr`} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                        <Line type="monotone" dataKey="estimated_cost" stroke="#1B65B8" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-bold text-gray-800 mb-3">Chi phí lương theo phòng ban</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={(analytics.department_analysis || []).slice(0, 6)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="department_name" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(v) => `${Math.round((v || 0) / 1000000)}tr`} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                        <Bar dataKey="estimated_monthly_payroll" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Tài sản ── */}
      {activeTab === 'asset' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard name="Đang sử dụng" rawValue={stats.asset_stats.in_use} formatter={formatNumber}
              subtext={`Tổng ${formatNumber(stats.asset_stats.total)} tài sản`}
              icon={ComputerDesktopIcon} iconBg="bg-emerald-100 text-emerald-600" trend={stats.trends.asset_growth} />
            <StatCard name="Không sử dụng" rawValue={stats.asset_stats.idle} formatter={formatNumber}
              subtext="Chưa được gán"
              icon={ArchiveBoxIcon} iconBg="bg-amber-100 text-amber-600" trend={null} />
            <StatCard name="Đang bảo trì" rawValue={stats.asset_stats.under_maintenance} formatter={formatNumber}
              subtext={`${formatNumber(stats.asset_stats.upcoming_maintenance)} sắp bảo trì`}
              icon={WrenchScrewdriverIcon} iconBg="bg-red-100 text-red-500" trend={null} />
            <StatCard name="Giá trị tài sản" rawValue={stats.asset_stats.total_value} formatter={formatCurrency}
              subtext={`${formatNumber(stats.asset_stats.current_assignments)} đang gán`}
              icon={CurrencyDollarIcon} iconBg="bg-violet-100 text-violet-600" trend={null} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DonutCard title="Trạng thái tài sản" data={assetStatusData}
              centerValue={stats.asset_stats.total} centerLabel="Tổng TS" />
            <DonutCard title="Phân bố loại tài sản" sub="Top 6 loại tài sản" data={assetTypeData}
              centerValue={stats.asset_stats.total} centerLabel="Tổng TS" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DonutCard title="Hoạt động tài sản" sub="7 ngày qua" data={safeActivityData}
              centerValue={totalActivities} centerLabel="Hoạt động" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
