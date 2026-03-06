'use client';

import Link from 'next/link';
import { Search, Globe, Settings, ArrowRight, Zap, PenLine, LayoutGrid } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function Home() {
  const { t } = useLanguage();
  const features = [
    {
      href: '/read',
      icon: Globe,
      title: 'Unified Dashboard',
      description: 'Combine Read and Write operations in a single persistent view with multi-monitoring support.',
      color: 'emerald',
      tags: ['FC01-04', 'FC05-06', 'Real-time'],
    },
    {
      href: '/dashboard',
      icon: LayoutGrid,
      title: t('nav_dashboard'),
      description: t('dashboard_subtitle'),
      color: 'violet',
      tags: ['Multi-Device', 'Card View', 'Sequential Polling'],
    },
    {
      href: '/scan',
      icon: Search,
      title: t('nav_scan'),
      description: t('home_scan_desc'),
      color: 'cyan',
      tags: ['Discovery'],
    },
    {
      href: '/change-address',
      icon: Settings,
      title: t('nav_change_id'),
      description: t('home_change_id_desc'),
      color: 'amber',
      tags: ['Config'],
    },
    {
      href: '/remote',
      icon: PenLine,
      title: t('nav_remote'),
      description: 'Access and control your Modbus devices remotely via secure tunnel.',
      color: 'purple',
      tags: ['Remote'],
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; shadow: string; text: string }> = {
      cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/50', shadow: 'shadow-cyan-500/10', text: 'text-cyan-400' },
      emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', shadow: 'shadow-emerald-500/10', text: 'text-emerald-400' },
      purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/50', shadow: 'shadow-purple-500/10', text: 'text-purple-400' },
      amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/50', shadow: 'shadow-amber-500/10', text: 'text-amber-400' },
      violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/50', shadow: 'shadow-violet-500/10', text: 'text-violet-400' },
    };
    return colors[color] || colors.cyan;
  };

  return (
    <div className="py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-block p-6 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 mb-8 animate-in zoom-in duration-500">
          <img src="/logo.svg" alt="ModScan Pro" className="w-24 h-24" />
        </div>
        <h1 className="text-5xl font-bold text-slate-900 mb-4 tracking-tight">
          {t('home_title')}
        </h1>
        <p className="text-lg text-slate-600 max-w-xl mx-auto">
          Experience the most advanced Modbus management suite with real-time monitoring and control.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
          <span>By 2EDGE Technology Co.,Ltd</span>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {features.map((feature) => {
          const colors = getColorClasses(feature.color);
          const Icon = feature.icon;
          
          return (
            <Link
              key={feature.href}
              href={feature.href}
              className={`group block p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-400 transition-all duration-300 hover:shadow-lg`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${colors.bg} ${colors.text} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
                    {feature.title}
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                  </h2>
                  <p className="text-slate-600 text-sm mb-2">
                    {feature.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {feature.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded bg-slate-100 text-xs text-slate-600 border border-slate-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Info */}
      <div className="mt-10 p-5 rounded-xl bg-white border border-slate-200 shadow-sm max-w-4xl mx-auto">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-slate-900 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-1">Persistent Workspace</h3>
            <p className="text-sm text-slate-600">
              Your settings, read ranges, and dashboard layout are automatically saved. Switching between pages no longer loses your configurations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
