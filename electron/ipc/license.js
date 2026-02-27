const { machineIdSync } = require('node-machine-id');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// In Electron, we use app.getPath('userData') for license storage
const { app } = require('electron');

function getLicenseFilePath() {
  // In production, store in app data directory
  // In development, store in project root
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'license.dat');
  }
  return path.join(app.getPath('userData'), 'license.dat');
}

function getPublicKeyPath() {
  // In development, look in src/lib
  if (!app.isPackaged) {
    return path.join(process.cwd(), 'src', 'lib', 'public_key.pem');
  }
  
  // In production, try multiple locations where extraResources might land
  const paths = [
    path.join(process.resourcesPath, 'public_key.pem'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'public_key.pem'),
    path.join(path.dirname(process.execPath), 'resources', 'public_key.pem')
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }

  return paths[0]; // Default to first one
}

function getMachineId() {
  try {
    return machineIdSync();
  } catch (error) {
    console.error('Error getting machine ID:', error);
    return 'UNKNOWN_MACHINE_ID';
  }
}

function verifyLicense(inputKey) {
  const currentMachineId = getMachineId();
  let licenseKey = inputKey;
  const licenseFilePath = getLicenseFilePath();
  const publicKeyPath = getPublicKeyPath();

  // If no key provided, try to read from file
  if (!licenseKey) {
    try {
      if (fs.existsSync(licenseFilePath)) {
        licenseKey = fs.readFileSync(licenseFilePath, 'utf8').trim();
      }
    } catch (e) {
      console.error('Error reading license file:', e);
    }
  }

  if (!licenseKey) {
    return { valid: false, machineId: currentMachineId, error: 'No license key found' };
  }

  try {
    if (!fs.existsSync(publicKeyPath)) {
      console.error('Public key not found at:', publicKeyPath);
      return { valid: false, machineId: currentMachineId, error: 'System configuration error: Public key missing' };
    }

    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
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

function saveLicense(key) {
  try {
    const licenseFilePath = getLicenseFilePath();
    // Ensure directory exists
    const dir = path.dirname(licenseFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(licenseFilePath, key.trim());
    return true;
  } catch (error) {
    if (!app.isPackaged) {
      console.error('Error saving license:', error);
    }
    return false;
  }
}

/**
 * Register license IPC handlers
 */
function registerLicenseHandlers(ipcMain) {

  ipcMain.handle('license:get-machine-id', async () => {
    try {
      const machineId = getMachineId();
      return { success: true, machineId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('license:check', async () => {
    try {
      const status = verifyLicense();
      return { success: true, ...status };
    } catch (error) {
      return { success: false, error: 'Internal error checking license' };
    }
  });

  ipcMain.handle('license:activate', async (event, licenseKey) => {
    try {
      if (!licenseKey) {
        return { success: false, error: 'License key is required' };
      }

      const status = verifyLicense(licenseKey);

      if (status.valid) {
        const saved = saveLicense(licenseKey);
        if (saved) {
          return {
            success: true,
            valid: true,
            machineId: status.machineId,
            message: 'License activated successfully'
          };
        } else {
          return { success: false, error: 'Failed to save license file' };
        }
      } else {
        return {
          success: false,
          valid: false,
          machineId: status.machineId,
          error: status.error || 'Invalid license key'
        };
      }
    } catch (error) {
      return { success: false, error: 'Internal error processing license' };
    }
  });
}

module.exports = {
  registerLicenseHandlers,
  getMachineId,
  verifyLicense,
  saveLicense
};
