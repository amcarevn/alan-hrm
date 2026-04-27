import { managementApi } from '../utils/api/client';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type RecruitmentNeedStatus = 'OPEN' | 'IN_PROGRESS' | 'FILLED' | 'CANCELLED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'COLLABORATOR';
export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type ChannelType =
  | 'WEBSITE'
  | 'LINKEDIN'
  | 'TOPCV'
  | 'FACEBOOK'
  | 'ITVIEC'
  | 'VIETNAMWORKS'
  | 'CAREERBUILDER'
  | 'REFERRAL'
  | 'OTHER';
export type CandidateSource =
  | 'DIRECT'
  | 'REFERRAL'
  | 'LINKEDIN'
  | 'TOPCV'
  | 'FACEBOOK'
  | 'WEBSITE'
  | 'ITVIEC'
  | 'VIETNAMWORKS'
  | 'HEADHUNTER'
  | 'OTHER';
export type ApplicationStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'TEST'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN';
export type ApplicationStatus = 'ACTIVE' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';
export type InterviewType = 'PHONE' | 'VIDEO' | 'IN_PERSON' | 'TECHNICAL' | 'HR' | 'FINAL';
export type InterviewStatus = 'SCHEDULED' | 'DONE' | 'CANCELLED' | 'NO_SHOW';
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecruitmentNeedListItem {
  id: number;
  position_name: string;
  position_display: string;
  department_name: string;
  headcount: number;
  employment_type: EmploymentType;
  employment_type_display: string;
  status: RecruitmentNeedStatus;
  status_display: string;
  target_onboard_date: string | null;
  created_at: string;
}

export interface RecruitmentNeed extends RecruitmentNeedListItem {
  position: number | null;
  department: number | null;
  expected_salary_min: string | null;
  expected_salary_max: string | null;
  reason: string;
  requested_by: number | null;
  requested_by_name: string;
  updated_at: string;
}

export interface RecruitmentNeedCreateData {
  position_name: string;
  position?: number;
  department?: number;
  headcount: number;
  employment_type: EmploymentType;
  expected_salary_min?: number;
  expected_salary_max?: number;
  reason?: string;
  target_onboard_date?: string;
}

export interface JobChannel {
  id: number;
  channel_type: ChannelType;
  channel_type_display: string;
  url: string;
  posted_at: string | null;
  is_active: boolean;
  notes: string;
  created_at: string;
}

export interface JobListItem {
  id: number;
  title: string;
  status: JobStatus;
  status_display: string;
  channel_count: number;
  published_at: string | null;
  created_at: string;
}

export interface Job extends JobListItem {
  recruitment_need: number | null;
  description: string;
  requirements: string;
  benefits: string;
  closed_at: string | null;
  channels: JobChannel[];
  created_by: number | null;
  created_by_name: string;
  updated_at: string;
}

export interface JobCreateData {
  recruitment_need?: number;
  title: string;
  description?: string;
  requirements?: string;
  benefits?: string;
}

export interface JobChannelCreateData {
  job: number;
  channel_type: ChannelType;
  url?: string;
  posted_at?: string;
  is_active?: boolean;
  notes?: string;
}

export interface CandidateListItem {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  gender_display: string;
  source: CandidateSource;
  source_display: string;
  experience_years: number;
  current_position: string;
  current_company: string;
  is_blacklisted: boolean;
  application_count: number;
  created_at: string;
}

export interface Candidate extends CandidateListItem {
  date_of_birth: string | null;
  address: string;
  cv_file: string | null;
  cv_url: string;
  avatar: string | null;
  skills: string;
  experience_summary: string;
  education: string;
  expected_salary: string | null;
  tags: string;
  notes: string;
  blacklist_reason: string;
  created_by: number | null;
  created_by_name: string;
  updated_at: string;
}

export interface CandidateCreateData {
  full_name: string;
  email: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  cv_url?: string;
  skills?: string;
  experience_years?: number;
  experience_summary?: string;
  education?: string;
  current_company?: string;
  current_position?: string;
  expected_salary?: number;
  source?: CandidateSource;
  tags?: string;
  notes?: string;
}

export interface StageHistory {
  id: number;
  stage: ApplicationStage;
  stage_display: string;
  entered_at: string;
  exited_at: string | null;
  changed_by: number | null;
  changed_by_name: string | null;
  note: string;
}

export interface ApplicationListItem {
  id: number;
  candidate: number;
  candidate_name: string;
  candidate_email: string;
  job: number;
  job_title: string;
  current_stage: ApplicationStage;
  current_stage_display: string;
  status: ApplicationStatus;
  status_display: string;
  assignee: number | null;
  assignee_name: string;
  applied_at: string;
}

export interface Application extends ApplicationListItem {
  candidate_detail: Candidate;
  job_detail: Job;
  source: CandidateSource | null;
  rejection_reason: string;
  rejection_note: string;
  notes: string;
  updated_at: string;
  stage_history: StageHistory[];
}

