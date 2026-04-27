import React, { useEffect, useState } from 'react';
import {
  PlusIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  XMarkIcon,
  DocumentMagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import Pagination from '../components/Pagination';
import { SelectBox } from '../components/LandingLayout/SelectBox';
import { useDebounce } from '../hooks/useDebounce';
import requestTemplateService, { RequestTemplate } from '../services/requestTemplate.service';
import { GenericRequestType } from '../services/genericRequest.service';
import { companyUnitsAPI } from '../utils/api';
import { CompanyUnit } from '../utils/api/types';
import PdfPreviewModal from '../components/Common/PdfPreviewModal';
import FeedbackDialog, { FeedbackVariant } from '../components/FeedbackDialog';
import ConfirmDialog from '../components/ConfirmDialog';

const REQUEST_TYPE_OPTIONS: { value: GenericRequestType | ''; label: string }[] = [
  { value: '', label: 'Tất cả loại đơn' },
  { value: 'RESIGNATION', label: 'Đơn xin nghỉ việc' },
  { value: 'PROPOSAL', label: 'Đơn đề xuất' },
  { value: 'CONFIRMATION', label: 'Đơn xác nhận' },
  { value: 'COMPLAINT', label: 'Đơn khiếu nại / phản ánh' },
  { value: 'OTHER', label: 'Đơn khác' },
];

const REQUEST_TYPE_OPTIONS_NO_ALL = REQUEST_TYPE_OPTIONS.filter((o) => o.value !== '');

const formatDate = (s: string) => {
  try {
    return new Date(s).toLocaleDateString('vi-VN');
  } catch {
    return s;
  }
};

interface DialogProps {
  open: boolean;
  editing: RequestTemplate | null;
  companyUnits: CompanyUnit[];
  onClose: () => void;
  onSaved: (action: 'create' | 'update') => void;
  onError: (title: string, message: string) => void;
}

const TemplateFormDialog: React.FC<DialogProps> = ({ open, editing, companyUnits, onClose, onSaved, onError }) => {
  const [name, setName] = useState('');
  const [requestType, setRequestType] = useState<GenericRequestType>('RESIGNATION');
  const [companyUnitId, setCompanyUnitId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setRequestType(editing.request_type);
      setCompanyUnitId(editing.company_unit);
      setDescription(editing.description || '');
      setIsActive(editing.is_active);
      setFile(null);
    } else {
      setName('');
      setRequestType('RESIGNATION');
      setCompanyUnitId('');
      setDescription('');
      setIsActive(true);
      setFile(null);
    }
    setError('');
  }, [open, editing]);

  const validate = (): string => {
    if (!name.trim()) return 'Vui lòng nhập tên template';
    if (!companyUnitId) return 'Vui lòng chọn đơn vị';
    if (!editing && !file) return 'Vui lòng chọn file Word (.doc hoặc .docx)';
    if (file) {
      const name = file.name.toLowerCase();
      if (!name.endsWith('.doc') && !name.endsWith('.docx')) {
        return 'File phải là định dạng Word (.doc hoặc .docx)';
      }
    }
    return '';
  };

  const handleSave = async () => {
    const errMsg = validate();
    if (errMsg) {
      setError(errMsg);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      if (editing) {
        await requestTemplateService.update(editing.id, {
          name: name.trim(),
          request_type: requestType,
          company_unit: Number(companyUnitId),
          description,
          is_active: isActive,
          ...(file ? { file } : {}),
        });
      } else {
        await requestTemplateService.create({
          name: name.trim(),
          request_type: requestType,
          company_unit: Number(companyUnitId),
          description,
          is_active: isActive,
          file: file!,
        });
      }
      onSaved(editing ? 'update' : 'create');
      onClose();
    } catch (e: any) {
      const data = e?.response?.data;
      const msg = typeof data === 'string' ? data
        : data?.detail
        || (Array.isArray(data?.non_field_errors) ? data.non_field_errors[0] : null)
        || (typeof data === 'object' ? JSON.stringify(data) : '')
        || e?.message
        || 'Có lỗi xảy ra';
      // Đóng form và hiển thị error dialog ở parent để user thấy rõ
      onError(
        editing ? 'Không thể cập nhật template' : 'Không thể thêm template',
        msg
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {editing ? 'Chỉnh sửa template' : 'Thêm template mới'}
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
              Tên template <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Mẫu đơn nghỉ việc Amcare"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectBox<GenericRequestType>
              label="Loại đơn *"
              value={requestType}
              options={REQUEST_TYPE_OPTIONS_NO_ALL as { value: GenericRequestType; label: string }[]}
              onChange={(v) => setRequestType(v)}
            />
            <SelectBox<number | ''>
              label="Đơn vị *"
              value={companyUnitId}
              options={companyUnits.map((u) => ({ value: u.id as number | '', label: u.name }))}
              onChange={(v) => setCompanyUnitId(v)}
              placeholder="-- Chọn đơn vị --"
              searchable
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File template (.doc / .docx) {!editing && <span className="text-red-500">*</span>}
            </label>
            <input
              type="file"
              accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm file:font-medium hover:file:bg-blue-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Hỗ trợ cả file Word cũ (.doc) và mới (.docx). Hệ thống tự động convert .doc sang .docx chuẩn khi upload.
            </p>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú về template..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Đang sử dụng</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Thêm mới'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RequestTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<RequestTemplate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [companyUnits, setCompanyUnits] = useState<CompanyUnit[]>([]);

  const [filterType, setFilterType] = useState<GenericRequestType | ''>('');
  const [filterUnit, setFilterUnit] = useState<number | ''>('');
  const [filterSearch, setFilterSearch] = useState('');
  const debouncedSearch = useDebounce(filterSearch, 400);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<RequestTemplate | null>(null);

  // Detail dialog
  const [detailTemplate, setDetailTemplate] = useState<RequestTemplate | null>(null);

  // PDF preview
  const [previewTemplate, setPreviewTemplate] = useState<RequestTemplate | null>(null);

  // Feedback dialog (thông báo upload / chỉnh sửa / xoá thành công hoặc lỗi)
  const [feedback, setFeedback] = useState<{
    open: boolean;
    variant: FeedbackVariant;
    title: string;
    message?: string;
  }>({ open: false, variant: 'success', title: '' });

  // Confirm dialog xoá template
  const [deleteTarget, setDeleteTarget] = useState<RequestTemplate | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showFeedback = (
    variant: FeedbackVariant,
    title: string,
    message?: string
  ) => {
    setFeedback({ open: true, variant, title, message });
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await requestTemplateService.list({
        page: currentPage,
        page_size: itemsPerPage,
        request_type: filterType || undefined,
        company_unit: filterUnit || undefined,
        search: debouncedSearch.trim() || undefined,
      });
      setTemplates(data.results || []);
      setTotalCount(data.count || 0);
    } catch (e) {
      console.error(e);
      alert('Không thể tải danh sách template.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    companyUnitsAPI.list({ active_only: true, page_size: 100 })
      .then((res: any) => {
        // API có thể trả array thẳng hoặc { results }
        const list = Array.isArray(res) ? res : (res?.results || []);
        setCompanyUnits(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, filterType, filterUnit, debouncedSearch]);

  const openCreate = () => {
    setEditing(null);
    setShowDialog(true);
  };

  const openEdit = (tpl: RequestTemplate) => {
    setEditing(tpl);
    setShowDialog(true);
  };

  const handleDelete = (tpl: RequestTemplate) => {
    setDeleteTarget(tpl);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await requestTemplateService.remove(deleteTarget.id);
      const name = deleteTarget.name;
      setDeleteTarget(null);
      await fetchTemplates();
      showFeedback('success', 'Xoá thành công', `Template "${name}" đã được xoá.`);
    } catch (e: any) {
      setDeleteTarget(null);
      showFeedback(
        'error',
        'Xoá thất bại',
        e?.response?.data?.detail || e?.message || 'Có lỗi xảy ra khi xoá template.'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleTemplateSaved = (action: 'create' | 'update') => {
    fetchTemplates();
    showFeedback(
      'success',
      action === 'create' ? 'Thêm template thành công' : 'Cập nhật template thành công',
      action === 'create'
        ? 'Template mới đã được tạo và sẵn sàng sử dụng.'
        : 'Thay đổi template đã được lưu.'
    );
  };

  const handleTemplateError = (title: string, message: string) => {
    showFeedback('error', title, message);
  };

  const hasFilter = filterType !== '' || filterUnit !== '' || filterSearch !== '';

  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Template đơn từ</h1>
          <p className="text-gray-500 text-sm">Tổng: {totalCount} template</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Thêm template
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="w-52">
          <SelectBox<GenericRequestType | ''>
            label="Loại đơn"
            value={filterType}
            options={REQUEST_TYPE_OPTIONS}
            onChange={(v) => { setFilterType(v); setCurrentPage(1); }}
          />
        </div>
        <div className="w-64">
          <SelectBox<number | ''>
            label="Đơn vị"
            value={filterUnit}
            options={[
              { value: '' as number | '', label: 'Tất cả đơn vị' },
              ...companyUnits.map((u) => ({ value: u.id as number | '', label: u.name })),
            ]}
            onChange={(v) => { setFilterUnit(v); setCurrentPage(1); }}
            searchable
          />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium mb-1 text-gray-700">Tìm kiếm</label>
          <div className="relative">
            <input
              type="text"
              value={filterSearch}
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
          <button
            onClick={() => { setFilterType(''); setFilterUnit(''); setFilterSearch(''); setCurrentPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            Xoá bộ lọc
          </button>
        )}

        <button
          onClick={fetchTemplates}
          disabled={loading}
          className="ml-auto px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center gap-1.5 disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      <div className="border rounded-lg overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Tên template', 'Loại đơn', 'Đơn vị', 'File', 'Người tạo', 'Trạng thái', 'Cập nhật', 'Thao tác'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">Đang tải...</td></tr>
            ) : templates.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">Chưa có template nào.</td></tr>
            ) : (
              templates.map((tpl) => (
                <tr key={tpl.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{tpl.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tpl.request_type_display}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tpl.company_unit_name}</td>
                  <td className="px-4 py-3 text-sm">
                    {tpl.file_url ? (
                      <a href={tpl.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                        <DocumentArrowDownIcon className="w-4 h-4" />
                        Tải về
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {tpl.created_by_name || tpl.created_by_username || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${tpl.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                      {tpl.is_active ? 'Đang dùng' : 'Không dùng'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(tpl.updated_at)}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => setDetailTemplate(tpl)}
                        className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Chi tiết
                      </button>
                      <button
                        onClick={() => setPreviewTemplate(tpl)}
                        className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-white border border-purple-300 rounded hover:bg-purple-50"
                      >
                        Xem PDF
                      </button>
                      <button
                        onClick={() => openEdit(tpl)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(tpl)}
                        className="px-2.5 py-1 text-xs font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50"
                      >
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

      <TemplateFormDialog
        open={showDialog}
        editing={editing}
        companyUnits={companyUnits}
        onClose={() => setShowDialog(false)}
        onSaved={handleTemplateSaved}
        onError={handleTemplateError}
      />

      <FeedbackDialog
        open={feedback.open}
        variant={feedback.variant}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((f) => ({ ...f, open: false }))}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title="Xoá template"
        message={
          deleteTarget
            ? `Bạn có chắc muốn xoá template "${deleteTarget.name}"? Hành động này không thể hoàn tác.`
            : undefined
        }
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Dialog xem chi tiết template */}
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
                  <dd className="text-gray-900 mt-1">{detailTemplate.name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Loại đơn</dt>
                  <dd className="text-gray-900 mt-1">{detailTemplate.request_type_display}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Đơn vị</dt>
                  <dd className="text-gray-900 mt-1">{detailTemplate.company_unit_name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Mã đơn vị</dt>
                  <dd className="text-gray-900 mt-1 font-mono">{detailTemplate.company_unit_code}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Người tạo</dt>
                  <dd className="text-gray-900 mt-1">
                    {detailTemplate.created_by_name || detailTemplate.created_by_username || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Ngày tạo</dt>
                  <dd className="text-gray-900 mt-1">{formatDate(detailTemplate.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Cập nhật</dt>
                  <dd className="text-gray-900 mt-1">{formatDate(detailTemplate.updated_at)}</dd>
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
                  <dt className="text-gray-500 font-medium">Dung lượng file</dt>
                  <dd className="text-gray-900 mt-1">
                    {detailTemplate.file_size
                      ? `${(detailTemplate.file_size / 1024).toFixed(1)} KB`
                      : '—'}
                  </dd>
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
                  Tải DOCX
                </a>
              )}
              <button
                onClick={() => {
                  const tpl = detailTemplate;
                  setDetailTemplate(null);
                  setPreviewTemplate(tpl);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 inline-flex items-center gap-1.5"
              >
                <DocumentMagnifyingGlassIcon className="w-4 h-4" />
                Xem PDF
              </button>
              <button
                onClick={() => setDetailTemplate(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF preview modal */}
      <PdfPreviewModal
        open={!!previewTemplate}
        title={previewTemplate ? `Xem trước: ${previewTemplate.name}` : 'Xem PDF'}
        loader={previewTemplate ? () => requestTemplateService.previewPdf(previewTemplate.id) : null}
        downloadFilename={previewTemplate ? `${previewTemplate.name}.pdf` : 'template.pdf'}
        onClose={() => setPreviewTemplate(null)}
      />
    </div>
  );
};

export default RequestTemplates;
