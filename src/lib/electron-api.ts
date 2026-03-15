import type { ProjectData, RecentProject } from '@/types/project';

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
}

export interface DashboardStatus {
  running: boolean;
  interval: number;
  cards: DashboardCardConfig[];
  results: Record<string, DashboardCardResult>;
}

export type UpdateStatus = 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error';

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
    windowId: string;
    window: {
      openNew: (projectFilePath?: string) => Promise<{ success: boolean; windowId?: string }>;
      setTitle: (title: string) => Promise<{ success: boolean }>;
    };
    serial: {
      listPorts: () => Promise<{ success: boolean; ports?: SerialPortInfo[]; error?: string }>;
    };
    modbus: {
      scan: (config: ScanConfig) => Promise<{ success: boolean; devices?: ModbusDevice[]; scannedCount?: number; error?: string }>;
      scanCancel: () => Promise<{ success: boolean }>;
      onScanProgress: (callback: (progress: number) => void) => void;
      removeScanProgress: () => void;
      onScanFound: (callback: (device: ModbusDevice) => void) => void;
      removeScanFound: () => void;
      read: (config: ReadConfig) => Promise<{ success: boolean; data?: number[]; error?: string }>;
      write: (config: WriteConfig) => Promise<{ success: boolean; error?: string }>;
      readBatch: (config: BatchReadConfig) => Promise<{ results: Array<{ success: boolean; data?: number[]; error?: string }>; error?: string }>;
      changeAddress: (config: ChangeAddressConfig) => Promise<{ success: boolean; message?: string; warning?: string; error?: string }>;
      dashboardStart: (config: DashboardStartConfig) => Promise<{ success: boolean; error?: string }>;
      dashboardStop: () => Promise<{ success: boolean }>;
      dashboardUpdate: (config: DashboardUpdateConfig) => Promise<{ success: boolean }>;
      dashboardStatus: () => Promise<DashboardStatus>;
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
    logger: {
      start: () => Promise<{ success: boolean; filePath?: string; cancelled?: boolean; error?: string }>;
      log: (entries: LogEntry[]) => Promise<{ success: boolean; error?: string }>;
      stop: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
    };
    project: {
      save: (data: Omit<ProjectData, 'version'>) => Promise<{ success: boolean; filePath?: string; cancelled?: boolean; error?: string }>;
      load: () => Promise<{ success: boolean; data?: ProjectData; filePath?: string; cancelled?: boolean; error?: string }>;
      loadPath: (filePath: string) => Promise<{ success: boolean; data?: ProjectData; filePath?: string; error?: string }>;
      recent: () => Promise<{ success: boolean; projects?: RecentProject[]; error?: string }>;
    };
    update: {
      check: () => Promise<{ success: boolean; error?: string }>;
      download: () => Promise<{ success: boolean; error?: string }>;
      install: () => Promise<{ success: boolean; error?: string }>;
      onStatus: (callback: (info: UpdateInfo) => void) => void;
      onProgress: (callback: (progress: UpdateProgress) => void) => void;
      removeListeners: () => void;
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

  onScanFound(callback: (device: ModbusDevice) => void) {
    const api = getElectronAPI();
    if (api) {
      api.modbus.onScanFound(callback);
    }
  },

  removeScanFound() {
    const api = getElectronAPI();
    if (api) {
      api.modbus.removeScanFound();
    }
  },

  async scanCancel(): Promise<{ success: boolean }> {
    const api = getElectronAPI();
    if (api) {
      return api.modbus.scanCancel();
    }
    return { success: false };
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

  async changeAddress(config: ChangeAddressConfig): Promise<{ success: boolean; message?: string; warning?: string; error?: string }> {
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

// Dashboard Polling API
export const dashboardAPI = {
  async start(config: DashboardStartConfig): Promise<{ success: boolean; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.modbus.dashboardStart(config);
    }
    const res = await fetch('/api/modbus/dashboard-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  async stop(): Promise<{ success: boolean }> {
    const api = getElectronAPI();
    if (api) {
      return api.modbus.dashboardStop();
    }
    const res = await fetch('/api/modbus/dashboard-stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  async update(config: DashboardUpdateConfig): Promise<{ success: boolean }> {
    const api = getElectronAPI();
    if (api) {
      return api.modbus.dashboardUpdate(config);
    }
    const res = await fetch('/api/modbus/dashboard-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  async status(): Promise<DashboardStatus> {
    const api = getElectronAPI();
    if (api) {
      return api.modbus.dashboardStatus();
    }
    const res = await fetch('/api/modbus/dashboard-status');
    return res.json();
  },
};

// Logger API
export const loggerAPI = {
  async start(): Promise<{ success: boolean; filePath?: string; cancelled?: boolean; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.logger.start();
    }
    return { success: false, error: 'Logger not available in web mode' };
  },

  async log(entries: LogEntry[]): Promise<{ success: boolean; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.logger.log(entries);
    }
    return { success: false, error: 'Logger not available in web mode' };
  },

  async stop(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.logger.stop();
    }
    return { success: false, error: 'Logger not available in web mode' };
  },
};

// Project API
export const projectAPI = {
  async save(data: Omit<ProjectData, 'version'>): Promise<{ success: boolean; filePath?: string; cancelled?: boolean; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.project.save(data);
    }
    // Web fallback: trigger browser file download + save to localStorage
    try {
      const projectData: ProjectData = { version: 1, ...data };
      // Save to localStorage for recent projects tracking
      const projects: ProjectData[] = JSON.parse(localStorage.getItem('modscan_projects') || '[]');
      const existing = projects.findIndex((p) => p.name === data.name);
      if (existing >= 0) {
        projects[existing] = projectData;
      } else {
        projects.push(projectData);
      }
      localStorage.setItem('modscan_projects', JSON.stringify(projects));

      // Trigger browser file download
      const json = JSON.stringify(projectData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.name.replace(/[^a-zA-Z0-9_\-\s]/g, '')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true, filePath: a.download };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to save project' };
    }
  },

  async load(): Promise<{ success: boolean; data?: ProjectData; filePath?: string; cancelled?: boolean; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.project.load();
    }
    // Web fallback: use a hidden file input to let user pick a .json file
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve({ success: false, cancelled: true });
          return;
        }
        try {
          const text = await file.text();
          const data = JSON.parse(text) as ProjectData;
          if (!data.version || !data.name || !data.connection || !Array.isArray(data.devices) || !Array.isArray(data.readRanges) || !data.settings) {
            resolve({ success: false, error: 'Invalid project file format' });
            return;
          }
          // Save to localStorage recent list
          const projects: ProjectData[] = JSON.parse(localStorage.getItem('modscan_projects') || '[]');
          const existing = projects.findIndex((p) => p.name === data.name);
          if (existing >= 0) {
            projects[existing] = data;
          } else {
            projects.push(data);
          }
          localStorage.setItem('modscan_projects', JSON.stringify(projects));
          resolve({ success: true, data, filePath: file.name });
        } catch {
          resolve({ success: false, error: 'Failed to read project file' });
        }
      };
      input.oncancel = () => {
        resolve({ success: false, cancelled: true });
      };
      input.click();
    });
  },

  async loadPath(filePath: string): Promise<{ success: boolean; data?: ProjectData; filePath?: string; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.project.loadPath(filePath);
    }
    // Web fallback: load from localStorage by name (filePath is used as name)
    try {
      const projects: ProjectData[] = JSON.parse(localStorage.getItem('modscan_projects') || '[]');
      const project = projects.find((p) => p.name === filePath);
      if (project) {
        return { success: true, data: project, filePath };
      }
      return { success: false, error: 'Project not found' };
    } catch {
      return { success: false, error: 'Failed to load project' };
    }
  },

  async recent(): Promise<{ success: boolean; projects?: RecentProject[]; error?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.project.recent();
    }
    // Fallback: list from localStorage
    try {
      const projects: ProjectData[] = JSON.parse(localStorage.getItem('modscan_projects') || '[]');
      const recentList: RecentProject[] = projects.map((p) => ({
        name: p.name,
        filePath: p.name, // In web mode, name acts as the key
        lastOpened: new Date().toISOString(),
      }));
      return { success: true, projects: recentList };
    } catch {
      return { success: true, projects: [] };
    }
  },
};

