import { formatValue } from './modbus-utils';
import { DataType } from '@/types/modbus';

describe('formatValue', () => {
  it('should return "-" for null or undefined values', () => {
    expect(formatValue(null, 'uint16')).toBe('-');
    expect(formatValue(undefined, 'uint16')).toBe('-');
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
