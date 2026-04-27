import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
  ClockIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  UserIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {
  companyConfigAPI,
  type ShiftConfig,
  employeesAPI,
  departmentsAPI,
  positionsAPI,
} from '../utils/api';

const SEARCH_RESULTS_LIMIT = 10;
const MAX_SHIFTS_LOAD = 200;

type ConfigMode = 'landing' | 'individual' | 'position' | 'department';

const ShiftConfiguration: React.FC = () => {
  const [mode, setMode] = useState<ConfigMode>('landing');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const goBack = () => {
    setMode('landing');
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="mb-6">
          {mode !== 'landing' && (
            <button
              onClick={goBack}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 text-sm font-medium"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Quay lại
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Cấu hình ca làm</h1>
        </div>

        {/* Priority Rules Banner */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800 mb-1">Quy chế ưu tiên ca làm</p>
              <div className="flex flex-wrap items-center gap-1 text-sm text-blue-700">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-medium">
                  Cá nhân
                </span>
                <ChevronRightIcon className="h-3 w-3" />
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-medium">
                  Vị trí
                </span>
                <ChevronRightIcon className="h-3 w-3" />
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-400 text-white text-xs font-medium">
                  Phòng ban
                </span>
                <ChevronRightIcon className="h-3 w-3" />
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-300 text-white text-xs font-medium">
                  Toàn công ty
                </span>
              </div>
              <p className="mt-1 text-xs text-blue-600">
                Ca làm gán trực tiếp cho cá nhân có độ ưu tiên cao nhất. Nếu không có, hệ thống áp
                dụng ca của vị trí → phòng ban → toàn công ty.
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 flex items-start">
            <XMarkIcon className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Lỗi</p>
              <p className="mt-0.5 text-sm text-red-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-4 flex items-start">
            <CheckIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Views */}
        {mode === 'landing' && (
          <LandingView onSelect={setMode} />
        )}
        {mode === 'individual' && (
          <IndividualMode
            setError={setError}
            showSuccess={showSuccess}
          />
        )}
        {mode === 'position' && (
          <EntityMode
            type="position"
            setError={setError}
            showSuccess={showSuccess}
          />
        )}
        {mode === 'department' && (
          <EntityMode
            type="department"
            setError={setError}
            showSuccess={showSuccess}
          />
        )}
    </div>
  );
};

// ─── Landing View ────────────────────────────────────────────────────────────

const LandingView: React.FC<{ onSelect: (mode: ConfigMode) => void }> = ({ onSelect }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <button
      onClick={() => onSelect('individual')}
      className="group flex flex-col items-center p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow transition-all text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 group-hover:bg-blue-600 transition-colors">
        <UserIcon className="h-7 w-7 text-blue-600 group-hover:text-white transition-colors" />
      </div>
      <p className="font-semibold text-gray-900 mb-1">Cá nhân</p>
      <p className="text-xs text-gray-500">Gán ca làm cho từng nhân viên (ưu tiên cao nhất)</p>
    </button>

    <button
      onClick={() => onSelect('position')}
      className="group flex flex-col items-center p-6 bg-white rounded-lg border border-gray-200 hover:border-indigo-400 hover:shadow transition-all text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 group-hover:bg-indigo-600 transition-colors">
        <BriefcaseIcon className="h-7 w-7 text-indigo-600 group-hover:text-white transition-colors" />
      </div>
      <p className="font-semibold text-gray-900 mb-1">Vị trí</p>
      <p className="text-xs text-gray-500">Áp dụng ca cho toàn bộ nhân viên ở một vị trí</p>
    </button>

    <button
      onClick={() => onSelect('department')}
      className="group flex flex-col items-center p-6 bg-white rounded-lg border border-gray-200 hover:border-purple-400 hover:shadow transition-all text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 group-hover:bg-purple-600 transition-colors">
        <BuildingOfficeIcon className="h-7 w-7 text-purple-600 group-hover:text-white transition-colors" />
      </div>
      <p className="font-semibold text-gray-900 mb-1">Phòng ban</p>
      <p className="text-xs text-gray-500">Áp dụng ca cho toàn bộ nhân viên trong phòng ban</p>
    </button>
  </div>
);

// ─── Shift Card ───────────────────────────────────────────────────────────────

const ShiftCard: React.FC<{
  shift: ShiftConfig;
  highlight?: boolean;
  action?: React.ReactNode;
}> = ({ shift, highlight, action }) => (
  <div
    className={`flex items-center justify-between p-4 rounded-lg border ${
      highlight ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
    }`}
  >
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
        <ClockIcon className="h-5 w-5 text-gray-600" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900 text-sm truncate">{shift.name}</p>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600">
            {shift.code}
          </span>
          {highlight && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
              Phù hợp
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {shift.start_time} – {shift.end_time} · {shift.total_hours}h
          {shift.shift_type_display ? ` · ${shift.shift_type_display}` : ''}
        </p>
      </div>
    </div>
    {action && <div className="ml-3 flex-shrink-0">{action}</div>}
  </div>
);

// ─── Individual Mode ──────────────────────────────────────────────────────────

const IndividualMode: React.FC<{
  setError: (e: string | null) => void;
  showSuccess: (m: string) => void;
}> = ({ setError, showSuccess }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [currentShifts, setCurrentShifts] = useState<ShiftConfig[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [allShifts, setAllShifts] = useState<ShiftConfig[]>([]);
  const [loadingAllShifts, setLoadingAllShifts] = useState(false);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [assigning, setAssigning] = useState<number | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced employee search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await employeesAPI.list({ search: query.trim(), page_size: SEARCH_RESULTS_LIMIT });
        setResults(res.results || []);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Load all shifts once
  useEffect(() => {
    setLoadingAllShifts(true);
    companyConfigAPI
      .listShiftConfigs({ page_size: MAX_SHIFTS_LOAD, is_current: 'all' })
      .then((res) => setAllShifts(res.results || []))
      .catch(() => setAllShifts([]))
      .finally(() => setLoadingAllShifts(false));
  }, []);

  const selectEmployee = async (emp: any) => {
    setSelectedEmployee(emp);
    setQuery(emp.full_name);
    setShowDropdown(false);
    setError(null);
    setLoadingShifts(true);
    try {
      const res: any = await companyConfigAPI.getEmployeeShiftConfigs(emp.id);
      const shifts: ShiftConfig[] = Array.isArray(res) ? res : res?.results ?? [];
      setCurrentShifts(shifts);
    } catch {
      setCurrentShifts([]);
    } finally {
      setLoadingShifts(false);
    }
  };

  const assignShift = async (shift: ShiftConfig) => {
    if (!selectedEmployee) return;
    setAssigning(shift.id);
    setError(null);
    try {
      await companyConfigAPI.assignShiftConfig(shift.id, {
        employee_ids: [selectedEmployee.id],
      });
      showSuccess(`Đã gán ca "${shift.name}" cho ${selectedEmployee.full_name}`);
      // Refresh current shifts
      const res: any = await companyConfigAPI.getEmployeeShiftConfigs(selectedEmployee.id);
      setCurrentShifts(Array.isArray(res) ? res : res?.results ?? []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Lỗi khi gán ca làm');
    } finally {
      setAssigning(null);
    }
  };

  const removeShift = async (shift: ShiftConfig) => {
    if (!selectedEmployee) return;
    setRemoving(shift.id);
    setError(null);
    try {
      await companyConfigAPI.removeEmployeeFromShift(shift.id, selectedEmployee.id);
      showSuccess(`Đã xóa ca "${shift.name}" khỏi ${selectedEmployee.full_name}`);
      setCurrentShifts((prev) => prev.filter((s) => s.id !== shift.id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Lỗi khi xóa ca làm');
    } finally {
      setRemoving(null);
    }
  };

  const assignedIds = new Set(currentShifts.map((s) => s.id));

  const filteredShifts = allShifts.filter((s) => {
    if (assignedIds.has(s.id)) return false;
    if (filterStart && s.start_time !== filterStart) return false;
    if (filterEnd && s.end_time !== filterEnd) return false;
    return true;
  });

  // Highlight shifts that match both time filters when provided
  const isMatch = (s: ShiftConfig) =>
    Boolean(filterStart || filterEnd) &&
    (!filterStart || s.start_time === filterStart) &&
    (!filterEnd || s.end_time === filterEnd);

  const sortedShifts = [...filteredShifts].sort((a, b) =>
    isMatch(b) ? 1 : isMatch(a) ? -1 : 0
  );

  return (
    <div className="space-y-6">
      {/* Employee Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-blue-600" />
          Tìm nhân viên
        </h2>
        <div className="relative" ref={dropdownRef}>
          <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
          {searching && (
            <div className="absolute right-3 top-3 h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selectedEmployee && e.target.value !== selectedEmployee.full_name) {
                setSelectedEmployee(null);
                setCurrentShifts([]);
              }
            }}
            placeholder="Nhập mã hoặc tên nhân viên..."
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
          {showDropdown && results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-60 overflow-y-auto">
              {results.map((emp) => (
                <button
                  key={emp.id}
                  onMouseDown={() => selectEmployee(emp)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                    {emp.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{emp.full_name}</p>
                    <p className="text-xs text-gray-500 font-mono">{emp.employee_id}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {showDropdown && !searching && results.length === 0 && query.trim() && (
            <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg p-4 text-center text-sm text-gray-500">
              Không tìm thấy nhân viên
            </div>
          )}
        </div>

        {selectedEmployee && (
          <div className="mt-3 flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-white font-semibold text-sm">
              {selectedEmployee.full_name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{selectedEmployee.full_name}</p>
              <p className="text-xs text-gray-600 font-mono">{selectedEmployee.employee_id}</p>
            </div>
          </div>
        )}
      </div>

      {/* Current Shifts */}
      {selectedEmployee && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-gray-600" />
            Ca làm hiện tại
          </h2>
          {loadingShifts ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : currentShifts.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Chưa có ca làm nào được gán trực tiếp.</p>
          ) : (
            <div className="space-y-3">
              {currentShifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  action={
                    <button
                      onClick={() => removeShift(shift)}
                      disabled={removing === shift.id}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                      title="Xóa ca làm này khỏi nhân viên"
                    >
                      {removing === shift.id ? (
                        <div className="h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <TrashIcon className="h-4 w-4" />
                      )}
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assign New Shift */}
      {selectedEmployee && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckIcon className="h-5 w-5 text-green-600" />
            Gán ca làm mới
          </h2>

          {/* Time filter */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Giờ check-in (tùy chọn)
              </label>
              <input
                type="time"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Giờ check-out (tùy chọn)
              </label>
              <input
                type="time"
                value={filterEnd}
                onChange={(e) => setFilterEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          {(filterStart || filterEnd) && (
            <button
              onClick={() => { setFilterStart(''); setFilterEnd(''); }}
              className="mb-4 text-xs text-primary-600 hover:underline"
            >
              Xóa bộ lọc
            </button>
          )}

          {loadingAllShifts ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : sortedShifts.length === 0 ? (
            <div className="text-center py-6">
              <InformationCircleIcon className="mx-auto h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">
                {filterStart || filterEnd
                  ? 'Không có ca phù hợp với giờ đã chọn.'
                  : 'Tất cả ca làm đã được gán.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {sortedShifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  highlight={isMatch(shift)}
                  action={
                    <button
                      onClick={() => assignShift(shift)}
                      disabled={assigning === shift.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                      {assigning === shift.id ? (
                        <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckIcon className="h-3.5 w-3.5" />
                      )}
                      Gán
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Entity Mode (Position / Department) ─────────────────────────────────────

const EntityMode: React.FC<{
  type: 'position' | 'department';
  setError: (e: string | null) => void;
  showSuccess: (m: string) => void;
}> = ({ type, setError, showSuccess }) => {
  const isPosition = type === 'position';
  const label = isPosition ? 'vị trí' : 'phòng ban';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [allShifts, setAllShifts] = useState<ShiftConfig[]>([]);
  const [loadingAllShifts, setLoadingAllShifts] = useState(false);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [assigning, setAssigning] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const api = isPosition ? positionsAPI : departmentsAPI;
        const res = await api.list({ search: query.trim(), page_size: SEARCH_RESULTS_LIMIT });
        setResults(res.results || []);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isPosition]);

  useEffect(() => {
    setLoadingAllShifts(true);
    companyConfigAPI
      .listShiftConfigs({ page_size: MAX_SHIFTS_LOAD, is_current: 'all' })
      .then((res) => setAllShifts(res.results || []))
      .catch(() => setAllShifts([]))
      .finally(() => setLoadingAllShifts(false));
  }, []);

  const selectEntity = (entity: any) => {
    setSelectedEntity(entity);
    setQuery(entity.title || entity.name);
    setShowDropdown(false);
    setError(null);
  };

  const assignShift = async (shift: ShiftConfig) => {
    if (!selectedEntity) return;
    setAssigning(shift.id);
    setError(null);
    try {
      const payload = isPosition
        ? { position_ids: [selectedEntity.id] }
        : { department_ids: [selectedEntity.id] };
      await companyConfigAPI.assignShiftConfig(shift.id, payload);
      showSuccess(
        `Đã gán ca "${shift.name}" cho ${label} "${selectedEntity.title || selectedEntity.name}"`
      );
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Lỗi khi gán ca làm');
    } finally {
      setAssigning(null);
    }
  };

  const filteredShifts = allShifts.filter((s) => {
    if (filterStart && s.start_time !== filterStart) return false;
    if (filterEnd && s.end_time !== filterEnd) return false;
    return true;
  });

  const isMatch = (s: ShiftConfig) =>
    Boolean(filterStart || filterEnd) &&
    (!filterStart || s.start_time === filterStart) &&
    (!filterEnd || s.end_time === filterEnd);

  const sortedShifts = [...filteredShifts].sort((a, b) =>
    isMatch(b) ? 1 : isMatch(a) ? -1 : 0
  );

  const IconComp = isPosition ? BriefcaseIcon : BuildingOfficeIcon;

  // Explicit class sets to avoid Tailwind purging dynamic classes
  const iconClass = isPosition ? 'h-5 w-5 text-indigo-600' : 'h-5 w-5 text-purple-600';
  const avatarRingClass = isPosition
    ? 'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm'
    : 'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-semibold text-sm';
  const selectedBannerClass = 'mt-3 flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200';
  const selectedAvatarClass = 'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-white font-semibold text-sm';
  const selectedNameClass = 'text-sm font-semibold text-gray-900';
  const selectedCodeClass = 'text-xs text-gray-500 font-mono';

  return (
    <div className="space-y-6">
      {/* Entity Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <IconComp className={iconClass} />
          Tìm {label}
        </h2>
        <div className="relative" ref={dropdownRef}>
          <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
          {searching && (
            <div className="absolute right-3 top-3 h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selectedEntity) setSelectedEntity(null);
            }}
            placeholder={`Nhập mã hoặc tên ${label}...`}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
          {showDropdown && results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-60 overflow-y-auto">
              {results.map((item) => (
                <button
                  key={item.id}
                  onMouseDown={() => selectEntity(item)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                >
                  <div className={avatarRingClass}>
                    {(item.title || item.name)?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title || item.name}</p>
                    {item.code && (
                      <p className="text-xs text-gray-500 font-mono">{item.code}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          {showDropdown && !searching && results.length === 0 && query.trim() && (
            <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg p-4 text-center text-sm text-gray-500">
              Không tìm thấy {label}
            </div>
          )}
        </div>

        {selectedEntity && (
          <div className={selectedBannerClass}>
            <div className={selectedAvatarClass}>
              {(selectedEntity.title || selectedEntity.name)?.charAt(0) || '?'}
            </div>
            <div>
              <p className={selectedNameClass}>
                {selectedEntity.title || selectedEntity.name}
              </p>
              {selectedEntity.code && (
                <p className={selectedCodeClass}>{selectedEntity.code}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assign Shift */}
      {selectedEntity && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckIcon className="h-5 w-5 text-green-600" />
            Chọn ca làm để gán
          </h2>
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
            Tất cả nhân viên thuộc {label} này sẽ áp dụng ca được chọn (nếu không có ca riêng cá nhân).
          </div>

          {/* Time filter */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Giờ check-in (tùy chọn)
              </label>
              <input
                type="time"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Giờ check-out (tùy chọn)
              </label>
              <input
                type="time"
                value={filterEnd}
                onChange={(e) => setFilterEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          {(filterStart || filterEnd) && (
            <button
              onClick={() => { setFilterStart(''); setFilterEnd(''); }}
              className="mb-4 text-xs text-primary-600 hover:underline"
            >
              Xóa bộ lọc
            </button>
          )}

          {loadingAllShifts ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : sortedShifts.length === 0 ? (
            <div className="text-center py-6">
              <InformationCircleIcon className="mx-auto h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Không có ca nào phù hợp với bộ lọc.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {sortedShifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  highlight={isMatch(shift)}
                  action={
                    <button
                      onClick={() => assignShift(shift)}
                      disabled={assigning === shift.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                      {assigning === shift.id ? (
                        <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckIcon className="h-3.5 w-3.5" />
                      )}
                      Gán
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShiftConfiguration;