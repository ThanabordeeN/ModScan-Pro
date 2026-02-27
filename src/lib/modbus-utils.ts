import { DataType } from '@/types/modbus';

/**
 * Converts an array of 16-bit registers to a specific data type value.
 */
export function registersToValue(registers: number[], dataType: DataType): any {
  if (!registers || registers.length === 0) return null;

  switch (dataType) {
    case 'uint16':
      return registers[0];
    
    case 'int16': {
      let val = registers[0];
      if (val > 32767) val -= 65536;
      return val;
    }

    case 'uint32': {
      if (registers.length < 2) return registers[0];
      // Big-endian: registers[0] is high word
      return (registers[0] << 16) | registers[1];
    }

    case 'int32': {
      if (registers.length < 2) return registers[0];
      let val = (registers[0] << 16) | registers[1];
      if (val > 2147483647) val -= 4294967296;
      return val;
    }

    case 'float32': {
      if (registers.length < 2) return registers[0];
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      view.setUint16(0, registers[0], false); // High word
      view.setUint16(2, registers[1], false); // Low word
      return view.getFloat32(0, false);
    }

    case 'double64': {
      if (registers.length < 4) return registers[0];
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setUint16(0, registers[0], false);
      view.setUint16(2, registers[1], false);
      view.setUint16(4, registers[2], false);
      view.setUint16(6, registers[3], false);
      return view.getFloat64(0, false);
    }

    case 'coil':
      return registers[0] !== 0;

    default:
      return registers[0];
  }
}

/**
 * Converts a value of a specific data type back into an array of 16-bit registers.
 */
export function valueToRegisters(value: any, dataType: DataType): number[] {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  const numValue = Number(value);

  switch (dataType) {
    case 'uint16':
      return [numValue & 0xFFFF];
    
    case 'int16': {
      let val = Math.round(numValue);
      if (val < 0) val += 65536;
      return [val & 0xFFFF];
    }

    case 'uint32': {
      const val = Math.floor(numValue);
      return [(val >>> 16) & 0xFFFF, val & 0xFFFF];
    }

    case 'int32': {
      const val = Math.floor(numValue);
      // DataView handles two's complement for us if we use setInt32
      view.setInt32(0, val, false);
      return [view.getUint16(0, false), view.getUint16(2, false)];
    }

    case 'float32': {
      view.setFloat32(0, numValue, false);
      return [view.getUint16(0, false), view.getUint16(2, false)];
    }

    case 'double64': {
      view.setFloat64(0, numValue, false);
      return [
        view.getUint16(0, false),
        view.getUint16(2, false),
        view.getUint16(4, false),
        view.getUint16(6, false)
      ];
    }

    case 'coil':
      return [numValue ? 1 : 0];

    default:
      return [numValue & 0xFFFF];
  }
}

/**
 * Formats a value based on its type for display
 */
export function formatValue(value: any, dataType: DataType): string {
  if (value === null || value === undefined) return '-';

  if (dataType === 'float32' || dataType === 'double64') {
    return Number(value).toFixed(4);
  }

  if (dataType === 'coil') {
    return value ? 'ON (1)' : 'OFF (0)';
  }

  return String(value);
}

/**
 * Returns how many registers are needed for a data type
 */
export function getRegisterCount(dataType: DataType): number {
  switch (dataType) {
    case 'uint16':
    case 'int16':
    case 'coil':
      return 1;
    case 'uint32':
    case 'int32':
    case 'float32':
      return 2;
    case 'double64':
      return 4;
    default:
      return 1;
  }
}
