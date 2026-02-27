import { valueToRegisters, registersToValue } from './modbus-utils';
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
         // Passing 'unknown' as DataType to test default branch
         // Using type assertion to bypass TS check for testing purposes
         expect(valueToRegisters(1234, 'unknown' as DataType)).toEqual([1234]);
      });
    });
  });
});
