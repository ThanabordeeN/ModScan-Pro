"use client";

import { useState, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Gauge,
  Hash,
  Info,
  Trash2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import RegisterCell from "@/components/RegisterCell";
import { useProject } from "@/context/ProjectContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  decodeRegisters,
  FORMAT_REGISTER_COUNT,
} from "@/lib/modbus-decoder";
import { getExceptionInfo } from "@/lib/modbus-exceptions";
import {
  DashboardCard,
  PlotDataPoint,
  PLOT_COLORS,
  FC_LABELS,
  getRegKey,
  DECODE_FORMAT_OPTIONS,
  BYTE_ORDER_OPTIONS,
  FORMAT_LABELS,
} from "@/types/dashboard";
import type { DashboardStatus } from "@/lib/electron-api";

interface RegisterCardProps {
  card: DashboardCard;
  result: DashboardStatus["results"][string] | undefined;
  polling: boolean;
  isDark: boolean;
  selectedRegisters: Set<number>;
  plotData: PlotDataPoint[];
  onRemove: () => void;
  onUpdate: (field: keyof DashboardCard, value: string | number) => void;
  onToggleRegisterPlot: (regIdx: number) => void;
  formatTime: (isoStr: string | null) => string;
  getDeviceDisplayName: (slaveId: number) => string;
}

