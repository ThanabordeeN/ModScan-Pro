/**
 * Modbus Register Decoder — v0.2
 *
 * Decodes raw Modbus registers into multiple display formats
 * with support for byte order and word order selection.
 */

// ─── Types ──────────────────────────────────────────────────────────

/** Byte/Word order modes for multi-register values */
export type ByteOrder = 'ABCD' | 'CDAB' | 'BADC' | 'DCBA';

/** Display formats available for decoded values */
export type DecodeFormat =
  | 'raw'      // Raw UInt16 (register value as-is)
  | 'hex'      // Hexadecimal: 0x0000
  | 'binary'   // Binary: 0000 0000 0000 0000
  | 'int16'    // Signed 16-bit
  | 'uint16'   // Unsigned 16-bit
  | 'int32'    // Signed 32-bit (2 registers)
  | 'uint32'   // Unsigned 32-bit (2 registers)
  | 'float32'  // IEEE 754 float (2 registers)
  | 'float64'  // IEEE 754 double (4 registers)
  | 'bitfield' // Bit-level view (for status registers)
  | 'ascii';   // ASCII text from registers

/** Result of decoding a register value */
export interface DecodeResult {
  /** Original raw register values */
  raw: number[];
  /** Selected format */
  format: DecodeFormat;
  /** Applied byte order */
  byteOrder: ByteOrder;
  /** Display string for the decoded value */
  display: string;
  /** Numeric decoded value (null for bitfield/ascii) */
  numericValue: number | null;
  /** Per-register format displays (for single-register formats) */
  perRegister?: string[];
}

/** Bit position information for bitfield view */
export interface BitInfo {
  position: number;   // 0-15
  value: 0 | 1;
  register: number;   // which register index this bit belongs to
}

/** Number of registers required per format */
export const FORMAT_REGISTER_COUNT: Record<DecodeFormat, number> = {
  raw: 1,
  hex: 1,
  binary: 1,
  int16: 1,
  uint16: 1,
  int32: 2,
  uint32: 2,
  float32: 2,
  float64: 4,
  bitfield: 1,
  ascii: 1, // minimum; can be more
};

/** Human-readable labels for formats */
export const FORMAT_LABELS: Record<DecodeFormat, string> = {
  raw: 'Raw UInt16',
  hex: 'Hex',
  binary: 'Binary',
  int16: 'Int16',
  uint16: 'UInt16',
  int32: 'Int32',
  uint32: 'UInt32',
  float32: 'Float32',
  float64: 'Float64',
  bitfield: 'Bit View',
  ascii: 'ASCII',
};

/** Human-readable labels for byte orders */
export const BYTE_ORDER_LABELS: Record<ByteOrder, string> = {
  ABCD: 'ABCD — Big-endian',
  CDAB: 'CDAB — Word-swapped',
  BADC: 'BADC — Byte-swapped',
  DCBA: 'DCBA — Byte + Word swapped',
};

// ─── Byte/Word Order Reordering ────────────────────────────────────

/**
 * Reorder registers based on byte/word order.
 *
 * For 2-register values:
 *   ABCD → [high, low]  (no change)
 *   CDAB → [low, high]  (word swap)
 *   BADC → [swapBytes(high), swapBytes(low)]
 *   DCBA → [swapBytes(low), swapBytes(high)]
 *
 * For 4-register values:
 *   ABCD → [A, B, C, D]  (no change)
 *   CDAB → [C, D, A, B]  (word swap within 32-bit pairs)
 *   BADC → [swapBytes(A), swapBytes(B), swapBytes(C), swapBytes(D)]
 *   DCBA → [swapBytes(C), swapBytes(D), swapBytes(A), swapBytes(B)]
 *
 * For 1-register values (int16/uint16):
 *   ABCD → no change
 *   CDAB → no change (single register, word swap doesn't apply)
 *   BADC → byte swap within the register
 *   DCBA → byte swap within the register
 */
