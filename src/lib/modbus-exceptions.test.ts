import {
  parseExceptionFromError,
  formatExceptionInfo,
  formatExceptionSummary,
  getFunctionName,
  getExceptionFunctionCode,
  getOriginalFunctionCode,
  EXCEPTION_CODES,
} from './modbus-exceptions';

describe('modbus-exceptions', () => {
  // ─── Exception Code Database ───────────────────────────────────

  describe('EXCEPTION_CODES', () => {
    it('should have all standard exception codes', () => {
      expect(EXCEPTION_CODES[0x01]).toBeDefined();
      expect(EXCEPTION_CODES[0x02]).toBeDefined();
      expect(EXCEPTION_CODES[0x03]).toBeDefined();
      expect(EXCEPTION_CODES[0x04]).toBeDefined();
      expect(EXCEPTION_CODES[0x05]).toBeDefined();
      expect(EXCEPTION_CODES[0x06]).toBeDefined();
      expect(EXCEPTION_CODES[0x08]).toBeDefined();
      expect(EXCEPTION_CODES[0x0A]).toBeDefined();
      expect(EXCEPTION_CODES[0x0B]).toBeDefined();
    });

    it('should return correct name for Illegal Data Address (0x02)', () => {
      expect(EXCEPTION_CODES[0x02].name).toBe('Illegal Data Address');
      expect(EXCEPTION_CODES[0x02].description).toContain('not an allowable address');
    });
  });

  // ─── Function Code Helpers ─────────────────────────────────────

  describe('getFunctionName', () => {
    it('should return known function names', () => {
      expect(getFunctionName(0x03)).toBe('FC03 — Read Holding Registers');
      expect(getFunctionName(0x06)).toBe('FC06 — Write Single Register');
    });

    it('should generate names for unknown codes', () => {
      expect(getFunctionName(0x14)).toBe('FC14');
    });
  });

  describe('getExceptionFunctionCode', () => {
    it('should set high bit', () => {
      expect(getExceptionFunctionCode(0x03)).toBe(0x83);
      expect(getExceptionFunctionCode(0x06)).toBe(0x86);
    });
  });

  describe('getOriginalFunctionCode', () => {
    it('should clear high bit', () => {
      expect(getOriginalFunctionCode(0x83)).toBe(0x03);
      expect(getOriginalFunctionCode(0x86)).toBe(0x06);
    });
  });

  // ─── Exception Parser ──────────────────────────────────────────

  describe('parseExceptionFromError', () => {
    it('should parse modbus-serial structured error', () => {
      const error = {
        message: 'Modbus exception 2: Illegal Data Address',
        modbusCode: 2,
      };

      const result = parseExceptionFromError(error, 3);
      expect(result.isException).toBe(true);
      expect(result.originalFunctionCode).toBe(3);
      expect(result.exceptionFunctionCode).toBe(0x83);
      expect(result.exception?.name).toBe('Illegal Data Address');
      expect(result.exception?.code).toBe(2);
    });

    it('should parse exception from message string', () => {
      const error = new Error('Modbus exception 3: Illegal Data Value');

      const result = parseExceptionFromError(error, 6);
      expect(result.isException).toBe(true);
      expect(result.originalFunctionCode).toBe(6);
      expect(result.exception?.name).toBe('Illegal Data Value');
    });

    it('should parse exception from message with hex code', () => {
      const error = new Error('exception code: 0x01');

      const result = parseExceptionFromError(error, 3);
      expect(result.isException).toBe(true);
      expect(result.exception?.name).toBe('Illegal Function');
    });

    it('should handle unknown exception codes', () => {
      const error = {
        message: 'Modbus exception 99',
        modbusCode: 99,
      };

      const result = parseExceptionFromError(error, 3);
      expect(result.isException).toBe(true);
      expect(result.exception?.name).toContain('Unknown');
    });

    it('should return non-exception for timeout errors', () => {
      const error = new Error('Timed out');
      const result = parseExceptionFromError(error, 3);
      expect(result.isException).toBe(false);
      expect(result.errorMessage).toContain('Timed out');
    });

    it('should return non-exception for connection errors', () => {
      const error = new Error('Port Not Open');
      const result = parseExceptionFromError(error);
      expect(result.isException).toBe(false);
    });

    it('should handle null/undefined gracefully', () => {
      expect(parseExceptionFromError(null).isException).toBe(false);
      expect(parseExceptionFromError(undefined).isException).toBe(false);
      expect(parseExceptionFromError(null).errorMessage).toBe('Unknown error');
    });

    it('should handle string error', () => {
      const result = parseExceptionFromError('Something went wrong');
      expect(result.isException).toBe(false);
      expect(result.errorMessage).toBe('Something went wrong');
    });
  });

  // ─── Formatters ────────────────────────────────────────────────

  describe('formatExceptionInfo', () => {
    it('should format exception with full details', () => {
      const error = {
        message: 'Modbus exception 2',
        modbusCode: 2,
      };

      const result = parseExceptionFromError(error, 3);
      const formatted = formatExceptionInfo(result);

      expect(formatted).toContain('FC03 — Read Holding Registers');
      expect(formatted).toContain('0x83');
      expect(formatted).toContain('Illegal Data Address');
      expect(formatted).toContain('not an allowable address');
    });

    it('should return error message for non-exception', () => {
      const result = parseExceptionFromError(new Error('Timeout'));
      const formatted = formatExceptionInfo(result);
      expect(formatted).toContain('Timeout');
    });
  });

  describe('formatExceptionSummary', () => {
    it('should return compact summary', () => {
      const error = {
        message: 'Modbus exception 2',
        modbusCode: 2,
      };

      const result = parseExceptionFromError(error, 3);
      const summary = formatExceptionSummary(result);

      expect(summary).toBe('0x02 — Illegal Data Address');
    });

    it('should return error message for non-exception', () => {
      const result = parseExceptionFromError(new Error('Connection refused'));
      const summary = formatExceptionSummary(result);
      expect(summary).toBe('Connection refused');
    });
  });

  // ─── Acceptance Test ───────────────────────────────────────────

  describe('acceptance test', () => {
    it('should display Illegal Data Address for exception 0x02', () => {
      // Given: a device returns Modbus exception 0x02
      const error = { message: 'Modbus exception 2: Illegal Data Address', modbusCode: 2 };

      // When: poll fails
      const result = parseExceptionFromError(error, 3);

      // Then: UI should display Illegal Data Address, not generic error
      expect(result.isException).toBe(true);
      expect(formatExceptionSummary(result)).toBe('0x02 — Illegal Data Address');
      expect(formatExceptionInfo(result)).toContain('Illegal Data Address');
      expect(formatExceptionInfo(result)).not.toBe('Unknown error');
    });
  });
});
