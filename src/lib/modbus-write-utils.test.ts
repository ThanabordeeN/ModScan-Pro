import {
  parseModbusAddress,
  crc16Bytes,
  combineBytes,
  buildFrameSegments,
  h,
} from './modbus-write-utils';

describe('parseModbusAddress', () => {
  it('parses 0-based offset', () => {
    expect(parseModbusAddress('0')).toEqual({ raw: 0, notation: '0-based offset' });
    expect(parseModbusAddress('2000')).toEqual({ raw: 2000, notation: '0-based offset' });
    expect(parseModbusAddress('65535')).toEqual({ raw: 65535, notation: '0-based offset' });
  });

  it('parses hex prefix', () => {
    expect(parseModbusAddress('0x07D0')).toEqual({ raw: 2000, notation: 'hex (0X07D0)' });
    expect(parseModbusAddress('0x0000')).toEqual({ raw: 0, notation: 'hex (0X0000)' });
    expect(parseModbusAddress('0xFFFF')).toEqual({ raw: 65535, notation: 'hex (0XFFFF)' });
  });

  it('parses hex suffix', () => {
    expect(parseModbusAddress('07D0H')).toEqual({ raw: 2000, notation: 'hex suffix (07D0H)' });
    expect(parseModbusAddress('0H')).toEqual({ raw: 0, notation: 'hex suffix (0H)' });
  });

  it('parses 40001-style Holding Register', () => {
    expect(parseModbusAddress('40001')).toEqual({ raw: 0, notation: 'Holding Register 4x (40001 → 0)' });
    expect(parseModbusAddress('42001')).toEqual({ raw: 2000, notation: 'Holding Register 4x (42001 → 2000)' });
    expect(parseModbusAddress('49999')).toEqual({ raw: 9998, notation: 'Holding Register 4x (49999 → 9998)' });
  });

  it('parses 30001-style Input Register', () => {
    expect(parseModbusAddress('30001')).toEqual({ raw: 0, notation: 'Input Register 3x (30001 → 0)' });
    expect(parseModbusAddress('32001')).toEqual({ raw: 2000, notation: 'Input Register 3x (32001 → 2000)' });
  });

  it('parses 00001-style Coil', () => {
    expect(parseModbusAddress('00001')).toEqual({ raw: 0, notation: 'Coil 0x (1 → 0)' });
    expect(parseModbusAddress('00010')).toEqual({ raw: 9, notation: 'Coil 0x (10 → 9)' });
  });

  it('parses 10001-style Discrete Input', () => {
    expect(parseModbusAddress('10001')).toEqual({ raw: 0, notation: 'Discrete Input 1x (10001 → 0)' });
    expect(parseModbusAddress('10010')).toEqual({ raw: 9, notation: 'Discrete Input 1x (10010 → 9)' });
  });

  it('returns 0 for unrecognized', () => {
    expect(parseModbusAddress('abc')).toEqual({ raw: 0, notation: 'unrecognized → 0' });
    expect(parseModbusAddress('')).toEqual({ raw: 0, notation: '0-based offset' });
  });
});

describe('crc16Bytes', () => {
  it('computes CRC for known Modbus frame', () => {
    // FC03 read holding register: slave=1, FC=03, addr=0, qty=1
    // Expected CRC for 01 03 00 00 00 01 = 84 0A (little-endian: 0A 84)
    const frame = [0x01, 0x03, 0x00, 0x00, 0x00, 0x01];
    const [crcLo, crcHi] = crc16Bytes(frame);
    expect(crcLo).toBe(0x84);
    expect(crcHi).toBe(0x0A);
  });

  it('computes CRC for FC06 write', () => {
    // 01 06 00 00 00 0A → CRC should verify
    const frame = [0x01, 0x06, 0x00, 0x00, 0x00, 0x0A];
    const [crcLo, crcHi] = crc16Bytes(frame);
    // Verify by running CRC over full frame including CRC (should be 0)
    const full = [...frame, crcLo, crcHi];
    const [verifyLo, verifyHi] = crc16Bytes(full);
    expect(verifyLo).toBe(0x00);
    expect(verifyHi).toBe(0x00);
  });
});

describe('combineBytes', () => {
  it('combines big-endian', () => {
    expect(combineBytes(0x07, 0xD0, 'big')).toBe(0x07D0); // 2000
    expect(combineBytes(0x00, 0x00, 'big')).toBe(0x0000);
    expect(combineBytes(0xFF, 0xFF, 'big')).toBe(0xFFFF);
  });

  it('combines little-endian', () => {
    expect(combineBytes(0xD0, 0x07, 'little')).toBe(0x07D0); // 2000
    expect(combineBytes(0x00, 0x00, 'little')).toBe(0x0000);
    expect(combineBytes(0xFF, 0xFF, 'little')).toBe(0xFFFF);
  });

  it('clamps out-of-range bytes', () => {
    expect(combineBytes(300, 0, 'big')).toBe(0xFF00); // 300 clamped to 255
    expect(combineBytes(0, -10, 'big')).toBe(0x0000); // -10 clamped to 0
  });
});

