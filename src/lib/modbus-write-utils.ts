// Pure utility functions for Modbus Write page
// Extracted for testability

export interface ParsedAddress {
  raw: number;
  notation: string;
}

export function parseModbusAddress(input: string): ParsedAddress {
  const s = input.trim().toUpperCase().replace(/\s+/g, '');
  if (!s) return { raw: 0, notation: '0-based offset' };
  if (/^[0-9A-F]+H$/.test(s)) {
    const hex = s.slice(0, -1);
    return { raw: parseInt(hex, 16), notation: `hex suffix (${hex}H)` };
  }
  if (/^0X[0-9A-F]+$/.test(s)) {
    return { raw: parseInt(s.slice(2), 16), notation: `hex (${s})` };
  }
  if (/^4\d{4,5}$/.test(s)) {
    const ref = parseInt(s, 10);
    return { raw: ref - 40001, notation: `Holding Register 4x (${ref} → ${ref - 40001})` };
  }
  if (/^3\d{4,5}$/.test(s)) {
    const ref = parseInt(s, 10);
    return { raw: ref - 30001, notation: `Input Register 3x (${ref} → ${ref - 30001})` };
  }
  if (/^[01]\d{4,5}$/.test(s) || (/^\d{1,5}$/.test(s) && !s.startsWith('0X'))) {
    const ref = parseInt(s, 10);
    if (s.length >= 5 && s.startsWith('0')) {
      return { raw: ref - 1, notation: `Coil 0x (${ref} → ${ref - 1})` };
    }
    if (s.length >= 5 && s.startsWith('1')) {
      return { raw: ref - 10001, notation: `Discrete Input 1x (${ref} → ${ref - 10001})` };
    }
  }
  if (/^\d+$/.test(s)) {
    return { raw: parseInt(s, 10), notation: '0-based offset' };
  }
  return { raw: 0, notation: 'unrecognized → 0' };
}

export function h(n: number, len = 2): string {
  return n.toString(16).toUpperCase().padStart(len, '0');
}

export function crc16Bytes(buffer: number[]): [number, number] {
  let crc = 0xFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i] & 0xFF;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? ((crc >> 1) ^ 0xA001) : (crc >> 1);
    }
  }
  return [crc & 0xFF, (crc >> 8) & 0xFF];
}

export function combineBytes(hi: number, lo: number, endianness: 'big' | 'little'): number {
  const h = Math.max(0, Math.min(255, hi || 0));
  const l = Math.max(0, Math.min(255, lo || 0));
  return endianness === 'big' ? ((h << 8) | l) : ((l << 8) | h);
}

export interface FrameSegment {
  bytes: number[];
  label: string;
  color: string;
}

export function buildFrameSegments(
  fc: 'fc05' | 'fc06' | 'fc15' | 'fc16',
  slave: number,
  addr: number,
  val06: number,
  coilState: 0 | 1,
  coilArr: number[],
  regArr: number[],
  endianness: 'big' | 'little'
): FrameSegment[] {
  const segments: FrameSegment[] = [];
  segments.push({ bytes: [slave], label: 'ID', color: 'bg-blue-100 text-blue-700 border-blue-200' });
  const fcCode = fc === 'fc05' ? 5 : fc === 'fc06' ? 6 : fc === 'fc15' ? 0x0F : 0x10;
  segments.push({ bytes: [fcCode], label: 'FC', color: 'bg-purple-100 text-purple-700 border-purple-200' });
  const addrHi = (addr >> 8) & 0xFF;
  const addrLo = addr & 0xFF;
  segments.push({ bytes: [addrHi, addrLo], label: 'REG', color: 'bg-amber-100 text-amber-700 border-amber-200' });

  if (fc === 'fc05') {
    const valHi = coilState ? 0xFF : 0x00;
    const valLo = 0x00;
    segments.push({ bytes: [valHi, valLo], label: 'VAL', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' });
  }

  if (fc === 'fc06') {
    const v = Math.max(0, Math.min(65535, val06));
    let valHi = (v >> 8) & 0xFF;
    let valLo = v & 0xFF;
    if (endianness === 'little') { [valHi, valLo] = [valLo, valHi]; }
    segments.push({ bytes: [valHi, valLo], label: 'VAL', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' });
  }

  if (fc === 'fc15') {
    const q = coilArr.length;
    const bc = Math.ceil(q / 8);
    segments.push({ bytes: [(q >> 8) & 0xFF, q & 0xFF], label: 'QTY', color: 'bg-orange-100 text-orange-700 border-orange-200' });
    segments.push({ bytes: [bc], label: 'BC', color: 'bg-pink-100 text-pink-700 border-pink-200' });
    const coilBytes: number[] = [];
    for (let b = 0; b < bc; b++) {
      let byt = 0;
      for (let bit = 0; bit < 8; bit++) {
        const idx = b * 8 + bit;
        if (idx < q && coilArr[idx]) byt |= (1 << bit);
      }
      coilBytes.push(byt);
    }
    segments.push({ bytes: coilBytes, label: 'DATA', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' });
  }

  if (fc === 'fc16') {
    const q = regArr.length;
    const bc = q * 2;
    segments.push({ bytes: [(q >> 8) & 0xFF, q & 0xFF], label: 'QTY', color: 'bg-orange-100 text-orange-700 border-orange-200' });
    segments.push({ bytes: [bc], label: 'BC', color: 'bg-pink-100 text-pink-700 border-pink-200' });
    const dataBytes: number[] = [];
    for (const v of regArr) {
      if (endianness === 'big') {
        dataBytes.push((v >> 8) & 0xFF, v & 0xFF);
      } else {
        dataBytes.push(v & 0xFF, (v >> 8) & 0xFF);
      }
    }
    segments.push({ bytes: dataBytes, label: 'DATA', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' });
  }

  const allBytes = segments.flatMap(s => s.bytes);
  const [crcLo, crcHi] = crc16Bytes(allBytes);
  segments.push({ bytes: [crcLo, crcHi], label: 'CRC', color: 'bg-red-100 text-red-700 border-red-200' });

  return segments;
}