export function reorderRegisters(
  registers: number[],
  count: number,
  byteOrder: ByteOrder
): number[] {
  if (registers.length === 0) return [];
  if (byteOrder === 'ABCD') return [...registers];

  const result = [...registers];

  if (count === 1) {
    // Single register: only byte swap matters
    if (byteOrder === 'BADC' || byteOrder === 'DCBA') {
      result[0] = swapBytes16(result[0]);
    }
    return result;
  }

  if (count === 2) {
    // Two registers
    if (registers.length < 2) return result;
    switch (byteOrder) {
      case 'CDAB':
        // Word swap
        [result[0], result[1]] = [result[1], result[0]];
        break;
      case 'BADC':
        // Byte swap within each register
        result[0] = swapBytes16(result[0]);
        result[1] = swapBytes16(result[1]);
        break;
      case 'DCBA': {
        // Byte + word swap (use temps to avoid overwrite)
        const a = swapBytes16(result[1]);
        const b = swapBytes16(result[0]);
        result[0] = a;
        result[1] = b;
        break;
      }
    }
    return result;
  }

  if (count === 4) {
    if (registers.length < 4) return result;
    switch (byteOrder) {
      case 'CDAB':
        // Word swap: [A, B, C, D] → [C, D, A, B]
        [result[0], result[1], result[2], result[3]] =
          [result[2], result[3], result[0], result[1]];
        break;
      case 'BADC':
        // Byte swap each register
        for (let i = 0; i < 4; i++) {
          result[i] = swapBytes16(result[i]);
        }
        break;
      case 'DCBA': {
        const a = swapBytes16(registers[3]);
        const b = swapBytes16(registers[2]);
        const c = swapBytes16(registers[1]);
        const d = swapBytes16(registers[0]);
        result[0] = a;
        result[1] = b;
        result[2] = c;
        result[3] = d;
        break;
      }
    }
    return result;
  }

  return result;
}

/** Swap high and low bytes of a 16-bit value */
function swapBytes16(value: number): number {
  const high = (value >> 8) & 0xFF;
  const low = value & 0xFF;
  return ((low << 8) | high) & 0xFFFF;
}

// ─── Format Helpers ────────────────────────────────────────────────

/** Format a 16-bit value as hex: 0x0000 */
export function formatHex(value: number): string {
  return `0x${(value & 0xFFFF).toString(16).padStart(4, '0').toUpperCase()}`;
}

