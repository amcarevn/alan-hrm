import React, { useState, useEffect } from 'react';
import { managementApi } from '../utils/api';
import {
  DocumentTextIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  XMarkIcon,
  TrashIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import ContractPlaceholderModal from './ContractPlaceholderModal';

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  PROBATION: 'Hợp đồng thử việc',
  INTERN: 'Hợp đồng thực tập sinh',
  COLLABORATOR: 'Hợp đồng cộng tác viên',
  ONE_YEAR: 'Hợp đồng lao động 12 tháng',
  TWO_YEAR: 'Hợp đồng lao động 24 tháng',
  INDEFINITE: 'Hợp đồng vô thời hạn',
  SERVICE: 'Hợp đồng dịch vụ',
  CONFIDENTIALITY: 'Thoả thuận bảo mật',
  COMPANY_RULES: 'Cam kết đọc hiểu nội quy công ty',
  NURSING_COMMITMENT: 'Cam kết của CBNV Điều dưỡng',
};

const CONTRACT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Bản nháp', color: 'bg-gray-100 text-gray-700' },
  PENDING_SIGN: { label: 'Chờ ký', color: 'bg-yellow-100 text-yellow-700' },
  SIGNED: { label: 'Đã ký', color: 'bg-green-100 text-green-700' },
  EXPIRED: { label: 'Hết hạn', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-gray-100 text-gray-500' },
};

type ContractTemplate = {
  id: number;
  name: string;
  contract_type: string;
  contract_type_display: string;
  status?: string;
};

type EmployeeContract = {
  id: number;
  contract_type: string;
  contract_type_display: string;
  status: string;
  status_display: string;
  template: number | null;
  template_name: string | null;
  generated_file: string | null;
  generated_file_url?: string | null;
  signed_file: string | null;
  signed_file_url?: string | null;
  employee_signed_at: string | null;
  hr_signed_at: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string;
  is_expiring_soon: boolean;
  created_at: string;
};

type Props = {
  onboardingId: number;
  employeeId: number | null;
  employeeProfile?: Record<string, any>;
};

