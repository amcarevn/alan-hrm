import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function LavianCallback() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const access  = searchParams.get('access');
    const refresh = searchParams.get('refresh');

    if (!access || !refresh) {
      setError('Thông tin xác thực không hợp lệ. Đang chuyển về trang đăng nhập...');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
      return;
    }

    localStorage.removeItem('myrequests_seen_approved_ids');
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    window.location.href = '/dashboard';
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">Đang đăng nhập...</p>
      </div>
    </div>
  );
}
