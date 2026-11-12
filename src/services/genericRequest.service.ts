import { managementApi } from '../utils/api/client';

export type GenericRequestType = 'RESIGNATION' | 'SALARY_ADVANCE' | 'PROPOSAL' | 'CONFIRMATION' | 'COMPLAINT' | 'OTHER';
export type GenericRequestStatus =
  | 'DRAFT'
  | 'PENDING_MANAGER'
  | 'PENDING_ADMIN'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';


export interface GenericRequest {
  id: number;
  request_code: string | null;
  request_type: GenericRequestType;
  request_type_display: string;
  title: string;
  reason: string;
  expected_date: string | null;
  extra_data: Record<string, any>;
  attachment?: string | null;
  status: GenericRequestStatus;
  status_display: string;
  employee: number;
  employee_name: string;
  employee_code: string;
  employee_department: string | null;
  employee_position: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;

  // Approval workflow tracking
  manager_approved_at: string | null;
  manager_approved_by: number | null;
  manager_approved_by_name: string | null;
  admin_approved_at: string | null;
  admin_approved_by: number | null;
  admin_approved_by_name: string | null;
  rejected_level: 'MANAGER' | 'ADMIN' | null;
  rejected_at: string | null;
  approval_note: string;
}

export interface GenericRequestListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: GenericRequestStatus | '';
  request_type?: GenericRequestType | '';
  month?: number;
  year?: number;
  /** 'me' = đơn của user hiện tại; 'subordinates' = đơn cấp dưới (loại trừ chính mình) */
  owner?: 'me' | 'subordinates';
}

export interface GenericRequestPayload {
  request_type: GenericRequestType;
  title: string;
  reason: string;
  expected_date?: string | null;
  extra_data?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface SalaryAdvanceApprovalLockState {
  is_locked: boolean;
  updated_by_name: string | null;
  updated_at: string | null;
}

/** GET /api-hrm/salary-advance/config/ — quy định tạm ứng lương lấy từ backend (cùng nguồn backend dùng để
 * kiểm tra khi tạo / duyệt đơn; cùng đường dẫn và dạng dữ liệu với Trung Anh). Web không tự ghi số, cờ bật
 * tắt hay khung ngày. Chỉ khai báo phần web dùng. */
export type SalaryAdvanceConfig = {
  /** Trần tuyệt đối (đ); null = đang tắt (Alan chỉ giới hạn theo % lương cơ bản). */
  max_amount: number | null;
  /** Tỷ lệ trên lương cơ bản (0.3 = 30%); không áp khi chưa có lương cơ bản. */
  max_ratio: number;
  max_ratio_percent: number;
  /** Khung tạo đơn: enabled = false là nhận đơn mọi ngày; text = 'từ ngày 1 đến ngày 3'. */
  window: { enabled: boolean; first_day: number; last_day: number; text: string; open: boolean };
  /** Tạo được ngay lúc này — chưa xét điều kiện cá nhân. */
  can_create: boolean;
  /** Khung duyệt đơn: text = 'trong 3 ngày đầu tháng'. */
  approval_window: { enabled: boolean; first_day: number; last_day: number; text: string; open: boolean };
  /** Điều kiện để hiển thị. */
  conditions: string[];
};

class GenericRequestService {
  private base = '/api-hrm/generic-requests/';

  async list(params: GenericRequestListParams = {}): Promise<PaginatedResponse<GenericRequest>> {
    // Loại field rỗng để không gửi lên BE
    const cleanParams: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) cleanParams[k] = v;
    });
    const res = await managementApi.get(this.base, { params: cleanParams });
    return res.data;
  }

  async create(payload: GenericRequestPayload): Promise<GenericRequest> {
    const res = await managementApi.post(this.base, payload);
    return res.data;
  }

  async update(id: number, payload: Partial<GenericRequestPayload>): Promise<GenericRequest> {
    const res = await managementApi.patch(`${this.base}${id}/`, payload);
    return res.data;
  }

  async remove(id: number): Promise<void> {
    await managementApi.delete(`${this.base}${id}/`);
  }

  async submit(id: number): Promise<GenericRequest> {
    const res = await managementApi.post(`${this.base}${id}/submit/`);
    return res.data;
  }

  async cancel(id: number): Promise<GenericRequest> {
    const res = await managementApi.post(`${this.base}${id}/cancel/`);
    return res.data;
  }

  /** Manager duyệt cấp 1 (PENDING_MANAGER → PENDING_ADMIN) */
  async managerApprove(id: number, note?: string): Promise<GenericRequest> {
    const res = await managementApi.post(`${this.base}${id}/manager-approve/`, {
      approval_note: note || '',
    });
    return res.data;
  }

  /** Admin duyệt cấp 2 cuối (PENDING_ADMIN → APPROVED) */
  async adminApprove(id: number, note?: string): Promise<GenericRequest> {
    const res = await managementApi.post(`${this.base}${id}/admin-approve/`, {
      approval_note: note || '',
    });
    return res.data;
  }

  /** Từ chối đơn (Manager hoặc Admin tuỳ status hiện tại) */
  async reject(id: number, note?: string): Promise<GenericRequest> {
    const res = await managementApi.post(`${this.base}${id}/reject/`, {
      approval_note: note || '',
    });
    return res.data;
  }

  /**
   * Fill template DOCX với data đơn → convert PDF.
   * Trả về object URL để gán vào <iframe>.
   */
  async previewPdf(id: number): Promise<string> {
    const res = await managementApi.get(`${this.base}${id}/preview-pdf/`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(res.data);
  }

  /** Quy định tạm ứng lương (mức tối đa, khung ngày, điều kiện) theo backend. */
  async getSalaryAdvanceConfig(): Promise<SalaryAdvanceConfig> {
    const res = await managementApi.get('/api-hrm/salary-advance/config/');
    return res.data;
  }

  async getApprovalLock(): Promise<SalaryAdvanceApprovalLockState> {
    const res = await managementApi.get(`${this.base}approval-lock/`);
    return res.data;
  }

  async setApprovalLock(isLocked: boolean): Promise<SalaryAdvanceApprovalLockState> {
    const res = await managementApi.post(`${this.base}approval-lock/`, { is_locked: isLocked });
    return res.data;
  }
}

export default new GenericRequestService();
