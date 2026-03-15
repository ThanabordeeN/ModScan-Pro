'use client';

import { Search, Loader2, CheckCircle2, XCircle, Plus, Minus, Download, History, Trash2 } from 'lucide-react';
import ConnectionSettings from '@/components/ConnectionSettings';
import { useModbus } from '@/context/ModbusContext';
import { useLanguage } from '@/context/LanguageContext';
import { useProject } from '@/context/ProjectContext';

export default function ScanPage() {
  const { 
    isConnectionReady,
    scannedDevices, 
    scanStartAddr, setScanStartAddr,
    scanEndAddr, setScanEndAddr,
    scanTimeout, setScanTimeout,
    isScanning,
    scanProgress,
    scanError,
    scannedCount,
    hasScanned,
    startScan,
    cancelScan,
    scanDiff,
    scanHistory,
    exportScanHistoryCSV,
    clearScanHistory
  } = useModbus();
  const { t } = useLanguage();
  const { deviceAliases, setAlias } = useProject();
  
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
              onChange={(e) => setScanStartAddr(e.target.value === '' ? '' : Number(e.target.value))}
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
              onChange={(e) => setScanEndAddr(e.target.value === '' ? '' : Number(e.target.value))}
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
              onChange={(e) => setScanTimeout(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              disabled={isScanning}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={startScan}
            disabled={isScanning || !isConnectionReady}
            className="flex-1 py-3 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
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
            <button
              onClick={cancelScan}
              className="py-3 px-6 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
            >
              <XCircle className="w-5 h-5" />
              {t('scan_cancel_btn')}
            </button>
          )}
        </div>

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

      {/* Results — show during scan for real-time and after scan */}
      {hasScanned && (() => {
        // Build merged list: current devices + removed devices from diff
        const removedDevices = scanDiff?.removed || [];
        const addedAddrs = new Set(scanDiff?.added.map(d => d.address) || []);
        const removedAddrs = new Set(removedDevices.map(d => d.address));
        const allDevices = [...scannedDevices, ...removedDevices].sort((a, b) => a.address - b.address);

        return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">{t('scan_results')}</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                {t('scan_found_count').replace('{found}', scannedDevices.length.toString()).replace('{scanned}', scannedCount.toString())}
              </span>
              {!isScanning && scanDiff && (scanDiff.added.length > 0 || scanDiff.removed.length > 0) && (
                <div className="flex items-center gap-1.5 ml-2">
                  {scanDiff.added.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                      <Plus className="w-3 h-3" />+{scanDiff.added.length}
                    </span>
                  )}
                  {scanDiff.removed.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                      <Minus className="w-3 h-3" />-{scanDiff.removed.length}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {allDevices.length === 0 && !isScanning ? (
            <div className="p-8 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <XCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500">{t('scan_no_devices')}</p>
            </div>
          ) : allDevices.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    {scanDiff && <th className="px-3 py-3 text-left text-sm font-medium text-slate-500 w-10">{t('scan_diff_title')}</th>}
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">{t('scan_header_address')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">{t('scan_header_response')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">{t('scan_header_status')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">{t('scan_header_register')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {allDevices.map((device) => {
                    const isAdded = addedAddrs.has(device.address);
                    const isRemoved = removedAddrs.has(device.address);

                    const rowBg = isAdded
                      ? 'bg-emerald-50 hover:bg-emerald-100'
                      : isRemoved
                        ? 'bg-red-50 hover:bg-red-100 opacity-60'
                        : 'bg-white hover:bg-slate-50';

                    return (
                    <tr key={device.address} className={rowBg}>
                      {scanDiff && (
                        <td className="px-3 py-3 text-center">
                          {isAdded && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-500 text-white text-xs font-bold">+</span>
                          )}
                          {isRemoved && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-500 text-white text-xs font-bold">−</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 flex items-center gap-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg font-mono font-bold min-w-[3.5rem] justify-center ${
                          isAdded ? 'bg-emerald-200 text-emerald-800' : isRemoved ? 'bg-red-200 text-red-800 line-through' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {device.address}
                        </span>
                        {!isRemoved && (
                        <input
                          type="text"
                          value={deviceAliases.find(d => d.slaveId === device.address)?.alias || ''}
                          onChange={(e) => {
                            const existing = deviceAliases.find(d => d.slaveId === device.address);
                            setAlias(device.address, e.target.value, existing?.description, existing?.remark);
                          }}
                          placeholder={t('project_alias') + '...'}
                          className="flex-1 max-w-xs px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 hover:bg-slate-50 transition-colors"
                        />
                        )}
                        {isRemoved && deviceAliases.find(d => d.slaveId === device.address)?.alias && (
                          <span className="text-red-400 text-sm line-through">{deviceAliases.find(d => d.slaveId === device.address)?.alias}</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${isRemoved ? 'text-red-400 line-through' : 'text-slate-700'}`}>{device.responseTime}ms</td>
                      <td className="px-4 py-3">
                        {isRemoved ? (
                          <span className="inline-flex items-center gap-1.5 text-red-500">
                            <XCircle className="w-4 h-4" />
                            {t('scan_diff_removed')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                            {t('scan_status_online')}
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 font-mono ${isRemoved ? 'text-red-400 line-through' : 'text-slate-700'}`}>
                        {device.holdingRegisters?.[0] ?? '-'}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        );
      })()}

      {/* Scan History Panel */}
      {scanHistory.length > 0 && !isScanning && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">{t('scan_history_title')}</h2>
              <span className="text-sm text-slate-400">({scanHistory.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportScanHistoryCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                {t('scan_history_export_csv')}
              </button>
              <button
                onClick={clearScanHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('scan_history_clear')}
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {scanHistory.map((entry, idx) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-100 text-sm">
                <span className="text-slate-700">
                  {t('scan_history_entry')
                    .replace('{n}', String(scanHistory.length - idx))
                    .replace('{time}', entry.timestamp.toLocaleTimeString())
                    .replace('{found}', String(entry.devices.length))
                    .replace('{start}', String(entry.startAddr))
                    .replace('{end}', String(entry.endAddr))}
                </span>
                <span className="text-slate-400 text-xs">
                  {entry.scannedCount} addr
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
