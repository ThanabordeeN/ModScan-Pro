import type { ReadRange, ModbusDevice } from './modbus';

export interface DeviceAlias {
  slaveId: number;
  alias: string;
  description?: string;
  remark?: string;
}

export interface ProjectSettings {
  refreshInterval: number;
  readTimeout: number;
  selectedRegisters?: string[];
}

export interface ProjectConnection {
  type: 'serial' | 'tcp';
  port: string;
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
  tcpIp?: string;
  tcpPort?: number;
}

export interface ScanSettings {
  startAddress: number;
  endAddress: number;
  timeout: number;
}

export interface ProjectData {
  version: number;
  name: string;
  description?: string;
  notes?: string;
  connection: ProjectConnection;
  devices: DeviceAlias[];
  readRanges: ReadRange[];
  settings: ProjectSettings;
  scanSettings?: ScanSettings;
  scannedDevices?: ModbusDevice[];
}

export interface RecentProject {
  name: string;
  filePath: string;
  lastOpened: string;
}
