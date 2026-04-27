import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Chatbot } from '../utils/api';

const Publish: React.FC = () => {
  const [searchParams] = useSearchParams();
  const apiKey = searchParams.get('api_key');
  const type = searchParams.get('type'); // Get the type parameter for webview mode
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if we're in webview mode
  const isWebviewMode = type === 'webview';

  useEffect(() => {
    if (!apiKey) {
      setError('API key là bắt buộc');
      setLoading(false);
      return;
    }

    validateApiKey();
  }, [apiKey]);

  const validateApiKey = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call the validation endpoint
      const response = await fetch(
        `${import.meta.env.VITE_MANAGEMENT_API_URL || 'https://cbbackend.runagent.io'}/api/v1/publish/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ apiKey }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API key không hợp lệ');
      }

      if (!data.success) {
        throw new Error(data.message || 'Xác thực thất bại');
      }

      setChatbot(data.data.chatbot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi xác thực API key');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          {/* Simple Loading Animation */}
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>

          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Kết nối với trợ lý AI
          </h2>
          <p className="text-gray-600">Đang xác thực quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Error Icon */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Quyền truy cập bị từ chối
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
          </div>

          {/* Error Details Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <svg
                className="w-5 h-5 text-red-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Khắc phục sự cố
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Kiểm tra xem API key của bạn có hợp lệ và không hết hạn
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Đảm bảo trợ lý AI đang hoạt động và có thể truy cập
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Liên hệ quản trị viên nếu vấn đề vẫn tiếp diễn
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Thử lại
            </button>
            <button
              onClick={() => window.history.back()}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Không tìm thấy trợ lý AI
          </h2>
          <p className="text-gray-600">
            Trợ lý AI được yêu cầu không khả dụng hoặc đã bị xóa.
          </p>
        </div>
      </div>
    );
  }

  // If webview mode, return minimal layout
  if (isWebviewMode) {
    return (
      <div className="h-screen bg-white overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Chat Interface
          </h3>
          <p className="text-gray-600 max-w-md">
            The chat interface has been removed. This feature is no longer available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Trợ lý AI</h1>
                <p className="text-sm text-gray-500">Cung cấp ALAN</p>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Kết nối</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="h-[600px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Chat Interface
              </h3>
              <p className="text-gray-600 max-w-md">
                The chat interface has been removed. This feature is no longer available.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Footer */}
      <div className="mt-8 text-center pb-6">
        <p className="text-sm text-gray-500">
          © 2024 Trợ lý AI. An toàn • Nhanh • Thông minh
        </p>
      </div>
    </div>
  );
};

export default Publish;
