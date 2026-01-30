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

export interface ScanRequest {
  port: string;
  baudRate: number;
  parity: 'none' | 'even' | 'odd';
  stopBits: 1 | 2;
  dataBits: 7 | 8;
  startAddress: number;
  endAddress: number;
  timeout: number;
}

export interface ScanResult {
  success: boolean;
  devices: ModbusDevice[];
  scannedCount: number;
  error?: string;
}

export interface ChangeAddressRequest {
  port: string;
  baudRate: number;
  parity: 'none' | 'even' | 'odd';
  stopBits: 1 | 2;
  dataBits: 7 | 8;
  currentAddress: number;
  newAddress: number;
  registerAddress: number;
  functionCode: 6 | 16;  // FC6 = Write Single Register, FC16 = Write Multiple Registers
}

export interface ChangeAddressResult {
  success: boolean;
  oldAddress: number;
  newAddress: number;
  error?: string;
}

export interface ConnectionConfig {
  type: 'serial' | 'tcp';
  port: string; // Used for serial
  baudRate: number; // Used for serial
  dataBits: 7 | 8; // Used for serial
  stopBits: 1 | 2; // Used for serial
  parity: 'none' | 'even' | 'odd'; // Used for serial
  tcpIp?: string; // Used for tcp
  tcpPort?: number; // Used for tcp
}

// Common baud rates
export const BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200] as const;

// Parity options
export const PARITY_OPTIONS = ['none', 'even', 'odd'] as const;

// Stop bits options
export const STOP_BITS_OPTIONS = [1, 2] as const;

// Data bits options
export const DATA_BITS_OPTIONS = [7, 8] as const;

// Function code options for address change
export const FUNCTION_CODE_OPTIONS = [
  { value: 6, label: 'FC 6 - Write Single Register' },
  { value: 16, label: 'FC 16 - Write Multiple Registers' },
] as const;

export interface ReadRange {
  id: string;
  slaveAddress: number;
  functionCode: 1 | 2 | 3 | 4;
  registerAddress: number;
  quantity: number;
}

export interface UILogEntry {
  id: number;
  timestamp: Date;
  address: number;
  values: number[];
  functionCode: number;
}
