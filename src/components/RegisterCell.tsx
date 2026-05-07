"use client";

import { Check, X, Pencil } from "lucide-react";

interface RegisterCellProps {
  val: number;
  regAddr: number;
  regAlias: string | undefined;
  isSelected: boolean;
  borderColor: string | undefined;
  polling: boolean;
  isEditing: boolean;
  editingValue: string;
  /** Decoded display string (e.g., "0x0042", "50.0", "-1") */
  displayValue?: string;
  /** Format label badge shown below value */
  formatBadge?: string;
  /** Number of registers this cell spans (for multi-register formats) */
  regSpan?: number;
  onTogglePlot: () => void;
  onStartEdit: () => void;
  onSaveAlias: () => void;
  onCancelEdit: () => void;
  onEditingValueChange: (v: string) => void;
}

export default function RegisterCell({
  val,
  regAddr,
  regAlias,
  isSelected,
  borderColor,
  polling,
  isEditing,
  editingValue,
  displayValue,
  formatBadge,
  regSpan,
  onTogglePlot,
  onStartEdit,
  onSaveAlias,
  onCancelEdit,
  onEditingValueChange,
}: RegisterCellProps) {
  const labelText = regAlias || `Reg ${regAddr}`;
  const showValue = displayValue !== undefined ? displayValue : String(val);

  if (isEditing) {
    return (
      <div className="text-center p-1.5 rounded-instrument border bg-white dark:bg-slate-800 shadow-sm">
        <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mb-1 truncate">
          Reg {regAddr}
        </div>
        <input
          type="text"
          value={editingValue}
          onChange={(e) => onEditingValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveAlias();
            if (e.key === "Escape") onCancelEdit();
          }}
          className="w-full px-1 py-0.5 text-xs rounded-instrument border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Alias..."
          autoFocus
        />
        <div className="flex justify-center gap-1 mt-1">
          <button
            onClick={onSaveAlias}
            className="p-0.5 rounded-instrument instrument-accent dark:instrument-accent hover:bg-emerald-50"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={onCancelEdit}
            className="p-0.5 rounded-instrument text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  const wrapperStyle: React.CSSProperties = {
    ...(isSelected ? { borderColor, boxShadow: `0 0 0 2px ${borderColor}33` } : {}),
    ...(regSpan && regSpan > 1 ? { gridColumn: `span ${regSpan}` } : {}),
  };

  return (
    <div
      className={`relative group w-full text-center p-1.5 rounded-instrument border transition-all ${
        isSelected
          ? "bg-emerald-50 dark:bg-emerald-900/20 ring-2 shadow-sm"
          : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700"
      }`}
      style={wrapperStyle}
    >
      {/* Pencil icon — always available, hover to reveal */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStartEdit();
        }}
        className="absolute top-0.5 right-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 z-10"
        title={`Rename Reg ${regAddr}`}
      >
        <Pencil className="w-2.5 h-2.5" />
      </button>

      {/* Main clickable area — toggle plot when polling */}
      <button
        onClick={polling ? onTogglePlot : undefined}
        className={`w-full ${polling ? "cursor-pointer" : "cursor-default"}`}
        title={
          polling
            ? isSelected
              ? `Remove Reg ${regAddr} from plot`
              : `Plot Reg ${regAddr}`
            : `Hover and click ✏️ to rename`
        }
      >
        <div
          className={`text-[10px] leading-none mb-0.5 truncate ${
            regAlias
              ? "instrument-accent dark:instrument-accent font-medium"
              : "text-slate-500 dark:text-slate-300"
          }`}
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
          {showValue}
        </div>
        {formatBadge && (
          <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-sans">
            {formatBadge}
          </div>
        )}
        <div
          className={`w-2 h-2 rounded-instrument-full mx-auto mt-1 ${isSelected ? "" : "invisible"}`}
          style={{ backgroundColor: isSelected ? borderColor : undefined }}
        />
      </button>
    </div>
  );
}
