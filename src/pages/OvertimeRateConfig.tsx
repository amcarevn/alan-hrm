import React, { useEffect, useState, useCallback } from 'react';
import {
  BuildingOfficeIcon,
  BriefcaseIcon,
  UserIcon,
  AdjustmentsHorizontalIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { departmentsAPI, employeesAPI, positionsAPI } from '../utils/api';
import { Department, Position, Employee } from '../utils/api/types';
import salaryService, { OvertimeRateConfig, OvertimeRateLevel } from '../services/salary.service';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type TabKey = OvertimeRateLevel;

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: Tab[] = [
  { key: 'department', label: 'Phòng ban / Bộ phận', icon: BuildingOfficeIcon },
  { key: 'position',   label: 'Vị trí',              icon: BriefcaseIcon },
  { key: 'employee',   label: 'Cá nhân',             icon: UserIcon },
  { key: 'all',        label: 'Mặc định',            icon: AdjustmentsHorizontalIcon },
];

const EMPTY_FORM = {
  department_ids:    [] as number[],
  position_ids:      [] as number[],
  employee_ids:      [] as number[],
  apply_to_all:      false,
  calc_method:       'FIXED' as 'FIXED' | 'FROM_BASIC',
  rate_per_hour:     0,
  multiplier:        1,
  use_kpi:           false,
  kpi_multiplier:    null as number | null,
  kpi_rate_per_hour: null as number | null,
  kpi_threshold:     100,
  effective_from:    '',
  effective_to:      '' as string,
  is_active:         true,
  notes:             '',
};

type FormState = typeof EMPTY_FORM;

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50/40">
    <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmtMoney(v: number | null | undefined) {
  if (!v) return '—';
  return Number(v).toLocaleString('vi-VN') + ' ₫';
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function toggleId<T extends number>(arr: T[], id: T): T[] {
  return arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

const OvertimeRateConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('department');
  const [rows, setRows]           = useState<OvertimeRateConfig[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');

  // master data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions,   setPositions]   = useState<Position[]>([]);
  const [employees,   setEmployees]   = useState<Employee[]>([]);

  // feedback banners
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  // modal
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<OvertimeRateConfig | null>(null);
  const [form,       setForm]       = useState<FormState>({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);
  const [modalError, setModalError] = useState('');
  const [empSearch,  setEmpSearch]  = useState('');

  // ── load master data once ──────────────────────────────────
  useEffect(() => {
    departmentsAPI.list({ page_size: 500 }).then(r => setDepartments(r.results));
    positionsAPI.list({ page_size: 500 }).then(r => setPositions(r.results));
    employeesAPI.list({ page_size: 1000, is_active: true }).then(r => setEmployees(r.results));
  }, []);

  // ── fetch rows ────────────────────────────────────────────
  const fetchRows = useCallback(async (tab: TabKey) => {
    setLoading(true);
    try {
      const data = await salaryService.listOvertimeRates(tab);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(activeTab); }, [activeTab, fetchRows]);

  // ── filtered rows ─────────────────────────────────────────
  const filteredRows = rows.filter(row => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      row.department_names.some(n => n.toLowerCase().includes(q)) ||
      row.position_names.some(n => n.toLowerCase().includes(q)) ||
      row.employee_names.some(e => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q))
    );
  });

  // ── open modal ────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, apply_to_all: activeTab === 'all' });
    setEmpSearch('');
    setModalError('');
    setShowModal(true);
  }

  function openEdit(row: OvertimeRateConfig) {
    setEditTarget(row);
    setForm({
      department_ids:    row.department_ids,
      position_ids:      row.position_ids,
      employee_ids:      row.employee_ids,
      apply_to_all:      row.apply_to_all,
      calc_method:       row.calc_method ?? 'FIXED',
      rate_per_hour:     row.rate_per_hour,
      multiplier:        row.multiplier ?? 1,
      use_kpi:           row.use_kpi,
      kpi_multiplier:    row.kpi_multiplier,
      kpi_rate_per_hour: row.kpi_rate_per_hour,
      kpi_threshold:     row.kpi_threshold,
      effective_from:    row.effective_from,
      effective_to:      row.effective_to ?? '',
      is_active:         row.is_active,
      notes:             row.notes,
    });
    setEmpSearch('');
    setModalError('');
    setShowModal(true);
  }

  // ── save ──────────────────────────────────────────────────
  async function handleSave() {
    if (!form.effective_from) { setModalError('Vui lòng nhập ngày hiệu lực từ.'); return; }
    if (form.calc_method === 'FIXED' && !form.rate_per_hour) {
      setModalError('Vui lòng nhập đơn giá / giờ.'); return;
    }

    const payload = {
      department_ids:    form.department_ids,
      department_names:  [],
      position_ids:      form.position_ids,
      position_names:    [],
      employee_ids:      form.employee_ids,
      employee_names:    [],
      apply_to_all:      form.apply_to_all,
      calc_method:       form.calc_method,
      rate_per_hour:     form.calc_method === 'FIXED' ? form.rate_per_hour : 0,
      multiplier:        form.multiplier,
      use_kpi:           form.use_kpi,
      kpi_multiplier:    form.use_kpi ? form.kpi_multiplier : null,
      kpi_rate_per_hour: form.use_kpi ? form.kpi_rate_per_hour : null,
      kpi_threshold:     form.use_kpi ? form.kpi_threshold : 100,
      effective_from:    form.effective_from,
      effective_to:      form.effective_to || null,
      is_active:         form.is_active,
      notes:             form.notes,
    };

    setSaving(true);
    setModalError('');
    try {
      if (editTarget) {
        await salaryService.updateOvertimeRate(editTarget.id, payload);
        setSuccessMsg('Đã cập nhật cấu hình tăng ca.');
      } else {
        await salaryService.createOvertimeRate(payload);
        setSuccessMsg('Đã thêm cấu hình tăng ca.');
      }
      setShowModal(false);
      fetchRows(activeTab);
    } catch (e: any) {
      setModalError(e?.response?.data?.detail ?? JSON.stringify(e?.response?.data) ?? 'Lỗi lưu dữ liệu.');
    } finally {
      setSaving(false);
    }
  }

  // ── delete ────────────────────────────────────────────────
  async function handleDelete(id: number) {
    if (!window.confirm('Xác nhận xoá cấu hình này?')) return;
    try {
      await salaryService.deleteOvertimeRate(id);
      setSuccessMsg('Đã xoá cấu hình.');
      fetchRows(activeTab);
    } catch {
      setErrorMsg('Không thể xoá. Vui lòng thử lại.');
    }
  }

  // ── render target badges ──────────────────────────────────
  function renderTarget(row: OvertimeRateConfig) {
    if (row.apply_to_all) return <span className="text-gray-500 italic text-sm">Tất cả nhân viên</span>;
    const parts: React.ReactNode[] = [
      ...row.department_names.map((n, i) => (
        <span key={`d${i}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{n}</span>
      )),
      ...row.position_names.map((n, i) => (
        <span key={`p${i}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">{n}</span>
      )),
      ...row.employee_names.map((e, i) => (
        <span key={`e${i}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">{e.name}</span>
      )),
    ];
    return parts.length ? <div className="flex flex-wrap gap-1">{parts}</div> : <span className="text-gray-400 text-sm">—</span>;
  }

  // ── render effective rate preview ────────────────────────
  function renderRate(row: OvertimeRateConfig) {
    if (row.calc_method === 'FROM_BASIC') {
      const mul = row.multiplier && row.multiplier !== 1 ? ` × ${row.multiplier}` : '';
      return <span className="text-sm text-blue-700 font-medium">LC ÷ công ÷ 7.5h{mul}</span>;
    }
    const effective = row.rate_per_hour * (row.multiplier || 1);
    return (
      <div>
        <p className="text-sm font-medium text-gray-900">{fmtMoney(effective)}</p>
        {row.multiplier && row.multiplier !== 1 && (
          <p className="text-xs text-gray-400">{fmtMoney(row.rate_per_hour)} × {row.multiplier}</p>
        )}
      </div>
    );
  }

  const filteredEmps = employees.filter(e => {
    const q = empSearch.toLowerCase();
    return !q || e.full_name.toLowerCase().includes(q) || e.employee_id.toLowerCase().includes(q);
  });

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cấu hình tăng ca</h1>
        <p className="text-gray-600 mt-2">Thiết lập đơn giá tăng ca theo phòng ban, vị trí và cá nhân với thời gian hiệu lực linh hoạt.</p>
      </div>

      {/* Banners */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          <CheckIcon className="h-4 w-4 flex-shrink-0" />
          {successMsg}
          <button className="ml-auto" onClick={() => setSuccessMsg(null)}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
          {errorMsg}
          <button className="ml-auto" onClick={() => setErrorMsg(null)}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên phòng ban, vị trí, nhân viên..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Thêm cấu hình
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <ArrowPathIcon className="h-6 w-6 text-primary-400 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Đang tải...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <AdjustmentsHorizontalIcon className="h-10 w-10 mb-2" />
            <p className="text-sm">Chưa có cấu hình nào{search ? ' phù hợp' : ''}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Áp dụng cho</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cách tính</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn giá / h</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">KPI</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hiệu lực</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredRows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 max-w-xs">{renderTarget(row)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        row.calc_method === 'FROM_BASIC'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {row.calc_method === 'FROM_BASIC' ? 'Từ LC' : 'Cố định'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{renderRate(row)}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {row.use_kpi ? (
                        <div>
                          <p className="font-medium text-indigo-700">
                            {row.kpi_multiplier ? `×${row.kpi_multiplier}` : fmtMoney(row.kpi_rate_per_hour)}
                          </p>
                          <p className="text-xs text-gray-400">≥ {row.kpi_threshold}%</p>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      <p>{fmtDate(row.effective_from)}</p>
                      <p className="text-xs text-gray-400">→ {row.effective_to ? fmtDate(row.effective_to) : '∞'}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {row.is_active ? 'Đang áp dụng' : 'Tắt'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          Xoá
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
            {filteredRows.length} / {rows.length} cấu hình
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-indigo-50 rounded-t-xl">
              <div>
                <h2 className="text-base font-bold text-indigo-800">
                  {editTarget ? 'Sửa cấu hình tăng ca' : 'Thêm cấu hình tăng ca'}
                </h2>
                <p className="text-sm text-indigo-600 mt-0.5">
                  {TABS.find(t => t.key === activeTab)?.label}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-gray-500 hover:bg-indigo-100 hover:text-indigo-700 transition-colors">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* Section 1: Áp dụng cho */}
              {activeTab !== 'all' && (
                <SectionCard title={`1. Áp dụng cho — ${TABS.find(t => t.key === activeTab)?.label}`}>
                  {activeTab === 'department' && (
                    <div className="border border-gray-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-100 bg-white">
                      {departments.map(d => (
                        <label key={d.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary-600"
                            checked={form.department_ids.includes(d.id)}
                            onChange={() => setForm(f => ({ ...f, department_ids: toggleId(f.department_ids, d.id) }))}
                          />
                          <span className="font-medium">{d.name}</span>
                          {d.is_section && <span className="text-xs text-gray-400">(Bộ phận)</span>}
                        </label>
                      ))}
                    </div>
                  )}

                  {activeTab === 'position' && (
                    <div className="border border-gray-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-100 bg-white">
                      {positions.map(p => (
                        <label key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary-600"
                            checked={form.position_ids.includes(p.id)}
                            onChange={() => setForm(f => ({ ...f, position_ids: toggleId(f.position_ids, p.id) }))}
                          />
                          <span>{p.title}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {activeTab === 'employee' && (
                    <>
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Tìm theo tên hoặc mã nhân viên..."
                          value={empSearch}
                          onChange={e => setEmpSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="border border-gray-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-100 bg-white">
                        {filteredEmps.map(e => (
                          <label key={e.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-primary-600"
                              checked={form.employee_ids.includes(e.id)}
                              onChange={() => setForm(f => ({ ...f, employee_ids: toggleId(f.employee_ids, e.id) }))}
                            />
                            <span className="font-mono text-xs text-gray-500 w-16 shrink-0">{e.employee_id}</span>
                            <span className="font-medium">{e.full_name}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </SectionCard>
              )}

              {activeTab === 'all' && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <AdjustmentsHorizontalIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Cấu hình mặc định</p>
                    <p className="text-xs text-amber-700 mt-0.5">Áp dụng cho tất cả nhân viên chưa có cấu hình cá nhân, vị trí, hoặc phòng ban.</p>
                  </div>
                </div>
              )}

              {/* Section 2: Đơn giá */}
              <SectionCard title="2. Đơn giá tăng ca">
                {/* Calc method */}
                <div className="grid grid-cols-2 gap-2">
                  {(['FIXED', 'FROM_BASIC'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, calc_method: method }))}
                      className={`px-3 py-2.5 text-sm rounded-lg border-2 transition-colors text-left ${
                        form.calc_method === method
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="block font-medium">
                        {method === 'FIXED' ? 'Cố định' : 'Từ lương cơ bản'}
                      </span>
                      <span className="text-xs opacity-70">
                        {method === 'FIXED' ? 'Nhập đơn giá trực tiếp' : 'LC ÷ công chuẩn ÷ 7.5h'}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    {form.calc_method === 'FIXED' ? (
                      <>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Đơn giá / giờ <span className="text-red-500">*</span></label>
                        <input
                          type="number"
                          min={0}
                          value={form.rate_per_hour || ''}
                          onChange={e => setForm(f => ({ ...f, rate_per_hour: Number(e.target.value) }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="VD: 20000"
                        />
                      </>
                    ) : (
                      <div className="flex items-center h-full bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                        <p className="text-xs text-blue-700 leading-relaxed">
                          <span className="font-medium block">LC ÷ công chuẩn ÷ 7.5h</span>
                          Tự động theo lương cơ bản từng nhân viên
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Hệ số nhân
                      <span className="text-gray-400 font-normal ml-1">(mặc định 1)</span>
                    </label>
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={form.multiplier}
                      onChange={e => setForm(f => ({ ...f, multiplier: Number(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {form.calc_method === 'FIXED' && form.multiplier !== 1 && form.rate_per_hour > 0 && (
                      <p className="text-xs text-primary-600 mt-1">
                        = {(form.rate_per_hour * form.multiplier).toLocaleString('vi-VN')}đ/h
                      </p>
                    )}
                    {form.calc_method === 'FROM_BASIC' && form.multiplier !== 1 && (
                      <p className="text-xs text-primary-600 mt-1">
                        = LC ÷ công ÷ 7.5h × {form.multiplier}
                      </p>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* Section 3: KPI */}
              <SectionCard title="3. Hệ số KPI (tuỳ chọn)">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">Áp dụng hệ số khác khi đạt KPI</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, use_kpi: !f.use_kpi }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.use_kpi ? 'bg-primary-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.use_kpi ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {form.use_kpi && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Hệ số × khi đạt KPI <span className="text-gray-400">(VD: 1.5)</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={form.kpi_multiplier ?? ''}
                          onChange={e => setForm(f => ({ ...f, kpi_multiplier: e.target.value ? Number(e.target.value) : null }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="VD: 1.5"
                        />
                        <p className="text-xs text-gray-400 mt-0.5">= đơn giá × hệ số</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Ngưỡng KPI (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.kpi_threshold}
                          onChange={e => setForm(f => ({ ...f, kpi_threshold: Number(e.target.value) }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Hoặc: đơn giá cố định / giờ khi đạt KPI
                        <span className="text-gray-400 font-normal ml-1">(dùng nếu không nhập hệ số ×)</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={form.kpi_rate_per_hour ?? ''}
                        onChange={e => setForm(f => ({ ...f, kpi_rate_per_hour: e.target.value ? Number(e.target.value) : null }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="VD: 30000"
                      />
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* Section 4: Thời gian hiệu lực */}
              <SectionCard title="4. Thời gian hiệu lực">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Từ ngày <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={form.effective_from}
                      onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Đến ngày
                      <span className="text-gray-400 font-normal ml-1">(để trống = vô hạn)</span>
                    </label>
                    <input
                      type="date"
                      value={form.effective_to}
                      onChange={e => setForm(f => ({ ...f, effective_to: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">Đang áp dụng</label>
                </div>
              </SectionCard>

              {/* Section 5: Ghi chú */}
              <SectionCard title="5. Ghi chú">
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Ghi chú thêm về cấu hình này..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </SectionCard>

              {modalError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
                  {modalError}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {saving
                  ? <><ArrowPathIcon className="h-4 w-4 animate-spin" />Đang lưu...</>
                  : <><CheckIcon className="h-4 w-4" />Lưu cấu hình</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OvertimeRateConfigPage;
