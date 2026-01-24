import { NextRequest, NextResponse } from 'next/server';
import { 
  writeSingleCoil, 
  writeSingleRegister, 
  writeMultipleCoils, 
  writeMultipleRegisters,
  WriteFunctionCode 
} from '@/lib/modbus';
import type { ConnectionConfig } from '@/types/modbus';

interface WriteRequest {
  type?: 'serial' | 'tcp';
  port: string;
  baudRate: number;
  parity: 'none' | 'even' | 'odd';
  stopBits: 1 | 2;
  dataBits: 7 | 8;
  tcpIp?: string;
  tcpPort?: number;
  slaveAddress: number;
  functionCode: WriteFunctionCode;
  address: number;
  value?: number;        // For FC06
  values?: number[];     // For FC16
  coilValue?: boolean;   // For FC05
  coilValues?: boolean[]; // For FC15
  timeout?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: WriteRequest = await request.json();
    
    const { port, baudRate, parity, stopBits, dataBits, slaveAddress, functionCode, address, value, values, coilValue, coilValues, timeout, type, tcpIp, tcpPort } = body;
    
    // Validate input
    if (type === 'tcp') {
      if (!tcpIp || !tcpPort) {
        return NextResponse.json({ success: false, error: 'TCP IP and Port are required' }, { status: 400 });
      }
    } else if (!port) {
      return NextResponse.json({ success: false, error: 'Serial port is required' }, { status: 400 });
    }
    
    if (slaveAddress < 1 || slaveAddress > 247) {
      return NextResponse.json({ success: false, error: 'Slave address must be between 1 and 247' }, { status: 400 });
    }
    
    const config: ConnectionConfig = {
      type: type || 'serial',
      port,
      baudRate: baudRate || 9600,
      dataBits: dataBits || 8,
      stopBits: stopBits || 1,
      parity: parity || 'none',
      tcpIp,
      tcpPort,
    };
    
    let result;
    
    switch (functionCode) {
      case 5: // FC05 - Write Single Coil
        if (coilValue === undefined) {
          return NextResponse.json({ success: false, error: 'Coil value is required for FC05' }, { status: 400 });
        }
        result = await writeSingleCoil(config, slaveAddress, address, coilValue, timeout || 1000);
        break;
        
      case 6: // FC06 - Write Single Register
        if (value === undefined) {
          return NextResponse.json({ success: false, error: 'Register value is required for FC06' }, { status: 400 });
        }
        if (value < 0 || value > 65535) {
          return NextResponse.json({ success: false, error: 'Value must be between 0 and 65535' }, { status: 400 });
        }
        result = await writeSingleRegister(config, slaveAddress, address, value, timeout || 1000);
        break;
        
      case 15: // FC15 - Write Multiple Coils
        if (!coilValues || coilValues.length === 0) {
          return NextResponse.json({ success: false, error: 'Coil values array is required for FC15' }, { status: 400 });
        }
        result = await writeMultipleCoils(config, slaveAddress, address, coilValues, timeout || 1000);
        break;
        
      case 16: // FC16 - Write Multiple Registers
        if (!values || values.length === 0) {
          return NextResponse.json({ success: false, error: 'Register values array is required for FC16' }, { status: 400 });
        }
        for (const v of values) {
          if (v < 0 || v > 65535) {
            return NextResponse.json({ success: false, error: 'All values must be between 0 and 65535' }, { status: 400 });
          }
        }
        result = await writeMultipleRegisters(config, slaveAddress, address, values, timeout || 1000);
        break;
        
      default:
        return NextResponse.json({ success: false, error: 'Invalid function code. Use 5, 6, 15, or 16' }, { status: 400 });
    }
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        functionCode,
        address,
        message: `Successfully wrote to address ${address}`,
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('Error writing Modbus data:', error);
    return NextResponse.json({ success: false, error: 'Failed to write Modbus data' }, { status: 500 });
  }
}
