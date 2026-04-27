export default function Footer() {
  return (
    <footer className="bg-[#0F172A] border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
               <div className="h-9 w-9 rounded-lg bg-ruby-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-ruby-primary/20">
                <span className="text-white font-black text-sm tracking-tight">ALAN</span>
              </div>
              <div>
                <div className="text-white font-bold text-sm leading-tight uppercase tracking-wide">ALAN Beauty Medical Clinic</div>
                <div className="text-ruby-accent text-[10px] uppercase font-semibold tracking-widest opacity-70">Hệ thống Quản trị Nội bộ</div>
              </div>
            </div>
            <p className="text-sm leading-6 text-gray-400">
              Hệ thống Quản lý Hành chính Nhân sự nội bộ của ALAN Beauty Medical Clinic —
              tối ưu hóa quy trình chấm công, tính lương và quản trị tài sản tập trung.
            </p>
          </div>

          {/* Links */}
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">Hệ thống</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <a
                      href="#"
                      className="text-sm leading-6 text-ruby-accent/60 hover:text-ruby-primary transition-all duration-300"
                    >
                      Các phân hệ
                    </a>
                  </li>
                  <li>
                    <a
                      href="#demo"
                      className="text-sm leading-6 text-ruby-accent/60 hover:text-ruby-primary transition-all duration-300"
                    >
                      Demo giao diện
                    </a>
                  </li>
                  <li>
                    <a
                      href="/login"
                      className="text-sm leading-6 text-ruby-accent/60 hover:text-ruby-primary transition-all duration-300"
                    >
                      Đăng nhập
                    </a>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">Hỗ trợ</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <a
                      href="#"
                      className="text-sm leading-6 text-ruby-accent/60 hover:text-ruby-primary transition-all duration-300"
                    >
                      Hướng dẫn sử dụng
                    </a>
                  </li>
                  <li>
                    <a
                      href="mailto:it@trunganhgroup.vn"
                      className="text-sm leading-6 text-ruby-accent/60 hover:text-ruby-primary transition-all duration-300"
                    >
                      Liên hệ phòng IT
                    </a>
                  </li>
                  <li>
                    <a
                      href="/login"
                      className="text-sm leading-6 text-ruby-accent/60 hover:text-ruby-primary transition-all duration-300"
                    >
                      Quên mật khẩu
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-white/5 pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-gray-500 text-center tracking-wide">
            &copy; 2026 ALAN Beauty Medical Clinic. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
