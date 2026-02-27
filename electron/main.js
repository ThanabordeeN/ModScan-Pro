const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Import IPC handlers
const { registerSerialHandlers } = require('./ipc/serial');
const { registerModbusHandlers } = require('./ipc/modbus');
const { registerLicenseHandlers } = require('./ipc/license');
const { registerTunnelHandlers } = require('./ipc/tunnel');
const { registerLoggerHandlers } = require('./ipc/logger');
const logger = require('./logger');

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

const httpProxy = require('http-proxy');

// Create a simple static file server and API handler
function createStaticServer() {
  const staticPath = getStaticPath();
  const proxy = httpProxy.createProxyServer({});

  logger.info('Static path:', staticPath);

  server = http.createServer(async (req, res) => {
    let filePath = req.url;

    // --- API HANDLERS for Remote Access ---
    if (filePath.startsWith('/api/tunnel')) {
      // Need to read body for POST
      const buffers = [];
      req.on('data', (chunk) => buffers.push(chunk));
      req.on('end', async () => {
        const body = buffers.length ? JSON.parse(Buffer.concat(buffers).toString()) : {};

        if (filePath === '/api/tunnel/login' && req.method === 'POST') {
          // Import verification logic from tunnel.js via simple IPC-like call or sharing the module instance
          // BUT tunnel.js is an IPC module. Let's make it shareable.
          // We can require the verifyPassword function from it if we export it.
          // For now, let's just use IPC to "loopback" or better yet, verify against the shared state in tunnel.js
          // Since tunnel.js exports `registerTunnelHandlers` and has internal state, we should export the state manager too.
          const { TunnelServiceManager } = require('./ipc/tunnel'); // Need to ensure tunnel.js exports this

          if (TunnelServiceManager && TunnelServiceManager.verifyPassword) {
            const isValid = TunnelServiceManager.verifyPassword(body.password);
            if (isValid) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } else {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Invalid password' }));
            }
          } else {
            res.writeHead(500);
            res.end(JSON.stringify({ success: false, error: 'Tunnel service not ready' }));
          }
          return;
        }

        if (filePath === '/api/tunnel/control' && req.method === 'GET') {
          const { TunnelServiceManager } = require('./ipc/tunnel');
          if (TunnelServiceManager && TunnelServiceManager.getStatus) {
            const status = TunnelServiceManager.getStatus();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(status));
          } else {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Tunnel service not ready' }));
          }
          return;
        }

        // POST /control is for internal use, usually IPC handles it. 
        // But if remote user wants to stop? Usually we don't allow remote user to stop the tunnel?
        // Check requirements. Usually only local user stops tunnel.

        res.writeHead(404);
        res.end('Not Found');
      });
      return;
    }

    if (filePath.startsWith('/api/license')) {
      const { verifyLicense, saveLicense } = require('./ipc/license');

      if (req.method === 'GET') {
        const result = verifyLicense();
        // Since verifyLicense returns { valid, machineId, error }, and frontend expects { success, valid, machineId, error }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...result }));
        return;
      }

      if (req.method === 'POST') {
        // Verify activate body
        const buffers = [];
        req.on('data', (chunk) => buffers.push(chunk));
        req.on('end', async () => {
          const body = buffers.length ? JSON.parse(Buffer.concat(buffers).toString()) : {};
          const { licenseKey } = body;

          if (!licenseKey) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'License key is required' }));
            return;
          }

          const status = verifyLicense(licenseKey);
          if (status.valid) {
            if (saveLicense(licenseKey)) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, valid: true, machineId: status.machineId }));
            } else {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Failed to save license' }));
            }
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, valid: false, machineId: status.machineId, error: status.error || 'Invalid key' }));
          }
        });
        return;
      }
    }

    // --- API HANDLERS for MODBUS and SERIAL ---

    if (filePath.startsWith('/api/serial')) {
      const { SerialService } = require('./ipc/serial');
      if (req.method === 'GET') {
        const result = await SerialService.listPorts();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }
    }

    if (filePath.startsWith('/api/modbus')) {
      const { ModbusService } = require('./ipc/modbus');

      // Need to read body for POST requests
      const buffers = [];
      req.on('data', (chunk) => buffers.push(chunk));
      req.on('end', async () => {
        let body = {};
        try {
          if (buffers.length) body = JSON.parse(Buffer.concat(buffers).toString());
        } catch (e) {
          logger.error('Failed to parse body', e);
        }

        let result = { success: false, error: 'Unknown endpoint' };

        if (filePath === '/api/modbus/scan') result = await ModbusService.scan(body);
        else if (filePath === '/api/modbus/read') result = await ModbusService.read(body);
        else if (filePath === '/api/modbus/write') result = await ModbusService.write(body);
        else if (filePath === '/api/modbus/read-batch') result = await ModbusService.readBatch(body);
        else if (filePath === '/api/modbus/change-address') result = await ModbusService.changeAddress(body);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      });
      return;
    }

    // --------------------------------------

    // PROXY TO NEXT.JS IN DEV
    if (process.env.NODE_ENV === 'development') {
      proxy.web(req, res, { target: 'http://localhost:3000', changeOrigin: true }, (e) => {
        logger.error('Proxy error:', e);
        res.writeHead(502);
        res.end('Bad Gateway');
      });
      return;
    }

    // SERVE STATIC FILES IN PROD
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
      logger.info(`Unified Server running at http://127.0.0.1:${PORT}`);
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
  registerTunnelHandlers(ipcMain);
  registerLoggerHandlers(ipcMain);
}

app.whenReady().then(async () => {
  // Start static server in production
  // Start unified server (Proxies to Next.js in dev, serves static in prod)
  await createStaticServer();

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

