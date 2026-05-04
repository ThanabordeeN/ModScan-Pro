import { getRegKey, FC_LABELS, PLOT_COLORS, INTERVAL_OPTIONS } from './dashboard';

describe('getRegKey', () => {
  it('produces the correct format: slaveId-fc-startAddr-regIndex', () => {
    expect(getRegKey(1, 3, 0, 0)).toBe('1-3-0-0');
  });

  it('uses regIndex, not absolute address', () => {
    // reg at startAddr=100, index=5 → absolute addr 105, but key uses index
    expect(getRegKey(1, 3, 100, 5)).toBe('1-3-100-5');
  });

  it('produces unique keys for different slaveIds', () => {
    expect(getRegKey(1, 3, 0, 0)).not.toBe(getRegKey(2, 3, 0, 0));
  });

  it('produces unique keys for different function codes', () => {
    expect(getRegKey(1, 3, 0, 0)).not.toBe(getRegKey(1, 4, 0, 0));
  });

  it('produces unique keys for different start addresses', () => {
    expect(getRegKey(1, 3, 0, 0)).not.toBe(getRegKey(1, 3, 1, 0));
  });

  it('produces unique keys for different register indexes', () => {
    expect(getRegKey(1, 3, 0, 0)).not.toBe(getRegKey(1, 3, 0, 1));
  });

  it('is stable — same inputs always produce same output', () => {
    expect(getRegKey(5, 1, 200, 3)).toBe(getRegKey(5, 1, 200, 3));
  });

  it('handles boundary values (slaveId=247, max register)', () => {
    expect(getRegKey(247, 4, 65535, 124)).toBe('247-4-65535-124');
  });
});

describe('FC_LABELS', () => {
  it('covers all 4 standard Modbus read function codes', () => {
    expect(FC_LABELS[1]).toBeDefined();
    expect(FC_LABELS[2]).toBeDefined();
    expect(FC_LABELS[3]).toBeDefined();
    expect(FC_LABELS[4]).toBeDefined();
  });

  it('FC03 label includes "Holding"', () => {
    expect(FC_LABELS[3]).toMatch(/holding/i);
  });

  it('FC04 label includes "Input"', () => {
    expect(FC_LABELS[4]).toMatch(/input/i);
  });
});

describe('PLOT_COLORS', () => {
  it('has at least 10 colors', () => {
    expect(PLOT_COLORS.length).toBeGreaterThanOrEqual(10);
  });

  it('all entries are valid hex color strings', () => {
    for (const color of PLOT_COLORS) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('has no duplicate colors', () => {
    const unique = new Set(PLOT_COLORS);
    expect(unique.size).toBe(PLOT_COLORS.length);
  });
});

describe('INTERVAL_OPTIONS', () => {
  it('is sorted ascending by value', () => {
    for (let i = 1; i < INTERVAL_OPTIONS.length; i++) {
      expect(INTERVAL_OPTIONS[i].value).toBeGreaterThan(INTERVAL_OPTIONS[i - 1].value);
    }
  });

  it('each option has a numeric value and string label', () => {
    for (const opt of INTERVAL_OPTIONS) {
      expect(typeof opt.value).toBe('number');
      expect(typeof opt.label).toBe('string');
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });
});
