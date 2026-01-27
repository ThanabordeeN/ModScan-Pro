const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Import IPC handlers
const { registerSerialHandlers } = require('./ipc/serial');
const { registerModbusHandlers } = require('./ipc/modbus');
const { registerLicenseHandlers } = require('./ipc/license');

let mainWindow;
let server;
const PORT = 3456; // Use a fixed port for the local server

// Get the correct path for static files
function getStaticPath() {
  // In production (packaged app), files are in resources/app.asar/out
  // In development, they're in project-root/out
  return path.join(__dirname, '../out');
}

// MIME types for serving static files
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
};

// Create a simple static file server
function createStaticServer() {
  const staticPath = getStaticPath();
  console.log('Static path:', staticPath);

  server = http.createServer((req, res) => {
    let filePath = req.url;
    
    // Handle root path
    if (filePath === '/') {
      filePath = '/index.html';
    }
    
    // Remove query strings
    filePath = filePath.split('?')[0];
    
    // Build full path
    let fullPath = path.join(staticPath, filePath);
    
    // For Next.js routes without extension, try .html
    if (!path.extname(fullPath)) {
      const htmlPath = fullPath + '.html';
      if (fs.existsSync(htmlPath)) {
        fullPath = htmlPath;
      }
    }

    // Check if file exists
    fs.readFile(fullPath, (err, data) => {
      if (err) {
        // Try index.html for SPA fallback
        if (err.code === 'ENOENT') {
          const indexPath = path.join(staticPath, 'index.html');
          fs.readFile(indexPath, (err2, data2) => {
            if (err2) {
              res.writeHead(404);
              res.end('Not Found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(data2);
            }
          });
        } else {
          res.writeHead(500);
          res.end('Internal Server Error');
        }
        return;
      }

      const ext = path.extname(fullPath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Static server running at http://127.0.0.1:${PORT}`);
      resolve();
    });
  });
}

function createWindow() {
  // Get icon path
  const iconPath = path.join(__dirname, '../build/icon.png');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'ModScan Pro',
    autoHideMenuBar: true,
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    // Development: load from Next.js dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from local static server
    mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register all IPC handlers
function registerIpcHandlers() {
  registerSerialHandlers(ipcMain);
  registerModbusHandlers(ipcMain);
  registerLicenseHandlers(ipcMain);
}

app.whenReady().then(async () => {
  // Start static server in production
  if (process.env.NODE_ENV !== 'development') {
    await createStaticServer();
  }
  
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (server) {
      server.close();
    }
    app.quit();
  }
});

