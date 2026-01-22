import { NextResponse } from 'next/server';
import { verifyLicense, saveLicense } from '@/lib/license';

export async function GET() {
  try {
    const status = verifyLicense();
    return NextResponse.json({
      success: true,
      ...status
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Internal server error checking license'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { licenseKey } = body;

    if (!licenseKey) {
      return NextResponse.json({
        success: false,
        error: 'License key is required'
      }, { status: 400 });
    }

    // Verify BEFORE saving
    const status = verifyLicense(licenseKey);

    if (status.valid) {
      const saved = saveLicense(licenseKey);
      if (saved) {
        return NextResponse.json({
          success: true,
          valid: true,
          machineId: status.machineId,
          message: 'License activated successfully'
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Failed to save license file'
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({
        success: false,
        valid: false,
        machineId: status.machineId,
        error: status.error || 'Invalid license key'
      }, { status: 400 });
    }

  } catch {
    return NextResponse.json({
      success: false,
      error: 'Internal server error processing license'
    }, { status: 500 });
  }
}
