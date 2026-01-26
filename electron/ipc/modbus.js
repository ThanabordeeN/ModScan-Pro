const ModbusRTU = require('modbus-serial');

/**
 * Connect to Modbus device (RTU or TCP)
 */
async function connectClient(client, config) {
  if (config.type === 'tcp') {
    if (!config.tcpIp || !config.tcpPort) {
      throw new Error('TCP IP and Port are required');
    }
    await client.connectTCP(config.tcpIp, { port: config.tcpPort });
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
 * Register Modbus IPC handlers
 */
function registerModbusHandlers(ipcMain) {
  
  // Scan for devices
  ipcMain.handle('modbus:scan', async (event, config) => {
    const { startAddress, endAddress, timeout = 500 } = config;
    const client = new ModbusRTU();
    const devices = [];
    
    try {
      await connectClient(client, config);
      client.setTimeout(timeout);
      
      for (let address = startAddress; address <= endAddress; address++) {
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
          // Device not found at this address
        }
      }
      
      await client.close(() => {});
      return { success: true, devices, scannedCount: endAddress - startAddress + 1 };
    } catch (error) {
      try { await client.close(() => {}); } catch {}
      return { success: false, error: error.message || 'Scan failed' };
    }
  });
  
  // Read data
  ipcMain.handle('modbus:read', async (event, config) => {
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
      
      await client.close(() => {});
      return { success: true, data, slaveAddress, functionCode, registerAddress, quantity };
    } catch (error) {
      try { await client.close(() => {}); } catch {}
      return { success: false, error: error.message || 'Read failed' };
    }
  });
  
  // Write data
  ipcMain.handle('modbus:write', async (event, config) => {
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
      
      await client.close(() => {});
      return { success: true, functionCode, address, message: `Successfully wrote to address ${address}` };
    } catch (error) {
      try { await client.close(() => {}); } catch {}
      return { success: false, error: error.message || 'Write failed' };
    }
  });
  
  // Read batch
  ipcMain.handle('modbus:read-batch', async (event, config) => {
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
          results.push({ success: false, error: error.message });
        }
      }
      
      await client.close(() => {});
      return { results };
    } catch (error) {
      try { await client.close(() => {}); } catch {}
      return { results: [], error: error.message || 'Batch read failed' };
    }
  });
  
  // Change address
  ipcMain.handle('modbus:change-address', async (event, config) => {
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
      
      await client.close(() => {});
      
      // Verify change
      await new Promise(resolve => setTimeout(resolve, 500));
      await connectClient(client, config);
      client.setID(newAddress);
      client.setTimeout(timeout);
      await client.readHoldingRegisters(0, 1);
      await client.close(() => {});
      
      return { success: true };
    } catch (error) {
      try { await client.close(() => {}); } catch {}
      return { success: false, error: error.message || 'Change address failed' };
    }
  });
}

module.exports = { registerModbusHandlers };