export default function RegisterCard({
  card,
  result,
  polling,
  isDark,
  selectedRegisters,
  plotData,
  onRemove,
  onUpdate,
  onToggleRegisterPlot,
  formatTime,
  getDeviceDisplayName,
}: RegisterCardProps) {
  const { t, language } = useLanguage();
  const { registerAliases, setRegisterAliases } = useProject();

  const [editingAlias, setEditingAlias] = useState<{
    regIndex: number;
    regKey: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const decodeFormat = card.decodeFormat || "raw";
  const byteOrder = card.byteOrder || "ABCD";
  const regCount = FORMAT_REGISTER_COUNT[decodeFormat];

  const hasData = result?.success && result.data && result.data.length > 0;

  // Decode all register values into cell display data
  interface CellData {
    val: number;
    regIdx: number;
    regAddr: number;
    displayValue: string;
    formatBadge?: string;
    regSpan?: number;
  }

  const cellData: CellData[] = useMemo(() => {
    if (!hasData || !result?.data) return [];
    const data = result.data;
    const cells: CellData[] = [];

    if (regCount === 1) {
      // Single-register format: one cell per register
      for (let i = 0; i < data.length; i++) {
        const decoded = decodeRegisters([data[i]], decodeFormat, byteOrder);
        cells.push({
          val: data[i],
          regIdx: i,
          regAddr: card.registerAddress + i,
          displayValue: decoded.display,
          formatBadge: decodeFormat !== "raw" ? FORMAT_LABELS[decodeFormat]?.replace(/^\w+\s/, "") : undefined,
        });
      }
    } else {
      // Multi-register format: group registers into chunks
      for (let i = 0; i < data.length; i += regCount) {
        const chunk = data.slice(i, i + regCount);
        if (chunk.length < regCount) {
          // Partial final chunk — show raw values
          for (let j = 0; j < chunk.length; j++) {
            cells.push({
              val: chunk[j],
              regIdx: i + j,
              regAddr: card.registerAddress + i + j,
              displayValue: String(chunk[j]),
            });
          }
          break;
        }
        const decoded = decodeRegisters(chunk, decodeFormat, byteOrder);
        cells.push({
          val: chunk[0],
          regIdx: i,
          regAddr: card.registerAddress + i,
          displayValue: decoded.display,
          formatBadge: decodeFormat !== "raw" ? FORMAT_LABELS[decodeFormat]?.replace(/^\w+\s/, "") : undefined,
          regSpan: regCount,
        });
      }
    }
    return cells;
  }, [hasData, result?.data, decodeFormat, byteOrder, card.registerAddress, regCount]);

  const startEditAlias = (regIndex: number, regKey: string, currentAlias?: string) => {
    setEditingAlias({ regIndex, regKey });
    setEditingValue(currentAlias || "");
  };

  const saveAlias = () => {
    if (editingAlias) {
      setRegisterAliases({ ...registerAliases, [editingAlias.regKey]: editingValue.trim() });
      setEditingAlias(null);
      setEditingValue("");
    }
  };

  const cancelEditAlias = () => {
    setEditingAlias(null);
    setEditingValue("");
  };

  const exceptionInfo =
    result?.isException && result.exceptionCode != null
      ? getExceptionInfo(result.exceptionCode, language)
      : undefined;

  // Format a compact exception string
  const formatException = () => {
    if (!result?.error) return null;
    if (result.isException && result.exceptionCode != null) {
      const code = `0x${result.exceptionCode.toString(16).toUpperCase().padStart(2, "0")}`;
      const name = exceptionInfo?.name || result.exceptionName || "Unknown Exception";
      return `Modbus Exception ${code} — ${name}`;
    }
    if (result.isException && result.exceptionName) {
      return `Modbus Exception — ${result.exceptionName}`;
    }
    return result.error;
  };

  return (
    <div className="instrument-panel border border-slate-200 dark:border-slate-700 overflow-hidden">
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
              onChange={(e) => onUpdate("name", e.target.value)}
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
              onClick={onRemove}
              className="p-1 rounded-instrument hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title={t("dashboard_remove_card")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Config Form (editable when not polling) */}
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
                onUpdate(
                  "slaveAddress",
                  e.target.value === "" ? ("" as unknown as number) : Number(e.target.value),
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
                onUpdate("functionCode", Number(e.target.value) as 1 | 2 | 3 | 4)
              }
              className="w-full mt-1 px-2 py-1 rounded-instrument border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-slate-400"
            >
              {Object.entries(FC_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
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
                onUpdate(
                  "registerAddress",
                  e.target.value === "" ? ("" as unknown as number) : Number(e.target.value),
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
                onUpdate(
                  "quantity",
                  e.target.value === "" ? ("" as unknown as number) : Number(e.target.value),
                )
              }
              onBlur={(e) =>
                onUpdate("quantity", Math.max(1, Number(e.target.value) || 1))
              }
              className="w-full mt-1 px-2 py-1 rounded-instrument border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-slate-400"
              min={1}
              max={125}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Decode Format
            </label>
            <select
              value={decodeFormat}
              onChange={(e) => onUpdate("decodeFormat", e.target.value)}
              className="w-full mt-1 px-2 py-1 rounded-instrument border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-slate-400"
            >
              {DECODE_FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Byte Order
            </label>
            <select
              value={byteOrder}
              onChange={(e) => onUpdate("byteOrder", e.target.value)}
              className="w-full mt-1 px-2 py-1 rounded-instrument border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-slate-400"
            >
              {BYTE_ORDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Info Bar (shown when polling) */}
      {polling && (
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-3">
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3" /> {getDeviceDisplayName(card.slaveAddress)}
          </span>
          <span>{FC_LABELS[card.functionCode]}</span>
          <span>Addr: {card.registerAddress}</span>
          <span>Qty: {card.quantity}</span>
          {decodeFormat !== "raw" && (
            <span className="flex items-center gap-1 text-indigo-500 dark:text-indigo-400 font-medium">
              <Info className="w-3 h-3" />
              {FORMAT_LABELS[decodeFormat]}
              {regCount > 1 && ` (${byteOrder})`}
            </span>
          )}
          {result?.latencyMs != null && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono">
              <Gauge className="w-3 h-3" />
              {result.latencyMs}ms
            </span>
          )}
          {selectedRegisters.size > 0 && (
            <span className="instrument-accent dark:instrument-accent font-medium">
              Plotting {selectedRegisters.size} reg(s)
            </span>
          )}
        </div>
      )}

      {/* Register Data Grid */}
      <div className="px-4 py-3">
        {result?.error && (
          <div className="text-xs flex flex-col gap-1 mb-2">
            <div className="text-red-500 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {formatException()}
            </div>
            {result.isException && result.exceptionCode != null && (
              <div className="text-red-400/70 dark:text-red-400/60 pl-4 font-mono">
                Exception Code: 0x{result.exceptionCode.toString(16).toUpperCase().padStart(2, '0')}
              </div>
            )}
            {exceptionInfo && (
              <div className="pl-4 mt-1 space-y-1 text-[11px] text-red-500/80 dark:text-red-300/80">
                <div>
                  <span className="font-semibold">
                    {language === "th" ? "ความหมาย:" : "Meaning:"}
                  </span>{" "}
                  {exceptionInfo.description}
                </div>
                <div>
                  <span className="font-semibold">
                    {language === "th" ? "สาเหตุที่เป็นไปได้:" : "Possible cause:"}
                  </span>{" "}
                  {exceptionInfo.possibleCause}
                </div>
              </div>
            )}
          </div>
        )}

        {cellData.length > 0 ? (
          <div className="grid grid-cols-5 gap-1">
            {cellData.map((cell) => {
              const isSelected = selectedRegisters.has(cell.regIdx);
              const colorIdx = isSelected
                ? [...selectedRegisters].sort().indexOf(cell.regIdx)
                : -1;
              const borderColor = isSelected
                ? PLOT_COLORS[colorIdx % PLOT_COLORS.length]
                : undefined;
              const regKey = getRegKey(
                card.slaveAddress,
                card.functionCode,
                card.registerAddress,
                cell.regIdx,
              );
              const regAlias = registerAliases[regKey];
              const isEditing = editingAlias?.regIndex === cell.regIdx;

              return (
                <RegisterCell
                  key={cell.regIdx}
                  val={cell.val}
                  regAddr={cell.regAddr}
                  regAlias={regAlias}
                  isSelected={isSelected}
                  borderColor={borderColor}
                  polling={polling}
                  isEditing={isEditing}
                  editingValue={editingValue}
                  displayValue={cell.displayValue}
                  formatBadge={cell.formatBadge}
                  regSpan={cell.regSpan}
                  onTogglePlot={() => onToggleRegisterPlot(cell.regIdx)}
                  onStartEdit={() => startEditAlias(cell.regIdx, regKey, regAlias)}
                  onSaveAlias={saveAlias}
                  onCancelEdit={cancelEditAlias}
                  onEditingValueChange={setEditingValue}
                />
              );
            })}
          </div>
        ) : !result?.error ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
            {t("dashboard_no_data")}
          </p>
        ) : null}

        {/* Plot */}
        {selectedRegisters.size > 0 && plotData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={plotData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? "#334155" : "#E2E8F0"}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fill: isDark ? "#94a3b8" : "#64748B", fontSize: 10 }}
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fill: isDark ? "#94a3b8" : "#64748B", fontSize: 10 }}
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
                {[...selectedRegisters].sort().map((regIdx, i) => {
                  const regKey = getRegKey(
                    card.slaveAddress,
                    card.functionCode,
                    card.registerAddress,
                    regIdx,
                  );
                  const lineName = registerAliases[regKey] || `Reg ${card.registerAddress + regIdx}`;
                  return (
                    <Line
                      key={`reg_${regIdx}`}
                      type="monotone"
                      dataKey={`reg_${regIdx}`}
                      name={lineName}
                      stroke={PLOT_COLORS[i % PLOT_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
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
}
