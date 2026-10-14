// Proxy API về backend, chạy như Cloudflare Pages Function ngay trên domain của
// frontend. Nhờ vậy trình duyệt chỉ gọi `hr.elani.com.vn/_api/...` — cùng origin,
// không còn gọi chéo sang `alan-hrm.amcare.vn`.
//
// Vì sao phải có tiền tố riêng `/_api` thay vì proxy trong suốt theo tiền tố thật:
// frontend và API DÙNG CHUNG không gian đường dẫn. `/dashboard` vừa là route của
// SPA (`/dashboard/salary-management/payroll`) vừa là tiền tố API. Proxy thẳng
// `/dashboard/*` sẽ nuốt mất điều hướng của trang. `/_api` không đụng gì cả.
//
// Pages Function được ưu tiên hơn file tĩnh nên `/_api/*` không rơi vào catch-all
// trả `index.html` của SPA.

const BACKEND = 'https://alan-hrm.amcare.vn';

// Header chỉ có ý nghĩa với chặng kết nối cũ, không được mang sang chặng mới.
// `host` phải bỏ để fetch tự đặt theo BACKEND, nếu không backend nhận Host là
// hr.elani.com.vn và Django sẽ so với ALLOWED_HOSTS của nó.
const BO_HEADER = ['host', 'content-length', 'cf-connecting-ip', 'cf-ray', 'cf-visitor'];

export async function onRequest(context) {
  const { request } = context;
  const vao = new URL(request.url);

  // /_api/api-hrm/salary/... -> https://alan-hrm.amcare.vn/api-hrm/salary/...
  const duongDan = vao.pathname.replace(/^\/_api/, '') || '/';
  const dich = new URL(duongDan + vao.search, BACKEND);

  const headers = new Headers(request.headers);
  BO_HEADER.forEach((h) => headers.delete(h));

  const coThan = request.method !== 'GET' && request.method !== 'HEAD';
  const res = await fetch(dich.toString(), {
    method: request.method,
    headers,
    body: coThan ? request.body : undefined,
    // Tự đi theo redirect sẽ biến POST thành GET (Django APPEND_SLASH trả 301),
    // mất luôn thân request. Bắt tay chuyển hướng ở đây rồi viết lại Location.
    redirect: 'manual',
  });

  const location = res.headers.get('location');
  if (!location) return res;

  const raHeaders = new Headers(res.headers);
  try {
    const l = new URL(location, BACKEND);
    // Chuyển hướng về chính backend thì viết lại cho nằm trong /_api, để trình
    // duyệt không bao giờ nhìn thấy tên miền thật. Trỏ đi nơi khác thì giữ nguyên.
    if (l.origin === new URL(BACKEND).origin) {
      raHeaders.set('location', '/_api' + l.pathname + l.search);
    }
  } catch {
    // Location không phải URL hợp lệ — trả nguyên trạng, không đoán thêm.
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: raHeaders,
  });
}
