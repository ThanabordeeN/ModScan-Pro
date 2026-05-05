const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

let appVersion = '1.0.3';
try {
  const pkg = require('../../package.json');
  appVersion = pkg.version;
} catch { /* ignore */ }

const MAX_ERROR_LOGS = 500;
const MAX_ACTION_LOGS = 200;

const errorLogs = [];
const actionLogs = [];

let idCounter = 0;
function generateId() {
  return `${Date.now()}-${(++idCounter).toString(36)}`;
}

const diagnosticService = {
  logError(event) {
    const entry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      severity: 'error',
      ...event,
    };
    errorLogs.unshift(entry);
    if (errorLogs.length > MAX_ERROR_LOGS) errorLogs.length = MAX_ERROR_LOGS;
    return entry;
  },

  logAction(action) {
    const entry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ...action,
    };
    actionLogs.unshift(entry);
    if (actionLogs.length > MAX_ACTION_LOGS) actionLogs.length = MAX_ACTION_LOGS;
    return entry;
  },

  getErrors(limit = 100) {
    return errorLogs.slice(0, limit);
  },

  getActions(limit = 100) {
    return actionLogs.slice(0, limit);
  },

  getAppInfo() {
    return {
      appVersion,
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      electronVersion: process.versions.electron || 'n/a',
      nodeVersion: process.versions.node,
      platform: process.platform,
    };
  },

  clearErrors() {
    errorLogs.length = 0;
  },

  clearActions() {
    actionLogs.length = 0;
  },
};

function registerDiagnosticHandlers(ipcMain) {
  ipcMain.handle('diagnostic:get-errors', async (_event, limit) => {
    return { success: true, errors: diagnosticService.getErrors(limit) };
  });

  ipcMain.handle('diagnostic:get-actions', async (_event, limit) => {
    return { success: true, actions: diagnosticService.getActions(limit) };
  });

  ipcMain.handle('diagnostic:get-info', async () => {
    return { success: true, info: diagnosticService.getAppInfo() };
  });

  ipcMain.handle('diagnostic:clear-errors', async () => {
    diagnosticService.clearErrors();
    return { success: true };
  });

  ipcMain.handle('diagnostic:clear-actions', async () => {
    diagnosticService.clearActions();
    return { success: true };
  });

  ipcMain.handle('diagnostic:export-bundle', async (_event, options = {}) => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const defaultName = `modscan-diagnostic-${date}.json`;

      const result = await dialog.showSaveDialog({
        title: 'Export Diagnostic Bundle',
        defaultPath: path.join(app.getPath('downloads'), defaultName),
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (result.canceled) return { success: false, cancelled: true };

      const appInfo = diagnosticService.getAppInfo();

      let appLog = '';
      try {
        const logPath = path.join(app.getPath('userData'), 'app.log');
        const raw = fs.readFileSync(logPath, 'utf8');
        appLog = raw.split('\n').slice(-500).join('\n');
      } catch { /* app.log may not exist yet */ }

      const bundle = {
        exportedAt: new Date().toISOString(),
        appInfo,
        recentErrors: diagnosticService.getErrors(100),
        actionLog: diagnosticService.getActions(100),
        appLog,
        userFeedback: options.feedback || null,
      };

      fs.writeFileSync(result.filePath, JSON.stringify(bundle, null, 2));
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('diagnostic:submit-feedback', async (_event, feedback) => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const defaultName = `modscan-feedback-${date}.json`;

      const result = await dialog.showSaveDialog({
        title: 'Export Feedback Report',
        defaultPath: path.join(app.getPath('downloads'), defaultName),
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (result.canceled) return { success: false, cancelled: true };

      const appInfo = diagnosticService.getAppInfo();
      const payload = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        category: feedback.category,
        userMessage: feedback.userMessage,
        includeDiagnostics: feedback.includeDiagnostics,
        diagnostics: feedback.includeDiagnostics
          ? {
              appVersion: appInfo.appVersion,
              os: appInfo.os,
              electronVersion: appInfo.electronVersion,
              nodeVersion: appInfo.nodeVersion,
              lastErrors: diagnosticService.getErrors(20),
              recentActions: diagnosticService.getActions(20),
            }
          : undefined,
      };

      fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2));
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerDiagnosticHandlers, diagnosticService };
