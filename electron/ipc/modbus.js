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
// Define ModbusService to share logic between IPC and API
const ModbusService = {
  scan: async (config, sender) => {
    const { startAddress, endAddress, timeout = 500 } = config;
    const client = new ModbusRTU();
    const devices = [];

    try {
      await connectClient(client, config);
      client.setTimeout(timeout);
      
      const total = endAddress - startAddress + 1;
      let count = 0;

      for (let address = startAddress; address <= endAddress; address++) {
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
          devices.push({
            address,
            responseTime,
            holdingRegisters: result.data,
          });
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
      return { success: true, devices, scannedCount: total };
    } catch (error) {
      try { await client.close(() => { }); } catch { }
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
    const client = new ModbusRTU();

    try {
      if (newAddress < 1 || newAddress > 247) {
        return { success: false, error: 'New address must be between 1 and 247' };
      }

      await connectClient(client, config);
      client.setID(currentAddress);
      client.setTimeout(timeout);

      if (functionCode === 6) {
        await client.writeRegister(registerAddress, newAddress);
      } else {
        await client.writeRegisters(registerAddress, [newAddress]);
      }

      await client.close(() => { });

      // Verify change
      await new Promise(resolve => setTimeout(resolve, 500));
      await connectClient(client, config);
      client.setID(newAddress);
      client.setTimeout(timeout);
      await client.readHoldingRegisters(0, 1);
      await client.close(() => { });

      return { success: true };
    } catch (error) {
      try { await client.close(() => { }); } catch { }
      return { success: false, error: getErrorMessage(error) };
    }
  }
};

/**
 * Register Modbus IPC handlers
 */
function registerModbusHandlers(ipcMain) {

  // Scan for devices
  ipcMain.handle('modbus:scan', async (event, config) => {
    return ModbusService.scan(config, event.sender);
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
}

module.exports = { registerModbusHandlers, ModbusService };
