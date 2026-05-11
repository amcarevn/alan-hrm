import { managementApi } from '../utils/api';
import type { Employee } from '../utils/api';

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
  phong_ban: string | null;
  vi_tri: string | null;
  luong_co_ban: number;
  phu_cap: number;
  ngay_cong: number;
  cong_chinh_thuc: number;
  tang_ca: number;
  truc_toi: number;
  lam_them_gio: number;
  phu_cap_gui_xe: number;
  tong_cong: number;
  tong_phat: number;
  luong_tang_ca: number;
  luong_thuc_linh: number;
  year: number;
  month: number;
}

export interface SalaryListResponse {
  year: number;
  month: number;
  department_id: number | null;
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

class SalaryService {
  async getSalaryByDepartment(params: {
    year: number;
    month: number;
    department_id?: number;
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
}

export const salaryService = new SalaryService();
export default salaryService;
