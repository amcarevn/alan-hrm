import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  UserGroupIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { doctorAPI } from '../utils/api/ctv.api';
import type { Doctor } from '../utils/api/types';
import ConfirmDialog from '../components/ConfirmDialog';
import { SelectBox } from '../components/LandingLayout/SelectBox';

// ─── Form Modal ───────────────────────────────────────────────────────────────

interface DoctorFormProps {
  initialData?: Doctor;
  onClose: () => void;
  onSaved: () => void;
}

function DoctorForm({ initialData, onClose, onSaved }: DoctorFormProps) {
  const mode = initialData ? 'edit' : 'create';
  const [name, setName] = useState(initialData?.name ?? '');
  const [note, setNote] = useState(initialData?.note ?? '');
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Vui lòng nhập tên bác sĩ'); return; }
    setLoading(true);
    setError('');
    try {
      if (mode === 'create') {
        await doctorAPI.create({ name: name.trim(), note: note.trim(), is_active: isActive });
      } else {
        await doctorAPI.update(initialData!.id, { name: name.trim(), note: note.trim(), is_active: isActive });
      }
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-colors';

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
              {mode === 'create'
                ? <PlusIcon className="w-5 h-5 text-primary-600" />
                : <PencilSquareIcon className="w-5 h-5 text-primary-600" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {mode === 'create' ? 'Thêm bác sĩ mới' : 'Chỉnh sửa bác sĩ'}
              </h2>
              <p className="text-xs text-gray-600 font-medium mt-0.5">
                {mode === 'create'
                  ? 'Điền thông tin để tạo bác sĩ mới'
                  : <span>Đang chỉnh sửa: <span className="font-bold text-gray-900">{initialData?.name ?? ''}</span></span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-primary-700 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block" />
              Thông tin bác sĩ
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên bác sĩ <span className="text-primary-500">*</span>
              </label>
              <input
                type="text"
                className={inputCls}
                placeholder="Nhập tên bác sĩ..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
              <textarea
                rows={3}
                className={inputCls + ' resize-none'}
                placeholder="Ghi chú về bác sĩ..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-primary-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-gray-700">{isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}</span>
            </div> */}
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/80 rounded-b-2xl">
          <button type="button" onClick={onClose} disabled={loading}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
            Hủy
          </button>
          <button onClick={handleSubmit} disabled={loading || !name.trim()}
            className={`min-w-[130px] px-5 py-2 text-sm rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${
              !loading && name.trim()
                ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
            {loading && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
            {loading ? 'Đang lưu...' : mode === 'create' ? 'Tạo mới' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DoctorList() {
  const { user } = useAuth();
  const isSuperAdmin = !!(user?.is_superuser || user?.is_super_admin || user?.hrm_user?.is_super_admin);
  const isAdminLike =
    isSuperAdmin ||
    user?.hrm_user?.is_hr ||
    user?.employee_profile?.is_hr ||
    user?.role?.toUpperCase() === 'ADMIN' ||
    user?.role?.toUpperCase() === 'HR' ||
    user?.hrm_user?.can_manage_doctor ||
    user?.employee_permission?.can_manage_doctor;

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'true' | 'false'>('');

  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params: { is_active?: boolean; search?: string } = {};
      if (statusFilter === 'true') params.is_active = true;
      if (statusFilter === 'false') params.is_active = false;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const data = await doctorAPI.list(params);
      setDoctors(data);
    } catch (err: any) {
      console.error('Error fetching doctors:', err?.response?.data || err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [searchTerm, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await doctorAPI.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchDoctors();
    } catch (err) {
      console.error('Error deleting doctor:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const openCreate = () => { setEditingDoctor(undefined); setShowForm(true); };
  const openEdit = (doc: Doctor) => { setEditingDoctor(doc); setShowForm(true); };
  const handleSaved = () => { setShowForm(false); fetchDoctors(); };

  const activeCount = doctors.filter(d => d.is_active).length;
  const inactiveCount = doctors.filter(d => !d.is_active).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Quản lý Bác sĩ</h1>
          <p className="text-sm text-gray-500">Danh sách bác sĩ phụ trách theo dõi cộng tác viên.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {/* Stats cards */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Thống kê bác sĩ</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-blue-500 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Tổng bác sĩ</p>
              <p className="text-2xl font-extrabold text-blue-600 mt-1">{doctors.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-emerald-500 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Đang hoạt động</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{activeCount}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-gray-400 shadow-sm p-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Ngừng hoạt động</p>
              <p className="text-2xl font-extrabold text-gray-500 mt-1">{inactiveCount}</p>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-6 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="Tên bác sĩ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="min-w-[160px]">
              <SelectBox<string>
                label="Trạng thái"
                value={statusFilter}
                options={[
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'true', label: 'Đang hoạt động' },
                  { value: 'false', label: 'Ngừng hoạt động' },
                ]}
                onChange={(val) => setStatusFilter(val as '' | 'true' | 'false')}
              />
            </div>
            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 pb-2">
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-600" />
                Đang tải...
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Danh sách bác sĩ</h2>
            <p className="text-gray-500 text-sm">Tổng số: {doctors.length} bác sĩ</p>
          </div>
          {isAdminLike && (
            <button
              onClick={openCreate}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Thêm bác sĩ
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Tên bác sĩ', 'Ghi chú', 'Trạng thái', 'Ngày tạo'].map((col) => (
                    <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <UserGroupIcon className="h-7 w-7" />
                      </div>
                      <p className="text-lg font-medium text-gray-900">Chưa có bác sĩ nào</p>
                      <p className="text-gray-500 mt-1">Bắt đầu bằng cách thêm bác sĩ mới hoặc điều chỉnh bộ lọc.</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['#', 'Tên bác sĩ', 'Ghi chú', 'Trạng thái', 'Ngày tạo', ...(isAdminLike ? ['Thao tác'] : [])].map((col) => (
                      <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {doctors.map((doc, idx) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{idx + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                      </td>
                      <td className="px-6 py-4 max-w-[280px]">
                        <span className="text-sm text-gray-600 block truncate" title={doc.note || ''}>{doc.note || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {doc.is_active ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">Đang hoạt động</span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Ngừng hoạt động</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      {isAdminLike && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEdit(doc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors"
                            >
                              <PencilSquareIcon className="w-3.5 h-3.5" />
                              Sửa
                            </button>
                            <button
                              onClick={() => setDeleteTarget(doc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                              Xóa
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <DoctorForm
          initialData={editingDoctor}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa bác sĩ"
        message={`Bạn có chắc muốn xóa bác sĩ "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        loading={deleteLoading}
        variant="danger"
      />
    </div>
  );
}
