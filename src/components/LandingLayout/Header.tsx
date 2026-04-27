import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bars3Icon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-[#111827] border-b border-white/5">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8 h-16"
        aria-label="Global"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <span className="sr-only">ALAN Beauty Medical Clinic</span>
          <div className="h-9 w-9 rounded-lg bg-ruby-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-ruby-primary/20">
            <span className="text-white font-black text-sm tracking-tight">ALAN</span>
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight uppercase tracking-wide">ALAN Beauty Medical Clinic</div>
            <div className="text-ruby-accent text-[10px] uppercase font-semibold tracking-widest opacity-80">Hệ thống Quản trị Nội bộ</div>
          </div>
        </Link>

        {/* Mobile hamburger */}
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-white"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Mở menu</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Desktop: Đăng nhập */}
        <div className="hidden lg:flex">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-2 bg-ruby-primary text-white text-sm font-bold rounded-lg hover:bg-ruby-hover transition-all duration-300 shadow-lg shadow-ruby-primary/20 hover:scale-[1.02]"
          >
            Đăng nhập
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-[#111827] px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-white/10">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                <span className="sr-only">ALAN Beauty Medical Clinic</span>
                <div className="h-9 w-9 rounded-lg bg-ruby-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-sm tracking-tight">ALAN</span>
                </div>
                <div className="text-white font-bold text-sm">ALAN BEAUTY</div>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-400"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Đóng menu</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-10">
              <Link
                to="/login"
                className="block w-full text-center px-5 py-4 bg-ruby-primary text-white text-sm font-bold rounded-xl hover:bg-ruby-hover transition-all shadow-lg shadow-ruby-primary/20"
                onClick={() => setMobileMenuOpen(false)}
              >
                Đăng nhập hệ thống
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
