"use client";

import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  Download,
  History,
  Trash2,
} from "lucide-react";
import ConnectionSettings from "@/components/ConnectionSettings";
import { useModbus } from "@/context/ModbusContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProject } from "@/context/ProjectContext";

export default function ScanPage() {
  const {
    isConnectionReady,
    scannedDevices,
    scanStartAddr,
    setScanStartAddr,
    scanEndAddr,
    setScanEndAddr,
    scanTimeout,
    setScanTimeout,
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
    clearScanHistory,
  } = useModbus();
  const { t } = useLanguage();
  const { deviceAliases, setAlias } = useProject();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 instrument-panel bg-instrument-accent/5 border-instrument-accent/20 text-instrument-accent flex items-center justify-center">
          <Search className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-app-text">
            {t("scan_title")}
          </h1>
          <p className="text-sm text-app-muted">{t("scan_subtitle")}</p>
        </div>
      </div>

      {/* Connection Settings */}
      <ConnectionSettings disabled={isScanning} />

      {/* Scan Settings */}
      <div className="instrument-panel p-6">
        <h2 className="text-lg font-semibold text-app-text mb-4">
          {t("scan_range_settings")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="instrument-label mb-2">
              {t("scan_start_address")}
            </label>
            <input
              type="number"
              min={1}
              max={247}
              value={scanStartAddr}
              onChange={(e) =>
                setScanStartAddr(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="w-full instrument-input"
              disabled={isScanning}
            />
          </div>

          <div>
            <label className="instrument-label mb-2">
              {t("scan_end_address")}
            </label>
            <input
              type="number"
              min={1}
              max={247}
              value={scanEndAddr}
              onChange={(e) =>
                setScanEndAddr(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="w-full instrument-input"
              disabled={isScanning}
            />
          </div>

          <div>
            <label className="instrument-label mb-2">{t("scan_timeout")}</label>
            <input
              type="number"
              min={100}
              max={5000}
              step={100}
              value={scanTimeout}
              onChange={(e) =>
                setScanTimeout(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="w-full instrument-input"
              disabled={isScanning}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={startScan}
            disabled={isScanning || !isConnectionReady}
            className="flex-1 instrument-button-primary flex items-center justify-center gap-2 shadow-sm"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("scan_scanning")} {scanProgress}%
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                {t("scan_start_btn")}
              </>
            )}
          </button>
          {isScanning && (
            <button
              onClick={cancelScan}
              className="px-6 instrument-button bg-red-600 hover:bg-red-700 text-white border-transparent flex items-center justify-center gap-2 shadow-sm"
            >
              <XCircle className="w-5 h-5" />
              {t("scan_cancel_btn")}
            </button>
          )}
        </div>

        {isScanning && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Progress</span>
              <span>{scanProgress}%</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-instrument-full overflow-hidden">
              <div
                className="h-full bg-slate-900 transition-all duration-300 ease-out"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}

        {scanError && (
          <div className="mt-4 p-4 instrument-input bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-600 dark:text-red-400">{scanError}</span>
          </div>
        )}
      </div>

      {/* Results — show during scan for real-time and after scan */}
      {hasScanned &&
        (() => {
          // Build merged list: current devices + removed devices from diff
          const removedDevices = scanDiff?.removed || [];
          const addedAddrs = new Set(
            scanDiff?.added.map((d) => d.address) || [],
          );
          const removedAddrs = new Set(removedDevices.map((d) => d.address));
          const allDevices = [...scannedDevices, ...removedDevices].sort(
            (a, b) => a.address - b.address,
          );

          return (
            <div className="instrument-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-app-text">
                  {t("scan_results")}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t("scan_found_count")
                      .replace("{found}", scannedDevices.length.toString())
                      .replace("{scanned}", scannedCount.toString())}
                  </span>
                  {!isScanning &&
                    scanDiff &&
                    (scanDiff.added.length > 0 ||
                      scanDiff.removed.length > 0) && (
                      <div className="flex items-center gap-1.5 ml-2">
                        {scanDiff.added.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-instrument-full instrument-accent dark:instrument-accent/30 instrument-accent dark:instrument-accent text-xs font-bold">
                            <Plus className="w-3 h-3" />+{scanDiff.added.length}
                          </span>
                        )}
                        {scanDiff.removed.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-instrument-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold">
                            <Minus className="w-3 h-3" />-
                            {scanDiff.removed.length}
                          </span>
                        )}
                      </div>
                    )}
                </div>
              </div>

              {allDevices.length === 0 && !isScanning ? (
                <div className="p-8 instrument-input bg-app-surface border border-app-border text-center">
                  <XCircle className="w-12 h-12 text-app-muted mx-auto mb-3" />
                  <p className="text-app-muted">{t("scan_no_devices")}</p>
                </div>
              ) : (
                allDevices.length > 0 && (
                  <div className="overflow-hidden instrument-input border border-app-border">
                    <table className="instrument-table">
                      <thead>
                        <tr>
                          {scanDiff && (
                            <th className="w-10">{t("scan_diff_title")}</th>
                          )}
                          <th>{t("scan_header_address")}</th>
                          <th>{t("scan_header_response")}</th>
                          <th>{t("scan_header_status")}</th>
                          <th>{t("scan_header_register")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allDevices.map((device) => {
                          const isAdded = addedAddrs.has(device.address);
                          const isRemoved = removedAddrs.has(device.address);

                          const rowBg = isAdded
                            ? "bg-instrument-ok/10 hover:bg-instrument-ok/20"
                            : isRemoved
                              ? "bg-instrument-danger/10 hover:bg-instrument-danger/20 opacity-60"
                              : "bg-app-surface hover:bg-app-muted/10";

                          return (
                            <tr key={device.address} className={rowBg}>
                              {scanDiff && (
                                <td className="text-center">
                                  {isAdded && (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-instrument bg-instrument-ok text-white text-xs font-bold">
                                      +
                                    </span>
                                  )}
                                  {isRemoved && (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-instrument bg-instrument-danger text-white text-xs font-bold">
                                      −
                                    </span>
                                  )}
                                </td>
                              )}
                              <td className="flex items-center gap-3">
                                <span
                                  data-kind="address"
                                  className={`inline-flex items-center px-2.5 py-1 instrument-input font-bold min-w-[3.5rem] justify-center ${
                                    isAdded
                                      ? "bg-instrument-ok/20 text-instrument-ok"
                                      : isRemoved
                                        ? "bg-instrument-danger/20 text-instrument-danger line-through"
                                        : "bg-app-muted/10 text-app-text"
                                  }`}
                                >
                                  {device.address}
                                </span>
                                {!isRemoved && (
                                  <input
                                    type="text"
                                    value={
                                      deviceAliases.find(
                                        (d) => d.slaveId === device.address,
                                      )?.alias || ""
                                    }
                                    onChange={(e) => {
                                      const existing = deviceAliases.find(
                                        (d) => d.slaveId === device.address,
                                      );
                                      setAlias(
                                        device.address,
                                        e.target.value,
                                        existing?.description,
                                        existing?.remark,
                                      );
                                    }}
                                    placeholder={t("project_alias") + "..."}
                                    className="instrument-input flex-1 max-w-xs"
                                  />
                                )}
                                {isRemoved &&
                                  deviceAliases.find(
                                    (d) => d.slaveId === device.address,
                                  )?.alias && (
                                    <span className="text-instrument-danger text-sm line-through">
                                      {
                                        deviceAliases.find(
                                          (d) => d.slaveId === device.address,
                                        )?.alias
                                      }
                                    </span>
                                  )}
                              </td>
                              <td
                                data-kind="value"
                                className={
                                  isRemoved
                                    ? "text-instrument-danger line-through"
                                    : "text-app-text"
                                }
                              >
                                {device.responseTime}ms
                              </td>
                              <td>
                                {isRemoved ? (
                                  <span className="inline-flex items-center gap-1.5 text-instrument-danger">
                                    <XCircle className="w-4 h-4" />
                                    {t("scan_diff_removed")}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-instrument-ok">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {t("scan_status_online")}
                                  </span>
                                )}
                              </td>
                              <td
                                data-kind="value"
                                className={
                                  isRemoved
                                    ? "text-instrument-danger line-through"
                                    : "text-app-text"
                                }
                              >
                                {device.holdingRegisters?.[0] ?? "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          );
        })()}

      {/* Scan History Panel */}
      {scanHistory.length > 0 && !isScanning && (
        <div className="instrument-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-app-muted" />
              <h2 className="text-lg font-semibold text-app-text">
                {t("scan_history_title")}
              </h2>
              <span className="text-sm text-app-muted">
                ({scanHistory.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportScanHistoryCSV}
                className="instrument-button-primary inline-flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                {t("scan_history_export_csv")}
              </button>
              <button
                onClick={clearScanHistory}
                className="instrument-button inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {t("scan_history_clear")}
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {scanHistory.map((entry, idx) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-4 py-2.5 instrument-input bg-app-surface border border-app-border text-sm"
              >
                <span className="text-app-text">
                  {t("scan_history_entry")
                    .replace("{n}", String(scanHistory.length - idx))
                    .replace("{time}", entry.timestamp.toLocaleTimeString())
                    .replace("{found}", String(entry.devices.length))
                    .replace("{start}", String(entry.startAddr))
                    .replace("{end}", String(entry.endAddr))}
                </span>
                <span className="text-app-muted text-xs">
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
