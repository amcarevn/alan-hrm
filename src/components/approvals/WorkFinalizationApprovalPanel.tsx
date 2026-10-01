import React from 'react';

/**
 * Khối "Phê duyệt chốt công nhân viên" (bảng công tháng theo phòng ban chờ
 * duyệt) của trang Phê duyệt — tách nguyên khối ra khỏi
 * src/pages/Approvals.tsx (port từ TA, yêu cầu HCNS "tách nhỏ trang phê
 * duyệt cho dễ nhìn, đừng bỏ gì cả"): JSX bên dưới giữ NGUYÊN VĂN bản Alan,
 * mọi state/hàm của trang cha nhận qua props nên hành vi không đổi.
 *
 * Kiểu `any` cho props là cố ý: các giá trị này vốn đã là `any` ở trang cha
 * (dữ liệu đơn từ backend không có type chung).
 */
interface WorkFinalizationApprovalPanelProps {
  activeTab: string;
  loading: boolean;
  showWorkFinalizationPanel: boolean;
  isAdmin: any;
  isManagement: any;
  workFinalizationApprovals: any[];
  openApproveModal: (item: any) => void;
  openRejectModal: (item: any) => void;
  handleViewDetails: (item: any) => void;
  handleViewOnlineWorkDetails: (item: any) => void;
  handleViewWfDetails: (item: any) => void;
  formatDateTime: (dateString: string) => string;
  getDayOfWeek: (dateString: string) => string;
}

