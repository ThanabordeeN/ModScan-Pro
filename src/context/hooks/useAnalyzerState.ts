"use client";

import { useState, useCallback } from "react";
import type { UILogEntry } from "@/types/modbus";
import { DataBufferEntry, bufferToCSV, downloadCSV } from "@/lib/data-buffer";

const MAX_GRAPH_POINTS = 5;

export function useAnalyzerState() {
  const [logs, setLogs] = useState<UILogEntry[]>([]);
  const [graphData, setGraphData] = useState<Record<string, unknown>[]>([]);
  const [selectedRegisters, setSelectedRegisters] = useState<Set<string>>(
    new Set(),
  );
  const [isLogging, setIsLogging] = useState(false);
  const [dataBuffer, setDataBuffer] = useState<DataBufferEntry[]>([]);

  const clearLogs = useCallback(() => setLogs([]), []);
  const clearGraph = useCallback(() => setGraphData([]), []);
  const clearDataBuffer = useCallback(() => setDataBuffer([]), []);

  const toggleRegisterSelection = useCallback((uniqueId: string) => {
    setSelectedRegisters((prev) => {
      const next = new Set(prev);
      if (next.has(uniqueId)) next.delete(uniqueId);
      else next.add(uniqueId);
      return next;
    });
  }, []);

  const exportDataCSV = useCallback(() => {
    if (dataBuffer.length === 0) return;
    const csv = bufferToCSV(dataBuffer);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const filename = `modbus_log_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.csv`;
    downloadCSV(csv, filename);
  }, [dataBuffer]);

  const appendGraphPoint = useCallback(
    (point: Record<string, unknown>) => {
      setGraphData((prev) => {
        const next = [...prev, point];
        return next.length > MAX_GRAPH_POINTS
          ? next.slice(next.length - MAX_GRAPH_POINTS)
          : next;
      });
    },
    [],
  );

  const appendLogs = useCallback((entries: UILogEntry[]) => {
    setLogs((prev) => [...entries, ...prev].slice(0, 200));
  }, []);

  const appendBuffer = useCallback((entries: DataBufferEntry[]) => {
    setDataBuffer((prev) => [...prev, ...entries]);
  }, []);

  return {
    logs,
    setLogs,
    clearLogs,
    appendLogs,

    graphData,
    setGraphData,
    clearGraph,
    appendGraphPoint,

    selectedRegisters,
    setSelectedRegisters,
    toggleRegisterSelection,

    isLogging,
    setIsLogging,

    dataBuffer,
    setDataBuffer,
    clearDataBuffer,
    appendBuffer,
    exportDataCSV,

    MAX_GRAPH_POINTS,
  };
}
