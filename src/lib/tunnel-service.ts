import localtunnel from 'localtunnel';

interface TunnelState {
  instance: localtunnel.Tunnel | null;
  url: string | null;
  password: string | null;
  isActive: boolean;
}

// Global declaration to persist state across hot reloads
declare global {
  // eslint-disable-next-line no-var
  var tunnelState: TunnelState | undefined;
}

const state: TunnelState = global.tunnelState || {
  instance: null,
  url: null,
  password: null,
  isActive: false,
};

if (process.env.NODE_ENV !== 'production') {
  global.tunnelState = state;
}

export const TunnelService = {
  start: async (port: number, password: string) => {
    if (state.isActive && state.url) {
      return { success: true, url: state.url };
    }

    try {
      console.log('TunnelService: Requesting tunnel for port', port);
      
      const tunnelPromise = localtunnel({ port, host: 'https://localtunnel.me' });
      const timeoutPromise = new Promise<localtunnel.Tunnel>((_, reject) => 
        setTimeout(() => reject(new Error('Tunnel connection timed out')), 5000)
      );

      const tunnel = await Promise.race([tunnelPromise, timeoutPromise]);
      console.log('TunnelService: Tunnel created', tunnel.url);
      
      state.instance = tunnel;
      state.url = tunnel.url;
      state.password = password;
      state.isActive = true;

      tunnel.on('close', () => {
        console.log('TunnelService: Tunnel closed event');
        TunnelService.stop();
      });

      return { success: true, url: tunnel.url };
    } catch (error) {
      console.error('Tunnel Error:', error);
      return { success: false, error: 'Failed to create tunnel' };
    }
  },

  stop: () => {
    if (state.instance) {
      state.instance.close();
    }
    state.instance = null;
    state.url = null;
    state.password = null;
    state.isActive = false;
    return { success: true };
  },

  getStatus: () => ({
    isActive: state.isActive,
    url: state.url,
  }),

  verifyPassword: (inputPassword: string) => {
    if (!state.isActive) return false;
    return state.password === inputPassword;
  }
};
