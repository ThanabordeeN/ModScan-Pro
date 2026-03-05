/**
 * Tests for ModbusQueue class in electron/ipc/modbus.js
 * 
 * We mock modbus-serial to test the queue logic without real hardware.
 */

// Mock modbus-serial before requiring modbus.js
const mockClose = jest.fn().mockImplementation((cb) => cb && cb());
const mockSetID = jest.fn();
const mockSetTimeout = jest.fn();
const mockReadCoils = jest.fn();
const mockReadDiscreteInputs = jest.fn();
const mockReadHoldingRegisters = jest.fn();
const mockReadInputRegisters = jest.fn();
const mockConnectTCP = jest.fn();
const mockConnectRTUBuffered = jest.fn();

jest.mock('modbus-serial', () => {
  return jest.fn().mockImplementation(() => ({
    connectTCP: mockConnectTCP,
    connectRTUBuffered: mockConnectRTUBuffered,
    setID: mockSetID,
    setTimeout: mockSetTimeout,
    readCoils: mockReadCoils,
    readDiscreteInputs: mockReadDiscreteInputs,
    readHoldingRegisters: mockReadHoldingRegisters,
    readInputRegisters: mockReadInputRegisters,
    close: mockClose,
  }));
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ModbusQueue } = require('../../electron/ipc/modbus');

describe('ModbusQueue', () => {
  let queue: InstanceType<typeof ModbusQueue>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    queue = new ModbusQueue();

    // Default mock implementations
    mockConnectTCP.mockResolvedValue(undefined);
    mockConnectRTUBuffered.mockResolvedValue(undefined);
    mockReadHoldingRegisters.mockResolvedValue({ data: [100, 200] });
    mockReadCoils.mockResolvedValue({ data: [true, false] });
    mockReadDiscreteInputs.mockResolvedValue({ data: [false, true] });
    mockReadInputRegisters.mockResolvedValue({ data: [300, 400] });
  });

  afterEach(() => {
    queue.stop();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    test('initializes with default values', () => {
      expect(queue.running).toBe(false);
      expect(queue.cards).toEqual([]);
      expect(queue.interval).toBe(1000);
      expect(queue.cardResults).toEqual({});
    });
  });

  describe('start', () => {
    test('sets running state and stores config', () => {
      const config = {
        cards: [
          { cardId: 'card1', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 2 },
        ],
        connectionConfig: { type: 'tcp', tcpIp: '127.0.0.1', tcpPort: 502 },
        interval: 2000,
        timeout: 500,
      };

      queue.start(config);

      expect(queue.running).toBe(true);
      expect(queue.cards).toEqual(config.cards);
      expect(queue.interval).toBe(2000);
      expect(queue.timeout).toBe(500);
      expect(queue.cardResults['card1']).toBeDefined();
    });

    test('initializes card results for each card', () => {
      queue.start({
        cards: [
          { cardId: 'a', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 1 },
          { cardId: 'b', slaveAddress: 2, functionCode: 4, registerAddress: 0, quantity: 1 },
        ],
        connectionConfig: { type: 'tcp', tcpIp: '127.0.0.1', tcpPort: 502 },
      });

      expect(queue.cardResults['a']).toEqual({ success: false, data: null, error: null, lastUpdated: null });
      expect(queue.cardResults['b']).toEqual({ success: false, data: null, error: null, lastUpdated: null });
    });
  });

  describe('stop', () => {
    test('sets running to false', () => {
      queue.start({
        cards: [{ cardId: 'card1', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 1 }],
        connectionConfig: { type: 'tcp', tcpIp: '127.0.0.1', tcpPort: 502 },
      });

      expect(queue.running).toBe(true);
      queue.stop();
      expect(queue.running).toBe(false);
    });
  });

  describe('update', () => {
    test('updates cards list', () => {
      queue.start({
        cards: [{ cardId: 'card1', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 1 }],
        connectionConfig: { type: 'tcp', tcpIp: '127.0.0.1', tcpPort: 502 },
      });

      queue.update({
        cards: [
          { cardId: 'card1', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 1 },
          { cardId: 'card2', slaveAddress: 2, functionCode: 4, registerAddress: 0, quantity: 5 },
        ],
      });

      expect(queue.cards).toHaveLength(2);
      expect(queue.cardResults['card2']).toBeDefined();
    });

    test('removes results for cards no longer present', () => {
      queue.start({
        cards: [
          { cardId: 'card1', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 1 },
          { cardId: 'card2', slaveAddress: 2, functionCode: 3, registerAddress: 0, quantity: 1 },
        ],
        connectionConfig: { type: 'tcp', tcpIp: '127.0.0.1', tcpPort: 502 },
      });

      queue.update({
        cards: [{ cardId: 'card1', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 1 }],
      });

      expect(queue.cardResults['card1']).toBeDefined();
      expect(queue.cardResults['card2']).toBeUndefined();
    });

    test('updates interval', () => {
      queue.start({
        cards: [],
        connectionConfig: { type: 'tcp', tcpIp: '127.0.0.1', tcpPort: 502 },
        interval: 1000,
      });

      queue.update({ interval: 5000 });
      expect(queue.interval).toBe(5000);
    });

    test('updates timeout', () => {
      queue.start({
        cards: [],
        connectionConfig: { type: 'tcp', tcpIp: '127.0.0.1', tcpPort: 502 },
      });

      queue.update({ timeout: 2000 });
      expect(queue.timeout).toBe(2000);
    });
  });

  describe('getStatus', () => {
    test('returns current state', () => {
      const cards = [{ cardId: 'c1', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 1 }];
      queue.start({
        cards,
        connectionConfig: { type: 'tcp', tcpIp: '127.0.0.1', tcpPort: 502 },
        interval: 3000,
      });

      const status = queue.getStatus();
      expect(status.running).toBe(true);
      expect(status.interval).toBe(3000);
      expect(status.cards).toEqual(cards);
      expect(status.results).toHaveProperty('c1');
    });
  });

  describe('_pollAll', () => {
    test('reads each card sequentially using the correct function code', async () => {
      queue.cards = [
        { cardId: 'fc1', slaveAddress: 1, functionCode: 1, registerAddress: 0, quantity: 2 },
        { cardId: 'fc2', slaveAddress: 2, functionCode: 2, registerAddress: 0, quantity: 2 },
        { cardId: 'fc3', slaveAddress: 3, functionCode: 3, registerAddress: 0, quantity: 2 },
        { cardId: 'fc4', slaveAddress: 4, functionCode: 4, registerAddress: 0, quantity: 2 },
      ];
      queue.connectionConfig = { type: 'tcp', tcpIp: '127.0.0.1', tcpPort: 502 };
      queue.timeout = 500;
      queue.running = true;
      queue.cardResults = {
        fc1: { success: false, data: null, error: null, lastUpdated: null },
        fc2: { success: false, data: null, error: null, lastUpdated: null },
        fc3: { success: false, data: null, error: null, lastUpdated: null },
        fc4: { success: false, data: null, error: null, lastUpdated: null },
      };

      await queue._pollAll();

      expect(mockReadCoils).toHaveBeenCalledWith(0, 2);
      expect(mockReadDiscreteInputs).toHaveBeenCalledWith(0, 2);
      expect(mockReadHoldingRegisters).toHaveBeenCalledWith(0, 2);
      expect(mockReadInputRegisters).toHaveBeenCalledWith(0, 2);

      expect(queue.cardResults['fc1'].success).toBe(true);
      expect(queue.cardResults['fc1'].data).toEqual([1, 0]);
      expect(queue.cardResults['fc2'].success).toBe(true);
      expect(queue.cardResults['fc2'].data).toEqual([0, 1]);
      expect(queue.cardResults['fc3'].success).toBe(true);
      expect(queue.cardResults['fc3'].data).toEqual([100, 200]);
      expect(queue.cardResults['fc4'].success).toBe(true);
      expect(queue.cardResults['fc4'].data).toEqual([300, 400]);
    });

    test('handles per-card errors gracefully', async () => {
      mockReadHoldingRegisters
        .mockResolvedValueOnce({ data: [42] }) // card1 succeeds
        .mockRejectedValueOnce(new Error('Timed out')); // card2 fails

      queue.cards = [
        { cardId: 'ok', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 1 },
        { cardId: 'fail', slaveAddress: 99, functionCode: 3, registerAddress: 0, quantity: 1 },
      ];
      queue.connectionConfig = { type: 'tcp', tcpIp: '127.0.0.1', tcpPort: 502 };
      queue.timeout = 500;
      queue.running = true;
      queue.cardResults = {
        ok: { success: false, data: null, error: null, lastUpdated: null },
        fail: { success: false, data: null, error: null, lastUpdated: null },
      };

      await queue._pollAll();

      expect(queue.cardResults['ok'].success).toBe(true);
      expect(queue.cardResults['ok'].data).toEqual([42]);
      expect(queue.cardResults['fail'].success).toBe(false);
      expect(queue.cardResults['fail'].error).toContain('Timed Out');
    });

    test('handles connection-level failure', async () => {
      mockConnectTCP.mockRejectedValue(new Error('ECONNREFUSED'));

      queue.cards = [
        { cardId: 'c1', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 1 },
      ];
      queue.connectionConfig = { type: 'tcp', tcpIp: '192.168.1.1', tcpPort: 502 };
      queue.timeout = 500;
      queue.running = true;
      queue.cardResults = { c1: { success: false, data: null, error: null, lastUpdated: null } };

      await queue._pollAll();

      expect(queue.cardResults['c1'].success).toBe(false);
      expect(queue.cardResults['c1'].error).toContain('Connection Refused');
    });

    test('skips polling when no cards', async () => {
      queue.cards = [];
      queue.connectionConfig = { type: 'tcp', tcpIp: '127.0.0.1', tcpPort: 502 };
      queue.running = true;
      queue.cardResults = {};

      await queue._pollAll();

      expect(mockConnectTCP).not.toHaveBeenCalled();
    });

    test('skips polling when no connection config', async () => {
      queue.cards = [{ cardId: 'c1', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 1 }];
      queue.connectionConfig = null;
      queue.running = true;

      await queue._pollAll();

      expect(mockConnectTCP).not.toHaveBeenCalled();
    });
  });
});