const WorkFinalizationApprovalPanel: React.FC<WorkFinalizationApprovalPanelProps> = ({
  activeTab,
  loading,
  showWorkFinalizationPanel,
  isAdmin,
  isManagement,
  workFinalizationApprovals,
  openApproveModal,
  openRejectModal,
  handleViewDetails,
  handleViewOnlineWorkDetails,
  handleViewWfDetails,
  formatDateTime,
  getDayOfWeek,
}) => {
  return (
    <>
        {activeTab === 'pending' && !loading && showWorkFinalizationPanel && (
          <div className="mt-8 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 bg-white p-3 sm:p-4 md:p-5 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 bg-gradient-to-br from-primary-500 to-violet-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary-100">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800">Phê duyệt chốt công nhân viên</h1>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-0.5">
                    <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-rose-500 animate-ping"></span>
                    <p className="text-xs sm:text-sm text-gray-400 font-bold">Ưu tiên xử lý các đơn này</p>
                  </div>
                </div>
              </div>

              {(() => {
                const count = workFinalizationApprovals.length;
                return (
                  <div className="flex items-center gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 mt-1 sm:mt-0 justify-end">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-gray-400">Số lượng phòng</div>
                      <div className="text-3xl font-semibold text-primary-600 leading-none mt-1">{count}</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg shadow-slate-200/40">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest border-r border-gray-100/50">STT</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest">Mã NV/Phòng</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest">Nhân viên / Đơn vị</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest">Số công / Chi tiết</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest">Thời gian gửi</th>
                      <th className="px-6 py-5 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest bg-primary-50/30">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {(() => {
                      if (workFinalizationApprovals.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="px-6 py-20 text-center bg-gray-50/20">
                              <div className="flex flex-col items-center max-w-sm mx-auto">
                                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-6 shadow-sm">
                                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h4 className="text-lg font-semibold text-gray-800">Hoàn thành tuyệt vời!</h4>
                                <p className="text-gray-400 text-base mt-2 font-medium">Bạn đã xử lý hết tất cả các đơn thuộc quyền hạn của mình.</p>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return workFinalizationApprovals.map((item, index) => (
                        <tr key={`manager-row-${item.id}`} className="hover:bg-primary-50/20 transition-all duration-300 group cursor-pointer" onClick={() => {
                          if (item._itemType === 'WORK_FINALIZATION') {
                            handleViewWfDetails(item);
                            return;
                          }
                          (item._itemType === 'ONLINE_WORK' || item._itemType === 'REGISTRATION' || item._itemType === 'OVERTIME') ? handleViewOnlineWorkDetails(item) : handleViewDetails(item);
                        }}>
                          <td className="px-6 py-5 whitespace-nowrap text-base font-semibold text-gray-300 border-r border-gray-50">
                            {(index + 1).toString().padStart(2, '0')}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold border border-gray-200 group-hover:bg-white group-hover:shadow-sm transition-all duration-300">
                              {item.department_code}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold shadow-md shadow-primary-100">
                                {item.department_name?.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-base font-semibold text-gray-800 group-hover:text-primary-600 transition-colors">{item.department_name || item.department_code}</span>
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-tight">Chốt công tháng {item.month}/{item.year}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-base font-semibold text-gray-800`}>
                                  Xem chi tiết ↗
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-400 italic">Người gửi: {item.sent_by_name} ({item.sent_by_role || 'Admin'})</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-base font-semibold text-gray-700">
                              {formatDateTime(item.created_at)}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-center bg-primary-50/5 group-hover:bg-primary-50/10 transition-all border-l border-gray-50" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center min-h-[50px]">
                              {/* PHẦN HIỂN THỊ DÀNH CHO QUẢN LÝ (KHI CÓ QUYỀN DUYỆT) */}
                              {item.status === 'PENDING' && isManagement && !isAdmin ? (
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => openApproveModal(item)}
                                    className="group h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-100 transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap uppercase tracking-widest flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    PHÊ DUYỆT
                                  </button>
                                  <button
                                    onClick={() => openRejectModal(item)}
                                    className="h-10 px-6 bg-white hover:bg-rose-50 text-rose-500 text-xs font-semibold rounded-lg border border-gray-200 hover:border-rose-200 transition-all uppercase tracking-widest flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                    TỪ CHỐI
                                  </button>
                                </div>
                              ) : (
                                /* PHẦN HIỂN THỊ DÀNH CHO ADMIN (HOẶC KHI ĐÃ DUYỆT XONG) */
                                <div className="flex flex-col items-center">
                                  {item.status === 'APPROVED' ? (
                                    <div className="flex items-center gap-3 px-5 py-2.5 bg-emerald-50 border border-emerald-100 rounded-lg shadow-sm">
                                      <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm shadow-emerald-100">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                      </div>
                                      <span className="text-emerald-700 font-semibold text-xs uppercase tracking-widest">QLTT ĐÃ PHÊ DUYỆT</span>
                                    </div>
                                  ) : item.status === 'REJECTED' ? (
                                    <div className="flex items-center gap-3 px-5 py-2.5 bg-rose-50 border border-rose-100 rounded-lg shadow-sm">
                                      <div className="w-7 h-7 bg-rose-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm shadow-rose-100">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" /></svg>
                                      </div>
                                      <span className="text-rose-700 font-semibold text-xs uppercase tracking-widest">QLTT ĐÃ TỪ CHỐI</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3 px-5 py-2.5 bg-amber-50 border border-amber-100 rounded-lg shadow-sm">
                                      <div className="w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center text-white shrink-0 animate-pulse shadow-sm shadow-amber-100">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                      </div>
                                      <span className="text-amber-700 font-semibold text-xs uppercase tracking-widest">ĐANG CHỜ QLTT DUYỆT</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View for Manager Table */}
              <div className="lg:hidden divide-y divide-gray-100">
                {workFinalizationApprovals.length === 0 ? (
                  <div className="px-6 py-16 text-center bg-gray-50/20">
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <h4 className="text-base font-semibold text-gray-800 uppercase tracking-tight">Tất cả đã xử lý!</h4>
                    </div>
                  </div>
                ) : (
                  workFinalizationApprovals.map((item) => (
                    <div
                      key={`manager-card-${item.id}`}
                      onClick={() => {
                        if (item._itemType === 'WORK_FINALIZATION') {
                          handleViewWfDetails(item);
                          return;
                        }
                        (item._itemType === 'ONLINE_WORK' || item._itemType === 'REGISTRATION' || item._itemType === 'OVERTIME') ? handleViewOnlineWorkDetails(item) : handleViewDetails(item);
                      }}
                      className="p-5 bg-white active:bg-gray-50 transition-all border-b border-gray-50"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-primary-100">
                            {item.department_name?.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-tight">{item.department_name || item.department_code}</h4>
                            <p className="text-xs font-bold text-primary-500 uppercase tracking-[0.1em]">Chốt công : {item.month}/{item.year}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-gray-300 uppercase tracking-widest">Thời gian gửi</div>
                          <div className="text-xs font-semibold text-gray-500">
                            {getDayOfWeek(item.created_at)}, {formatDateTime(item.created_at).split(' ')[0]}
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-100 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Trạng thái hiện tại:</span>
                          {item.status === 'APPROVED' ? (
                            <span className="text-xs font-semibold text-emerald-600 uppercase">Đã phê duyệt</span>
                          ) : item.status === 'REJECTED' ? (
                            <span className="text-xs font-semibold text-rose-600 uppercase">Đã từ chối</span>
                          ) : (
                            <span className="text-xs font-semibold text-amber-600 uppercase animate-pulse">Đang chờ xử lý</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 italic font-medium">Người gửi: {item.sent_by_name}</p>
                      </div>

                      {item.status === 'PENDING' && isManagement && !isAdmin && (
                        <div className="flex gap-3 mt-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => openApproveModal(item)}
                            className="flex-1 py-3.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold uppercase tracking-widest shadow-lg shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            PHÊ DUYỆT
                          </button>
                          <button
                            onClick={() => openRejectModal(item)}
                            className="flex-1 py-3.5 bg-white border border-rose-100 text-rose-500 rounded-lg text-xs font-semibold uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            TỪ CHỐI
                          </button>
                        </div>
                      )}

                      <button className="w-full mt-3 py-3 bg-gray-900 text-white rounded-lg text-xs font-semibold uppercase tracking-wide">
                        XEM CHI TIẾT BẢNG CÔNG
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
    </>
  );
};

export default WorkFinalizationApprovalPanel;
