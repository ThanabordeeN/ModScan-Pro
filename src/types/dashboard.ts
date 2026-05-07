import type { DashboardCardConfig } from "@/lib/electron-api";
import type { DecodeFormat, ByteOrder } from "@/lib/modbus-decoder";
import { FORMAT_LABELS, BYTE_ORDER_LABELS, FORMAT_REGISTER_COUNT } from "@/lib/modbus-decoder";

export interface DashboardCard extends DashboardCardConfig {
  name: string;
  decodeFormat?: DecodeFormat;
  byteOrder?: ByteOrder;
}

/** Single-register formats suitable for per-cell display */
export const SINGLE_REGISTER_FORMATS: DecodeFormat[] = [
  "raw", "hex", "binary", "int16", "uint16", "bitfield",
];

/** Multi-register formats that group cells */
export const MULTI_REGISTER_FORMATS: DecodeFormat[] = [
  "int32", "uint32", "float32", "float64",
];

/** All formats available for selection */
export const ALL_DECODE_FORMATS: DecodeFormat[] = [
  ...SINGLE_REGISTER_FORMATS,
  ...MULTI_REGISTER_FORMATS,
  "ascii",
];

export const DECODE_FORMAT_OPTIONS: { value: DecodeFormat; label: string; regCount: number }[] = ALL_DECODE_FORMATS.map(
  (fmt) => ({
    value: fmt,
    label: FORMAT_LABELS[fmt],
    regCount: FORMAT_REGISTER_COUNT[fmt],
  }),
);

export const BYTE_ORDER_OPTIONS: { value: ByteOrder; label: string }[] = (
  Object.keys(BYTE_ORDER_LABELS) as ByteOrder[]
).map((bo) => ({
  value: bo,
  label: BYTE_ORDER_LABELS[bo],
}));

export { FORMAT_LABELS, BYTE_ORDER_LABELS, FORMAT_REGISTER_COUNT };
export type { DecodeFormat, ByteOrder };

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
