const { autoUpdater } = require('electron-updater');
const logger = require('../logger');

// Enable auto-download to automatically download updates when available
autoUpdater.autoDownload = true;
autoUpdater.logger = logger;

/**
 * Register Update IPC handlers
 * @param {import('electron').IpcMain} ipcMain 
 */
function registerUpdateHandlers(ipcMain) {
  // Check for updates manually
  ipcMain.handle('update:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, result };
    } catch (error) {
      logger.error('Failed to check for updates:', error);
      return { success: false, error: error.message };
    }
  });

  // Start downloading the update
  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      logger.error('Failed to download update:', error);
      return { success: false, error: error.message };
    }
  });

  // Quit and install the downloaded update
  ipcMain.handle('update:install', () => {
    try {
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (error) {
      logger.error('Failed to install update:', error);
      return { success: false, error: error.message };
    }
  });

  // Relay autoUpdater events to all windows
  const sendToWindows = (channel, data) => {
    const { BrowserWindow } = require('electron');
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
      win.webContents.send(channel, data);
    });
  };

  autoUpdater.on('checking-for-update', () => {
    sendToWindows('update:status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendToWindows('update:status', { 
      status: 'available', 
      version: info.version,
      releaseNotes: info.releaseNotes 
    });
  });

  autoUpdater.on('update-not-available', () => {
    sendToWindows('update:status', { status: 'not-available' });
  });

  autoUpdater.on('error', (err) => {
    sendToWindows('update:status', { 
      status: 'error', 
      error: err.message 
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendToWindows('update:progress', {
      percent: Math.floor(progressObj.percent),
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendToWindows('update:status', { 
      status: 'ready', 
      version: info.version 
    });
  });
}

module.exports = { registerUpdateHandlers };
