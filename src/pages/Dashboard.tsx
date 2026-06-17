import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { usePieAnimation } from '@/hooks/usePieAnimation';
import {
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  ComputerDesktopIcon,
  WrenchScrewdriverIcon,
  ArchiveBoxIcon,
  Squares2X2Icon,
  UserGroupIcon,
  ChartPieIcon,
  BuildingOfficeIcon,
  LockClosedIcon,
  ShieldCheckIcon,
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
import { dashboardAPI, employeesAPI, managementApi } from '@/utils/api';
import { socialInsuranceAPI } from '@/utils/api/hrm.api';
import type { Employee } from '@/utils/api/types';
import { formatNumber, formatVND, formatVNDShort } from '../utils/formatUtils';
import { useAuth } from '../contexts/AuthContext';
import { salaryService, type SalaryListResponse } from '../services/salary.service';
import HRStats from '../components/HRStats';
import { AnimatedNum } from '../components/AnimatedNum';
import { DonutCenter } from '../components/DonutCenter';
import { ProgressBar } from '../components/ProgressBar';

interface HRMDashboardStats {
  employee_stats: {
    total: number;
    active: number;
    paused: number;
    maternity_leave: number;
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

const formatCurrency = formatVND;
const formatCurrencyFull = formatVND;

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
      <p className="text-xs text-gray-600 mt-1 truncate">{subtext}</p>
    </div>
  );
};

type TabKey = 'overview' | 'employee' | 'asset';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Tổng quan', icon: Squares2X2Icon },
  { key: 'employee', label: 'Nhân viên', icon: UserGroupIcon },
  { key: 'asset', label: 'Tài sản', icon: ChartPieIcon },
];

// ─── Salary Department Analytics (BOD only) ─────────────────────────────────
interface SalaryDeptAnalyticsProps {
  salaryData: SalaryListResponse | null;
  salaryLoading: boolean;
  salaryError: string | null;
  salaryYear: number;
  salaryMonth: number;
  onYearChange: (y: number) => void;
  onMonthChange: (m: number) => void;
  onFetch: () => void;
}

const MONTH_NAMES = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

