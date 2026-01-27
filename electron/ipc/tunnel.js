// Tunnel Service Logic equivalent to src/lib/tunnel-service.ts adapted for Electron main process (Node.js)

// Wait, the tunnel-service.ts is TypeScript. We cannot require it directly in Node.js (Electron main process) without compilation or using ts-node/register, 
// which might be complicated in production builds if not handled by the builder.
// However, since this is an Electron app built with Next.js, usually the main process code is in JS or compiled.
// The user has `tsconfig.json` and `electron/main.js` is JS.
// But `src/lib/tunnel-service.ts` is TS.
// I should probably rewrite the tunnel service in JS for the Electron main process, or move the logic into this new file directly to avoid import issues.
// Given the simplicity, I will copy the logic and adapt it to pure JS.

const localtunnel = require('localtunnel');

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
            console.log('TunnelService: Requesting tunnel for port', port);

            const tunnelPromise = new Promise((resolve, reject) => {
                try {
                    const tunnel = localtunnel(port, { host: 'https://localtunnel.me' }, (err, tunnel) => {
                        if (err) return reject(err);
                        resolve(tunnel);
                    });

                    // Add error listener to the tunnel instance if possible (though it returns the instance synchronously usually)
                    if (tunnel) {
                        tunnel.on('error', (err) => {
                            console.error('Localtunnel error:', err);
                            // don't reject here if already resolved, but useful for logs
                        });
                    }
                } catch (e) {
                    reject(e);
                }
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Tunnel connection timed out')), 10000)
            );

            let tunnel;
            try {
                tunnel = await Promise.race([tunnelPromise, timeoutPromise]);
            } catch (err) {
                console.error('Failed to establish tunnel:', err);
                return { success: false, error: 'Connection failed: ' + err.message };
            }

            // Check if tunnel and tunnel.url exist
            if (!tunnel || !tunnel.url) {
                console.error('Tunnel created but no URL returned:', tunnel);
                // Don't throw, return error object
                return { success: false, error: 'Failed to obtain tunnel URL' };
            }

            console.log('TunnelService: Tunnel created', tunnel.url);

            tunnelState.instance = tunnel;
            tunnelState.url = tunnel.url;
            tunnelState.password = password;
            tunnelState.isActive = true;

            tunnel.on('close', () => {
                console.log('TunnelService: Tunnel closed event');
                TunnelServiceManager.stop();
            });

            tunnel.on('error', (err) => {
                console.error('Tunnel instance error:', err);
                TunnelServiceManager.stop();
            });

            return { success: true, url: tunnel.url };
        } catch (error) {
            console.error('Tunnel Error:', error);
            // Catch-all for any other errors
            return { success: false, error: 'Failed to create tunnel: ' + (error.message || String(error)) };
        }
    },

    stop: () => {
        const tunnel = tunnelState.instance;
        if (tunnel) {
            // Clear state first to prevent recursion if close() emits 'close' event
            tunnelState.instance = null;
            tunnelState.url = null;
            tunnelState.password = null;
            tunnelState.isActive = false;

            try {
                tunnel.close();
            } catch (e) {
                console.error('Error closing tunnel:', e);
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
