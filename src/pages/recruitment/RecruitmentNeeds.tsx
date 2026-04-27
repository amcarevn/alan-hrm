import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { SelectBox } from '../../components/LandingLayout/SelectBox';
import {
  recruitmentService,
  RecruitmentNeedListItem,
  RecruitmentNeedCreateData,
  EmploymentType,
} from '../../services/recruitment.service';

const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: 'FULL_TIME', label: 'Toàn thời gian' },
  { value: 'PART_TIME', label: 'Bán thời gian' },
  { value: 'CONTRACT', label: 'Hợp đồng' },
  { value: 'INTERN', label: 'Thực tập' },
  { value: 'COLLABORATOR', label: 'Cộng tác viên' },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  FILLED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

interface FormState {
  position_name: string;
  headcount: string;
  employment_type: EmploymentType;
  expected_salary_min: string;
  expected_salary_max: string;
  reason: string;
  target_onboard_date: string;
}

const EMPTY_FORM: FormState = {
  position_name: '',
  headcount: '1',
  employment_type: 'FULL_TIME',
  expected_salary_min: '',
  expected_salary_max: '',
  reason: '',
  target_onboard_date: '',
};

const RecruitmentNeeds: React.FC = () => {
  const [needs, setNeeds] = useState<RecruitmentNeedListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchNeeds = async () => {
    try {
      setLoading(true);
      const data = await recruitmentService.listNeeds();
      setNeeds(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách nhu cầu tuyển dụng';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNeeds();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = async (need: RecruitmentNeedListItem) => {
    try {
      const full = await recruitmentService.getNeed(need.id);
      setEditingId(full.id);
      setForm({
        position_name: full.position_name,
        headcount: String(full.headcount),
        employment_type: full.employment_type,
        expected_salary_min: full.expected_salary_min ?? '',
        expected_salary_max: full.expected_salary_max ?? '',
        reason: full.reason,
        target_onboard_date: full.target_onboard_date ?? '',
      });
      setFormError(null);
      setShowModal(true);
    } catch {
      alert('Không thể tải thông tin nhu cầu tuyển dụng');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.position_name.trim()) {
      setFormError('Vui lòng nhập tên vị trí');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const data: RecruitmentNeedCreateData = {
        position_name: form.position_name.trim(),
        headcount: parseInt(form.headcount) || 1,
        employment_type: form.employment_type,
        reason: form.reason.trim(),
        target_onboard_date: form.target_onboard_date || undefined,
        expected_salary_min: form.expected_salary_min ? parseFloat(form.expected_salary_min) : undefined,
        expected_salary_max: form.expected_salary_max ? parseFloat(form.expected_salary_max) : undefined,
      };
      if (editingId) {
        await recruitmentService.updateNeed(editingId, data);
      } else {
        await recruitmentService.createNeed(data);
      }
      setShowModal(false);
      await fetchNeeds();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu thất bại';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await recruitmentService.deleteNeed(id);
      setDeleteConfirmId(null);
      await fetchNeeds();
    } catch {
      alert('Xóa thất bại');
    }
  };

  const filteredNeeds = needs.filter(n =>
    statusFilter === 'all' ? true : n.status === statusFilter,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nhu cầu tuyển dụng</h1>
          <p className="text-gray-600 mt-2">Quản lý yêu cầu tuyển dụng từ phòng ban</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          Thêm nhu cầu
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'Tất cả' },
          { value: 'OPEN', label: 'Đang mở' },
          { value: 'IN_PROGRESS', label: 'Đang tuyển' },
          { value: 'FILLED', label: 'Đã tuyển đủ' },
          { value: 'CANCELLED', label: 'Đã hủy' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === opt.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredNeeds.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Chưa có nhu cầu tuyển dụng nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vị trí</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phòng ban</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SL</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày onboard</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tạo lúc</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredNeeds.map(need => (
                <tr key={need.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{need.position_name}</p>
                    {need.position_display && need.position_display !== need.position_name && (
                      <p className="text-xs text-gray-400">{need.position_display}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{need.department_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-center">{need.headcount}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{need.employment_type_display}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[need.status] ?? 'bg-gray-100 text-gray-800'}`}
                    >
                      {need.status_display}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {need.target_onboard_date
                      ? new Date(need.target_onboard_date).toLocaleDateString('vi-VN')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(need.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(need)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(need.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Xóa"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Cập nhật nhu cầu' : 'Thêm nhu cầu tuyển dụng'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên vị trí <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.position_name}
                  onChange={e => setForm(f => ({ ...f, position_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="VD: Backend Developer"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                  <input
                    type="number"
                    min="1"
                    value={form.headcount}
                    onChange={e => setForm(f => ({ ...f, headcount: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <SelectBox<EmploymentType>
                    label="Hình thức"
                    value={form.employment_type}
                    options={EMPLOYMENT_TYPE_OPTIONS}
                    onChange={v => setForm(f => ({ ...f, employment_type: v }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lương tối thiểu (đ)
                  </label>
                  <input
                    type="number"
                    value={form.expected_salary_min}
                    onChange={e => setForm(f => ({ ...f, expected_salary_min: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="VD: 15000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lương tối đa (đ)
                  </label>
                  <input
                    type="number"
                    value={form.expected_salary_max}
                    onChange={e => setForm(f => ({ ...f, expected_salary_max: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="VD: 25000000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày onboard dự kiến
                </label>
                <input
                  type="date"
                  value={form.target_onboard_date}
                  onChange={e => setForm(f => ({ ...f, target_onboard_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lý do tuyển</label>
                <textarea
                  rows={2}
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Mô tả lý do tuyển dụng..."
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? (
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckIcon className="h-4 w-4" />
                  )}
                  {editingId ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Xác nhận xóa</h3>
            <p className="text-sm text-gray-600 mb-4">
              Bạn có chắc muốn xóa nhu cầu tuyển dụng này không?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentNeeds;
