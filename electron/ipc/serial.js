const { SerialPort } = require('serialport');

/**
 * Register serial port IPC handlers
 * @param {Electron.IpcMain} ipcMain 
 */
function registerSerialHandlers(ipcMain) {
  ipcMain.handle('serial:list-ports', async () => {
    try {
      const ports = await SerialPort.list();
      const filtered = ports
        .filter(port => {
          // Filter out linux standard serial ports that often appear even if not present/connected
          if (port.path.includes('ttyS') || port.path.includes('ttyprintk')) {
            return !!(port.vendorId || port.productId);
          }
          return true;
        })
        .map(port => ({
          path: port.path,
          manufacturer: port.manufacturer,
          serialNumber: port.serialNumber,
          pnpId: port.pnpId,
          vendorId: port.vendorId,
          productId: port.productId,
        }));
      
      return { success: true, ports: filtered };
    } catch (error) {
      console.error('Error listing serial ports:', error);
      return { success: false, error: 'Failed to list serial ports' };
    }
  });
}

module.exports = { registerSerialHandlers };
