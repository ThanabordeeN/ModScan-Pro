import { NextRequest, NextResponse } from 'next/server';
import { readModbusDataBatch, BatchReadRequest } from '@/lib/modbus';
import type { ConnectionConfig } from '@/types/modbus';

interface RequestBody {
  port: string;
  baudRate: number;
  parity: 'none' | 'even' | 'odd';
  stopBits: 1 | 2;
  dataBits: 7 | 8;
  requests: BatchReadRequest[];
  timeout?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { port, baudRate, parity, stopBits, dataBits, requests, timeout } = body;

    if (!port || !requests || requests.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Port and requests are required' },
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
