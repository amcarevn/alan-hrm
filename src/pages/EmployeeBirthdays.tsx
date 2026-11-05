import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  CakeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { employeesAPI } from '../utils/api';
import type { BirthdayEmployee, BirthdaysByMonthResponse } from '../utils/api/hrm.api';
import { SelectBox } from '../components/LandingLayout/SelectBox';

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const NO_UNIT = 'none';
const ALL_UNITS = 'all';

const unitKey = (unit: { id: number } | null) => (unit ? String(unit.id) : NO_UNIT);

const pad = (n: number) => String(n).padStart(2, '0');

const EmployeeBirthdays: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [unitFilter, setUnitFilter] = useState<string>(ALL_UNITS);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<BirthdaysByMonthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    return [current - 1, current, current + 1];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await employeesAPI.birthdaysByMonth(month, year));
    } catch (err: any) {
      setData(null);
      setError(err?.response?.data?.error || 'Không tải được danh sách sinh nhật.');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  const isViewingCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const dayState = (e: BirthdayEmployee): 'today' | 'past' | 'upcoming' => {
    if (!isViewingCurrentMonth) return 'upcoming';
    if (e.day === now.getDate()) return 'today';
    return e.day < now.getDate() ? 'past' : 'upcoming';
  };

  const keyword = search.trim().toLowerCase();
  const visibleGroups = (data?.groups ?? [])
    .filter((g) => unitFilter === ALL_UNITS || unitKey(g.company_unit) === unitFilter)
    .map((g) => ({
      ...g,
      employees: keyword
        ? g.employees.filter(
          (e) => e.full_name.toLowerCase().includes(keyword) || e.employee_id.toLowerCase().includes(keyword),
        )
        : g.employees,
    }))
    .filter((g) => g.employees.length > 0);

  const todayCount = isViewingCurrentMonth
    ? (data?.groups ?? []).reduce((n, g) => n + g.employees.filter((e) => e.day === now.getDate()).length, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Sinh nhật nhân sự</h1>
        <p className="text-sm text-gray-900 mt-0.5">Danh sách sinh nhật theo tháng, chia theo pháp nhân</p>
      </div>

      {/* Filter bar */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="btn-secondary px-2.5"
              aria-label="Tháng trước"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <div className="w-32">
              <SelectBox<number>
                label="Tháng"
                value={month}
                options={MONTH_NAMES.map((name, idx) => ({ value: idx + 1, label: name }))}
                onChange={setMonth}
              />
            </div>
            <div className="w-24">
              <SelectBox<number>
                label="Năm"
                value={year}
                options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
                onChange={setYear}
              />
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="btn-secondary px-2.5"
              aria-label="Tháng sau"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc mã NV"
              className="w-full rounded-xl border-gray-200 pl-9 text-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="btn-secondary flex items-center gap-1.5 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        {/* Lọc pháp nhân */}
        {data && data.groups.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setUnitFilter(ALL_UNITS)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${unitFilter === ALL_UNITS
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              Tất cả ({data.total})
            </button>
            {data.groups.map((g) => {
              const key = unitKey(g.company_unit);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setUnitFilter(key)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${unitFilter === key
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                  {g.company_unit?.name ?? 'Chưa gán pháp nhân'} ({g.count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {todayCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-pink-50 border border-pink-100 text-sm font-medium text-pink-700">
          <CakeIcon className="h-5 w-5" />
          Hôm nay có {todayCount} nhân sự sinh nhật
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>
      )}

      {loading && !data ? (
        <div className="text-center py-16 text-sm text-gray-500">Đang tải...</div>
      ) : !error && visibleGroups.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <CakeIcon className="h-10 w-10 text-gray-300 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">
            {keyword ? 'Không có nhân sự phù hợp.' : `Không có nhân sự sinh nhật trong ${MONTH_NAMES[month - 1].toLowerCase()}/${year}.`}
          </p>
        </div>
      ) : (
        visibleGroups.map((g) => (
          <div key={unitKey(g.company_unit)} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <BuildingOffice2Icon className="h-5 w-5 text-primary-600" />
                <h2 className="text-base font-bold text-gray-900">{g.company_unit?.name ?? 'Chưa gán pháp nhân'}</h2>
              </div>
              <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full">
                {g.employees.length} nhân sự
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2.5">Ngày sinh nhật</th>
                    <th className="px-4 py-2.5">Nhân sự</th>
                    <th className="px-4 py-2.5">Phòng ban</th>
                    <th className="px-4 py-2.5">Vị trí</th>
                    <th className="px-4 py-2.5 text-right">Tuổi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {g.employees.map((e) => {
                    const state = dayState(e);
                    return (
                      <tr key={e.id} className={state === 'today' ? 'bg-pink-50' : state === 'past' ? 'text-gray-400' : ''}>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="font-semibold tabular-nums">{pad(e.day)}/{pad(month)}</span>
                          {state === 'today' && (
                            <span className="ml-2 text-xs font-semibold text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full">
                              Hôm nay
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {e.avatar_url ? (
                              <img src={e.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {e.full_name.trim().split(/\s+/).pop()?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className={`font-medium ${state === 'past' ? '' : 'text-gray-900'}`}>{e.full_name}</div>
                              <div className="text-xs text-gray-500">{e.employee_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">{e.department_name ?? '—'}</td>
                        <td className="px-4 py-2.5">{e.position_title ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{e.age}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default EmployeeBirthdays;