/** Format a 16-bit value as binary: 0000 0000 0000 0000 */
export function formatBinary(value: number): string {
  const bits = (value & 0xFFFF).toString(2).padStart(16, '0');
  return bits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// ─── Integer Decoding ──────────────────────────────────────────────

export function decodeInt16(register: number): number {
  let val = register & 0xFFFF;
  if (val > 32767) val -= 65536;
  return val;
}

export function decodeUInt16(register: number): number {
  return register & 0xFFFF;
}

export function decodeInt32(high: number, low: number): number {
  const unsigned = (((high & 0xFFFF) << 16) | (low & 0xFFFF)) >>> 0;
  if (unsigned > 2147483647) return unsigned - 4294967296;
  return unsigned;
}

export function decodeUInt32(high: number, low: number): number {
  return (((high & 0xFFFF) << 16) | (low & 0xFFFF)) >>> 0;
}

// ─── Float Decoding ────────────────────────────────────────────────

export function decodeFloat32(high: number, low: number): number {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint16(0, high & 0xFFFF, false);
  view.setUint16(2, low & 0xFFFF, false);
  return view.getFloat32(0, false);
}

export function decodeFloat64(
  r0: number, r1: number, r2: number, r3: number
): number {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint16(0, r0 & 0xFFFF, false);
  view.setUint16(2, r1 & 0xFFFF, false);
  view.setUint16(4, r2 & 0xFFFF, false);
  view.setUint16(6, r3 & 0xFFFF, false);
  return view.getFloat64(0, false);
}

// ─── Bitfield Inspector ────────────────────────────────────────────

/**
 * Extract bit status from registers for bit-level inspection.
 * Returns bit info for each bit across all provided registers.
 */
export function inspectBits(registers: number[]): BitInfo[] {
  const bits: BitInfo[] = [];
  for (let regIdx = 0; regIdx < registers.length; regIdx++) {
    const value = registers[regIdx] & 0xFFFF;
    for (let bit = 0; bit < 16; bit++) {
      bits.push({
        position: bit,
        value: ((value >> bit) & 1) as 0 | 1,
        register: regIdx,
      });
    }
  }
  return bits;
}

/** Format registers as a bit status table string */
export function formatBitTable(registers: number[]): string {
  const bits = inspectBits(registers);
  let result = '';
  for (const bit of bits) {
    const globalBit = bit.register * 16 + bit.position;
    result += `Bit ${String(globalBit).padStart(2, '0')}: ${bit.value}\n`;
  }
  return result.trim();
}

// ─── ASCII Decoding ────────────────────────────────────────────────

/**
 * Decode registers as ASCII text.
 * Each register contains 2 ASCII characters (high byte, low byte).
 */
export function decodeAscii(registers: number[]): string {
  let result = '';
  for (const reg of registers) {
    const high = (reg >> 8) & 0xFF;
    const low = reg & 0xFF;
    if (high >= 0x20 && high <= 0x7E) result += String.fromCharCode(high);
    if (low >= 0x20 && low <= 0x7E) result += String.fromCharCode(low);
  }
  return result;
}

// ─── Main Decode Function ──────────────────────────────────────────

/**
 * Decode raw Modbus registers into the specified format with byte/word order.
 *
 * @example
 *   decodeRegisters([0x4248, 0x0000], 'float32', 'ABCD')
 *   // → { display: '50.0000', numericValue: 50, ... }
 *
 *   decodeRegisters([2], 'hex', 'ABCD')
 *   // → { display: '0x0002', numericValue: 2, ... }
 */
export function decodeRegisters(
  registers: number[],
  format: DecodeFormat,
  byteOrder: ByteOrder = 'ABCD'
): DecodeResult {
  const raw = [...registers];
  let display = '';
  let numericValue: number | null = null;
  let perRegister: string[] | undefined;

  const count = FORMAT_REGISTER_COUNT[format];
  const needRegs = Math.min(count, registers.length);
  const ordered = reorderRegisters(registers, count, byteOrder);

  switch (format) {
    case 'raw':
      display = String(ordered[0] & 0xFFFF);
      numericValue = ordered[0] & 0xFFFF;
      break;

    case 'hex':
      perRegister = ordered.map(formatHex);
      display = perRegister.join(', ');
      numericValue = ordered[0] & 0xFFFF;
      break;

    case 'binary':
      perRegister = ordered.map(formatBinary);
      display = perRegister.join(' | ');
      numericValue = ordered[0] & 0xFFFF;
      break;

    case 'int16':
      numericValue = decodeInt16(ordered[0]);
      display = String(numericValue);
      break;

    case 'uint16':
      numericValue = decodeUInt16(ordered[0]);
      display = String(numericValue);
      break;

    case 'int32':
      if (ordered.length >= 2) {
        numericValue = decodeInt32(ordered[0], ordered[1]);
        display = String(numericValue);
      } else {
        numericValue = decodeInt16(ordered[0]);
        display = String(numericValue);
      }
      break;

    case 'uint32':
      if (ordered.length >= 2) {
        numericValue = decodeUInt32(ordered[0], ordered[1]);
        display = String(numericValue);
      } else {
        numericValue = decodeUInt16(ordered[0]);
        display = String(numericValue);
      }
      break;

    case 'float32':
      if (ordered.length >= 2) {
        numericValue = decodeFloat32(ordered[0], ordered[1]);
        display = numericValue.toFixed(4);
      } else {
        numericValue = ordered[0] & 0xFFFF;
        display = String(numericValue);
      }
      break;

    case 'float64':
      if (ordered.length >= 4) {
        numericValue = decodeFloat64(ordered[0], ordered[1], ordered[2], ordered[3]);
        display = numericValue.toFixed(6);
      } else if (ordered.length >= 2) {
        numericValue = decodeFloat32(ordered[0], ordered[1]);
        display = numericValue.toFixed(4);
      } else {
        numericValue = ordered[0] & 0xFFFF;
        display = String(numericValue);
      }
      break;

    case 'bitfield':
      numericValue = null;
      display = inspectBits(ordered)
        .map(b => `${b.value}`)
        .join('');
      // Also provide hex/binary per register
      perRegister = ordered.slice(0, needRegs).map(
        r => `${formatHex(r)} [${formatBinary(r)}]`
      );
      break;

    case 'ascii':
      numericValue = null;
      display = decodeAscii(ordered);
      break;

    default:
      display = String(ordered[0] & 0xFFFF);
      numericValue = ordered[0] & 0xFFFF;
  }

  return { raw, format, byteOrder, display, numericValue, perRegister };
}

/**
 * Convenience: decode a single format and return the display string.
 */
export function decodeToString(
  registers: number[],
  format: DecodeFormat,
  byteOrder: ByteOrder = 'ABCD'
): string {
  return decodeRegisters(registers, format, byteOrder).display;
}
