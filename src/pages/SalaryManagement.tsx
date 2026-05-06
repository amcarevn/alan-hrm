import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  UserIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  TableCellsIcon,
  ExclamationCircleIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { departmentsAPI, employeesAPI } from '../utils/api';
import type { Department, Employee } from '../utils/api';
import { salaryService, SalaryFormulaUpdateData, SalaryRecord } from '../services/salary.service';
import { SelectBox } from '../components/LandingLayout/SelectBox';

const TABS = [
  { key: 'config', label: 'Cấu hình tính lương', icon: CurrencyDollarIcon },
  { key: 'view', label: 'Bảng lương', icon: TableCellsIcon },
];

type SalaryTabKey = 'config' | 'view';

interface SalaryManagementProps {
  defaultTab?: SalaryTabKey;
  lockTab?: boolean;
}

interface SalaryConfigurationValues {
  effectiveDate: string;
  baseProfile: {
    jobTitle: string;
    level: string;
    department: string;
    contractType: string;
    workLocation: string;
  };
  baseSalary: {
    payType: 'monthly' | 'hourly' | 'daily';
    amount: number;
    factor: number;
    regionalMinimum: number;
  };
  allowances: {
    lunch: number;
    transport: number;
    phone: number;
    housing: number;
    responsibility: number;
    hazardous: number;
  };
  lunchAllowancePolicy: LunchAllowancePolicy;
  variablePay: {
    salesCommission: number;
    kpiBonus: number;
    quarterlyBonus: number;
    projectBonus: number;
    innovationBonus: number;
  };
  timeAttendance: {
    workingDays: number;
    workingHours: number;
    overtimeHours: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    lateEarlyCount: number;
  };
  deductions: {
    pit: number;
    socialInsurance: number;
    healthInsurance: number;
    unemploymentInsurance: number;
    unionFee: number;
    advancePenaltyCompensation: number;
  };
  employerContributions: {
    socialInsurance: number;
    healthInsurance: number;
    unemploymentInsurance: number;
    supplementalInsurance: number;
  };
  adjustments: {
    retroactiveCollect: number;
    retroactivePay: number;
    priorPeriodCorrection: number;
    irregularRewardPenalty: number;
  };
}

interface SalaryConfigEvent {
  type: string;
  effective_date: string;
  changed_at: string;
  payload: SalaryConfigurationValues;
}

interface PayrollOutput {
  grossIncome: number;
  totalDeductions: number;
  netSalary: number;
}

interface LunchAllowancePolicy {
  mode: 'fixed' | 'actual_working_day';
  fixed_amount: number;
  amount_per_work_day: number;
  monthly_cap: number;
}

const MAX_LUNCH_ALLOWANCE_CAP = 500000;

const DEFAULT_SALARY_CONFIG: SalaryConfigurationValues = {
  effectiveDate: new Date().toISOString().slice(0, 10),
  baseProfile: {
    jobTitle: '',
    level: '',
    department: '',
    contractType: 'FULL_TIME',
    workLocation: '',
  },
  baseSalary: {
    payType: 'monthly',
    amount: 0,
    factor: 1,
    regionalMinimum: 0,
  },
  allowances: {
    lunch: 0,
    transport: 0,
    phone: 0,
    housing: 0,
    responsibility: 0,
    hazardous: 0,
  },
  lunchAllowancePolicy: {
    mode: 'fixed',
    fixed_amount: 0,
    amount_per_work_day: 0,
    monthly_cap: MAX_LUNCH_ALLOWANCE_CAP,
  },
  variablePay: {
    salesCommission: 0,
    kpiBonus: 0,
    quarterlyBonus: 0,
    projectBonus: 0,
    innovationBonus: 0,
  },
  timeAttendance: {
    workingDays: 26,
    workingHours: 208,
    overtimeHours: 0,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
    lateEarlyCount: 0,
  },
  deductions: {
    pit: 0,
    socialInsurance: 0,
    healthInsurance: 0,
    unemploymentInsurance: 0,
    unionFee: 0,
    advancePenaltyCompensation: 0,
  },
  employerContributions: {
    socialInsurance: 0,
    healthInsurance: 0,
    unemploymentInsurance: 0,
    supplementalInsurance: 0,
  },
  adjustments: {
    retroactiveCollect: 0,
    retroactivePay: 0,
    priorPeriodCorrection: 0,
    irregularRewardPenalty: 0,
  },
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asRecord = (value: unknown): Record<string, any> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return {};
};

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('vi-VN') + 'đ';
};

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('vi-VN');
};

const calculateLunchAllowance = (policy: LunchAllowancePolicy, actualWorkDays: number) => {
  const cap = Math.min(Math.max(toNumber(policy.monthly_cap, MAX_LUNCH_ALLOWANCE_CAP), 0), MAX_LUNCH_ALLOWANCE_CAP);
  if (policy.mode === 'actual_working_day') {
    const amount = Math.max(actualWorkDays, 0) * Math.max(toNumber(policy.amount_per_work_day), 0);
    return Math.min(amount, cap);
  }
  return Math.min(Math.max(toNumber(policy.fixed_amount), 0), cap);
};

