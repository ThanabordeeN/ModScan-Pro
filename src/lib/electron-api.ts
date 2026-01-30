/**
 * Electron API wrapper for frontend components
 * Provides type-safe access to IPC methods exposed via preload script
 */

// Type definitions
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
  type?: 'serial' | 'tcp';
  port?: string;
  baudRate?: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
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

export interface ChangeAddressConfig extends ConnectionConfig {
  currentAddress: number;
  newAddress: number;
  registerAddress?: number;
  functionCode?: 6 | 16;
  timeout?: number;
}

// Check if running in Electron
export function isElectron(): boolean {
  return typeof window !== 'undefined' &&
    'electronAPI' in window &&
    (window as ElectronWindow).electronAPI?.isElectron === true;
}

// Type for window with electronAPI
interface ElectronWindow extends Window {
  electronAPI?: {
    isElectron: boolean;
    serial: {
      listPorts: () => Promise<{ success: boolean; ports?: SerialPortInfo[]; error?: string }>;
    };
    modbus: {
      scan: (config: ScanConfig) => Promise<{ success: boolean; devices?: ModbusDevice[]; scannedCount?: number; error?: string }>;
      onScanProgress: (callback: (progress: number) => void) => void;
      removeScanProgress: () => void;
      read: (config: ReadConfig) => Promise<{ success: boolean; data?: number[]; error?: string }>;
      write: (config: WriteConfig) => Promise<{ success: boolean; error?: string }>;
      readBatch: (config: BatchReadConfig) => Promise<{ results: Array<{ success: boolean; data?: number[]; error?: string }>; error?: string }>;
      changeAddress: (config: ChangeAddressConfig) => Promise<{ success: boolean; error?: string }>;
    };
    license: {
      getMachineId: () => Promise<{ success: boolean; machineId?: string; error?: string }>;
      activate: (serialKey: string) => Promise<{ success: boolean; valid?: boolean; machineId?: string; error?: string }>;
      check: () => Promise<{ success: boolean; valid?: boolean; machineId?: string; error?: string }>;
    };
    tunnel: {
      control: (data: { action: 'start' | 'stop'; password?: string }) => Promise<{ success: boolean; url?: string; error?: string }>;
      status: () => Promise<{ isActive: boolean; url: string | null }>;
      login: (data: { password: string }) => Promise<{ success: boolean; error?: string }>;
    };
  };
}

// Helper to get the electron API
function getElectronAPI(): ElectronWindow['electronAPI'] | null {
  if (isElectron()) {
    return (window as ElectronWindow).electronAPI || null;
  }
  return null;
}

// Serial API
export const serialAPI = {
  async listPorts(): Promise<{ success: boolean; ports?: SerialPortInfo[]; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.serial.listPorts();
    }
    // Fallback to HTTP API
    const res = await fetch('/api/serial');
    return res.json();
  },
};

// Modbus API
export const modbusAPI = {
  async scan(config: ScanConfig): Promise<{ success: boolean; devices?: ModbusDevice[]; scannedCount?: number; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.modbus.scan(config);
    }
    const res = await fetch('/api/modbus/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  onScanProgress(callback: (progress: number) => void) {
    const api = getElectronAPI();
    if (api) {
      api.modbus.onScanProgress(callback);
    }
  },

  removeScanProgress() {
    const api = getElectronAPI();
    if (api) {
      api.modbus.removeScanProgress();
    }
  },

  async read(config: ReadConfig): Promise<{ success: boolean; data?: number[]; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.modbus.read(config);
    }
    const res = await fetch('/api/modbus/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  async write(config: WriteConfig): Promise<{ success: boolean; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.modbus.write(config);
    }
    const res = await fetch('/api/modbus/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  async readBatch(config: BatchReadConfig): Promise<{ results: Array<{ success: boolean; data?: number[]; error?: string }>; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.modbus.readBatch(config);
    }
    const res = await fetch('/api/modbus/read-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  async changeAddress(config: ChangeAddressConfig): Promise<{ success: boolean; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.modbus.changeAddress(config);
    }
    const res = await fetch('/api/modbus/change-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },
};

// License API
export const licenseAPI = {
  async getMachineId(): Promise<{ success: boolean; machineId?: string; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.license.getMachineId();
    }
    // Fallback - get from license check
    const res = await fetch('/api/license');
    const data = await res.json();
    return { success: true, machineId: data.machineId };
  },

  async check(): Promise<{ success: boolean; valid?: boolean; machineId?: string; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.license.check();
    }
    const res = await fetch('/api/license');
    return res.json();
  },

  async activate(licenseKey: string): Promise<{ success: boolean; valid?: boolean; machineId?: string; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.license.activate(licenseKey);
    }
    const res = await fetch('/api/license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey }),
    });
    return res.json();
  },
};

// Tunnel API
export const tunnelAPI = {
  async control(action: 'start' | 'stop', password?: string): Promise<{ success: boolean; url?: string; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.tunnel.control({ action, password });
    }
    const res = await fetch('/api/tunnel/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, password }),
    });
    return res.json();
  },

  async status(): Promise<{ isActive: boolean; url: string | null }> {
    const api = getElectronAPI();
    if (api) {
      return api.tunnel.status();
    }
    const res = await fetch('/api/tunnel/control');
    return res.json();
  },

  async login(password: string): Promise<{ success: boolean; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.tunnel.login({ password });
    }
    const res = await fetch('/api/tunnel/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return res.json();
  },
};
