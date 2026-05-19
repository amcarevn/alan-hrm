import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  PlusIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  ArrowUpCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import {
  recruitmentService,
  JobListItem,
  JobCreateData,
  JobChannelCreateData,
  ChannelType,
} from '../../services/recruitment.service';
import ConfirmDialog from '../../components/ConfirmDialog';
import { SelectBox } from '../../components/LandingLayout/SelectBox';

const JOB_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-800',
  PUBLISHED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const CHANNEL_TYPE_OPTIONS: { value: ChannelType; label: string }[] = [
  { value: 'WEBSITE', label: 'Website công ty' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'TOPCV', label: 'TopCV' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'ITVIEC', label: 'ITViec' },
  { value: 'VIETNAMWORKS', label: 'VietnamWorks' },
  { value: 'CAREERBUILDER', label: 'CareerBuilder' },
  { value: 'REFERRAL', label: 'Giới thiệu nội bộ' },
  { value: 'OTHER', label: 'Khác' },
];

interface JobFormState {
  title: string;
  description: string;
  requirements: string;
  benefits: string;
}

const EMPTY_JOB_FORM: JobFormState = {
  title: '',
  description: '',
  requirements: '',
  benefits: '',
};

interface ChannelFormState {
  channel_type: ChannelType;
  url: string;
  notes: string;
}

const EMPTY_CHANNEL_FORM: ChannelFormState = {
  channel_type: 'TOPCV',
  url: '',
  notes: '',
};

