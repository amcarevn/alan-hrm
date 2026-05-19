import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
  NoSymbolIcon,
  UserGroupIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import {
  recruitmentService,
  CandidateListItem,
  CandidateCreateData,
  CandidateSource,
} from '../../services/recruitment.service';
import { SelectBox } from '../../components/LandingLayout/SelectBox';
import ConfirmDialog from '../../components/ConfirmDialog';

const SOURCE_OPTIONS: { value: CandidateSource; label: string }[] = [
  { value: 'DIRECT', label: 'Ứng tuyển trực tiếp' },
  { value: 'REFERRAL', label: 'Giới thiệu nội bộ' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'TOPCV', label: 'TopCV' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'WEBSITE', label: 'Website công ty' },
  { value: 'ITVIEC', label: 'ITViec' },
  { value: 'VIETNAMWORKS', label: 'VietnamWorks' },
  { value: 'HEADHUNTER', label: 'Headhunter' },
  { value: 'OTHER', label: 'Khác' },
];

interface CandidateFormState {
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  address: string;
  cv_url: string;
  skills: string;
  experience_years: string;
  experience_summary: string;
  education: string;
  current_company: string;
  current_position: string;
  expected_salary: string;
  source: CandidateSource;
  tags: string;
  notes: string;
}

const EMPTY_FORM: CandidateFormState = {
  full_name: '',
  email: '',
  phone: '',
  gender: '',
  date_of_birth: '',
  address: '',
  cv_url: '',
  skills: '',
  experience_years: '',
  experience_summary: '',
  education: '',
  current_company: '',
  current_position: '',
  expected_salary: '',
  source: 'DIRECT',
  tags: '',
  notes: '',
};

