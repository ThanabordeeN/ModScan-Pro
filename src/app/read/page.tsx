"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutGrid,
  Plus,
  Trash2,
  Play,
  Square,
  Timer,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Settings2,
  Hash,
  Search,
  Check,
  X,
} from "lucide-react";
import ConnectionSettings from "@/components/ConnectionSettings";
import { useModbus } from "@/context/ModbusContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProject } from "@/context/ProjectContext";
import { useTheme } from "@/context/ThemeContext";
import {
  dashboardAPI,
  DashboardCardConfig,
  DashboardStatus,
} from "@/lib/electron-api";
import {
  getWindowItem,
  setWindowItem,
  removeWindowItem,
} from "@/lib/window-storage";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardCard extends DashboardCardConfig {
  name: string;
}

// Each data point stores time + values for each selected register index
interface PlotDataPoint {
  time: string;
  [key: string]: string | number; // "reg_0", "reg_1", etc.
}

// Predefined colors for multi-register lines
const PLOT_COLORS = [
  "#059669",
  "#2563EB",
  "#D97706",
  "#DC2626",
  "#7C3AED",
  "#0891B2",
  "#BE185D",
  "#65A30D",
  "#EA580C",
  "#4F46E5",
];

const FC_LABELS: Record<number, string> = {
  1: "FC01 - Coils",
  2: "FC02 - Discrete Inputs",
  3: "FC03 - Holding Registers",
  4: "FC04 - Input Registers",
};

const INTERVAL_OPTIONS = [
  { value: 500, label: "500ms" },
  { value: 1000, label: "1s" },
  { value: 2000, label: "2s" },
  { value: 5000, label: "5s" },
  { value: 10000, label: "10s" },
  { value: 30000, label: "30s" },
];

