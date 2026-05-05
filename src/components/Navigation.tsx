"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Radar,
  Settings,
  Globe,
  Menu,
  X,
  FolderOpen,
  LayoutGrid,
  Network,
  AppWindow,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Languages,
  FlaskConical,
  Heart,
  MessageCircle,
  Activity,
} from "lucide-react";
import DownloadPopup from "./DownloadPopup";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useModbus } from "@/context/ModbusContext";
import { windowAPI, isElectron, updateAPI } from "@/lib/electron-api";

export default function Navigation() {
  const pathname = usePathname();
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { demoMode, toggleDemoMode } = useModbus();
  const [collapsed, setCollapsed] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const navItems = [
    { href: "/scan", label: t("nav_scan"), icon: Radar },
    { href: "/read", label: t("nav_read"), icon: LayoutGrid },
    { href: "/topology", label: t("nav_topology"), icon: Network },
    { href: "/change-address", label: t("nav_change_id"), icon: Settings },
    { href: "/projects", label: t("nav_projects"), icon: FolderOpen },
    { href: "/remote", label: t("nav_remote"), icon: Globe },
    { href: "/diagnostics", label: "Diagnostics", icon: Activity },
  ];

  return (
    <>
      {/* Mobile overlay */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-app-surface/90 backdrop-blur-md border-b border-app-border px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img src="/logo.png" alt="ModScan Pro" className="w-7 h-7" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-app-text leading-none">
              ModScan Pro
            </span>
            <span className="text-[10px] text-instrument-accent font-semibold uppercase">
              Community
            </span>
          </div>
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-instrument-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {!collapsed && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/20"
          onClick={() => setCollapsed(true)}
        >
          <div
            className="absolute left-0 top-14 bottom-0 w-64 bg-app-surface border-r border-app-border shadow-panel p-4 flex flex-col gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setCollapsed(true)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-instrument-sm text-sm font-medium transition-all ${
                    isActive
                      ? "bg-app-text text-app-surface shadow-md"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <button
              onClick={toggleDemoMode}
              className={`mt-3 w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-instrument-sm text-sm font-medium transition-all ${
                demoMode
                  ? "bg-instrument-accent text-white shadow-md"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`}
            >
              <span className="flex items-center gap-3">
                <FlaskConical className="w-4 h-4 flex-shrink-0" />
                Demo
              </span>
              <span
                className={`h-4 w-7 rounded-instrument-full p-0.5 transition-colors ${
                  demoMode ? "bg-white/30" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`block h-3 w-3 rounded-instrument-full bg-white transition-transform ${
                    demoMode ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      )}

      <DownloadPopup
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
        lang={language}
      />

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-screen sticky top-0 border-r border-app-border bg-app-surface transition-all duration-300 ${collapsed ? "w-16" : "w-56"}`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-app-border">
          <Link
            href="/"
            className={`flex items-center gap-2.5 hover:opacity-80 transition-opacity ${collapsed ? "justify-center" : ""}`}
          >
            <img
              src="/logo.png"
              alt="ModScan Pro"
              className="w-8 h-8 flex-shrink-0"
            />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold text-app-text leading-tight">
                  ModScan Pro
                </span>
                <span className="text-[9px] text-instrument-accent font-semibold tracking-wider uppercase">
                  COMMUNITY EDITION
                </span>
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-instrument-sm text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-app-text text-app-surface shadow-instrument"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-app-border">
          <div className="flex flex-col gap-1">
            {isElectron() && (
              <>
                <button
                  onClick={() => updateAPI.check()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-instrument-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all text-xs"
                  title="Check for Updates"
                >
                  <RefreshCw className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>Update</span>}
                </button>
                <button
                  onClick={() => windowAPI.openNew()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-instrument-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all text-xs"
                  title={t("nav_new_window")}
                >
                  <AppWindow className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>New Window</span>}
                </button>
              </>
            )}
            <button
              onClick={toggleDemoMode}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-instrument-sm transition-all text-xs ${
                demoMode
                  ? "bg-instrument-accent text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50"
              } ${collapsed ? "justify-center" : ""}`}
              title={demoMode ? "Hide Demo Devices" : "Show Demo Devices"}
            >
              <FlaskConical className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Demo Devices</span>}
            </button>
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-instrument-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all text-xs"
              title={theme === "light" ? "Switch to Dark" : "Switch to Light"}
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Sun className="w-4 h-4 flex-shrink-0" />
              )}
              {!collapsed && (
                <span>{theme === "light" ? "Dark" : "Light"}</span>
              )}
            </button>
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-instrument-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all text-xs"
              title="Switch Language"
            >
              <Languages className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="uppercase">{language}</span>}
            </button>
            <button
              onClick={() => setSupportOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-instrument-sm text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all text-xs"
              title="Support the Project"
            >
              <Heart className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Support</span>}
            </button>
            <a
              href="https://discord.gg/kBD4uD2XtH"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-instrument-sm text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-xs"
              title="Join Discord"
            >
              <MessageCircle className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Discord</span>}
            </a>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-instrument-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all text-xs"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              )}
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
