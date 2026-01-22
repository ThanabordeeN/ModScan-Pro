import { NextRequest, NextResponse } from 'next/server';
import { scanAddressRange } from '@/lib/modbus';
import type { ScanRequest, ConnectionConfig } from '@/types/modbus';

export async function POST(request: NextRequest) {
  try {
    const body: ScanRequest = await request.json();
    
    const { port, baudRate, parity, stopBits, dataBits, startAddress, endAddress, timeout } = body;
    
    // Validate input
    if (!port) {
      return NextResponse.json(
        { success: false, error: 'Serial port is required' },
        { status: 400 }
      );
    }
    
    if (startAddress < 1 || startAddress > 247) {
      return NextResponse.json(
        { success: false, error: 'Start address must be between 1 and 247' },
        { status: 400 }
      );
    }
    
    if (endAddress < startAddress || endAddress > 247) {
      return NextResponse.json(
        { success: false, error: 'End address must be between start address and 247' },
        { status: 400 }
      );
    }
    
    const config: ConnectionConfig = {
      port,
      baudRate: baudRate || 9600,
      dataBits: dataBits || 8,
      stopBits: stopBits || 1,
      parity: parity || 'none',
    };
    
    const devices = await scanAddressRange(
      config,
      startAddress,
      endAddress,
      timeout || 500
    );
    
    return NextResponse.json({
      success: true,
      devices,
      scannedCount: endAddress - startAddress + 1,
    });
  } catch (error) {
    console.error('Error scanning Modbus addresses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to scan Modbus addresses' },
      { status: 500 }
    );
  }
}
