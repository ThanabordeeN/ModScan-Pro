// All TypeScript interfaces and types for the Electron IPC API bridge.
// Imported by src/lib/electron-api.ts (implementation) and by consumers that need types only.

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  vendorId?: string;
  productId?: string;
}

export interface ModbusDevice {
  address: number;
  responseTime: number;
  holdingRegisters?: number[];
}

export interface ConnectionConfig {
  type?: "serial" | "tcp";
  port?: string;
  baudRate?: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: "none" | "even" | "odd";
  tcpIp?: string;
  tcpPort?: number;
}

export interface ScanConfig extends ConnectionConfig {
  startAddress: number;
  endAddress: number;
  timeout?: number;
}

export interface ReadConfig extends ConnectionConfig {
  slaveAddress: number;
  functionCode: 1 | 2 | 3 | 4;
  registerAddress: number;
  quantity: number;
  timeout?: number;
}

export interface WriteConfig extends ConnectionConfig {
  slaveAddress: number;
  functionCode: 5 | 6 | 15 | 16;
  address: number;
  value?: number;
  values?: number[];
  coilValue?: boolean;
  coilValues?: boolean[];
  timeout?: number;
}

export interface BatchReadRequest {
  slaveAddress: number;
  functionCode: 1 | 2 | 3 | 4;
  registerAddress: number;
  quantity: number;
}

export interface BatchReadConfig extends ConnectionConfig {
  requests: BatchReadRequest[];
  timeout?: number;
}

export interface BatchReadResult {
  success: boolean;
  data?: number[];
  error?: string;
  latencyMs?: number;
  exceptionCode?: number;
  exceptionName?: string;
  isException?: boolean;
}

export interface ChangeAddressConfig extends ConnectionConfig {
  currentAddress: number;
  newAddress: number;
  registerAddress?: number;
  functionCode?: 6 | 16;
  timeout?: number;
}

export interface LogEntry {
  timestamp: number;
  slaveId: number;
  address: number;
  value: number;
  fc: number;
}

export interface DashboardCardConfig {
  cardId: string;
  slaveAddress: number;
  functionCode: 1 | 2 | 3 | 4;
  registerAddress: number;
  quantity: number;
}

export interface DashboardStartConfig {
  cards: DashboardCardConfig[];
  connectionConfig: ConnectionConfig;
  interval?: number;
  timeout?: number;
}

export interface DashboardUpdateConfig {
  cards?: DashboardCardConfig[];
  connectionConfig?: ConnectionConfig;
  interval?: number;
  timeout?: number;
}

export interface DashboardCardResult {
  success: boolean;
  data: number[] | null;
  error: string | null;
  lastUpdated: string | null;
  latencyMs?: number;
  exceptionCode?: number;
  exceptionName?: string;
  isException?: boolean;
}

export interface DashboardStatus {
  running: boolean;
  interval: number;
  cards: DashboardCardConfig[];
  results: Record<string, DashboardCardResult>;
}

export type UpdateStatus =
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "ready"
  | "error";

export interface UpdateInfo {
  status: UpdateStatus;
  version?: string;
  releaseNotes?: string;
  error?: string;
}

export interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}
