import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  employeesAPI,
  departmentsAPI,
  Employee,
  Department,
} from '../utils/api';
import onboardingService, { OnboardingProcess, OnboardingDocument } from '../services/onboarding.service';
import {
  UserIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  BanknotesIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  UserGroupIcon,
  IdentificationIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  DocumentCheckIcon,
  DocumentDuplicateIcon,
  CurrencyDollarIcon,
  ClockIcon,
  PhotoIcon,
  MapPinIcon,
  HomeIcon,
  AcademicCapIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

interface TeamMember {
  id: number;
  employee_id: string;
  full_name: string;
  position_title: string;
  phone_number?: string;
  personal_email?: string;
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [manager, setManager] = useState<Employee | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    phone_number: '',
    personal_email: '',
    bank_name: '',
    bank_account: '',
  });

  // Avatar state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Manager assignment state
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const [managerResults, setManagerResults] = useState<Employee[]>([]);
  const [managerSearchLoading, setManagerSearchLoading] = useState(false);
  const [managerSaving, setManagerSaving] = useState(false);
  const managerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Onboarding documents state
  const [onboarding, setOnboarding] = useState<OnboardingProcess | null>(null);
  const [viewingDoc, setViewingDoc] = useState<OnboardingDocument | null>(null);
  const [docReadable, setDocReadable] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<number | null>(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    if (!showTeamModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowTeamModal(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showTeamModal]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Fetch the current authenticated user's employee profile
      const emp = await employeesAPI.me();
      setEmployee(emp);

      // Fetch onboarding của user (nếu có) để hiển thị "Tài liệu cần đọc"
      try {
        const myOb = await onboardingService.myOnboarding();
        setOnboarding(myOb);
      } catch (err) {
        console.warn('No onboarding for current user:', err);
      }

      // Set initial form values
      setEditForm({
        phone_number: emp.phone_number || '',
        personal_email: emp.personal_email || '',
        bank_name: emp.bank_name || '',
        bank_account: emp.bank_account || '',
      });

      // Fetch department details
      if (emp.department?.id) {
        try {
          const dept = await departmentsAPI.getById(emp.department.id);
          setDepartment(dept);
        } catch (err) {
          console.error('Error fetching department:', err);
        }
      }

      // Fetch manager details
      try {
        let managerId: number | null = null;
        if (emp.manager && typeof emp.manager === 'object' && emp.manager.id) {
          managerId = emp.manager.id;
        } else if (
          emp.manager &&
          (typeof emp.manager === 'number' || !isNaN(Number(emp.manager)))
        ) {
          // Some APIs return manager as an ID (number) instead of object
          managerId = Number(emp.manager);
        }

        if (managerId) {
          try {
            const mgr = await employeesAPI.getById(managerId);
            console.log('Fetched manager by id:', mgr);
            setManager(mgr);
          } catch (err) {
            console.error('Error fetching manager by id:', managerId, err);
            // Fallback to manager_name from employee payload if available
            if (emp.manager_name) {
              setManager({
                id: managerId,
                full_name: emp.manager_name,
              } as unknown as Employee);
            }
          }
        } else if (emp.manager_name) {
          // No manager id available, but API returned manager name
          setManager({
            id: 0,
            full_name: emp.manager_name,
          } as unknown as Employee);
        }
      } catch (err) {
        console.error('Unexpected error while resolving manager:', err);
      }

      // Fetch team members (employees in same department)
      if (emp.department?.id) {
        try {
          const deptEmployees = await departmentsAPI.employees(
            emp.department.id,
            { page_size: 50 }
          );
          const team = deptEmployees.results
            .filter((e) => e.id !== emp.id)
            .map((e) => ({
              id: e.id,
              employee_id: e.employee_id,
              full_name: e.full_name,
              position_title: e.position?.title || 'Chưa phân chức vụ',
              phone_number: e.phone_number,
              personal_email: e.personal_email,
            }));
          setTeamMembers(team);
        } catch (err) {
          console.error('Error fetching team members:', err);
        }
      }

      setError(null);
    } catch (err: any) {
      console.error('Error fetching profile data:', err);
      setError('Không thể tải thông tin cá nhân. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (field: string) => {
    setEditingField(field);
  };

  const handleSave = async (field: string) => {
    if (!employee) return;

    try {
      const updateData: any = {};
      updateData[field] = editForm[field as keyof typeof editForm];

      await employeesAPI.partialUpdate(employee.id, updateData);

      // Update local employee data
      setEmployee((prev) => (prev ? { ...prev, ...updateData } : null));
      setEditingField(null);

      alert('Cập nhật thành công!');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      alert('Cập nhật thất bại. Vui lòng thử lại sau.');
    }
  };

  const handleCancel = () => {
    if (employee) {
      setEditForm({
        phone_number: employee.phone_number || '',
        personal_email: employee.personal_email || '',
        bank_name: employee.bank_name || '',
        bank_account: employee.bank_account || '',
      });
    }
    setEditingField(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleManagerSearch = (query: string) => {
    setManagerSearch(query);
    if (managerSearchTimer.current) clearTimeout(managerSearchTimer.current);
    if (!query.trim()) {
      setManagerResults([]);
      return;
    }
    managerSearchTimer.current = setTimeout(async () => {
      setManagerSearchLoading(true);
      try {
        const res = await employeesAPI.list({ search: query, page_size: 10 });
        setManagerResults(res.results);
      } catch {
        setManagerResults([]);
      } finally {
        setManagerSearchLoading(false);
      }
    }, 300);
  };

  const handleSelectManager = async (selectedEmployee: Employee) => {
    setManagerSaving(true);
    try {
      await employeesAPI.setManager(selectedEmployee.employee_id);
      setManager(selectedEmployee);
      setShowManagerModal(false);
      setManagerSearch('');
      setManagerResults([]);
    } catch {
      alert('Cập nhật quản lý thất bại. Vui lòng thử lại.');
    } finally {
      setManagerSaving(false);
    }
  };

  const handleClearManager = async () => {
    if (!window.confirm('Bạn có chắc muốn xoá quản lý trực tiếp?')) return;
    setManagerSaving(true);
    try {
      await employeesAPI.setManager(null);
      setManager(null);
    } catch {
      alert('Xoá quản lý thất bại. Vui lòng thử lại.');
    } finally {
      setManagerSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side file size validation (5 MB limit)
    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Kích thước ảnh không được vượt quá ${MAX_SIZE_MB}MB.`);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }

    setAvatarUploading(true);
    try {
      const result = await employeesAPI.changeAvatar(file);
      setEmployee((prev) => prev ? { ...prev, avatar_url: result.avatar_url } : prev);
      // Sync avatar URL into auth context so sidebar/header reflect it immediately
      if (user?.hrm_user) {
        updateUser({ hrm_user: { ...user.hrm_user, avatar_url: result.avatar_url } });
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
      alert('Tải ảnh đại diện thất bại. Vui lòng thử lại.');
    } finally {
      setAvatarUploading(false);
      // Reset file input so the same file can be selected again
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getGenderText = (gender: string) => {
    switch (gender) {
      case 'M':
        return 'Nam';
      case 'F':
        return 'Nữ';
      case 'O':
        return 'Khác';
      default:
        return gender;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải thông tin cá nhân...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Đã xảy ra lỗi</h3>
            <p className="text-sm text-red-700 mt-2">{error}</p>
            <button
              onClick={fetchProfileData}
              className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Không tìm thấy thông tin nhân viên
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Vui lòng liên hệ quản trị viên để được hỗ trợ.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Thông tin cá nhân
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Quản lý thông tin cá nhân và tài khoản ngân hàng
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <UserIcon className="h-4 w-4 mr-1" />
            {employee.employment_status === 'ACTIVE'
              ? 'Đang làm việc'
              : employee.employment_status === 'PROBATION'
                ? 'Đang thử việc'
                : 'Đã nghỉ việc'}
          </span>
        </div>
      </div>

      {/* Avatar Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Ảnh đại diện</h2>
        <div className="flex items-center space-x-6">
          <div className="relative flex-shrink-0">
            {employee.avatar_url ? (
              <img
                src={employee.avatar_url}
                alt="Avatar"
                className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center border-2 border-gray-200">
                <span className="text-2xl font-bold text-white">
                  {employee.full_name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
          <div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${avatarUploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <PhotoIcon className="h-4 w-4 mr-2 text-gray-400" />
              {avatarUploading ? 'Đang tải...' : 'Thay đổi ảnh'}
            </label>
            <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF tối đa 5MB</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                Thông tin cá nhân
              </h2>
              <div className="flex items-center space-x-2">
                <IdentificationIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-500">
                  Mã NV: {employee.employee_id}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên
                </label>
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-gray-900">{employee.full_name}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giới tính
                </label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <span className="text-gray-900">
                    {getGenderText(employee.gender)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày sinh
                </label>
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-gray-900">
                    {employee.date_of_birth
                      ? formatDate(employee.date_of_birth)
                      : 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày vào làm
                </label>
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-gray-900">
                    {employee.start_date
                      ? formatDate(employee.start_date)
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Editable Fields */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Số điện thoại
                  </label>
                  {editingField === 'phone_number' ? (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleSave('phone_number')}
                        className="text-green-600 hover:text-green-900"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-red-600 hover:text-red-900"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit('phone_number')}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {editingField === 'phone_number' ? (
                  <input
                    type="tel"
                    value={editForm.phone_number}
                    onChange={(e) =>
                      handleInputChange('phone_number', e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="Nhập số điện thoại"
                  />
                ) : (
                  <div className="flex items-center p-3 bg-gray-50 rounded-md">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-900">
                      {employee.phone_number || 'Chưa cập nhật'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Email cá nhân
                  </label>
                  {editingField === 'personal_email' ? (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleSave('personal_email')}
                        className="text-green-600 hover:text-green-900"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-red-600 hover:text-red-900"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit('personal_email')}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {editingField === 'personal_email' ? (
                  <input
                    type="email"
                    value={editForm.personal_email}
                    onChange={(e) =>
                      handleInputChange('personal_email', e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="Nhập email cá nhân"
                  />
                ) : (
                  <div className="flex items-center p-3 bg-gray-50 rounded-md">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-900">
                      {employee.personal_email || 'Chưa cập nhật'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bank Information Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">
              Thông tin ngân hàng
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Tên ngân hàng
                  </label>
                  {editingField === 'bank_name' ? (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleSave('bank_name')}
                        className="text-green-600 hover:text-green-900"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-red-600 hover:text-red-900"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit('bank_name')}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {editingField === 'bank_name' ? (
                  <input
                    type="text"
                    value={editForm.bank_name}
                    onChange={(e) =>
                      handleInputChange('bank_name', e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="Nhập tên ngân hàng"
                  />
                ) : (
                  <div className="flex items-center p-3 bg-gray-50 rounded-md">
                    <BanknotesIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-900">
                      {employee.bank_name || 'Chưa cập nhật'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Số tài khoản
                  </label>
                  {editingField === 'bank_account' ? (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleSave('bank_account')}
                        className="text-green-600 hover:text-green-900"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-red-600 hover:text-red-900"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit('bank_account')}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {editingField === 'bank_account' ? (
                  <input
                    type="text"
                    value={editForm.bank_account}
                    onChange={(e) =>
                      handleInputChange('bank_account', e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="Nhập số tài khoản"
                  />
                ) : (
                  <div className="flex items-center p-3 bg-gray-50 rounded-md">
                    <BanknotesIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-900">
                      {employee.bank_account || 'Chưa cập nhật'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Department and Team Info */}
        <div className="space-y-6">
          {/* Department Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">
              Thông tin phòng ban
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phòng ban
                </label>
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-gray-900">
                    {department?.name ||
                      employee.department?.name ||
                      'Chưa phân phòng'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã phòng ban
                </label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <span className="text-gray-900">
                    {department?.code || employee.department?.code || 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chức vụ
                </label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <span className="text-gray-900">
                    {employee.position?.title || 'Không có chức vụ'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Manager Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                Quản lý trực tiếp
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowManagerModal(true)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-md hover:bg-indigo-50 disabled:opacity-50"
                  disabled={managerSaving}
                >
                  <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
                  Tìm &amp; gán quản lý
                </button>
                {(manager || employee?.manager_name) && (
                  <button
                    onClick={handleClearManager}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
                    disabled={managerSaving}
                    title="Xoá quản lý trực tiếp"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {manager || employee.manager_name ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Họ tên
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-md">
                    <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-900">
                      {manager?.full_name || employee.manager_name}
                    </span>
                  </div>
                </div>

                {manager?.employee_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã nhân viên
                    </label>
                    <div className="p-3 bg-gray-50 rounded-md">
                      <span className="text-gray-900">{manager.employee_id}</span>
                    </div>
                  </div>
                )}

                {manager?.position?.title && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chức vụ
                    </label>
                    <div className="p-3 bg-gray-50 rounded-md">
                      <span className="text-gray-900">{manager.position.title}</span>
                    </div>
                  </div>
                )}

                {manager?.phone_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số điện thoại
                    </label>
                    <div className="flex items-center p-3 bg-gray-50 rounded-md">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-900">
                        {manager.phone_number}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  Không có quản lý trực tiếp
                </p>
              </div>
            )}
          </div>

          {/* Team Members Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                Thành viên trong team
              </h2>
              <span className="text-sm text-gray-500">
                {teamMembers.length} thành viên
              </span>
            </div>

            {teamMembers.length > 0 ? (
              <div className="space-y-4">
                {teamMembers.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {member.full_name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {member.position_title}
                        </p>
                        <p className="text-sm text-gray-500">
                          Mã NV: {member.employee_id}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      {member.phone_number && (
                        <div className="flex items-center text-gray-600">
                          <PhoneIcon className="h-4 w-4 mr-1" />
                          <span>{member.phone_number}</span>
                        </div>
                      )}
                      {member.personal_email && (
                        <div className="flex items-center text-gray-600">
                          <EnvelopeIcon className="h-4 w-4 mr-1" />
                          <span className="truncate">
                            {member.personal_email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {teamMembers.length > 5 && (
                  <div className="text-center pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowTeamModal(true)}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Xem thêm ({teamMembers.length - 5} thành viên khác)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  Không có thành viên trong team
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Onboarding and HR Information Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contract and Salary Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              Thông tin hợp đồng & Lương
            </h2>
            <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại hợp đồng
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900">
                  {employee.contract_type_display ||
                    employee.contract_type ||
                    'Chưa cập nhật'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lương cơ bản
                </label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <span className="text-gray-900">
                    {employee.basic_salary
                      ? new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(employee.basic_salary)
                      : 'Chưa cập nhật'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tháng thử việc
                </label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <span className="text-gray-900">
                    {employee.probation_months
                      ? `${employee.probation_months} tháng`
                      : 'Chưa cập nhật'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày kết thúc thử việc
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900">
                  {employee.probation_end_date
                    ? formatDate(employee.probation_end_date)
                    : 'Chưa cập nhật'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Employee File Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              Trạng thái hồ sơ
            </h2>
            <DocumentCheckIcon className="h-5 w-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trạng thái hồ sơ
              </label>
              <div
                className={`flex items-center p-3 rounded-md ${
                  employee.file_status === 'COMPLETE'
                    ? 'bg-green-50 text-green-800'
                    : employee.file_status === 'NEED_SUPPLEMENT'
                      ? 'bg-yellow-50 text-yellow-800'
                      : employee.file_status === 'NOT_SUBMITTED'
                        ? 'bg-red-50 text-red-800'
                        : 'bg-gray-50 text-gray-800'
                }`}
              >
                <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">
                  {employee.file_status_display ||
                    employee.file_status ||
                    'Chưa cập nhật'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hạn nộp hồ sơ
                </label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <span className="text-gray-900">
                    {employee.file_submission_deadline
                      ? formatDate(employee.file_submission_deadline)
                      : 'Chưa cập nhật'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày nộp hồ sơ
                </label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <span className="text-gray-900">
                    {employee.file_submission_date
                      ? formatDate(employee.file_submission_date)
                      : 'Chưa nộp'}
                  </span>
                </div>
              </div>
            </div>

            {employee.file_review_notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú rà soát
                </label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-gray-900 text-sm">
                    {employee.file_review_notes}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tài liệu onboarding cần đọc */}
      {(() => {
        const requiredDocs = (onboarding?.documents || []).filter(
          (d) => d.document_type === 'REGULATION' && d.is_required
        );
        if (requiredDocs.length === 0) return null;
        const unreadCount = requiredDocs.filter((d) => !d.is_read).length;
        return (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-5 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Tài liệu onboarding cần đọc</h3>
                <p className="text-xs text-gray-600">
                  {unreadCount === 0
                    ? '✓ Bạn đã đọc hết tài liệu bắt buộc'
                    : `${unreadCount} / ${requiredDocs.length} chưa đọc`}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {requiredDocs.map((doc) => (
                <div key={doc.id} className="bg-white rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{doc.document_name}</p>
                      {doc.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{doc.description}</p>
                      )}
                      {doc.is_read ? (
                        <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircleIcon className="w-3 h-3" /> Đã đọc
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          <ClockIcon className="w-3 h-3" /> Chưa đọc
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setViewingDoc(doc);
                        setDocReadable(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex-shrink-0 inline-flex items-center gap-1.5"
                    >
                      <EyeIcon className="w-4 h-4" />
                      Xem
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Training and Personal Information Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              Đào tạo hội nhập
            </h2>
            <AcademicCapIcon className="h-5 w-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bài thuyết trình đào tạo
              </label>
              <div
                className={`flex items-center p-3 rounded-md ${
                  employee.training_presentation_viewed
                    ? 'bg-green-50 text-green-800'
                    : 'bg-gray-50 text-gray-800'
                }`}
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">
                  {employee.training_presentation_viewed
                    ? 'Đã xem'
                    : 'Chưa xem'}
                </span>
                {employee.training_presentation_viewed_at && (
                  <span className="text-sm ml-2">
                    ({formatDate(employee.training_presentation_viewed_at)})
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ảnh chụp thông tin VNEID
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <PhotoIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900">
                  {employee.vneid_screenshot ? 'Đã tải lên' : 'Chưa tải lên'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CCCD and Personal Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              Thông tin CCCD
            </h2>
            <IdentificationIcon className="h-5 w-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số CCCD
              </label>
              <div className="p-3 bg-gray-50 rounded-md">
                <span className="text-gray-900">
                  {employee.cccd_number || 'Chưa cập nhật'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày cấp
                </label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <span className="text-gray-900">
                    {employee.cccd_issue_date
                      ? formatDate(employee.cccd_issue_date)
                      : 'Chưa cập nhật'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nơi cấp
                </label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <span className="text-gray-900">
                    {employee.cccd_issue_place || 'Chưa cập nhật'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nơi khai sinh
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900">
                  {employee.birth_place || 'Chưa cập nhật'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nơi thường trú
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <HomeIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900">
                  {employee.permanent_residence || 'Chưa cập nhật'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members Modal */}
      {showTeamModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="team-modal-title"
        >
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2
                  id="team-modal-title"
                  className="text-lg font-bold text-gray-900"
                >
                  Thành viên trong team
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {teamMembers.length} thành viên
                </p>
              </div>
              <button
                onClick={() => setShowTeamModal(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Đóng modal"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4 space-y-4">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {member.full_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {member.position_title}
                      </p>
                      <p className="text-sm text-gray-500">
                        Mã NV: {member.employee_id}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    {member.phone_number && (
                      <div className="flex items-center text-gray-600">
                        <PhoneIcon className="h-4 w-4 mr-1" />
                        <span>{member.phone_number}</span>
                      </div>
                    )}
                    {member.personal_email && (
                      <div className="flex items-center text-gray-600">
                        <EnvelopeIcon className="h-4 w-4 mr-1" />
                        <span className="truncate">{member.personal_email}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manager Search Modal */}
      {showManagerModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manager-modal-title"
        >
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 id="manager-modal-title" className="text-lg font-bold text-gray-900">
                Tìm kiếm quản lý trực tiếp
              </h2>
              <button
                onClick={() => {
                  setShowManagerModal(false);
                  setManagerSearch('');
                  setManagerResults([]);
                }}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Đóng"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 border-b">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nhập tên hoặc mã nhân viên..."
                  value={managerSearch}
                  onChange={(e) => handleManagerSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
              {managerSearchLoading && (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                </div>
              )}

              {!managerSearchLoading && managerSearch && managerResults.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-6">
                  Không tìm thấy nhân viên nào
                </p>
              )}

              {!managerSearchLoading && !managerSearch && (
                <p className="text-center text-sm text-gray-400 py-6">
                  Nhập tên hoặc mã nhân viên để tìm kiếm
                </p>
              )}

              {managerResults.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleSelectManager(emp)}
                  disabled={managerSaving}
                  className="w-full text-left border border-gray-200 rounded-lg p-4 hover:bg-indigo-50 hover:border-indigo-300 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{emp.full_name}</p>
                      <p className="text-sm text-gray-500">
                        Mã NV: {emp.employee_id}
                        {emp.position?.title ? ` · ${emp.position.title}` : ''}
                      </p>
                    </div>
                    <CheckIcon className="h-5 w-5 text-indigo-400 opacity-0 hover:opacity-100" />
                  </div>
                </button>
              ))}
            </div>

            {managerSaving && (
              <div className="px-6 py-3 border-t flex items-center justify-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2" />
                Đang lưu...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal xem tài liệu onboarding */}
      {viewingDoc && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewingDoc(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{viewingDoc.document_name}</h3>
                {viewingDoc.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{viewingDoc.description}</p>
                )}
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden bg-gray-100">
              {viewingDoc.file_url || viewingDoc.file ? (
                <iframe
                  src={viewingDoc.file_url || viewingDoc.file}
                  className="w-full h-full border-0"
                  title={viewingDoc.document_name}
                  onLoad={() => {
                    // Fallback: timer 10s đảm bảo user có đủ thời gian xem
                    setTimeout(() => setDocReadable(true), 10000);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Không có file đính kèm
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                {viewingDoc.is_read
                  ? '✓ Bạn đã đọc tài liệu này'
                  : docReadable
                  ? '✓ Có thể xác nhận đã đọc'
                  : '⏳ Vui lòng đọc hết tài liệu (tối thiểu 10 giây)...'}
              </p>
              {!viewingDoc.is_read && (
                <button
                  disabled={!docReadable || markingReadId === viewingDoc.id}
                  onClick={async () => {
                    if (!viewingDoc) return;
                    setMarkingReadId(viewingDoc.id);
                    try {
                      await onboardingService.markDocumentAsRead(viewingDoc.id);
                      const updated = await onboardingService.myOnboarding();
                      setOnboarding(updated);
                      setViewingDoc(null);
                    } catch (err: any) {
                      console.error('Failed to mark document as read:', err);
                    } finally {
                      setMarkingReadId(null);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  {markingReadId === viewingDoc.id ? 'Đang lưu...' : 'Đánh dấu đã đọc'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
