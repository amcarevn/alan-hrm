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
}

export const salaryService = new SalaryService();
export default salaryService;
