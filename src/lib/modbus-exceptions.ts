/**
 * Modbus Exception Code Decoder — v0.2
 *
 * Maps Modbus exception codes to human-readable meanings,
 * parses exception metadata from errors, and provides
 * structured exception information for the UI.
 */

// ─── Types ──────────────────────────────────────────────────────────

/** Structured Modbus exception information */
export interface ModbusExceptionInfo {
  /** The exception code (e.g., 0x02) */
  code: number;
  /** Human-readable name (e.g., "Illegal Data Address") */
  name: string;
  /** Description of what this exception means */
  description: string;
  /** Possible causes and troubleshooting suggestions */
  possibleCause: string;
}

/** Result of parsing an error for exception metadata */
export interface ModbusExceptionResult {
  /** Whether the error is a Modbus exception (vs. a transport/timeout error) */
  isException: boolean;
  /** The original function code that was sent */
  originalFunctionCode?: number;
  /** The exception function code (original + 0x80) */
  exceptionFunctionCode?: number;
  /** Exception metadata if available */
  exception?: ModbusExceptionInfo;
  /** Generic error message for non-exception errors */
  errorMessage?: string;
}

export type ExceptionLanguage = 'en' | 'th';

// ─── Exception Code Database ───────────────────────────────────────

/** Standard Modbus exception codes */
export const EXCEPTION_CODES: Record<number, ModbusExceptionInfo> = {
  0x01: {
    code: 0x01,
    name: 'Illegal Function',
    description: 'The function code received in the query is not an allowable action for the server.',
    possibleCause: 'The device does not support this function code, or the function code is invalid for this register type.',
  },
  0x02: {
    code: 0x02,
    name: 'Illegal Data Address',
    description: 'The data address received in the query is not an allowable address for the server.',
    possibleCause: 'The requested register does not exist on this device. Verify the register address against the device manual.',
  },
  0x03: {
    code: 0x03,
    name: 'Illegal Data Value',
    description: 'A value contained in the query data field is not an allowable value for the server.',
    possibleCause: 'The value written to the register is out of range or not allowed for this register.',
  },
  0x04: {
    code: 0x04,
    name: 'Slave Device Failure',
    description: 'An unrecoverable error occurred while the server was attempting to perform the requested action.',
    possibleCause: 'The device encountered an internal error. Try power-cycling the device or check its diagnostic status.',
  },
  0x05: {
    code: 0x05,
    name: 'Acknowledge',
    description: 'The server has accepted the request and is processing it, but a long duration of time will be required.',
    possibleCause: 'The operation is in progress. Wait and retry later.',
  },
  0x06: {
    code: 0x06,
    name: 'Slave Device Busy',
    description: 'The server is engaged in processing a long-duration program command.',
    possibleCause: 'The device is busy with another operation. Retry after a short delay.',
  },
  0x08: {
    code: 0x08,
    name: 'Memory Parity Error',
    description: 'The server attempted to read record file, but detected a parity error in the memory.',
    possibleCause: 'The device has a memory integrity issue. Try reading from a different memory area or reset the device.',
  },
  0x0A: {
    code: 0x0A,
    name: 'Gateway Path Unavailable',
    description: 'The gateway was unable to allocate an internal communication path from the input port to the output port.',
    possibleCause: 'Check gateway configuration, network connectivity, and routing settings.',
  },
  0x0B: {
    code: 0x0B,
    name: 'Gateway Target Device Failed to Respond',
    description: 'No response was obtained from the target device behind the gateway.',
    possibleCause: 'The device behind the gateway is offline, disconnected, or not configured correctly. Check power, wiring, and address.',
  },
};