const ContractSection: React.FC<Props> = ({ onboardingId, employeeId, employeeProfile }) => {
  const [contracts, setContracts] = useState<EmployeeContract[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [markingSigned, setMarkingSigned] = useState<number | null>(null);
  const [placeholderModal, setPlaceholderModal] = useState<number | null>(null);

  const [newContract, setNewContract] = useState({
    contract_type: 'PROBATION',
    template: '',
    start_date: '',
    end_date: '',
    notes: '',
    branch: 'AC',
  });

  const fetchContracts = async () => {
    try {
      const { data } = await managementApi.get('/api-hrm/employee-contracts/', {
        params: { onboarding_id: onboardingId }
      });
      setContracts(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      console.error('Error fetching contracts:', e);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data } = await managementApi.get('/api-hrm/contract-templates/', {
        params: { status: 'ACTIVE' }
      });
      setTemplates(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      console.error('Error fetching templates:', e);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchContracts(), fetchTemplates()]).finally(() => setLoading(false));
  }, [onboardingId]);

  const handleAddContract = async () => {
    if (!employeeId) return alert('Chưa có hồ sơ nhân viên');
    try {
      await managementApi.post('/api-hrm/employee-contracts/', {
        onboarding_process: onboardingId,
        employee: employeeId,
        contract_type: newContract.contract_type,
        template: newContract.template || null,
        start_date: newContract.start_date || null,
        end_date: newContract.end_date || null,
        notes: newContract.notes,
        branch: newContract.branch,
      });
      await fetchContracts();
      setShowAddModal(false);
      setNewContract({ contract_type: 'PROBATION', template: '', start_date: '', end_date: '', notes: '', branch: 'AC' });
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Lỗi tạo hợp đồng');
    }
  };

  const handleDelete = async (contractId: number) => {
    if (!confirm('Bạn có chắc muốn xóa hợp đồng này?')) return;
    setDeleting(contractId);
    try {
      await managementApi.delete(`/api-hrm/employee-contracts/${contractId}/`);
      await fetchContracts();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Xóa thất bại');
    } finally {
      setDeleting(null);
    }
  };

  const handleMarkSigned = async (contractId: number) => {
    if (!confirm('Xác nhận đánh dấu hợp đồng này là đã ký?')) return;
    setMarkingSigned(contractId);
    try {
      await managementApi.patch(`/api-hrm/employee-contracts/${contractId}/`, {
        status: 'SIGNED',
        hr_signed_at: new Date().toISOString()
      });
      await fetchContracts();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Cập nhật thất bại');
    } finally {
      setMarkingSigned(null);
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Đang tải...</div>;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Hợp đồng ({contracts.length})
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <PlusIcon className="w-4 h-4" />
          Thêm hợp đồng
        </button>
      </div>

      {/* Contract List */}
      {contracts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Chưa có hợp đồng nào</p>
          <p className="text-gray-400 text-sm mt-1">Nhấn "Thêm hợp đồng" để tạo hợp đồng mới</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map(contract => (
            <div key={contract.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">
                      {CONTRACT_TYPE_LABELS[contract.contract_type] || contract.contract_type_display}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONTRACT_STATUS_CONFIG[contract.status]?.color}`}>
                      {CONTRACT_STATUS_CONFIG[contract.status]?.label || contract.status}
                    </span>
                    {contract.is_expiring_soon && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        ⚠️ Sắp hết hạn
                      </span>
                    )}
                  </div>
                  {contract.template_name && (
                    <p className="text-sm text-gray-500">Template: {contract.template_name}</p>
                  )}
                  <div className="flex gap-4 mt-1 text-sm text-gray-500">
                    {contract.start_date && <span>Từ: {contract.start_date}</span>}
                    {contract.end_date && <span>Đến: {contract.end_date}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap justify-end">

                  {/* Tạo PDF — mở modal placeholder thay vì generate trực tiếp */}
                  {contract.template && !contract.generated_file && (
                    <button
                      onClick={() => setPlaceholderModal(contract.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 text-sm"
                    >
                      📄 Tạo PDF
                    </button>
                  )}

                  {/* Xem file đã tạo */}
                  {contract.generated_file && (
                    <a
                      href={contract.generated_file_url || contract.generated_file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 text-sm"
                    >
                      <EyeIcon className="w-4 h-4" /> Xem
                    </a>
                  )}

                  {/* Tạo lại — cũng mở modal placeholder */}
                  {contract.template && contract.generated_file && (
                    <button
                      onClick={() => setPlaceholderModal(contract.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-md hover:bg-orange-100 text-sm"
                    >
                      🔄 Tạo lại
                    </button>
                  )}

                  {contract.status !== 'SIGNED' && contract.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleMarkSigned(contract.id)}
                      disabled={markingSigned === contract.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 text-sm disabled:opacity-50"
                    >
                      <CheckBadgeIcon className="w-4 h-4" />
                      {markingSigned === contract.id ? '...' : 'Đã ký'}
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(contract.id)}
                    disabled={deleting === contract.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 text-sm disabled:opacity-50"
                  >
                    <TrashIcon className="w-4 h-4" />
                    {deleting === contract.id ? '...' : 'Xóa'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Contract Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Thêm hợp đồng mới</h3>
              <button onClick={() => setShowAddModal(false)}>
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại hợp đồng *</label>
                <select
                  value={newContract.contract_type}
                  onChange={e => setNewContract({ ...newContract, contract_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh *</label>
                <select
                  value={newContract.branch}
                  onChange={e => setNewContract({ ...newContract, branch: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="AC">Amcare (AC)</option>
                  <option value="HM">Homie (HM)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template hợp đồng</label>
                <select
                  value={newContract.template}
                  onChange={e => setNewContract({ ...newContract, template: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">-- Không dùng template --</option>
                  {templates
                    .filter(t => !t.status || t.status === 'ACTIVE')
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.contract_type_display})</option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={newContract.start_date}
                    onChange={e => setNewContract({ ...newContract, start_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={newContract.end_date}
                    onChange={e => setNewContract({ ...newContract, end_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={newContract.notes}
                  onChange={e => setNewContract({ ...newContract, notes: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleAddContract}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Tạo hợp đồng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder Modal — hiện khi bấm Tạo PDF hoặc Tạo lại */}
      {placeholderModal !== null && (
        <ContractPlaceholderModal
          contractId={placeholderModal}
          onClose={() => setPlaceholderModal(null)}
          onSuccess={(fileUrl) => {
            window.open(fileUrl, '_blank');
            setPlaceholderModal(null);
            fetchContracts();
          }}
        />
      )}

    </div>
  );
};

export default ContractSection;