const calculateActualWorkDays = (timeAttendance: SalaryConfigurationValues['timeAttendance']) => {
  return Math.max(timeAttendance.workingDays - timeAttendance.unpaidLeaveDays, 0);
};

const parseEmployeeSalaryConfig = (employee: Employee): SalaryConfigurationValues => {
  const adjustments = asRecord(employee.salary_adjustments);
  const savedConfig = asRecord(adjustments.payroll_config);
  const savedLunchPolicy = asRecord(savedConfig.lunchAllowancePolicy);

  const lunchPolicy: LunchAllowancePolicy = {
    mode: savedLunchPolicy.mode === 'actual_working_day' ? 'actual_working_day' : 'fixed',
    fixed_amount: toNumber(savedLunchPolicy.fixed_amount, toNumber(savedConfig.allowances?.lunch)),
    amount_per_work_day: toNumber(savedLunchPolicy.amount_per_work_day),
    monthly_cap: Math.min(
      Math.max(toNumber(savedLunchPolicy.monthly_cap, MAX_LUNCH_ALLOWANCE_CAP), 0),
      MAX_LUNCH_ALLOWANCE_CAP
    ),
  };

  return {
    effectiveDate:
      (savedConfig.effectiveDate as string | undefined) ||
      employee.official_start_date ||
      employee.start_date ||
      DEFAULT_SALARY_CONFIG.effectiveDate,
    baseProfile: {
      jobTitle:
        (savedConfig.baseProfile?.jobTitle as string | undefined) ||
        employee.position?.title ||
        '',
      level:
        (savedConfig.baseProfile?.level as string | undefined) ||
        employee.rank ||
        '',
      department:
        (savedConfig.baseProfile?.department as string | undefined) ||
        employee.department?.name ||
        '',
      contractType:
        (savedConfig.baseProfile?.contractType as string | undefined) ||
        employee.contract_type ||
        DEFAULT_SALARY_CONFIG.baseProfile.contractType,
      workLocation:
        (savedConfig.baseProfile?.workLocation as string | undefined) ||
        employee.work_location ||
        '',
    },
    baseSalary: {
      payType:
        (savedConfig.baseSalary?.payType as 'monthly' | 'hourly' | 'daily' | undefined) ||
        DEFAULT_SALARY_CONFIG.baseSalary.payType,
      amount:
        toNumber(savedConfig.baseSalary?.amount, employee.basic_salary ?? DEFAULT_SALARY_CONFIG.baseSalary.amount),
      factor: toNumber(savedConfig.baseSalary?.factor, DEFAULT_SALARY_CONFIG.baseSalary.factor),
      regionalMinimum: toNumber(
        savedConfig.baseSalary?.regionalMinimum,
        DEFAULT_SALARY_CONFIG.baseSalary.regionalMinimum
      ),
    },
    allowances: {
      lunch: toNumber(savedConfig.allowances?.lunch),
      transport: toNumber(savedConfig.allowances?.transport),
      phone: toNumber(savedConfig.allowances?.phone),
      housing: toNumber(savedConfig.allowances?.housing),
      responsibility: toNumber(savedConfig.allowances?.responsibility, employee.allowance ?? 0),
      hazardous: toNumber(savedConfig.allowances?.hazardous),
    },
    lunchAllowancePolicy: lunchPolicy,
    variablePay: {
      salesCommission: toNumber(savedConfig.variablePay?.salesCommission),
      kpiBonus: toNumber(savedConfig.variablePay?.kpiBonus),
      quarterlyBonus: toNumber(savedConfig.variablePay?.quarterlyBonus),
      projectBonus: toNumber(savedConfig.variablePay?.projectBonus),
      innovationBonus: toNumber(savedConfig.variablePay?.innovationBonus),
    },
    timeAttendance: {
      workingDays: toNumber(savedConfig.timeAttendance?.workingDays, DEFAULT_SALARY_CONFIG.timeAttendance.workingDays),
      workingHours: toNumber(savedConfig.timeAttendance?.workingHours, DEFAULT_SALARY_CONFIG.timeAttendance.workingHours),
      overtimeHours: toNumber(savedConfig.timeAttendance?.overtimeHours),
      paidLeaveDays: toNumber(savedConfig.timeAttendance?.paidLeaveDays),
      unpaidLeaveDays: toNumber(savedConfig.timeAttendance?.unpaidLeaveDays),
      lateEarlyCount: toNumber(savedConfig.timeAttendance?.lateEarlyCount),
    },
    deductions: {
      pit: toNumber(savedConfig.deductions?.pit),
      socialInsurance: toNumber(savedConfig.deductions?.socialInsurance),
      healthInsurance: toNumber(savedConfig.deductions?.healthInsurance),
      unemploymentInsurance: toNumber(savedConfig.deductions?.unemploymentInsurance),
      unionFee: toNumber(savedConfig.deductions?.unionFee),
      advancePenaltyCompensation: toNumber(savedConfig.deductions?.advancePenaltyCompensation),
    },
    employerContributions: {
      socialInsurance: toNumber(savedConfig.employerContributions?.socialInsurance),
      healthInsurance: toNumber(savedConfig.employerContributions?.healthInsurance),
      unemploymentInsurance: toNumber(savedConfig.employerContributions?.unemploymentInsurance),
      supplementalInsurance: toNumber(savedConfig.employerContributions?.supplementalInsurance),
    },
    adjustments: {
      retroactiveCollect: toNumber(savedConfig.adjustments?.retroactiveCollect),
      retroactivePay: toNumber(savedConfig.adjustments?.retroactivePay),
      priorPeriodCorrection: toNumber(savedConfig.adjustments?.priorPeriodCorrection),
      irregularRewardPenalty: toNumber(savedConfig.adjustments?.irregularRewardPenalty),
    },
  };
};

