"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutGrid,
  Plus,
  Play,
  Square,
  Timer,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Settings2,
  Search,
} from "lucide-react";
import ConnectionSettings from "@/components/ConnectionSettings";
import RegisterCard from "@/components/RegisterCard";
import { useModbus } from "@/context/ModbusContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProject } from "@/context/ProjectContext";
import { useTheme } from "@/context/ThemeContext";
import { dashboardAPI, DashboardCardConfig, DashboardStatus } from "@/lib/electron-api";
import { getWindowItem, setWindowItem, removeWindowItem } from "@/lib/window-storage";
import { DashboardCard, PlotDataPoint, INTERVAL_OPTIONS } from "@/types/dashboard";

export default function ReadPage() {
  const {
    connection,
    isConnectionReady,
    scannedDevices,
    requestStartProcess,
    demoMode,
    selectedSlaveId,
    setSelectedSlaveId,
  } = useModbus();
  const { t } = useLanguage();
  const { getDeviceDisplayName, getDeviceAlias } = useProject();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [cards, setCards] = useState<DashboardCard[]>(() => {
    if (typeof window !== "undefined") {
      const saved = getWindowItem("dashboard_cards");
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return [];
  });

  const [pollInterval, setPollInterval] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = getWindowItem("dashboard_interval");
      if (saved) return Number(saved);
    }
    return 1000;
  });

  const [pollTimeout, setPollTimeout] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = getWindowItem("dashboard_timeout");
      if (saved) return Number(saved);
    }
    return 1000;
  });

  const [polling, setPolling] = useState(false);
  const [status, setStatus] = useState<DashboardStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [plotData, setPlotData] = useState<Record<string, PlotDataPoint[]>>({});
  const [selectedRegisters, setSelectedRegisters] = useState<Record<string, Set<number>>>({});

  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Persistence
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (cards.length > 0) setWindowItem("dashboard_cards", JSON.stringify(cards));
      else removeWindowItem("dashboard_cards");
    }
  }, [cards]);

  useEffect(() => {
    if (typeof window !== "undefined") setWindowItem("dashboard_interval", pollInterval.toString());
  }, [pollInterval]);

  useEffect(() => {
    if (typeof window !== "undefined") setWindowItem("dashboard_timeout", pollTimeout.toString());
  }, [pollTimeout]);

  // Demo values builder (inline — only used in this page's polling loop)
  const buildDemoValues = (slaveAddress: number, registerAddress: number, quantity: number, functionCode: number) => {
    const tick = Math.floor(Date.now() / 1000);
    return Array.from({ length: quantity }, (_, idx) => {
      const seed = slaveAddress * 97 + registerAddress + idx * 13 + tick;
      return functionCode === 1 || functionCode === 2 ? seed % 2 : seed % 1000;
    });
  };

  // Polling loop
  useEffect(() => {
    if (polling) {
      statusTimerRef.current = setInterval(async () => {
        const currentStatus = demoMode
          ? {
              running: true,
              interval: pollInterval,
              cards,
              results: Object.fromEntries(
                cards.map((card) => {
                  const online = scannedDevices.some((d) => d.address === Number(card.slaveAddress));
                  return [
                    card.cardId,
                    {
                      success: online,
                      data: online
                        ? buildDemoValues(Number(card.slaveAddress) || 1, Number(card.registerAddress) || 0, Number(card.quantity) || 1, card.functionCode)
                        : null,
                      error: online ? null : "Demo device not found",
                      lastUpdated: new Date().toISOString(),
                    },
                  ];
                }),
              ),
            }
          : await dashboardAPI.status();

        setStatus(currentStatus);

        if (currentStatus?.results && Object.keys(currentStatus.results).length > 0) {
          setPlotData((prev) => {
            const newData = { ...prev };
            const timeStr = new Date().toLocaleTimeString();
            cards.forEach((card) => {
              const selected = selectedRegisters[card.cardId];
              if (!selected || selected.size === 0) return;
              const res = currentStatus.results[card.cardId];
              if (res?.success && res.data && res.data.length > 0) {
                const point: PlotDataPoint = { time: timeStr };
                selected.forEach((regIdx) => {
                  if (regIdx < res.data!.length) point[`reg_${regIdx}`] = res.data![regIdx];
                });
                newData[card.cardId] = [...(newData[card.cardId] || []), point].slice(-30);
              }
            });
            return newData;
          });
        }
      }, 500);
    } else {
      if (statusTimerRef.current) clearInterval(statusTimerRef.current);
    }
    return () => { if (statusTimerRef.current) clearInterval(statusTimerRef.current); };
  }, [polling, pollInterval, cards, selectedRegisters, demoMode, scannedDevices]);

  useEffect(() => {
    return () => { if (statusTimerRef.current) clearInterval(statusTimerRef.current); };
  }, []);

  const removeCard = (cardId: string) =>
    setCards((prev) => prev.filter((c) => c.cardId !== cardId));

  const updateCard = (cardId: string, field: keyof DashboardCard, value: string | number) =>
    setCards((prev) => prev.map((c) => (c.cardId === cardId ? { ...c, [field]: value } : c)));

  const toggleRegisterPlot = (cardId: string, regIndex: number) => {
    setSelectedRegisters((prev) => {
      const current = new Set(prev[cardId] || []);
      if (current.has(regIndex)) current.delete(regIndex);
      else current.add(regIndex);
      return { ...prev, [cardId]: current };
    });
  };

  const addCard = useCallback(
    (slaveId?: number) => {
      const targetId = slaveId ?? selectedSlaveId;
      const alias = getDeviceAlias(targetId);
      const name = alias
        ? `${alias} (ID:${targetId})`
        : slaveId !== undefined
          ? `Device ${slaveId}`
          : `Device ${cards.length + 1}`;
      setCards((prev) => [
        ...prev,
        { cardId: Date.now().toString(), name, slaveAddress: targetId, functionCode: 3, registerAddress: 0, quantity: 10 },
      ]);
    },
    [cards.length, selectedSlaveId, getDeviceAlias],
  );

  const startPolling = useCallback(async () => {
    requestStartProcess("read", async () => {
      if (!isConnectionReady) { setError(t("err_select_port")); return; }
      if (cards.length === 0) { setError(t("dashboard_err_no_cards")); return; }
      setError(null);

      const cardConfigs: DashboardCardConfig[] = cards.map((c) => ({
        cardId: c.cardId,
        slaveAddress: Number(c.slaveAddress) || 1,
        functionCode: c.functionCode,
        registerAddress: Number(c.registerAddress) || 0,
        quantity: Number(c.quantity) || 1,
      }));

      const res = demoMode
        ? { success: true }
        : await dashboardAPI.start({
            cards: cardConfigs,
            connectionConfig: {
              type: connection.type, port: connection.port, baudRate: connection.baudRate,
              parity: connection.parity, stopBits: connection.stopBits, dataBits: connection.dataBits,
              tcpIp: connection.tcpIp, tcpPort: connection.tcpPort,
            },
            interval: pollInterval,
            timeout: pollTimeout,
          });

      if (res.success) setPolling(true);
      else setError(res.error || t("dashboard_failed_start_polling"));
    });
  }, [isConnectionReady, cards, connection, pollInterval, pollTimeout, t, demoMode, requestStartProcess]);

  const stopPolling = async () => {
    if (!demoMode) await dashboardAPI.stop();
    setPolling(false);
    setStatus(null);
  };

  const updatePollingConfig = useCallback(async () => {
    if (!polling || demoMode) return;
    await dashboardAPI.update({
      cards: cards.map((c) => ({
        cardId: c.cardId, slaveAddress: Number(c.slaveAddress) || 1,
        functionCode: c.functionCode, registerAddress: Number(c.registerAddress) || 0, quantity: Number(c.quantity) || 1,
      })),
      interval: pollInterval,
      timeout: pollTimeout,
      connectionConfig: {
        type: connection.type, port: connection.port, baudRate: connection.baudRate,
        parity: connection.parity, stopBits: connection.stopBits, dataBits: connection.dataBits,
        tcpIp: connection.tcpIp, tcpPort: connection.tcpPort,
      },
    });
  }, [polling, cards, pollInterval, pollTimeout, connection, demoMode]);

  useEffect(() => { if (polling) updatePollingConfig(); }, [polling, pollInterval, pollTimeout, updatePollingConfig]);

  const formatTime = (isoStr: string | null) =>
    isoStr ? new Date(isoStr).toLocaleTimeString() : "—";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 instrument-panel bg-instrument-accent/5 border-instrument-accent/20 text-instrument-accent flex items-center justify-center">
          <LayoutGrid className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-app-text">{t("nav_read")}</h1>
          <p className="text-sm text-app-muted">{t("dashboard_subtitle")}</p>
        </div>
      </div>

      <ConnectionSettings />

      {/* Scanned Devices Quick-Add */}
      {scannedDevices.length > 0 && !polling && (
        <div className="instrument-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-app-text flex items-center gap-2">
              <div className="p-1 instrument-panel bg-instrument-accent/5 border-instrument-accent/20 text-instrument-accent">
                <Search className="w-4 h-4" />
              </div>
              {t("nav_scan") || "Scanned Devices"}
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">Click to add as monitoring card</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {scannedDevices.map((device) => {
              const deviceExists = cards.some((c) => c.slaveAddress === device.address);
              return (
                <button
                  key={device.address}
                  onClick={() => { setSelectedSlaveId(device.address); addCard(device.address); }}
                  disabled={deviceExists}
                  className={`flex flex-col items-start p-4 instrument-panel border transition-all text-left w-full relative overflow-hidden ${
                    deviceExists
                      ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md hover:-translate-y-0.5 group"
                  }`}
                >
                  {deviceExists && (
                    <div className="absolute top-0 right-0 p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-instrument-bl-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className={`w-8 h-8 instrument-panel border-instrument-accent/20 flex items-center justify-center mb-3 ${deviceExists ? "bg-app-muted/10 text-app-muted" : "bg-instrument-accent/5 text-instrument-accent"}`}>
                    <span className="font-mono font-bold text-sm">{device.address}</span>
                  </div>
                  <h3 className={`font-semibold text-sm truncate w-full ${deviceExists ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
                    {getDeviceDisplayName(device.address)}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {device.responseTime}ms
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="instrument-panel border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("dashboard_interval")}:</label>
            <select
              value={pollInterval}
              onChange={(e) => setPollInterval(Number(e.target.value))}
              className="px-3 py-1.5 instrument-input border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-400"
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("dashboard_timeout")}:</label>
            <input
              type="number"
              value={pollTimeout}
              onChange={(e) => setPollTimeout(e.target.value === "" ? ("" as unknown as number) : Number(e.target.value))}
              onBlur={() => setPollTimeout((prev) => Math.max(100, Number(prev) || 100))}
              className="w-24 px-3 py-1.5 instrument-input border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-400"
              min={100}
              step={100}
            />
            <span className="text-xs text-slate-400 dark:text-slate-500">ms</span>
          </div>

          <div className="flex-1" />

          <button
            onClick={() => addCard()}
            disabled={polling}
            className="flex items-center gap-2 px-4 py-2 instrument-input bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {t("dashboard_add_card")}
          </button>

          {!polling ? (
            <button
              onClick={startPolling}
              disabled={!isConnectionReady || cards.length === 0}
              className="flex items-center gap-2 px-5 py-2 instrument-input instrument-accent hover:instrument-accent transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {t("dashboard_start_polling")}
            </button>
          ) : (
            <button
              onClick={stopPolling}
              className="flex items-center gap-2 px-5 py-2 instrument-input bg-red-600 hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <Square className="w-4 h-4" />
              {t("dashboard_stop_polling")}
            </button>
          )}
        </div>

        {polling && (
          <div className="mt-3 flex items-center gap-2 text-sm instrument-accent dark:instrument-accent">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("dashboard_polling_active")}
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Card Grid */}
      {cards.length === 0 ? (
        <div className="instrument-panel border border-dashed border-slate-300 dark:border-slate-600 p-12 text-center">
          <LayoutGrid className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">{t("dashboard_no_cards")}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {cards.map((card) => (
            <RegisterCard
              key={card.cardId}
              card={card}
              result={status?.results?.[card.cardId]}
              polling={polling}
              isDark={isDark}
              selectedRegisters={selectedRegisters[card.cardId] || new Set()}
              plotData={plotData[card.cardId] || []}
              onRemove={() => removeCard(card.cardId)}
              onUpdate={(field, value) => updateCard(card.cardId, field, value)}
              onToggleRegisterPlot={(regIdx) => toggleRegisterPlot(card.cardId, regIdx)}
              formatTime={formatTime}
              getDeviceDisplayName={getDeviceDisplayName}
            />
          ))}
        </div>
      )}
    </div>
  );
}
