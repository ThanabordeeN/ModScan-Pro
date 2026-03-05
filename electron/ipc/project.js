const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

const PROJECT_VERSION = 1;

function getRecentProjectsPath() {
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'recent-projects.json');
  }
  return path.join(app.getPath('userData'), 'recent-projects.json');
}

function loadRecentProjects() {
  try {
    const filePath = getRecentProjectsPath();
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    // ignore
  }
  return [];
}

function saveRecentProjects(projects) {
  try {
    const filePath = getRecentProjectsPath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2));
  } catch (e) {
    // ignore
  }
}

function addToRecentProjects(name, filePath) {
  const projects = loadRecentProjects();
  // Remove existing entry for same path
  const filtered = projects.filter((p) => p.filePath !== filePath);
  filtered.unshift({
    name,
    filePath,
    lastOpened: new Date().toISOString(),
  });
  // Keep only last 10
  saveRecentProjects(filtered.slice(0, 10));
}

function validateProjectData(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.version !== 'number') return false;
  if (typeof data.name !== 'string' || data.name.trim() === '') return false;
  if (!data.connection || typeof data.connection !== 'object') return false;
  if (!Array.isArray(data.devices)) return false;
  if (!Array.isArray(data.readRanges)) return false;
  if (!data.settings || typeof data.settings !== 'object') return false;
  return true;
}

/**
 * Register project IPC handlers
 */
function registerProjectHandlers(ipcMain) {
  ipcMain.handle('project:save', async (event, projectData) => {
    try {
      if (!projectData || !projectData.name) {
        return { success: false, error: 'Project data is required' };
      }

      const result = await dialog.showSaveDialog({
        title: 'Save Project',
        defaultPath: `${projectData.name.replace(/[^a-zA-Z0-9_\-\s]/g, '')}.json`,
        filters: [
          { name: 'ModScan Project', extensions: ['json'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, cancelled: true };
      }

      const dataToSave = {
        version: PROJECT_VERSION,
        ...projectData,
      };

      fs.writeFileSync(result.filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
      addToRecentProjects(projectData.name, result.filePath);

      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to save project' };
    }
  });

  ipcMain.handle('project:load', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Load Project',
        filters: [
          { name: 'ModScan Project', extensions: ['json'] },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, cancelled: true };
      }

      const filePath = result.filePaths[0];
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      if (!validateProjectData(data)) {
        return { success: false, error: 'Invalid project file format' };
      }

      addToRecentProjects(data.name, filePath);

      return { success: true, data, filePath };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to load project' };
    }
  });

  ipcMain.handle('project:load-path', async (event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      if (!validateProjectData(data)) {
        return { success: false, error: 'Invalid project file format' };
      }

      addToRecentProjects(data.name, filePath);

      return { success: true, data, filePath };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to load project' };
    }
  });

  ipcMain.handle('project:recent', async () => {
    try {
      const projects = loadRecentProjects();
      return { success: true, projects };
    } catch (error) {
      return { success: false, projects: [], error: error.message };
    }
  });
}

module.exports = {
  registerProjectHandlers,
  validateProjectData,
};
