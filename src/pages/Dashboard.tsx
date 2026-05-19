import React, { useEffect, useState } from 'react';
import { usePieAnimation } from '@/hooks/usePieAnimation';
import {
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UserPlusIcon,
  UsersIcon,
  ComputerDesktopIcon,
  UserMinusIcon,
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
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
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
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{name}</p>
      <p className="text-2xl font-extrabold text-gray-900 tracking-tight mt-0.5 truncate">
        {formatter(rawValue)}
      </p>
      <p className="text-xs text-gray-400 mt-1">{subtext}</p>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    dashboardAPI.getHRMStats()
      .then(setStats)
      .catch((err: any) => setError(err.message || 'Lỗi khi tải dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-9 w-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-10 w-72 bg-gray-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-28 animate-pulse">
              <div className="h-9 w-9 bg-gray-100 rounded-xl mb-3" />
              <div className="h-3 w-20 bg-gray-100 rounded mb-2" />
              <div className="h-7 w-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 w-32 bg-gray-100 rounded mb-4" />
              <div className="flex items-center gap-5">
                <div className="h-40 w-40 rounded-full bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  {[1,2,3].map(j => <div key={j} className="h-3 bg-gray-100 rounded" />)}
                </div>
              </div>
            </div>
          ))}
        </div>
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

  return (
    <div className="flex flex-col gap-5 min-h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-2 sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard HRM</h1>
          <p className="text-xs text-gray-600 mt-0.5">Tổng quan nhân sự & tài sản</p>
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
            <StatCard name="Tổng nhân viên" rawValue={stats.employee_stats.total} formatter={formatNumber}
              subtext={`${formatNumber(stats.employee_stats.active)} đang làm việc`}
              icon={UsersIcon} iconBg="bg-primary-100 text-primary-600" trend={stats.trends.employee_growth} />
            <StatCard name="Thử việc" rawValue={stats.employee_stats.probation} formatter={formatNumber}
              subtext={`${formatNumber(stats.employee_stats.new_last_30_days)} mới / 30 ngày`}
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
              subtext={`Tổng ${formatNumber(stats.employee_stats.total)} nhân viên`}
              icon={UsersIcon} iconBg="bg-primary-100 text-primary-600" trend={stats.trends.employee_growth} />
            <StatCard name="Thử việc" rawValue={stats.employee_stats.probation} formatter={formatNumber}
              subtext={`${formatNumber(stats.employee_stats.new_last_30_days)} mới / 30 ngày`}
              icon={UserPlusIcon} iconBg="bg-amber-100 text-amber-600" trend={null} />
            <StatCard name="Mới tuyển dụng" rawValue={stats.employee_stats.recent_hires} formatter={formatNumber}
              subtext="Trong 30 ngày gần nhất"
              icon={UserGroupIcon} iconBg="bg-emerald-100 text-emerald-600" trend={null} />
            <StatCard name="Nghỉ việc" rawValue={stats.employee_stats.inactive} formatter={formatNumber}
              subtext="Không còn làm việc"
              icon={UserMinusIcon} iconBg="bg-red-100 text-red-500" trend={null} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DonutCard title="Phân bố giới tính" data={genderData}
              centerValue={stats.employee_stats.total} centerLabel="Nhân viên" />
            <DonutCard title="Tóm tắt phòng ban" sub="Top 5 phòng ban" data={deptDonutData}
              centerValue={stats.employee_stats.active} centerLabel="Đang làm" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DonutCard title="Phân bố nhân sự theo phòng ban" sub="Top 6 phòng ban" data={deptBarData}
              centerValue={stats.employee_stats.total} centerLabel="Tổng NV" />
            <DonutCard title="Hoạt động gần đây" sub="7 ngày qua" data={safeActivityData}
              centerValue={totalActivities} centerLabel="Hoạt động" />
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
