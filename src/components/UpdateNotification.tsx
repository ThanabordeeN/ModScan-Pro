'use client';

import React, { useState, useEffect } from 'react';
import { updateAPI, type UpdateInfo, type UpdateProgress } from '@/lib/electron-api';
import { useLanguage } from '@/context/LanguageContext';
import { Download, RefreshCw, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function UpdateNotification() {
  const { t } = useLanguage();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Register listeners
    updateAPI.onStatus((info) => {
      setUpdateInfo(info);
      if (info.status === 'available' || info.status === 'ready' || info.status === 'error') {
        setIsVisible(true);
      } else if (info.status === 'not-available' || info.status === 'checking') {
        // Optional: show checking/not-available briefly or only if manually triggered
      }
    });

    updateAPI.onProgress((p) => {
      setProgress(p);
    });

    return () => {
      updateAPI.removeListeners();
    };
  }, []);

  const handleDownload = async () => {
    await updateAPI.download();
  };

  const handleInstall = async () => {
    await updateAPI.install();
  };

  const closeNotification = () => {
    setIsVisible(false);
  };

  if (!isVisible || !updateInfo) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-96 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 instrument-panel-strong shadow-2xl overflow-hidden overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 instrument-accent dark:instrument-accent">
              {updateInfo.status === 'available' && <Download className="w-5 h-5" />}
              {updateInfo.status === 'downloading' && <Loader2 className="w-5 h-5 animate-spin" />}
              {updateInfo.status === 'ready' && <CheckCircle2 className="w-5 h-5" />}
              {updateInfo.status === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                {updateInfo.status === 'error' ? t('common_error') : 'Software Update'}
              </h4>
            </div>
            <button 
              onClick={closeNotification}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {updateInfo.status === 'available' && t('update_available').replace('{version}', updateInfo.version || '')}
              {updateInfo.status === 'downloading' && t('update_downloading').replace('{progress}', progress?.percent.toString() || '0')}
              {updateInfo.status === 'ready' && t('update_ready')}
              {updateInfo.status === 'error' && t('update_error').replace('{error}', updateInfo.error || 'Unknown')}
            </p>

            {updateInfo.status === 'downloading' && (
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-instrument-full overflow-hidden">
                <div 
                  className="h-full instrument-accent transition-all duration-300"
                  style={{ width: `${progress?.percent || 0}%` }}
                />
              </div>
            )}

            <div className="flex gap-2 mt-4">
              {updateInfo.status === 'available' && (
                <button
                  onClick={handleDownload}
                  className="flex-1 instrument-accent hover:instrument-accent text-white font-bold py-2.5 instrument-panel transition-all shadow-lg instrument-accent/20 text-sm"
                >
                  {t('update_btn_download')}
                </button>
              )}
              {updateInfo.status === 'ready' && (
                <button
                  onClick={handleInstall}
                  className="flex-1 instrument-accent hover:instrument-accent text-white font-bold py-2.5 instrument-panel transition-all shadow-lg instrument-accent/20 text-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('update_btn_install')}
                </button>
              )}
              {updateInfo.status === 'error' && (
                <button
                  onClick={() => updateAPI.check()}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 instrument-panel transition-all text-sm"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