/** Thai localized Modbus exception descriptions for UI display. */
export const EXCEPTION_CODES_TH: Record<number, ModbusExceptionInfo> = {
  0x01: {
    code: 0x01,
    name: 'Illegal Function',
    description: 'อุปกรณ์ไม่รองรับ Function Code ที่ส่งไป หรือไม่อนุญาตให้ใช้คำสั่งนี้กับอุปกรณ์นี้',
    possibleCause: 'เลือก Function Code ผิด เช่น อ่าน/เขียนคนละประเภทกับ Register ที่อุปกรณ์รองรับ ให้ตรวจคู่มืออุปกรณ์อีกครั้ง',
  },
  0x02: {
    code: 0x02,
    name: 'Illegal Data Address',
    description: 'Address หรือ Register ที่ร้องขอไม่อยู่ในช่วงที่อุปกรณ์อนุญาตหรือไม่มีอยู่จริง',
    possibleCause: 'Register address อาจผิด, ใช้ offset ผิดแบบ 0-based/1-based, หรืออ่านผิดชนิด Register ให้เทียบกับ Register Map ของผู้ผลิต',
  },
  0x03: {
    code: 0x03,
    name: 'Illegal Data Value',
    description: 'ค่าที่ส่งไปไม่อยู่ในช่วงหรือรูปแบบที่อุปกรณ์ยอมรับ',
    possibleCause: 'ค่าที่เขียนอาจเกินช่วง, quantity มากเกิน, หรือ parameter ไม่ถูกต้องตามคู่มืออุปกรณ์',
  },
  0x04: {
    code: 0x04,
    name: 'Slave Device Failure',
    description: 'อุปกรณ์เกิดความผิดพลาดภายในระหว่างประมวลผลคำสั่ง',
    possibleCause: 'อุปกรณ์อาจมี fault ภายใน, โหมดการทำงานไม่พร้อม, หรือหน่วยความจำ/วงจรมีปัญหา ลองตรวจสถานะอุปกรณ์หรือ power-cycle',
  },
  0x05: {
    code: 0x05,
    name: 'Acknowledge',
    description: 'อุปกรณ์รับคำสั่งแล้ว แต่ต้องใช้เวลาประมวลผลนานกว่าปกติ',
    possibleCause: 'คำสั่งกำลังถูกดำเนินการอยู่ ให้รอสักครู่แล้วอ่าน/ตรวจสอบซ้ำ',
  },
  0x06: {
    code: 0x06,
    name: 'Slave Device Busy',
    description: 'อุปกรณ์กำลังยุ่งหรือประมวลผลงานอื่นอยู่ จึงยังรับคำสั่งนี้ไม่ได้',
    possibleCause: 'มีคำสั่งอื่นค้างอยู่หรืออุปกรณ์กำลังทำงานภายใน ให้ลดความถี่ polling หรือ retry ภายหลัง',
  },
  0x08: {
    code: 0x08,
    name: 'Memory Parity Error',
    description: 'อุปกรณ์ตรวจพบความผิดพลาดของหน่วยความจำขณะเข้าถึงข้อมูล',
    possibleCause: 'หน่วยความจำในอุปกรณ์อาจมีปัญหา หรือข้อมูลเสียหาย ให้ลองอ่านพื้นที่อื่น/รีเซ็ตอุปกรณ์/ตรวจ diagnostic ของอุปกรณ์',
  },
  0x0A: {
    code: 0x0A,
    name: 'Gateway Path Unavailable',
    description: 'Gateway ไม่สามารถสร้างเส้นทางสื่อสารไปยังอุปกรณ์ปลายทางได้',
    possibleCause: 'ตรวจการตั้งค่า gateway, routing, IP/port, network path และการเชื่อมต่อระหว่าง gateway กับ bus',
  },
  0x0B: {
    code: 0x0B,
    name: 'Gateway Target Device Failed to Respond',
    description: 'อุปกรณ์ปลายทางหลัง gateway ไม่ตอบสนอง',
    possibleCause: 'อุปกรณ์ปลายทางอาจปิดอยู่, address ผิด, สายหลุด, timeout สั้นเกิน หรือ gateway ติดต่อ bus ปลายทางไม่ได้',
  },
};

/** Get localized exception metadata. Defaults to English for tests/backward compatibility. */
export function getExceptionInfo(
  code: number,
  language: ExceptionLanguage = 'en',
): ModbusExceptionInfo | undefined {
  return language === 'th'
    ? EXCEPTION_CODES_TH[code] || EXCEPTION_CODES[code]
    : EXCEPTION_CODES[code];
}

// ─── Function Code Names ───────────────────────────────────────────

/** Standard Modbus function codes and their names */
export const FUNCTION_NAMES: Record<number, string> = {
  0x01: 'FC01 — Read Coils',
  0x02: 'FC02 — Read Discrete Inputs',
  0x03: 'FC03 — Read Holding Registers',
  0x04: 'FC04 — Read Input Registers',
  0x05: 'FC05 — Write Single Coil',
  0x06: 'FC06 — Write Single Register',
  0x0F: 'FC15 — Write Multiple Coils',
  0x10: 'FC16 — Write Multiple Registers',
};

/** Get the human-readable name for a function code */
export function getFunctionName(code: number): string {
  return FUNCTION_NAMES[code] || `FC${code.toString(16).toUpperCase().padStart(2, '0')}`;
}

/** Get the exception function code (original + 0x80) */
export function getExceptionFunctionCode(originalFunctionCode: number): number {
  return (originalFunctionCode & 0x7F) | 0x80;
}

/** Get the original function code from an exception function code */
export function getOriginalFunctionCode(exceptionFunctionCode: number): number {
  return exceptionFunctionCode & 0x7F;
}

// ─── Exception Parser ──────────────────────────────────────────────

/**
 * Attempt to parse a Modbus exception from an error object.
 *
 * Handles errors from `modbus-serial` which may have:
 *   - `err.modbusCode`: the exception code (number)
 *   - `err.message`: may contain "Modbus exception X"
 *
 * Also handles generic errors that contain exception-like patterns
 * in the error message string.
 */
