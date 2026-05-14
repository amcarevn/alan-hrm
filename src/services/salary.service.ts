import { managementApi } from '../utils/api';
import type { Department, Employee } from '../utils/api';

export interface SalaryFormulaConfig {
  employee_id: number;
  basic_salary: number;
  allowance: number;
  probation_rate?: string;
  salary_notes?: string;
  allowance_notes?: string;
  salary_adjustments?: Record<string, unknown>;
}

export interface SalaryRecord {
  employee_id: number;
  ma_nv: string;
  ho_va_ten: string;
  phap_nhan_con?: string | null;
  phong_ban: string | null;
  vi_tri: string | null;
  luong_co_ban: number;
  phu_cap: number;
  thu_nhap_khac?: number;
  ngay_cong: number;
  cong_thu_viec?: number;
  cong_chinh_thuc: number;
  probation_rate_percent?: number;
  luong_ngay_cong_thu_viec?: number;
  luong_ngay_cong_chinh_thuc?: number;
  luong_ngay_cong?: number;
  tang_ca: number;
  truc_toi: number;
  lam_them_gio: number;
  phu_cap_gui_xe: number;
  phu_cap_khac: number;
  tong_cong: number;
  tong_phat: number;
  tong_phat_bienban: number;
  bh_deduction: number;
  so_gio_tang_ca: number;
  luong_tang_ca: number;
  contract_type?: string;
  contract_status?: 'CHINH_THUC' | 'THU_VIEC';
  phu_cap_an_trua?: number;
  tong_thu_nhap_chiu_thue?: number;
  thue_tncn?: number;
  tax_method?: 'PROGRESSIVE' | 'FLAT_10_PROBATION' | 'FLAT_10_NON_OFFICIAL' | 'FLAT_10_MIXED_LT14';
  so_nguoi_phu_thuoc?: number;
  thu_nhap_tinh_thue?: number;
  giam_tru_ban_than?: number;
  giam_tru_nguoi_phu_thuoc?: number;
  bao_hiem_bat_buoc?: number;
  tam_ung: number;
  luong_thuc_linh: number;
  year: number;
  month: number;
}

export interface SalaryListResponse {
  year: number;
  month: number;
  department_id: number | null;
  legal_entity?: string | null;
  department_name: string | null;
  total: number;
  results: SalaryRecord[];
}

export interface SalaryFormulaUpdateData {
  basic_salary?: number;
  allowance?: number;
  salary_notes?: string;
  allowance_notes?: string;
  salary_adjustments?: Record<string, unknown>;
}

export interface KPIRecord {
  id: number;
  employee: number;
  employee_name: string;
  employee_code: string;
  year: number;
  month: number;
  commission_amount: number;
  notes: string;
}

export interface PenaltyRecord {
  id: number;
  employee: number;
  employee_name: string;
  employee_code: string;
  year: number;
  month: number;
  amount: number;
  reason: string;
  notes: string;
}

export interface BulkImportPenaltyRecord {
  employee_code: string;
  amount: number;
  reason: string;
}

export interface BulkImportPenaltySuccessItem {
  id: number;
  employee_code: string;
  employee_name: string;
  amount: number;
  reason: string;
}

export interface BulkImportPenaltyErrorItem {
  employee_code: string;
  error: string;
}

export interface BulkImportPenaltyResponse {
  success: BulkImportPenaltySuccessItem[];
  errors: BulkImportPenaltyErrorItem[];
}

export interface CommissionRecord {
  id: number;
  employee: number;
  employee_name: string;
  employee_code: string;
  year: number;
  month: number;
  amount: number;
  notes: string;
}

export interface BulkImportCommissionRecord {
  employee_code: string;
  commission_amount: number;
}

export interface BulkImportCommissionResponse {
  success: { employee_code: string; employee_name: string; commission_amount: number; created: boolean }[];
  errors:  { employee_code: string; error: string }[];
}

export interface AdvanceRecord {
  id: number;
  employee: number;
  employee_name: string;
  employee_code: string;
  year: number;
  month: number;
  amount: number;
  notes: string;
}

export interface BulkImportAdvanceRecord {
  employee_code: string;
  amount: number;
}

export interface BulkImportAdvanceResponse {
  success: { employee_code: string; employee_name: string; amount: number; created: boolean }[];
  errors:  { employee_code: string; error: string }[];
}

export interface OtherAllowanceRecord {
  id: number;
  employee: number;
  employee_name: string;
  employee_code: string;
  year: number;
  month: number;
  amount: number;
  description: string;
  notes: string;
}

