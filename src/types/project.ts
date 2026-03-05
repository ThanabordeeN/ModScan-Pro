import type { ReadRange } from './modbus';

export interface DeviceAlias {
  slaveId: number;
  alias: string;
  description?: string;
}

export interface ProjectSettings {
  refreshInterval: number;
  readTimeout: number;
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

export interface ProjectData {
  version: number;
  name: string;
  description?: string;
  connection: ProjectConnection;
  devices: DeviceAlias[];
  readRanges: ReadRange[];
  settings: ProjectSettings;
}

export interface RecentProject {
  name: string;
  filePath: string;
  lastOpened: string;
}
