const { validateProjectData } = require('../../electron/ipc/project');

describe('project validation', () => {
  test('validates a correct project', () => {
    const validProject = {
      version: 1,
      name: 'Test Project',
      connection: {
        type: 'serial',
        port: 'COM3',
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
      },
      devices: [
        { slaveId: 1, alias: 'Sensor 1' },
      ],
      readRanges: [
        { id: 'default', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 10 },
      ],
      settings: {
        refreshInterval: 1000,
        readTimeout: 1000,
      },
    };
    expect(validateProjectData(validProject)).toBe(true);
  });

  test('rejects null data', () => {
    expect(validateProjectData(null)).toBe(false);
  });

  test('rejects undefined data', () => {
    expect(validateProjectData(undefined)).toBe(false);
  });

  test('rejects non-object data', () => {
    expect(validateProjectData('string')).toBe(false);
  });

  test('rejects missing version', () => {
    expect(validateProjectData({
      name: 'Test',
      connection: {},
      devices: [],
      readRanges: [],
      settings: {},
    })).toBe(false);
  });

  test('rejects missing name', () => {
    expect(validateProjectData({
      version: 1,
      connection: {},
      devices: [],
      readRanges: [],
      settings: {},
    })).toBe(false);
  });

  test('rejects empty name', () => {
    expect(validateProjectData({
      version: 1,
      name: '   ',
      connection: {},
      devices: [],
      readRanges: [],
      settings: {},
    })).toBe(false);
  });

  test('rejects missing connection', () => {
    expect(validateProjectData({
      version: 1,
      name: 'Test',
      devices: [],
      readRanges: [],
      settings: {},
    })).toBe(false);
  });

  test('rejects missing devices array', () => {
    expect(validateProjectData({
      version: 1,
      name: 'Test',
      connection: {},
      readRanges: [],
      settings: {},
    })).toBe(false);
  });

  test('rejects missing readRanges array', () => {
    expect(validateProjectData({
      version: 1,
      name: 'Test',
      connection: {},
      devices: [],
      settings: {},
    })).toBe(false);
  });

  test('rejects missing settings', () => {
    expect(validateProjectData({
      version: 1,
      name: 'Test',
      connection: {},
      devices: [],
      readRanges: [],
    })).toBe(false);
  });

  test('accepts project with empty devices and readRanges', () => {
    expect(validateProjectData({
      version: 1,
      name: 'Empty Project',
      connection: { type: 'tcp' },
      devices: [],
      readRanges: [],
      settings: { refreshInterval: 1000, readTimeout: 1000 },
    })).toBe(true);
  });

  test('accepts project with scanSettings and scannedDevices', () => {
    expect(validateProjectData({
      version: 1,
      name: 'Full State Project',
      connection: { type: 'serial', port: 'COM3', baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' },
      devices: [{ slaveId: 1, alias: 'Sensor 1' }],
      readRanges: [{ id: 'r1', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 10 }],
      settings: { refreshInterval: 1000, readTimeout: 1000 },
      scanSettings: { startAddress: 1, endAddress: 50, timeout: 500 },
      scannedDevices: [
        { address: 1, responseTime: 25 },
        { address: 15, responseTime: 42 },
      ],
    })).toBe(true);
  });

  test('accepts project without optional scanSettings and scannedDevices', () => {
    expect(validateProjectData({
      version: 1,
      name: 'No Scan Data',
      connection: { type: 'tcp' },
      devices: [],
      readRanges: [],
      settings: { refreshInterval: 2000, readTimeout: 500 },
    })).toBe(true);
  });

  test('accepts project with topology notes, device remarks and selectedRegisters', () => {
    expect(validateProjectData({
      version: 1,
      name: 'Full Topology Project',
      connection: { type: 'serial', port: 'COM3', baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' },
      devices: [{ slaveId: 1, alias: 'Sensor 1', remark: 'Installed at control room' }],
      readRanges: [{ id: 'r1', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 10, remark: 'Temperature' }],
      settings: { refreshInterval: 1000, readTimeout: 1000, selectedRegisters: ['1-0', '1-1'] },
      notes: 'RS485 Bus: PLC → ID:1 → ID:15, Cable 200m',
      scanSettings: { startAddress: 1, endAddress: 50, timeout: 500 },
      scannedDevices: [{ address: 1, responseTime: 25 }],
    })).toBe(true);
  });

  test('accepts project with readData and topologyLayout', () => {
    expect(validateProjectData({
      version: 1,
      name: 'Full State Project',
      connection: { type: 'serial', port: 'COM3', baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' },
      devices: [{ slaveId: 1, alias: 'Sensor 1' }],
      readRanges: [{ id: 'r1', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 10 }],
      settings: { refreshInterval: 1000, readTimeout: 1000 },
      readData: [{ rangeId: 'r1', data: [100, 200, 300] }],
      topologyLayout: {
        nodes: [{ id: 'master', position: { x: 50, y: 200 } }],
        edges: [{ id: 'edge-1', source: 'master', target: 'device-1' }],
      },
    })).toBe(true);
  });
});
