import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrmAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { SelectBox } from '../components/LandingLayout/SelectBox';
import ConfirmDialog from '../components/ConfirmDialog';
import FeedbackDialog from '../components/FeedbackDialog';
import FilePreviewModal from '../components/Common/FilePreviewModal';

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: '', label: 'Tất cả loại' },
  { value: 'ANNOUNCEMENT', label: 'Thông báo' },
  { value: 'DECISION', label: 'Quyết định' },
  { value: 'OTHER', label: 'Khác' },
];

const TYPE_FORM_OPTIONS = TYPE_OPTIONS.slice(1);

const PRIORITY_OPTIONS = [
  { value: '', label: 'Tất cả mức độ' },
  { value: 'LOW', label: 'Thấp' },
  { value: 'MEDIUM', label: 'Bình thường' },
  { value: 'HIGH', label: 'Cao' },
  { value: 'URGENT', label: 'Khẩn cấp' },
];

const PRIORITY_FORM_OPTIONS = PRIORITY_OPTIONS.slice(1);

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'true', label: 'Đang hoạt động' },
  { value: 'false', label: 'Không hoạt động' },
];

const CURRENT_OPTIONS = [
  { value: '', label: 'Tất cả hiệu lực' },
  { value: 'true', label: 'Đang hiệu lực' },
  { value: 'false', label: 'Hết hiệu lực' },
];

const PRIORITY_BORDER: Record<string, string> = {
  URGENT: 'border-red-500',
  HIGH: 'border-orange-400',
  MEDIUM: 'border-blue-400',
  LOW: 'border-gray-300',
};

const PRIORITY_BADGE: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  LOW: 'bg-gray-100 text-gray-600',
};

