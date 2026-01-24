import ModbusRTU from 'modbus-serial';
import { SerialPort } from 'serialport';
import type { SerialPortInfo, ModbusDevice, ConnectionConfig } from '@/types/modbus';

export async function listSerialPorts(): Promise<SerialPortInfo[]> {
  try {
    const ports = await SerialPort.list();
    return ports
      .filter(port => {
        // Filter out linux standard serial ports that often appear even if not present/connected
        // unless they have explicit vendor/product IDs indicating a real device
        if (port.path.includes('ttyS') || port.path.includes('ttyprintk')) {
          return !!(port.vendorId || port.productId);
        }
        return true;
      })
      .map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        pnpId: port.pnpId,
        vendorId: port.vendorId,
        productId: port.productId,
      }));
  } catch (error) {
    console.error('Error listing serial ports:', error);
    return [];
  }
}

export async function scanModbusAddress(
  config: ConnectionConfig,
  address: number,
  timeout: number = 500
): Promise<ModbusDevice | null> {
  const client = new ModbusRTU();
  
  try {
    await client.connectRTUBuffered(config.port, {
      baudRate: config.baudRate,
      dataBits: config.dataBits,
      stopBits: config.stopBits,
      parity: config.parity,
    });
    
    client.setID(address);
    client.setTimeout(timeout);
    
    const startTime = Date.now();
    
    // Try to read holding registers (function code 03)
    const result = await client.readHoldingRegisters(0, 1);
    
    const responseTime = Date.now() - startTime;
    
    await client.close(() => {});
    
    return {
      address,
      responseTime,
      holdingRegisters: result.data,
    };
  } catch {
    try {
      await client.close(() => {});
    } catch {}
    return null;
  }
}

export async function scanAddressRange(
  config: ConnectionConfig,
  startAddress: number,
  endAddress: number,
  timeout: number = 500,
  onProgress?: (address: number, found: boolean) => void
): Promise<ModbusDevice[]> {
  const devices: ModbusDevice[] = [];
  const client = new ModbusRTU();
  
  try {
    await client.connectRTUBuffered(config.port, {
      baudRate: config.baudRate,
      dataBits: config.dataBits,
      stopBits: config.stopBits,
      parity: config.parity,
    });
    
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
        
        onProgress?.(address, true);
      } catch {
        onProgress?.(address, false);
      }
    }
    
    await client.close(() => {});
  } catch (error) {
    console.error('Error scanning address range:', error);
    try {
      await client.close(() => {});
    } catch {}
  }
  
  return devices;
}

