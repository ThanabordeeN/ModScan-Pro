import { NextResponse } from 'next/server';
import { listSerialPorts } from '@/lib/modbus';

export async function GET() {
  try {
    const ports = await listSerialPorts();
    return NextResponse.json({ success: true, ports });
  } catch (error) {
    console.error('Error listing serial ports:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list serial ports' },
      { status: 500 }
    );
  }
}
