import { NextRequest, NextResponse } from 'next/server';
import { changeModbusAddress } from '@/lib/modbus';
import type { ChangeAddressRequest, ConnectionConfig } from '@/types/modbus';

export async function POST(request: NextRequest) {
  try {
    const body: ChangeAddressRequest & { type?: 'serial' | 'tcp', tcpIp?: string, tcpPort?: number } = await request.json();
    
    const { port, baudRate, parity, stopBits, dataBits, currentAddress, newAddress, registerAddress, functionCode, type, tcpIp, tcpPort } = body;
    
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
    
    if (currentAddress < 1 || currentAddress > 247) {
      return NextResponse.json(
        { success: false, error: 'Current address must be between 1 and 247' },
        { status: 400 }
      );
    }
    
    if (newAddress < 1 || newAddress > 247) {
      return NextResponse.json(
        { success: false, error: 'New address must be between 1 and 247' },
        { status: 400 }
      );
    }
    
    if (currentAddress === newAddress) {
      return NextResponse.json(
        { success: false, error: 'New address must be different from current address' },
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
    
    const result = await changeModbusAddress(
      config,
      currentAddress,
      newAddress,
      registerAddress ?? 0,
      functionCode ?? 6
    );
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        oldAddress: currentAddress,
        newAddress,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error changing Modbus address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to change Modbus address' },
      { status: 500 }
    );
  }
}
