import React, { useEffect, useState } from 'react';
import {
  PlusIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  XMarkIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import Pagination from '../components/Pagination';
import { SelectBox } from '../components/LandingLayout/SelectBox';
import { useDebounce } from '../hooks/useDebounce';
import onboardingService from '../services/onboarding.service';
import FeedbackDialog, { FeedbackVariant } from '../components/FeedbackDialog';
import ConfirmDialog from '../components/ConfirmDialog';

// ============================================
// TYPES & CONSTANTS
// ============================================

type DocumentTemplate = {
  id: number;
  template_name: string;
  document_type: string;
  document_type_display: string;
  description: string;
  file: string;
  file_url?: string;
  is_required: boolean;
  requires_signature: boolean;
  is_active: boolean;
  apply_to_all_new_onboarding: boolean;
  usage_count: number;
  created_by_name: string | null;
  created_at: string;
};

const DOCUMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả loại' },
  { value: 'CONTRACT', label: 'Hợp đồng' },
  { value: 'REGULATION', label: 'Nội quy công ty' },
  { value: 'HANDBOOK', label: 'Sổ tay nhân viên' },
  { value: 'FORM', label: 'Mẫu biểu' },
  { value: 'TRAINING', label: 'Tài liệu đào tạo' },
  { value: 'SAFETY', label: 'An toàn lao động' },
  { value: 'POLICY', label: 'Chính sách công ty' },
  { value: 'OTHER', label: 'Khác' },
];

const DOCUMENT_TYPE_OPTIONS_NO_ALL = DOCUMENT_TYPE_OPTIONS.filter(o => o.value !== '');

const getDocumentTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    CONTRACT: 'bg-blue-100 text-blue-800',
    REGULATION: 'bg-purple-100 text-purple-800',
    HANDBOOK: 'bg-green-100 text-green-800',
    FORM: 'bg-yellow-100 text-yellow-800',
    TRAINING: 'bg-orange-100 text-orange-800',
    SAFETY: 'bg-red-100 text-red-800',
    POLICY: 'bg-indigo-100 text-indigo-800',
    OTHER: 'bg-gray-100 text-gray-800',
  };
  return colors[type] || colors.OTHER;
};

const formatDate = (s: string) => {
  try { return new Date(s).toLocaleDateString('vi-VN'); }
  catch { return s; }
};

// ============================================
// FORM DIALOG
// ============================================

interface FormDialogProps {
  open: boolean;
  editing: DocumentTemplate | null;
  onClose: () => void;
  onSaved: (action: 'create' | 'update') => void;
  onError: (title: string, message: string) => void;
}