const RecruitmentCandidates: React.FC = () => {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [blacklistFilter, setBlacklistFilter] = useState<string>('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CandidateFormState>(EMPTY_FORM);

  // Unblacklist confirm
  const [unblacklistConfirmId, setUnblacklistConfirmId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Blacklist modal
  const [blacklistId, setBlacklistId] = useState<number | null>(null);
  const [blacklistReason, setBlacklistReason] = useState('');

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const params: { search?: string; source?: CandidateSource; blacklisted?: boolean } = {};
      if (searchTerm) params.search = searchTerm;
      if (sourceFilter !== 'all') params.source = sourceFilter as CandidateSource;
      if (blacklistFilter === 'blacklisted') params.blacklisted = true;
      if (blacklistFilter === 'active') params.blacklisted = false;
      const data = await recruitmentService.listCandidates(params);
      setCandidates(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách ứng viên';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, sourceFilter, blacklistFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchCandidates, 300);
    return () => clearTimeout(timer);
  }, [fetchCandidates]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = async (id: number) => {
    try {
      const c = await recruitmentService.getCandidate(id);
      setEditingId(id);
      setForm({
        full_name: c.full_name,
        email: c.email,
        phone: c.phone,
        gender: c.gender,
        date_of_birth: c.date_of_birth ?? '',
        address: c.address,
        cv_url: c.cv_url,
        skills: c.skills,
        experience_years: c.experience_years != null ? String(c.experience_years) : '',
        experience_summary: c.experience_summary,
        education: c.education,
        current_company: c.current_company,
        current_position: c.current_position,
        expected_salary: c.expected_salary ?? '',
        source: c.source,
        tags: c.tags,
        notes: c.notes,
      });
      setFormError(null);
      setShowModal(true);
    } catch {
      alert('Không thể tải thông tin ứng viên');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setFormError('Vui lòng nhập họ tên');
      return;
    }
    if (!form.email.trim()) {
      setFormError('Vui lòng nhập email');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const data: CandidateCreateData = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone || undefined,
        gender: form.gender || undefined,
        date_of_birth: form.date_of_birth || undefined,
        address: form.address || undefined,
        cv_url: form.cv_url || undefined,
        skills: form.skills || undefined,
        experience_years: form.experience_years ? parseInt(form.experience_years) : undefined,
        experience_summary: form.experience_summary || undefined,
        education: form.education || undefined,
        current_company: form.current_company || undefined,
        current_position: form.current_position || undefined,
        expected_salary: form.expected_salary ? parseFloat(form.expected_salary) : undefined,
        source: form.source,
        tags: form.tags || undefined,
        notes: form.notes || undefined,
      };
      if (editingId) {
        await recruitmentService.updateCandidate(editingId, data);
      } else {
        await recruitmentService.createCandidate(data);
      }
      setShowModal(false);
      await fetchCandidates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu thất bại';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleBlacklist = async () => {
    if (!blacklistId) return;
    try {
      await recruitmentService.blacklistCandidate(blacklistId, blacklistReason);
      setBlacklistId(null);
      setBlacklistReason('');
      await fetchCandidates();
    } catch {
      alert('Thao tác thất bại');
    }
  };

  const handleUnblacklist = async (id: number) => {
    try {
      await recruitmentService.unblacklistCandidate(id);
      setUnblacklistConfirmId(null);
      await fetchCandidates();
    } catch {
      alert('Thao tác thất bại');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Ứng viên</h1>
            <p className="text-xs text-gray-600">Quản lý hồ sơ ứng viên</p>
          </div>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          Thêm ứng viên
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field pl-9 pr-4 py-2 text-sm"
              placeholder="Tìm theo tên, email, SĐT..."
            />
          </div>
          <div className="w-48">
            <SelectBox<string>
              label=""
              value={sourceFilter}
              options={[
                { value: 'all', label: 'Tất cả nguồn' },
                ...SOURCE_OPTIONS.map(o => ({ value: o.value as string, label: o.label })),
              ]}
              onChange={setSourceFilter}
            />
          </div>
          <div className="w-44">
            <SelectBox<string>
              label=""
              value={blacklistFilter}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'active', label: 'Đang hoạt động' },
                { value: 'blacklisted', label: 'Blacklist' },
              ]}
              onChange={setBlacklistFilter}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl border border-red-100 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="h-12 w-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <UserGroupIcon className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">Chưa có ứng viên nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header px-4 py-3 text-left">Ứng viên</th>
                  <th className="table-header px-4 py-3 text-left">Vị trí hiện tại</th>
                  <th className="table-header px-4 py-3 text-left">KN (năm)</th>
                  <th className="table-header px-4 py-3 text-left">Nguồn</th>
                  <th className="table-header px-4 py-3 text-left">Đơn ứng tuyển</th>
                  <th className="table-header px-4 py-3 text-left">Trạng thái</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {candidates.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{c.full_name}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                      {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    </td>
                    <td className="table-cell px-4 py-3">
                      {c.current_position || '—'}
                      {c.current_company && (
                        <p className="text-xs text-gray-400">{c.current_company}</p>
                      )}
                    </td>
                    <td className="table-cell px-4 py-3 text-center">
                      {c.experience_years ?? '—'}
                    </td>
                    <td className="table-cell px-4 py-3">{c.source_display}</td>
                    <td className="table-cell px-4 py-3 text-center">
                      {c.application_count}
                    </td>
                    <td className="px-4 py-3">
                      {c.is_blacklisted ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          Blacklist
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          Hoạt động
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(c.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <PencilSquareIcon className="h-3.5 w-3.5" />
                          Sửa
                        </button>
                        {c.is_blacklisted ? (
                          <button
                            onClick={() => setUnblacklistConfirmId(c.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                            title="Xóa khỏi blacklist"
                          >
                            <CheckIcon className="h-3.5 w-3.5" />
                            Gỡ BL
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setBlacklistId(c.id);
                              setBlacklistReason('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                            title="Thêm vào blacklist"
                          >
                            <NoSymbolIcon className="h-3.5 w-3.5" />
                            Blacklist
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-bold text-gray-900">
                {editingId ? 'Cập nhật ứng viên' : 'Thêm ứng viên mới'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="h-8 w-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Họ tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <SelectBox<string>
                    label="Giới tính"
                    value={form.gender}
                    options={[
                      { value: '', label: '—' },
                      { value: 'M', label: 'Nam' },
                      { value: 'F', label: 'Nữ' },
                      { value: 'O', label: 'Khác' },
                    ]}
                    onChange={v => setForm(f => ({ ...f, gender: v }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kinh nghiệm (năm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.experience_years}
                    onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Công ty hiện tại</label>
                  <input
                    type="text"
                    value={form.current_company}
                    onChange={e => setForm(f => ({ ...f, current_company: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí hiện tại</label>
                  <input
                    type="text"
                    value={form.current_position}
                    onChange={e => setForm(f => ({ ...f, current_position: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <SelectBox<CandidateSource>
                    label="Nguồn"
                    value={form.source}
                    options={SOURCE_OPTIONS}
                    onChange={v => setForm(f => ({ ...f, source: v }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lương mong muốn (đ)
                  </label>
                  <input
                    type="number"
                    value={form.expected_salary}
                    onChange={e => setForm(f => ({ ...f, expected_salary: e.target.value }))}
                    className="input-field w-full"
                    placeholder="VD: 20000000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL CV</label>
                <input
                  type="url"
                  value={form.cv_url}
                  onChange={e => setForm(f => ({ ...f, cv_url: e.target.value }))}
                  className="input-field w-full"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kỹ năng</label>
                <input
                  type="text"
                  value={form.skills}
                  onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
                  className="input-field w-full"
                  placeholder="Python, Django, PostgreSQL..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Học vấn</label>
                <input
                  type="text"
                  value={form.education}
                  onChange={e => setForm(f => ({ ...f, education: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}
            </form>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Hủy
              </button>
              <button
                type="submit"
                form=""
                disabled={saving}
                onClick={handleSubmit}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckIcon className="h-4 w-4" />
                )}
                {editingId ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Blacklist Modal */}
      {blacklistId !== null && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Thêm vào Blacklist</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-3">Nhập lý do blacklist ứng viên này:</p>
              <textarea
                rows={3}
                value={blacklistReason}
                onChange={e => setBlacklistReason(e.target.value)}
                className="input-field w-full"
                placeholder="VD: Vi phạm hợp đồng tại công ty cũ"
              />
            </div>
            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setBlacklistId(null)}
                className="btn-secondary"
              >
                Hủy
              </button>
              <button
                onClick={handleBlacklist}
                className="btn-danger"
              >
                Blacklist
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Unblacklist Confirm */}
      <ConfirmDialog
        open={unblacklistConfirmId !== null}
        title="Xóa khỏi Blacklist"
        message="Bạn có chắc muốn xóa ứng viên này khỏi blacklist không?"
        onConfirm={() => unblacklistConfirmId !== null && handleUnblacklist(unblacklistConfirmId)}
        onClose={() => setUnblacklistConfirmId(null)}
      />
    </div>
  );
};

export default RecruitmentCandidates;
