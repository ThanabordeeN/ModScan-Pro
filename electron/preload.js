const { contextBridge, ipcRenderer } = require('electron');

// Extract windowId from command line arguments
const windowIdArg = process.argv.find(arg => arg.startsWith('--window-id='));
const windowId = windowIdArg ? windowIdArg.split('=')[1] : 'default';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window ID for this renderer
  windowId,

  // Window management
  window: {
    openNew: (projectFilePath) => ipcRenderer.invoke('window:new', projectFilePath),
    setTitle: (title) => ipcRenderer.invoke('window:set-title', title),
  },

  // Serial port operations
  serial: {
    listPorts: () => ipcRenderer.invoke('serial:list-ports'),
  },

  // Modbus operations
  modbus: {
    scan: (config) => ipcRenderer.invoke('modbus:scan', { ...config, _windowId: windowId }),
    scanCancel: () => ipcRenderer.invoke('modbus:scan-cancel', windowId),
    onScanProgress: (callback) => ipcRenderer.on(`modbus:scan-progress:${windowId}`, (_event, value) => callback(value)),
    removeScanProgress: () => ipcRenderer.removeAllListeners(`modbus:scan-progress:${windowId}`),
    onScanFound: (callback) => ipcRenderer.on(`modbus:scan-found:${windowId}`, (_event, device) => callback(device)),
    removeScanFound: () => ipcRenderer.removeAllListeners(`modbus:scan-found:${windowId}`),
    read: (config) => ipcRenderer.invoke('modbus:read', config),
    write: (config) => ipcRenderer.invoke('modbus:write', config),
    readBatch: (config) => ipcRenderer.invoke('modbus:read-batch', config),
    changeAddress: (config) => ipcRenderer.invoke('modbus:change-address', config),
    dashboardStart: (config) => ipcRenderer.invoke('modbus:dashboard-start', windowId, config),
    dashboardStop: () => ipcRenderer.invoke('modbus:dashboard-stop', windowId),
    dashboardUpdate: (config) => ipcRenderer.invoke('modbus:dashboard-update', windowId, config),
    dashboardStatus: () => ipcRenderer.invoke('modbus:dashboard-status', windowId),
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

  // Update operations
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    onStatus: (callback) => ipcRenderer.on('update:status', (_event, value) => callback(value)),
    onProgress: (callback) => ipcRenderer.on('update:progress', (_event, value) => callback(value)),
    removeListeners: () => {
      ipcRenderer.removeAllListeners('update:status');
      ipcRenderer.removeAllListeners('update:progress');
    },
  },

  // Diagnostic operations
  diagnostic: {
    getErrors: (limit) => ipcRenderer.invoke('diagnostic:get-errors', limit),
    getActions: (limit) => ipcRenderer.invoke('diagnostic:get-actions', limit),
    getInfo: () => ipcRenderer.invoke('diagnostic:get-info'),
    clearErrors: () => ipcRenderer.invoke('diagnostic:clear-errors'),
    clearActions: () => ipcRenderer.invoke('diagnostic:clear-actions'),
    exportBundle: (options) => ipcRenderer.invoke('diagnostic:export-bundle', options),
    submitFeedback: (feedback) => ipcRenderer.invoke('diagnostic:submit-feedback', feedback),
  },

  // Utility
  isElectron: true,
});
