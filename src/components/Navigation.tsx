'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radar, Settings, Globe, Menu, X, FolderOpen, LayoutGrid, Network, AppWindow, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { windowAPI, isElectron, updateAPI } from '@/lib/electron-api';
import LanguageToggle from './LanguageToggle';

export default function Navigation() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { href: '/scan', label: t('nav_scan'), icon: Radar },
    { href: '/read', label: t('nav_read'), icon: LayoutGrid },
    { href: '/topology', label: t('nav_topology'), icon: Network },
    { href: '/change-address', label: t('nav_change_id'), icon: Settings },
    { href: '/projects', label: t('nav_projects'), icon: FolderOpen },
    { href: '/remote', label: t('nav_remote'), icon: Globe },
  ];

  return (
    <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group flex-shrink-0">
            <img src="/logo.svg" alt="ModScan Pro" className="w-8 h-8 group-hover:scale-105 transition-transform duration-300" />
            <div className="flex items-baseline gap-2">
              <h1 className="text-base font-bold text-slate-900 leading-none tracking-tight whitespace-nowrap">ModScan Pro</h1>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider hidden lg:block uppercase whitespace-nowrap">by 2Edge</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-md shadow-slate-900/5 ring-1 ring-slate-900/10'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 active:scale-95'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden lg:inline whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="w-px h-6 bg-slate-200" />
            {isElectron() && (
              <div className="flex items-center">
                <button
                  onClick={() => updateAPI.check()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200 active:scale-95 whitespace-nowrap"
                  title="Check for Updates"
                >
                  <RefreshCw className="w-4 h-4 flex-shrink-0" />
                </button>
                <button
                  onClick={() => windowAPI.openNew()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200 active:scale-95 whitespace-nowrap"
                  title={t('nav_new_window')}
                >
                  <AppWindow className="w-4 h-4 flex-shrink-0" />
                </button>
              </div>
            )}
            <LanguageToggle />
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <LanguageToggle />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-md shadow-slate-900/5 ring-1 ring-slate-900/10'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 active:scale-95'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