export interface BulkImportOtherAllowanceRecord {
  employee_code: string;
  amount: number;
  description: string;
}

export interface BulkImportOtherAllowanceResponse {
  success: { employee_code: string; employee_name: string; amount: number; description: string; created: boolean }[];
  errors:  { employee_code: string; error: string }[];
}

export interface OvertimeRateConfig {
  id: number;
  department_ids:    number[];
  department_names:  string[];
  position_ids:      number[];
  position_names:    string[];
  employee_ids:      number[];
  employee_names:    { id: number; name: string; code: string }[];
  apply_to_all:      boolean;
  calc_method:       'FIXED' | 'FROM_BASIC';
  rate_per_hour:     number;
  multiplier:        number;
  use_kpi:           boolean;
  kpi_multiplier:    number | null;
  kpi_rate_per_hour: number | null;
  kpi_threshold:     number;
  effective_from:    string;
  effective_to:      string | null;
  is_active:         boolean;
  notes:             string;
  created_at:        string;
  updated_at:        string;
}

export type OvertimeRateLevel = 'department' | 'position' | 'employee' | 'all';

export interface BulkSalaryConfigRecord {
  employee_code: string;
  effective_date: string;
  basic_salary?: number;
  salary_factor?: number;
  lunch_mode?: string;
  lunch_amount?: number;
  parking_mode?: string;
  parking_rate?: number;
  responsibility_mode?: string;
  responsibility_amount?: number;
  region?: string;
  insurance_mode?: string;
  insurance_override?: number;
  dependent_count?: number;
  union_fee?: number;
}

export interface BulkSalaryConfigResponse {
  success: { employee_code: string; employee_name: string }[];
  errors: { employee_code: string; error: string }[];
}

export interface SendDepartmentPayslipPayload {
  year: number;
  month: number;
  department_id: number;
  subject_template?: string;
  body_template?: string;
}

export interface SendDepartmentPayslipResponse {
  detail: string;
  batch_id: string;
  department_id: number;
  department_name: string;
  year: number;
  month: number;
  total: number;
  queued: number;
  skipped_no_email: number;
}

export interface DepartmentPayslipRecipient {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  email: string;
  has_email: boolean;
  preview_subject: string;
  preview_body: string;
}

export interface DepartmentPayslipRecipientsResponse {
  year: number;
  month: number;
  department_id: number;
  department_name: string;
  total: number;
  can_send: number;
  no_email_count: number;
  recipients: DepartmentPayslipRecipient[];
}

export interface DepartmentPayslipEmailStatusItem {
  employee_id: number;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | null;
  processed_at: string | null;
  error_message: string | null;
  batch_id: string | null;
}

export interface DepartmentPayslipEmailStatusesResponse {
  statuses: DepartmentPayslipEmailStatusItem[];
}

export interface CompanyPayslipRecipientsResponse {
  year: number;
  month: number;
  total: number;
  can_send: number;
  no_email_count: number;
  recipients: DepartmentPayslipRecipient[];
}

export interface SendCompanyPayslipPayload {
  year: number;
  month: number;
  legal_entity?: string;
  subject_template?: string;
  body_template?: string;
}

export interface SendCompanyPayslipResponse {
  detail: string;
  batch_id: string;
  year: number;
  month: number;
  total: number;
  queued: number;
  skipped_no_email: number;
}

export interface PayslipEmailItem {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  email: string;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
  processed_at: string | null;
  error_message: string | null;
  retry_count: number;
}

export interface PayslipEmailBatchStatus {
  batch_id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  total: number;
  sent: number;
  failed: number;
  pending: number;
  progress_pct: number;
  created_at: string;
  completed_at: string | null;
  emails: PayslipEmailItem[];
}

class SalaryService {
  async listSalaryDepartments(): Promise<Pick<Department, 'id' | 'name' | 'code'>[]> {
    const response = await managementApi.get('/api/v1/salary/records/departments/');
    return response.data;
  }

  async listSalaryLegalEntities(): Promise<Array<{ value: string; label: string }>> {
    const response = await managementApi.get('/api/v1/salary/records/legal-entities/');
    return response.data;
  }

  async getSalaryByDepartment(params: {
    year: number;
    month: number;
    department_id?: number;
    legal_entity?: string;
    employee_code?: string;
  }): Promise<SalaryListResponse> {
    const response = await managementApi.get('/api-hrm/salary/department/', { params });
    return response.data;
  }

  async updateSalaryFormula(
    employeeId: number,
    data: SalaryFormulaUpdateData
  ): Promise<Employee> {
    const response = await managementApi.patch(`/api-hrm/employees/${employeeId}/`, data);
    return response.data;
  }