export function parseExceptionFromError(
  error: unknown,
  originalFunctionCode?: number
): ModbusExceptionResult {
  // Default result for non-Modbus errors
  const defaultResult: ModbusExceptionResult = {
    isException: false,
    errorMessage: getErrorMessage(error),
  };

  if (!error) return defaultResult;

  // Check for modbus-serial structured error
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    // modbus-serial throws errors with modbusCode property
    if (typeof err.modbusCode === 'number') {
      const code = err.modbusCode;
      const exception = EXCEPTION_CODES[code];
      const origFc = originalFunctionCode ||
        (typeof err.functionCode === 'number' ? err.functionCode : undefined);
      const excFc = origFc ? getExceptionFunctionCode(origFc) : undefined;

      return {
        isException: true,
        originalFunctionCode: origFc,
        exceptionFunctionCode: excFc,
        exception: exception || {
          code,
          name: `Unknown Exception 0x${code.toString(16).toUpperCase()}`,
          description: `The device returned an unrecognized Modbus exception code: 0x${code.toString(16).toUpperCase()}`,
          possibleCause: 'This exception code is not defined in the Modbus specification. Check the device documentation.',
        },
      };
    }

    // Check if the error message contains exception info
    const msg = (err.message || err.userMessage || '') as string;
    const parsed = parseExceptionFromMessage(msg, originalFunctionCode);
    if (parsed.isException) return parsed;
  }

  // Parse from error message string
  const msg = typeof error === 'string' ? error : '';
  if (msg) {
    const parsed = parseExceptionFromMessage(msg, originalFunctionCode);
    if (parsed.isException) return parsed;
  }

  return defaultResult;
}

/**
 * Parse a Modbus exception from an error message string.
 * Handles patterns like "Modbus exception 2", "Exception code 0x02", etc.
 */
function parseExceptionFromMessage(
  message: string,
  originalFunctionCode?: number
): ModbusExceptionResult {
  // Pattern: "Modbus exception X" (modbus-serial format)
  let match = message.match(/Modbus exception (\d+)/i);
  if (match) {
    const code = parseInt(match[1], 10);
    const exception = EXCEPTION_CODES[code];
    const origFc = originalFunctionCode;
    const excFc = origFc ? getExceptionFunctionCode(origFc) : undefined;

    if (exception || (code >= 1 && code <= 11)) {
      return {
        isException: true,
        originalFunctionCode: origFc,
        exceptionFunctionCode: excFc,
        exception: exception || {
          code,
          name: `Exception 0x${code.toString(16).toUpperCase()}`,
          description: `The device returned exception code ${code}`,
          possibleCause: 'Check the device documentation for this exception code.',
        },
      };
    }
  }

  // Pattern: "Exception code: 0x02" or "exception 0x02"
  match = message.match(/exception\s*(?:code)?:?\s*0x([0-9a-fA-F]+)/i);
  if (match) {
    const code = parseInt(match[1], 16);
    const exception = EXCEPTION_CODES[code];
    if (exception) {
      const origFc = originalFunctionCode;
      const excFc = origFc ? getExceptionFunctionCode(origFc) : undefined;
      return {
        isException: true,
        originalFunctionCode: origFc,
        exceptionFunctionCode: excFc,
        exception,
      };
    }
  }

  return { isException: false };
}

/** Extract a safe error message string from any error type */
function getErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    return String(err.message || err.userMessage || err.error || err) || 'Unknown error';
  }
  return String(error);
}

// ─── Formatter ─────────────────────────────────────────────────────

/**
 * Format exception information into a human-readable display string.
 */
export function formatExceptionInfo(result: ModbusExceptionResult): string {
  if (!result.isException) {
    return result.errorMessage || 'Unknown error';
  }

  const parts: string[] = [];

  if (result.originalFunctionCode !== undefined) {
    parts.push(`Function: ${getFunctionName(result.originalFunctionCode)}`);
  }

  if (result.exceptionFunctionCode !== undefined) {
    parts.push(`Returned: 0x${result.exceptionFunctionCode.toString(16).toUpperCase().padStart(2, '0')}`);
  }

  if (result.exception) {
    parts.push(`Exception: 0x${result.exception.code.toString(16).toUpperCase().padStart(2, '0')} — ${result.exception.name}`);
    parts.push(`Meaning: ${result.exception.description}`);
    parts.push(`Possible Cause: ${result.exception.possibleCause}`);
  }

  return parts.join('\n');
}

/**
 * Format exception as a compact single-line summary.
 */
export function formatExceptionSummary(result: ModbusExceptionResult): string {
  if (!result.isException || !result.exception) {
    return result.errorMessage || 'Error';
  }
  return `0x${result.exception.code.toString(16).toUpperCase().padStart(2, '0')} — ${result.exception.name}`;
}