export default function ReadPage() {
  const { connection, isConnectionReady, scannedDevices, requestStartProcess } =
    useModbus();
  const { t } = useLanguage();
  const { getDeviceDisplayName } = useProject();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [cards, setCards] = useState<DashboardCard[]>(() => {
    if (typeof window !== "undefined") {
      const saved = getWindowItem("dashboard_cards");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          /* ignore */
        }
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

  // Store historical data for plotting, keyed by cardId
  const [plotData, setPlotData] = useState<Record<string, PlotDataPoint[]>>({});

  // Track which registers are selected for plotting per card: { cardId: Set<registerIndex> }
  const [selectedRegisters, setSelectedRegisters] = useState<
    Record<string, Set<number>>
  >({});

  // Track register aliases using stable key: "{slaveId}-{functionCode}-{registerAddress}-{regIndex}"
  const [registerAliases, setRegisterAliases] = useState<
    Record<string, string>
  >(() => {
    if (typeof window !== "undefined") {
      const saved = getWindowItem("dashboard_register_aliases");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          /* ignore */
        }
      }
    }
    return {};
  });

  // Generate stable key for a register
  const getRegKey = (
    slaveId: number,
    functionCode: number,
    regStartAddr: number,
    regIndex: number,
  ) => `${slaveId}-${functionCode}-${regStartAddr}-${regIndex}`;

  // Track which register is being edited
  const [editingAlias, setEditingAlias] = useState<{
    cardId: string;
    regIndex: number;
    regKey: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Persist register aliases
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowItem(
        "dashboard_register_aliases",
        JSON.stringify(registerAliases),
      );
    }
  }, [registerAliases]);

  const toggleRegisterPlot = (cardId: string, regIndex: number) => {
    setSelectedRegisters((prev) => {
      const current = new Set(prev[cardId] || []);
      if (current.has(regIndex)) {
        current.delete(regIndex);
      } else {
        current.add(regIndex);
      }
      return { ...prev, [cardId]: current };
    });
  };

  const startEditAlias = (
    cardId: string,
    regIndex: number,
    regKey: string,
    currentAlias?: string,
  ) => {
    setEditingAlias({ cardId, regIndex, regKey });
    setEditingValue(currentAlias || "");
  };

  const saveAlias = () => {
    if (editingAlias) {
      const { regKey } = editingAlias;
      setRegisterAliases((prev) => ({
        ...prev,
        [regKey]: editingValue.trim(),
      }));
      setEditingAlias(null);
      setEditingValue("");
    }
  };

  const cancelEditAlias = () => {
    setEditingAlias(null);
    setEditingValue("");
  };

  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Persistence: save cards (window-scoped)
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (cards.length > 0) {
        setWindowItem("dashboard_cards", JSON.stringify(cards));
      } else {
        removeWindowItem("dashboard_cards");
      }
    }
  }, [cards]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowItem("dashboard_interval", pollInterval.toString());
    }
  }, [pollInterval]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowItem("dashboard_timeout", pollTimeout.toString());
    }
  }, [pollTimeout]);

  // Start/stop status polling
  useEffect(() => {
    if (polling) {
      statusTimerRef.current = setInterval(async () => {
        const currentStatus = await dashboardAPI.status();
        setStatus(currentStatus);

        // Update plot data for cards that have selected registers
        if (
          currentStatus &&
          currentStatus.results &&
          Object.keys(currentStatus.results).length > 0
        ) {
          setPlotData((prev) => {
            const newData = { ...prev };
            const now = new Date();
            const timeStr = now.toLocaleTimeString();

            cards.forEach((card) => {
              const selected = selectedRegisters[card.cardId];
              if (!selected || selected.size === 0) return;

              const res = currentStatus.results[card.cardId];
              if (res && res.success && res.data && res.data.length > 0) {
                const point: PlotDataPoint = { time: timeStr };
                selected.forEach((regIdx) => {
                  if (regIdx < res.data!.length) {
                    point[`reg_${regIdx}`] = res.data![regIdx];
                  }
                });

                if (!newData[card.cardId]) {
                  newData[card.cardId] = [];
                }
                newData[card.cardId] = [...newData[card.cardId], point].slice(
                  -30,
                );
              }
            });
            return newData;
          });
        }
      }, 500); // Poll status more frequently than read interval to keep UI snappy
    } else {
      if (statusTimerRef.current) {
        clearInterval(statusTimerRef.current);
      }
    }
    return () => {
      if (statusTimerRef.current) {
        clearInterval(statusTimerRef.current);
      }
    };
  }, [polling, pollInterval, cards, selectedRegisters]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusTimerRef.current) {
        clearInterval(statusTimerRef.current);
      }
    };
  }, []);

  const removeCard = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.cardId !== cardId));
  };

  const updateCard = (
    cardId: string,
    field: keyof DashboardCard,
    value: string | number,
  ) => {
    setCards((prev) =>
      prev.map((c) => (c.cardId === cardId ? { ...c, [field]: value } : c)),
    );
  };

  const addCard = useCallback(
    (slaveId?: number) => {
      const newCard: DashboardCard = {
        cardId: Date.now().toString(),
        name: `Device ${slaveId ?? cards.length + 1}`,
        slaveAddress: slaveId ?? 1,
        functionCode: 3,
        registerAddress: 0,
        quantity: 10,
      };
      setCards((prev) => [...prev, newCard]);
    },
    [cards.length],
  );

  const startPolling = useCallback(async () => {
    requestStartProcess("read", async () => {
      if (!isConnectionReady) {
        setError(t("err_select_port"));
        return;
      }
      if (cards.length === 0) {
        setError(t("dashboard_err_no_cards"));
        return;
      }

      setError(null);

      const cardConfigs: DashboardCardConfig[] = cards.map((c) => ({
        cardId: c.cardId,
        slaveAddress: Number(c.slaveAddress) || 1,
        functionCode: c.functionCode,
        registerAddress: Number(c.registerAddress) || 0,
        quantity: Number(c.quantity) || 1,
      }));

      const res = await dashboardAPI.start({
        cards: cardConfigs,
        connectionConfig: {
          type: connection.type,
          port: connection.port,
          baudRate: connection.baudRate,
          parity: connection.parity,
          stopBits: connection.stopBits,
          dataBits: connection.dataBits,
          tcpIp: connection.tcpIp,
          tcpPort: connection.tcpPort,
        },
        interval: pollInterval,
        timeout: pollTimeout,
      });

      if (res.success) {
        setPolling(true);
      } else {
        setError(res.error || t("dashboard_failed_start_polling"));
      }
    });
  }, [
    isConnectionReady,
    cards,
    connection,
    pollInterval,
    pollTimeout,
    t,
    requestStartProcess,
  ]);

  const stopPolling = async () => {
    await dashboardAPI.stop();
    setPolling(false);
  };

  const updatePollingConfig = useCallback(async () => {
    if (!polling) return;

    const cardConfigs: DashboardCardConfig[] = cards.map((c) => ({
      cardId: c.cardId,
      slaveAddress: Number(c.slaveAddress) || 1,
      functionCode: c.functionCode,
      registerAddress: Number(c.registerAddress) || 0,
      quantity: Number(c.quantity) || 1,
    }));

    await dashboardAPI.update({
      cards: cardConfigs,
      interval: pollInterval,
      timeout: pollTimeout,
      connectionConfig: {
        type: connection.type,
        port: connection.port,
        baudRate: connection.baudRate,
        parity: connection.parity,
        stopBits: connection.stopBits,
        dataBits: connection.dataBits,
        tcpIp: connection.tcpIp,
        tcpPort: connection.tcpPort,
      },
    });
  }, [polling, cards, pollInterval, pollTimeout, connection]);

  // When interval changes during active polling, update backend
  useEffect(() => {
    if (polling) {
      updatePollingConfig();
    }
  }, [polling, pollInterval, pollTimeout, updatePollingConfig]);

  const formatTime = (isoStr: string | null) => {
    if (!isoStr) return "—";
    return new Date(isoStr).toLocaleTimeString();
  };

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

      {/* Connection Settings */}
      <ConnectionSettings />

      {/* Scanned Devices Tags */}
      {scannedDevices.length > 0 && !polling && (
        <div className="instrument-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-app-text flex items-center gap-2">
              <div className="p-1 instrument-panel bg-instrument-accent/5 border-instrument-accent/20 text-instrument-accent">
                <Search className="w-4 h-4" />
              </div>
              {t("nav_scan") || "Scanned Devices"}
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Click to add as monitoring card
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {scannedDevices.map((device) => {
              const deviceExists = cards.some(
                (c) => c.slaveAddress === device.address,
              );

              return (
                <button
                  key={device.address}
                  onClick={() => addCard(device.address)}
                  disabled={deviceExists}
                  className={`flex flex-col items-start p-4 instrument-panel border transition-all text-left w-full relative overflow-hidden ${
                    deviceExists
                      ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:instrument-accent dark:hover:instrument-accent hover:shadow-md hover:-translate-y-0.5 group"
                  }`}
                  title={
                    deviceExists
                      ? "Card already exists for this ID"
                      : `Add card for Slave ${device.address}`
                  }
                >
                  {deviceExists && (
                    <div className="absolute top-0 right-0 p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-instrument-bl-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div
                    className={`w-8 h-8 instrument-panel border-instrument-accent/20 flex items-center justify-center mb-3 ${
                      deviceExists
                        ? "bg-app-muted/10 text-app-muted"
                        : "bg-instrument-accent/5 text-instrument-accent group-hover:bg-instrument-accent/10"
                    }`}
                  >
                    <span className="font-mono font-bold text-sm">
                      {device.address}
                    </span>
                  </div>

                  <h3
                    className={`font-semibold text-sm truncate w-full ${
                      deviceExists
                        ? "text-slate-500 dark:text-slate-400"
                        : "text-slate-900 dark:text-slate-100 group-hover:instrument-accent dark:group-hover:instrument-accent"
                    }`}
                  >
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
          {/* Interval selector */}
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("dashboard_interval")}:
            </label>
            <select
              value={pollInterval}
              onChange={(e) => setPollInterval(Number(e.target.value))}
              className="px-3 py-1.5 instrument-input border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-400"
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Timeout */}
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("dashboard_timeout")}:
            </label>
            <input
              type="number"
              value={pollTimeout}
              onChange={(e) =>
                setPollTimeout(
                  e.target.value === ""
                    ? ("" as unknown as number)
                    : Number(e.target.value),
                )
              }
              onBlur={() =>
                setPollTimeout((prev) => Math.max(100, Number(prev) || 100))
              }
              className="w-24 px-3 py-1.5 instrument-input border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-400"
              min={100}
              step={100}
            />
            <span className="text-xs text-slate-400 dark:text-slate-500">
              ms
            </span>
          </div>

          <div className="flex-1" />

          {/* Add card */}
          <button
            onClick={() => addCard()}
            disabled={polling}
            className="flex items-center gap-2 px-4 py-2 instrument-input bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {t("dashboard_add_card")}
          </button>

          {/* Start / Stop */}
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

        {/* Status indicator */}
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
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            {t("dashboard_no_cards")}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const result = status?.results?.[card.cardId];
            const hasData =
              result?.success && result.data && result.data.length > 0;
            return (
              <div
                key={card.cardId}
                className="instrument-panel border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                {/* Card Header */}
                <div className="instrument-header">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {result?.success ? (
                      <CheckCircle2 className="w-4 h-4 instrument-accent dark:instrument-accent shrink-0" />
                    ) : result?.error ? (
                      <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-instrument-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                    )}
                    {polling ? (
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {card.name}
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={card.name}
                        onChange={(e) =>
                          updateCard(card.cardId, "name", e.target.value)
                        }
                        className="text-sm font-semibold text-slate-800 dark:text-slate-100 bg-transparent border-none outline-none focus:ring-0 p-0 w-full min-w-0"
                        placeholder={t("dashboard_card_name")}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {result?.lastUpdated && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(result.lastUpdated)}
                      </span>
                    )}
                    {!polling && (
                      <button
                        onClick={() => removeCard(card.cardId)}
                        className="p-1 rounded-instrument hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        title={t("dashboard_remove_card")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Config (editable when not polling) */}
                {!polling && (
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {t("dashboard_slave_id")}
                      </label>
                      <input
                        type="number"
                        value={card.slaveAddress}
                        onChange={(e) =>
                          updateCard(
                            card.cardId,
                            "slaveAddress",
                            e.target.value === ""
                              ? ("" as unknown as number)
                              : Number(e.target.value),
                          )
                        }
                        className="w-full mt-1 px-2 py-1 rounded-instrument border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-slate-400"
                        min={1}
                        max={247}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {t("dashboard_function_code")}
                      </label>
                      <select
                        value={card.functionCode}
                        onChange={(e) =>
                          updateCard(
                            card.cardId,
                            "functionCode",
                            Number(e.target.value) as 1 | 2 | 3 | 4,
                          )
                        }
                        className="w-full mt-1 px-2 py-1 rounded-instrument border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-slate-400"
                      >
                        {Object.entries(FC_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {t("dashboard_start_address")}
                      </label>
                      <input
                        type="number"
                        value={card.registerAddress}
                        onChange={(e) =>
                          updateCard(
                            card.cardId,
                            "registerAddress",
                            e.target.value === ""
                              ? ("" as unknown as number)
                              : Number(e.target.value),
                          )
                        }
                        className="w-full mt-1 px-2 py-1 rounded-instrument border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-slate-400"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {t("dashboard_quantity")}
                      </label>
                      <input
                        type="number"
                        value={card.quantity}
                        onChange={(e) =>
                          updateCard(
                            card.cardId,
                            "quantity",
                            e.target.value === ""
                              ? ("" as unknown as number)
                              : Number(e.target.value),
                          )
                        }
                        onBlur={(e) =>
                          updateCard(
                            card.cardId,
                            "quantity",
                            Math.max(1, Number(e.target.value) || 1),
                          )
                        }
                        className="w-full mt-1 px-2 py-1 rounded-instrument border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-slate-400"
                        min={1}
                        max={125}
                      />
                    </div>
                  </div>
                )}

                {/* Card Info (shown when polling) */}
                {polling && (
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-3">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />{" "}
                      {getDeviceDisplayName(card.slaveAddress)}
                    </span>
                    <span>{FC_LABELS[card.functionCode]}</span>
                    <span>Addr: {card.registerAddress}</span>
                    <span>Qty: {card.quantity}</span>
                    {(selectedRegisters[card.cardId]?.size ?? 0) > 0 && (
                      <span className="instrument-accent dark:instrument-accent font-medium">
                        Plotting {selectedRegisters[card.cardId]?.size} reg(s)
                      </span>
                    )}
                  </div>
                )}

                {/* Card Data */}
                <div className="px-4 py-3">
                  {result?.error && (
                    <div className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1 mb-2">
                      <AlertCircle className="w-3 h-3" />
                      {result.error}
                    </div>
                  )}

                  {hasData && result?.data ? (
                    <div className="grid grid-cols-5 gap-1">
                      {result.data.map((val: number, idx: number) => {
                        const isSelected =
                          selectedRegisters[card.cardId]?.has(idx);
                        const colorIdx = isSelected
                          ? [...(selectedRegisters[card.cardId] || [])]
                              .sort()
                              .indexOf(idx)
                          : -1;
                        const borderColor = isSelected
                          ? PLOT_COLORS[colorIdx % PLOT_COLORS.length]
                          : undefined;
                        const regKey = getRegKey(
                          card.slaveAddress,
                          card.functionCode,
                          card.registerAddress,
                          idx,
                        );
                        const regAlias = registerAliases[regKey];
                        const regAddr = card.registerAddress + idx;
                        const isEditing = editingAlias?.regKey === regKey;

                        // Determine what to show in the label area
                        const labelText = regAlias || `Reg ${regAddr}`;

                        return (
                          <div key={idx} className="relative">
                            {isEditing ? (
                              // Edit mode
                              <div className="text-center p-1.5 rounded-instrument border bg-white dark:bg-slate-800 shadow-sm">
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mb-1 truncate">
                                  Reg {regAddr}
                                </div>
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) =>
                                    setEditingValue(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveAlias();
                                    if (e.key === "Escape") cancelEditAlias();
                                  }}
                                  className="w-full px-1 py-0.5 text-xs rounded-instrument border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  placeholder="Alias..."
                                  autoFocus
                                />
                                <div className="flex justify-center gap-1 mt-1">
                                  <button
                                    onClick={saveAlias}
                                    className="p-0.5 rounded-instrument instrument-accent dark:instrument-accent hover:bg-emerald-50 dark:hover:instrument-accent/20"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={cancelEditAlias}
                                    className="p-0.5 rounded-instrument text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Display mode
                              <button
                                onClick={() => {
                                  if (!polling) {
                                    startEditAlias(
                                      card.cardId,
                                      idx,
                                      regKey,
                                      regAlias,
                                    );
                                  } else {
                                    toggleRegisterPlot(card.cardId, idx);
                                  }
                                }}
                                className={`w-full text-center p-1.5 rounded-instrument border transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-50 dark:instrument-accent/20 ring-2 shadow-sm"
                                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                }`}
                                style={
                                  isSelected
                                    ? {
                                        borderColor,
                                        boxShadow: `0 0 0 2px ${borderColor}33`,
                                      }
                                    : {}
                                }
                                title={
                                  polling
                                    ? isSelected
                                      ? `Click to remove Reg ${regAddr} from plot`
                                      : `Click to plot Reg ${regAddr}`
                                    : `Click to set alias for Reg ${regAddr}`
                                }
                              >
                                <div
                                  className={`text-[10px] leading-none mb-0.5 truncate ${regAlias ? "instrument-accent dark:instrument-accent font-medium" : "text-slate-400 dark:text-slate-500"}`}
                                >
                                  {labelText}
                                </div>
                                <div
                                  className={`text-sm font-mono font-medium ${
                                    isSelected
                                      ? "instrument-accent dark:instrument-accent"
                                      : "text-slate-800 dark:text-slate-100"
                                  }`}
                                >
                                  {val}
                                </div>
                                {isSelected && (
                                  <div
                                    className="w-2 h-2 rounded-instrument-full mx-auto mt-1"
                                    style={{ backgroundColor: borderColor }}
                                  />
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : !result?.error ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                      {t("dashboard_no_data")}
                    </p>
                  ) : null}

                  {/* Plot Container - shows when any register is selected */}
                  {(selectedRegisters[card.cardId]?.size ?? 0) > 0 &&
                    plotData[card.cardId] &&
                    plotData[card.cardId].length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={plotData[card.cardId]}
                            margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#E2E8F0"
                            />
                            <XAxis
                              dataKey="time"
                              tick={{ fill: "#64748B", fontSize: 10 }}
                              minTickGap={20}
                            />
                            <YAxis
                              tick={{
                                fill: isDark ? "#94a3b8" : "#64748B",
                                fontSize: 10,
                              }}
                              width={40}
                              domain={["auto", "auto"]}
                            />
                            <RechartsTooltip
                              contentStyle={{
                                borderRadius: "8px",
                                border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                              }}
                              labelStyle={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: isDark ? "#e2e8f0" : "#0F172A",
                                marginBottom: "4px",
                              }}
                            />
                            {[...(selectedRegisters[card.cardId] || [])]
                              .sort()
                              .map((regIdx, i) => {
                                const regKey = getRegKey(
                                  card.slaveAddress,
                                  card.functionCode,
                                  card.registerAddress,
                                  regIdx,
                                );
                                const regAlias = registerAliases[regKey];
                                const regAddr = card.registerAddress + regIdx;
                                const lineName = regAlias || `Reg ${regAddr}`;
                                return (
                                  <Line
                                    key={`reg_${regIdx}`}
                                    type="monotone"
                                    dataKey={`reg_${regIdx}`}
                                    name={lineName}
                                    stroke={PLOT_COLORS[i % PLOT_COLORS.length]}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{
                                      r: 4,
                                      stroke: "#fff",
                                      strokeWidth: 2,
                                    }}
                                    isAnimationActive={false}
                                  />
                                );
                              })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
