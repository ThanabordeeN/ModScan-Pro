const ModbusRTU = require('modbus-serial');

/**
 * Connect to Modbus device (RTU or TCP)
 */
async function connectClient(client, config) {
  if (config.type === 'tcp') {
    if (!config.tcpIp || !config.tcpPort) {
      throw new Error('TCP IP and Port are required');
    }
    await client.connectTCP(config.tcpIp, { port: config.tcpPort, family: 4 });
  } else {
    if (!config.port) {
      throw new Error('Serial Port is required');
    }
    await client.connectRTUBuffered(config.port, {
      baudRate: config.baudRate || 9600,
      dataBits: config.dataBits || 8,
      stopBits: config.stopBits || 1,
      parity: config.parity || 'none',
    });
  }
}

/**
 * Helper to get user-friendly error message
 */
function getErrorMessage(error) {
  const msg = error.message || '';
  if (msg.includes('Timed out')) {
    return 'Connection Timed Out. Check if device is powered on and parameters (Baud Rate, ID) are correct.';
  }
  if (msg.includes('Port Not Open')) {
    return 'Port Not Open. Please check if the Serial Port is available and not used by another program.';
  }
  if (msg.includes('ECONNREFUSED')) {
    return 'Connection Refused. Check if the Modbus TCP Server ip/port is correct and reachable.';
  }
  if (msg.includes('EHOSTUNREACH')) {
    return 'Host Unreachable. Check if the device IP address is correct and on the same network subnet.';
  }
  if (msg.includes('CRC error')) {
    return 'CRC Error. Communication noise or incorrect Baud Rate/Parity settings.';
  }
  return msg || 'Unknown Error';
}

/**
 * Register Modbus IPC handlers
 */
// Per-window scan abort flags: windowId -> boolean
const scanAbortFlags = new Map();