const SalaryDeptAnalytics: React.FC<SalaryDeptAnalyticsProps> = ({
  salaryData,
  salaryLoading,
  salaryError,
  salaryYear,
  salaryMonth,
  onYearChange,
  onMonthChange,
  onFetch,
}) => {
  // Aggregate per-department summary from results
  const deptSummary = useMemo(() => {
    if (!salaryData?.results?.length) return [];
    const map: Record<string, { name: string; count: number; totalNet: number; totalTax: number; totalPayable: number }> = {};
    for (const r of salaryData.results) {
      const key = r.phong_ban || 'Chưa phân phòng ban';
      if (!map[key]) map[key] = { name: key, count: 0, totalNet: 0, totalTax: 0, totalPayable: 0 };
      map[key].count += 1;
      map[key].totalNet += r.luong_thuc_linh ?? 0;
      map[key].totalTax += r.thue_tncn ?? 0;
      map[key].totalPayable += r.con_phai_thanh_toan ?? 0;
    }
    return Object.values(map).sort((a, b) => b.totalPayable - a.totalPayable);
  }, [salaryData]);

  const totals = useMemo(() => {
    if (!salaryData?.results?.length) return null;
    return salaryData.results.reduce((acc, r) => ({
      employees: acc.employees + 1,
      net: acc.net + (r.luong_thuc_linh ?? 0),
      tax: acc.tax + (r.thue_tncn ?? 0),
      payable: acc.payable + (r.con_phai_thanh_toan ?? 0),
    }), { employees: 0, net: 0, tax: 0, payable: 0 });
  }, [salaryData]);

  const barData = deptSummary.slice(0, 8).map((d, i) => ({
    name: d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name,
    'Thực lĩnh': d.totalNet,
    'Thuế TNCN': d.totalTax,
    'Phải thanh toán': d.totalPayable,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const pieData = deptSummary.slice(0, 6).map((d, i) => ({
    name: d.name,
    value: d.totalPayable,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-emerald-500 shadow-sm p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <BuildingOfficeIcon className="h-4 w-4 text-emerald-600" />
            Phân tích lương theo phòng ban
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Dữ liệu từ API bảng lương tổng hợp – chỉ BOD mới xem được
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={salaryYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="h-9 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={salaryMonth}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="h-9 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <button
            onClick={onFetch}
            disabled={salaryLoading}
            className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-1.5"
          >
            {salaryLoading ? (
              <><span className="animate-spin h-3 w-3 rounded-full border-b border-white" />Đang tải...</>
            ) : 'Tải dữ liệu'}
          </button>
        </div>
      </div>

      {salaryError && (
        <p className="text-xs font-semibold text-red-500 bg-red-50 rounded-lg px-3 py-2">{salaryError}</p>
      )}

      {salaryLoading && (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      )}

      {!salaryLoading && salaryData && totals && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wide">Nhân sự</p>
              <p className="text-xl font-extrabold text-emerald-900 mt-0.5">
                <AnimatedNum value={totals.employees} />
              </p>
              <p className="text-[10px] text-emerald-600">{MONTH_NAMES[salaryMonth - 1]} {salaryYear}</p>
            </div>
            <div className="bg-primary-50 rounded-xl p-3">
              <p className="text-[10px] font-medium text-primary-700 uppercase tracking-wide">Tổng lương thực lĩnh</p>
              <p className="text-sm font-extrabold text-primary-900 mt-0.5 truncate">{formatCurrency(totals.net)}</p>
              <p className="text-[10px] text-primary-600">Chưa trừ thuế</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-[10px] font-medium text-amber-700 uppercase tracking-wide">Tổng thuế TNCN</p>
              <p className="text-sm font-extrabold text-amber-900 mt-0.5 truncate">{formatCurrency(totals.tax)}</p>
              <p className="text-[10px] text-amber-600">Tất cả nhân viên</p>
            </div>
            <div className="bg-violet-50 rounded-xl p-3">
              <p className="text-[10px] font-medium text-violet-700 uppercase tracking-wide">Tổng phải thanh toán</p>
              <p className="text-sm font-extrabold text-violet-900 mt-0.5 truncate">{formatCurrency(totals.payable)}</p>
              <p className="text-[10px] text-violet-600">Sau thuế TNCN</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-800 mb-3">Chi phí thanh toán theo phòng ban</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 4, right: 4, left: 4, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tickFormatter={(v) => `${Math.round((v || 0) / 1000000)}tr`} tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(value: any) => formatCurrencyFull(Number(value || 0))} />
                  <Bar dataKey="Phải thanh toán" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Thuế TNCN" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-800 mb-3">Tỷ trọng lương phải thanh toán theo phòng ban</p>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrencyFull(Number(value || 0))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-600">Phòng ban</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-600">Nhân sự</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-600">Tổng thực lĩnh</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-600">Thuế TNCN</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-600">Phải thanh toán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deptSummary.map((dept, i) => (
                  <tr key={dept.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{dept.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{dept.count}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-primary-700">{formatCurrencyFull(dept.totalNet)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-amber-700">{formatCurrencyFull(dept.totalTax)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-700">{formatCurrencyFull(dept.totalPayable)}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                  <td className="px-4 py-2.5 font-bold text-gray-900">Tổng cộng</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-bold text-gray-900">{totals.employees}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-bold text-primary-800">{formatCurrencyFull(totals.net)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-bold text-amber-800">{formatCurrencyFull(totals.tax)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-800">{formatCurrencyFull(totals.payable)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {!salaryLoading && !salaryData && !salaryError && (
        <div className="text-center py-8 text-gray-400 text-xs">
          Chọn tháng/năm và nhấn "Tải dữ liệu" để xem phân tích lương theo phòng ban.
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const isBod = Boolean(
    user?.employee_profile?.is_bod ||
    (user as any)?.hrm_user?.is_bod ||
    (user as any)?.is_bod
  );

  const [stats, setStats] = useState<HRMDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [legalEntityGroups, setLegalEntityGroups] = useState<{ label: string; value: string; employees: Employee[] }[]>([]);
  const [legalEntityLoading, setLegalEntityLoading] = useState(false);
  const [totalBasicSalary, setTotalBasicSalary] = useState(0);
  const [totalEmployeeInsurance, setTotalEmployeeInsurance] = useState(0);
  const [totalEmployerInsurance, setTotalEmployerInsurance] = useState(0);
  const [totalInsurance, setTotalInsurance] = useState(0);
  const [totalInsuredEmployees, setTotalInsuredEmployees] = useState(0);
  const [employeeCodeInput, setEmployeeCodeInput] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | ''>('');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Salary department analytics (BOD only)
  const [salaryData, setSalaryData] = useState<SalaryListResponse | null>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear());
  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1);

  const fetchSalaryAnalytics = useCallback(async (options?: {
    year?: number;
    month?: number;
    department_id?: number;
    employee_code?: string;
  }) => {
    if (!isBod) return;
    setSalaryLoading(true);
    setSalaryError(null);
    try {
      const data = await salaryService.getSalaryByDepartment({
        year: options?.year ?? salaryYear,
        month: options?.month ?? salaryMonth,
        department_id: options?.department_id,
        employee_code: options?.employee_code,
      });
      setSalaryData(data);
    } catch (err: any) {
      setSalaryError(err?.response?.data?.detail || err.message || 'Lỗi khi tải dữ liệu lương phòng ban');
    } finally {
      setSalaryLoading(false);
    }
  }, [isBod, salaryYear, salaryMonth]);

  useEffect(() => {
    dashboardAPI.getHRMStats()
      .then(setStats)
      .catch((err: any) => setError(err.message || 'Lỗi khi tải dashboard'))
      .finally(() => setLoading(false));
    socialInsuranceAPI.stats()
      .then((s) => {
        setTotalEmployeeInsurance(s.total_employee_contribution);
        setTotalEmployerInsurance(s.total_employer_contribution);
        setTotalInsurance(s.total_contribution);
        setTotalInsuredEmployees(s.ACTIVE);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLegalEntityLoading(true);
    Promise.all([
      managementApi.get<{ value: string; label: string }[]>('/api/v1/salary/records/legal-entities/'),
      employeesAPI.list({ employment_status: 'ACTIVE', page_size: 1000 }),
    ])
      .then(([leRes, activeRes]) => {
        const entities: { value: string; label: string }[] = Array.isArray(leRes.data) ? leRes.data : [];
        const allEmployees = activeRes.results;
        const grouped = entities.map((le) => ({
          label: le.label,
          value: le.value,
          employees: allEmployees.filter((e) => e.subsidiary_legal_entity === le.value),
        }));
        const assignedIds = new Set(grouped.flatMap((g) => g.employees.map((e) => e.id)));
        const unassigned = allEmployees.filter((e) => !assignedIds.has(e.id));
        if (unassigned.length > 0) {
          grouped.push({ label: 'Chưa phân pháp nhân', value: '__none__', employees: unassigned });
        }
        setLegalEntityGroups(grouped);
        setTotalBasicSalary(allEmployees.reduce((sum, e) => sum + Number(e.basic_salary ?? 0), 0));
      })
      .catch(() => {})
      .finally(() => setLegalEntityLoading(false));
  }, []);

  // Auto-fetch salary analytics when BOD user views employee tab
  useEffect(() => {
    if (isBod && activeTab === 'employee' && !salaryData && !salaryLoading) {
      fetchSalaryAnalytics();
    }
  }, [isBod, activeTab]);

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

  const salaryResults = salaryData?.results || [];
  const monthlyPayroll = salaryResults.reduce((sum, row) => sum + Number(row.con_phai_thanh_toan || 0), 0);
  const selectedMonth = salaryData?.month || salaryMonth;
  const selectedYear = salaryData?.year || salaryYear;
  const currentYear = new Date().getFullYear();
  const elapsedMonths = selectedYear < currentYear ? 12 : selectedYear > currentYear ? 0 : selectedMonth;
  const remainingMonths = selectedYear < currentYear ? 0 : selectedYear > currentYear ? 12 : Math.max(12 - selectedMonth, 0);
  const estimatedCostFromYearStart = monthlyPayroll * elapsedMonths;
  const estimatedCostToYearEnd = monthlyPayroll * remainingMonths;
  const estimatedFullYearCost = monthlyPayroll * 12;

  const tenureMap = salaryResults.reduce((acc: Record<string, number>, row: any) => {
    const tenureYears = Number(row.tenure_years);
    if (!Number.isNaN(tenureYears) && tenureYears >= 0) {
      const bucket = tenureYears < 1 ? '< 1 năm'
        : tenureYears < 3 ? '1-3 năm'
        : tenureYears < 5 ? '3-5 năm'
        : '>= 5 năm';
      acc[bucket] = (acc[bucket] || 0) + 1;
      return acc;
    }

    const contractStatus = (row.contract_status || '').toUpperCase();
    const fallbackBucket = contractStatus === 'THU_VIEC'
      ? 'Thử việc'
      : contractStatus === 'CHINH_THUC'
      ? 'Chính thức'
      : 'Khác';
    acc[fallbackBucket] = (acc[fallbackBucket] || 0) + 1;
    return acc;
  }, {});

  const tenureChartData = Object.entries(tenureMap).map(([name, value], i) => ({
    name,
    value,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const costSplitData = [
    { name: 'Đầu năm đến hiện tại', value: estimatedCostFromYearStart, color: '#1B65B8' },
    { name: 'Hiện tại đến cuối năm', value: estimatedCostToYearEnd, color: '#10b981' },
  ];

  const monthlyProjectionData = MONTH_NAMES.map((label, index) => ({
    month: label,
    estimated_cost: monthlyPayroll,
    month_index: index + 1,
  }));

  const departmentPayrollData = Object.values(
    salaryResults.reduce((acc: Record<string, { department_name: string; estimated_monthly_payroll: number }>, row) => {
      const deptName = row.phong_ban || 'Chưa phân phòng ban';
      if (!acc[deptName]) {
        acc[deptName] = { department_name: deptName, estimated_monthly_payroll: 0 };
      }
      acc[deptName].estimated_monthly_payroll += Number(row.con_phai_thanh_toan || 0);
      return acc;
    }, {})
  )
    .sort((a, b) => b.estimated_monthly_payroll - a.estimated_monthly_payroll)
    .slice(0, 6);

  const handleAnalyze = () => {
    const params: { employee_code?: string; department_id?: number } = {};
    if (employeeCodeInput.trim()) {
      params.employee_code = employeeCodeInput.trim();
    }
    if (selectedDepartmentId !== '') {
      params.department_id = selectedDepartmentId;
    }
    fetchSalaryAnalytics({
      year: salaryYear,
      month: salaryMonth,
      employee_code: params.employee_code,
      department_id: params.department_id,
    });
  };

  const handleResetAnalysis = () => {
    setEmployeeCodeInput('');
    setSelectedDepartmentId('');
    fetchSalaryAnalytics({ year: salaryYear, month: salaryMonth });
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
            <StatCard name="Tổng nhân viên" rawValue={stats.employee_stats.active} formatter={formatNumber}
              subtext="Đang hoạt động"
              icon={UsersIcon} iconBg="bg-primary-100 text-primary-600" trend={stats.trends.employee_growth} />
            <StatCard name="Tổng lương cứng nhân sự" rawValue={totalBasicSalary} formatter={formatCurrency}
              subtext=""
              icon={CurrencyDollarIcon} iconBg="bg-primary-100 text-primary-600" trend={null} />
            <StatCard name="Tài sản đang dùng" rawValue={stats.asset_stats.in_use} formatter={formatNumber}
              subtext={`${formatNumber(stats.asset_stats.total)} tổng tài sản`}
              icon={ComputerDesktopIcon} iconBg="bg-emerald-100 text-emerald-600" trend={stats.trends.asset_growth} />
            <StatCard name="Giá trị tài sản" rawValue={stats.asset_stats.total_value} formatter={formatCurrency}
              subtext={`${formatNumber(stats.asset_stats.current_assignments)} đang gán`}
              icon={CurrencyDollarIcon} iconBg="bg-violet-100 text-violet-600" trend={null} />
          </div>
          {(() => {
            return (
              <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-primary-500 shadow-sm p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                  {/* Tổng chi phí */}
                  <div className="flex items-start gap-3 lg:min-w-[280px]">
                    <div className="h-9 w-9 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ShieldCheckIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">Chi phí BHXH / tháng</p>
                      <p className="text-2xl font-extrabold text-gray-900 tracking-tight mt-0.5">{formatCurrency(totalInsurance)}</p>
                      <p className="text-xs font-semibold text-gray-600 mt-0.5">{formatNumber(totalInsuredEmployees)} nhân viên đang tham gia</p>
                    </div>
                  </div>

                  <div className="hidden lg:block w-px h-14 bg-gray-100 flex-shrink-0" />

                  {/* Breakdown */}
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-primary-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-primary-700 uppercase tracking-wide mb-1">Người lao động</p>
                        <p className="text-base font-bold text-gray-900 truncate">{formatCurrency(totalEmployeeInsurance)}</p>
                        </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Doanh nghiệp</p>
                        <p className="text-base font-bold text-gray-900 truncate">{formatCurrency(totalEmployerInsurance)}</p>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          {legalEntityLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600" />
            </div>
          ) : legalEntityGroups.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DonutCard
                title="Nhân viên theo Pháp nhân"
                sub="Đang làm việc & thử việc"
                data={legalEntityGroups.map((g, i) => ({ name: g.label, value: g.employees.length, color: CHART_COLORS[i % CHART_COLORS.length] }))}
                centerValue={legalEntityGroups.reduce((s, g) => s + g.employees.length, 0)}
                centerLabel="Nhân viên"
              />
              <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-primary-500 shadow-sm p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <BuildingOfficeIcon className="h-4 w-4 text-primary-600" />
                    Tổng lương cứng theo Pháp nhân
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Đang làm việc & thử việc</p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-600">Pháp nhân</th>
                        <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-600">Nhân viên</th>
                        <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-600">Tổng lương cứng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {legalEntityGroups.map((g, i) => {
                        const salary = g.employees.reduce((s, e) => s + Number(e.basic_salary ?? 0), 0);
                        return (
                          <tr key={g.value} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                            <td className="px-4 py-2.5 font-medium text-gray-800">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                {g.label}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{g.employees.length}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-primary-700">{formatCurrency(salary)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-primary-50 border-t-2 border-primary-200">
                        <td className="px-4 py-2.5 font-bold text-gray-900">Tổng cộng</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-bold text-gray-900">
                          {legalEntityGroups.reduce((s, g) => s + g.employees.length, 0)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-bold text-primary-800">
                          {formatCurrency(legalEntityGroups.reduce((s, g) => s + g.employees.reduce((ss, e) => ss + Number(e.basic_salary ?? 0), 0), 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1">
            <HRStats employees={legalEntityGroups.flatMap(g => g.employees)} />
          </div>
        </div>
      )}

      {/* ── Tab: Nhân viên ── */}
      {activeTab === 'employee' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard name="Đang hoạt động" rawValue={stats.employee_stats.active} formatter={formatNumber}
              subtext={`${formatNumber(stats.employee_stats.new_last_30_days)} mới trong 30 ngày`}
              icon={UsersIcon} iconBg="bg-primary-100 text-primary-600" trend={stats.trends.employee_growth} />
            <StatCard name="Mới tuyển dụng" rawValue={stats.employee_stats.recent_hires} formatter={formatNumber}
              subtext="Trong 30 ngày gần nhất"
              icon={UserGroupIcon} iconBg="bg-emerald-100 text-emerald-600" trend={null} />
            <StatCard name="Tổng lương cứng" rawValue={totalBasicSalary} formatter={formatCurrency}
              subtext={`${formatNumber(stats.employee_stats.active)} nhân viên đang hoạt động`}
              icon={CurrencyDollarIcon} iconBg="bg-primary-100 text-primary-600" trend={null} />
          </div>
          {(() => {
            return (
              <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-primary-500 shadow-sm p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                  <div className="flex items-start gap-3 lg:min-w-[280px]">
                    <div className="h-9 w-9 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ShieldCheckIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">Chi phí BHXH / tháng</p>
                      <p className="text-2xl font-extrabold text-gray-900 tracking-tight mt-0.5">{formatCurrency(totalInsurance)}</p>
                      <p className="text-xs font-semibold text-gray-600 mt-0.5">{formatNumber(totalInsuredEmployees)} nhân viên đang tham gia</p>
                    </div>
                  </div>
                  <div className="hidden lg:block w-px h-14 bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-primary-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-primary-700 uppercase tracking-wide mb-1">Người lao động</p>
                        <p className="text-base font-bold text-gray-900 truncate">{formatCurrency(totalEmployeeInsurance)}</p>
                        </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Doanh nghiệp</p>
                        <p className="text-base font-bold text-gray-900 truncate">{formatCurrency(totalEmployerInsurance)}</p>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DonutCard title="Phân bố giới tính" data={genderData}
              centerValue={stats.employee_stats.active} centerLabel="Nhân viên" />
            <DonutCard title="Tóm tắt phòng ban" sub="Top 5 phòng ban" data={deptDonutData}
              centerValue={stats.employee_stats.active} centerLabel="Đang làm & TV" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DonutCard title="Phân bố nhân sự theo phòng ban" sub="Top 6 phòng ban" data={deptBarData}
              centerValue={stats.employee_stats.active} centerLabel="Tổng NV" />
            <DonutCard title="Hoạt động gần đây" sub="7 ngày qua" data={safeActivityData}
              centerValue={totalActivities} centerLabel="Hoạt động" />
          </div>

          {legalEntityLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600" />
            </div>
          ) : legalEntityGroups.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DonutCard
                title="Nhân viên theo Pháp nhân"
                sub="Đang làm việc & thử việc"
                data={legalEntityGroups.map((g, i) => ({ name: g.label, value: g.employees.length, color: CHART_COLORS[i % CHART_COLORS.length] }))}
                centerValue={legalEntityGroups.reduce((s, g) => s + g.employees.length, 0)}
                centerLabel="Nhân viên"
              />
              <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-primary-500 shadow-sm p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <BuildingOfficeIcon className="h-4 w-4 text-primary-600" />
                    Tổng lương cứng theo Pháp nhân
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Đang làm việc & thử việc</p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-600">Pháp nhân</th>
                        <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-600">Nhân viên</th>
                        <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-600">Tổng lương cứng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {legalEntityGroups.map((g, i) => {
                        const salary = g.employees.reduce((s, e) => s + Number(e.basic_salary ?? 0), 0);
                        return (
                          <tr key={g.value} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                            <td className="px-4 py-2.5 font-medium text-gray-800">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                {g.label}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{g.employees.length}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-primary-700">{formatCurrency(salary)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-primary-50 border-t-2 border-primary-200">
                        <td className="px-4 py-2.5 font-bold text-gray-900">Tổng cộng</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-bold text-gray-900">
                          {legalEntityGroups.reduce((s, g) => s + g.employees.length, 0)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-bold text-primary-800">
                          {formatCurrency(legalEntityGroups.reduce((s, g) => s + g.employees.reduce((ss, e) => ss + Number(e.basic_salary ?? 0), 0), 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {isBod ? (
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-primary-500 shadow-sm p-5 space-y-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold text-gray-900">Phân tích thâm niên & dự báo chi phí lương</h3>
                <p className="text-xs text-gray-600">
                  Dữ liệu lương tham chiếu: {salaryData ? `${MONTH_NAMES[(salaryData.month || 1) - 1]}/${salaryData.year}` : 'Chưa có dữ liệu bảng lương'}
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
                    disabled={salaryLoading}
                    className="flex-1 h-10 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60"
                  >
                    {salaryLoading ? 'Đang phân tích...' : 'Phân tích'}
                  </button>
                  <button
                    onClick={handleResetAnalysis}
                    disabled={salaryLoading}
                    className="h-10 px-4 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {salaryError && (
                <p className="text-xs font-semibold text-red-500">{salaryError}</p>
              )}

              {salaryData && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      name="Nhân sự phân tích"
                      rawValue={salaryData.total || salaryResults.length}
                      formatter={formatNumber}
                      subtext="Theo bộ lọc hiện tại"
                      icon={UsersIcon}
                      iconBg="bg-primary-100 text-primary-600"
                      trend={null}
                    />
                    <StatCard
                      name="Ước lương tháng"
                      rawValue={monthlyPayroll}
                      formatter={formatCurrency}
                      subtext="Theo kỳ lương gần nhất"
                      icon={CurrencyDollarIcon}
                      iconBg="bg-emerald-100 text-emerald-600"
                      trend={null}
                    />
                    <StatCard
                      name="Từ đầu năm đến nay"
                      rawValue={estimatedCostFromYearStart}
                      formatter={formatCurrency}
                      subtext="Chi phí đã ước tính"
                      icon={ChartPieIcon}
                      iconBg="bg-amber-100 text-amber-600"
                      trend={null}
                    />
                    <StatCard
                      name="Từ nay đến cuối năm"
                      rawValue={estimatedCostToYearEnd}
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
                      sub="Dữ liệu phân nhóm theo API lương phòng ban"
                      data={tenureChartData.length ? tenureChartData : [{ name: 'Chưa có dữ liệu', value: 1, color: '#e5e7eb' }]}
                      centerValue={salaryData.total || salaryResults.length}
                      centerLabel="Nhân sự"
                    />
                    <DonutCard
                      title="So sánh chi phí năm"
                      sub={`Cả năm ước tính: ${formatCurrency(estimatedFullYearCost)}`}
                      data={costSplitData.length ? costSplitData : [{ name: 'Chưa có dữ liệu', value: 1, color: '#e5e7eb' }]}
                      centerValue={estimatedFullYearCost}
                      centerLabel="VNĐ"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                      <p className="text-xs font-bold text-gray-800 mb-3">Biểu đồ dự báo chi phí theo tháng</p>
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={monthlyProjectionData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={(v) => `${Math.round((v || 0) / 1000000)}tr`} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(value: any) => formatCurrencyFull(Number(value || 0))} />
                          <Line type="monotone" dataKey="estimated_cost" stroke="#1B65B8" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                      <p className="text-xs font-bold text-gray-800 mb-3">Chi phí lương theo phòng ban</p>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={departmentPayrollData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="department_name" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={(v) => `${Math.round((v || 0) / 1000000)}tr`} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(value: any) => formatCurrencyFull(Number(value || 0))} />
                          <Bar dataKey="estimated_monthly_payroll" fill="#10b981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 border-dashed p-6 flex flex-col items-center justify-center gap-2 text-center">
              <LockClosedIcon className="h-8 w-8 text-gray-400" />
              <p className="text-sm font-semibold text-gray-500">Phân tích thâm niên & dự báo chi phí lương</p>
              <p className="text-xs text-gray-400">Tính năng này chỉ dành cho thành viên BOD</p>
            </div>
          )}

          {/* ── Phân tích lương theo phòng ban (BOD only) ── */}
          {isBod ? (
            <SalaryDeptAnalytics
              salaryData={salaryData}
              salaryLoading={salaryLoading}
              salaryError={salaryError}
              salaryYear={salaryYear}
              salaryMonth={salaryMonth}
              onYearChange={setSalaryYear}
              onMonthChange={setSalaryMonth}
              onFetch={() => fetchSalaryAnalytics({ year: salaryYear, month: salaryMonth })}
            />
          ) : (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 border-dashed p-6 flex flex-col items-center justify-center gap-2 text-center">
              <LockClosedIcon className="h-8 w-8 text-gray-400" />
              <p className="text-sm font-semibold text-gray-500">Phân tích lương theo phòng ban</p>
            </div>
          )}
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
