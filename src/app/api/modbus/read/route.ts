import { NextRequest, NextResponse } from 'next/server';
import { readModbusData, ReadFunctionCode } from '@/lib/modbus';
import type { ConnectionConfig } from '@/types/modbus';

interface ReadRequest {
  type?: 'serial' | 'tcp';
  port: string;
  baudRate: number;
  parity: 'none' | 'even' | 'odd';
  stopBits: 1 | 2;
  dataBits: 7 | 8;
  tcpIp?: string;
  tcpPort?: number;
  slaveAddress: number;
  functionCode: ReadFunctionCode;
  registerAddress: number;
  quantity: number;
  timeout?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ReadRequest = await request.json();
    
    const { port, baudRate, parity, stopBits, dataBits, slaveAddress, functionCode, registerAddress, quantity, timeout, type, tcpIp, tcpPort } = body;
    
    // Validate input
    if (type === 'tcp') {
      if (!tcpIp || !tcpPort) {
        return NextResponse.json(
          { success: false, error: 'TCP IP and Port are required' },
          { status: 400 }
        );
      }
    } else if (!port) {
      return NextResponse.json(
        { success: false, error: 'Serial port is required' },
        { status: 400 }
      );
    }
    
    if (slaveAddress < 1 || slaveAddress > 247) {
      return NextResponse.json(
        { success: false, error: 'Slave address must be between 1 and 247' },
        { status: 400 }
      );
    }
    
    if (![1, 2, 3, 4].includes(functionCode)) {
      return NextResponse.json(
        { success: false, error: 'Function code must be 1, 2, 3, or 4' },
        { status: 400 }
      );
    }
    
    if (quantity < 1 || quantity > 125) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be between 1 and 125' },
        { status: 400 }
      );
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
    
    const result = await readModbusData(
      config,
      slaveAddress,
      functionCode,
      registerAddress,
      quantity,
      timeout || 1000
    );
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        slaveAddress,
        functionCode,
        registerAddress,
        quantity,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error reading Modbus data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read Modbus data' },
      { status: 500 }
    );
  }
}
