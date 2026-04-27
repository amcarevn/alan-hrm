import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {
  recruitmentService,
  ApplicationListItem,
  ApplicationCreateData,
  ApplicationStage,
  ApplicationStatus,
  StageHistory,
} from '../../services/recruitment.service';

const STAGE_COLORS: Record<ApplicationStage, string> = {
  APPLIED: 'bg-gray-100 text-gray-800',
  SCREENING: 'bg-blue-100 text-blue-800',
  INTERVIEW: 'bg-purple-100 text-purple-800',
  TEST: 'bg-yellow-100 text-yellow-800',
  OFFER: 'bg-orange-100 text-orange-800',
  HIRED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-gray-100 text-gray-500',
};

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  ACTIVE: 'bg-blue-100 text-blue-800',
  HIRED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-gray-100 text-gray-500',
};

const STAGE_OPTIONS: { value: ApplicationStage; label: string }[] = [
  { value: 'APPLIED', label: 'Đã ứng tuyển' },
  { value: 'SCREENING', label: 'Sàng lọc CV' },
  { value: 'INTERVIEW', label: 'Phỏng vấn' },
  { value: 'TEST', label: 'Kiểm tra/Test' },
  { value: 'OFFER', label: 'Offer' },
  { value: 'HIRED', label: 'Đã tuyển' },
  { value: 'REJECTED', label: 'Bị từ chối' },
  { value: 'WITHDRAWN', label: 'Ứng viên rút hồ sơ' },
];

interface CreateFormState {
  candidate: string;
  job: string;
  notes: string;
}

const RecruitmentApplications: React.FC = () => {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>({ candidate: '', job: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Move stage modal
  const [moveStageApp, setMoveStageApp] = useState<ApplicationListItem | null>(null);
  const [moveStageValue, setMoveStageValue] = useState<ApplicationStage>('SCREENING');
  const [moveStageNote, setMoveStageNote] = useState('');
  const [movingStageSaving, setMovingStageSaving] = useState(false);

  // History drawer
  const [historyApp, setHistoryApp] = useState<number | null>(null);
  const [historyData, setHistoryData] = useState<StageHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params: {
        stage?: ApplicationStage;
        status?: ApplicationStatus;
      } = {};
      if (stageFilter !== 'all') params.stage = stageFilter as ApplicationStage;
      if (statusFilter !== 'all') params.status = statusFilter as ApplicationStatus;
      const data = await recruitmentService.listApplications(params);
      setApplications(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách đơn ứng tuyển';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageFilter, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.candidate || !createForm.job) {
      setFormError('Vui lòng nhập ID ứng viên và ID tin tuyển dụng');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const data: ApplicationCreateData = {
        candidate: parseInt(createForm.candidate),
        job: parseInt(createForm.job),
        notes: createForm.notes || undefined,
      };
      await recruitmentService.createApplication(data);
      setShowCreateModal(false);
      setCreateForm({ candidate: '', job: '', notes: '' });
      await fetchApplications();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tạo thất bại';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStage = async () => {
    if (!moveStageApp) return;
    setMovingStageSaving(true);
    try {
      await recruitmentService.moveStage(moveStageApp.id, moveStageValue, moveStageNote);
      setMoveStageApp(null);
      await fetchApplications();
    } catch {
      alert('Chuyển stage thất bại');
    } finally {
      setMovingStageSaving(false);
    }
  };

  const openHistory = async (id: number) => {
    setHistoryApp(id);
    setHistoryLoading(true);
    try {
      const app = await recruitmentService.getApplication(id);
      setHistoryData(app.stage_history);
    } catch {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đơn ứng tuyển / Pipeline</h1>
          <p className="text-gray-600 mt-2">Tracking quá trình tuyển dụng theo từng ứng viên</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setCreateForm({ candidate: '', job: '', notes: '' });
            setFormError(null);
          }}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          Tạo đơn mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Tất cả giai đoạn</option>
            {STAGE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang tiến hành</option>
            <option value="HIRED">Đã tuyển</option>
            <option value="REJECTED">Bị từ chối</option>
            <option value="WITHDRAWN">Ứng viên rút</option>
          </select>
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
      ) : applications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Chưa có đơn ứng tuyển nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ứng viên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tin tuyển dụng</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giai đoạn</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phụ trách</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ứng tuyển</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map(app => (
                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{app.candidate_name}</p>
                    <p className="text-xs text-gray-400">{app.candidate_email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{app.job_title}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[app.current_stage]}`}
                    >
                      {app.current_stage_display}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[app.status]}`}
                    >
                      {app.status_display}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{app.assignee_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(app.applied_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => {
                          setMoveStageApp(app);
                          setMoveStageValue('SCREENING');
                          setMoveStageNote('');
                        }}
                        className="text-gray-400 hover:text-blue-600 transition-colors text-xs font-medium"
                        title="Chuyển stage"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openHistory(app.id)}
                        className="text-gray-400 hover:text-purple-600 transition-colors text-xs font-medium"
                        title="Lịch sử"
                      >
                        Lịch sử
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

      {/* Create Application Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Tạo đơn ứng tuyển</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID ứng viên <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={createForm.candidate}
                  onChange={e => setCreateForm(f => ({ ...f, candidate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="ID ứng viên"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID tin tuyển dụng <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={createForm.job}
                  onChange={e => setCreateForm(f => ({ ...f, job: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="ID tin tuyển dụng"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={createForm.notes}
                  onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                  Tạo đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Stage Modal */}
      {moveStageApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Chuyển stage pipeline</h2>
                <p className="text-sm text-gray-500">{moveStageApp.candidate_name}</p>
              </div>
              <button onClick={() => setMoveStageApp(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giai đoạn mới
                </label>
                <select
                  value={moveStageValue}
                  onChange={e => setMoveStageValue(e.target.value as ApplicationStage)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {STAGE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={moveStageNote}
                  onChange={e => setMoveStageNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="VD: Đã xác nhận lịch phỏng vấn..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setMoveStageApp(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  onClick={handleMoveStage}
                  disabled={movingStageSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {movingStageSaving ? (
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckIcon className="h-4 w-4" />
                  )}
                  Chuyển
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {historyApp !== null && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black bg-opacity-40" onClick={() => setHistoryApp(null)} />
          <div className="w-96 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Lịch sử stage</h2>
              <button onClick={() => setHistoryApp(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : historyData.length === 0 ? (
                <p className="text-sm text-gray-500">Không có lịch sử</p>
              ) : (
                <div className="space-y-4">
                  {historyData.map(h => (
                    <div key={h.id} className="relative pl-4 border-l-2 border-gray-200">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[h.stage]}`}
                      >
                        {h.stage_display}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(h.entered_at).toLocaleString('vi-VN')}
                        {h.exited_at && ` → ${new Date(h.exited_at).toLocaleString('vi-VN')}`}
                      </p>
                      {h.changed_by_name && (
                        <p className="text-xs text-gray-400">bởi {h.changed_by_name}</p>
                      )}
                      {h.note && <p className="text-xs text-gray-600 mt-1 italic">{h.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentApplications;
