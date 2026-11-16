import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  ArrowPathIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ClockIcon,
  ExclamationCircleIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { SelectBox } from './LandingLayout/SelectBox';
import type { SelectOption } from './LandingLayout/SelectBox';
import { apiErrorMessage, employeeChangeService } from '../services/employeeChange.service';
import type {
  SalaryEmployeeStat,
  SalaryMetricKey,
  SalaryMonthAmount,
  SalaryStatistics,
} from '../services/employeeChange.service';

/**
 * Tab "Thống kê quỹ lương" của trang Biến động lương: tổng lao động hiện tại, tổng quỹ lương, lương
 * bình quân, và lương theo từng nhân viên (HR chọn người để xem tháng cao nhất / thấp nhất của họ).
 *
 * Mọi con số (kể cả số tháng tối đa mỗi lần xem, danh sách chỉ số) do backend tính và trả —
 * salary/salary_statistics.py; web chỉ hiển thị.
 */

interface Filters {
  monthFrom: string; // YYYY-MM
  monthTo: string; // YYYY-MM
  department: string;
  legalEntity: string;
  metric: SalaryMetricKey;
}

interface Props {
  monthOptions: SelectOption<string>[];
  departmentOptions: SelectOption<string>[];
  legalEntityOptions: SelectOption<string>[];
  metricOptions: SelectOption<SalaryMetricKey>[];
}

const pad2 = (n: number) => String(n).padStart(2, '0');
/** Mặc định: từ tháng 1 tới tháng vừa qua (cả năm của tháng vừa qua). */
const defaultFilters = (): Filters => {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    monthFrom: `${last.getFullYear()}-01`,
    monthTo: `${last.getFullYear()}-${pad2(last.getMonth() + 1)}`,
    department: '',
    legalEntity: '',
    metric: 'tong_thu_nhap',
  };
};
const periodLabel = (period: string) => {
  const [year, month] = period.split('-');
  return `T${month}/${year}`;
};
const fmtMoney = (v: number) => `${Math.round(v).toLocaleString('vi-VN')} đ`;
/** Số tiền trong bảng (đơn vị ghi ở tiêu đề cột) — gọn cho điện thoại. */
const fmtNumber = (v: number) => Math.round(v).toLocaleString('vi-VN');
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