  async getEmployeeSalaryConfig(employeeId: number): Promise<Employee> {
    const response = await managementApi.get(`/api-hrm/employees/${employeeId}/`);
    return response.data;
  }

  async listEmployeeSalaries(params: {
    page?: number;
    page_size?: number;
    search?: string;
    department?: number;
    employment_status?: string;
    ordering?: string;
  }): Promise<{
    count: number;
    next: string | null;
    previous: string | null;
    results: Employee[];
  }> {
    const response = await managementApi.get('/api-hrm/employees/', { params });
    return response.data;
  }

  async listKPIRecords(params: { year: number; month: number }): Promise<KPIRecord[]> {
    const response = await managementApi.get('/api/v1/salary/kpi-records/', { params: { ...params, page_size: 500 } });
    return response.data.results ?? response.data;
  }

  async updateKPIRecord(id: number, data: { commission_amount: number; notes?: string }): Promise<KPIRecord> {
    const response = await managementApi.patch(`/api/v1/salary/kpi-records/${id}/`, data);
    return response.data;
  }

  async deleteKPIRecord(id: number): Promise<void> {
    await managementApi.delete(`/api/v1/salary/kpi-records/${id}/`);
  }

  async listPenalties(params: { year: number; month: number }): Promise<PenaltyRecord[]> {
    const response = await managementApi.get('/api/v1/salary/penalties/', { params: { ...params, page_size: 500 } });
    return response.data.results ?? response.data;
  }

  async updatePenalty(id: number, data: { amount: number; reason: string; notes?: string }): Promise<PenaltyRecord> {
    const response = await managementApi.patch(`/api/v1/salary/penalties/${id}/`, data);
    return response.data;
  }

  async deletePenalty(id: number): Promise<void> {
    await managementApi.delete(`/api/v1/salary/penalties/${id}/`);
  }

  async bulkImportPenalties(params: {
    year: number;
    month: number;
    records: BulkImportPenaltyRecord[];
  }): Promise<BulkImportPenaltyResponse> {
    const response = await managementApi.post('/api/v1/salary/penalties/bulk-import/', params);
    return response.data;
  }

  async listCommissions(params: { year: number; month: number }): Promise<CommissionRecord[]> {
    const response = await managementApi.get('/api/v1/salary/commissions/', { params: { ...params, page_size: 500 } });
    return response.data.results ?? response.data;
  }

  async updateCommission(id: number, data: { amount: number; notes?: string }): Promise<CommissionRecord> {
    const response = await managementApi.patch(`/api/v1/salary/commissions/${id}/`, data);
    return response.data;
  }

  async deleteCommission(id: number): Promise<void> {
    await managementApi.delete(`/api/v1/salary/commissions/${id}/`);
  }

  async bulkImportCommissions(params: {
    year: number;
    month: number;
    records: BulkImportCommissionRecord[];
  }): Promise<BulkImportCommissionResponse> {
    const response = await managementApi.post('/api/v1/salary/commissions/bulk-import/', params);
    return response.data;
  }

  // --- OvertimeRateConfig ---

  async listOvertimeRates(level?: OvertimeRateLevel): Promise<OvertimeRateConfig[]> {
    const params = level ? { level } : {};
    const response = await managementApi.get('/api/v1/salary/overtime-rates/', { params });
    return response.data.results ?? response.data;
  }

  async createOvertimeRate(data: Omit<OvertimeRateConfig, 'id' | 'created_at' | 'updated_at'>): Promise<OvertimeRateConfig> {
    const response = await managementApi.post('/api/v1/salary/overtime-rates/', data);
    return response.data;
  }

  async updateOvertimeRate(id: number, data: Partial<Omit<OvertimeRateConfig, 'id' | 'created_at' | 'updated_at'>>): Promise<OvertimeRateConfig> {
    const response = await managementApi.patch(`/api/v1/salary/overtime-rates/${id}/`, data);
    return response.data;
  }

  async deleteOvertimeRate(id: number): Promise<void> {
    await managementApi.delete(`/api/v1/salary/overtime-rates/${id}/`);
  }

  async listAdvances(params: { year: number; month: number }): Promise<AdvanceRecord[]> {
    const response = await managementApi.get('/api/v1/salary/advances/', { params: { ...params, page_size: 500 } });
    return response.data.results ?? response.data;
  }

  async updateAdvance(id: number, data: { amount: number; notes?: string }): Promise<AdvanceRecord> {
    const response = await managementApi.patch(`/api/v1/salary/advances/${id}/`, data);
    return response.data;
  }

