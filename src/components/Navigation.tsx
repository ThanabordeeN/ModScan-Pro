'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Radar, Settings, Globe, Menu, X, FolderOpen, LayoutGrid, Network, AppWindow, RefreshCw, ChevronLeft, ChevronRight, Sun, Moon, Languages
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { windowAPI, isElectron, updateAPI } from '@/lib/electron-api';


export default function Navigation() {
  const pathname = usePathname();
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { href: '/scan', label: t('nav_scan'), icon: Radar },
    { href: '/read', label: t('nav_read'), icon: LayoutGrid },
    { href: '/topology', label: t('nav_topology'), icon: Network },
    { href: '/change-address', label: t('nav_change_id'), icon: Settings },
    { href: '/projects', label: t('nav_projects'), icon: FolderOpen },
    { href: '/remote', label: t('nav_remote'), icon: Globe },
  ];

  return (
    <>
      {/* Mobile overlay */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/80 px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/logo.svg" alt="ModScan Pro" className="w-7 h-7" />
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">ModScan Pro</span>
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {!collapsed && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/20" onClick={() => setCollapsed(true)}>
          <div className="absolute left-0 top-14 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 shadow-xl p-4 flex flex-col gap-1" onClick={e => e.stopPropagation()}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setCollapsed(true)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-md'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col h-screen sticky top-0 border-r border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <Link href="/" className={`flex items-center gap-2.5 hover:opacity-80 transition-opacity ${collapsed ? 'justify-center' : ''}`}>
            <img src="/logo.svg" alt="ModScan Pro" className="w-8 h-8 flex-shrink-0" />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">ModScan Pro</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase">by 2Edge</span>
              </div>
            )}
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-md shadow-slate-900/5 ring-1 ring-slate-900/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-700/80'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-700">
          <div className="flex flex-col gap-1">
            {isElectron() && (
              <>
                <button
                  onClick={() => updateAPI.check()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-all text-xs"
                  title="Check for Updates"
                >
                  <RefreshCw className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>Update</span>}
                </button>
                <button
                  onClick={() => windowAPI.openNew()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-all text-xs"
                  title={t('nav_new_window')}
                >
                  <AppWindow className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>New Window</span>}
                </button>
              </>
            )}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-all text-xs"
              title={theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 flex-shrink-0" /> : <Sun className="w-4 h-4 flex-shrink-0" />}
              {!collapsed && <span>{theme === 'light' ? 'Dark' : 'Light'}</span>}
            </button>
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-all text-xs"
              title="Switch Language"
            >
              <Languages className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="uppercase">{language}</span>}
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-xs"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4 flex-shrink-0" /> : <ChevronLeft className="w-4 h-4 flex-shrink-0" />}
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}