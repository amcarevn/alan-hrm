import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import {
  recruitmentService,
  InterviewListItem,
  InterviewCreateData,
  InterviewType,
  InterviewStatus,
  EvaluationCreateData,
  OfferCreateData,
  Offer,
} from '../../services/recruitment.service';

const INTERVIEW_TYPE_OPTIONS: { value: InterviewType; label: string }[] = [
  { value: 'PHONE', label: 'Điện thoại' },
  { value: 'VIDEO', label: 'Video call' },
  { value: 'IN_PERSON', label: 'Trực tiếp' },
  { value: 'TECHNICAL', label: 'Kỹ thuật' },
  { value: 'HR', label: 'HR' },
  { value: 'FINAL', label: 'Vòng cuối' },
];

const STATUS_COLORS: Record<InterviewStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  DONE: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-yellow-100 text-yellow-800',
};

const OFFER_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
};

type TabKey = 'interviews' | 'offers';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'interviews', label: 'Lịch phỏng vấn' },
  { key: 'offers', label: 'Offer Letter' },
];

interface InterviewFormState {
  application: string;
  interview_type: InterviewType;
  scheduled_at: string;
  duration_minutes: string;
  location: string;
  notes: string;
}

const EMPTY_INTERVIEW_FORM: InterviewFormState = {
  application: '',
  interview_type: 'HR',
  scheduled_at: '',
  duration_minutes: '60',
  location: '',
  notes: '',
};

interface EvalFormState {
  technical_score: string;
  cultural_fit_score: string;
  communication_score: string;
  overall_score: string;
  strengths: string;
  weaknesses: string;
  recommendation: string;
  is_recommended: boolean;
}

const EMPTY_EVAL_FORM: EvalFormState = {
  technical_score: '4',
  cultural_fit_score: '4',
  communication_score: '4',
  overall_score: '4',
  strengths: '',
  weaknesses: '',
  recommendation: '',
  is_recommended: true,
};

interface OfferFormState {
  application: string;
  proposed_salary: string;
  allowances: string;
  position_title: string;
  probation_months: string;
  expected_onboard_date: string;
  notes: string;
}

const EMPTY_OFFER_FORM: OfferFormState = {
  application: '',
  proposed_salary: '',
  allowances: '',
  position_title: '',
  probation_months: '2',
  expected_onboard_date: '',
  notes: '',
};

const ScoreSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  label: string;
}> = ({ value, onChange, label }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      {[1, 2, 3, 4, 5].map(n => (
        <option key={n} value={n}>
          {n} ★
        </option>
      ))}
    </select>
  </div>
);

