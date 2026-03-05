import { getRegisterCount, formatValue, registersToValue } from './modbus-utils';
import { DataType } from '@/types/modbus';

describe('modbus-utils', () => {
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
      // @ts-ignore: Intentionally testing invalid input
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
