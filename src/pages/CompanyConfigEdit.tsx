import React, { useState, useEffect } from 'react';
import { companyConfigAPI, CompanyConfig } from '../utils/api';
import { useNavigate, useParams } from 'react-router-dom';

const CompanyConfigEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<CompanyConfig>>({
    code: '',
    name: '',
    description: '',
    default_working_hours_per_day: 8,
    default_working_days_per_week: 5,
    overtime_multiplier_weekday: 1.5,
    overtime_multiplier_weekend: 2.0,
    overtime_multiplier_holiday: 3.0,
    late_threshold_minutes: 15,
    early_leave_threshold_minutes: 15,
    half_day_threshold_hours: 4,
    annual_leave_days_per_year: 12,
    sick_leave_days_per_year: 12,
    maternity_leave_days: 180,
    paternity_leave_days: 14,
    max_explanation_count_per_month: 3,
    supplement_work_hours_per_month: 10.0,
    is_active: true,
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
  });

  useEffect(() => {
    if (id) {
      loadCompanyConfig();
    }
  }, [id]);

  const loadCompanyConfig = async () => {
    try {
      setLoadingData(true);
      const config = await companyConfigAPI.getCompanyConfigById(parseInt(id!));
      
      setFormData({
        code: config.code,
        name: config.name,
        description: config.description || '',
        default_working_hours_per_day: config.default_working_hours_per_day,
        default_working_days_per_week: config.default_working_days_per_week,
        overtime_multiplier_weekday: config.overtime_multiplier_weekday,
        overtime_multiplier_weekend: config.overtime_multiplier_weekend,
        overtime_multiplier_holiday: config.overtime_multiplier_holiday,
        late_threshold_minutes: config.late_threshold_minutes,
        early_leave_threshold_minutes: config.early_leave_threshold_minutes,
        half_day_threshold_hours: config.half_day_threshold_hours,
        annual_leave_days_per_year: config.annual_leave_days_per_year,
        sick_leave_days_per_year: config.sick_leave_days_per_year,
        maternity_leave_days: config.maternity_leave_days,
        paternity_leave_days: config.paternity_leave_days,
        max_explanation_count_per_month: config.max_explanation_count_per_month,
        supplement_work_hours_per_month: config.supplement_work_hours_per_month,
        is_active: config.is_active,
        effective_from: config.effective_from.split('T')[0],
        effective_to: config.effective_to ? config.effective_to.split('T')[0] : '',
      });
    } catch (err: any) {
      console.error('Failed to load company config:', err);
      setError('Không thể tải thông tin cấu hình công ty');
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? '' : Number(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name || !formData.effective_from) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc (Mã, Tên, Ngày hiệu lực)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const configData: Partial<CompanyConfig> = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        default_working_hours_per_day: Number(formData.default_working_hours_per_day) || 8,
        default_working_days_per_week: Number(formData.default_working_days_per_week) || 5,
        overtime_multiplier_weekday: Number(formData.overtime_multiplier_weekday) || 1.5,
        overtime_multiplier_weekend: Number(formData.overtime_multiplier_weekend) || 2.0,
        overtime_multiplier_holiday: Number(formData.overtime_multiplier_holiday) || 3.0,
        late_threshold_minutes: Number(formData.late_threshold_minutes) || 15,
        early_leave_threshold_minutes: Number(formData.early_leave_threshold_minutes) || 15,
        half_day_threshold_hours: Number(formData.half_day_threshold_hours) || 4,
        annual_leave_days_per_year: Number(formData.annual_leave_days_per_year) || 12,
        sick_leave_days_per_year: Number(formData.sick_leave_days_per_year) || 12,
        maternity_leave_days: Number(formData.maternity_leave_days) || 180,
        paternity_leave_days: Number(formData.paternity_leave_days) || 14,
        max_explanation_count_per_month: Number(formData.max_explanation_count_per_month) || 3,
        supplement_work_hours_per_month: Number(formData.supplement_work_hours_per_month) || 10.0,
        is_active: formData.is_active !== false,
        effective_from: formData.effective_from,
        effective_to: formData.effective_to || undefined,
      };

      await companyConfigAPI.updateCompanyConfig(parseInt(id!), configData);
      
      setSuccess('Cập nhật cấu hình công ty thành công!');
      
      setTimeout(() => {
        navigate('/dashboard/company-configs');
      }, 2000);
    } catch (err: any) {
      console.error('Failed to update company config:', err);
      setError(err.response?.data?.message || err.message || 'Lỗi khi cập nhật cấu hình công ty');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard/company-configs')}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mb-4"
        >
          ← Quay lại
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa cấu hình công ty</h1>
        <p className="text-gray-600 mt-2">Cập nhật cấu hình giờ làm việc, ngày nghỉ lễ và các chính sách công ty</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã cấu hình *
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="CONFIG_2024"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên cấu hình *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Cấu hình công ty 2024"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Mô tả về cấu hình công ty..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giờ làm việc/ngày *
              </label>
              <input
                type="number"
                name="default_working_hours_per_day"
                value={formData.default_working_hours_per_day}
                onChange={handleInputChange}
                min="1"
                max="24"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày làm việc/tuần *
              </label>
              <input
                type="number"
                name="default_working_days_per_week"
                value={formData.default_working_days_per_week}
                onChange={handleInputChange}
                min="1"
                max="7"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hệ số OT ngày thường *
              </label>
              <input
                type="number"
                name="overtime_multiplier_weekday"
                value={formData.overtime_multiplier_weekday}
                onChange={handleInputChange}
                min="1"
                max="10"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hệ số OT cuối tuần *
              </label>
              <input
                type="number"
                name="overtime_multiplier_weekend"
                value={formData.overtime_multiplier_weekend}
                onChange={handleInputChange}
                min="1"
                max="10"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hệ số OT ngày lễ *
              </label>
              <input
                type="number"
                name="overtime_multiplier_holiday"
                value={formData.overtime_multiplier_holiday}
                onChange={handleInputChange}
                min="1"
                max="10"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngưỡng trễ (phút) *
              </label>
              <input
                type="number"
                name="late_threshold_minutes"
                value={formData.late_threshold_minutes}
                onChange={handleInputChange}
                min="0"
                max="240"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngưỡng về sớm (phút) *
              </label>
              <input
                type="number"
                name="early_leave_threshold_minutes"
                value={formData.early_leave_threshold_minutes}
                onChange={handleInputChange}
                min="0"
                max="240"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngưỡng nửa ngày (giờ) *
              </label>
              <input
                type="number"
                name="half_day_threshold_hours"
                value={formData.half_day_threshold_hours}
                onChange={handleInputChange}
                min="0"
                max="12"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày nghỉ phép/năm *
              </label>
              <input
                type="number"
                name="annual_leave_days_per_year"
                value={formData.annual_leave_days_per_year}
                onChange={handleInputChange}
                min="0"
                max="365"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày nghỉ ốm/năm *
              </label>
              <input
                type="number"
                name="sick_leave_days_per_year"
                value={formData.sick_leave_days_per_year}
                onChange={handleInputChange}
                min="0"
                max="365"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày nghỉ thai sản *
              </label>
              <input
                type="number"
                name="maternity_leave_days"
                value={formData.maternity_leave_days}
                onChange={handleInputChange}
                min="0"
                max="365"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày nghỉ thai sản chồng *
              </label>
              <input
                type="number"
                name="paternity_leave_days"
                value={formData.paternity_leave_days}
                onChange={handleInputChange}
                min="0"
                max="365"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số lần giải trình tối đa/tháng *
              </label>
              <input
                type="number"
                name="max_explanation_count_per_month"
                value={formData.max_explanation_count_per_month}
                onChange={handleInputChange}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số giờ bổ sung công tối đa/tháng *
              </label>
              <input
                type="number"
                name="supplement_work_hours_per_month"
                value={formData.supplement_work_hours_per_month}
                onChange={handleInputChange}
                min="0"
                max="200"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày hiệu lực từ *
              </label>
              <input
                type="date"
                name="effective_from"
                value={formData.effective_from}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày hiệu lực đến
              </label>
              <input
                type="date"
                name="effective_to"
                value={formData.effective_to}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                checked={formData.is_active !== false}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Kích hoạt
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/dashboard/company-configs')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Đang cập nhật...' : 'Cập nhật cấu hình'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyConfigEdit;
