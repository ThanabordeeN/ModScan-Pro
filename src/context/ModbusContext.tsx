'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import type { ModbusDevice, ReadRange, UILogEntry } from '@/types/modbus';
import { modbusAPI, loggerAPI, LogEntry } from '@/lib/electron-api';
import { registersToValue } from '@/lib/modbus-utils';

interface ConnectionSettings {
  type: 'serial' | 'tcp';
  port: string;
  baudRate: number;
  parity: 'none' | 'even' | 'odd';
  stopBits: 1 | 2;
  dataBits: 7 | 8;
  tcpIp?: string;
  tcpPort?: number;
}

interface ModbusContextType {
  // Connection settings
  connection: ConnectionSettings;
  setConnection: (settings: ConnectionSettings) => void;
  isConnectionReady: boolean;
  
  // Scanned devices & Scan State
  scannedDevices: ModbusDevice[];
  setScannedDevices: (devices: ModbusDevice[]) => void;
  
  scanStartAddr: number;
  setScanStartAddr: (n: number) => void;
  scanEndAddr: number;
  setScanEndAddr: (n: number) => void;
  scanTimeout: number;
  setScanTimeout: (n: number) => void;
  
  isScanning: boolean;
  scanProgress: number;
  scanError: string | null;
  scannedCount: number;
  hasScanned: boolean;
  startScan: () => Promise<void>;

  // Read State
  readRanges: ReadRange[];
  setReadRanges: (ranges: ReadRange[]) => void;
  readTimeout: number;
  setReadTimeout: (t: number) => void;
  
  // Auto Read
  autoRefresh: boolean;
  toggleAutoRefresh: () => void;
  refreshInterval: number;
  setRefreshInterval: (t: number) => void;
  lastUpdated: Date | null;
  
  // Read Data/Results
  readData: {rangeId: string, data: number[]}[] | null;
  readError: string | null;
  isReading: boolean;
  readOnce: () => Promise<void>;

  // Write Action
  handleWrite: (config: any) => Promise<any>;

  // Analyzer / Logs
  logs: UILogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<UILogEntry[]>>;
  clearLogs: () => void;
  
  graphData: any[];
  setGraphData: React.Dispatch<React.SetStateAction<any[]>>;
  clearGraph: () => void;
  
  selectedRegisters: Set<string>;
  toggleRegisterSelection: (id: string) => void;
  
  isLogging: boolean;
  toggleLogging: () => Promise<void>;
}

const defaultConnection: ConnectionSettings = {
  type: 'serial',
  port: '',
  baudRate: 9600,
  parity: 'none',
  stopBits: 1,
  dataBits: 8,
  tcpIp: '192.168.1.10',
  tcpPort: 502,
};

const ModbusContext = createContext<ModbusContextType | undefined>(undefined);