function StatCard({ title, accent, children }: { title: string; accent: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 bg-white rounded-2xl border border-gray-100 border-l-4 ${accent} shadow-sm p-4`}>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
/** Số dòng hiện cùng lúc — còn lại gõ mã / tên để lọc. */
const EMPLOYEE_PAGE = 50;

/** Một tháng lương trong chi tiết của 1 người: tô xanh tháng cao nhất, đỏ tháng thấp nhất. */
function MonthChip({ item, kind }: { item: SalaryMonthAmount; kind: 'max' | 'min' | 'normal' }) {
  const tone = kind === 'max'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : kind === 'min'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-gray-200 bg-white text-gray-700';
  return (
    <div className={`rounded-lg border px-2.5 py-1.5 ${tone}`}>
      <p className="text-[11px] font-medium opacity-80">
        T{item.label}
        {kind === 'max' ? ' · cao nhất' : kind === 'min' ? ' · thấp nhất' : ''}
      </p>
      <p className="text-sm font-semibold tabular-nums">{fmtMoney(item.amount)}</p>
    </div>
  );
}

/**
 * Lương theo từng nhân viên: HR tìm / chọn người để xem tháng lương cao nhất, thấp nhất và bình quân
 * của CHÍNH người đó trong kỳ (không phải người cao nhất / thấp nhất toàn công ty). Bấm một dòng để
 * xem lương từng tháng.
 */
function EmployeeSalaryStats({ employees }: { employees: SalaryEmployeeStat[] }) {
  const [query, setQuery] = useState('');
  const [openCode, setOpenCode] = useState<string | null>(null);
  const q = norm(query);
  const matched = q
    ? employees.filter((e) => norm(e.employee_code).includes(q) || norm(e.full_name).includes(q))
    : employees;
  const shown = matched.slice(0, EMPLOYEE_PAGE);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-w-0 overflow-hidden">
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900">Lương theo từng nhân viên</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Tháng lương cao nhất / thấp nhất và bình quân của từng người trong kỳ. Bấm vào một người để xem
            lương từng tháng.
          </p>
        </div>
        <div className="relative sm:w-72">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mã hoặc tên nhân viên"
            className="input-field pl-9"
          />
        </div>
      </div>

      {matched.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-400">
          {employees.length ? 'Không có nhân viên khớp.' : 'Kỳ này chưa có dữ liệu lương.'}
        </p>
      ) : (
        <div className="mt-3 divide-y divide-gray-100">
          {shown.map((e) => {
            const open = openCode === e.employee_code;
            return (
              <div key={e.employee_code}>
                <button
                  type="button"
                  onClick={() => setOpenCode(open ? null : e.employee_code)}
                  className={`w-full text-left px-4 sm:px-5 py-3 hover:bg-gray-50 ${open ? 'bg-primary-50/40' : ''}`}
                  aria-expanded={open}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 break-words">
                        {e.full_name} <span className="font-normal text-gray-400">({e.employee_code})</span>
                      </p>
                      <p className="text-xs text-gray-400 break-words">
                        {e.department || '—'} · {e.month_count} tháng có lương
                      </p>
                    </div>
                    <ChevronDownIcon
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="text-gray-400">Cao nhất</p>
                      <p className="font-semibold text-emerald-700 tabular-nums break-words">{fmtMoney(e.highest.amount)}</p>
                      <p className="text-gray-400">T{e.highest.label}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-400">Thấp nhất</p>
                      <p className="font-semibold text-red-600 tabular-nums break-words">{fmtMoney(e.lowest.amount)}</p>
                      <p className="text-gray-400">T{e.lowest.label}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-400">Bình quân / tháng</p>
                      <p className="font-semibold text-gray-900 tabular-nums break-words">{fmtMoney(e.average)}</p>
                    </div>
                  </div>
                </button>
                {open && (
                  <div className="px-4 sm:px-5 pb-4 bg-primary-50/40">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      {e.months.map((m) => (
                        <MonthChip
                          key={m.label}
                          item={m}
                          kind={
                            e.month_count > 1 && m.label === e.highest.label
                              ? 'max'
                              : e.month_count > 1 && m.label === e.lowest.label
                                ? 'min'
                                : 'normal'
                          }
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Tổng {fmtMoney(e.total)} ÷ {e.month_count} tháng có lương = {fmtMoney(e.average)} / tháng.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {matched.length > shown.length && (
        <p className="px-5 py-3 text-center text-xs text-gray-400 border-t border-gray-100">
          Đang hiện {shown.length}/{matched.length} người — gõ mã hoặc tên để tìm người cần xem.
        </p>
      )}
    </div>
  );
}

export default function SalaryStatisticsPanel({ monthOptions, departmentOptions, legalEntityOptions, metricOptions }: Props) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [data, setData] = useState<SalaryStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const requestRef = useRef(0);

  const invalidRange = filters.monthFrom > filters.monthTo;
  const metrics = data?.metrics?.length ? data.metrics.map((m) => ({ value: m.key, label: m.label })) : metricOptions;

  const run = useCallback(async (f: Filters) => {
    if (f.monthFrom > f.monthTo) return;
    const id = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await employeeChangeService.salaryStatistics({
        month_from: f.monthFrom,
        month_to: f.monthTo,
        metric: f.metric,
        department: f.department ? Number(f.department) : '',
        legal_entity: f.legalEntity,
      });
      if (id !== requestRef.current) return;
      setData(result);
    } catch (err) {
      if (id !== requestRef.current) return;
      setError(apiErrorMessage(err, 'Không tải được thống kê quỹ lương. Vui lòng thử lại.'));
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  }, []);

  // Chạy 1 lần khi mở tab (ref chặn StrictMode gọi 2 lần — tháng chưa chốt tính khá nặng).
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    void run(defaultFilters());
  }, [run]);

  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [loading]);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (invalidRange || loading) return;
    void run(filters);
  };

  const filtered = !!(data && (filters.department || filters.legalEntity));

  return (
    <div className="space-y-6 min-w-0">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          <div className="col-span-2">
            <div className="grid grid-cols-2 gap-3">
              <SelectBox<string>
                label="Từ tháng"
                value={filters.monthFrom}
                options={monthOptions}
                onChange={(v) => setFilter('monthFrom', v)}
              />
              <SelectBox<string>
                label="Đến tháng"
                value={filters.monthTo}
                options={monthOptions}
                onChange={(v) => setFilter('monthTo', v)}
              />
            </div>
            {invalidRange ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <ExclamationCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />
                Từ tháng phải trước hoặc bằng đến tháng.
              </p>
            ) : (
              data && (
                <p className="mt-1 text-xs text-gray-400">Mỗi lần xem tối đa {data.period.max_months} tháng.</p>
              )
            )}
          </div>
          <div className="col-span-2 lg:col-span-1">
            <SelectBox<string>
              label="Phòng ban"
              value={filters.department}
              options={departmentOptions}
              onChange={(v) => setFilter('department', v)}
            />
          </div>
          <div className="col-span-2 lg:col-span-1">
            <SelectBox<string>
              label="Pháp nhân"
              value={filters.legalEntity}
              options={legalEntityOptions}
              onChange={(v) => setFilter('legalEntity', v)}
            />
          </div>
          <div className="col-span-2 lg:col-span-1">
            <SelectBox<SalaryMetricKey>
              label="Chỉ số lương"
              value={filters.metric}
              options={metrics}
              onChange={(v) => setFilter('metric', v)}
            />
          </div>
          <div className="col-span-2 lg:col-span-1 lg:pt-6">
            <button
              type="submit"
              disabled={invalidRange || loading}
              className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ChartBarIcon className="h-4 w-4" />}
              {loading ? 'Đang tính...' : 'Xem thống kê'}
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-14 text-center" aria-live="polite">
          <div className="inline-block animate-spin rounded-full h-9 w-9 border-b-2 border-primary-600" />
          <p className="mt-4 text-sm font-semibold text-gray-900">
            Đang tính thống kê {periodLabel(filters.monthFrom)} → {periodLabel(filters.monthTo)}…
          </p>
          <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
            Tháng chưa chốt lương phải tính lại từ dữ liệu hiện tại nên có thể mất một lúc. Vui lòng không đóng trang.
          </p>
          {elapsed >= 2 && <p className="mt-2 text-xs text-gray-400">Đã chờ {elapsed} giây</p>}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-12 text-center">
          <div className="h-12 w-12 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ExclamationCircleIcon className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-gray-900">Không tải được thống kê</p>
          <p className="text-xs text-gray-500 mt-1 break-words">{error}</p>
          <button type="button" onClick={() => void run(filters)} className="btn-primary mt-4 inline-flex items-center gap-2">
            <ArrowPathIcon className="h-4 w-4" />
            Thử lại
          </button>
        </div>
      ) : data ? (
        <>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900">
                Kỳ T{data.period.from.label} → T{data.period.to.label}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Chỉ số: {data.metric.label}</p>
            </div>
            {data.has_unfinalized_month && (
              <span className="inline-flex items-center gap-1 self-start rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                <ClockIcon className="h-3.5 w-3.5" />
                Có tháng chưa chốt lương — số tạm tính
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard title="Tổng lao động hiện tại" accent="border-l-blue-500">
              <p className="text-[15px] sm:text-xl font-extrabold text-gray-900 mt-1">{data.headcount_current} người</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Đang làm việc ngày {fmtDate(data.headcount_date)}
                {filtered ? ' · theo phòng ban / pháp nhân đã chọn' : ''}
              </p>
            </StatCard>
            <StatCard title="Tổng quỹ lương" accent="border-l-emerald-500">
              <p className="text-[15px] sm:text-xl font-extrabold text-gray-900 mt-1 break-words tabular-nums">
                {fmtMoney(data.total_payroll)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {data.paid_month_count} tháng có lương · {data.employee_count} người
              </p>
            </StatCard>
            <StatCard title="Lương bình quân" accent="border-l-primary-500">
              {data.average_salary === null ? (
                <p className="text-sm text-gray-400 mt-1">Chưa có dữ liệu</p>
              ) : (
                <>
                  <p className="text-[15px] sm:text-xl font-extrabold text-primary-600 mt-1 break-words tabular-nums">
                    {fmtMoney(data.average_salary)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 break-words">
                    {fmtMoney(data.total_payroll)} ÷ {data.employee_count} người ÷ {data.paid_month_count} tháng
                  </p>
                  {data.average_per_salary_line !== null && (
                    <p
                      className="text-xs text-gray-400 break-words"
                      title="Tổng quỹ lương chia số lượt lương (người × tháng) — sát thực tế hơn khi có người vào / nghỉ giữa kỳ"
                    >
                      Theo lượt lương: {fmtMoney(data.average_per_salary_line)} ({data.salary_line_count} lượt)
                    </p>
                  )}
                </>
              )}
            </StatCard>
          </div>

          <EmployeeSalaryStats employees={data.employees} />

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-w-0 overflow-hidden">
            <div className="px-4 sm:px-5 pt-4 sm:pt-5">
              <h3 className="text-sm font-bold text-gray-900">Quỹ lương theo tháng</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Chỉ tính các dòng lương có số dương (bỏ người 0 đ trong tháng) — cao nhất, thấp nhất, bình quân cũng
                tính trên các dòng này.
              </p>
            </div>
            <div className="overflow-x-auto mt-3">
              <table className="min-w-full text-[13px] sm:text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 sm:px-4 py-2.5 text-left">Tháng</th>
                    <th className="hidden sm:table-cell px-3 sm:px-4 py-2.5 text-left">Trạng thái</th>
                    <th className="px-3 sm:px-4 py-2.5 text-right">Số người</th>
                    <th className="px-3 sm:px-4 py-2.5 text-right">Quỹ lương (đ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.months.map((m) => (
                    <tr key={m.label}>
                      <td className="px-3 sm:px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                        T{m.label}
                        {/* Điện thoại: trạng thái chốt thu gọn thành biểu tượng cạnh tháng */}
                        <span className="sm:hidden" title={m.is_finalized ? 'Đã chốt' : 'Chưa chốt – tạm tính'}>
                          {m.is_finalized ? (
                            <LockClosedIcon className="ml-1 inline h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <ClockIcon className="ml-1 inline h-3.5 w-3.5 text-amber-600" />
                          )}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-2.5 whitespace-nowrap">
                        {m.is_finalized ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <LockClosedIcon className="h-3.5 w-3.5" /> Đã chốt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                            <ClockIcon className="h-3.5 w-3.5" /> Chưa chốt – tạm tính
                          </span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums">{m.employee_count}</td>
                      <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums whitespace-nowrap">{m.employee_count ? fmtNumber(m.total) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold text-gray-900">
                  <tr>
                    <td className="px-3 sm:px-4 py-2.5 sm:hidden">Tổng ({data.paid_month_count} tháng)</td>
                    <td className="hidden sm:table-cell px-3 sm:px-4 py-2.5" colSpan={2}>
                      Tổng ({data.paid_month_count} tháng có lương)
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums whitespace-nowrap">{data.employee_count} người</td>
                    <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums whitespace-nowrap">{fmtNumber(data.total_payroll)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