const TYPE_BADGE: Record<string, string> = {
  ANNOUNCEMENT: 'bg-indigo-100 text-indigo-700',
  DECISION: 'bg-purple-100 text-purple-700',
  NOTICE: 'bg-teal-100 text-teal-700',
  CIRCULAR: 'bg-cyan-100 text-cyan-700',
  DIRECTIVE: 'bg-amber-100 text-amber-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

const EMPTY_FORM = {
  title: '',
  content: '',
  announcement_type: 'ANNOUNCEMENT',
  priority: 'MEDIUM',
  effective_from: '',
  effective_to: '',
  is_active: 'true',
};

// ─── Component ───────────────────────────────────────────────────────────────

const AnnouncementList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRole = (user?.role || '').toUpperCase();
  const canManage = userRole === 'ADMIN' || userRole === 'HR' || user?.is_super_admin;

  // ── List state ──
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Filter state ──
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCurrent, setFilterCurrent] = useState('');

  // ── Modal state ──
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<{ id: number; file_name: string; file_url: string }[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ── Detail modal ──
  const [detailItem, setDetailItem] = useState<any | null>(null);

  // ── Attachment preview dialog ──
  const [attachmentPreview, setAttachmentPreview] = useState<{ file_name: string; file_url: string } | null>(null);

  // ── Dialogs ──
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean; variant: 'success' | 'error'; title: string; message?: string;
  }>({ open: false, variant: 'success', title: '' });

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const PAGE_SIZE = 20;

  const fetchPage = useCallback(async (pageNum: number, replace: boolean) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const params: any = { page: pageNum, page_size: PAGE_SIZE, ordering: '-created_at' };
      if (search) params.search = search;
      if (filterType) params.announcement_type = filterType;
      if (filterPriority) params.priority = filterPriority;
      if (filterStatus !== '') params.is_active = filterStatus === 'true';
      if (filterCurrent !== '') params.is_current = filterCurrent === 'true';
      const res = await hrmAPI.getCompanyAnnouncements(params);
      const results = res.results || [];
      if (replace) setAnnouncements(results);
      else setAnnouncements(prev => [...prev, ...results]);
      setHasMore(!!res.next);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách thông báo');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, filterType, filterPriority, filterStatus, filterCurrent]);

  // Filters change → reset về page 1, fetch fresh
  useEffect(() => {
    setPage(1);
    const t = setTimeout(() => fetchPage(1, true), 300);
    return () => clearTimeout(t);
  }, [fetchPage]);

  // Page > 1 → load more (append)
  useEffect(() => {
    if (page === 1) return;
    fetchPage(page, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // IntersectionObserver — trigger khi scroll đến sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading]);

  useEffect(() => {
    const isOpen = showModal || !!detailItem;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal, detailItem]);

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ ...EMPTY_FORM });
    setAttachmentFiles([]);
    setExistingAttachments([]);
    setRemovedAttachmentIds([]);
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      content: item.content || '',
      announcement_type: item.announcement_type || 'ANNOUNCEMENT',
      priority: item.priority || 'MEDIUM',
      effective_from: item.effective_from ? item.effective_from.slice(0, 10) : '',
      effective_to: item.effective_to ? item.effective_to.slice(0, 10) : '',
      is_active: item.is_active ? 'true' : 'false',
    });
    setAttachmentFiles([]);
    setExistingAttachments(item.attachments || []);
    setRemovedAttachmentIds([]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setAttachmentFiles([]);
    setExistingAttachments([]);
    setRemovedAttachmentIds([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setAttachmentFiles(prev => [...prev, ...selected]);
    e.target.value = '';
  };

  const removeNewFile = (index: number) => {
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (id: number) => {
    setExistingAttachments(prev => prev.filter(a => a.id !== id));
    setRemovedAttachmentIds(prev => [...prev, id]);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim() || !formData.effective_from) return;

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('title', formData.title.trim());
      fd.append('content', formData.content.trim());
      fd.append('announcement_type', formData.announcement_type);
      fd.append('priority', formData.priority);
      fd.append('effective_from', formData.effective_from);
      if (formData.effective_to) fd.append('effective_to', formData.effective_to);
      fd.append('is_active', formData.is_active);
      attachmentFiles.forEach(f => fd.append('attachments', f));
      removedAttachmentIds.forEach(id => fd.append('remove_attachment_ids', String(id)));

      if (editingItem) {
        await hrmAPI.updateAnnouncement(editingItem.id, fd);
      } else {
        await hrmAPI.createAnnouncement(fd);
      }

      closeModal();
      fetchPage(1, true);
      setFeedback({
        open: true, variant: 'success',
        title: editingItem ? 'Cập nhật thông báo thành công!' : 'Đăng thông báo thành công!',
      });
    } catch (err: any) {
      setFeedback({
        open: true, variant: 'error',
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.detail || err.message || 'Lỗi không xác định',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await hrmAPI.deleteAnnouncement(deleteTarget.id);
      setDeleteTarget(null);
      fetchPage(1, true);
      setFeedback({ open: true, variant: 'success', title: 'Đã xóa thông báo thành công!' });
    } catch (err: any) {
      setDeleteTarget(null);
      setFeedback({ open: true, variant: 'error', title: 'Xóa thất bại', message: err.message });
    } finally {
      setDeleting(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const formatDate = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('vi-VN');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bảng thông báo</h1>
          <p className="text-gray-600 mt-2">Thông báo nội bộ từ ban lãnh đạo và phòng HCNS.</p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Đăng thông báo
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tìm kiếm</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tiêu đề..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <SelectBox<string>
            label="Loại thông báo"
            value={filterType}
            options={TYPE_OPTIONS}
            onChange={setFilterType}
          />
          <SelectBox<string>
            label="Mức độ ưu tiên"
            value={filterPriority}
            options={PRIORITY_OPTIONS}
            onChange={setFilterPriority}
          />
          <SelectBox<string>
            label="Trạng thái"
            value={filterStatus}
            options={STATUS_OPTIONS}
            onChange={setFilterStatus}
          />
          <SelectBox<string>
            label="Hiệu lực"
            value={filterCurrent}
            options={CURRENT_OPTIONS}
            onChange={setFilterCurrent}
          />
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          <p className="mt-4 text-gray-600">Đang tải thông báo...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-600 mb-3">{error}</p>
          <button onClick={() => fetchPage(1, true)} className="text-sm text-primary-600 hover:underline">Thử lại</button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-16 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <p className="text-gray-500 font-medium">Chưa có thông báo nào</p>
          {canManage && (
            <button onClick={openCreate} className="mt-3 text-sm text-primary-600 hover:underline">
              Đăng thông báo đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => {
            const expanded = expandedIds.has(item.id);
            const expired = !item.is_current;
            const borderColor = expired ? 'border-gray-300' : (PRIORITY_BORDER[item.priority] || 'border-gray-300');
            return (
              <div key={item.id} className={`rounded-lg shadow border-l-4 ${borderColor} p-5 transition-all ${expired ? 'bg-gray-50 opacity-60' : 'bg-white'}`}>
                {/* Card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[item.announcement_type] || 'bg-gray-100 text-gray-600'}`}>
                      {item.announcement_type_display || item.announcement_type}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[item.priority] || 'bg-gray-100 text-gray-600'}`}>
                      {item.priority_display || item.priority}
                    </span>
                    {expired && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-500">
                        Hết hiệu lực
                      </span>
                    )}
                    {!item.is_active && !expired && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        Không hoạt động
                      </span>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(item)}
                        className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-md transition-colors"
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>

                {/* Title */}
                <h3
                  className="mt-2 text-base font-semibold text-gray-900 cursor-pointer hover:text-primary-600 transition-colors"
                  onClick={() => setDetailItem(item)}
                >
                  {item.title}
                </h3>

                {/* Content */}
                <div className={`mt-2 text-sm text-gray-700 whitespace-pre-line ${!expanded ? 'line-clamp-3' : ''}`}>
                  {item.content}
                </div>
                {item.content && item.content.length > 200 && (
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="mt-1 text-xs text-primary-600 hover:underline"
                  >
                    {expanded ? 'Thu gọn' : 'Xem thêm'}
                  </button>
                )}

                {/* Footer */}
                <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>📅 Hiệu lực: {formatDate(item.effective_from)}{item.effective_to ? ` – ${formatDate(item.effective_to)}` : ''}</span>
                    {item.created_by_name && <span>👤 {item.created_by_name}</span>}
                  </div>
                  {item.attachments && item.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.attachments.map((att: any) => (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() => setAttachmentPreview(att)}
                          className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:underline"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          {att.file_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="py-4 flex justify-center">
            {loadingMore && (
              <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full" />
            )}
          </div>
          {!hasMore && announcements.length > 0 && (
            <p className="text-center text-xs text-gray-400 py-4">Đã hiển thị tất cả thông báo</p>
          )}
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/60" onClick={() => setDetailItem(null)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
              {/* Header */}
              <div className={`flex items-start justify-between gap-3 px-6 py-4 border-b-4 ${PRIORITY_BORDER[detailItem.priority] || 'border-gray-300'} border-t border-x rounded-t-lg`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[detailItem.announcement_type] || 'bg-gray-100 text-gray-600'}`}>
                      {detailItem.announcement_type_display || detailItem.announcement_type}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[detailItem.priority] || 'bg-gray-100 text-gray-600'}`}>
                      {detailItem.priority_display || detailItem.priority}
                    </span>
                    {!detailItem.is_active && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        Không hoạt động
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 leading-snug">{detailItem.title}</h3>
                </div>
                <button onClick={() => setDetailItem(null)} className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 rounded-md">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-4">
                {/* Metadata grid */}
                <div className="bg-gray-50 rounded-md px-4 py-3 text-sm space-y-2">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-gray-700">
                    <div>
                      <span className="text-gray-500 font-medium">Mã thông báo:</span>{' '}
                      <span className="font-mono text-xs bg-white border border-gray-200 px-1.5 py-0.5 rounded">{detailItem.announcement_code}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Trạng thái:</span>{' '}
                      {detailItem.is_active ? (
                        detailItem.is_current
                          ? <span className="text-green-600 font-medium">Đang hiệu lực</span>
                          : <span className="text-yellow-600 font-medium">Hoạt động (ngoài khoảng)</span>
                      ) : (
                        <span className="text-gray-400">Không hoạt động</span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Ngày hiệu lực:</span>{' '}
                      {formatDate(detailItem.effective_from)}
                      {detailItem.effective_to ? ` – ${formatDate(detailItem.effective_to)}` : ' (không hết hạn)'}
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Áp dụng cho:</span>{' '}
                      {detailItem.apply_to_all ? 'Toàn công ty' : 'Phạm vi giới hạn'}
                    </div>
                    {detailItem.created_by_name && (
                      <div>
                        <span className="text-gray-500 font-medium">Người tạo:</span>{' '}
                        {detailItem.created_by_name}
                      </div>
                    )}
                    {detailItem.approved_by_name && (
                      <div>
                        <span className="text-gray-500 font-medium">Người phê duyệt:</span>{' '}
                        {detailItem.approved_by_name}
                      </div>
                    )}
                    {detailItem.published_at && (
                      <div>
                        <span className="text-gray-500 font-medium">Ngày công bố:</span>{' '}
                        {formatDate(detailItem.published_at)}
                      </div>
                    )}
                    {detailItem.created_at && (
                      <div>
                        <span className="text-gray-500 font-medium">Ngày tạo:</span>{' '}
                        {formatDate(detailItem.created_at)}
                      </div>
                    )}
                    {detailItem.updated_at && (
                      <div>
                        <span className="text-gray-500 font-medium">Cập nhật lần cuối:</span>{' '}
                        {formatDate(detailItem.updated_at)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Nội dung</p>
                  <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed border border-gray-100 rounded-md px-4 py-3 bg-white">
                    {detailItem.content}
                  </div>
                </div>

                {/* Attachments */}
                {detailItem.attachments && detailItem.attachments.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">File đính kèm ({detailItem.attachments.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {detailItem.attachments.map((att: any) => (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() => setAttachmentPreview(att)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-sm hover:bg-blue-100 transition-colors"
                        >
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          {att.file_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
                {canManage && (
                  <button
                    onClick={() => { setDetailItem(null); openEdit(detailItem); }}
                    className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                  >
                    Chỉnh sửa
                  </button>
                )}
                <button
                  onClick={() => setDetailItem(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/60" onClick={closeModal} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingItem ? 'Chỉnh sửa thông báo' : 'Đăng thông báo mới'}
                </h3>
                <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Nhập tiêu đề thông báo..."
                    required
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Nhập nội dung thông báo..."
                    required
                  />
                </div>

                {/* Type + Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SelectBox<string>
                    label="Loại thông báo"
                    value={formData.announcement_type}
                    options={TYPE_FORM_OPTIONS}
                    onChange={(v) => setFormData(p => ({ ...p, announcement_type: v }))}
                  />
                  <SelectBox<string>
                    label="Mức độ ưu tiên"
                    value={formData.priority}
                    options={PRIORITY_FORM_OPTIONS}
                    onChange={(v) => setFormData(p => ({ ...p, priority: v }))}
                  />
                </div>

                {/* Status */}
                <SelectBox<string>
                  label="Trạng thái"
                  value={formData.is_active}
                  options={[
                    { value: 'true', label: 'Đang hoạt động' },
                    { value: 'false', label: 'Bản nháp (không hiển thị)' },
                  ]}
                  onChange={(v) => setFormData(p => ({ ...p, is_active: v }))}
                />

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày hiệu lực *</label>
                    <input
                      type="date"
                      value={formData.effective_from}
                      onChange={(e) => setFormData(p => ({ ...p, effective_from: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                    <input
                      type="date"
                      value={formData.effective_to}
                      onChange={(e) => setFormData(p => ({ ...p, effective_to: e.target.value }))}
                      min={formData.effective_from || undefined}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* File attachment */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Đính kèm file</label>
                    {(existingAttachments.length + attachmentFiles.length) > 0 && (
                      <span className="text-xs text-gray-400">{existingAttachments.length + attachmentFiles.length} file</span>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Existing attachments (from server) */}
                  {existingAttachments.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {existingAttachments.map(att => (
                        <div key={att.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm">
                          <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-primary-600 hover:underline">
                            {att.file_name}
                          </a>
                          <button type="button" onClick={() => removeExistingAttachment(att.id)} className="text-gray-400 hover:text-red-500" title="Xóa file">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* New files selected */}
                  {attachmentFiles.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {attachmentFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm">
                          <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span className="flex-1 truncate text-blue-700">{f.name}</span>
                          <button type="button" onClick={() => removeNewFile(i)} className="text-gray-400 hover:text-red-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Thêm file đính kèm
                  </button>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG · Tối đa 10MB/file</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {submitting ? 'Đang lưu...' : editingItem ? 'Lưu thay đổi' : 'Đăng thông báo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Attachment Preview ── */}
      <FilePreviewModal
        open={!!attachmentPreview}
        file_name={attachmentPreview?.file_name ?? ''}
        file_url={attachmentPreview?.file_url ?? ''}
        onClose={() => setAttachmentPreview(null)}
      />

      {/* ── Confirm Delete ── */}
      <ConfirmDialog
        open={deleteTarget !== null}
        variant="danger"
        title="Xóa thông báo"
        message={deleteTarget ? `Bạn có chắc chắn muốn xóa thông báo "${deleteTarget.title}"?` : ''}
        confirmLabel="Xóa"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />

      {/* ── Feedback ── */}
      <FeedbackDialog
        open={feedback.open}
        variant={feedback.variant}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback(p => ({ ...p, open: false }))}
      />
    </div>
  );
};

export default AnnouncementList;
