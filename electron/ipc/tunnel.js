// Tunnel Service using Cloudflare Quick Tunnel (cloudflared)
// This replaces the old localtunnel implementation for better performance and stability

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let tunnelState = {
    instance: null,
    url: null,
    password: null,
    isActive: false,
};

const TunnelServiceManager = {
    start: async (port, password) => {
        if (tunnelState.isActive && tunnelState.url) {
            return { success: true, url: tunnelState.url };
        }

        try {
            console.log('TunnelService: Requesting Cloudflare Quick Tunnel for port', port);

            // Determine cloudflared binary name based on platform
            let binaryName;
            if (process.platform === 'win32') {
                binaryName = 'cloudflared.exe';
            } else if (process.platform === 'darwin') {
                // macOS - check architecture
                binaryName = process.arch === 'arm64' ? 'cloudflared-darwin-arm64' : 'cloudflared-darwin-amd64';
            } else {
                // Linux
                binaryName = 'cloudflared-linux-amd64';
            }

            // Path to cloudflared executable
            let cloudflaredPath;
            if (process.env.NODE_ENV === 'development') {
                cloudflaredPath = path.join(process.cwd(), 'bin', binaryName);
            } else {
                cloudflaredPath = path.join(process.resourcesPath, 'bin', binaryName);
            }

            if (!fs.existsSync(cloudflaredPath)) {
                console.error('cloudflared not found at:', cloudflaredPath);
                return { success: false, error: `Tunnel binary not found for ${process.platform}/${process.arch}` };
            }

            // Ensure cloudflared is executable on Linux/macOS
            if (process.platform !== 'win32') {
                try {
                    fs.chmodSync(cloudflaredPath, 0o755);
                    console.log('TunnelService: Set execute permission for cloudflared');
                } catch (chmodErr) {
                    console.warn('TunnelService: Could not set execute permission:', chmodErr.message);
                }
            }

            // Spawn cloudflared process
            const child = spawn(cloudflaredPath, ['tunnel', '--url', `http://127.0.0.1:${port}`]);

            tunnelState.instance = child;
            tunnelState.password = password;
            // isActive is not set true until we get the URL

            return new Promise((resolve) => {
                let urlFound = false;

                const cleanup = () => {
                    if (!urlFound) {
                        try { child.kill(); } catch { }
                        tunnelState.instance = null;
                        tunnelState.isActive = false;
                    }
                };

                // Parse stderr because cloudflared prints URL info to stderr
                child.stderr.on('data', (data) => {
                    const output = data.toString();
                    console.log(`[cloudflared]: ${output}`);

                    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
                    if (match && !urlFound) {
                        urlFound = true;
                        tunnelState.url = match[0];
                        tunnelState.isActive = true;
                        console.log('TunnelService: Cloudflare Tunnel created', tunnelState.url);
                        resolve({ success: true, url: tunnelState.url });
                    }
                });

                child.on('error', (err) => {
                    console.error('Failed to start cloudflared:', err);
                    cleanup();
                    resolve({ success: false, error: 'Failed to start tunnel process' });
                });

                child.on('close', (code) => {
                    console.log(`cloudflared exited with code ${code}`);
                    if (!urlFound) {
                        cleanup();
                        resolve({ success: false, error: 'Tunnel process exited unexpectedly' });
                    } else {
                        // Process closed after successful start (e.g. killed manually or crashed)
                        TunnelServiceManager.stop();
                    }
                });

                // Timeout if URL not found in 15 seconds
                setTimeout(() => {
                    if (!urlFound) {
                        console.error('Timeout waiting for Cloudflare URL');
                        cleanup();
                        resolve({ success: false, error: 'Timeout connecting to Cloudflare Network' });
                    }
                }, 15000);
            });

        } catch (error) {
            console.error('Tunnel Error:', error);
            return { success: false, error: 'Failed to create tunnel: ' + (error.message || String(error)) };
        }
    },

    stop: () => {
        const child = tunnelState.instance;
        if (child) {
            // Clear state first
            tunnelState.instance = null;
            tunnelState.url = null;
            tunnelState.password = null;
            tunnelState.isActive = false;

            try {
                child.kill();
            } catch (e) {
                console.error('Error closing tunnel process:', e);
            }
        }
        return { success: true };
    },

    getStatus: () => ({
        isActive: tunnelState.isActive,
        url: tunnelState.url,
    }),

    verifyPassword: (inputPassword) => {
        if (!tunnelState.isActive) return false;
        // Simple string comparison
        return tunnelState.password === inputPassword;
    }
};

function registerTunnelHandlers(ipcMain) {
    ipcMain.handle('tunnel:control', async (event, { action, password }) => {
        if (action === 'start') {
            if (!password) {
                throw new Error('Password is required');
            }
            // Always point to our unified Main Process server (3456)
            // In dev, 3456 proxies to 3000 for UI, but handles API itself.
            // In prod, 3456 serves static files and handles API itself.
            const port = 3456;
            return await TunnelServiceManager.start(port, password);
        }

        if (action === 'stop') {
            return TunnelServiceManager.stop();
        }

        throw new Error('Invalid action');
    });

    ipcMain.handle('tunnel:status', async () => {
        return TunnelServiceManager.getStatus();
    });

    ipcMain.handle('tunnel:login', async (event, { password }) => {
        const isValid = TunnelServiceManager.verifyPassword(password);
        if (isValid) {
            return { success: true };
        } else {
            return { success: false, error: 'Invalid password' };
        }
    });
}

module.exports = { registerTunnelHandlers, TunnelServiceManager };
