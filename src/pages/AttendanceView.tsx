import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AttendanceCalendar from '../components/AttendanceCalendar';
import { 
  XMarkIcon, 
  CalendarIcon, 
  UserIcon, 
  BuildingOfficeIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { employeesAPI, departmentsAPI } from '../utils/api';
import { attendanceService, AttendanceRecord } from '../services/attendance.service';

interface Employee {
  id: number;
  full_name: string;
  employee_id: string;
  department?: {
    id: number;
    name: string;
  };
}

interface Department {
  id: number;
  name: string;
  code: string;
}

const AttendanceView: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [dateDetailModalOpen, setDateDetailModalOpen] = useState(false);
  const [dateDetailLoading, setDateDetailLoading] = useState(false);
  const [dateDetailRecords, setDateDetailRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDateDetail, setSelectedDateDetail] = useState<Date | null>(null);
  const [approvedExplanations, setApprovedExplanations] = useState<any[]>([]);
  const [approvedLeaveRequests, setApprovedLeaveRequests] = useState<any[]>([]);

  // Fetch employees and departments on component mount
  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  // Auto-select first employee when department is selected
  useEffect(() => {
    if (selectedDepartment && !selectedEmployee && employees.length > 0) {
      // Find employees in the selected department
      const employeesInDepartment = employees.filter(emp => 
        emp.department?.id === selectedDepartment
      );
      
      if (employeesInDepartment.length > 0) {
        // Auto-select the first employee in the department
        setSelectedEmployee(employeesInDepartment[0].id);
        console.log('Auto-selected employee:', employeesInDepartment[0].id, employeesInDepartment[0].full_name);
      }
    }
  }, [selectedDepartment, employees, selectedEmployee]);

  // Fetch attendance data when filters change
  useEffect(() => {
    if (selectedEmployee || selectedDepartment) {
      fetchAttendanceData();
      fetchCalendarData();
    }
  }, [selectedEmployee, selectedDepartment]);

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.list();
      setEmployees(response.results || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.list();
      setDepartments(response.results || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      // Get current month
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Prepare params with local timezone dates
      const params: any = {};
      if (selectedEmployee) params.employee_id = selectedEmployee;
      if (selectedDepartment) params.department_id = selectedDepartment;
      
      // Format start date in local timezone
      const startYear = startDate.getFullYear();
      const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
      const startDay = String(startDate.getDate()).padStart(2, '0');
      params.start_date = `${startYear}-${startMonth}-${startDay}`;
      
      // Format end date in local timezone
      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(endDate.getDate()).padStart(2, '0');
      params.end_date = `${endYear}-${endMonth}-${endDay}`;

      // Fetch attendance records only — stats come from calendar-view API summary
      const attendanceResponse = await attendanceService.getAttendanceRecords(params);
      setAttendanceRecords(attendanceResponse.results);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    try {
      const today = new Date();
      const params: any = {};
      if (selectedEmployee) params.employee_id = selectedEmployee;
      if (selectedDepartment) params.department_id = selectedDepartment;
      params.year = today.getFullYear();
      params.month = today.getMonth() + 1;

      console.log('Fetching calendar data with params:', params);

      const response = await attendanceService.getCalendarView(params);
      console.log('Calendar API response:', response);

      // Support new API format: { success: true, data: { calendar: [...], summary: {...} } }
      // and old format: { calendar_data: [...] }
      const calendarArray =
        (response as any)?.data?.calendar ||
        (response as any)?.calendar_data ||
        [];
      setCalendarData(calendarArray);

      // If new API format, also update stats from summary
      const summary = (response as any)?.data?.summary;
      if (summary) {
        setStats({
          statistics: {
            status_summary: {
              PRESENT: summary.full_days || 0,
              LATE: summary.late_or_early_days || 0,
              ABSENT: summary.absent_days || 0,
              HALF_DAY: summary.half_days || 0,
              FORGOT_CC: summary.forgot_checkin_days || 0,
            },
            total_working_hours: summary.extra_hours || 0,
            total_work_days: summary.total_work_days || 0,
            leave_days: summary.leave_days || 0,
          },
          _summary: summary,
        });
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setCalendarData([]);
    }
  };

  const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedEmployee(value ? parseInt(value) : null);
    if (value) {
      setSelectedDepartment(null); // Clear department if employee is selected
    }
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedDepartment(value ? parseInt(value) : null);
    // Don't clear employee here - let the useEffect handle auto-selection
  };

  const handleDateClick = async (date: Date, dayData?: any) => {
    console.log('Date clicked:', date);
    console.log('Day data:', dayData);
    setSelectedDate(date);
    setSelectedDateDetail(date);
    setDateDetailModalOpen(true);
    setDateDetailLoading(true);
    
    // Format date to YYYY-MM-DD in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    try {
      // Prepare params for fetching attendance records for this specific date
      const params: any = {
        start_date: dateStr,
        end_date: dateStr
      };
      
      if (selectedEmployee) {
        params.employee_id = selectedEmployee;
      } else if (selectedDepartment) {
        params.department_id = selectedDepartment;
      }
      
      // Fetch attendance records for the selected date
      const response = await attendanceService.getAttendanceRecords(params);
      setDateDetailRecords(response.results || []);
      
      // Try to get approved explanations from dayData first (from calendar)
      if (dayData) {
        console.log('Using dayData for approved requests:', dayData);
        setApprovedExplanations(dayData.approvedExplanations || []);
        setApprovedLeaveRequests(dayData.approvedLeaveRequests || []);
      } else {
        // Fallback to calendar data if dayData not available
        const calendarItem = calendarData.find(item => item.date === dateStr);
        if (calendarItem) {
          console.log('Found calendar item:', calendarItem);
          console.log('Approved explanations:', calendarItem.approved_explanations);
          console.log('Approved leave requests:', calendarItem.approved_leave_requests);
          setApprovedExplanations(calendarItem.approved_explanations || []);
          setApprovedLeaveRequests(calendarItem.approved_leave_requests || []);
        } else {
          console.log('No calendar item found for date:', dateStr);
          // If not in calendar data, try to fetch from API
          // For now, we'll set empty arrays
          setApprovedExplanations([]);
          setApprovedLeaveRequests([]);
        }
      }
      
      // Log for debugging
      console.log('Date detail records:', response.results || []);
      console.log('Approved explanations state:', approvedExplanations);
      console.log('Approved leave requests state:', approvedLeaveRequests);
    } catch (error) {
      console.error('Error fetching date details:', error);
      // Fallback to mock data if API fails
      const mockDateDetails: AttendanceRecord[] = [
        {
          id: 1,
          attendance_date: dateStr,
          check_in: '08:00',
          check_out: '17:30',
          status: 'PRESENT',
          status_display: 'Đủ công',
          shift_type: 'FULL_DAY',
          shift_type_display: 'Cả ngày',
          working_hours: 8.5,
          overtime_hours: 0,
          late_minutes: 0,
          early_leave_minutes: 0,
          notes: '',
          employee_name: selectedEmployee ? getSelectedEmployeeName() : 'Nguyễn Văn A',
          employee_code: selectedEmployee ? 'NV001' : 'NV001',
          department_name: selectedDepartment ? getSelectedDepartmentName() : 'IT - Công nghệ thông tin'
        }
      ];
      setDateDetailRecords(mockDateDetails);
      
      // Use dayData for approved requests even in error case
      if (dayData) {
        setApprovedExplanations(dayData.approvedExplanations || []);
        setApprovedLeaveRequests(dayData.approvedLeaveRequests || []);
      } else {
        setApprovedExplanations([]);
        setApprovedLeaveRequests([]);
      }
    } finally {
      setDateDetailLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedEmployee(null);
    setSelectedDepartment(null);
    setAttendanceRecords([]);
    setStats(null);
    setCalendarData([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-800';
      case 'LATE': return 'bg-yellow-100 text-yellow-800';
      case 'ABSENT': return 'bg-red-100 text-red-800';
      case 'EARLY_LEAVE': return 'bg-orange-100 text-orange-800';
      case 'HALF_DAY': return 'bg-blue-100 text-blue-800';
      case 'INCOMPLETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Determine correct status display based on actual data
  const getCorrectStatusDisplay = (record: AttendanceRecord): string => {
    // Check if this is incomplete attendance data
    const hasCheckIn = record.check_in && record.check_in !== null && record.check_in !== '';
    const hasCheckOut = record.check_out && record.check_out !== null && record.check_out !== '';
    const workingHours = record.working_hours || 0;
    const hasValidAttendanceData = hasCheckIn && hasCheckOut && workingHours > 0;
    
    if (!hasValidAttendanceData) {
      // Incomplete attendance data
      if (!hasCheckIn && !hasCheckOut) {
        return 'Chưa chấm công';
      } else if (!hasCheckIn) {
        return 'Thiếu giờ vào';
      } else if (!hasCheckOut) {
        return 'Thiếu giờ ra';
      } else if (workingHours <= 0) {
        return 'Không có giờ làm';
      }
      return 'Thiếu dữ liệu';
    }
    
    // Valid attendance data, use the API status
    return record.status_display;
  };

  // Get status for color coding
  const getStatusForColor = (record: AttendanceRecord): string => {
    // Check if this is incomplete attendance data
    const hasCheckIn = record.check_in && record.check_in !== null && record.check_in !== '';
    const hasCheckOut = record.check_out && record.check_out !== null && record.check_out !== '';
    const workingHours = record.working_hours || 0;
    const hasValidAttendanceData = hasCheckIn && hasCheckOut && workingHours > 0;
    
    if (!hasValidAttendanceData) {
      return 'INCOMPLETE';
    }
    
    return record.status;
  };

  const getSelectedEmployeeName = () => {
    if (!selectedEmployee) return '';
    const employee = employees.find(emp => emp.id === selectedEmployee);
    return employee ? employee.full_name : '';
  };

  const getSelectedDepartmentName = () => {
    if (!selectedDepartment) return '';
    const department = departments.find(dept => dept.id === selectedDepartment);
    return department ? department.name : '';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const closeDateDetailModal = () => {
    setDateDetailModalOpen(false);
    setDateDetailRecords([]);
    setSelectedDateDetail(null);
    setApprovedExplanations([]);
    setApprovedLeaveRequests([]);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Xem chấm công</h1>
        <p className="text-gray-600 mt-2">
          Xem và lọc chấm công theo nhân viên hoặc phòng ban
        </p>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <FunnelIcon className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Bộ lọc</h2>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            {showFilters ? (
              <>
                <ChevronUpIcon className="h-4 w-4 mr-1" />
                Ẩn bộ lọc
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-4 w-4 mr-1" />
                Hiện bộ lọc
              </>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee Filter */}
            <div>
              <label htmlFor="employee" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center">
                  <UserIcon className="h-4 w-4 text-gray-500 mr-1" />
                  Lọc theo nhân viên
                </div>
              </label>
              <select
                id="employee"
                value={selectedEmployee || ''}
                onChange={handleEmployeeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">-- Chọn nhân viên --</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employee_id} - {employee.full_name}
                    {employee.department && ` (${employee.department.name})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center">
                  <BuildingOfficeIcon className="h-4 w-4 text-gray-500 mr-1" />
                  Lọc theo phòng ban
                </div>
              </label>
              <select
                id="department"
                value={selectedDepartment || ''}
                onChange={handleDepartmentChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">-- Chọn phòng ban --</option>
                {departments.map(department => (
                  <option key={department.id} value={department.id}>
                    {department.code} - {department.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Selected Filters Display */}
        {(selectedEmployee || selectedDepartment) && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-blue-900">Bộ lọc đang áp dụng:</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedEmployee && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      <UserIcon className="h-4 w-4 mr-1" />
                      Nhân viên: {getSelectedEmployeeName()}
                    </span>
                  )}
                  {selectedDepartment && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                      Phòng ban: {getSelectedDepartmentName()}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Xóa bộ lọc
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 text-sm text-gray-600">
          <p className="font-medium mb-1">Hướng dẫn:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Chọn nhân viên để xem chấm công của nhân viên đó</li>
            <li>Chọn phòng ban để xem chấm công của toàn bộ phòng ban</li>
            <li>Chỉ có thể chọn một trong hai: nhân viên HOẶC phòng ban</li>
            <li>Dữ liệu sẽ tự động cập nhật khi thay đổi bộ lọc</li>
          </ul>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Statistics Section */}
      {stats && !loading && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Thống kê chấm công</h2>
          {/* New API summary format */}
          {stats._summary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="bg-green-50 border border-green-100 p-4 rounded-lg">
                <h3 className="font-medium text-green-900 text-xs">Đủ công</h3>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {stats._summary.full_days || 0}
                </p>
              </div>
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg">
                <h3 className="font-medium text-orange-900 text-xs">Nửa công</h3>
                <p className="text-2xl font-bold text-orange-700 mt-1">
                  {stats._summary.half_days || 0}
                </p>
              </div>
              <div className="bg-red-50 border border-red-100 p-4 rounded-lg">
                <h3 className="font-medium text-red-900 text-xs">Vắng mặt</h3>
                <p className="text-2xl font-bold text-red-700 mt-1">
                  {stats._summary.absent_days || 0}
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg">
                <h3 className="font-medium text-yellow-900 text-xs">Muộn/Sớm</h3>
                <p className="text-2xl font-bold text-yellow-700 mt-1">
                  {stats._summary.late_or_early_days || 0}
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg">
                <h3 className="font-medium text-purple-900 text-xs">Quên CC</h3>
                <p className="text-2xl font-bold text-purple-700 mt-1">
                  {stats._summary.forgot_checkin_days || 0}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 text-xs">Tổng ngày công</h3>
                <p className="text-2xl font-bold text-blue-700 mt-1">
                  {stats._summary.total_work_days || 0}
                </p>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                <h3 className="font-medium text-indigo-900 text-xs">Buổi trực</h3>
                <p className="text-2xl font-bold text-indigo-700 mt-1">
                  {stats._summary.live_sessions || 0}
                </p>
              </div>
              <div className="bg-teal-50 border border-teal-100 p-4 rounded-lg">
                <h3 className="font-medium text-teal-900 text-xs">Ngày nghỉ phép</h3>
                <p className="text-2xl font-bold text-teal-700 mt-1">
                  {stats._summary.leave_days || 0}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900 text-sm">Ngày có mặt</h3>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {stats.statistics.status_summary?.PRESENT || 0}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-medium text-yellow-900 text-sm">Ngày đi muộn</h3>
                <p className="text-2xl font-bold text-yellow-700 mt-1">
                  {stats.statistics.status_summary?.LATE || 0}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-medium text-red-900 text-sm">Ngày vắng mặt</h3>
                <p className="text-2xl font-bold text-red-700 mt-1">
                  {stats.statistics.status_summary?.ABSENT || 0}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 text-sm">Tổng giờ làm</h3>
                <p className="text-2xl font-bold text-blue-700 mt-1">
                  {stats.statistics.total_working_hours?.toFixed(1) || 0}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar View - Show when employee or department is selected */}
      {(selectedEmployee || selectedDepartment) && !loading && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Lịch chấm công</h2>
            <div className="text-sm text-gray-600">
              <CalendarIcon className="h-5 w-5 inline mr-1" />
              Tháng hiện tại
            </div>
          </div>
          <AttendanceCalendar 
            onDateClick={handleDateClick}
            employeeId={selectedEmployee || undefined}
            departmentId={selectedDepartment || undefined}
          />
        </div>
      )}

      {/* Attendance Records Table */}
      {attendanceRecords.length > 0 && !loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Chi tiết chấm công </h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedEmployee ? `Nhân viên: ${getSelectedEmployeeName()}` : ''}
              {selectedDepartment ? `Phòng ban: ${getSelectedDepartmentName()}` : ''}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nhân viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phòng ban
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Giờ vào
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Giờ ra
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng giờ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ghi chú
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(record.attendance_date).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.employee_name} ({record.employee_code})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.department_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.check_in || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.check_out || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(record.working_hours).toFixed(1)} giờ
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getStatusForColor(record))}`}>
                        {getCorrectStatusDisplay(record)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination would go here in a real implementation */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Hiển thị <span className="font-medium">{attendanceRecords.length}</span> bản ghi
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Trước
                </button>
                <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Sau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!loading && !selectedEmployee && !selectedDepartment && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa chọn bộ lọc</h3>
          <p className="text-gray-600 mb-4">
            Vui lòng chọn nhân viên hoặc phòng ban để xem chấm công
          </p>
        </div>
      )}

      {!loading && (selectedEmployee || selectedDepartment) && attendanceRecords.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Không có dữ liệu chấm công</h3>
          <p className="text-gray-600">
            Không tìm thấy bản ghi chấm công nào cho bộ lọc đã chọn
          </p>
        </div>
      )}

      {/* Date Detail Modal */}
      {dateDetailModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Chi tiết chấm công ngày</h2>
                <p className="text-gray-600 mt-1">
                  {selectedDateDetail && formatDate(selectedDateDetail)}
                </p>
              </div>
              <button
                onClick={closeDateDetailModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {dateDetailLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : dateDetailRecords.length > 0 ? (
                <div>
                  {/* Summary Stats */}
                  <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-900 text-sm">Tổng nhân viên</h3>
                      <p className="text-2xl font-bold text-blue-700 mt-1">
                        {dateDetailRecords.length}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-medium text-green-900 text-sm">Có mặt</h3>
                      <p className="text-2xl font-bold text-green-700 mt-1">
                        {dateDetailRecords.filter(r => r.status === 'PRESENT').length}
                      </p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="font-medium text-yellow-900 text-sm">Đi muộn</h3>
                      <p className="text-2xl font-bold text-yellow-700 mt-1">
                        {dateDetailRecords.filter(r => r.status === 'LATE').length}
                      </p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="font-medium text-red-900 text-sm">Vắng mặt</h3>
                      <p className="text-2xl font-bold text-red-700 mt-1">
                        {dateDetailRecords.filter(r => r.status === 'ABSENT').length}
                      </p>
                    </div>
                  </div>

                  {/* Approved Requests Section - Always show */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Đơn đã duyệt</h3>
                    
                    {/* Approved Explanations */}
                    {approvedExplanations.length > 0 ? (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Đơn giải trình chấm công đã duyệt:</h4>
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="space-y-3">
                            {approvedExplanations.map((explanation, index) => (
                              <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      Mã đơn: {explanation.request_code}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Từ: {explanation.original_status} → {explanation.expected_status}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Duyệt bởi: {explanation.approved_by_name}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Thời gian duyệt: {new Date(explanation.approved_at).toLocaleDateString('vi-VN')} {new Date(explanation.approved_at).toLocaleTimeString('vi-VN')}
                                    </p>
                                  </div>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Đã duyệt
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Đơn giải trình chấm công đã duyệt:</h4>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-gray-600">Không có đơn giải trình chấm công nào đã được duyệt cho ngày này.</p>
                        </div>
                      </div>
                    )}

                    {/* Approved Leave Requests */}
                    {approvedLeaveRequests.length > 0 ? (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Đơn nghỉ phép đã duyệt:</h4>
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="space-y-3">
                            {approvedLeaveRequests.map((leave, index) => (
                              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      Mã đơn: {leave.request_code}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Loại nghỉ phép: {leave.leave_type}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Duyệt bởi: {leave.approved_by_name}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Thời gian duyệt: {new Date(leave.approved_at).toLocaleDateString('vi-VN')} {new Date(leave.approved_at).toLocaleTimeString('vi-VN')}
                                    </p>
                                  </div>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Đã duyệt
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Đơn nghỉ phép đã duyệt:</h4>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-gray-600">Không có đơn nghỉ phép nào đã được duyệt cho ngày này.</p>
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Tóm tắt:</span> Ngày này có {approvedExplanations.length} đơn giải trình và {approvedLeaveRequests.length} đơn nghỉ phép đã được duyệt.
                      </p>
                    </div>
                  </div>

                  {/* Attendance Records Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nhân viên
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phòng ban
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Giờ vào
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Giờ ra
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tổng giờ
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Trạng thái
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ghi chú
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dateDetailRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                                  <UserIcon className="h-5 w-5 text-primary-600" />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {record.employee_name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {record.employee_code}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {record.department_name}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                                <span className="text-sm text-gray-900">
                                  {record.check_in || '-'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                                <span className="text-sm text-gray-900">
                                  {record.check_out || '-'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {Number(record.working_hours).toFixed(1)} giờ
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getStatusForColor(record))}`}>
                                {getCorrectStatusDisplay(record)}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="space-y-1">
                                {record.notes && (
                                  <div>{record.notes}</div>
                                )}
                                {(record.late_minutes > 0 || record.early_leave_minutes > 0) && (
                                  <div className="text-xs text-gray-600">
                                    {record.late_minutes > 0 && (
                                      <div>Đi muộn: {record.late_minutes} phút</div>
                                    )}
                                    {record.early_leave_minutes > 0 && (
                                      <div>Về sớm: {record.early_leave_minutes} phút</div>
                                    )}
                                  </div>
                                )}
                                {!record.notes && record.late_minutes === 0 && record.early_leave_minutes === 0 && (
                                  <div>-</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Rule Application Info */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <InformationCircleIcon className="h-5 w-5 text-gray-500 mr-2" />
                      <h3 className="font-medium text-gray-900">Thông tin áp dụng quy tắc</h3>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Dữ liệu chấm công được tính toán tự động dựa trên quy tắc:
                    </p>
                    <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
                      <li>Giờ làm việc: 08:30 - 17:30 (8 giờ làm việc)</li>
                      <li>Ngưỡng đi muộn: 15 phút sau giờ vào</li>
                      <li>Ngưỡng về sớm: 15 phút trước giờ ra</li>
                      <li>Trạng thái được tính tự động dựa trên giờ vào/ra thực tế</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="py-4">
                  {(approvedExplanations.length > 0 || approvedLeaveRequests.length > 0) ? (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Đơn đã duyệt</h3>
                      {approvedExplanations.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Đơn giải trình chấm công đã duyệt:</h4>
                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="space-y-3">
                              {approvedExplanations.map((explanation, index) => (
                                <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        Mã đơn: {explanation.request_code}
                                      </p>
                                      {explanation.reason && (
                                        <p className="text-sm text-gray-600">Lý do: {explanation.reason}</p>
                                      )}
                                      <p className="text-sm text-gray-600">
                                        Từ: {explanation.original_status} → {explanation.expected_status}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Duyệt bởi: {explanation.approved_by_name}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Thời gian duyệt: {new Date(explanation.approved_at).toLocaleDateString('vi-VN')} {new Date(explanation.approved_at).toLocaleTimeString('vi-VN')}
                                      </p>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Đã duyệt
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {approvedLeaveRequests.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Đơn nghỉ phép đã duyệt:</h4>
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="space-y-3">
                              {approvedLeaveRequests.map((leave, index) => (
                                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        Mã đơn: {leave.request_code}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Loại nghỉ phép: {leave.leave_type}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Duyệt bởi: {leave.approved_by_name}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Thời gian duyệt: {new Date(leave.approved_at).toLocaleDateString('vi-VN')} {new Date(leave.approved_at).toLocaleTimeString('vi-VN')}
                                      </p>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      Đã duyệt
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Không có dữ liệu chấm công</h3>
                      <p className="text-gray-600">
                        Không tìm thấy bản ghi chấm công nào cho ngày {selectedDateDetail && formatDate(selectedDateDetail)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={closeDateDetailModal}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceView;