export function ModbusProvider({ children }: { children: ReactNode }) {
  // --- Connection ---
  const [connection, setConnection] = useState<ConnectionSettings>(defaultConnection);
  const isConnectionReady = connection.type === 'serial' ? !!connection.port : (!!connection.tcpIp && !!connection.tcpPort);

  // --- Scan State ---
  const [scannedDevices, setScannedDevices] = useState<ModbusDevice[]>([]);
  const [scanStartAddr, setScanStartAddr] = useState(1);
  const [scanEndAddr, setScanEndAddr] = useState(10);
  const [scanTimeout, setScanTimeout] = useState(500);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [hasScanned, setHasScanned] = useState(false);
  const isScanningRef = useRef(false);

  // --- Read Configuration ---
  const [readRanges, setReadRanges] = useState<ReadRange[]>([
    { id: 'default', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 10, dataType: 'uint16', remark: '' }
  ]);
  const [readTimeout, setReadTimeout] = useState(1000);

  // --- Auto Read Loop ---
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(1000);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isReadingRef = useRef(false);

  // --- Results ---
  const [readData, setReadData] = useState<{rangeId: string, data: number[]}[] | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  // --- Analyzer (Logs & Graph) ---
  const [logs, setLogs] = useState<UILogEntry[]>([]);
  const [graphData, setGraphData] = useState<any[]>([]);
  const [selectedRegisters, setSelectedRegisters] = useState<Set<string>>(new Set());
  const [isLogging, setIsLogging] = useState(false);
  const MAX_GRAPH_POINTS = 500;

  // --- Persistence ---
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !hasLoaded.current) {
      const savedConnection = localStorage.getItem('modbus_connection');
      if (savedConnection) setConnection(JSON.parse(savedConnection));

      const savedRanges = localStorage.getItem('modbus_read_ranges');
      if (savedRanges) setReadRanges(JSON.parse(savedRanges));

      const savedInterval = localStorage.getItem('modbus_refresh_interval');
      if (savedInterval) setRefreshInterval(Number(savedInterval));

      const savedTimeout = localStorage.getItem('modbus_read_timeout');
      if (savedTimeout) setReadTimeout(Number(savedTimeout));

      hasLoaded.current = true;
    }
  }, []);

  useEffect(() => {
    if (hasLoaded.current) {
      localStorage.setItem('modbus_connection', JSON.stringify(connection));
    }
  }, [connection]);

  useEffect(() => {
    if (hasLoaded.current) {
      localStorage.setItem('modbus_read_ranges', JSON.stringify(readRanges));
    }
  }, [readRanges]);

  useEffect(() => {
    if (hasLoaded.current) {
      localStorage.setItem('modbus_refresh_interval', refreshInterval.toString());
    }
  }, [refreshInterval]);

  useEffect(() => {
    if (hasLoaded.current) {
      localStorage.setItem('modbus_read_timeout', readTimeout.toString());
    }
  }, [readTimeout]);

  // --- Actions ---

  // Scan Action
  const startScan = useCallback(async () => {
    if (!isConnectionReady) {
      setScanError('Connection not configured');
      return;
    }
    if (isScanningRef.current) return;

    setIsScanning(true);
    isScanningRef.current = true;
    setScanError(null);
    setScannedDevices([]);
    setHasScanned(false);
    setScanProgress(0);

    // Setup progress listener
    modbusAPI.onScanProgress((progress) => {
      setScanProgress(progress);
    });

    try {
      const data = await modbusAPI.scan({
        type: connection.type,
        port: connection.port,
        baudRate: connection.baudRate,
        parity: connection.parity,
        stopBits: connection.stopBits,
        dataBits: connection.dataBits,
        tcpIp: connection.tcpIp,
        tcpPort: connection.tcpPort,
        startAddress: scanStartAddr,
        endAddress: scanEndAddr,
        timeout: scanTimeout,
      });

      if (data.success && data.devices) {
        setScannedDevices(data.devices);
        setScannedCount(data.scannedCount || 0);
        setHasScanned(true);
      } else {
        setScanError(data.error || 'Scan failed');
      }
    } catch (err: any) {
      setScanError(err.message || 'Connection failed');
    } finally {
      modbusAPI.removeScanProgress();
      setIsScanning(false);
      isScanningRef.current = false;
    }
  }, [connection, isConnectionReady, scanStartAddr, scanEndAddr, scanTimeout]);


  // Read Action
  const handleRead = useCallback(async () => {
    if (!isConnectionReady) {
      setReadError('Connection not ready');
      return;
    }

    if (readRanges.length === 0) {
      setReadError('No read ranges configured');
      return;
    }

    if (isReadingRef.current) return;
    
    isReadingRef.current = true;
    setIsReading(true);
    
    if (!autoRefresh) {
      setReadError(null);
    }

    try {
      const requests = readRanges.map(range => ({
        slaveAddress: range.slaveAddress,
        functionCode: range.functionCode,
        registerAddress: range.registerAddress,
        quantity: range.quantity
      }));

      const data = await modbusAPI.readBatch({
        type: connection.type,
        port: connection.port,
        baudRate: connection.baudRate,
        parity: connection.parity,
        stopBits: connection.stopBits,
        dataBits: connection.dataBits,
        tcpIp: connection.tcpIp,
        tcpPort: connection.tcpPort,
        requests,
        timeout: readTimeout,
      });

      if (!data.error) {
        const mappedData = data.results.map((res: { success: boolean; data?: number[] }, idx: number) => ({
          rangeId: readRanges[idx].id,
          data: res.success && res.data ? res.data : []
        }));

        setReadData(mappedData);
        const now = new Date();
        setLastUpdated(now);
        setReadError(null);

        // --- Analyzer Update ---
        const timestamp = now.getTime();
        const graphPoint: any = { timestamp, timeStr: now.toLocaleTimeString() };
        const logEntries: LogEntry[] = [];
        const uiLogs: UILogEntry[] = [];

        data.results.forEach((res: { success: boolean; data?: number[] }, idx: number) => {
          if (res.success && res.data && res.data.length > 0) {
            const range = readRanges[idx];
            
             uiLogs.push({
               id: Date.now() + idx, 
               timestamp: now,
               address: range.registerAddress,
               values: res.data,
               functionCode: range.functionCode,
               remark: range.remark
             });

            res.data.forEach((val, valIdx) => {
              const uniqueId = `${range.slaveAddress}-${range.registerAddress + valIdx}`;
              
              if (selectedRegisters.has(uniqueId)) {
                // For graph, we might want converted values if data type is set
                // But current graph logic is per-register. 
                // If it's a 32-bit value, it spans multiple registers.
                // For simplicity, we graph individual registers for now.
                graphPoint[uniqueId] = val;
              }

              if (isLogging) {
                logEntries.push({
                  timestamp,
                  slaveId: range.slaveAddress,
                  address: range.registerAddress + valIdx,
                  value: val,
                  fc: range.functionCode
                });
              }
            });
          }
        });

        // Update Graph
        setGraphData(prev => {
           const newData = [...prev, graphPoint];
           if (newData.length > MAX_GRAPH_POINTS) return newData.slice(newData.length - MAX_GRAPH_POINTS);
           return newData;
        });

        // Update Logs List
        setLogs(prev => [...uiLogs, ...prev].slice(0, 200));

        // Write to CSV
        if (isLogging && logEntries.length > 0) {
           loggerAPI.log(logEntries).catch(err => console.error("Logger error:", err));
        }

      } else {
        setReadError(data.error || 'Unknown error');
      }
    } catch (err: any) {
      setReadError(err.message || 'Connection failed');
    } finally {
      setIsReading(false);
      isReadingRef.current = false;
    }
  }, [connection, isConnectionReady, readRanges, readTimeout, autoRefresh, isLogging, selectedRegisters, MAX_GRAPH_POINTS]);

  // Write Action
  const handleWrite = useCallback(async (config: any) => {
    if (!isConnectionReady) {
      throw new Error('Connection not ready');
    }
    const fullConfig = {
      type: connection.type,
      port: connection.port,
      baudRate: connection.baudRate,
      parity: connection.parity,
      stopBits: connection.stopBits,
      dataBits: connection.dataBits,
      tcpIp: connection.tcpIp,
      tcpPort: connection.tcpPort,
      ...config
    };
    return await modbusAPI.write(fullConfig);
  }, [connection, isConnectionReady]);

  // --- Auto Refresh Effect ---
  useEffect(() => {
    if (autoRefresh) {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = setInterval(() => {
        handleRead();
      }, refreshInterval);
    } else {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
    }
    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, [autoRefresh, refreshInterval, handleRead]);


  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
  };

  const readOnce = async () => {
    await handleRead();
  };

  const toggleRegisterSelection = (uniqueId: string) => {
    const newSet = new Set(selectedRegisters);
    if (newSet.has(uniqueId)) newSet.delete(uniqueId);
    else newSet.add(uniqueId);
    setSelectedRegisters(newSet);
  };

  const toggleLogging = async () => {
    if (isLogging) {
      // Stop
      setIsLogging(false);
      const res = await loggerAPI.stop();
      if (res.success && res.filePath) {
        alert(`Log saved to: ${res.filePath}`);
      }
    } else {
      // Start
      const res = await loggerAPI.start();
      if (res.success) {
        setIsLogging(true);
        if (!autoRefresh) setAutoRefresh(true);
      } else {
        setReadError(res.error || 'Failed to start logging');
      }
    }
  };

  const clearLogs = () => setLogs([]);
  const clearGraph = () => setGraphData([]);

  return (
    <ModbusContext.Provider value={{
      connection,
      setConnection,
      isConnectionReady,
      
      // Scan
      scannedDevices,
      setScannedDevices,
      scanStartAddr,
      setScanStartAddr,
      scanEndAddr,
      setScanEndAddr,
      scanTimeout,
      setScanTimeout,
      isScanning,
      scanProgress,
      scanError,
      scannedCount,
      hasScanned,
      startScan,

      // Read
      readRanges,
      setReadRanges,
      readTimeout,
      setReadTimeout,
      
      autoRefresh,
      toggleAutoRefresh,
      refreshInterval,
      setRefreshInterval,
      lastUpdated,
      
      readData,
      readError,
      isReading,
      readOnce,

      handleWrite,
      
      logs,
      setLogs,
      clearLogs,
      
      graphData,
      setGraphData,
      clearGraph,
      
      selectedRegisters,
      toggleRegisterSelection,
      
      isLogging,
      toggleLogging
    }}>
      {children}
    </ModbusContext.Provider>
  );
}

export function useModbus() {
  const context = useContext(ModbusContext);
  if (context === undefined) {
    throw new Error('useModbus must be used within a ModbusProvider');
  }
  return context;
}