const calculatePayrollOutput = (config: SalaryConfigurationValues): PayrollOutput => {
  const actualWorkDays = calculateActualWorkDays(config.timeAttendance);
  const lunchAllowance = calculateLunchAllowance(config.lunchAllowancePolicy, actualWorkDays);
  const allowanceTotal =
    config.allowances.transport +
    config.allowances.phone +
    config.allowances.housing +
    config.allowances.responsibility +
    config.allowances.hazardous +
    lunchAllowance;
  const variableTotal = Object.values(config.variablePay).reduce((sum, value) => sum + value, 0);
  const adjustmentTotal =
    config.adjustments.retroactivePay +
    config.adjustments.priorPeriodCorrection +
    config.adjustments.irregularRewardPenalty -
    config.adjustments.retroactiveCollect;

  const attendancePenalty =
    config.timeAttendance.unpaidLeaveDays * 200000 + config.timeAttendance.lateEarlyCount * 50000;

  const grossIncome = config.baseSalary.amount * config.baseSalary.factor + allowanceTotal + variableTotal + adjustmentTotal;
  const totalDeductions =
    Object.values(config.deductions).reduce((sum, value) => sum + value, 0) + attendancePenalty;
  const netSalary = Math.max(grossIncome - totalDeductions, 0);

  return {
    grossIncome,
    totalDeductions,
    netSalary,
  };
};

const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
    />
  </div>
);

const NumberField: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
}> = ({ label, value, onChange, step = '1000' }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type="number"
      min="0"
      step={step}
      value={value}
      onChange={(event) => onChange(toNumber(event.target.value))}
      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
    />
  </div>
);

const SectionCard: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50/40">
    <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    {children}
  </div>
);

interface EditModalProps {
  employee: Employee;
  onClose: () => void;
  onSave: (id: number, data: SalaryFormulaUpdateData) => Promise<void>;
  saving: boolean;
}

