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
  port: string;
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
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