export interface ApplicationCreateData {
  candidate: number;
  job: number;
  assignee?: number;
  source?: CandidateSource;
  notes?: string;
}

export interface InterviewListItem {
  id: number;
  application: number;
  candidate_name: string;
  job_title: string;
  interview_type: InterviewType;
  interview_type_display: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string;
  status: InterviewStatus;
  status_display: string;
}

export interface Interview extends InterviewListItem {
  interviewers: number[];
  interviewer_names: string[];
  notes: string;
  evaluation_count: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewCreateData {
  application: number;
  interview_type: InterviewType;
  scheduled_at: string;
  duration_minutes?: number;
  location?: string;
  interviewers?: number[];
  notes?: string;
}

export interface InterviewEvaluation {
  id: number;
  interview: number;
  evaluator: number;
  evaluator_name: string;
  technical_score: number;
  cultural_fit_score: number;
  communication_score: number;
  overall_score: number;
  strengths: string;
  weaknesses: string;
  recommendation: string;
  is_recommended: boolean;
  created_at: string;
  updated_at: string;
}

export interface EvaluationCreateData {
  interview: number;
  technical_score: number;
  cultural_fit_score: number;
  communication_score: number;
  overall_score: number;
  strengths?: string;
  weaknesses?: string;
  recommendation?: string;
  is_recommended?: boolean;
}

export interface Offer {
  id: number;
  application: number;
  candidate_name: string;
  job_title: string;
  proposed_salary: string;
  allowances: string;
  position_title: string;
  probation_months: number;
  expected_onboard_date: string | null;
  actual_onboard_date: string | null;
  status: OfferStatus;
  status_display: string;
  rejection_note: string;
  offer_letter_file: string | null;
  sent_at: string | null;
  responded_at: string | null;
  created_by: number | null;
  created_by_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface OfferCreateData {
  application: number;
  proposed_salary: number;
  allowances?: number;
  position_title?: string;
  probation_months?: number;
  expected_onboard_date?: string;
  sent_at?: string;
  notes?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const BASE = '/api/v1/recruitment';

class RecruitmentService {
  // ── Needs ──────────────────────────────────────────────────────────────────
  async listNeeds(): Promise<RecruitmentNeedListItem[]> {
    const res = await managementApi.get(`${BASE}/needs/`);
    return res.data;
  }

  async listOpenNeeds(): Promise<RecruitmentNeedListItem[]> {
    const res = await managementApi.get(`${BASE}/needs/open/`);
    return res.data;
  }

  async getNeed(id: number): Promise<RecruitmentNeed> {
    const res = await managementApi.get(`${BASE}/needs/${id}/`);
    return res.data;
  }

  async createNeed(data: RecruitmentNeedCreateData): Promise<RecruitmentNeed> {
    const res = await managementApi.post(`${BASE}/needs/`, data);
    return res.data;
  }

  async updateNeed(id: number, data: Partial<RecruitmentNeedCreateData>): Promise<RecruitmentNeed> {
    const res = await managementApi.patch(`${BASE}/needs/${id}/`, data);
    return res.data;
  }

  async deleteNeed(id: number): Promise<void> {
    await managementApi.delete(`${BASE}/needs/${id}/`);
  }

  // ── Jobs ───────────────────────────────────────────────────────────────────
  async listJobs(): Promise<JobListItem[]> {
    const res = await managementApi.get(`${BASE}/jobs/`);
    return res.data;
  }

  async listPublishedJobs(): Promise<JobListItem[]> {
    const res = await managementApi.get(`${BASE}/jobs/published/`);
    return res.data;
  }

  async getJob(id: number): Promise<Job> {
    const res = await managementApi.get(`${BASE}/jobs/${id}/`);
    return res.data;
  }

  async createJob(data: JobCreateData): Promise<Job> {
    const res = await managementApi.post(`${BASE}/jobs/`, data);
    return res.data;
  }

  async updateJob(id: number, data: Partial<JobCreateData>): Promise<Job> {
    const res = await managementApi.patch(`${BASE}/jobs/${id}/`, data);
    return res.data;
  }

  async publishJob(id: number): Promise<Job> {
    const res = await managementApi.post(`${BASE}/jobs/${id}/publish/`);
    return res.data;
  }

  async closeJob(id: number): Promise<Job> {
    const res = await managementApi.post(`${BASE}/jobs/${id}/close/`);
    return res.data;
  }

  // ── Job Channels ──────────────────────────────────────────────────────────
  async listJobChannels(jobId?: number): Promise<JobChannel[]> {
    const res = await managementApi.get(`${BASE}/job-channels/`, {
      params: jobId ? { job: jobId } : undefined,
    });
    return res.data;
  }

  async createJobChannel(data: JobChannelCreateData): Promise<JobChannel> {
    const res = await managementApi.post(`${BASE}/job-channels/`, data);
    return res.data;
  }

  async updateJobChannel(id: number, data: Partial<JobChannelCreateData>): Promise<JobChannel> {
    const res = await managementApi.patch(`${BASE}/job-channels/${id}/`, data);
    return res.data;
  }

  // ── Candidates ────────────────────────────────────────────────────────────
  async listCandidates(params?: {
    search?: string;
    source?: CandidateSource;
    blacklisted?: boolean;
  }): Promise<CandidateListItem[]> {
    const res = await managementApi.get(`${BASE}/candidates/`, { params });
    return res.data;
  }

  async getCandidate(id: number): Promise<Candidate> {
    const res = await managementApi.get(`${BASE}/candidates/${id}/`);
    return res.data;
  }

  async createCandidate(data: CandidateCreateData | FormData): Promise<Candidate> {
    const res = await managementApi.post(`${BASE}/candidates/`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return res.data;
  }

  async updateCandidate(id: number, data: Partial<CandidateCreateData>): Promise<Candidate> {
    const res = await managementApi.patch(`${BASE}/candidates/${id}/`, data);
    return res.data;
  }

  async blacklistCandidate(id: number, reason: string): Promise<Candidate> {
    const res = await managementApi.post(`${BASE}/candidates/${id}/blacklist/`, { reason });
    return res.data;
  }

  async unblacklistCandidate(id: number): Promise<Candidate> {
    const res = await managementApi.post(`${BASE}/candidates/${id}/unblacklist/`);
    return res.data;
  }

  // ── Applications ──────────────────────────────────────────────────────────
  async listApplications(params?: {
    job?: number;
    stage?: ApplicationStage;
    status?: ApplicationStatus;
    assignee?: number;
  }): Promise<ApplicationListItem[]> {
    const res = await managementApi.get(`${BASE}/applications/`, { params });
    return res.data;
  }

  async getApplication(id: number): Promise<Application> {
    const res = await managementApi.get(`${BASE}/applications/${id}/`);
    return res.data;
  }

  async createApplication(data: ApplicationCreateData): Promise<Application> {
    const res = await managementApi.post(`${BASE}/applications/`, data);
    return res.data;
  }

  async moveStage(id: number, stage: ApplicationStage, note?: string): Promise<Application> {
    const res = await managementApi.post(`${BASE}/applications/${id}/move-stage/`, { stage, note });
    return res.data;
  }

  // ── Interviews ────────────────────────────────────────────────────────────
  async listInterviews(params?: {
    application?: number;
    status?: InterviewStatus;
  }): Promise<InterviewListItem[]> {
    const res = await managementApi.get(`${BASE}/interviews/`, { params });
    return res.data;
  }

  async getInterview(id: number): Promise<Interview> {
    const res = await managementApi.get(`${BASE}/interviews/${id}/`);
    return res.data;
  }

  async createInterview(data: InterviewCreateData): Promise<Interview> {
    const res = await managementApi.post(`${BASE}/interviews/`, data);
    return res.data;
  }

  async updateInterview(id: number, data: Partial<InterviewCreateData>): Promise<Interview> {
    const res = await managementApi.patch(`${BASE}/interviews/${id}/`, data);
    return res.data;
  }

  async markInterviewDone(id: number): Promise<Interview> {
    const res = await managementApi.post(`${BASE}/interviews/${id}/mark-done/`);
    return res.data;
  }

  async cancelInterview(id: number): Promise<Interview> {
    const res = await managementApi.post(`${BASE}/interviews/${id}/cancel/`);
    return res.data;
  }

  // ── Evaluations ───────────────────────────────────────────────────────────
  async listEvaluations(interviewId?: number): Promise<InterviewEvaluation[]> {
    const res = await managementApi.get(`${BASE}/evaluations/`, {
      params: interviewId ? { interview: interviewId } : undefined,
    });
    return res.data;
  }

  async createEvaluation(data: EvaluationCreateData): Promise<InterviewEvaluation> {
    const res = await managementApi.post(`${BASE}/evaluations/`, data);
    return res.data;
  }

  // ── Offers ────────────────────────────────────────────────────────────────
  async listOffers(): Promise<Offer[]> {
    const res = await managementApi.get(`${BASE}/offers/`);
    return res.data;
  }

  async getOffer(id: number): Promise<Offer> {
    const res = await managementApi.get(`${BASE}/offers/${id}/`);
    return res.data;
  }

  async createOffer(data: OfferCreateData | FormData): Promise<Offer> {
    const res = await managementApi.post(`${BASE}/offers/`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return res.data;
  }

  async acceptOffer(id: number, actualOnboardDate?: string): Promise<Offer> {
    const res = await managementApi.post(`${BASE}/offers/${id}/accept/`, {
      actual_onboard_date: actualOnboardDate,
    });
    return res.data;
  }

  async rejectOffer(id: number, note?: string): Promise<Offer> {
    const res = await managementApi.post(`${BASE}/offers/${id}/reject/`, { note });
    return res.data;
  }
}

export const recruitmentService = new RecruitmentService();
export default recruitmentService;
