import {
  decodeRegisters,
  decodeToString,
  decodeInt16,
  decodeUInt16,
  decodeInt32,
  decodeUInt32,
  decodeFloat32,
  decodeFloat64,
  reorderRegisters,
  formatHex,
  formatBinary,
  inspectBits,
  decodeAscii,
  DecodeFormat,
  ByteOrder,
} from './modbus-decoder';

describe('modbus-decoder', () => {
  // ─── Byte/Word Order ───────────────────────────────────────────

  describe('reorderRegisters', () => {
    it('ABCD should return registers unchanged', () => {
      expect(reorderRegisters([0x4248, 0x0000], 2, 'ABCD')).toEqual([0x4248, 0x0000]);
      expect(reorderRegisters([0x0102, 0x0304, 0x0506, 0x0708], 4, 'ABCD'))
        .toEqual([0x0102, 0x0304, 0x0506, 0x0708]);
    });

    it('CDAB should word-swap 2 registers', () => {
      expect(reorderRegisters([0x4248, 0x0000], 2, 'CDAB')).toEqual([0x0000, 0x4248]);
    });

    it('CDAB should word-swap 4 registers (swap pairs)', () => {
      // [A, B, C, D] → [C, D, A, B]
      expect(reorderRegisters([0x0102, 0x0304, 0x0506, 0x0708], 4, 'CDAB'))
        .toEqual([0x0506, 0x0708, 0x0102, 0x0304]);
    });

    it('BADC should byte-swap each register', () => {
      // 0x4248 → swap bytes → 0x4842
      expect(reorderRegisters([0x4248, 0x0000], 2, 'BADC')).toEqual([0x4842, 0x0000]);
    });

    it('DCBA should byte+word swap 2 registers', () => {
      // [0x4248, 0x0000] → word swap → [0x0000, 0x4248] → byte swap each → [0x0000, 0x4842]
      expect(reorderRegisters([0x4248, 0x0000], 2, 'DCBA')).toEqual([0x0000, 0x4842]);
    });

    it('should byte-swap single register with BADC', () => {
      expect(reorderRegisters([0x1234], 1, 'BADC')).toEqual([0x3412]);
    });

    it('should byte-swap single register with DCBA', () => {
      expect(reorderRegisters([0x1234], 1, 'DCBA')).toEqual([0x3412]);
    });

    it('should not change single register with CDAB', () => {
      expect(reorderRegisters([0x1234], 1, 'CDAB')).toEqual([0x1234]);
    });

    it('should handle empty registers', () => {
      expect(reorderRegisters([], 2, 'ABCD')).toEqual([]);
    });

    it('should handle partial registers gracefully', () => {
      expect(reorderRegisters([0x4248], 2, 'CDAB')).toEqual([0x4248]);
    });
  });

  // ─── Formatting ────────────────────────────────────────────────

  describe('formatHex', () => {
    it('should format zero', () => {
      expect(formatHex(0)).toBe('0x0000');
    });
    it('should format values with leading zeros', () => {
      expect(formatHex(15)).toBe('0x000F');
    });
    it('should format large values', () => {
      expect(formatHex(65535)).toBe('0xFFFF');
    });
    it('should mask to 16 bits', () => {
      expect(formatHex(0x12345678)).toBe('0x5678');
    });
  });

  describe('formatBinary', () => {
    it('should format zero as 16 bits', () => {
      expect(formatBinary(0)).toBe('0000 0000 0000 0000');
    });
    it('should format 0xFFFF', () => {
      expect(formatBinary(0xFFFF)).toBe('1111 1111 1111 1111');
    });
    it('should format a mixed value with grouping', () => {
      expect(formatBinary(0x00FF)).toBe('0000 0000 1111 1111');
    });
  });

  // ─── Integer Decoding ──────────────────────────────────────────

  describe('decodeInt16', () => {
    it('should decode positive values', () => {
      expect(decodeInt16(0)).toBe(0);
      expect(decodeInt16(1234)).toBe(1234);
      expect(decodeInt16(32767)).toBe(32767);
    });
    it('should decode negative values', () => {
      expect(decodeInt16(65535)).toBe(-1);      // 0xFFFF
      expect(decodeInt16(65413)).toBe(-123);     // 0xFF85
      expect(decodeInt16(32768)).toBe(-32768);   // 0x8000
    });
  });

  describe('decodeUInt16', () => {
    it('should decode values', () => {
      expect(decodeUInt16(0)).toBe(0);
      expect(decodeUInt16(1234)).toBe(1234);
      expect(decodeUInt16(65535)).toBe(65535);
    });
  });

  describe('decodeInt32', () => {
    it('should decode positive values', () => {
      expect(decodeInt32(0, 123)).toBe(123);
      expect(decodeInt32(0x0001, 0x0002)).toBe(65538);
    });
    it('should decode negative values', () => {
      // -123 = 0xFFFFFF85 = [0xFFFF, 0xFF85]
      expect(decodeInt32(0xFFFF, 0xFF85)).toBe(-123);
    });
  });

  describe('decodeUInt32', () => {
    it('should decode values', () => {
      expect(decodeUInt32(0, 123)).toBe(123);
      expect(decodeUInt32(0xFFFF, 0xFFFF)).toBe(4294967295);
    });
  });

  // ─── Float Decoding ────────────────────────────────────────────

  describe('decodeFloat32', () => {
    it('should decode 50.0 from [0x4248, 0x0000]', () => {
      // IEEE 754: 50.0 = 0x42480000
      expect(decodeFloat32(0x4248, 0x0000)).toBeCloseTo(50.0, 5);
    });

    it('should decode 123.45', () => {
      // 123.45 ≈ 0x42F6E666
      expect(decodeFloat32(0x42F6, 0xE666)).toBeCloseTo(123.45, 3);
    });

    it('should decode negative float', () => {
      // -50.0 = 0xC2480000
      expect(decodeFloat32(0xC248, 0x0000)).toBeCloseTo(-50.0, 5);
    });

    it('should decode zero', () => {
      expect(decodeFloat32(0, 0)).toBe(0);
    });
  });

  describe('decodeFloat64', () => {
    it('should decode a double value', () => {
      // 123.456789 ≈ 0x405EDD3C07EE0B0B
      // Regs: 0x405E, 0xDD3C, 0x07EE, 0x0B0B = [16478, 56636, 2030, 2827]
      expect(decodeFloat64(16478, 56636, 2030, 2827)).toBeCloseTo(123.456789, 6);
    });

    it('should decode zero', () => {
      expect(decodeFloat64(0, 0, 0, 0)).toBe(0);
    });

    it('should decode negative double', () => {
      // -100.0 = 0xC059000000000000
      expect(decodeFloat64(0xC059, 0x0000, 0x0000, 0x0000)).toBeCloseTo(-100.0, 5);
    });
  });

  // ─── Bit Inspector ─────────────────────────────────────────────

  describe('inspectBits', () => {
    it('should inspect a single register', () => {
      // 0x0005 = 0b0000 0000 0000 0101
      const bits = inspectBits([0x0005]);
      expect(bits.length).toBe(16);
      expect(bits[0]).toEqual({ position: 0, value: 1, register: 0 });
      expect(bits[1]).toEqual({ position: 1, value: 0, register: 0 });
      expect(bits[2]).toEqual({ position: 2, value: 1, register: 0 });
      expect(bits[3]).toEqual({ position: 3, value: 0, register: 0 });
    });

    it('should inspect multiple registers', () => {
      const bits = inspectBits([0x0001, 0x8000]);
      expect(bits.length).toBe(32);
      expect(bits[0]).toEqual({ position: 0, value: 1, register: 0 });
      expect(bits[31]).toEqual({ position: 15, value: 1, register: 1 }); // MSB of second register
    });
  });

  // ─── ASCII Decoding ────────────────────────────────────────────

  describe('decodeAscii', () => {
    it('should decode ASCII text from registers', () => {
      // "AB" = [0x41, 0x42] → register = 0x4142 = 16706
      // "CD" = [0x43, 0x44] → register = 0x4344 = 17220
      expect(decodeAscii([0x4142, 0x4344])).toBe('ABCD');
    });

    it('should skip non-printable characters', () => {
      // 0x0041 = null + 'A'
      expect(decodeAscii([0x0041])).toBe('A');
    });

    it('should handle empty input', () => {
      expect(decodeAscii([])).toBe('');
    });
  });

  // ─── Main Decode Function ──────────────────────────────────────

  describe('decodeRegisters', () => {
    it('should decode raw uint16', () => {
      const result = decodeRegisters([1234], 'raw');
      expect(result.display).toBe('1234');
      expect(result.numericValue).toBe(1234);
      expect(result.format).toBe('raw');
    });

    it('should decode hex', () => {
      const result = decodeRegisters([0x1234, 0xABCD], 'hex');
      expect(result.display).toBe('0x1234, 0xABCD');
      expect(result.perRegister).toEqual(['0x1234', '0xABCD']);
      expect(result.numericValue).toBe(0x1234);
    });

    it('should decode binary', () => {
      const result = decodeRegisters([0x0005], 'binary');
      expect(result.display).toBe('0000 0000 0000 0101');
      expect(result.numericValue).toBe(5);
    });

    it('should decode int16', () => {
      expect(decodeRegisters([65535], 'int16').display).toBe('-1');
      expect(decodeRegisters([65535], 'int16').numericValue).toBe(-1);
      expect(decodeRegisters([32767], 'int16').display).toBe('32767');
    });

    it('should decode int32', () => {
      expect(decodeRegisters([0xFFFF, 0xFF85], 'int32').numericValue).toBe(-123);
      expect(decodeRegisters([0x0000, 0x007B], 'int32').numericValue).toBe(123);
    });

    it('should decode uint32', () => {
      expect(decodeRegisters([0xFFFF, 0xFFFF], 'uint32').numericValue).toBe(4294967295);
    });

    it('should decode float32 with ABCD (big-endian)', () => {
      // 50.0 = 0x42480000 → registers [0x4248, 0x0000]
      const result = decodeRegisters([0x4248, 0x0000], 'float32', 'ABCD');
      expect(result.numericValue).toBeCloseTo(50.0, 5);
      expect(result.display).toBe('50.0000');
    });

    it('should decode float32 with CDAB (word-swapped)', () => {
      // If the device stores 50.0 as [0x0000, 0x4248] (word-swapped):
      const result = decodeRegisters([0x0000, 0x4248], 'float32', 'CDAB');
      expect(result.numericValue).toBeCloseTo(50.0, 5);
    });

    it('should decode float64', () => {
      const result = decodeRegisters([16478, 56636, 2030, 2827], 'float64');
      expect(result.numericValue).toBeCloseTo(123.456789, 6);
      expect(result.display).toBe('123.456789');
    });

    it('should decode bitfield', () => {
      const result = decodeRegisters([0x0005], 'bitfield');
      expect(result.numericValue).toBeNull();
      expect(result.display).toBe('1010000000000000'); // LSB first
    });

    it('should decode ascii', () => {
      const result = decodeRegisters([0x4142, 0x4344], 'ascii');
      expect(result.display).toBe('ABCD');
      expect(result.numericValue).toBeNull();
    });

    it('should handle single register with multi-register format gracefully', () => {
      const result = decodeRegisters([0x4248], 'float32');
      // Falls back to uint16
      expect(result.numericValue).toBe(0x4248);
    });

    it('should default to raw for unknown format', () => {
      const result = decodeRegisters([123], 'unknown' as DecodeFormat);
      expect(result.numericValue).toBe(123);
    });
  });

  describe('decodeToString', () => {
    it('should return the display string directly', () => {
      expect(decodeToString([0x4248, 0x0000], 'float32', 'ABCD')).toBe('50.0000');
    });
  });

  // ─── Integration: Known Test Vectors ───────────────────────────

  describe('integration tests', () => {
    it('should handle acceptance test: [0x4248, 0x0000] → Float32 ABCD → 50.0', () => {
      const result = decodeRegisters([0x4248, 0x0000], 'float32', 'ABCD');
      expect(result.numericValue).toBeCloseTo(50.0, 5);
    });

    it('should handle all byte orders for a known value', () => {
      // 230.45 V scenario from roadmap example
      // 230.45 ≈ 0x43667333 → registers [0x4366, 0x7333]
      const abcd = decodeRegisters([0x4366, 0x7333], 'float32', 'ABCD');
      expect(abcd.numericValue).toBeCloseTo(230.45, 1);

      // Word-swapped: [0x7333, 0x4366]
      const cdab = decodeRegisters([0x7333, 0x4366], 'float32', 'CDAB');
      expect(cdab.numericValue).toBeCloseTo(230.45, 1);
    });
  });
});
