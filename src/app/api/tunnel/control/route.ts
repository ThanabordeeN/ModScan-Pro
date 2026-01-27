import { NextResponse } from 'next/server';
import { TunnelService } from '@/lib/tunnel-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, password } = body;

    if (action === 'start') {
      if (!password) {
        return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
      }
      
      // Port 3000 is default for Next.js, but could be dynamic. 
      // For now we assume 3000 as per requirements.
      console.log('API: Starting tunnel...');
      const result = await TunnelService.start(3000, password);
      console.log('API: Tunnel start result:', result);
      return NextResponse.json(result);
    } 
    
    if (action === 'stop') {
      const result = TunnelService.stop();
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  const status = TunnelService.getStatus();
  return NextResponse.json(status);
}
