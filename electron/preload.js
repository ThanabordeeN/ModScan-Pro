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
    read: (config) => ipcRenderer.invoke('modbus:read', config),
    write: (config) => ipcRenderer.invoke('modbus:write', config),
    readBatch: (config) => ipcRenderer.invoke('modbus:read-batch', config),
    changeAddress: (config) => ipcRenderer.invoke('modbus:change-address', config),
  },
  
  // License operations
  license: {
    getMachineId: () => ipcRenderer.invoke('license:get-machine-id'),
    activate: (serialKey) => ipcRenderer.invoke('license:activate', serialKey),
    check: () => ipcRenderer.invoke('license:check'),
  },
  
  // Utility
  isElectron: true,
});