const DocumentTemplateFormDialog: React.FC<FormDialogProps> = ({ open, editing, onClose, onSaved, onError }) => {
  const [templateName, setTemplateName] = useState('');
  const [documentType, setDocumentType] = useState('REGULATION');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [applyToAll, setApplyToAll] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTemplateName(editing.template_name);
      setDocumentType(editing.document_type);
      setDescription(editing.description || '');
      setIsRequired(editing.is_required);
      setRequiresSignature(editing.requires_signature);
      setIsActive(editing.is_active);
      setApplyToAll(editing.apply_to_all_new_onboarding);
      setFile(null);
    } else {
      setTemplateName('');
      setDocumentType('REGULATION');
      setDescription('');
      setIsRequired(true);
      setRequiresSignature(false);
      setIsActive(true);
      setApplyToAll(true);
      setFile(null);
    }
    setError('');
  }, [open, editing]);

  const validate = (): string => {
    if (!templateName.trim()) return 'Vui lòng nhập tên tài liệu';
    if (!editing && !file) return 'Vui lòng chọn file tài liệu';
    return '';
  };

  const handleSave = async () => {
    const errMsg = validate();
    if (errMsg) { setError(errMsg); return; }
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('template_name', templateName.trim());
      formData.append('document_type', documentType);
      formData.append('description', description);
      formData.append('is_required', String(isRequired));
      formData.append('requires_signature', String(requiresSignature));
      formData.append('is_active', String(isActive));
      formData.append('apply_to_all_new_onboarding', String(applyToAll));
      if (file) formData.append('file', file);

      if (editing) {
        await onboardingService.updateTemplate(editing.id, formData);
      } else {
        await onboardingService.createTemplate(formData);
      }
      onSaved(editing ? 'update' : 'create');
      onClose();
    } catch (e: any) {
      const data = e?.response?.data;
      const msg = typeof data === 'string' ? data
        : data?.detail || data?.error
        || (typeof data === 'object' ? JSON.stringify(data) : '')
        || e?.message || 'Có lỗi xảy ra';
      onError(
        editing ? 'Không thể cập nhật template' : 'Không thể tạo template',
        msg
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {editing ? 'Chỉnh sửa template tài liệu' : 'Thêm template tài liệu mới'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên tài liệu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="VD: Cam kết đọc hiểu nội quy công ty"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <SelectBox
            label="Loại tài liệu *"
            value={documentType}
            options={DOCUMENT_TYPE_OPTIONS_NO_ALL}
            onChange={(v) => setDocumentType(v)}
            placeholder="Chọn loại tài liệu"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú về tài liệu..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File tài liệu {!editing && <span className="text-red-500">*</span>}
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm file:font-medium hover:file:bg-blue-100"
            />
            <p className="mt-1 text-xs text-gray-500">Hỗ trợ PDF, DOC, DOCX</p>
            {editing && !file && (
              <p className="mt-1 text-xs text-gray-500">Giữ file cũ nếu không chọn file mới</p>
            )}
            {editing?.file_url && (
              <a
                href={editing.file_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <DocumentArrowDownIcon className="w-3 h-3" />
                Tải file hiện tại
              </a>
            )}
          </div>

          <div className="space-y-3 bg-gray-50 rounded-lg p-4">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded" />
              <div>
                <span className="text-sm font-medium text-gray-900">Bắt buộc</span>
                <p className="text-xs text-gray-500">Nhân viên phải đọc tài liệu này</p>
              </div>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={requiresSignature} onChange={(e) => setRequiresSignature(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded" />
              <div>
                <span className="text-sm font-medium text-gray-900">Yêu cầu ký</span>
                <p className="text-xs text-gray-500">Tài liệu cần được ký xác nhận</p>
              </div>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded" />
              <div>
                <span className="text-sm font-medium text-gray-900">Tự động áp dụng cho onboarding mới</span>
                <p className="text-xs text-gray-500">Template sẽ được clone vào mọi hồ sơ onboarding mới tạo</p>
              </div>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded" />
              <div>
                <span className="text-sm font-medium text-gray-900">Đang sử dụng</span>
                <p className="text-xs text-gray-500">Chỉ template đang sử dụng mới hiện trong thư viện</p>
              </div>
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50">
          <button onClick={onClose} disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Huỷ
          </button>
          <button onClick={handleSave} disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Thêm mới'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const DocumentTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [filterType, setFilterType] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const debouncedSearch = useDebounce(filterSearch, 400);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<DocumentTemplate | null>(null);

  const [feedback, setFeedback] = useState<{
    open: boolean; variant: FeedbackVariant; title: string; message?: string;
  }>({ open: false, variant: 'success', title: '' });

  const [deleteTarget, setDeleteTarget] = useState<DocumentTemplate | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [detailTemplate, setDetailTemplate] = useState<DocumentTemplate | null>(null);

  const showFeedback = (variant: FeedbackVariant, title: string, message?: string) => {
    setFeedback({ open: true, variant, title, message });
  };

  // ============================================
  // API
  // ============================================

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await onboardingService.getTemplates({
        page: currentPage,
        page_size: itemsPerPage,
        document_type: filterType || undefined,
        search: debouncedSearch.trim() || undefined,
      });
      const list = Array.isArray(data) ? data : (data as any).results || [];
      const count = Array.isArray(data) ? data.length : (data as any).count || list.length;
      setTemplates(list);
      setTotalCount(count);
    } catch (e) {
      console.error(e);
      showFeedback('error', 'Lỗi', 'Không thể tải danh sách template.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, filterType, debouncedSearch]);

  const openCreate = () => { setEditing(null); setShowDialog(true); };
  const openEdit = (tpl: DocumentTemplate) => { setEditing(tpl); setShowDialog(true); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await onboardingService.deleteTemplate(deleteTarget.id);
      const name = deleteTarget.template_name;
      setDeleteTarget(null);
      await fetchTemplates();
      showFeedback('success', 'Xoá thành công', `Template "${name}" đã được xoá.`);
    } catch (e: any) {
      setDeleteTarget(null);
      showFeedback('error', 'Xoá thất bại', e?.response?.data?.detail || e?.message || 'Có lỗi xảy ra.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleActive = async (tpl: DocumentTemplate) => {
    try {
      const result = await onboardingService.toggleTemplateActive(tpl.id);
      if (!result.success) { showFeedback('error', 'Lỗi', result.message); return; }
      showFeedback('success', 'Thành công', result.message);
      fetchTemplates();
    } catch (e: any) {
      showFeedback('error', 'Lỗi', e?.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const handleSync = async (tpl: DocumentTemplate) => {
    try {
      const result = await onboardingService.syncTemplateToActive(tpl.id);
      if (!result.success) { showFeedback('error', 'Lỗi', result.message); return; }
      showFeedback('success', 'Đồng bộ thành công', result.message);
      fetchTemplates();
    } catch (e: any) {
      showFeedback('error', 'Lỗi', e?.response?.data?.message || 'Đồng bộ thất bại');
    }
  };

  const handleTemplateSaved = (action: 'create' | 'update') => {
    fetchTemplates();
    showFeedback('success',
      action === 'create' ? 'Thêm thành công' : 'Cập nhật thành công',
      action === 'create' ? 'Template mới đã được tạo.' : 'Thay đổi đã được lưu.'
    );
  };

  const hasFilter = filterType !== '' || filterSearch !== '';

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Template tài liệu Onboarding
          </h1>
          <p className="text-gray-500 text-sm">Tổng: {totalCount} template</p>
        </div>
        <button onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2">
          <PlusIcon className="w-4 h-4" />
          Thêm template
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="w-52">
          <SelectBox
            label="Loại tài liệu"
            value={filterType}
            options={DOCUMENT_TYPE_OPTIONS}
            onChange={(v) => { setFilterType(v); setCurrentPage(1); }}
          />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium mb-1 text-gray-700">Tìm kiếm</label>
          <div className="relative">
            <input type="text" value={filterSearch}
              onChange={(e) => { setFilterSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Tên hoặc mô tả..."
              className="border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            />
            <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {hasFilter && (
          <button onClick={() => { setFilterType(''); setFilterSearch(''); setCurrentPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600">
            Xoá bộ lọc
          </button>
        )}

        <button onClick={fetchTemplates} disabled={loading}
          className="ml-auto px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center gap-1.5 disabled:opacity-50">
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Tên template', 'Loại', 'Bắt buộc', 'Yêu cầu ký', 'Auto-apply', 'Số lần dùng', 'Trạng thái', 'Người tạo', 'Ngày tạo', 'Thao tác'].map(h => (
                <th key={h} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-500">Đang tải...</td></tr>
            ) : templates.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-500">Chưa có template nào.</td></tr>
            ) : (
              templates.map(tpl => (
                <tr key={tpl.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium max-w-[250px] truncate text-center" title={tpl.template_name}>
                    {tpl.template_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDocumentTypeColor(tpl.document_type)}`}>
                      {tpl.document_type_display || tpl.document_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tpl.is_required
                      ? <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200">Bắt buộc</span>
                      : <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-50 text-gray-400 border border-gray-200">Không</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tpl.requires_signature
                      ? <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">Yêu cầu ký</span>
                      : <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-50 text-gray-400 border border-gray-200">Không</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tpl.apply_to_all_new_onboarding
                      ? <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">Tự động</span>
                      : <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-50 text-gray-400 border border-gray-200">Thủ công</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{tpl.usage_count} lần</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${tpl.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                      {tpl.is_active ? 'Đang dùng' : 'Không dùng'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap text-center">{tpl.created_by_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap text-center">{formatDate(tpl.created_at)}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap text-center">
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <button onClick={() => setDetailTemplate(tpl)}
                        className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
                        Chi tiết
                      </button>
                      {tpl.file_url && (
                        <a href={tpl.file_url} target="_blank" rel="noreferrer"
                          className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 inline-flex items-center gap-1">
                          <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                          Tải
                        </a>
                      )}
                      <button onClick={() => openEdit(tpl)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50">
                        Sửa
                      </button>
                      <button onClick={() => handleToggleActive(tpl)}
                        className={`px-2.5 py-1 text-xs font-medium bg-white border rounded hover:opacity-80 ${tpl.is_active ? 'text-yellow-700 border-yellow-300 hover:bg-yellow-50' : 'text-green-700 border-green-300 hover:bg-green-50'}`}>
                        {tpl.is_active ? 'Tắt' : 'Bật'}
                      </button>
                      <button onClick={() => handleSync(tpl)}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-white border border-indigo-300 rounded hover:bg-indigo-50 inline-flex items-center gap-1"
                        title="Đồng bộ tới tất cả onboarding đang active">
                        <CloudArrowUpIcon className="w-3.5 h-3.5" />
                        Sync
                      </button>
                      <button onClick={() => setDeleteTarget(tpl)}
                        className="px-2.5 py-1 text-xs font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50">
                        Xoá
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 mb-6">
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalCount / itemsPerPage) || 1}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={(page: number) => setCurrentPage(page)}
          onItemsPerPageChange={(size: number) => { setItemsPerPage(size); setCurrentPage(1); }}
        />
      </div>

      {/* Form Dialog */}
      <DocumentTemplateFormDialog
        open={showDialog}
        editing={editing}
        onClose={() => setShowDialog(false)}
        onSaved={handleTemplateSaved}
        onError={(title, msg) => showFeedback('error', title, msg)}
      />

      {/* Detail Dialog */}
      {detailTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Chi tiết template</h3>
              <button onClick={() => setDetailTemplate(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                <div className="sm:col-span-3">
                  <dt className="text-gray-500 font-medium">Tên template</dt>
                  <dd className="text-gray-900 mt-1 font-semibold">{detailTemplate.template_name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Loại tài liệu</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDocumentTypeColor(detailTemplate.document_type)}`}>
                      {detailTemplate.document_type_display || detailTemplate.document_type}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Người tạo</dt>
                  <dd className="text-gray-900 mt-1">{detailTemplate.created_by_name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Ngày tạo</dt>
                  <dd className="text-gray-900 mt-1">{formatDate(detailTemplate.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Trạng thái</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${detailTemplate.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                      {detailTemplate.is_active ? 'Đang dùng' : 'Không dùng'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Bắt buộc</dt>
                  <dd className="text-gray-900 mt-1">{detailTemplate.is_required ? 'Có' : 'Không'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Yêu cầu ký</dt>
                  <dd className="text-gray-900 mt-1">{detailTemplate.requires_signature ? 'Có' : 'Không'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Auto-apply</dt>
                  <dd className="text-gray-900 mt-1">{detailTemplate.apply_to_all_new_onboarding ? 'Tự động' : 'Thủ công'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Số lần dùng</dt>
                  <dd className="text-gray-900 mt-1">{detailTemplate.usage_count}</dd>
                </div>
                <div className="sm:col-span-3">
                  <dt className="text-gray-500 font-medium">Mô tả</dt>
                  <dd className="text-gray-900 mt-1 whitespace-pre-wrap">
                    {detailTemplate.description || <span className="text-gray-400 italic">Không có mô tả</span>}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50">
              {detailTemplate.file_url && (
                <a
                  href={detailTemplate.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-1.5"
                >
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  Tải file
                </a>
              )}
              <button onClick={() => { const tpl = detailTemplate; setDetailTemplate(null); openEdit(tpl); }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 inline-flex items-center gap-1.5">
                Sửa
              </button>
              <button onClick={() => setDetailTemplate(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={feedback.open}
        variant={feedback.variant}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback(f => ({ ...f, open: false }))}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title="Xoá template"
        message={deleteTarget ? `Bạn có chắc muốn xoá template "${deleteTarget.template_name}"? Hành động này không thể hoàn tác.` : undefined}
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default DocumentTemplates;
