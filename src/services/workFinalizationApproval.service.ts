import { managementApi } from '../utils/api';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DepartmentWorkFinalizationApproval {
  id: number;
  department_code: string;
  department_name: string | null;
  year: number;
  month: number;
  status: ApprovalStatus;
  sent_by: number | null;
  sent_by_name: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SendApprovalRequest {
  department_code: string;
  year: number;
  month: number;
}

export interface SendAllApprovalsRequest {
  year: number;
  month: number;
}

export interface ApproveRejectRequest {
  note?: string;
}

export interface SendApprovalResponse {
  message: string;
  created: boolean;
  data: DepartmentWorkFinalizationApproval;
}

export interface SendAllApprovalsResponse {
  year: number;
  month: number;
  total_processed: number;
  total_errors: number;
  results: DepartmentWorkFinalizationApproval[];
  errors: { department_code: string; error: string }[];
}

export interface ApprovalListResponse {
  year: number;
  month: number;
  total: number;
  results: DepartmentWorkFinalizationApproval[];
}

export interface ApprovalListParams {
  year: number;
  month: number;
  department_code?: string;
  status?: ApprovalStatus;
}

class WorkFinalizationApprovalService {
  async list(params: ApprovalListParams): Promise<ApprovalListResponse> {
    const response = await managementApi.get(
      '/api-hrm/work-finalization/approvals/',
      { params }
    );
    return response.data;
  }

  async send(data: SendApprovalRequest): Promise<SendApprovalResponse> {
    const response = await managementApi.post(
      '/api-hrm/work-finalization/approvals/send/',
      data
    );
    return response.data;
  }

  async sendAll(data: SendAllApprovalsRequest): Promise<SendAllApprovalsResponse> {
    const response = await managementApi.post(
      '/api-hrm/work-finalization/approvals/send-all/',
      data
    );
    return response.data;
  }

  async get(approvalId: number): Promise<DepartmentWorkFinalizationApproval & { employees: any[], can_approve: boolean }> {
    const response = await managementApi.get(
      `/api-hrm/work-finalization/approvals/${approvalId}/`
    );
    return response.data;
  }

  async approve(
    approvalId: number,
    data: ApproveRejectRequest = {}
  ): Promise<DepartmentWorkFinalizationApproval> {
    const payload: any = { action: 'APPROVED' };
    if (data.note !== undefined && data.note !== '') payload.note = data.note;
    const response = await managementApi.post(
      `/api-hrm/work-finalization/approvals/${approvalId}/approve/`,
      payload
    );
    return response.data;
  }

  async reject(
    approvalId: number,
    data: ApproveRejectRequest = {}
  ): Promise<DepartmentWorkFinalizationApproval> {
    const payload: any = { action: 'REJECTED' };
    if (data.note !== undefined && data.note !== '') payload.note = data.note;
    const response = await managementApi.post(
      `/api-hrm/work-finalization/approvals/${approvalId}/approve/`,
      payload
    );
    return response.data;
  }
}

export const workFinalizationApprovalService = new WorkFinalizationApprovalService();
export default workFinalizationApprovalService;
