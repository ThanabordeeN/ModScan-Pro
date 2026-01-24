import { NextRequest, NextResponse } from 'next/server';
import { readModbusDataBatch, BatchReadRequest } from '@/lib/modbus';
import type { ConnectionConfig } from '@/types/modbus';

interface RequestBody {
  type?: 'serial' | 'tcp';
  port: string;
  baudRate: number;
  parity: 'none' | 'even' | 'odd';
  stopBits: 1 | 2;
  dataBits: 7 | 8;
  tcpIp?: string;
  tcpPort?: number;
  requests: BatchReadRequest[];
  timeout?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { port, baudRate, parity, stopBits, dataBits, requests, timeout, type, tcpIp, tcpPort } = body;

    // Validate type first then dependent fields
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

    if (!requests || requests.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Requests are required' },
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

    const { results, error } = await readModbusDataBatch(config, requests, timeout || 1000);

    if (error) {
      return NextResponse.json(
        { success: false, error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error batch reading Modbus data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute batch read' },
      { status: 500 }
    );
  }
}
