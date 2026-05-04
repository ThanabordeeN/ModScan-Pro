import type { DashboardCardConfig } from "@/lib/electron-api";

export interface DashboardCard extends DashboardCardConfig {
  name: string;
}

export interface PlotDataPoint {
  time: string;
  [key: string]: string | number;
}

export const PLOT_COLORS = [
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

export const FC_LABELS: Record<number, string> = {
  1: "FC01 - Coils",
  2: "FC02 - Discrete Inputs",
  3: "FC03 - Holding Registers",
  4: "FC04 - Input Registers",
};

export const INTERVAL_OPTIONS = [
  { value: 500, label: "500ms" },
  { value: 1000, label: "1s" },
  { value: 2000, label: "2s" },
  { value: 5000, label: "5s" },
  { value: 10000, label: "10s" },
  { value: 30000, label: "30s" },
];

/** Generates a stable lookup key for a register alias. Format: "{slaveId}-{fc}-{startAddr}-{regIndex}" */
export function getRegKey(
  slaveId: number,
  functionCode: number,
  regStartAddr: number,
  regIndex: number,
): string {
  return `${slaveId}-${functionCode}-${regStartAddr}-${regIndex}`;
}