const RecruitmentInterviews: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('interviews');

  // Interviews
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [loadingInterviews, setLoadingInterviews] = useState(true);
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Create interview modal
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewForm, setInterviewForm] = useState<InterviewFormState>(EMPTY_INTERVIEW_FORM);
  const [savingInterview, setSavingInterview] = useState(false);
  const [interviewFormError, setInterviewFormError] = useState<string | null>(null);

  // Evaluation modal
  const [evalInterviewId, setEvalInterviewId] = useState<number | null>(null);
  const [evalForm, setEvalForm] = useState<EvalFormState>(EMPTY_EVAL_FORM);
  const [savingEval, setSavingEval] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Offers
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [offerError, setOfferError] = useState<string | null>(null);

  // Create offer modal
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState<OfferFormState>(EMPTY_OFFER_FORM);
  const [savingOffer, setSavingOffer] = useState(false);
  const [offerFormError, setOfferFormError] = useState<string | null>(null);

  // Offer response modal
  const [acceptOfferId, setAcceptOfferId] = useState<number | null>(null);
  const [acceptOnboardDate, setAcceptOnboardDate] = useState('');
  const [rejectOfferId, setRejectOfferId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const fetchInterviews = async () => {
    try {
      setLoadingInterviews(true);
      const params: { status?: InterviewStatus } = {};
      if (statusFilter !== 'all') params.status = statusFilter as InterviewStatus;
      const data = await recruitmentService.listInterviews(params);
      setInterviews(data);
      setInterviewError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách phỏng vấn';
      setInterviewError(msg);
    } finally {
      setLoadingInterviews(false);
    }
  };

  const fetchOffers = async () => {
    try {
      setLoadingOffers(true);
      const data = await recruitmentService.listOffers();
      setOffers(data);
      setOfferError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách offer';
      setOfferError(msg);
    } finally {
      setLoadingOffers(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === 'offers') {
      fetchOffers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewForm.application) {
      setInterviewFormError('Vui lòng nhập ID đơn ứng tuyển');
      return;
    }
    setSavingInterview(true);
    setInterviewFormError(null);
    try {
      const data: InterviewCreateData = {
        application: parseInt(interviewForm.application),
        interview_type: interviewForm.interview_type,
        scheduled_at: interviewForm.scheduled_at,
        duration_minutes: parseInt(interviewForm.duration_minutes) || 60,
        location: interviewForm.location || undefined,
        notes: interviewForm.notes || undefined,
      };
      await recruitmentService.createInterview(data);
      setShowInterviewModal(false);
      await fetchInterviews();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tạo lịch thất bại';
      setInterviewFormError(msg);
    } finally {
      setSavingInterview(false);
    }
  };

  const handleMarkDone = async (id: number) => {
    try {
      await recruitmentService.markInterviewDone(id);
      await fetchInterviews();
    } catch {
      alert('Thao tác thất bại');
    }
  };

  const handleCancelInterview = async (id: number) => {
    if (!confirm('Hủy lịch phỏng vấn này?')) return;
    try {
      await recruitmentService.cancelInterview(id);
      await fetchInterviews();
    } catch {
      alert('Hủy thất bại');
    }
  };

  const handleCreateEval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalInterviewId) return;
    setSavingEval(true);
    setEvalError(null);
    try {
      const data: EvaluationCreateData = {
        interview: evalInterviewId,
        technical_score: parseInt(evalForm.technical_score),
        cultural_fit_score: parseInt(evalForm.cultural_fit_score),
        communication_score: parseInt(evalForm.communication_score),
        overall_score: parseInt(evalForm.overall_score),
        strengths: evalForm.strengths || undefined,
        weaknesses: evalForm.weaknesses || undefined,
        recommendation: evalForm.recommendation || undefined,
        is_recommended: evalForm.is_recommended,
      };
      await recruitmentService.createEvaluation(data);
      setEvalInterviewId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu đánh giá thất bại';
      setEvalError(msg);
    } finally {
      setSavingEval(false);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerForm.application || !offerForm.proposed_salary) {
      setOfferFormError('Vui lòng nhập ID đơn ứng tuyển và mức lương đề xuất');
      return;
    }
    setSavingOffer(true);
    setOfferFormError(null);
    try {
      const data: OfferCreateData = {
        application: parseInt(offerForm.application),
        proposed_salary: parseFloat(offerForm.proposed_salary),
        allowances: offerForm.allowances ? parseFloat(offerForm.allowances) : undefined,
        position_title: offerForm.position_title || undefined,
        probation_months: parseInt(offerForm.probation_months) || 2,
        expected_onboard_date: offerForm.expected_onboard_date || undefined,
        notes: offerForm.notes || undefined,
      };
      await recruitmentService.createOffer(data);
      setShowOfferModal(false);
      await fetchOffers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tạo offer thất bại';
      setOfferFormError(msg);
    } finally {
      setSavingOffer(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!acceptOfferId) return;
    try {
      await recruitmentService.acceptOffer(acceptOfferId, acceptOnboardDate || undefined);
      setAcceptOfferId(null);
      setAcceptOnboardDate('');
      await fetchOffers();
    } catch {
      alert('Thao tác thất bại');
    }
  };

  const handleRejectOffer = async () => {
    if (!rejectOfferId) return;
    try {
      await recruitmentService.rejectOffer(rejectOfferId, rejectNote || undefined);
      setRejectOfferId(null);
      setRejectNote('');
      await fetchOffers();
    } catch {
      alert('Thao tác thất bại');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phỏng vấn & Offer</h1>
          <p className="text-gray-600 mt-2">Quản lý lịch phỏng vấn, đánh giá và offer letter</p>
        </div>
        {activeTab === 'interviews' ? (
          <button
            onClick={() => {
              setInterviewForm(EMPTY_INTERVIEW_FORM);
              setInterviewFormError(null);
              setShowInterviewModal(true);
            }}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            Lên lịch phỏng vấn
          </button>
        ) : (
          <button
            onClick={() => {
              setOfferForm(EMPTY_OFFER_FORM);
              setOfferFormError(null);
              setShowOfferModal(true);
            }}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            Tạo offer
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Interviews Tab */}
      {activeTab === 'interviews' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'Tất cả' },
                { value: 'SCHEDULED', label: 'Đã lên lịch' },
                { value: 'DONE', label: 'Đã phỏng vấn' },
                { value: 'CANCELLED', label: 'Đã hủy' },
                { value: 'NO_SHOW', label: 'Không đến' },
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
          {interviewError && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {interviewError}
            </div>
          )}
          {loadingInterviews ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : interviews.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Chưa có lịch phỏng vấn nào</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ứng viên
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Loại
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Thời gian
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Địa điểm
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {interviews.map(iv => (
                    <tr key={iv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{iv.candidate_name}</p>
                        <p className="text-xs text-gray-400">{iv.job_title}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {iv.interview_type_display}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(iv.scheduled_at).toLocaleString('vi-VN')}
                        <p className="text-xs text-gray-400">{iv.duration_minutes} phút</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                        {iv.location || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[iv.status]}`}
                        >
                          {iv.status_display}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          {iv.status === 'SCHEDULED' && (
                            <>
                              <button
                                onClick={() => handleMarkDone(iv.id)}
                                className="text-gray-400 hover:text-green-600 text-xs font-medium transition-colors"
                                title="Đánh dấu hoàn thành"
                              >
                                Hoàn thành
                              </button>
                              <button
                                onClick={() => handleCancelInterview(iv.id)}
                                className="text-gray-400 hover:text-red-600 text-xs font-medium transition-colors"
                                title="Hủy lịch"
                              >
                                Hủy
                              </button>
                            </>
                          )}
                          {iv.status === 'DONE' && (
                            <button
                              onClick={() => {
                                setEvalInterviewId(iv.id);
                                setEvalForm(EMPTY_EVAL_FORM);
                                setEvalError(null);
                              }}
                              className="text-gray-400 hover:text-purple-600 text-xs font-medium transition-colors"
                              title="Đánh giá"
                            >
                              Đánh giá
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
        </div>
      )}

      {/* Offers Tab */}
      {activeTab === 'offers' && (
        <div className="space-y-4">
          {offerError && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {offerError}
            </div>
          )}
          {loadingOffers ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Chưa có offer nào</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ứng viên
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vị trí
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Lương đề xuất
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Onboard dự kiến
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {offers.map(offer => (
                    <tr key={offer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{offer.candidate_name}</p>
                        <p className="text-xs text-gray-400">{offer.job_title}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {offer.position_title || '—'}
                        <p className="text-xs text-gray-400">
                          Thử việc {offer.probation_months} tháng
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {parseInt(offer.proposed_salary).toLocaleString('vi-VN')}đ
                        {offer.allowances && parseInt(offer.allowances) > 0 && (
                          <p className="text-xs text-gray-400">
                            + {parseInt(offer.allowances).toLocaleString('vi-VN')}đ phụ cấp
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {offer.expected_onboard_date
                          ? new Date(offer.expected_onboard_date).toLocaleDateString('vi-VN')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${OFFER_STATUS_COLORS[offer.status] ?? 'bg-gray-100 text-gray-800'}`}
                        >
                          {offer.status_display}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {offer.status === 'PENDING' && (
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => {
                                setAcceptOfferId(offer.id);
                                setAcceptOnboardDate('');
                              }}
                              className="text-gray-400 hover:text-green-600 text-xs font-medium transition-colors"
                            >
                              Chấp nhận
                            </button>
                            <button
                              onClick={() => {
                                setRejectOfferId(offer.id);
                                setRejectNote('');
                              }}
                              className="text-gray-400 hover:text-red-600 text-xs font-medium transition-colors"
                            >
                              Từ chối
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Interview Modal */}
      {showInterviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Lên lịch phỏng vấn</h2>
              <button
                onClick={() => setShowInterviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateInterview} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID đơn ứng tuyển <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={interviewForm.application}
                  onChange={e =>
                    setInterviewForm(f => ({ ...f, application: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                  <select
                    value={interviewForm.interview_type}
                    onChange={e =>
                      setInterviewForm(f => ({
                        ...f,
                        interview_type: e.target.value as InterviewType,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {INTERVIEW_TYPE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thời lượng (phút)
                  </label>
                  <input
                    type="number"
                    value={interviewForm.duration_minutes}
                    onChange={e =>
                      setInterviewForm(f => ({ ...f, duration_minutes: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thời gian phỏng vấn
                </label>
                <input
                  type="datetime-local"
                  value={interviewForm.scheduled_at}
                  onChange={e =>
                    setInterviewForm(f => ({ ...f, scheduled_at: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa điểm</label>
                <input
                  type="text"
                  value={interviewForm.location}
                  onChange={e =>
                    setInterviewForm(f => ({ ...f, location: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="VD: Phòng họp A3 hoặc link meet..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={interviewForm.notes}
                  onChange={e =>
                    setInterviewForm(f => ({ ...f, notes: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {interviewFormError && (
                <p className="text-sm text-red-600">{interviewFormError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInterviewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingInterview}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {savingInterview ? (
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckIcon className="h-4 w-4" />
                  )}
                  Lên lịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      {evalInterviewId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Đánh giá phỏng vấn</h2>
              <button
                onClick={() => setEvalInterviewId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateEval} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ScoreSelect
                  label="Kỹ năng kỹ thuật"
                  value={evalForm.technical_score}
                  onChange={v => setEvalForm(f => ({ ...f, technical_score: v }))}
                />
                <ScoreSelect
                  label="Phù hợp văn hóa"
                  value={evalForm.cultural_fit_score}
                  onChange={v => setEvalForm(f => ({ ...f, cultural_fit_score: v }))}
                />
                <ScoreSelect
                  label="Giao tiếp"
                  value={evalForm.communication_score}
                  onChange={v => setEvalForm(f => ({ ...f, communication_score: v }))}
                />
                <ScoreSelect
                  label="Tổng thể"
                  value={evalForm.overall_score}
                  onChange={v => setEvalForm(f => ({ ...f, overall_score: v }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Điểm mạnh</label>
                <textarea
                  rows={2}
                  value={evalForm.strengths}
                  onChange={e => setEvalForm(f => ({ ...f, strengths: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Điểm yếu</label>
                <textarea
                  rows={2}
                  value={evalForm.weaknesses}
                  onChange={e => setEvalForm(f => ({ ...f, weaknesses: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đề xuất</label>
                <textarea
                  rows={2}
                  value={evalForm.recommendation}
                  onChange={e => setEvalForm(f => ({ ...f, recommendation: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_recommended"
                  checked={evalForm.is_recommended}
                  onChange={e => setEvalForm(f => ({ ...f, is_recommended: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <label htmlFor="is_recommended" className="text-sm font-medium text-gray-700">
                  Đề nghị tuyển dụng
                </label>
              </div>
              {evalError && <p className="text-sm text-red-600">{evalError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEvalInterviewId(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingEval}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {savingEval ? (
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckIcon className="h-4 w-4" />
                  )}
                  Lưu đánh giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Tạo Offer Letter</h2>
              <button
                onClick={() => setShowOfferModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOffer} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID đơn ứng tuyển <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={offerForm.application}
                  onChange={e => setOfferForm(f => ({ ...f, application: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lương đề xuất (đ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={offerForm.proposed_salary}
                    onChange={e => setOfferForm(f => ({ ...f, proposed_salary: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phụ cấp (đ)
                  </label>
                  <input
                    type="number"
                    value={offerForm.allowances}
                    onChange={e => setOfferForm(f => ({ ...f, allowances: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên vị trí</label>
                  <input
                    type="text"
                    value={offerForm.position_title}
                    onChange={e => setOfferForm(f => ({ ...f, position_title: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thử việc (tháng)
                  </label>
                  <input
                    type="number"
                    value={offerForm.probation_months}
                    onChange={e => setOfferForm(f => ({ ...f, probation_months: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày onboard dự kiến
                </label>
                <input
                  type="date"
                  value={offerForm.expected_onboard_date}
                  onChange={e =>
                    setOfferForm(f => ({ ...f, expected_onboard_date: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={offerForm.notes}
                  onChange={e => setOfferForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {offerFormError && <p className="text-sm text-red-600">{offerFormError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingOffer}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {savingOffer ? (
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckIcon className="h-4 w-4" />
                  )}
                  Tạo offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accept Offer Modal */}
      {acceptOfferId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Chấp nhận Offer</h3>
            <p className="text-sm text-gray-600 mb-3">Ngày onboard thực tế:</p>
            <input
              type="date"
              value={acceptOnboardDate}
              onChange={e => setAcceptOnboardDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setAcceptOfferId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={handleAcceptOffer}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Offer Modal */}
      {rejectOfferId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Từ chối Offer</h3>
            <p className="text-sm text-gray-600 mb-3">Lý do từ chối:</p>
            <textarea
              rows={3}
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="VD: Ứng viên nhận offer từ công ty khác"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRejectOfferId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={handleRejectOffer}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentInterviews;