// Update API
export const updateAPI = {
  async check(): Promise<{ success: boolean; error?: string }> {
    const api = getElectronAPI();
    if (api) return api.update.check();
    return { success: false, error: 'Update not available in web mode' };
  },

  async download(): Promise<{ success: boolean; error?: string }> {
    const api = getElectronAPI();
    if (api) return api.update.download();
    return { success: false, error: 'Update not available in web mode' };
  },

  async install(): Promise<{ success: boolean; error?: string }> {
    const api = getElectronAPI();
    if (api) return api.update.install();
    return { success: false, error: 'Update not available in web mode' };
  },

  onStatus(callback: (info: UpdateInfo) => void) {
    const api = getElectronAPI();
    if (api) api.update.onStatus(callback);
  },

  onProgress(callback: (progress: UpdateProgress) => void) {
    const api = getElectronAPI();
    if (api) api.update.onProgress(callback);
  },

  removeListeners() {
    const api = getElectronAPI();
    if (api) api.update.removeListeners();
  },
};

// Window management API
export const windowAPI = {
  async openNew(projectFilePath?: string): Promise<{ success: boolean; windowId?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.window.openNew(projectFilePath);
    }
    // Web fallback: open in new tab
    const url = projectFilePath ? `/?project=${encodeURIComponent(projectFilePath)}` : '/';
    window.open(url, '_blank');
    return { success: true };
  },

  async setTitle(title: string): Promise<{ success: boolean }> {
    const api = getElectronAPI();
    if (api) {
      return api.window.setTitle(title);
    }
    // Web fallback
    document.title = title ? `${title} — ModScan Pro` : 'ModScan Pro';
    return { success: true };
  },

  getWindowId(): string {
    const api = getElectronAPI();
    return api?.windowId || 'default';
  },
};