// Define ModbusService to share logic between IPC and API
const ModbusService = {
  scan: async (config, sender, windowId) => {
    const { startAddress, endAddress, timeout = 500 } = config;

    // Validate input
    if (typeof startAddress !== 'number' || typeof endAddress !== 'number') {
      return { success: false, error: 'Start and End addresses must be numbers' };
    }
    if (startAddress < 1 || endAddress > 247) {
      return { success: false, error: 'Address range must be between 1 and 247' };
    }
    if (startAddress > endAddress) {
      return { success: false, error: 'Start address cannot be greater than end address' };
    }

    const client = new ModbusRTU();
    const devices = [];

    try {
      await connectClient(client, config);
      client.setTimeout(timeout);
      
      const total = endAddress - startAddress + 1;
      let count = 0;

      for (let address = startAddress; address <= endAddress; address++) {
        // Check abort flag
        if (windowId && scanAbortFlags.get(windowId)) {
          break;
        }

        // Emit progress
        if (sender) {
          const progress = Math.round((count / total) * 100);
          sender.send('modbus:scan-progress', progress);
        }
        
        client.setID(address);
        try {
          const startTime = Date.now();
          const result = await client.readHoldingRegisters(0, 1);
          const responseTime = Date.now() - startTime;
          const device = {
            address,
            responseTime,
            holdingRegisters: result.data,
          };
          devices.push(device);
          // Emit found device immediately
          if (sender) {
            sender.send('modbus:scan-found', device);
          }
        } catch {
          // Device not found at this address - Expected during scan
        }
        count++;
      }
      
      // Send 100% at end
      if (sender) {
        sender.send('modbus:scan-progress', 100);
      }

      await client.close(() => { });
      // Clear abort flag
      if (windowId) scanAbortFlags.delete(windowId);
      const cancelled = windowId ? false : false; // not cancelled here
      return { success: true, devices, scannedCount: total, cancelled: !!(windowId && scanAbortFlags.get(windowId)) };
    } catch (error) {
      try { await client.close(() => { }); } catch { }
      if (windowId) scanAbortFlags.delete(windowId);
      return { success: false, error: getErrorMessage(error) };
    }
  },

  read: async (config) => {
    const { slaveAddress, functionCode, registerAddress, quantity, timeout = 1000 } = config;
    const client = new ModbusRTU();

    try {
      await connectClient(client, config);
      client.setID(slaveAddress);
      client.setTimeout(timeout);

      let data;
      switch (functionCode) {
        case 1: {
          const result = await client.readCoils(registerAddress, quantity);
          data = result.data.map(v => v ? 1 : 0);
          break;
        }
        case 2: {
          const result = await client.readDiscreteInputs(registerAddress, quantity);
          data = result.data.map(v => v ? 1 : 0);
          break;
        }
        case 3: {
          const result = await client.readHoldingRegisters(registerAddress, quantity);
          data = result.data;
          break;
        }
        case 4: {
          const result = await client.readInputRegisters(registerAddress, quantity);
          data = result.data;
          break;
        }
        default:
          throw new Error(`Unsupported function code: ${functionCode}`);
      }

      await client.close(() => { });
      return { success: true, data, slaveAddress, functionCode, registerAddress, quantity };
    } catch (error) {
      try { await client.close(() => { }); } catch { }
      return { success: false, error: getErrorMessage(error) };
    }
  },

  write: async (config) => {
    const { slaveAddress, functionCode, address, value, values, coilValue, coilValues, timeout = 1000 } = config;
    const client = new ModbusRTU();

    try {
      await connectClient(client, config);
      client.setID(slaveAddress);
      client.setTimeout(timeout);

      switch (functionCode) {
        case 5: // Write Single Coil
          await client.writeCoil(address, coilValue);
          break;
        case 6: // Write Single Register
          await client.writeRegister(address, value);
          break;
        case 15: // Write Multiple Coils
          await client.writeCoils(address, coilValues);
          break;
        case 16: // Write Multiple Registers
          await client.writeRegisters(address, values);
          break;
        default:
          throw new Error(`Unsupported function code: ${functionCode}`);
      }

      await client.close(() => { });
      return { success: true, functionCode, address, message: `Successfully wrote to address ${address}` };
    } catch (error) {
      try { await client.close(() => { }); } catch { }
      return { success: false, error: getErrorMessage(error) };
    }
  },

  readBatch: async (config) => {
    const { requests, timeout = 1000 } = config;
    const client = new ModbusRTU();
    const results = [];

    try {
      await connectClient(client, config);
      client.setTimeout(timeout);

      for (const req of requests) {
        client.setID(req.slaveAddress);
        try {
          let data;
          switch (req.functionCode) {
            case 1: {
              const result = await client.readCoils(req.registerAddress, req.quantity);
              data = result.data.map(v => v ? 1 : 0);
              break;
            }
            case 2: {
              const result = await client.readDiscreteInputs(req.registerAddress, req.quantity);
              data = result.data.map(v => v ? 1 : 0);
              break;
            }
            case 3: {
              const result = await client.readHoldingRegisters(req.registerAddress, req.quantity);
              data = result.data;
              break;
            }
            case 4: {
              const result = await client.readInputRegisters(req.registerAddress, req.quantity);
              data = result.data;
              break;
            }
          }
          results.push({ success: true, data });
        } catch (error) {
          results.push({ success: false, error: getErrorMessage(error) });
        }
      }

      await client.close(() => { });
      return { results };
    } catch (error) {
      try { await client.close(() => { }); } catch { }
      return { results: [], error: getErrorMessage(error) };
    }
  },

  changeAddress: async (config) => {
    const { currentAddress, newAddress, registerAddress = 0, functionCode = 6, timeout = 1000 } = config;
    let client = new ModbusRTU();

    try {
      if (newAddress < 1 || newAddress > 247) {
        return { success: false, error: 'New address must be between 1 and 247' };
      }

      // Step 1: Connect and Write new ID
      await connectClient(client, config);
      client.setID(currentAddress);
      client.setTimeout(timeout);

      // Perform the write
      if (functionCode === 6) {
        await client.writeRegister(registerAddress, newAddress);
      } else {
        await client.writeRegisters(registerAddress, [newAddress]);
      }

      // Explicitly close the connection after writing to allow device to process/reboot
      await new Promise(resolve => {
        client.close(() => resolve(null));
      });

      // Step 2: Wait for device to apply changes (EEPROM write/Reboot often takes time)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Verify change with Retries
      const maxRetries = 3;
      let lastError = null;

      for (let i = 0; i < maxRetries; i++) {
        client = new ModbusRTU();
        try {
          await connectClient(client, config);
          client.setID(newAddress);
          client.setTimeout(timeout + 500);
          
          const verifyResult = await client.readHoldingRegisters(registerAddress, 1);
          
          await new Promise(resolve => {
            client.close(() => resolve(null));
          });

          if (verifyResult.data[0] === newAddress) {
            return { success: true, message: `Successfully changed ID from ${currentAddress} to ${newAddress}` };
          } else {
            return { 
              success: true, 
              warning: `Write command sent, but readback value (${verifyResult.data[0]}) does not match new ID (${newAddress}). Device might need a manual restart.` 
            };
          }
        } catch (err) {
          lastError = err;
          try {
            await new Promise(resolve => {
              client.close(() => resolve(null));
            });
          } catch (e) { /* ignore */ }
          
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      }

      return { 
        success: true, 
        warning: `ID change command was sent successfully to ID ${currentAddress}, but the device is not responding on new ID ${newAddress} yet. Please try scanning or wait a moment. (${getErrorMessage(lastError)})` 
      };

    } catch (error) {
      try {
        await new Promise(resolve => {
          client.close(() => resolve(null));
        });
      } catch (e) { /* ignore */ }
      return { success: false, error: getErrorMessage(error) };
    }
  }
};

/**
 * Register Modbus IPC handlers
 */
function registerModbusHandlers(ipcMain) {

  // Scan for devices — scope progress to windowId
  ipcMain.handle('modbus:scan', async (event, config) => {
    const windowId = config._windowId;
    const sender = event.sender;
    // Reset abort flag for this window
    if (windowId) scanAbortFlags.set(windowId, false);
    // Create a scoped sender that sends to windowId-specific channel
    const scopedSender = windowId ? {
      send: (channel, value) => {
        sender.send(`${channel}:${windowId}`, value);
      }
    } : sender;
    return ModbusService.scan(config, scopedSender, windowId);
  });

  // Cancel an in-progress scan
  ipcMain.handle('modbus:scan-cancel', async (event, windowId) => {
    if (windowId) {
      scanAbortFlags.set(windowId, true);
    }
    return { success: true };
  });

  // Read data
  ipcMain.handle('modbus:read', async (event, config) => {
    return ModbusService.read(config);
  });

  // Write data
  ipcMain.handle('modbus:write', async (event, config) => {
    return ModbusService.write(config);
  });

  // Read batch
  ipcMain.handle('modbus:read-batch', async (event, config) => {
    return ModbusService.readBatch(config);
  });

  // Change address
  ipcMain.handle('modbus:change-address', async (event, config) => {
    return ModbusService.changeAddress(config);
  });

  // Dashboard polling queue — per-window
  ipcMain.handle('modbus:dashboard-start', async (event, windowId, config) => {
    try {
      if (!windowId) return { success: false, error: 'windowId required' };
      let queue = dashboardQueues.get(windowId);
      if (!queue) {
        queue = new ModbusQueue();
        dashboardQueues.set(windowId, queue);
      }
      queue.start(config);
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  });

  ipcMain.handle('modbus:dashboard-stop', async (event, windowId) => {
    const queue = dashboardQueues.get(windowId);
    if (queue) {
      queue.stop();
    }
    return { success: true };
  });

  ipcMain.handle('modbus:dashboard-update', async (event, windowId, config) => {
    const queue = dashboardQueues.get(windowId);
    if (queue) {
      queue.update(config);
    }
    return { success: true };
  });

  ipcMain.handle('modbus:dashboard-status', async (event, windowId) => {
    const queue = dashboardQueues.get(windowId);
    if (queue) {
      return queue.getStatus();
    }
    return { running: false, interval: 1000, cards: [], results: {} };
  });
}

/**
 * ModbusQueue - Sequential polling queue for multi-device dashboard.
 * Prevents RS485 data collisions by reading devices one at a time.
 */
class ModbusQueue {
  constructor() {
    this.cards = [];          // Array of card configs { cardId, slaveAddress, functionCode, registerAddress, quantity }
    this.connectionConfig = null;
    this.interval = 1000;     // ms between polling cycles
    this.timeout = 1000;      // per-device read timeout
    this.running = false;
    this.loopTimer = null;
    this.cardResults = {};    // { [cardId]: { success, data, error, lastUpdated } }
  }

  /**
   * Start the polling loop.
   * @param {object} config - { cards, connectionConfig, interval, timeout }
   */
  start(config) {
    this.stop();

    this.cards = config.cards || [];
    this.connectionConfig = config.connectionConfig;
    this.interval = config.interval || 1000;
    this.timeout = config.timeout || 1000;
    this.running = true;
    this.cardResults = {};

    // Initialize card results
    for (const card of this.cards) {
      this.cardResults[card.cardId] = { success: false, data: null, error: null, lastUpdated: null };
    }

    this._scheduleLoop();
  }

  /**
   * Stop the polling loop.
   */
  stop() {
    this.running = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
  }

  /**
   * Update cards and/or interval without full restart.
   * @param {object} config - { cards?, interval?, timeout? }
   */
  update(config) {
    if (config.cards) {
      this.cards = config.cards;
      // Initialize results for new cards
      for (const card of this.cards) {
        if (!this.cardResults[card.cardId]) {
          this.cardResults[card.cardId] = { success: false, data: null, error: null, lastUpdated: null };
        }
      }
      // Remove results for cards no longer present
      const cardIds = new Set(this.cards.map(c => c.cardId));
      for (const id of Object.keys(this.cardResults)) {
        if (!cardIds.has(id)) {
          delete this.cardResults[id];
        }
      }
    }
    if (config.interval !== undefined) {
      this.interval = config.interval;
    }
    if (config.timeout !== undefined) {
      this.timeout = config.timeout;
    }
    if (config.connectionConfig) {
      this.connectionConfig = config.connectionConfig;
    }
  }

  /**
   * Get the current status and all card results.
   */
  getStatus() {
    return {
      running: this.running,
      interval: this.interval,
      cards: this.cards,
      results: { ...this.cardResults },
    };
  }

  /**
   * Internal: schedule the next polling cycle.
   */
  _scheduleLoop() {
    if (!this.running) return;
    this._pollAll()
      .then(() => {
        if (this.running) {
          this.loopTimer = setTimeout(() => this._scheduleLoop(), this.interval);
        }
      })
      .catch((err) => {
        console.error('ModbusQueue polling loop terminated due to an unexpected error:', err);
        this.running = false;
      });
  }

  /**
   * Internal: poll all cards sequentially using a single connection.
   */
  async _pollAll() {
    if (!this.connectionConfig || this.cards.length === 0) return;

    const client = new ModbusRTU();
    try {
      await connectClient(client, this.connectionConfig);
      client.setTimeout(this.timeout);

      for (const card of this.cards) {
        if (!this.running) break;
        try {
          client.setID(card.slaveAddress);
          let data;
          switch (card.functionCode) {
            case 1: {
              const result = await client.readCoils(card.registerAddress, card.quantity);
              data = result.data.map(v => v ? 1 : 0);
              break;
            }
            case 2: {
              const result = await client.readDiscreteInputs(card.registerAddress, card.quantity);
              data = result.data.map(v => v ? 1 : 0);
              break;
            }
            case 3: {
              const result = await client.readHoldingRegisters(card.registerAddress, card.quantity);
              data = result.data;
              break;
            }
            case 4: {
              const result = await client.readInputRegisters(card.registerAddress, card.quantity);
              data = result.data;
              break;
            }
            default:
              throw new Error(`Unsupported function code: ${card.functionCode}`);
          }
          this.cardResults[card.cardId] = {
            success: true,
            data,
            error: null,
            lastUpdated: new Date().toISOString(),
          };
        } catch (error) {
          this.cardResults[card.cardId] = {
            success: false,
            data: null,
            error: getErrorMessage(error),
            lastUpdated: new Date().toISOString(),
          };
        }
      }

      try { await client.close(() => {}); } catch { }
    } catch (error) {
      // Connection-level failure: mark all cards as errored
      const errorMsg = getErrorMessage(error);
      const now = new Date().toISOString();
      for (const card of this.cards) {
        this.cardResults[card.cardId] = {
          success: false,
          data: null,
          error: errorMsg,
          lastUpdated: now,
        };
      }
      try { await client.close(() => {}); } catch { }
    }
  }
}

// Per-window dashboard queues: windowId -> ModbusQueue
const dashboardQueues = new Map();

/**
 * Cleanup resources for a closed window.
 */
function cleanupWindow(windowId) {
  const queue = dashboardQueues.get(windowId);
  if (queue) {
    queue.stop();
    dashboardQueues.delete(windowId);
  }
}

module.exports = { registerModbusHandlers, ModbusService, ModbusQueue, dashboardQueues, cleanupWindow };
