'use client';

import { Search, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import ConnectionSettings from '@/components/ConnectionSettings';
import { useModbus } from '@/context/ModbusContext';
import { useLanguage } from '@/context/LanguageContext';

export default function ScanPage() {
  const { 
    connection, isConnectionReady,
    scannedDevices, 
    scanStartAddr, setScanStartAddr,
    scanEndAddr, setScanEndAddr,
    scanTimeout, setScanTimeout,
    isScanning,
    scanProgress,
    scanError,
    scannedCount,
    hasScanned,
    startScan
  } = useModbus();
  const { t } = useLanguage();
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700">
          <Search className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('scan_title')}</h1>
          <p className="text-sm text-slate-600">{t('scan_subtitle')}</p>
        </div>
      </div>

      {/* Connection Settings */}
      <ConnectionSettings disabled={isScanning} />

      {/* Scan Settings */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('scan_range_settings')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">{t('scan_start_address')}</label>
            <input
              type="number"
              min={1}
              max={247}
              value={scanStartAddr}
              onChange={(e) => setScanStartAddr(Math.min(247, Math.max(1, Number(e.target.value))))}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              disabled={isScanning}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">{t('scan_end_address')}</label>
            <input
              type="number"
              min={1}
              max={247}
              value={scanEndAddr}
              onChange={(e) => setScanEndAddr(Math.min(247, Math.max(scanStartAddr, Number(e.target.value))))}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              disabled={isScanning}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">{t('scan_timeout')}</label>
            <input
              type="number"
              min={100}
              max={5000}
              step={100}
              value={scanTimeout}
              onChange={(e) => setScanTimeout(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              disabled={isScanning}
            />
          </div>
        </div>

        <button
          onClick={startScan}
          disabled={isScanning || !isConnectionReady}
          className="w-full py-3 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('scan_scanning')} {scanProgress}%
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              {t('scan_start_btn')}
            </>
          )}
        </button>

        {isScanning && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
               <span>Progress</span>
               <span>{scanProgress}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-slate-900 transition-all duration-300 ease-out" 
                style={{ width: `${scanProgress}%` }} 
              />
            </div>
          </div>
        )}

        {scanError && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600">{scanError}</span>
          </div>
        )}
      </div>

      {/* Results */}
      {hasScanned && !isScanning && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">{t('scan_results')}</h2>
            <span className="text-sm text-slate-500">
              {t('scan_found_count').replace('{found}', scannedDevices.length.toString()).replace('{scanned}', scannedCount.toString())}
            </span>
          </div>

          {scannedDevices.length === 0 ? (
            <div className="p-8 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <XCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500">{t('scan_no_devices')}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">{t('scan_header_address')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">{t('scan_header_response')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">{t('scan_header_status')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">{t('scan_header_register')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {scannedDevices.map((device) => (
                    <tr key={device.address} className="bg-white hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold">
                          {device.address}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{device.responseTime}ms</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" />
                          {t('scan_status_online')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-mono">
                        {device.holdingRegisters?.[0] ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
