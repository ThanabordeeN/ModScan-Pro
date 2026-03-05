import { changeModbusAddress } from './modbus';
import ModbusRTU from 'modbus-serial';

// Mock modbus-serial
jest.mock('modbus-serial', () => {
  return jest.fn().mockImplementation(() => {
    return {
      connectRTUBuffered: jest.fn().mockResolvedValue(undefined),
      connectTCP: jest.fn().mockResolvedValue(undefined),
      setID: jest.fn(),
      setTimeout: jest.fn(),
      writeRegister: jest.fn().mockResolvedValue(undefined),
      writeRegisters: jest.fn().mockResolvedValue(undefined),
      readHoldingRegisters: jest.fn().mockResolvedValue({ data: [0] }),
      close: jest.fn().mockImplementation((cb) => cb && cb()),
    };
  });
});

// Mock serialport
jest.mock('serialport', () => ({
  SerialPort: {
    list: jest.fn().mockResolvedValue([]),
  },
}));

describe('changeModbusAddress', () => {
  const mockConfig = {
    type: 'serial' as const,
    port: '/dev/ttyUSB0',
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when new address is less than 1', async () => {
    const result = await changeModbusAddress(mockConfig, 1, 0);
    expect(result).toEqual({
      success: false,
      error: 'New address must be between 1 and 247',
    });
  });

  it('should return error when new address is greater than 247', async () => {
    const result = await changeModbusAddress(mockConfig, 1, 248);
    expect(result).toEqual({
      success: false,
      error: 'New address must be between 1 and 247',
    });
  });

  it('should return success when new address is valid', async () => {
      const result = await changeModbusAddress(mockConfig, 1, 2);
      expect(result).toEqual({
          success: true
      });
  });
});
