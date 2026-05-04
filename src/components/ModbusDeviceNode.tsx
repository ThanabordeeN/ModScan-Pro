"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Cpu, Radio } from "lucide-react";
import { useProject } from "@/context/ProjectContext";

export interface ModbusDeviceNodeData {
  address: number;
  responseTime: number;
  label: string;
  isMaster?: boolean;
}

/**
 * Maps response time (ms) to a heatmap color.
 * - Green: Excellent signal (< 100ms)
 * - Yellow/Orange: Medium signal (100–300ms)
 * - Red: Poor signal (> 300ms)
 */
export function getSignalColor(responseTime: number): {
  bg: string;
  border: string;
  text: string;
  dot: string;
} {
  // Ultra high contrast for industrial feel
  if (responseTime < 100) {
    return {
      bg: "bg-app-surface",
      border: "border-instrument-accent",
      text: "text-app-text",
      dot: "bg-instrument-accent",
    };
  }
  if (responseTime < 300) {
    return {
      bg: "bg-app-surface",
      border: "border-app-border",
      text: "text-app-muted",
      dot: "bg-app-muted",
    };
  }
  return {
    bg: "bg-instrument-danger/10",
    border: "border-instrument-danger",
    text: "text-instrument-danger",
    dot: "bg-instrument-danger",
  };
}

function ModbusDeviceNode({ data }: NodeProps<ModbusDeviceNodeData>) {
  const { responseTime, label, isMaster, address } = data;
  const { getDeviceDisplayName } = useProject();

  const displayLabel = isMaster
    ? label
    : address
      ? getDeviceDisplayName(address)
      : label;

  // Style for Master node that adapts to theme
  const colors = isMaster
    ? {
        bg: "bg-app-surface",
        border: "border-instrument-accent",
        text: "text-app-text",
        dot: "bg-instrument-accent",
      }
    : getSignalColor(responseTime);

  return (
    <div
      className={`px-4 py-3 instrument-panel border-[3px] ${colors.bg} ${colors.border} min-w-[160px] shadow-panel transition-all hover:scale-105 active:scale-95`}
    >
      {/* Input handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-app-bg !border-[2px] !border-instrument-accent !rounded-none"
      />

      <div className="flex items-center gap-2 mb-1">
        {isMaster ? (
          <div className="p-1 instrument-panel bg-instrument-accent/10 border border-instrument-accent/30 text-instrument-accent">
            <Radio className="w-4 h-4" />
          </div>
        ) : (
          <div
            className={`p-1 instrument-panel border border-current opacity-70 ${colors.text}`}
          >
            <Cpu className="w-4 h-4" />
          </div>
        )}
        <span className={`text-sm font-bold tracking-tight ${colors.text}`}>
          {displayLabel}
        </span>
      </div>

      {!isMaster && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-app-border/40">
          <span
            className={`inline-block w-2 h-2 ${colors.dot} animate-pulse`}
          />
          <span
            className={`text-[10px] font-mono font-bold uppercase tracking-wider ${colors.text}`}
          >
            {responseTime} ms
          </span>
        </div>
      )}

      {isMaster && (
        <div className="mt-1">
          <span className="text-[9px] font-bold text-instrument-accent uppercase tracking-widest opacity-80">
            Network Controller
          </span>
        </div>
      )}

      {/* Output handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-app-bg !border-[2px] !border-instrument-accent !rounded-none"
      />
    </div>
  );
}

export default memo(ModbusDeviceNode);
