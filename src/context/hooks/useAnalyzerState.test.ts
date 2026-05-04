/**
 * @jest-environment jsdom
 *
 * Tests the ACTUAL useAnalyzerState hook via renderHook.
 * Any change to MAX_GRAPH_POINTS, cap values, or ordering logic in the hook
 * will be caught here — we are NOT re-implementing the logic ourselves.
 */
import { act, renderHook } from '@testing-library/react';
import { useAnalyzerState } from './useAnalyzerState';
import type { UILogEntry } from '@/types/modbus';
import type { DataBufferEntry } from '@/lib/data-buffer';

// downloadCSV triggers browser download APIs not available in jsdom
jest.mock('@/lib/data-buffer', () => ({
  ...jest.requireActual('@/lib/data-buffer'),
  downloadCSV: jest.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLog(id: number): UILogEntry {
  return { id, timestamp: new Date(), address: id, values: [id], functionCode: 3 };
}

function makeGraphPoint(i: number): Record<string, unknown> {
  return { timestamp: i, v: i };
}

function makeBufferEntry(i: number): DataBufferEntry {
  return { timestamp: i, timeStr: `t${i}`, slaveId: 1, address: i, value: i, functionCode: 3 };
}

// ─── appendGraphPoint ─────────────────────────────────────────────────────────

describe('useAnalyzerState — appendGraphPoint', () => {
  it('appends a point and it appears in graphData', () => {
    const { result } = renderHook(() => useAnalyzerState());
    act(() => { result.current.appendGraphPoint({ timestamp: 1, v: 99 }); });
    expect(result.current.graphData).toHaveLength(1);
    expect(result.current.graphData[0]).toEqual({ timestamp: 1, v: 99 });
  });

  it('preserves insertion order', () => {
    const { result } = renderHook(() => useAnalyzerState());
    act(() => {
      result.current.appendGraphPoint(makeGraphPoint(1));
      result.current.appendGraphPoint(makeGraphPoint(2));
      result.current.appendGraphPoint(makeGraphPoint(3));
    });
    expect(result.current.graphData.map(p => p.timestamp)).toEqual([1, 2, 3]);
  });

  it('caps at MAX_GRAPH_POINTS and drops the oldest point', () => {
    const { result } = renderHook(() => useAnalyzerState());
    const cap = result.current.MAX_GRAPH_POINTS;

    // Fill to exactly cap + 1 so one point must be dropped
    act(() => {
      for (let i = 0; i <= cap; i++) {
        result.current.appendGraphPoint(makeGraphPoint(i));
      }
    });

    expect(result.current.graphData).toHaveLength(cap);
    // Point 0 (oldest) was dropped; point 1 is now first
    expect(result.current.graphData[0]).toEqual(makeGraphPoint(1));
    // Most recent point is still present
    expect(result.current.graphData[cap - 1]).toEqual(makeGraphPoint(cap));
  });

  it('clearGraph resets to empty array', () => {
    const { result } = renderHook(() => useAnalyzerState());
    act(() => { result.current.appendGraphPoint(makeGraphPoint(1)); });
    act(() => { result.current.clearGraph(); });
    expect(result.current.graphData).toHaveLength(0);
  });
});

// ─── appendLogs ───────────────────────────────────────────────────────────────

describe('useAnalyzerState — appendLogs', () => {
  it('new entries are PREPENDED (newest first)', () => {
    const { result } = renderHook(() => useAnalyzerState());
    act(() => { result.current.appendLogs([makeLog(1)]); });
    act(() => { result.current.appendLogs([makeLog(2)]); });
    // Log 2 should appear before log 1
    expect(result.current.logs[0].id).toBe(2);
    expect(result.current.logs[1].id).toBe(1);
  });

  it('caps total entries at 200 and keeps the newest', () => {
    const { result } = renderHook(() => useAnalyzerState());
    // Fill 199 old entries
    act(() => {
      result.current.appendLogs(
        Array.from({ length: 199 }, (_, i) => makeLog(i)),
      );
    });
    // Add 5 new entries — total would be 204, must truncate to 200
    const newEntries = [makeLog(200), makeLog(201), makeLog(202), makeLog(203), makeLog(204)];
    act(() => { result.current.appendLogs(newEntries); });

    expect(result.current.logs).toHaveLength(200);
    // Newest entries are at the front
    expect(result.current.logs[0].id).toBe(200);
  });

  it('clearLogs resets to empty array', () => {
    const { result } = renderHook(() => useAnalyzerState());
    act(() => { result.current.appendLogs([makeLog(1)]); });
    act(() => { result.current.clearLogs(); });
    expect(result.current.logs).toHaveLength(0);
  });
});

// ─── toggleRegisterSelection ──────────────────────────────────────────────────

describe('useAnalyzerState — toggleRegisterSelection', () => {
  it('adds a register on first toggle', () => {
    const { result } = renderHook(() => useAnalyzerState());
    act(() => { result.current.toggleRegisterSelection('1-3-100-0'); });
    expect(result.current.selectedRegisters.has('1-3-100-0')).toBe(true);
  });

  it('removes a register on second toggle (toggle off)', () => {
    const { result } = renderHook(() => useAnalyzerState());
    act(() => { result.current.toggleRegisterSelection('1-3-100-0'); });
    act(() => { result.current.toggleRegisterSelection('1-3-100-0'); });
    expect(result.current.selectedRegisters.has('1-3-100-0')).toBe(false);
  });

  it('toggling one register does not affect others', () => {
    const { result } = renderHook(() => useAnalyzerState());
    act(() => {
      result.current.toggleRegisterSelection('reg-a');
      result.current.toggleRegisterSelection('reg-b');
    });
    act(() => { result.current.toggleRegisterSelection('reg-a'); }); // remove reg-a
    expect(result.current.selectedRegisters.has('reg-b')).toBe(true);
    expect(result.current.selectedRegisters.has('reg-a')).toBe(false);
  });

  it('each render sees a new Set reference (no mutation)', () => {
    const { result } = renderHook(() => useAnalyzerState());
    const before = result.current.selectedRegisters;
    act(() => { result.current.toggleRegisterSelection('x'); });
    expect(result.current.selectedRegisters).not.toBe(before);
  });
});

// ─── appendBuffer ─────────────────────────────────────────────────────────────

describe('useAnalyzerState — appendBuffer', () => {
  it('appends entries in order', () => {
    const { result } = renderHook(() => useAnalyzerState());
    act(() => {
      result.current.appendBuffer([makeBufferEntry(1), makeBufferEntry(2)]);
    });
    act(() => {
      result.current.appendBuffer([makeBufferEntry(3)]);
    });
    expect(result.current.dataBuffer.map(e => e.address)).toEqual([1, 2, 3]);
  });

  it('clearDataBuffer resets to empty', () => {
    const { result } = renderHook(() => useAnalyzerState());
    act(() => { result.current.appendBuffer([makeBufferEntry(1)]); });
    act(() => { result.current.clearDataBuffer(); });
    expect(result.current.dataBuffer).toHaveLength(0);
  });
});

// ─── isLogging ────────────────────────────────────────────────────────────────

describe('useAnalyzerState — isLogging', () => {
  it('starts as false', () => {
    const { result } = renderHook(() => useAnalyzerState());
    expect(result.current.isLogging).toBe(false);
  });

  it('setIsLogging(true) updates the flag', () => {
    const { result } = renderHook(() => useAnalyzerState());
    act(() => { result.current.setIsLogging(true); });
    expect(result.current.isLogging).toBe(true);
  });
});
