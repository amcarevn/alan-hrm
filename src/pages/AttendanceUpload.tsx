import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { attendanceService } from '../services/attendance.service';
import { departmentsAPI, employeesAPI } from '../utils/api';
import AttendanceCalendar from '../components/AttendanceCalendar';
import {
  EyeIcon,
  UserIcon,
  BuildingOfficeIcon,
  XMarkIcon,
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';

/* ─── tiny helper ─── */
const cx = (...classes: (string | false | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

/* ─── Alert banner ─── */
const Alert = ({
  type,
  text,
  onClose,
}: {
  type: 'success' | 'error' | 'info';
  text: string;
  onClose: () => void;
}) => {
  const cfg = {
    success: {
      bg: 'bg-green-50 border-green-200',
      icon: <CheckCircleIcon className="w-5 h-5 text-green-500 shrink-0" />,
      text: 'text-green-800',
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0" />,
      text: 'text-red-800',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: <InformationCircleIcon className="w-5 h-5 text-blue-500 shrink-0" />,
      text: 'text-blue-800',
    },
  }[type] ?? {
    bg: 'bg-gray-50 border-gray-200',
    icon: <InformationCircleIcon className="w-5 h-5 text-gray-500 shrink-0" />,
    text: 'text-gray-800',
  };

  return (
    <div className={cx('flex items-center gap-3 rounded-lg border px-4 py-3 text-sm', cfg.bg, cfg.text)}>
      {cfg.icon}
      <span className="flex-1">{text}</span>
      <button
        onClick={onClose}
        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

/* ─── Status badge ─── */
const StatusBadge = ({
  status,
}: {
  status: 'success' | 'error' | 'processing';
}) => {
  const configs = {
    success:    { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Thành công' },
    error:      { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Thất bại' },
    processing: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Đang xử lý' },
  };
  const config = configs[status];
  return (
    <span className={cx('px-2 py-1 text-xs font-semibold rounded-full', config.bg, config.text)}>
      {config.label}
    </span>
  );
};

/* ─── Stat card ─── */
const StatCard = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: 'green' | 'yellow' | 'red' | 'blue';
}) => {
  const themes = {
    green:  'bg-green-50 text-green-700 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    red:    'bg-red-50 text-red-700 border-red-100',
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
  };
  return (
    <div className={cx('p-4 rounded-lg border', themes[color])}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

const AttendanceUpload: React.FC = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [uploadHistory, setUploadHistory] = useState<Array<{
    id: number;
    filename: string;
    uploadedAt: string;
    status: 'success' | 'error' | 'processing';
    records: number;
    user: string;
  }>>([]);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'department' | 'employee'>('department');
  const [mainViewDepartment, setMainViewDepartment] = useState<string>('');
  const [mainViewEmployee, setMainViewEmployee] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // State for departments and employees from API
  const [departments, setDepartments] = useState<Array<{
    id: string;
    name: string;
    code: string;
    employeeCount: number;
  }>>([]);
  const [employees, setEmployees] = useState<Array<{
    id: string;
    code: string;
    name: string;
    department: string;
    department_id?: string;
  }>>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch departments on component mount
  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  // Fetch departments from API
  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      setError(null);
      const response = await departmentsAPI.list({ page_size: 100 });
      const departmentsData = response.results.map((dept: any) => ({
        id: dept.id.toString(),
        name: dept.name,
        code: dept.code,
        employeeCount: 0 // We'll update this after fetching employees
      }));
      setDepartments(departmentsData);
    } catch (err: any) {
      console.error('Error fetching departments:', err);
      setError('Không thể tải danh sách phòng ban. Vui lòng thử lại sau.');
    } finally {
      setLoadingDepartments(false);
    }
  };

  // Fetch employees from API
  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      setError(null);
      const response = await employeesAPI.list({ page_size: 100 });
      const employeesData = response.results.map((emp: any) => ({
        id: emp.id.toString(),
        code: emp.employee_id,
        name: emp.full_name,
        department: emp.department?.name || 'Không xác định',
        department_id: emp.department?.id?.toString()
      }));
      setEmployees(employeesData);

      // Update employee count for each department
      const departmentCounts: { [key: string]: number } = {};
      employeesData.forEach((emp: any) => {
        if (emp.department_id) {
          departmentCounts[emp.department_id] = (departmentCounts[emp.department_id] || 0) + 1;
        }
      });

      setDepartments(prev => prev.map(dept => ({
        ...dept,
        employeeCount: departmentCounts[dept.id] || 0
      })));
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setError('Không thể tải danh sách nhân viên. Vui lòng thử lại sau.');
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Fetch employees by department
  const fetchEmployeesByDepartment = async (departmentId: string) => {
    try {
      setLoadingEmployees(true);
      const response = await departmentsAPI.employees(parseInt(departmentId), { page_size: 100 });
      const employeesData = response.results.map((emp: any) => ({
        id: emp.id.toString(),
        code: emp.employee_id,
        name: emp.full_name,
        department: emp.department?.name || 'Không xác định',
        department_id: emp.department?.id?.toString()
      }));
      setEmployees(employeesData);
    } catch (err: any) {
      console.error('Error fetching employees by department:', err);
      setError('Không thể tải danh sách nhân viên theo phòng ban.');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    console.log('Selected date in detail view:', date);
  };

  const handleViewDetail = () => {
    setShowDetailView(true);

    if (mainViewEmployee) {
      setSelectedEmployee(mainViewEmployee);
      setViewMode('employee');
      const emp = employees.find(e => e.id === mainViewEmployee);
      if (emp) {
        const dept = departments.find(d => d.name === emp.department);
        if (dept) {
          setSelectedDepartment(dept.id);
        }
      }
    } else if (mainViewDepartment) {
      setSelectedDepartment(mainViewDepartment);
      setViewMode('employee');
      setSelectedEmployee('');
    } else {
      setViewMode('department');
      setSelectedDepartment('');
      setSelectedEmployee('');
    }
  };

  const handleBack = () => {
    setShowDetailView(false);
    setSelectedDate(null);
    setSelectedDepartment('');
    setSelectedEmployee('');
    setViewMode('department');
  };

  const handleSelectDepartment = (deptId: string) => {
    setSelectedDepartment(deptId);
    setViewMode('employee');
    setSelectedEmployee('');
    fetchEmployeesByDepartment(deptId);
  };

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployee(empId);
    console.log('Selected employee:', empId);
  };

  const handleBackToDepartments = () => {
    setSelectedDepartment('');
    setSelectedEmployee('');
    setViewMode('department');
  };

  const handleBackToEmployees = () => {
    setSelectedEmployee('');
    setViewMode('employee');
  };

  // Filter employees based on search query
  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter employees by selected department
  const departmentEmployees = selectedDepartment
    ? filteredEmployees.filter(emp =>
      emp.department_id === selectedDepartment
    )
    : filteredEmployees;

  // Check if user has permission to upload attendance files
  const userRole = user?.role ? user.role.toUpperCase() : '';

  const userDepartmentCode = (
    user?.employee_profile?.department_code ||
    user?.hrm_user?.department_code ||
    (user as any)?.department_code ||
    null
  );

  const canUploadAttendance =
    userRole === 'ADMIN' ||
    userRole === 'HR' ||
    user?.is_super_admin ||
    userDepartmentCode === 'HCNS';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadMessage(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMessage({ type: 'error', text: 'Vui lòng chọn file để upload' });
      return;
    }

    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
      'text/x-csv',
      'application/x-csv',
      'text/comma-separated-values',
      'text/x-comma-separated-values'
    ];

    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      setUploadMessage({ type: 'error', text: 'Chỉ chấp nhận file Excel (.xlsx, .xls) hoặc CSV (.csv)' });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadMessage({ type: 'error', text: 'File quá lớn. Dung lượng tối đa là 10MB.' });
      return;
    }

    setUploading(true);
    setUploadMessage(null);

    try {
      const result = await attendanceService.uploadAttendanceFile(selectedFile);

      const details = result.details ?? {};
      const totalRecords = details.total_records ?? 0;
      const importedRecords = details.imported_records ?? 0;
      const duplicateRecords = details.duplicate_records ?? 0;
      const newUpload = {
        id: uploadHistory.length + 1,
        filename: selectedFile.name,
        uploadedAt: new Date().toLocaleString('vi-VN'),
        status: 'success' as const,
        records: totalRecords,
        user: user?.username || 'Unknown'
      };

      setUploadHistory([newUpload, ...uploadHistory]);
      let successText = `Upload file "${selectedFile.name}" thành công! Tổng ${totalRecords} dòng`;
      if (importedRecords > 0 && duplicateRecords > 0) {
        successText += ` (${importedRecords} mới, ${duplicateRecords} cập nhật)`;
      } else if (importedRecords > 0) {
        successText += ` (${importedRecords} mới)`;
      } else if (duplicateRecords > 0) {
        successText += ` (${duplicateRecords} cập nhật)`;
      }
      successText += '.';
      setUploadMessage({ type: 'success', text: successText });
      setSelectedFile(null);

      const fileInput = document.getElementById('attendance-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error('Upload error:', error);
      let errorMessage = 'Upload thất bại. Vui lòng thử lại.';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        if (typeof errors === 'object') {
          errorMessage = Object.values(errors).flat().join(', ');
        } else if (Array.isArray(errors)) {
          errorMessage = errors.join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setUploadMessage({ type: 'error', text: errorMessage });
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      setUploadMessage(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await attendanceService.downloadAttendanceTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'attendance_upload_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setUploadMessage({ type: 'success', text: 'Đã tải mẫu file thành công!' });
    } catch (error) {
      console.error('Error downloading template:', error);
      setUploadMessage({ type: 'error', text: 'Tải mẫu file thất bại. Vui lòng thử lại.' });
    }
  };

  const handleValidateFile = async () => {
    if (!selectedFile) {
      setUploadMessage({ type: 'error', text: 'Vui lòng chọn file để validate' });
      return;
    }

    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
      'text/x-csv',
      'application/x-csv',
      'text/comma-separated-values',
      'text/x-comma-separated-values'
    ];

    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      setUploadMessage({ type: 'error', text: 'Chỉ chấp nhận file Excel (.xlsx, .xls) hoặc CSV (.csv)' });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadMessage({ type: 'error', text: 'File quá lớn. Dung lượng tối đa là 10MB.' });
      return;
    }

    setUploading(true);
    setUploadMessage(null);

    try {
      const result = await attendanceService.validateAttendanceFile(selectedFile);

      setUploadMessage({
        type: 'success',
        text: `Validate thành công! File có ${result.validation_results?.total_rows || 0} dòng, trong đó ${result.validation_results?.valid_rows || 0} dòng hợp lệ.`
      });

    } catch (error: any) {
      console.error('Validate error:', error);
      let errorMessage = 'Validate thất bại. Vui lòng thử lại.';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        if (typeof errors === 'object') {
          errorMessage = Object.values(errors).flat().join(', ');
        } else if (Array.isArray(errors)) {
          errorMessage = errors.join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setUploadMessage({ type: 'error', text: errorMessage });
    } finally {
      setUploading(false);
    }
  };

  const fileSchema = [
    ['STT', 'Số thứ tự'],
    ['Mã nhân viên', 'Bắt buộc'],
    ['Tên nhân viên', 'Tên nhân viên'],
    ['Phòng Ban', 'Phòng ban'],
    ['Ngày', 'Ngày chấm công (bắt buộc)'],
    ['Thứ', 'Thứ trong tuần'],
    ['Giờ vào', 'Giờ vào làm'],
    ['Giờ ra', 'Giờ ra về'],
    ['Trễ', 'Số phút đi trễ'],
    ['Sớm', 'Số phút về sớm'],
    ['Công', 'Số công'],
    ['Tổng giờ', 'Tổng giờ làm'],
    ['Tăng ca', 'Số giờ tăng ca'],
    ['Tổng toàn bộ', 'Tổng giờ toàn bộ'],
    ['Ca', 'Ca làm việc'],
  ];

  /* ═══ Main Render ═══ */
  if (!canUploadAttendance) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quyền truy cập hạn chế</h2>
          <p className="text-gray-600 mb-6">
            Tính năng này chỉ dành cho quản trị viên và nhân sự cấp cao. Vui lòng liên hệ quản trị viên hệ thống để biết thêm chi tiết.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Chấm công</h1>
          <p className="text-gray-600 mt-2">Kênh nhập liệu hiệu suất cao cho hành chính nhân sự.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            title="Tải mẫu file Excel"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            Tải mẫu file
          </button>
          <button
            onClick={handleViewDetail}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
            title="Xem chi tiết lịch sử và cấu trúc"
          >
            <EyeIcon className="w-4 h-4" />
            Xem chi tiết
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left Column: Upload Main ── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Upload Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-6">
              {/* Drop zone */}
              <div
                className={cx(
                  'min-h-[280px] rounded-lg border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center p-8',
                  dragOver
                    ? 'border-blue-400 bg-blue-50'
                    : selectedFile
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-white'
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { handleDrop(e); setDragOver(false); }}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  id="attendance-file"
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  disabled={uploading}
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center text-center w-full max-w-sm">
                    <div className="w-16 h-16 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                      <DocumentTextIcon className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 break-all mb-2">
                      {selectedFile.name}
                    </h3>
                    <div className="flex flex-col items-center gap-2 mb-6">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Sẵn sàng upload
                      </span>
                      <p className="text-sm text-gray-500">
                        Dung lượng: {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-sm text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-50 rounded-md"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Hủy và chọn lại
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center max-w-sm">
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                      <CloudArrowUpIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-700 mb-1">Kéo thả file vào đây</p>
                    <p className="text-sm text-gray-500 mb-6">Excel hoặc CSV, tối đa 10MB</p>
                    <span className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md">
                      Chọn file
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {selectedFile && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleValidateFile}
                    disabled={uploading}
                    className={cx(
                      'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                      uploading
                        ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-yellow-700 border-yellow-300 hover:bg-yellow-50'
                    )}
                  >
                    <CheckBadgeIcon className="w-4 h-4" />
                    Kiểm tra cấu trúc
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className={cx(
                      'flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                      uploading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    )}
                  >
                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CloudArrowUpIcon className="w-4 h-4" />
                    )}
                    {uploading ? 'Đang upload...' : 'Bắt đầu upload'}
                  </button>
                </div>
              )}

              {/* Alert */}
              {uploadMessage && (
                <Alert
                  type={uploadMessage.type as 'success' | 'error'}
                  text={uploadMessage.text}
                  onClose={() => setUploadMessage(null)}
                />
              )}
            </div>
          </div>

          {/* Schema Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <InformationCircleIcon className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">Cấu trúc dữ liệu yêu cầu</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {fileSchema.map(([col, desc], i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-white transition-colors">
                  <p className="text-xs font-medium text-blue-600 mb-1">[{col}]</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Column: Sidebar ── */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-lg shadow flex flex-col min-h-[400px] sticky top-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Lịch sử upload</h2>
              <p className="text-sm text-gray-500 mt-0.5">Theo dõi hoạt động</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {uploadHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                  <DocumentTextIcon className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-400">Chưa có dữ liệu</p>
                </div>
              ) : (
                uploadHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cx(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        item.status === 'success' ? 'bg-green-100 text-green-600' :
                          item.status === 'error' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                      )}>
                        <DocumentTextIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate mb-1">{item.filename}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={item.status} />
                          <span className="text-xs text-gray-400">{item.records} dòng</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{item.uploadedAt}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex items-start gap-2 text-gray-500">
                <InformationCircleIcon className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">Hệ thống lưu trữ 10 phiên upload gần nhất.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Detail View Modal ═══ */}
      {showDetailView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/50"
            onClick={handleBack}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <button
                  onClick={handleBack}
                  className="hover:text-blue-600 transition-colors flex items-center gap-1"
                >
                  <HomeIcon className="w-4 h-4" />
                  Trang chủ
                </button>
                {viewMode === 'employee' && (
                  <>
                    <ChevronRightIcon className="w-3.5 h-3.5 text-gray-300" />
                    <button
                      onClick={handleBackToDepartments}
                      className="hover:text-blue-600 transition-colors"
                    >
                      Phòng ban
                    </button>
                  </>
                )}
                {selectedEmployee && (
                  <>
                    <ChevronRightIcon className="w-3.5 h-3.5 text-gray-300" />
                    <button
                      onClick={handleBackToEmployees}
                      className="hover:text-blue-600 transition-colors"
                    >
                      Nhân viên
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={handleBack}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {viewMode === 'department' && 'Danh mục Phòng ban'}
                    {viewMode === 'employee' && !selectedEmployee &&
                      departments.find(d => d.id === selectedDepartment)?.name}
                    {selectedEmployee &&
                      employees.find(e => e.id === selectedEmployee)?.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {viewMode === 'department' && 'Quản lý nhân sự theo đơn vị'}
                    {viewMode === 'employee' && !selectedEmployee && 'Danh sách nhân sự trực thuộc'}
                    {selectedEmployee && 'Dữ liệu chấm công lịch sử chi tiết'}
                  </p>
                </div>

                {(viewMode === 'employee' || selectedEmployee) && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Tìm kiếm..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Department view */}
              {viewMode === 'department' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => handleSelectDepartment(dept.id)}
                      className="text-left p-4 rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                        <BuildingOfficeIcon className="w-5 h-5 text-blue-500" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mb-1">{dept.name}</p>
                      <p className="text-xs text-gray-500">{dept.employeeCount} nhân sự</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Employee list view */}
              {viewMode === 'employee' && !selectedEmployee && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departmentEmployees.length === 0 ? (
                    <div className="col-span-full py-16 text-center">
                      <UserIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">Không tìm thấy dữ liệu</p>
                    </div>
                  ) : (
                    departmentEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => handleSelectEmployee(emp.id)}
                        className="text-left p-4 rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <UserIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-blue-600 mb-0.5">{emp.code}</p>
                          <p className="text-sm font-semibold text-gray-900 truncate">{emp.name}</p>
                        </div>
                        <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Employee detail view */}
              {selectedEmployee && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Ngày công" value={18} color="green" />
                    <StatCard label="Đi muộn" value={3} color="yellow" />
                    <StatCard label="Vắng mặt" value={1} color="red" />
                    <StatCard label="Số ngày tính" value={22} color="blue" />
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <AttendanceCalendar
                      onDateClick={handleDateClick}
                      employeeId={selectedEmployee ? parseInt(selectedEmployee) : undefined}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {selectedEmployee && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={handleBackToEmployees}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Quay lại danh sách
                </button>
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                    In báo cáo
                  </button>
                  <button className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors">
                    Xuất file Excel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceUpload;