const RecruitmentJobs: React.FC = () => {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Close confirm
  const [closeConfirmId, setCloseConfirmId] = useState<number | null>(null);

  // Job modal
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [jobForm, setJobForm] = useState<JobFormState>(EMPTY_JOB_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Channel modal
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [channelJobId, setChannelJobId] = useState<number | null>(null);
  const [channelForm, setChannelForm] = useState<ChannelFormState>(EMPTY_CHANNEL_FORM);
  const [savingChannel, setSavingChannel] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await recruitmentService.listJobs();
      setJobs(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách tin tuyển dụng';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const openCreateJob = () => {
    setEditingJobId(null);
    setJobForm(EMPTY_JOB_FORM);
    setFormError(null);
    setShowJobModal(true);
  };

  const openEditJob = async (id: number) => {
    try {
      const job = await recruitmentService.getJob(id);
      setEditingJobId(id);
      setJobForm({
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        benefits: job.benefits,
      });
      setFormError(null);
      setShowJobModal(true);
    } catch {
      alert('Không thể tải thông tin tin tuyển dụng');
    }
  };

  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.title.trim()) {
      setFormError('Vui lòng nhập tiêu đề');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const data: JobCreateData = {
        title: jobForm.title.trim(),
        description: jobForm.description,
        requirements: jobForm.requirements,
        benefits: jobForm.benefits,
      };
      if (editingJobId) {
        await recruitmentService.updateJob(editingJobId, data);
      } else {
        await recruitmentService.createJob(data);
      }
      setShowJobModal(false);
      await fetchJobs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu thất bại';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await recruitmentService.publishJob(id);
      await fetchJobs();
    } catch {
      alert('Đăng tin thất bại');
    }
  };

  const handleClose = async (id: number) => {
    try {
      await recruitmentService.closeJob(id);
      setCloseConfirmId(null);
      await fetchJobs();
    } catch {
      alert('Đóng tin thất bại');
    }
  };

  const openAddChannel = (jobId: number) => {
    setChannelJobId(jobId);
    setChannelForm(EMPTY_CHANNEL_FORM);
    setChannelError(null);
    setShowChannelModal(true);
  };

  const handleChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelJobId) return;
    setSavingChannel(true);
    setChannelError(null);
    try {
      const data: JobChannelCreateData = {
        job: channelJobId,
        channel_type: channelForm.channel_type,
        url: channelForm.url,
        notes: channelForm.notes,
        is_active: true,
      };
      await recruitmentService.createJobChannel(data);
      setShowChannelModal(false);
      await fetchJobs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thêm kênh thất bại';
      setChannelError(msg);
    } finally {
      setSavingChannel(false);
    }
  };

  const filteredJobs = jobs.filter(j =>
    statusFilter === 'all' ? true : j.status === statusFilter,
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Quản lý JD</h1>
          <p className="text-gray-500 mt-1 text-sm">Quản lý Job Description và kênh đăng tuyển</p>
        </div>
        <button
          onClick={openCreateJob}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Tạo tin mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'Tất cả' },
            { value: 'DRAFT', label: 'Nháp' },
            { value: 'PUBLISHED', label: 'Đang đăng' },
            { value: 'CLOSED', label: 'Đóng' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-500">
          <p className="text-sm">Chưa có tin tuyển dụng nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Tiêu đề</th>
                  <th className="table-header">Trạng thái</th>
                  <th className="table-header">Kênh</th>
                  <th className="table-header">Đăng lúc</th>
                  <th className="table-header">Tạo lúc</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredJobs.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell">
                      <p className="text-sm font-semibold text-gray-900">{job.title}</p>
                    </td>
                    <td className="table-cell">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${JOB_STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-800'}`}
                      >
                        {job.status_display}
                      </span>
                    </td>
                    <td className="table-cell text-sm text-gray-600">{job.channel_count} kênh</td>
                    <td className="table-cell text-sm text-gray-500">
                      {job.published_at
                        ? new Date(job.published_at).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>
                    <td className="table-cell text-sm text-gray-500">
                      {new Date(job.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEditJob(job.id)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        {job.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePublish(job.id)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Đăng tin"
                          >
                            <ArrowUpCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                        {job.status !== 'CLOSED' && (
                          <button
                            onClick={() => setCloseConfirmId(job.id)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Đóng tin"
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openAddChannel(job.id)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                          title="Thêm kênh"
                        >
                          <PlusIcon className="h-4 w-4" />
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

      {/* Job Create/Edit Modal */}
      {showJobModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-bold text-gray-900">
                {editingJobId ? 'Cập nhật tin tuyển dụng' : 'Tạo tin tuyển dụng mới'}
              </h2>
              <button
                onClick={() => setShowJobModal(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleJobSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={jobForm.title}
                  onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))}
                  className="input-field"
                  placeholder="VD: Backend Developer – Python/Django"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả công việc</label>
                <textarea
                  rows={4}
                  value={jobForm.description}
                  onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))}
                  className="input-field resize-none"
                  placeholder="Mô tả chi tiết công việc..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yêu cầu</label>
                <textarea
                  rows={3}
                  value={jobForm.requirements}
                  onChange={e => setJobForm(f => ({ ...f, requirements: e.target.value }))}
                  className="input-field resize-none"
                  placeholder="- 2+ năm kinh nghiệm&#10;- Kỹ năng A, B, C"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quyền lợi</label>
                <textarea
                  rows={3}
                  value={jobForm.benefits}
                  onChange={e => setJobForm(f => ({ ...f, benefits: e.target.value }))}
                  className="input-field resize-none"
                  placeholder="- Lương cạnh tranh&#10;- Thưởng KPI"
                />
              </div>
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 pb-1">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckIcon className="h-4 w-4" />
                  )}
                  {editingJobId ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Channel Modal */}
      {showChannelModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Thêm kênh đăng tuyển</h2>
              <button
                onClick={() => setShowChannelModal(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleChannelSubmit} className="px-6 py-5 space-y-4">
              <SelectBox
                label="Kênh"
                value={channelForm.channel_type}
                options={CHANNEL_TYPE_OPTIONS}
                onChange={(val: ChannelType) =>
                  setChannelForm(f => ({ ...f, channel_type: val }))
                }
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL bài đăng</label>
                <input
                  type="url"
                  value={channelForm.url}
                  onChange={e => setChannelForm(f => ({ ...f, url: e.target.value }))}
                  className="input-field"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={channelForm.notes}
                  onChange={e => setChannelForm(f => ({ ...f, notes: e.target.value }))}
                  className="input-field"
                  placeholder="VD: Budget: 500k/tháng"
                />
              </div>
              {channelError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{channelError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 pb-1">
                <button
                  type="button"
                  onClick={() => setShowChannelModal(false)}
                  className="btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingChannel}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {savingChannel ? (
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckIcon className="h-4 w-4" />
                  )}
                  Thêm kênh
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Close Job Confirm Dialog */}
      <ConfirmDialog
        open={closeConfirmId !== null}
        variant="danger"
        title="Xác nhận đóng tin"
        message="Bạn có chắc muốn đóng tin tuyển dụng này không?"
        confirmLabel="Đóng tin"
        cancelLabel="Hủy"
        onConfirm={() => closeConfirmId !== null && handleClose(closeConfirmId)}
        onClose={() => setCloseConfirmId(null)}
      />
    </div>
  );
};

export default RecruitmentJobs;