export async function changeModbusAddress(
  config: ConnectionConfig,
  currentAddress: number,
  newAddress: number,
  registerAddress: number = 0,
  functionCode: 6 | 16 = 6,
  timeout: number = 1000
): Promise<{ success: boolean; error?: string }> {
  const client = new ModbusRTU();
  
  try {
    // Validate new address
    if (newAddress < 1 || newAddress > 247) {
      return { success: false, error: 'New address must be between 1 and 247' };
    }
    
    await client.connectRTUBuffered(config.port, {
      baudRate: config.baudRate,
      dataBits: config.dataBits,
      stopBits: config.stopBits,
      parity: config.parity,
    });
    
    client.setID(currentAddress);
    client.setTimeout(timeout);
    
    // Write new address using the specified function code
    if (functionCode === 6) {
      // FC 6 - Write Single Register
      await client.writeRegister(registerAddress, newAddress);
    } else {
      // FC 16 - Write Multiple Registers
      await client.writeRegisters(registerAddress, [newAddress]);
    }
    
    await client.close(() => {});
    
    // Verify the change by trying to communicate with new address
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await client.connectRTUBuffered(config.port, {
      baudRate: config.baudRate,
      dataBits: config.dataBits,
      stopBits: config.stopBits,
      parity: config.parity,
    });
    
    client.setID(newAddress);
    client.setTimeout(timeout);
    
    // Try to read from new address
    await client.readHoldingRegisters(0, 1);
    
    await client.close(() => {});
    
    return { success: true };
  } catch (error) {
    try {
      await client.close(() => {});
    } catch {}
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export type ReadFunctionCode = 1 | 2 | 3 | 4;

export interface ReadResult {
  success: boolean;
  data?: number[];
  error?: string;
}

export async function readModbusData(
  config: ConnectionConfig,
  slaveAddress: number,
  functionCode: ReadFunctionCode,
  registerAddress: number,
  quantity: number,
  timeout: number = 1000
): Promise<ReadResult> {
  const client = new ModbusRTU();
  
  try {
    await client.connectRTUBuffered(config.port, {
      baudRate: config.baudRate,
      dataBits: config.dataBits,
      stopBits: config.stopBits,
      parity: config.parity,
    });
    
    client.setID(slaveAddress);
    client.setTimeout(timeout);
    
    let data: number[];
    
    switch (functionCode) {
      case 1: {
        // FC01 - Read Coils (returns boolean[])
        const result = await client.readCoils(registerAddress, quantity);
        data = result.data.map(v => v ? 1 : 0);
        break;
      }
      case 2: {
        // FC02 - Read Discrete Inputs (returns boolean[])
        const result = await client.readDiscreteInputs(registerAddress, quantity);
        data = result.data.map(v => v ? 1 : 0);
        break;
      }
      case 3: {
        // FC03 - Read Holding Registers
        const result = await client.readHoldingRegisters(registerAddress, quantity);
        data = result.data;
        break;
      }
      case 4: {
        // FC04 - Read Input Registers
        const result = await client.readInputRegisters(registerAddress, quantity);
        data = result.data;
        break;
      }
      default:
        throw new Error(`Unsupported function code: ${functionCode}`);
    }
    
    await client.close(() => {});
    
    return { success: true, data };
  } catch (error) {
    try {
      await client.close(() => {});
    } catch {}
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Write Function Codes
export type WriteFunctionCode = 5 | 6 | 15 | 16;

export interface WriteResult {
  success: boolean;
  error?: string;
}

// FC05 - Write Single Coil
export async function writeSingleCoil(
  config: ConnectionConfig,
  slaveAddress: number,
  coilAddress: number,
  value: boolean,
  timeout: number = 1000
): Promise<WriteResult> {
  const client = new ModbusRTU();
  
  try {
    await client.connectRTUBuffered(config.port, {
      baudRate: config.baudRate,
      dataBits: config.dataBits,
      stopBits: config.stopBits,
      parity: config.parity,
    });
    
    client.setID(slaveAddress);
    client.setTimeout(timeout);
    
    await client.writeCoil(coilAddress, value);
    
    await client.close(() => {});
    return { success: true };
  } catch (error) {
    try { await client.close(() => {}); } catch {}
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// FC06 - Write Single Register
export async function writeSingleRegister(
  config: ConnectionConfig,
  slaveAddress: number,
  registerAddress: number,
  value: number,
  timeout: number = 1000
): Promise<WriteResult> {
  const client = new ModbusRTU();
  
  try {
    await client.connectRTUBuffered(config.port, {
      baudRate: config.baudRate,
      dataBits: config.dataBits,
      stopBits: config.stopBits,
      parity: config.parity,
    });
    
    client.setID(slaveAddress);
    client.setTimeout(timeout);
    
    await client.writeRegister(registerAddress, value);
    
    await client.close(() => {});
    return { success: true };
  } catch (error) {
    try { await client.close(() => {}); } catch {}
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// FC15 - Write Multiple Coils
export async function writeMultipleCoils(
  config: ConnectionConfig,
  slaveAddress: number,
  startAddress: number,
  values: boolean[],
  timeout: number = 1000
): Promise<WriteResult> {
  const client = new ModbusRTU();
  
  try {
    await client.connectRTUBuffered(config.port, {
      baudRate: config.baudRate,
      dataBits: config.dataBits,
      stopBits: config.stopBits,
      parity: config.parity,
    });
    
    client.setID(slaveAddress);
    client.setTimeout(timeout);
    
    await client.writeCoils(startAddress, values);
    
    await client.close(() => {});
    return { success: true };
  } catch (error) {
    try { await client.close(() => {}); } catch {}
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// FC16 - Write Multiple Registers
export async function writeMultipleRegisters(
  config: ConnectionConfig,
  slaveAddress: number,
  startAddress: number,
  values: number[],
  timeout: number = 1000
): Promise<WriteResult> {
  const client = new ModbusRTU();
  
  try {
    await client.connectRTUBuffered(config.port, {
      baudRate: config.baudRate,
      dataBits: config.dataBits,
      stopBits: config.stopBits,
      parity: config.parity,
    });
    
    client.setID(slaveAddress);
    client.setTimeout(timeout);
    
    await client.writeRegisters(startAddress, values);
    
    await client.close(() => {});
    return { success: true };
  } catch (error) {
    try { await client.close(() => {}); } catch {}
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export interface BatchReadRequest {
  slaveAddress: number;
  functionCode: ReadFunctionCode;
  registerAddress: number;
  quantity: number;
}

export async function readModbusDataBatch(
  config: ConnectionConfig,
  requests: BatchReadRequest[],
  timeout: number = 1000
): Promise<{ results: ReadResult[], error?: string }> {
  const client = new ModbusRTU();
  const results: ReadResult[] = [];

  try {
    await client.connectRTUBuffered(config.port, {
      baudRate: config.baudRate,
      dataBits: config.dataBits,
      stopBits: config.stopBits,
      parity: config.parity,
    });
    
    client.setTimeout(timeout);

    for (const req of requests) {
      client.setID(req.slaveAddress);
      
      try {
        let data: number[];
        
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
          default:
            throw new Error(`Unsupported function code: ${req.functionCode}`);
        }
        
        results.push({ success: true, data });
      } catch (error) {
         results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }
    
    await client.close(() => {});
    return { results };

  } catch (error) {
    try { await client.close(() => {}); } catch {}
    
    return {
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
