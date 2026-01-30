const { dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let logStream = null;
let currentFilePath = null;

const LoggerService = {
  start: async () => {
    // If already logging, stop first
    if (logStream) {
      logStream.end();
      logStream = null;
    }

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Log File',
      defaultPath: `ModScan_Log_${new Date().getFullYear()}-${(new Date().getMonth()+1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}_${new Date().getHours().toString().padStart(2, '0')}-${new Date().getMinutes().toString().padStart(2, '0')}.csv`,
      filters: [
        { name: 'CSV Files', extensions: ['csv'] }
      ]
    });

    if (canceled || !filePath) {
      return { success: false, cancelled: true };
    }

    try {
      logStream = fs.createWriteStream(filePath, { flags: 'w' });
      currentFilePath = filePath;
      
      // Write Header
      const header = 'Timestamp,ReadableDate,ReadableTime,SlaveID,Address,Value,FunctionCode\n';
      logStream.write(header);

      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  log: async (entries) => {
    if (!logStream) return { success: false, error: 'No active log session' };

    try {
      // entries is an array of { timestamp, slaveId, address, value, fc }
      let chunk = '';
      for (const entry of entries) {
        const date = new Date(entry.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString(); // Includes seconds
        
        chunk += `"${entry.timestamp}","${dateStr}","${timeStr}",${entry.slaveId},${entry.address},${entry.value},${entry.fc}\n`;
      }

      logStream.write(chunk);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  stop: async () => {
    if (logStream) {
      return new Promise((resolve) => {
        logStream.end(() => {
          logStream = null;
          const savedPath = currentFilePath;
          currentFilePath = null;
          resolve({ success: true, filePath: savedPath });
        });
      });
    }
    return { success: true, filePath: null }; // Already stopped
  }
};

function registerLoggerHandlers(ipcMain) {
  ipcMain.handle('logger:start', async (event) => {
    return LoggerService.start();
  });

  ipcMain.handle('logger:log', async (event, entries) => {
    return LoggerService.log(entries);
  });

  ipcMain.handle('logger:stop', async (event) => {
    return LoggerService.stop();
  });
}

module.exports = { registerLoggerHandlers, LoggerService };
