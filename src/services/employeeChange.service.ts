import { managementApi } from '../utils/api';

// ── Điều chỉnh nhân sự (phòng ban / chức vụ / lương / phụ cấp / lương BH) ──────────
// Backend: hrm/employee_change_views.py. Ngày áp dụng trong tương lai thì dòng ở trạng
// thái SCHEDULED và được áp vào hồ sơ đúng ngày đó.

export type EmployeeChangeType = 'ORG' | 'SALARY';
export type EmployeeChangeStatus = 'SCHEDULED' | 'APPLIED' | 'CANCELLED';
export type EmployeeChangeSource = 'PAGE' | 'AUTO';

export interface EmployeeChangeRecord {
  id: number;
  employee: number;
  employee_code: string;
  employee_name: string;
  change_type: EmployeeChangeType;
  change_type_display: string;
  status: EmployeeChangeStatus;
  status_display: string;
  source: EmployeeChangeSource;
  source_display: string;
  effective_date: string;
  note: string;
  changes_department: boolean;
  changes_position: boolean;
  old_department: number | null;
  old_department_name: string;
  new_department: number | null;
  new_department_name: string;
  old_position: number | null;
  old_position_name: string;
  new_position: number | null;
  new_position_name: string;
  // Decimal trả về dạng chuỗi; new_* null = khoản đó không đổi.
  old_basic_salary: string | null;
  new_basic_salary: string | null;
  old_allowance: string | null;
  new_allowance: string | null;
  old_insurance_salary: string | null;
  new_insurance_salary: string | null;
  /** Ngày bắt đầu mốc cấu hình lương đã mở cho lần điều chỉnh (luôn là ngày 1 của tháng). */
  salary_config_from: string | null;
  created_by_name: string;
  created_at: string;
  applied_at: string | null;
  cancelled_by_name: string;
  cancelled_at: string | null;
  apply_error: string;
}

export interface EmployeeCurrentValues {
  employee: number;
  employee_code: string;
  employee_name: string;
  department_id: number | null;
  department_name: string;
  position_id: number | null;
  position_name: string;
  basic_salary: string | null;
  allowance: string | null;
  insurance_salary: string | null;
  pending: EmployeeChangeRecord[];
}

export interface EmployeeChangeListParams {
  page?: number;
  page_size?: number;
  employee?: number;
  change_type?: EmployeeChangeType | '';
  /** Có thể truyền nhiều trạng thái, ngăn cách bằng dấu phẩy. */
  status?: string;
  source?: EmployeeChangeSource | '';
  department?: number | '';
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface EmployeeChangeCreatePayload {
  employee: number;
  change_type: EmployeeChangeType;
  effective_date: string; // YYYY-MM-DD
  note?: string;
  // ORG — chỉ gửi khoản nào thực sự đổi.
  department_id?: number;
  position_id?: number;
  // SALARY — chỉ gửi khoản nào thực sự đổi.
  basic_salary?: number;
  allowance?: number;
  insurance_salary?: number;
}

// ── Cảnh báo quan trọng ────────────────────────────────────────────────────────────

export interface AlertEmployeeInfo {
  id: number;
  employee_code: string;
  full_name: string;
  department: string;
  position: string;
  contract_type: string;
  contract_type_display: string;
}

export interface ContractAlert extends AlertEmployeeInfo {
  contract_end_date: string;
  /** Âm = đã quá hạn bấy nhiêu ngày. */
  days_left: number;
  status: 'EXPIRING' | 'EXPIRED';
}

export interface InsuranceAlert extends AlertEmployeeInfo {
  start_date: string;
  due_date: string;
  days_left: number;
  status: 'UPCOMING' | 'OVERDUE';
}

export interface ImportantAlerts {
  today: string;
  rules: {
    contract_alert_days: number;
    insurance_probation_months: number;
    insurance_alert_days: number;
    insurance_overdue_days: number;
  };
  contracts: ContractAlert[];
  insurance: InsuranceAlert[];
  counts: {
    contracts_expiring: number;
    contracts_expired: number;
    insurance_upcoming: number;
    insurance_overdue: number;
    total: number;
  };
}

// ── Báo cáo biến động lương ────────────────────────────────────────────────────────

export type SalaryMetricKey = 'tong_thu_nhap' | 'luong_thuc_linh' | 'con_phai_thanh_toan';
export type SalaryMetricValues = Record<SalaryMetricKey, number>;

export interface SalaryComparisonRow {
  employee_id: number | null;
  employee_code: string;
  full_name: string;
  department: string;
  position: string;
  legal_entity: string;
  legal_entity_name: string;
  department_a: string;
  /** Pháp nhân tháng A — đã quy về mã hiện hành (bảng lương cũ có thể lưu tên cũ). */
  legal_entity_a: string;
  legal_entity_a_name: string;
  in_month_a: boolean;
  in_month_b: boolean;
  month_a: SalaryMetricValues | null;
  month_b: SalaryMetricValues | null;
  diff: SalaryMetricValues;
  /** null khi tháng trước không có lương (không chia được). */
  diff_percent: Record<SalaryMetricKey, number | null>;
}

export interface SalaryComparisonReport {
  month_a: { year: number; month: number; label: string; is_finalized: boolean };
  month_b: { year: number; month: number; label: string; is_finalized: boolean };
  metrics: Array<{ key: SalaryMetricKey; label: string }>;
  rows: SalaryComparisonRow[];
  totals: {
    month_a: SalaryMetricValues;
    month_b: SalaryMetricValues;
    diff: SalaryMetricValues;
    employee_count: number;
  };
}

export interface SalaryComparisonParams {
  month_a: string; // YYYY-MM
  month_b: string; // YYYY-MM
  department?: number | '';
  legal_entity?: string;
  /** Mã hoặc tên nhân viên. */
  employee?: string;
}

const clean = <T extends object>(params: T) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export const employeeChangeService = {
  async list(params: EmployeeChangeListParams = {}) {
    const res = await managementApi.get<{ count: number; results: EmployeeChangeRecord[] }>(
      '/api-hrm/employee-changes/', { params: clean(params) },
    );
    return res.data;
  },

  async current(employeeId: number) {
    const res = await managementApi.get<EmployeeCurrentValues>('/api-hrm/employee-changes/current/', {
      params: { employee: employeeId },
    });
    return res.data;
  },

  async create(payload: EmployeeChangeCreatePayload) {
    const res = await managementApi.post<EmployeeChangeRecord>('/api-hrm/employee-changes/', payload);
    return res.data;
  },

  async cancel(id: number) {
    const res = await managementApi.post<EmployeeChangeRecord>(`/api-hrm/employee-changes/${id}/cancel/`);
    return res.data;
  },

  async importantAlerts() {
    const res = await managementApi.get<ImportantAlerts>('/api-hrm/important-alerts/');
    return res.data;
  },

  async salaryComparison(params: SalaryComparisonParams) {
    const res = await managementApi.get<SalaryComparisonReport>(
      '/api/v1/salary/records/comparison-report/', { params: clean(params) },
    );
    return res.data;
  },
};

/** Gom lỗi DRF ({field: [msg]} / {detail} / {non_field_errors}) thành một câu đọc được. */
export function apiErrorMessage(err: unknown, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.'): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    const parts: string[] = [];
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(value)) parts.push(...value.map(String));
      else if (value && typeof value === 'object') parts.push(...Object.values(value).map(String));
      else if (value) parts.push(String(value));
    }
    if (parts.length) return parts.join(' ');
  }
  return fallback;
}
