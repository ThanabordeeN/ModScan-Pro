import { valueToRegisters, getRegisterCount, formatValue, registersToValue } from './modbus-utils';
import { DataType } from '@/types/modbus';

describe('modbus-utils', () => {
  describe('valueToRegisters', () => {
    describe('uint16', () => {
      it('should convert standard values', () => {
        expect(valueToRegisters(1234, 'uint16')).toEqual([1234]);
        expect(valueToRegisters(0, 'uint16')).toEqual([0]);
        expect(valueToRegisters(65535, 'uint16')).toEqual([65535]);
      });

      it('should handle overflow by truncating', () => {
        expect(valueToRegisters(65536, 'uint16')).toEqual([0]);
        expect(valueToRegisters(65537, 'uint16')).toEqual([1]);
      });

      it('should handle negative numbers as uint16 (two\'s complement via bitwise AND)', () => {
        // -1 & 0xFFFF = 65535
        expect(valueToRegisters(-1, 'uint16')).toEqual([65535]);
      });
    });

    describe('int16', () => {
      it('should convert positive values', () => {
        expect(valueToRegisters(1234, 'int16')).toEqual([1234]);
        expect(valueToRegisters(32767, 'int16')).toEqual([32767]);
      });

      it('should convert negative values to 16-bit unsigned representation', () => {
        // -1 -> 65535
        expect(valueToRegisters(-1, 'int16')).toEqual([65535]);
        // -1234 -> 65536 - 1234 = 64302
        expect(valueToRegisters(-1234, 'int16')).toEqual([64302]);
        // -32768 -> 32768
        expect(valueToRegisters(-32768, 'int16')).toEqual([32768]);
      });
    });

    describe('uint32', () => {
      it('should convert standard values', () => {
        // 0x12345678 = [0x1234, 0x5678] = [4660, 22136]
        expect(valueToRegisters(0x12345678, 'uint32')).toEqual([0x1234, 0x5678]);
        expect(valueToRegisters(0, 'uint32')).toEqual([0, 0]);
      });

      it('should handle large values', () => {
        // Max uint32: 4294967295 = 0xFFFFFFFF
        expect(valueToRegisters(4294967295, 'uint32')).toEqual([0xFFFF, 0xFFFF]);
      });
    });

    describe('int32', () => {
      it('should convert positive values', () => {
        // 123456789 = 0x075BCD15
        // High: 0x075B = 1883
        // Low: 0xCD15 = 52501
        expect(valueToRegisters(123456789, 'int32')).toEqual([1883, 52501]);
      });

      it('should convert negative values', () => {
        // -1 = 0xFFFFFFFF
        expect(valueToRegisters(-1, 'int32')).toEqual([0xFFFF, 0xFFFF]);

        // -123456789 = 0xF8A432EB
        // High: 0xF8A4 = 63652
        // Low: 0x32EB = 13035
        expect(valueToRegisters(-123456789, 'int32')).toEqual([63652, 13035]);
      });
    });

    describe('float32', () => {
      it('should convert float values correctly', () => {
        // We test round-trip because direct float bit comparison is tricky without hardcoded values
        const val = 123.456;
        const registers = valueToRegisters(val, 'float32');
        expect(registers.length).toBe(2);

        // Verify with registersToValue
        const recovered = registersToValue(registers, 'float32');
        expect(recovered).toBeCloseTo(val, 5);
      });

      it('should handle zero', () => {
        expect(valueToRegisters(0, 'float32')).toEqual([0, 0]);
      });

      it('should handle negative float values', () => {
        const val = -987.654;
        const registers = valueToRegisters(val, 'float32');
        const recovered = registersToValue(registers, 'float32');
        expect(recovered).toBeCloseTo(val, 3);
      });
    });

    describe('double64', () => {
      it('should convert double values correctly', () => {
        const val = 123456.7890123;
        const registers = valueToRegisters(val, 'double64');
        expect(registers.length).toBe(4);

        const recovered = registersToValue(registers, 'double64');
        expect(recovered).toBeCloseTo(val, 10);
      });

      it('should handle zero', () => {
        expect(valueToRegisters(0, 'double64')).toEqual([0, 0, 0, 0]);
      });

      it('should handle negative double values', () => {
        const val = -123456.7890123;
        const registers = valueToRegisters(val, 'double64');
        const recovered = registersToValue(registers, 'double64');
        expect(recovered).toBeCloseTo(val, 10);
      });
    });

    describe('coil', () => {
      it('should convert boolean true to [1]', () => {
        expect(valueToRegisters(true, 'coil')).toEqual([1]);
      });

      it('should convert boolean false to [0]', () => {
        expect(valueToRegisters(false, 'coil')).toEqual([0]);
      });

      it('should convert non-zero numbers to [1]', () => {
        expect(valueToRegisters(1, 'coil')).toEqual([1]);
        expect(valueToRegisters(123, 'coil')).toEqual([1]);
        expect(valueToRegisters(-5, 'coil')).toEqual([1]);
      });

      it('should convert zero to [0]', () => {
        expect(valueToRegisters(0, 'coil')).toEqual([0]);
      });
    });

    describe('default case', () => {
      it('should default to uint16 behavior for unknown types', () => {
         expect(valueToRegisters(1234, 'unknown' as DataType)).toEqual([1234]);
      });
    });
  });

  describe('getRegisterCount', () => {
    test('returns 1 register for uint16', () => {
      expect(getRegisterCount('uint16')).toBe(1);
    });

    test('returns 1 register for int16', () => {
      expect(getRegisterCount('int16')).toBe(1);
    });

    test('returns 1 register for coil', () => {
      expect(getRegisterCount('coil')).toBe(1);
    });

    test('returns 2 registers for uint32', () => {
      expect(getRegisterCount('uint32')).toBe(2);
    });

    test('returns 2 registers for int32', () => {
      expect(getRegisterCount('int32')).toBe(2);
    });

    test('returns 2 registers for float32', () => {
      expect(getRegisterCount('float32')).toBe(2);
    });

    test('returns 4 registers for double64', () => {
      expect(getRegisterCount('double64')).toBe(4);
    });

    test('returns default 1 register for unknown type', () => {
      expect(getRegisterCount('unknown' as DataType)).toBe(1);
    });
  });

  describe('formatValue', () => {
    it('should return "-" for null or undefined values', () => {
      expect(formatValue(null as any, 'uint16')).toBe('-');
      expect(formatValue(undefined as any, 'uint16')).toBe('-');
    });

    it('should format float32 with 4 decimal places', () => {
      expect(formatValue(123.456789, 'float32')).toBe('123.4568');
      expect(formatValue(123, 'float32')).toBe('123.0000');
    });

    it('should format double64 with 4 decimal places', () => {
      expect(formatValue(123.456789, 'double64')).toBe('123.4568');
      expect(formatValue(123, 'double64')).toBe('123.0000');
    });

    it('should format coil values as ON/OFF', () => {
      expect(formatValue(true, 'coil')).toBe('ON (1)');
      expect(formatValue(1, 'coil')).toBe('ON (1)');
      expect(formatValue(false, 'coil')).toBe('OFF (0)');
      expect(formatValue(0, 'coil')).toBe('OFF (0)');
    });

    it('should format other types as string', () => {
      expect(formatValue(12345, 'uint16')).toBe('12345');
      expect(formatValue(-12345, 'int16')).toBe('-12345');
      expect(formatValue(12345678, 'uint32')).toBe('12345678');
      expect(formatValue(-12345678, 'int32')).toBe('-12345678');
    });

    it('should handle string inputs gracefully for non-float types', () => {
         expect(formatValue("123", 'uint16')).toBe('123');
    });

     it('should handle string inputs gracefully for float types', () => {
         expect(formatValue("123.456789", 'float32')).toBe('123.4568');
    });
  });

  describe('registersToValue', () => {
    it('should return null for null registers', () => {
      expect(registersToValue(null as any, 'uint16')).toBeNull();
    });

    it('should return null for undefined registers', () => {
      expect(registersToValue(undefined as any, 'uint16')).toBeNull();
    });

    it('should return null for empty registers array', () => {
      expect(registersToValue([], 'uint16')).toBeNull();
    });

    it('should correctly convert uint16', () => {
      expect(registersToValue([123], 'uint16')).toBe(123);
    });

    it('should correctly convert int16 positive', () => {
        expect(registersToValue([123], 'int16')).toBe(123);
    });

    it('should correctly convert int16 negative', () => {
        // 65536 - 123 = 65413
        expect(registersToValue([65413], 'int16')).toBe(-123);
    });

    it('should correctly convert uint32', () => {
        // (1 << 16) | 2 = 65538
        expect(registersToValue([1, 2], 'uint32')).toBe(65538);
    });

    it('should handle partial uint32 (missing low word)', () => {
        expect(registersToValue([1], 'uint32')).toBe(1);
    });

    it('should correctly convert int32 positive', () => {
        expect(registersToValue([0, 123], 'int32')).toBe(123);
    });

     it('should correctly convert int32 negative', () => {
        // -123 in 32-bit 2's complement is 0xFFFFFF85
        // High word: 0xFFFF = 65535
        // Low word: 0xFF85 = 65413
        expect(registersToValue([65535, 65413], 'int32')).toBe(-123);
    });

    it('should correctly convert float32', () => {
        // 123.45 in float32
        // Hex: 0x42F6E666
        // High: 0x42F6 = 17142
        // Low: 0xE666 = 58982
        const result = registersToValue([17142, 58982], 'float32');
        expect(result).toBeCloseTo(123.45, 4);
    });

    it('should correctly convert double64', () => {
        // 123.456789 in double64
        // Hex: 0x405EDD3C07EE0B0B
        // Regs: 0x405E, 0xDD3C, 0x07EE, 0x0B0B
        // Regs Dec: 16478, 56636, 2030, 2827
        const result = registersToValue([16478, 56636, 2030, 2827], 'double64');
        expect(result).toBeCloseTo(123.456789, 6);
    });

    it('should correctly convert coil true', () => {
        expect(registersToValue([1], 'coil')).toBe(true);
    });

    it('should correctly convert coil false', () => {
        expect(registersToValue([0], 'coil')).toBe(false);
    });
  });
});
