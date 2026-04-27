import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  TrophyIcon,
  ArrowPathIcon,
  UserIcon,
  ClockIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { attendanceService, AttendanceRankingEntry } from '../services/attendance.service';
import { SelectBox } from '../components/LandingLayout/SelectBox';

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

type SortField = 'rank_early' | 'rank_on_time' | 'early_days' | 'total_early_minutes' | 'avg_early_minutes' | 'on_time_days' | 'total_working_days';

const AttendanceRanking: React.FC = () => {
  const { user } = useAuth();
  const now = new Date();

  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [rankType, setRankType] = useState<'early' | 'on_time'>('early');
  const [top, setTop] = useState<number>(10);
  const [rankings, setRankings] = useState<AttendanceRankingEntry[]>([]);
  const [myRanking, setMyRanking] = useState<AttendanceRankingEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [computeMessage, setComputeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sortField, setSortField] = useState<SortField>('rank_early');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const userRole = user?.role?.toUpperCase() ?? 'USER';
  const isSuperAdmin = user?.is_super_admin || (user as any)?.is_superuser || false;
  const isHR = isSuperAdmin || userRole === 'ADMIN' || userRole === 'HR';

  const employeeId: number | undefined = (user as any)?.employee_profile?.id ?? (user as any)?.hrm_user?.id;

  const fetchRankings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, myData] = await Promise.all([
        attendanceService.getRanking({ year, month, type: rankType, top: top > 0 ? top : undefined }),
        employeeId
          ? attendanceService.getRanking({ year, month, type: rankType, employee_id: employeeId })
          : Promise.resolve([] as AttendanceRankingEntry[]),
      ]);
      setRankings(data);
      const myEntry = myData.length > 0 ? myData[0] : null;
      setMyRanking(myEntry);
    } catch {
      setError('Không thể tải dữ liệu bảng xếp hạng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, rankType, top, employeeId]);

  const handleCompute = async () => {
    setComputing(true);
    setComputeMessage(null);
    try {
      await attendanceService.computeRanking(year, month);
      setComputeMessage({ type: 'success', text: `Đã tính xếp hạng cho tháng ${month}/${year} thành công!` });
      await fetchRankings();
    } catch {
      setComputeMessage({ type: 'error', text: 'Tính xếp hạng thất bại. Vui lòng thử lại.' });
    } finally {
      setComputing(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedRankings = [...rankings].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    // Always place null/undefined values at the end regardless of sort direction
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const getRankDisplay = (rank: number | null | undefined) => {
    if (rank === null || rank === undefined) return '—';
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <ChevronUpIcon className="h-3 w-3 text-gray-300 inline ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUpIcon className="h-3 w-3 text-primary-500 inline ml-1" />
      : <ChevronDownIcon className="h-3 w-3 text-primary-500 inline ml-1" />;
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bảng xếp hạng chấm công</h1>
        <p className="text-gray-600 mt-2">Thống kê nhân viên đi sớm và đúng giờ theo tháng</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Year */}
          <div className="w-24">
            <SelectBox<number>
              label="Năm"
              value={year}
              options={yearOptions.map(y => ({ value: y, label: String(y) }))}
              onChange={setYear}
            />
          </div>

          {/* Month */}
          <div className="w-32">
            <SelectBox<number>
              label="Tháng"
              value={month}
              options={MONTH_NAMES.map((name, idx) => ({ value: idx + 1, label: name }))}
              onChange={setMonth}
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              <ClockIcon className="h-3.5 w-3.5 inline mr-1" />Loại xếp hạng
            </label>
            <div className="flex rounded-md border border-gray-300 overflow-hidden">
              <button
                onClick={() => setRankType('early')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${rankType === 'early' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                🌅 Đi sớm
              </button>
              <button
                onClick={() => setRankType('on_time')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${rankType === 'on_time' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                ✅ Đúng giờ
              </button>
            </div>
          </div>

          {/* Top N */}
          <div className="w-28">
            <SelectBox<number>
              label="Top N"
              value={top}
              options={[
                { value: 5, label: 'Top 5' },
                { value: 10, label: 'Top 10' },
                { value: 20, label: 'Top 20' },
                { value: 50, label: 'Top 50' },
                { value: 0, label: 'Tất cả' },
              ]}
              onChange={setTop}
            />
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchRankings}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>

          {/* Compute button - HR/admin only */}
          {isHR && (
            <button
              onClick={handleCompute}
              disabled={computing || loading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              <TrophyIcon className={`h-4 w-4 ${computing ? 'animate-pulse' : ''}`} />
              {computing ? 'Đang tính...' : 'Tính xếp hạng'}
            </button>
          )}
        </div>

        {/* Compute message */}
        {computeMessage && (
          <div
            className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${
              computeMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {computeMessage.text}
          </div>
        )}
      </div>

      {/* My ranking card */}
      {myRanking && (
        <div className="bg-indigo-50 rounded-lg border border-indigo-100 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Xếp hạng của bạn — {MONTH_NAMES[month - 1]} {year}
          </h2>
          <div className="flex flex-wrap gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-700">
                {getRankDisplay(myRanking.rank_early)}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">Hạng đi sớm</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-700">
                {getRankDisplay(myRanking.rank_on_time)}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">Hạng đúng giờ</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{myRanking.early_days}</div>
              <div className="text-xs text-gray-600 mt-0.5">Ngày đi sớm</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{myRanking.total_early_minutes}</div>
              <div className="text-xs text-gray-600 mt-0.5">Phút đi sớm</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{myRanking.on_time_days}</div>
              <div className="text-xs text-gray-600 mt-0.5">Ngày đúng giờ</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{myRanking.total_working_days}</div>
              <div className="text-xs text-gray-600 mt-0.5">Tổng ngày làm</div>
            </div>
          </div>
        </div>
      )}

      {/* Rankings table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            {rankType === 'early' ? '🌅 Bảng xếp hạng đi sớm' : '✅ Bảng xếp hạng đúng giờ'} — {MONTH_NAMES[month - 1]} {year}
          </h2>
          <span className="text-xs text-gray-500">{rankings.length} nhân viên</span>
        </div>

        {error && (
          <div className="px-5 py-4 text-sm text-red-600 bg-red-50">{error}</div>
        )}

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">
            <ArrowPathIcon className="h-6 w-6 animate-spin mx-auto mb-2 text-primary-400" />
            Đang tải dữ liệu...
          </div>
        ) : rankings.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">
            <TrophyIcon className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>Chưa có dữ liệu xếp hạng cho tháng này.</p>
            {isHR && (
              <p className="mt-1 text-xs text-gray-400">Nhấn <strong>Tính xếp hạng</strong> để tạo dữ liệu.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort(rankType === 'early' ? 'rank_early' : 'rank_on_time')}
                  >
                    Hạng <SortIcon field={rankType === 'early' ? 'rank_early' : 'rank_on_time'} />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nhân viên
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phòng ban
                  </th>
                  {rankType === 'early' ? (
                    <>
                      <th
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('early_days')}
                      >
                        Ngày đi sớm <SortIcon field="early_days" />
                      </th>
                      <th
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('total_early_minutes')}
                      >
                        Tổng phút sớm <SortIcon field="total_early_minutes" />
                      </th>
                      <th
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('avg_early_minutes')}
                      >
                        TB phút/ngày <SortIcon field="avg_early_minutes" />
                      </th>
                    </>
                  ) : (
                    <>
                      <th
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('on_time_days')}
                      >
                        Ngày đúng giờ <SortIcon field="on_time_days" />
                      </th>
                      <th
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('total_working_days')}
                      >
                        Tổng ngày làm <SortIcon field="total_working_days" />
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sortedRankings.map((entry, idx) => {
                  const rank = rankType === 'early' ? entry.rank_early : entry.rank_on_time;
                  const isTopThree = rank !== null && rank !== undefined && rank <= 3;
                  return (
                    <tr
                      key={`${entry.employee_id}-${entry.year}-${entry.month}`}
                      className={`${isTopThree ? 'bg-yellow-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-50 transition-colors`}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        <span className={`text-lg ${isTopThree ? '' : 'text-gray-600'}`}>
                          {getRankDisplay(rank)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{entry.full_name}</div>
                        <div className="text-xs text-gray-500">{entry.employee_code}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.department ?? '—'}
                      </td>
                      {rankType === 'early' ? (
                        <>
                          <td className="px-4 py-3 text-right text-sm font-medium text-primary-700">
                            {entry.early_days} ngày
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-purple-700">
                            {entry.total_early_minutes} phút
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {entry.avg_early_minutes?.toFixed(1) ?? '—'} phút
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-right text-sm font-medium text-green-700">
                            {entry.on_time_days} ngày
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {entry.total_working_days} ngày
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceRanking;