describe('buildFrameSegments', () => {
  it('builds FC06 big-endian frame correctly', () => {
    const segs = buildFrameSegments('fc06', 1, 0, 0x07D0, 0, [], [], 'big');
    expect(segs[0]).toEqual({ bytes: [1], label: 'ID', color: expect.any(String) });
    expect(segs[1]).toEqual({ bytes: [6], label: 'FC', color: expect.any(String) });
    expect(segs[2]).toEqual({ bytes: [0, 0], label: 'REG', color: expect.any(String) });
    expect(segs[3]).toEqual({ bytes: [0x07, 0xD0], label: 'VAL', color: expect.any(String) });
    expect(segs[4]).toEqual({ bytes: expect.any(Array), label: 'CRC', color: expect.any(String) });
    // Verify CRC
    const allBytes = segs.flatMap(s => s.bytes);
    const [verifyLo, verifyHi] = crc16Bytes(allBytes);
    expect(verifyLo).toBe(0x00);
    expect(verifyHi).toBe(0x00);
  });

  it('builds FC06 little-endian with swapped bytes', () => {
    const segs = buildFrameSegments('fc06', 1, 0, 0x07D0, 0, [], [], 'little');
    expect(segs[3]).toEqual({ bytes: [0xD0, 0x07], label: 'VAL', color: expect.any(String) });
  });

  it('builds FC05 frame correctly', () => {
    const segs = buildFrameSegments('fc05', 1, 0x0010, 0, 1, [], [], 'big');
    expect(segs[1]).toEqual({ bytes: [5], label: 'FC', color: expect.any(String) });
    expect(segs[2]).toEqual({ bytes: [0x00, 0x10], label: 'REG', color: expect.any(String) });
    expect(segs[3]).toEqual({ bytes: [0xFF, 0x00], label: 'VAL', color: expect.any(String) });
  });

  it('builds FC05 OFF frame correctly', () => {
    const segs = buildFrameSegments('fc05', 2, 5, 0, 0, [], [], 'big');
    expect(segs[3]).toEqual({ bytes: [0x00, 0x00], label: 'VAL', color: expect.any(String) });
  });

  it('builds FC16 frame with correct byte count', () => {
    const regs = [0x1234, 0x5678];
    const segs = buildFrameSegments('fc16', 1, 0x0100, 0, 0, [], regs, 'big');
    expect(segs[1]).toEqual({ bytes: [0x10], label: 'FC', color: expect.any(String) });
    // QTY segment
    const qtySeg = segs.find(s => s.label === 'QTY');
    expect(qtySeg?.bytes).toEqual([0x00, 0x02]);
    // BC segment
    const bcSeg = segs.find(s => s.label === 'BC');
    expect(bcSeg?.bytes).toEqual([0x04]);
    // DATA segment
    const dataSeg = segs.find(s => s.label === 'DATA');
    expect(dataSeg?.bytes).toEqual([0x12, 0x34, 0x56, 0x78]);
  });

  it('builds FC16 little-endian with swapped register bytes', () => {
    const regs = [0x1234, 0x5678];
    const segs = buildFrameSegments('fc16', 1, 0x0100, 0, 0, [], regs, 'little');
    const dataSeg = segs.find(s => s.label === 'DATA');
    expect(dataSeg?.bytes).toEqual([0x34, 0x12, 0x78, 0x56]);
  });

  it('builds FC15 frame with coil data packed into bytes', () => {
    // 10 coils: 1,0,1,1,0,0,1,0, 1,0
    // Byte 0: bit0=1, bit1=0, bit2=1, bit3=1, bit4=0, bit5=0, bit6=1, bit7=0 → 0b01001101 = 0x4D
    // Byte 1: bit0=1, bit1=0 → 0x01
    const coils = [1, 0, 1, 1, 0, 0, 1, 0, 1, 0];
    const segs = buildFrameSegments('fc15', 1, 0x0020, 0, 0, coils, [], 'big');
    expect(segs[1]).toEqual({ bytes: [0x0F], label: 'FC', color: expect.any(String) });
    const qtySeg = segs.find(s => s.label === 'QTY');
    expect(qtySeg?.bytes).toEqual([0x00, 0x0A]);
    const bcSeg = segs.find(s => s.label === 'BC');
    expect(bcSeg?.bytes).toEqual([0x02]);
    const dataSeg = segs.find(s => s.label === 'DATA');
    expect(dataSeg?.bytes).toEqual([0x4D, 0x01]);
  });

  it('has valid CRC for every frame type', () => {
    const configs: Array<['fc05' | 'fc06' | 'fc15' | 'fc16', 'big' | 'little']> = [
      ['fc05', 'big'], ['fc05', 'little'],
      ['fc06', 'big'], ['fc06', 'little'],
      ['fc15', 'big'], ['fc15', 'little'],
      ['fc16', 'big'], ['fc16', 'little'],
    ];
    for (const [fc, end] of configs) {
      const segs = buildFrameSegments(fc, 1, 0, 0x1234, 1, [1,0,1], [0xABCD, 0xEF01], end);
      const allBytes = segs.flatMap(s => s.bytes);
      const [lo, hi] = crc16Bytes(allBytes);
      expect(lo).toBe(0x00);
      expect(hi).toBe(0x00);
    }
  });
});

describe('h (hex formatter)', () => {
  it('formats with default 2 digits', () => {
    expect(h(0)).toBe('00');
    expect(h(15)).toBe('0F');
    expect(h(255)).toBe('FF');
  });

  it('formats with 4 digits', () => {
    expect(h(0, 4)).toBe('0000');
    expect(h(0x07D0, 4)).toBe('07D0');
    expect(h(0xFFFF, 4)).toBe('FFFF');
  });
});
