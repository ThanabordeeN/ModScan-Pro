import { getRegisterCount, formatValue } from './modbus-utils';
import { DataType } from '@/types/modbus';

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
