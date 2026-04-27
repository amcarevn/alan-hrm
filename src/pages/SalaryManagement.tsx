import React, { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  UserIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  TableCellsIcon,
  ExclamationCircleIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { departmentsAPI, employeesAPI } from '../utils/api';
import type { Department, Employee } from '../utils/api';
import { salaryService, SalaryFormulaUpdateData, SalaryRecord } from '../services/salary.service';
import { SelectBox } from '../components/LandingLayout/SelectBox';

const TABS = [
  { key: 'config', label: 'Cấu hình lương', icon: CurrencyDollarIcon },
  { key: 'view', label: 'Bảng lương phòng ban', icon: TableCellsIcon },
];

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('vi-VN') + 'đ';
};

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('vi-VN');
};

// ─── Salary Formula Edit Modal ────────────────────────────────────────────────

interface EditModalProps {
  employee: Employee;
  onClose: () => void;
  onSave: (id: number, data: SalaryFormulaUpdateData) => Promise<void>;
  saving: boolean;
}

const EditSalaryModal: React.FC<EditModalProps> = ({ employee, onClose, onSave, saving }) => {
  const [basicSalary, setBasicSalary] = useState<string>(
    employee.basic_salary != null ? String(employee.basic_salary) : ''
  );
  const [allowance, setAllowance] = useState<string>(
    employee.allowance != null ? String(employee.allowance) : ''
  );
  const [salaryNotes, setSalaryNotes] = useState<string>(employee.salary_notes ?? '');
  const [allowanceNotes, setAllowanceNotes] = useState<string>(employee.allowance_notes ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: SalaryFormulaUpdateData = {};
    if (basicSalary !== '') data.basic_salary = parseFloat(basicSalary) || 0;
    if (allowance !== '') data.allowance = parseFloat(allowance) || 0;
    data.salary_notes = salaryNotes;
    data.allowance_notes = allowanceNotes;
    await onSave(employee.id, data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Cấu hình lương</h2>
            <p className="text-sm text-gray-500">{employee.full_name} · {employee.employee_id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lương cơ bản (đ)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phụ cấp (đ)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={allowance}
                onChange={(e) => setAllowance(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú lương
            </label>
            <textarea
              value={salaryNotes}
              onChange={(e) => setSalaryNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ghi chú về lương..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú phụ cấp
            </label>
            <textarea
              value={allowanceNotes}
              onChange={(e) => setAllowanceNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ghi chú về phụ cấp..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <CheckIcon className="h-4 w-4" />
              )}
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SalaryManagement: React.FC = () => {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<'config' | 'view'>('config');

  // ── Tab 1: Salary config state ──
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [searchEmployee, setSearchEmployee] = useState('');
  const [deptFilterConfig, setDeptFilterConfig] = useState<string>('');
  const [configPage, setConfigPage] = useState(1);
  const [configTotal, setConfigTotal] = useState(0);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Tab 2: Salary view state ──
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [deptFilterView, setDeptFilterView] = useState<string>('');
  const [searchSalary, setSearchSalary] = useState('');

  // ── Shared ──
  const [departments, setDepartments] = useState<Department[]>([]);

  const PAGE_SIZE = 20;

  // Load departments
  useEffect(() => {
    departmentsAPI.list({ page_size: 100 })
      .then((res) => setDepartments(res.results))
      .catch(() => {});
  }, []);

  // Load employees for Tab 1
  const loadEmployees = useCallback(async (page = 1) => {
    setLoadingEmployees(true);
    try {
      const params: Record<string, unknown> = {
        page,
        page_size: PAGE_SIZE,
        ordering: 'full_name',
      };
      if (searchEmployee) params.search = searchEmployee;
      if (deptFilterConfig) params.department = parseInt(deptFilterConfig, 10);

      const res = await employeesAPI.list(params);
      setEmployees(res.results);
      setConfigTotal(res.count);
      setConfigPage(page);
    } catch {
      // ignore
    } finally {
      setLoadingEmployees(false);
    }
  }, [searchEmployee, deptFilterConfig]);

  useEffect(() => {
    if (activeTab === 'config') {
      loadEmployees(1);
    }
  }, [activeTab, loadEmployees]);

  // Load salary for Tab 2
  const loadSalary = useCallback(async () => {
    setLoadingSalary(true);
    setSalaryError(null);
    try {
      const res = await salaryService.getSalaryByDepartment({
        year: selectedYear,
        month: selectedMonth,
        department_id: deptFilterView ? parseInt(deptFilterView, 10) : undefined,
        employee_code: searchSalary || undefined,
      });
      setSalaryRecords(res.results ?? []);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error?.response?.status === 404) {
        setSalaryError('Chưa có dữ liệu bảng lương cho tháng này.');
      } else {
        setSalaryError('Không thể tải dữ liệu bảng lương. Vui lòng thử lại.');
      }
      setSalaryRecords([]);
    } finally {
      setLoadingSalary(false);
    }
  }, [selectedYear, selectedMonth, deptFilterView, searchSalary]);

  useEffect(() => {
    if (activeTab === 'view') {
      loadSalary();
    }
  }, [activeTab, loadSalary]);

  // Save salary formula
  const handleSave = async (id: number, data: SalaryFormulaUpdateData) => {
    setSaving(true);
    setSaveError(null);
    const employeeName = editEmployee?.full_name ?? 'nhân viên';
    try {
      await salaryService.updateSalaryFormula(id, data);
      setSaveSuccess(`Đã cập nhật lương cho ${employeeName}`);
      setEditEmployee(null);
      loadEmployees(configPage);
    } catch {
      setSaveError('Không thể cập nhật. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const totalConfigPages = Math.ceil(configTotal / PAGE_SIZE);

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý tính lương</h1>
        <p className="text-gray-600 mt-2">Cấu hình công thức lương và xem bảng lương theo phòng ban</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'config' | 'view')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toast notifications */}
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          <CheckIcon className="h-4 w-4 flex-shrink-0" />
          {saveSuccess}
          <button className="ml-auto" onClick={() => setSaveSuccess(null)}>
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      {saveError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
          {saveError}
          <button className="ml-auto" onClick={() => setSaveError(null)}>
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div>
        {/* ── TAB 1: Salary Config ── */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên hoặc mã nhân viên..."
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={deptFilterConfig}
                    onChange={(e) => setDeptFilterConfig(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">Tất cả phòng ban</option>
                    {departments.map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loadingEmployees ? (
                <div className="flex items-center justify-center py-16">
                  <ArrowPathIcon className="h-6 w-6 text-primary-400 animate-spin" />
                  <span className="ml-2 text-sm text-gray-500">Đang tải...</span>
                </div>
              ) : employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <UserIcon className="h-10 w-10 mb-2" />
                  <p className="text-sm">Không tìm thấy nhân viên nào.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nhân viên
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phòng ban / Vị trí
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lương cơ bản
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phụ cấp
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ghi chú
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {employees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-semibold text-gray-700">
                                  {emp.full_name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{emp.full_name}</p>
                                <p className="text-xs text-gray-500 font-mono">{emp.employee_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm text-gray-700 flex items-center gap-1">
                                <BuildingOfficeIcon className="h-3.5 w-3.5 text-gray-400" />
                                {emp.department?.name ?? '—'}
                              </p>
                              {emp.position && (
                                <p className="text-xs text-gray-500 mt-0.5">{emp.position.title}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-medium ${emp.basic_salary ? 'text-gray-900' : 'text-gray-400'}`}>
                              {formatCurrency(emp.basic_salary)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-medium ${emp.allowance ? 'text-gray-900' : 'text-gray-400'}`}>
                              {formatCurrency(emp.allowance)}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="text-xs text-gray-500 truncate">{emp.salary_notes ?? '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setEditEmployee(emp)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
                            >
                              <PencilIcon className="h-3.5 w-3.5" />
                              Chỉnh sửa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalConfigPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Trang {configPage} / {totalConfigPages} · {configTotal} nhân viên
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadEmployees(configPage - 1)}
                      disabled={configPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => loadEmployees(configPage + 1)}
                      disabled={configPage === totalConfigPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: Salary View ── */}
        {activeTab === 'view' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Tháng:</label>
                  <div className="w-32">
                    <SelectBox<number>
                      label=""
                      value={selectedMonth}
                      options={monthOptions.map((m) => ({ value: m, label: `Tháng ${m}` }))}
                      onChange={setSelectedMonth}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Năm:</label>
                  <div className="w-24">
                    <SelectBox<number>
                      label=""
                      value={selectedYear}
                      options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
                      onChange={setSelectedYear}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="w-48">
                    <SelectBox<string>
                      label=""
                      value={deptFilterView}
                      options={[
                        { value: '', label: 'Tất cả phòng ban' },
                        ...departments.map((d) => ({ value: String(d.id), label: d.name })),
                      ]}
                      onChange={setDeptFilterView}
                    />
                  </div>
                </div>
                <div className="flex-1 relative min-w-48">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã nhân viên..."
                    value={searchSalary}
                    onChange={(e) => setSearchSalary(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <button
                  onClick={loadSalary}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Tải dữ liệu
                </button>
              </div>
            </div>

            {/* Salary Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loadingSalary ? (
                <div className="flex items-center justify-center py-16">
                  <ArrowPathIcon className="h-6 w-6 text-primary-400 animate-spin" />
                  <span className="ml-2 text-sm text-gray-500">Đang tải bảng lương...</span>
                </div>
              ) : salaryError ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <ExclamationCircleIcon className="h-10 w-10 mb-2 text-amber-400" />
                  <p className="text-sm text-gray-500">{salaryError}</p>
                </div>
              ) : salaryRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <TableCellsIcon className="h-10 w-10 mb-2" />
                  <p className="text-sm">Không có dữ liệu bảng lương.</p>
                  <p className="text-xs mt-1">Chọn tháng/năm và nhấn &quot;Tải dữ liệu&quot; để xem.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                          Nhân viên
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phòng ban
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lương CB
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phụ cấp
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tổng công
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tăng ca
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tổng phạt
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider bg-indigo-50">
                          Thực lĩnh
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {salaryRecords.map((rec) => (
                        <tr key={rec.employee_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-3 sticky left-0 bg-white">
                            <p className="font-medium text-gray-900">{rec.ho_va_ten}</p>
                            <p className="text-xs text-gray-500 font-mono">{rec.ma_nv}</p>
                          </td>
                          <td className="px-3 py-3 text-gray-600">{rec.phong_ban ?? '—'}</td>
                          <td className="px-3 py-3 text-right text-gray-700">
                            {formatCurrency(rec.luong_co_ban)}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-700">
                            {formatCurrency(rec.phu_cap)}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-700">
                            {formatNumber(rec.tong_cong)}
                          </td>
                          <td className="px-3 py-3 text-right text-blue-600">
                            {formatNumber(rec.tang_ca)}
                          </td>
                          <td className="px-3 py-3 text-right text-red-600">
                            {formatCurrency(rec.tong_phat)}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-indigo-700 bg-indigo-50">
                            {formatCurrency(rec.luong_thuc_linh)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editEmployee && (
        <EditSalaryModal
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
};

export default SalaryManagement;
