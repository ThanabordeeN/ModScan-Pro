const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Serial port operations
  serial: {
    listPorts: () => ipcRenderer.invoke('serial:list-ports'),
  },

  // Modbus operations
  modbus: {
    scan: (config) => ipcRenderer.invoke('modbus:scan', config),
    onScanProgress: (callback) => ipcRenderer.on('modbus:scan-progress', (_event, value) => callback(value)),
    removeScanProgress: () => ipcRenderer.removeAllListeners('modbus:scan-progress'),
    read: (config) => ipcRenderer.invoke('modbus:read', config),
    write: (config) => ipcRenderer.invoke('modbus:write', config),
    readBatch: (config) => ipcRenderer.invoke('modbus:read-batch', config),
    changeAddress: (config) => ipcRenderer.invoke('modbus:change-address', config),
    dashboardStart: (config) => ipcRenderer.invoke('modbus:dashboard-start', config),
    dashboardStop: () => ipcRenderer.invoke('modbus:dashboard-stop'),
    dashboardUpdate: (config) => ipcRenderer.invoke('modbus:dashboard-update', config),
    dashboardStatus: () => ipcRenderer.invoke('modbus:dashboard-status'),
  },

  // License operations
  license: {
    getMachineId: () => ipcRenderer.invoke('license:get-machine-id'),
    activate: (serialKey) => ipcRenderer.invoke('license:activate', serialKey),
    check: () => ipcRenderer.invoke('license:check'),
  },

  // Tunnel operations
  tunnel: {
    control: (data) => ipcRenderer.invoke('tunnel:control', data),
    status: () => ipcRenderer.invoke('tunnel:status'),
    login: (data) => ipcRenderer.invoke('tunnel:login', data),
  },

  // Logger operations
  logger: {
    start: () => ipcRenderer.invoke('logger:start'),
    log: (entries) => ipcRenderer.invoke('logger:log', entries),
    stop: () => ipcRenderer.invoke('logger:stop'),
  },

  // Project operations
  project: {
    save: (data) => ipcRenderer.invoke('project:save', data),
    load: () => ipcRenderer.invoke('project:load'),
    loadPath: (filePath) => ipcRenderer.invoke('project:load-path', filePath),
    recent: () => ipcRenderer.invoke('project:recent'),
  },

  // Utility
  isElectron: true,
});
