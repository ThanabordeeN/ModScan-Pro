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
});
