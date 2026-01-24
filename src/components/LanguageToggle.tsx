'use client';

import { useLanguage } from '@/context/LanguageContext';
import { Languages } from 'lucide-react';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200"
      title="Switch Language / เปลี่ยนภาษา"
    >
      <Languages className="w-4 h-4" />
      <span className="uppercase">{language}</span>
    </button>
  );
}