  async deleteAdvance(id: number): Promise<void> {
    await managementApi.delete(`/api/v1/salary/advances/${id}/`);
  }

  async bulkImportAdvances(params: {
    year: number;
    month: number;
    records: BulkImportAdvanceRecord[];
  }): Promise<BulkImportAdvanceResponse> {
    const response = await managementApi.post('/api/v1/salary/advances/bulk-import/', params);
    return response.data;
  }

  async listOtherAllowances(params: { year: number; month: number }): Promise<OtherAllowanceRecord[]> {
    const response = await managementApi.get('/api/v1/salary/other-allowances/', { params: { ...params, page_size: 500 } });
    return response.data.results ?? response.data;
  }

  async updateOtherAllowance(id: number, data: { amount: number; description?: string; notes?: string }): Promise<OtherAllowanceRecord> {
    const response = await managementApi.patch(`/api/v1/salary/other-allowances/${id}/`, data);
    return response.data;
  }

  async deleteOtherAllowance(id: number): Promise<void> {
    await managementApi.delete(`/api/v1/salary/other-allowances/${id}/`);
  }

  async bulkImportOtherAllowances(params: {
    year: number;
    month: number;
    records: BulkImportOtherAllowanceRecord[];
  }): Promise<BulkImportOtherAllowanceResponse> {
    const response = await managementApi.post('/api/v1/salary/other-allowances/bulk-import/', params);
    return response.data;
  }

  async bulkImportSalaryConfig(records: BulkSalaryConfigRecord[]): Promise<BulkSalaryConfigResponse> {
    const response = await managementApi.post('/api-hrm/employees/bulk-salary-config/', { records });
    return response.data;
  }

  async sendPayslipEmail(
    payload: { email: string; subject: string; body: string; employee_id: number; year: number; month: number; recipient_name?: string },
    options?: { timeoutMs?: number }
  ): Promise<{ detail: string }> {
    const response = await managementApi.post('/api/v1/salary/records/send-payslip-email/', payload, {
      timeout: options?.timeoutMs ?? 120000,
    });
    return response.data;
  }

  async sendDepartmentPayslipEmails(
    payload: SendDepartmentPayslipPayload,
    options?: { timeoutMs?: number }
  ): Promise<SendDepartmentPayslipResponse> {
    const response = await managementApi.post('/api/v1/salary/records/send-department-payslip-emails/', payload, {
      timeout: options?.timeoutMs ?? 30000,
    });
    return response.data;
  }

  async getDepartmentPayslipRecipients(params: {
    year: number;
    month: number;
    department_id: number;
  }): Promise<DepartmentPayslipRecipientsResponse> {
    const response = await managementApi.get('/api/v1/salary/records/department-payslip-recipients/', { params });
    return response.data;
  }

  async getDepartmentPayslipEmailStatuses(params: {
    year: number;
    month: number;
    department_id?: number;
    legal_entity?: string;
  }): Promise<DepartmentPayslipEmailStatusesResponse> {
    const response = await managementApi.get('/api/v1/salary/records/department-payslip-email-statuses/', { params });
    return response.data;
  }

  async getCompanyPayslipRecipients(params: {
    year: number;
    month: number;
    legal_entity?: string;
  }): Promise<CompanyPayslipRecipientsResponse> {
    const response = await managementApi.get('/api/v1/salary/records/company-payslip-recipients/', { params });
    return response.data;
  }

  async sendCompanyPayslipEmails(
    payload: SendCompanyPayslipPayload,
    options?: { timeoutMs?: number }
  ): Promise<SendCompanyPayslipResponse> {
    const response = await managementApi.post('/api/v1/salary/records/send-company-payslip-emails/', payload, {
      timeout: options?.timeoutMs ?? 30000,
    });
    return response.data;
  }

  async getPayslipEmailBatchStatus(batchId: string): Promise<PayslipEmailBatchStatus> {
    const response = await managementApi.get(`/api/v1/salary/records/payslip-email-batch/${batchId}/`);
    return response.data;
  }

  async getTotalSalarySummary(params: {
    year: number;
    month: number;
    department?: number;
    legal_entity?: string;
  }): Promise<{
    year: number;
    month: number;
    department_id: number | null;
    legal_entity?: string | null;
    total_luong_thuc_linh: number;
    total_con_phai_thanh_toan: number;
    total_thue_tncn: number;
    total_net_salary: number;
    employee_count: number;
  }> {
    const response = await managementApi.get('/api/v1/salary/records/total-summary/', { params });
    return response.data;
  }
}

export const salaryService = new SalaryService();
export default salaryService;
