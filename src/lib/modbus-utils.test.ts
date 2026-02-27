import { registersToValue } from '@/lib/modbus-utils';
import { DataType } from '@/types/modbus';

describe('modbus-utils', () => {
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
