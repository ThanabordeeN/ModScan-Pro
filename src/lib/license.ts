import { machineIdSync } from 'node-machine-id';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const LICENSE_FILE_PATH = path.join(process.cwd(), 'license.dat');
const PUBLIC_KEY_PATH = path.join(process.cwd(), 'src', 'lib', 'public_key.pem');

export interface LicenseStatus {
  valid: boolean;
  machineId: string;
  error?: string;
}

export function getMachineId(): string {
  try {
    return machineIdSync();
  } catch (error) {
    console.error('Error getting machine ID from node-machine-id:', error);
    // Fallback or re-throw depending on strictness
    return 'UNKNOWN_MACHINE_ID'; 
  }
}

export function verifyLicense(inputKey?: string): LicenseStatus {
  const currentMachineId = getMachineId();
  let licenseKey = inputKey;

  // If no key provided, try to read from file
  if (!licenseKey) {
    try {
      if (fs.existsSync(LICENSE_FILE_PATH)) {
        licenseKey = fs.readFileSync(LICENSE_FILE_PATH, 'utf8').trim();
      }
    } catch (e) {
      // msg
      console.error('Error reading license file:', e);
    }
  }

  if (!licenseKey) {
    return { valid: false, machineId: currentMachineId, error: 'No license key found' };
  }

  try {
    if (!fs.existsSync(PUBLIC_KEY_PATH)) {
      console.error('Public key not found at:', PUBLIC_KEY_PATH);
      return { valid: false, machineId: currentMachineId, error: 'System configuration error: Public key missing' };
    }

    const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');

    const verifier = crypto.createVerify('SHA256');
    verifier.update(currentMachineId);
    verifier.end();

    const isValid = verifier.verify(publicKey, licenseKey, 'base64');

    return { 
      valid: isValid, 
      machineId: currentMachineId,
      error: isValid ? undefined : 'Invalid license key for this machine'
    };

  } catch (error) {
    console.error('License verification error:', error);
    return { valid: false, machineId: currentMachineId, error: 'Verification failed' };
  }
}

export function saveLicense(key: string): boolean {
  try {
    fs.writeFileSync(LICENSE_FILE_PATH, key.trim());
    return true;
  } catch (error) {
    console.error('Error saving license:', error);
    return false;
  }
}
