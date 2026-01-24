'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Settings, BookOpen, PenLine, Globe } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from './LanguageToggle';

export default function Navigation() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: '/scan', label: t('nav_scan'), icon: Search },
    { href: '/read', label: t('nav_read'), icon: BookOpen },
    { href: '/write', label: t('nav_write'), icon: PenLine },
    { href: '/change-address', label: t('nav_change_id'), icon: Settings },
    { href: '/remote', label: t('nav_remote'), icon: Globe },
  ];

  return (
    <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="ModScan Pro" className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">ModScan Pro</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wider">BY 2EDGE TECHNOLOGY Co.,Ltd</p>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="w-px h-6 bg-slate-200" />
            <LanguageToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