const EditSalaryModal: React.FC<EditModalProps> = ({ employee, onClose, onSave, saving }) => {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [config, setConfig] = useState<SalaryConfigurationValues>(() => parseEmployeeSalaryConfig(employee));

  useEffect(() => {
    setValidationError(null);
    setConfig(parseEmployeeSalaryConfig(employee));
  }, [employee]);

  const payrollOutput = useMemo(() => calculatePayrollOutput(config), [config]);

  const updateGroup = <T extends keyof SalaryConfigurationValues>(group: T, value: SalaryConfigurationValues[T]) => {
    setConfig((previous) => ({ ...previous, [group]: value }));
  };

  const lunchPreview = useMemo(
    () => calculateLunchAllowance(config.lunchAllowancePolicy, calculateActualWorkDays(config.timeAttendance)),
    [config.lunchAllowancePolicy, config.timeAttendance]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setValidationError(null);

    if (config.lunchAllowancePolicy.monthly_cap > MAX_LUNCH_ALLOWANCE_CAP) {
      setValidationError('Trần phụ cấp ăn trưa không được vượt quá 500.000đ/tháng.');
      return;
    }

    const fixedAllowanceWithoutLunch =
      config.allowances.transport +
      config.allowances.phone +
      config.allowances.housing +
      config.allowances.responsibility +
      config.allowances.hazardous;

    const persistedAllowance =
      config.lunchAllowancePolicy.mode === 'actual_working_day'
        ? fixedAllowanceWithoutLunch
        : fixedAllowanceWithoutLunch + lunchPreview;

    const existingAdjustments = asRecord(employee.salary_adjustments);
    const salaryEvents = Array.isArray(existingAdjustments.salary_events)
      ? (existingAdjustments.salary_events as SalaryConfigEvent[])
      : [];

    const nextEvent: SalaryConfigEvent = {
      type: 'salary_config_updated',
      effective_date: config.effectiveDate,
      changed_at: new Date().toISOString(),
      payload: {
        ...config,
        allowances: {
          ...config.allowances,
          lunch: config.lunchAllowancePolicy.mode === 'fixed' ? lunchPreview : 0,
        },
      },
    };

    const normalizedConfig: SalaryConfigurationValues = {
      ...config,
      allowances: {
        ...config.allowances,
        lunch: config.lunchAllowancePolicy.mode === 'fixed' ? lunchPreview : 0,
      },
      lunchAllowancePolicy: {
        ...config.lunchAllowancePolicy,
        monthly_cap: Math.min(config.lunchAllowancePolicy.monthly_cap, MAX_LUNCH_ALLOWANCE_CAP),
      },
    };

    const data: SalaryFormulaUpdateData = {
      basic_salary: config.baseSalary.amount,
      allowance: persistedAllowance,
      salary_notes: `Hiệu lực từ ${config.effectiveDate}`,
      allowance_notes:
        config.lunchAllowancePolicy.mode === 'actual_working_day'
          ? `Phụ cấp trưa: theo ngày công thực tế (${config.lunchAllowancePolicy.amount_per_work_day.toLocaleString('vi-VN')}đ/ngày), trần ${Math.min(config.lunchAllowancePolicy.monthly_cap, MAX_LUNCH_ALLOWANCE_CAP).toLocaleString('vi-VN')}đ/tháng`
          : `Phụ cấp trưa cố định: ${lunchPreview.toLocaleString('vi-VN')}đ/tháng`,
      salary_adjustments: {
        ...existingAdjustments,
        payroll_config: normalizedConfig,
        payroll_output_preview: payrollOutput,
        salary_events: [...salaryEvents, nextEvent],
      },
    };

    await onSave(employee.id, data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Cấu hình tính lương theo nhân viên</h2>
            <p className="text-sm text-gray-500">{employee.full_name} · {employee.employee_id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-72px)] space-y-4">
          {validationError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {validationError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày hiệu lực</label>
              <input
                type="date"
                value={config.effectiveDate}
                onChange={(event) => setConfig((prev) => ({ ...prev, effectiveDate: event.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại trả lương</label>
              <select
                value={config.baseSalary.payType}
                onChange={(event) =>
                  updateGroup('baseSalary', {
                    ...config.baseSalary,
                    payType: event.target.value as SalaryConfigurationValues['baseSalary']['payType'],
                  })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="monthly">Theo tháng</option>
                <option value="hourly">Theo giờ</option>
                <option value="daily">Theo ngày</option>
              </select>
            </div>
            <div className="rounded-md bg-indigo-50 border border-indigo-100 px-3 py-2 text-sm">
              <p className="text-indigo-700">Net preview</p>
              <p className="text-lg font-semibold text-indigo-800">{formatCurrency(payrollOutput.netSalary)}</p>
            </div>
          </div>

          <SectionCard title="1. Thông tin nền tảng (Base Profile)">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <TextField
                label="Vị trí công việc"
                value={config.baseProfile.jobTitle}
                onChange={(value) =>
                  updateGroup('baseProfile', {
                    ...config.baseProfile,
                    jobTitle: value,
                  })
                }
              />
              <TextField
                label="Cấp bậc"
                value={config.baseProfile.level}
                onChange={(value) =>
                  updateGroup('baseProfile', {
                    ...config.baseProfile,
                    level: value,
                  })
                }
              />
              <TextField
                label="Phòng ban"
                value={config.baseProfile.department}
                onChange={(value) =>
                  updateGroup('baseProfile', {
                    ...config.baseProfile,
                    department: value,
                  })
                }
              />
              <TextField
                label="Loại hợp đồng"
                value={config.baseProfile.contractType}
                onChange={(value) =>
                  updateGroup('baseProfile', {
                    ...config.baseProfile,
                    contractType: value,
                  })
                }
              />
              <TextField
                label="Địa điểm làm việc"
                value={config.baseProfile.workLocation}
                onChange={(value) =>
                  updateGroup('baseProfile', {
                    ...config.baseProfile,
                    workLocation: value,
                  })
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="2. Lương cơ bản (Base Salary)">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <NumberField
                label="Lương cơ bản"
                value={config.baseSalary.amount}
                onChange={(value) =>
                  updateGroup('baseSalary', {
                    ...config.baseSalary,
                    amount: value,
                  })
                }
              />
              <NumberField
                label="Hệ số lương"
                value={config.baseSalary.factor}
                onChange={(value) =>
                  updateGroup('baseSalary', {
                    ...config.baseSalary,
                    factor: value,
                  })
                }
                step="0.1"
              />
              <NumberField
                label="Mức lương tối thiểu vùng"
                value={config.baseSalary.regionalMinimum}
                onChange={(value) =>
                  updateGroup('baseSalary', {
                    ...config.baseSalary,
                    regionalMinimum: value,
                  })
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="3. Thu nhập bổ sung (Allowances & Earnings)">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 md:col-span-3">
                <p className="text-sm font-medium text-amber-900 mb-2">Phụ cấp ăn trưa</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cơ chế chi trả</label>
                    <select
                      value={config.lunchAllowancePolicy.mode}
                      onChange={(event) =>
                        updateGroup('lunchAllowancePolicy', {
                          ...config.lunchAllowancePolicy,
                          mode: event.target.value as LunchAllowancePolicy['mode'],
                        })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="fixed">Cố định theo tháng</option>
                      <option value="actual_working_day">Theo ngày công thực tế</option>
                    </select>
                  </div>

                  {config.lunchAllowancePolicy.mode === 'actual_working_day' ? (
                    <>
                      <NumberField
                        label="Mức chi mỗi ngày công"
                        value={config.lunchAllowancePolicy.amount_per_work_day}
                        onChange={(value) =>
                          updateGroup('lunchAllowancePolicy', {
                            ...config.lunchAllowancePolicy,
                            amount_per_work_day: value,
                          })
                        }
                      />
                      <NumberField
                        label="Trần/tháng (tối đa 500.000)"
                        value={config.lunchAllowancePolicy.monthly_cap}
                        onChange={(value) =>
                          updateGroup('lunchAllowancePolicy', {
                            ...config.lunchAllowancePolicy,
                            monthly_cap: Math.min(Math.max(value, 0), MAX_LUNCH_ALLOWANCE_CAP),
                          })
                        }
                      />
                      <div className="rounded-md border border-amber-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Tạm tính phụ cấp trưa</p>
                        <p className="text-base font-semibold text-amber-700">{formatCurrency(lunchPreview)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Ngày công thực tế: {formatNumber(calculateActualWorkDays(config.timeAttendance))}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <NumberField
                        label="Mức cố định/tháng"
                        value={config.lunchAllowancePolicy.fixed_amount}
                        onChange={(value) =>
                          updateGroup('lunchAllowancePolicy', {
                            ...config.lunchAllowancePolicy,
                            fixed_amount: value,
                          })
                        }
                      />
                      <NumberField
                        label="Trần/tháng (tối đa 500.000)"
                        value={config.lunchAllowancePolicy.monthly_cap}
                        onChange={(value) =>
                          updateGroup('lunchAllowancePolicy', {
                            ...config.lunchAllowancePolicy,
                            monthly_cap: Math.min(Math.max(value, 0), MAX_LUNCH_ALLOWANCE_CAP),
                          })
                        }
                      />
                      <div className="rounded-md border border-amber-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Tạm tính phụ cấp trưa</p>
                        <p className="text-base font-semibold text-amber-700">{formatCurrency(lunchPreview)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <NumberField
                label="Phụ cấp đi lại / xăng xe"
                value={config.allowances.transport}
                onChange={(value) => updateGroup('allowances', { ...config.allowances, transport: value })}
              />
              <NumberField
                label="Phụ cấp điện thoại"
                value={config.allowances.phone}
                onChange={(value) => updateGroup('allowances', { ...config.allowances, phone: value })}
              />
              <NumberField
                label="Phụ cấp nhà ở"
                value={config.allowances.housing}
                onChange={(value) => updateGroup('allowances', { ...config.allowances, housing: value })}
              />
              <NumberField
                label="Phụ cấp trách nhiệm / chức vụ"
                value={config.allowances.responsibility}
                onChange={(value) => updateGroup('allowances', { ...config.allowances, responsibility: value })}
              />
              <NumberField
                label="Phụ cấp độc hại / nguy hiểm"
                value={config.allowances.hazardous}
                onChange={(value) => updateGroup('allowances', { ...config.allowances, hazardous: value })}
              />
            </div>
          </SectionCard>

          <SectionCard title="4. Lương hiệu suất & hoa hồng (Variable Pay)">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <NumberField
                label="Hoa hồng bán hàng"
                value={config.variablePay.salesCommission}
                onChange={(value) => updateGroup('variablePay', { ...config.variablePay, salesCommission: value })}
              />
              <NumberField
                label="Thưởng KPI / OKR"
                value={config.variablePay.kpiBonus}
                onChange={(value) => updateGroup('variablePay', { ...config.variablePay, kpiBonus: value })}
              />
              <NumberField
                label="Bonus theo quý / năm"
                value={config.variablePay.quarterlyBonus}
                onChange={(value) => updateGroup('variablePay', { ...config.variablePay, quarterlyBonus: value })}
              />
              <NumberField
                label="Thưởng dự án"
                value={config.variablePay.projectBonus}
                onChange={(value) => updateGroup('variablePay', { ...config.variablePay, projectBonus: value })}
              />
              <NumberField
                label="Thưởng sáng kiến"
                value={config.variablePay.innovationBonus}
                onChange={(value) => updateGroup('variablePay', { ...config.variablePay, innovationBonus: value })}
              />
            </div>
          </SectionCard>

          <SectionCard title="5. Thời gian làm việc (Time & Attendance)">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <NumberField
                label="Số ngày công thực tế"
                value={config.timeAttendance.workingDays}
                onChange={(value) => updateGroup('timeAttendance', { ...config.timeAttendance, workingDays: value })}
                step="1"
              />
              <NumberField
                label="Số giờ làm việc"
                value={config.timeAttendance.workingHours}
                onChange={(value) => updateGroup('timeAttendance', { ...config.timeAttendance, workingHours: value })}
                step="1"
              />
              <NumberField
                label="Giờ tăng ca"
                value={config.timeAttendance.overtimeHours}
                onChange={(value) => updateGroup('timeAttendance', { ...config.timeAttendance, overtimeHours: value })}
                step="1"
              />
              <NumberField
                label="Nghỉ phép có lương"
                value={config.timeAttendance.paidLeaveDays}
                onChange={(value) => updateGroup('timeAttendance', { ...config.timeAttendance, paidLeaveDays: value })}
                step="1"
              />
              <NumberField
                label="Nghỉ không lương"
                value={config.timeAttendance.unpaidLeaveDays}
                onChange={(value) => updateGroup('timeAttendance', { ...config.timeAttendance, unpaidLeaveDays: value })}
                step="1"
              />
              <NumberField
                label="Đi muộn / về sớm"
                value={config.timeAttendance.lateEarlyCount}
                onChange={(value) => updateGroup('timeAttendance', { ...config.timeAttendance, lateEarlyCount: value })}
                step="1"
              />
            </div>
          </SectionCard>

          <SectionCard title="6. Khấu trừ (Deductions)">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <NumberField
                label="Thuế TNCN (PIT)"
                value={config.deductions.pit}
                onChange={(value) => updateGroup('deductions', { ...config.deductions, pit: value })}
              />
              <NumberField
                label="BHXH"
                value={config.deductions.socialInsurance}
                onChange={(value) => updateGroup('deductions', { ...config.deductions, socialInsurance: value })}
              />
              <NumberField
                label="BHYT"
                value={config.deductions.healthInsurance}
                onChange={(value) => updateGroup('deductions', { ...config.deductions, healthInsurance: value })}
              />
              <NumberField
                label="BHTN"
                value={config.deductions.unemploymentInsurance}
                onChange={(value) => updateGroup('deductions', { ...config.deductions, unemploymentInsurance: value })}
              />
              <NumberField
                label="Công đoàn phí"
                value={config.deductions.unionFee}
                onChange={(value) => updateGroup('deductions', { ...config.deductions, unionFee: value })}
              />
              <NumberField
                label="Tạm ứng / phạt / bồi thường"
                value={config.deductions.advancePenaltyCompensation}
                onChange={(value) =>
                  updateGroup('deductions', {
                    ...config.deductions,
                    advancePenaltyCompensation: value,
                  })
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="7. Đóng góp từ công ty (Employer Contributions)">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <NumberField
                label="BHXH công ty đóng"
                value={config.employerContributions.socialInsurance}
                onChange={(value) =>
                  updateGroup('employerContributions', {
                    ...config.employerContributions,
                    socialInsurance: value,
                  })
                }
              />
              <NumberField
                label="BHYT công ty đóng"
                value={config.employerContributions.healthInsurance}
                onChange={(value) =>
                  updateGroup('employerContributions', {
                    ...config.employerContributions,
                    healthInsurance: value,
                  })
                }
              />
              <NumberField
                label="BHTN công ty đóng"
                value={config.employerContributions.unemploymentInsurance}
                onChange={(value) =>
                  updateGroup('employerContributions', {
                    ...config.employerContributions,
                    unemploymentInsurance: value,
                  })
                }
              />
              <NumberField
                label="Bảo hiểm bổ sung"
                value={config.employerContributions.supplementalInsurance}
                onChange={(value) =>
                  updateGroup('employerContributions', {
                    ...config.employerContributions,
                    supplementalInsurance: value,
                  })
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="8. Điều chỉnh (Adjustments)">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <NumberField
                label="Truy thu lương"
                value={config.adjustments.retroactiveCollect}
                onChange={(value) => updateGroup('adjustments', { ...config.adjustments, retroactiveCollect: value })}
              />
              <NumberField
                label="Truy lĩnh lương"
                value={config.adjustments.retroactivePay}
                onChange={(value) => updateGroup('adjustments', { ...config.adjustments, retroactivePay: value })}
              />
              <NumberField
                label="Điều chỉnh sai sót kỳ trước"
                value={config.adjustments.priorPeriodCorrection}
                onChange={(value) =>
                  updateGroup('adjustments', {
                    ...config.adjustments,
                    priorPeriodCorrection: value,
                  })
                }
              />
              <NumberField
                label="Thưởng/phạt bất thường"
                value={config.adjustments.irregularRewardPenalty}
                onChange={(value) =>
                  updateGroup('adjustments', {
                    ...config.adjustments,
                    irregularRewardPenalty: value,
                  })
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="9. Tổng hợp lương (Payroll Output)">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                <p className="text-xs text-gray-500">Tổng thu nhập (Gross Income)</p>
                <p className="text-base font-semibold text-gray-900">{formatCurrency(payrollOutput.grossIncome)}</p>
              </div>
              <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                <p className="text-xs text-gray-500">Tổng khấu trừ</p>
                <p className="text-base font-semibold text-red-600">{formatCurrency(payrollOutput.totalDeductions)}</p>
              </div>
              <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2">
                <p className="text-xs text-indigo-600">Lương thực nhận (Net Salary)</p>
                <p className="text-base font-semibold text-indigo-700">{formatCurrency(payrollOutput.netSalary)}</p>
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <CheckIcon className="h-4 w-4" />
              )}
              Lưu cấu hình
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SalaryManagement: React.FC<SalaryManagementProps> = ({
  defaultTab = 'config',
  lockTab = false,
}) => {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<SalaryTabKey>(defaultTab);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [searchEmployee, setSearchEmployee] = useState('');
  const [deptFilterConfig, setDeptFilterConfig] = useState<string>('');
  const [configPage, setConfigPage] = useState(1);
  const [configTotal, setConfigTotal] = useState(0);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadingEmployeeConfig, setLoadingEmployeeConfig] = useState<number | null>(null);

  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [deptFilterView, setDeptFilterView] = useState<string>('');
  const [searchSalary, setSearchSalary] = useState('');

  const [departments, setDepartments] = useState<Department[]>([]);

  const PAGE_SIZE = 20;

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    departmentsAPI
      .list({ page_size: 100 })
      .then((res) => setDepartments(res.results))
      .catch(() => undefined);
  }, []);

  const loadEmployees = useCallback(
    async (page = 1) => {
      setLoadingEmployees(true);
      try {
        const params: Record<string, unknown> = {
          page,
          page_size: PAGE_SIZE,
          ordering: 'full_name',
        };
        if (searchEmployee) params.search = searchEmployee;
        if (deptFilterConfig) params.department = parseInt(deptFilterConfig, 10);

        const res = await employeesAPI.list(params);
        setEmployees(res.results);
        setConfigTotal(res.count);
        setConfigPage(page);
      } catch {
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    },
    [searchEmployee, deptFilterConfig]
  );

  useEffect(() => {
    if (activeTab === 'config') {
      loadEmployees(1);
    }
  }, [activeTab, loadEmployees]);

  const loadSalary = useCallback(async () => {
    setLoadingSalary(true);
    setSalaryError(null);
    try {
      const res = await salaryService.getSalaryByDepartment({
        year: selectedYear,
        month: selectedMonth,
        department_id: deptFilterView ? parseInt(deptFilterView, 10) : undefined,
        employee_code: searchSalary || undefined,
      });
      setSalaryRecords(res.results ?? []);
    } catch (error: unknown) {
      const normalizedError = error as { response?: { status?: number } };
      if (normalizedError?.response?.status === 404) {
        setSalaryError('Chưa có dữ liệu bảng lương cho tháng này.');
      } else {
        setSalaryError('Không thể tải dữ liệu bảng lương. Vui lòng thử lại.');
      }
      setSalaryRecords([]);
    } finally {
      setLoadingSalary(false);
    }
  }, [selectedYear, selectedMonth, deptFilterView, searchSalary]);

  useEffect(() => {
    if (activeTab === 'view') {
      loadSalary();
    }
  }, [activeTab, loadSalary]);

  const handleSave = async (id: number, data: SalaryFormulaUpdateData) => {
    setSaving(true);
    setSaveError(null);
    const employeeName = editEmployee?.full_name ?? 'nhân viên';
    try {
      await salaryService.updateSalaryFormula(id, data);
      setSaveSuccess(`Đã cập nhật cấu hình lương cho ${employeeName}`);
      setEditEmployee(null);
      loadEmployees(configPage);
    } catch {
      setSaveError('Không thể cập nhật. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenConfig = async (employee: Employee) => {
    setSaveError(null);
    setLoadingEmployeeConfig(employee.id);
    try {
      const freshEmployee = await salaryService.getEmployeeSalaryConfig(employee.id);
      setEditEmployee(freshEmployee);
    } catch {
      setEditEmployee(employee);
    } finally {
      setLoadingEmployeeConfig(null);
    }
  };

  const totalConfigPages = Math.ceil(configTotal / PAGE_SIZE);
  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  const title = activeTab === 'view' ? 'Bảng lương' : 'Cấu hình tính lương cho từng người';
  const description =
    activeTab === 'view'
      ? 'Theo dõi bảng lương theo tháng/năm và phòng ban.'
      : 'Thiết kế theo cơ chế event có ngày hiệu lực và nhóm cấu hình đầy đủ cho từng nhân viên.';

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-2">{description}</p>
      </div>

      {!lockTab && (
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as SalaryTabKey)}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {saveSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          <CheckIcon className="h-4 w-4 flex-shrink-0" />
          {saveSuccess}
          <button className="ml-auto" onClick={() => setSaveSuccess(null)}>
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      {saveError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
          {saveError}
          <button className="ml-auto" onClick={() => setSaveError(null)}>
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div>
        {activeTab === 'config' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên hoặc mã nhân viên..."
                    value={searchEmployee}
                    onChange={(event) => setSearchEmployee(event.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={deptFilterConfig}
                    onChange={(event) => setDeptFilterConfig(event.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">Tất cả phòng ban</option>
                    {departments.map((department) => (
                      <option key={department.id} value={String(department.id)}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loadingEmployees ? (
                <div className="flex items-center justify-center py-16">
                  <ArrowPathIcon className="h-6 w-6 text-primary-400 animate-spin" />
                  <span className="ml-2 text-sm text-gray-500">Đang tải...</span>
                </div>
              ) : employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <UserIcon className="h-10 w-10 mb-2" />
                  <p className="text-sm">Không tìm thấy nhân viên nào.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nhân viên
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hồ sơ nền tảng
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ngày hiệu lực
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gross preview
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Net preview
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {employees.map((employee) => {
                        const employeeConfig = parseEmployeeSalaryConfig(employee);
                        const output = calculatePayrollOutput(employeeConfig);

                        return (
                          <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-semibold text-gray-700">
                                    {employee.full_name?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{employee.full_name}</p>
                                  <p className="text-xs text-gray-500 font-mono">{employee.employee_id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-gray-700 flex items-center gap-1">
                                <BuildingOfficeIcon className="h-3.5 w-3.5 text-gray-400" />
                                {employeeConfig.baseProfile.department || employee.department?.name || '—'}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {employeeConfig.baseProfile.jobTitle || employee.position?.title || '—'}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{employeeConfig.effectiveDate || '—'}</td>
                            <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                              {formatCurrency(output.grossIncome)}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-indigo-700">
                              {formatCurrency(output.netSalary)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleOpenConfig(employee)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
                              >
                                {loadingEmployeeConfig === employee.id ? (
                                  <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <PencilIcon className="h-3.5 w-3.5" />
                                )}
                                {loadingEmployeeConfig === employee.id ? 'Đang tải...' : 'Cấu hình'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {totalConfigPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Trang {configPage} / {totalConfigPages} · {configTotal} nhân viên
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadEmployees(configPage - 1)}
                      disabled={configPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => loadEmployees(configPage + 1)}
                      disabled={configPage === totalConfigPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'view' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Tháng:</label>
                  <div className="w-32">
                    <SelectBox<number>
                      label=""
                      value={selectedMonth}
                      options={monthOptions.map((month) => ({ value: month, label: `Tháng ${month}` }))}
                      onChange={setSelectedMonth}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Năm:</label>
                  <div className="w-24">
                    <SelectBox<number>
                      label=""
                      value={selectedYear}
                      options={yearOptions.map((year) => ({ value: year, label: String(year) }))}
                      onChange={setSelectedYear}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="w-48">
                    <SelectBox<string>
                      label=""
                      value={deptFilterView}
                      options={[
                        { value: '', label: 'Tất cả phòng ban' },
                        ...departments.map((department) => ({
                          value: String(department.id),
                          label: department.name,
                        })),
                      ]}
                      onChange={setDeptFilterView}
                    />
                  </div>
                </div>
                <div className="flex-1 relative min-w-48">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã nhân viên..."
                    value={searchSalary}
                    onChange={(event) => setSearchSalary(event.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <button
                  onClick={loadSalary}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Tải dữ liệu
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loadingSalary ? (
                <div className="flex items-center justify-center py-16">
                  <ArrowPathIcon className="h-6 w-6 text-primary-400 animate-spin" />
                  <span className="ml-2 text-sm text-gray-500">Đang tải bảng lương...</span>
                </div>
              ) : salaryError ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <ExclamationCircleIcon className="h-10 w-10 mb-2 text-amber-400" />
                  <p className="text-sm text-gray-500">{salaryError}</p>
                </div>
              ) : salaryRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <TableCellsIcon className="h-10 w-10 mb-2" />
                  <p className="text-sm">Không có dữ liệu bảng lương.</p>
                  <p className="text-xs mt-1">Chọn tháng/năm và nhấn &quot;Tải dữ liệu&quot; để xem.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                          Nhân viên
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phòng ban
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lương CB
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phụ cấp
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tổng công
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tăng ca
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tổng phạt
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider bg-indigo-50">
                          Thực lĩnh
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {salaryRecords.map((record) => (
                        <tr key={record.employee_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-3 sticky left-0 bg-white">
                            <p className="font-medium text-gray-900">{record.ho_va_ten}</p>
                            <p className="text-xs text-gray-500 font-mono">{record.ma_nv}</p>
                          </td>
                          <td className="px-3 py-3 text-gray-600">{record.phong_ban ?? '—'}</td>
                          <td className="px-3 py-3 text-right text-gray-700">{formatCurrency(record.luong_co_ban)}</td>
                          <td className="px-3 py-3 text-right text-gray-700">{formatCurrency(record.phu_cap)}</td>
                          <td className="px-3 py-3 text-right text-gray-700">{formatNumber(record.tong_cong)}</td>
                          <td className="px-3 py-3 text-right text-blue-600">{formatNumber(record.tang_ca)}</td>
                          <td className="px-3 py-3 text-right text-red-600">{formatCurrency(record.tong_phat)}</td>
                          <td className="px-3 py-3 text-right font-semibold text-indigo-700 bg-indigo-50">
                            {formatCurrency(record.luong_thuc_linh)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {editEmployee && (
        <EditSalaryModal
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
};

export default SalaryManagement;
