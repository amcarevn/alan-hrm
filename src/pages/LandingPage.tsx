import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, animate, useInView, type Variants } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { publicStatsAPI } from '@/utils/api';
import {
  UserGroupIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ComputerDesktopIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: i * 0.1 },
  }),
};

const fadeRight: Variants = {
  hidden: { opacity: 0, x: 48 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.75, ease: [0.25, 0.1, 0.25, 1], delay: 0.4 },
  },
};

const moduleItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, delay: 0.8 + i * 0.08 },
  }),
};

function CountUp({ to, suffix = '', duration = 2.8 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const el = ref.current;
    const controls = animate(0, to, {
      duration,
      ease: [0.25, 0.1, 0.25, 1],
      onUpdate(v) { el.textContent = Math.round(v) + suffix; },
    });
    return controls.stop;
  }, [inView, to, suffix, duration]);

  return <span ref={ref}>0{suffix}</span>;
}

const FALLBACK = { active: 0, departments: 0, monthlyLeave: 0 };

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const [cardStats, setCardStats] = useState(FALLBACK);

  useEffect(() => {
    publicStatsAPI.getStats()
      .then((res) => {
        setCardStats({
          active: res.active,
          departments: res.department_count,
          monthlyLeave: res.monthly_leave,
        });
      })
      .catch(() => { /* giữ fallback */ });
  }, []);

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="bg-white">

      {/* ── NAVBAR ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#111827]/90 backdrop-blur-md border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo-alan.png"
              alt="Alan HRM"
              className="h-10 w-auto max-w-[160px] rounded-lg object-contain"
            />
            <span className="text-blue-300 text-xs hidden sm:block">Hệ thống Quản lý Nhân sự</span>
          </div>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2 bg-ruby-primary text-white text-sm font-semibold rounded-lg hover:bg-ruby-hover transition-all duration-300 shadow-lg shadow-ruby-primary/20"
          >
            Đăng nhập
            <ArrowRightIcon className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative bg-[#0F172A] pt-16 overflow-hidden">
        {/* Gradient mesh background */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
              backgroundSize: '36px 36px',
            }}
          />
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-ruby-primary opacity-[0.12] blur-[120px]" />
          <div className="absolute top-1/2 right-1/3 w-80 h-80 rounded-full bg-ruby-accent opacity-[0.08] blur-[100px]" />
          <div className="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full bg-ruby-primary opacity-[0.1] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* ── Left: Text ── */}
            <div>
              <motion.div
                custom={0} variants={fadeUp} initial="hidden" animate="visible"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-7"
              >
                <span className="h-2 w-2 rounded-full bg-ruby-primary animate-pulse" />
                <span className="text-ruby-accent text-xs font-medium tracking-wider">
                  Hệ thống đang hoạt động bình thường</span>
              </motion.div>

              <motion.h1
                custom={1} variants={fadeUp} initial="hidden" animate="visible"
                className="text-6xl lg:text-8xl font-black text-white leading-[0.8] uppercase"
              >
                ALAN <br />
                <span className="block mt-[-5px] lg:mt-[-10px] text-3xl lg:text-5xl font-bold opacity-80 tracking-normal normal-case">Beauty Medical Clinic</span>
              </motion.h1>
              <motion.p
                custom={2} variants={fadeUp} initial="hidden" animate="visible"
                className="mt-3 text-xl lg:text-2xl font-medium text-ruby-accent/80"
              >
                Hệ thống Quản lý Hành chính Nhân sự
              </motion.p>
              <motion.p
                custom={3} variants={fadeUp} initial="hidden" animate="visible"
                className="mt-5 text-base lg:text-lg text-gray-400 leading-relaxed max-w-xl"
              >
                Nền tảng quản lý nhân sự, chấm công, tính lương và tài sản tập trung —
                vận hành toàn bộ hoạt động nhân sự của Alan Beauty Medical Clinic trên một hệ thống duy nhất.
              </motion.p>

              <motion.div
                custom={4} variants={fadeUp} initial="hidden" animate="visible"
                className="mt-10 flex flex-wrap gap-4"
              >
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-ruby-primary text-white text-base font-bold rounded-xl hover:bg-ruby-hover transition-all duration-300 shadow-xl shadow-ruby-primary/25 hover:scale-[1.02]"
                >
                  Bắt đầu ngay
                  <ArrowRightIcon className="h-5 w-5" />
                </a>
                <button
                  onClick={() => document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 text-white text-base font-bold rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
                >
                  Khám phá phân hệ
                </button>
              </motion.div>

              {/* Stats inline */}
              <motion.div
                custom={5} variants={fadeUp} initial="hidden" animate="visible"
                className="mt-12 flex flex-wrap gap-8"
              >
                {[
                  { to: 200, suffix: '+', label: 'Nhân viên', duration: 2.8 },
                  { to: cardStats.departments, suffix: '', label: 'Phòng ban', duration: 2.5 },
                  { to: 6, suffix: '', label: 'Phân hệ', duration: 2.0 },
                  { to: 2026, suffix: '', label: 'Năm vận hành', duration: 4.0 },
                ].map(({ to, suffix, label, duration }) => (
                  <div key={label}>
                    <div className="text-2xl font-extrabold text-white">
                      <CountUp to={to} suffix={suffix} duration={duration} />
                    </div>
                    <div className="text-xs text-blue-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* ── Right: Glass card ── */}
            <motion.div
              variants={fadeRight} initial="hidden" animate="visible"
              className="hidden lg:block"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl"
              >
                {/* Card header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-white font-semibold text-sm">Tổng quan Nhân sự</p>
                    <p className="text-blue-400 text-xs mt-0.5">Alan Beauty Medical Clinic · 2026</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    Live
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
                    <div className="text-4xl font-extrabold text-green-400 mb-1">
                      <CountUp to={cardStats.active} duration={2.8} />
                    </div>
                    <div className="text-blue-300 text-xs">Đang đi làm</div>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
                    <div className="text-4xl font-extrabold text-yellow-400 mb-1">
                      <CountUp to={cardStats.monthlyLeave} duration={2.5} />
                    </div>
                    <div className="text-blue-300 text-xs">Nghỉ phép tháng</div>
                  </div>
                </div>


                {/* Module status list */}
                <div className="space-y-0 divide-y divide-white/5">
                  {[
                    { name: 'Quản lý Nhân sự', status: 'Hoạt động' },
                    { name: 'Chấm công', status: 'Hoạt động' },
                    { name: 'Tính lương', status: 'Hoạt động' },
                    { name: 'Nghỉ phép & Tài sản', status: 'Hoạt động' },
                  ].map(({ name, status }, i) => (
                    <motion.div
                      key={name}
                      custom={i}
                      variants={moduleItem}
                      initial="hidden"
                      animate="visible"
                      className="flex items-center justify-between py-2.5"
                    >
                      <span className="text-blue-200 text-xs">{name}</span>
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                        {status}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Decorative corner glow */}
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-400 opacity-10 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-indigo-400 opacity-10 blur-2xl pointer-events-none" />
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── MODULES ── */}
      <section id="modules" className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ruby-light text-ruby-primary text-xs font-semibold mb-4">
              <BuildingOfficeIcon className="h-3.5 w-3.5" />
              Các phân hệ cốt lõi
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Toàn bộ nghiệp vụ nhân sự
              <span className="block text-ruby-primary mt-1">trong một nền tảng duy nhất</span>
            </h2>
            <p className="mt-4 text-gray-500 max-w-xl">
              Hệ thống HRM Alan Beauty Medical Clinic bao gồm đầy đủ các phân hệ — từ quản lý hồ sơ đến tính lương và báo cáo, được xây dựng theo đúng quy trình nội bộ.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: UserGroupIcon,
                color: 'bg-[#E0115F]',
                title: 'Quản lý Nhân sự',
                desc: 'Hồ sơ nhân viên, hợp đồng, chức vụ, phòng ban và lịch sử công tác.',
              },
              {
                icon: ClockIcon,
                color: 'bg-[#C11053]',
                title: 'Chấm công',
                desc: 'Theo dõi giờ vào — ra, ca làm việc, tăng ca và tính toán công thực tế.',
              },
              {
                icon: CurrencyDollarIcon,
                color: 'bg-[#A30F47]',
                title: 'Tính lương',
                desc: 'Tự động tính lương, phụ cấp, bảo hiểm, thuế TNCN và phiếu lương điện tử.',
              },
              {
                icon: CalendarIcon,
                color: 'bg-[#840D3B]',
                title: 'Nghỉ phép',
                desc: 'Quản lý đơn nghỉ phép, phê duyệt theo cấp và theo dõi số ngày phép còn lại.',
              },
              {
                icon: ComputerDesktopIcon,
                color: 'bg-[#660C2F]',
                title: 'Quản lý Tài sản',
                desc: 'Cấp phát, thu hồi và theo dõi bảo trì tài sản, thiết bị toàn công ty.',
              },
              {
                icon: ChartBarIcon,
                color: 'bg-[#480A23]',
                title: 'Báo cáo & Thống kê',
                desc: 'Dashboard tổng quan, báo cáo nhân sự chi tiết và phân tích theo phòng ban.',
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div
                key={title}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-ruby-primary/30 hover:shadow-xl hover:shadow-ruby-primary/5 transition-all duration-300 group"
              >
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${color} mb-4 shadow-lg shadow-black/5`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-ruby-primary transition-colors">
                  {title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="bg-[#0F172A] border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">
              Sẵn sàng trải nghiệm hệ thống?
            </h2>
            <p className="mt-2 text-ruby-accent text-sm opacity-80">
              Dành cho cán bộ nhân viên Alan Beauty Medical Clinic. Liên hệ quản trị viên nếu cần hỗ trợ.
            </p>
          </div>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-ruby-primary text-white font-bold rounded-xl hover:bg-ruby-hover transition-all duration-300 shadow-xl shadow-ruby-primary/20 flex-shrink-0"
          >
            Truy cập ngay
            <ArrowRightIcon className="h-5 w-5" />
          </a>
        </div>

        <div className="border-t border-white/5 bg-[#0B1120]">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/logo-alan.png"
                alt="Alan HRM"
                className="h-8 w-auto max-w-[130px] rounded-lg object-contain"
              />
              <span className="text-gray-500 text-xs hidden sm:block">Hệ thống Quản lý Nhân sự</span>
            </div>
            <span className="text-gray-600 text-xs tracking-wide">© 2026 Alan Beauty Medical Clinic. All rights reserved.</span>
          </div>
        </div>
      </section>

    </div>
  );
}
