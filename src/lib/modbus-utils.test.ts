import { getRegisterCount } from './modbus-utils';
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
