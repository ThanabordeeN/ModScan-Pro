const ModbusRTU = require('modbus-serial');
const { connectClient, getErrorMessage, extractExceptionInfo } = require('./modbus-helpers');
const { ModbusQueue } = require('./dashboard-poller');
const { diagnosticService } = require('./diagnostic');

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
      // not cancelled here
      return { success: true, devices, scannedCount: total, cancelled: !!(windowId && scanAbortFlags.get(windowId)) };
    } catch (error) {
      try { await client.close(() => { }); } catch { }
      if (windowId) scanAbortFlags.delete(windowId);
      const msg = getErrorMessage(error);
      diagnosticService.logError({
        module: 'scan',
        action: 'scan_failed',
        message: error.message,
        userMessage: msg,
        severity: 'error',
        rawError: error.stack,
        context: {
          connectionType: config.type,
          port: config.port,
          tcpIp: config.tcpIp,
          tcpPort: config.tcpPort,
          startAddress: config.startAddress,
        },
      });
      return { success: false, error: msg };
    }
  },

  read: async (config) => {
    const { slaveAddress, functionCode, registerAddress, quantity, timeout = 1000 } = config;
    const client = new ModbusRTU();
    let startTime = Date.now();

    try {
      await connectClient(client, config);
      client.setID(slaveAddress);
      client.setTimeout(timeout);

      startTime = Date.now();

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

      const latencyMs = Date.now() - startTime;
      await client.close(() => { });
      return { success: true, data, slaveAddress, functionCode, registerAddress, quantity, latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      try { await client.close(() => { }); } catch { }
      const msg = getErrorMessage(error);
      const excInfo = extractExceptionInfo(error, functionCode);
      diagnosticService.logError({
        module: 'read',
        action: 'read_failed',
        message: error.message,
        userMessage: msg,
        severity: 'error',
        rawError: error.stack,
        context: {
          connectionType: config.type,
          port: config.port,
          tcpIp: config.tcpIp,
          slaveId: config.slaveAddress,
          functionCode: config.functionCode,
          startAddress: config.registerAddress,
          quantity: config.quantity,
          latencyMs,
        },
      });
      return {
        success: false,
        error: msg,
        latencyMs,
        exceptionCode: excInfo.exceptionCode,
        exceptionName: excInfo.exceptionName,
        isException: excInfo.isException,
      };
    }
  },

  write: async (config) => {
    const { slaveAddress, functionCode, address, value, values, coilValue, coilValues, timeout = 1000 } = config;
    const client = new ModbusRTU();

    const riskLevel = (functionCode === 15 || functionCode === 16) ? 'high' : 'medium';
    const writeContext = {
      connectionType: config.type,
      port: config.port,
      tcpIp: config.tcpIp,
      slaveId: slaveAddress,
      functionCode,
      startAddress: address,
    };

    diagnosticService.logAction({
      action: 'write_attempt',
      module: 'write',
      description: `FC${functionCode} write to slave ${slaveAddress} addr ${address}`,
      riskLevel,
      context: writeContext,
    });

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
      diagnosticService.logAction({
        action: 'write_success',
        module: 'write',
        description: `FC${functionCode} write success slave ${slaveAddress} addr ${address}`,
        riskLevel,
        context: writeContext,
        result: 'success',
      });
      return { success: true, functionCode, address, message: `Successfully wrote to address ${address}` };
    } catch (error) {
      try { await client.close(() => { }); } catch { }
      const msg = getErrorMessage(error);
      diagnosticService.logAction({
        action: 'write_failed',
        module: 'write',
        description: `FC${functionCode} write failed slave ${slaveAddress} addr ${address}: ${msg}`,
        riskLevel,
        context: writeContext,
        result: 'failed',
      });
      diagnosticService.logError({
        module: 'write',
        action: 'write_failed',
        message: error.message,
        userMessage: msg,
        severity: 'error',
        rawError: error.stack,
        context: writeContext,
      });
      return { success: false, error: msg };
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
        let reqStartTime = Date.now();
        try {
          let data;
          reqStartTime = Date.now();
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
          const latencyMs = Date.now() - reqStartTime;
          results.push({ success: true, data, latencyMs });
        } catch (error) {
          const latencyMs = Date.now() - reqStartTime;
          const excInfo = extractExceptionInfo(error, req.functionCode);
          results.push({
            success: false,
            error: getErrorMessage(error),
            latencyMs,
            exceptionCode: excInfo.exceptionCode,
            exceptionName: excInfo.exceptionName,
            isException: excInfo.isException,
          });
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
          } catch { /* ignore */ }
          
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
      } catch { /* ignore */ }
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
