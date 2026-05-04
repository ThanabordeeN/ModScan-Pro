"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import type { ModbusDevice, ReadRange, UILogEntry } from "@/types/modbus";
import {
  modbusAPI,
  loggerAPI,
  dashboardAPI,
  LogEntry,
} from "@/lib/electron-api";
import { DataBufferEntry, bufferToCSV, downloadCSV } from "@/lib/data-buffer";
import { getWindowItem, setWindowItem } from "@/lib/window-storage";

interface ConnectionSettings {
  type: "serial" | "tcp";
  port: string;
  baudRate: number;
  parity: "none" | "even" | "odd";
  stopBits: 1 | 2;
  dataBits: 7 | 8;
  tcpIp?: string;
  tcpPort?: number;
}

export type ActiveProcess = "none" | "scan" | "read" | "topology";

export interface ScanHistoryEntry {
  id: number;
  timestamp: Date;
  startAddr: number;
  endAddr: number;
  devices: import("@/types/modbus").ModbusDevice[];
  scannedCount: number;
}

interface ModbusContextType {
  // Demo Mode
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  toggleDemoMode: () => void;

  // Connection settings
  connection: ConnectionSettings;
  setConnection: (settings: ConnectionSettings) => void;
  isConnectionReady: boolean;
  selectedSlaveId: number;
  setSelectedSlaveId: (slaveId: number) => void;

  // Scanned devices & Scan State
  scannedDevices: ModbusDevice[];
  setScannedDevices: (devices: ModbusDevice[]) => void;
  previousScannedDevices: ModbusDevice[];
  scanDiff: {
    added: ModbusDevice[];
    removed: ModbusDevice[];
    unchanged: ModbusDevice[];
  } | null;

  scanStartAddr: number | "";
  setScanStartAddr: (n: number | "") => void;
  scanEndAddr: number | "";
  setScanEndAddr: (n: number | "") => void;
  scanTimeout: number | "";
  setScanTimeout: (n: number | "") => void;

  isScanning: boolean;
  scanProgress: number;
  scanError: string | null;
  scannedCount: number;
  hasScanned: boolean;
  startScan: () => Promise<void>;
  cancelScan: () => Promise<void>;

  // Scan History
  scanHistory: ScanHistoryEntry[];
  clearScanHistory: () => void;
  exportScanHistoryCSV: () => void;

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
  readData: { rangeId: string; data: number[] }[] | null;
  setReadData: (data: { rangeId: string; data: number[] }[] | null) => void;
  readError: string | null;
  isReading: boolean;
  readOnce: () => Promise<void>;

  // Write Action
  handleWrite: (
    config: Partial<import("@/lib/electron-api").WriteConfig>,
  ) => Promise<unknown>;

  // Analyzer / Logs
  logs: UILogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<UILogEntry[]>>;
  clearLogs: () => void;

  graphData: Record<string, unknown>[];
  setGraphData: React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>;
  clearGraph: () => void;

  selectedRegisters: Set<string>;
  setSelectedRegisters: (regs: Set<string>) => void;
  toggleRegisterSelection: (id: string) => void;

  isLogging: boolean;
  toggleLogging: () => Promise<void>;

  // Data Buffer for CSV Export
  dataBuffer: DataBufferEntry[];
  clearDataBuffer: () => void;
  exportDataCSV: () => void;

  // Topology State
  isLiveMonitoring: boolean;
  setIsLiveMonitoring: (val: boolean) => void;

  // Change Address State
  changeAddrState: {
    currentAddress: number | "";
    newAddress: number | "";
    registerAddress: number | "";
    functionCode: 5 | 6 | 15 | 16;
    useScannedDevice: boolean;
  };
  setChangeAddrState: React.Dispatch<
    React.SetStateAction<{
      currentAddress: number | "";
      newAddress: number | "";
      registerAddress: number | "";
      functionCode: 5 | 6 | 15 | 16;
      useScannedDevice: boolean;
    }>
  >;

  // Process Manager
  activeProcess: ActiveProcess;
  pendingProcess: { name: ActiveProcess; conflicting: ActiveProcess } | null;
  requestStartProcess: (
    name: ActiveProcess,
    startCallback: () => void,
  ) => Promise<void>;
  confirmStartProcess: () => Promise<void>;
  cancelStartProcess: () => void;
}

const defaultConnection: ConnectionSettings = {
  type: "serial",
  port: "",
  baudRate: 9600,
  parity: "none",
  stopBits: 1,
  dataBits: 8,
  tcpIp: "192.168.1.10",
  tcpPort: 502,
};

const demoDevices: ModbusDevice[] = [
  { address: 1, responseTime: 18, holdingRegisters: [230, 501, 1200, 60] },
  { address: 2, responseTime: 24, holdingRegisters: [118, 342, 850, 1] },
  { address: 5, responseTime: 31, holdingRegisters: [400, 125, 240, 0] },
  { address: 8, responseTime: 27, holdingRegisters: [75, 220, 16, 95] },
  { address: 12, responseTime: 36, holdingRegisters: [101, 202, 303, 404] },
];

const buildDemoDevice = (address: number): ModbusDevice => ({
  address,
  responseTime: 12 + Math.floor(Math.random() * 68),
  holdingRegisters: Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 1000),
  ),
});

const buildRandomDemoScan = (startAddr: number, endAddr: number) => {
  const min = Math.min(startAddr, endAddr);
  const max = Math.max(startAddr, endAddr);
  const addresses: number[] = [];

  for (let address = min; address <= max; address += 1) {
    const rangeSize = max - min + 1;
    const discoveryRate = rangeSize <= 10 ? 0.42 : 0.18;
    if (Math.random() < discoveryRate) addresses.push(address);
  }

  if (addresses.length === 0 && max >= min) {
    addresses.push(min + Math.floor(Math.random() * (max - min + 1)));
  }

  return addresses
    .slice(0, 24)
    .sort((a, b) => a - b)
    .map((address) => buildDemoDevice(address));
};

const buildDemoReadValues = (
  slaveAddress: number,
  registerAddress: number,
  quantity: number,
  functionCode: number,
) => {
  const tick = Math.floor(Date.now() / 1000);
  return Array.from({ length: quantity }, (_, idx) => {
    const seed = slaveAddress * 97 + registerAddress + idx * 13 + tick;
    if (functionCode === 1 || functionCode === 2) return seed % 2;
    return seed % 1000;
  });
};

const ModbusContext = createContext<ModbusContextType | undefined>(undefined);

export function ModbusProvider({ children }: { children: ReactNode }) {
  // --- Demo Mode ---
  const [demoMode, setDemoModeState] = useState(false);
  const [demoScannedDevices, setDemoScannedDevices] =
    useState<ModbusDevice[]>(demoDevices);

  // --- Connection ---
  const [connection, setConnection] =
    useState<ConnectionSettings>(defaultConnection);
  const isConnectionReady =
    demoMode ||
    (connection.type === "serial"
      ? !!connection.port
      : !!connection.tcpIp && !!connection.tcpPort);

  // --- Scan State ---
  const [realScannedDevices, setScannedDevices] = useState<ModbusDevice[]>([]);
  const [previousScannedDevices, setPreviousScannedDevices] = useState<
    ModbusDevice[]
  >([]);
  const scannedDevices = demoMode ? demoScannedDevices : realScannedDevices;
  const [scanStartAddr, setScanStartAddr] = useState<number | "">(1);
  const [scanEndAddr, setScanEndAddr] = useState<number | "">(10);
  const [scanTimeout, setScanTimeout] = useState<number | "">(500);

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [hasScanned, setHasScanned] = useState(false);
  const isScanningRef = useRef(false);

  // --- Scan History ---
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);

  // --- Read Configuration ---
  const [readRanges, setReadRanges] = useState<ReadRange[]>([
    {
      id: "default",
      slaveAddress: 1,
      functionCode: 3,
      registerAddress: 0,
      quantity: 10,
      dataType: "uint16",
      remark: "",
    },
  ]);
  const [readTimeout, setReadTimeout] = useState(1000);

  // --- Auto Read Loop ---
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(1000);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isReadingRef = useRef(false);

  // --- Results ---
  const [readData, setReadData] = useState<
    { rangeId: string; data: number[] }[] | null
  >(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  // --- Analyzer (Logs & Graph) ---
  const [logs, setLogs] = useState<UILogEntry[]>([]);
  const [graphData, setGraphData] = useState<Record<string, unknown>[]>([]);
  const [selectedRegisters, setSelectedRegisters] = useState<Set<string>>(
    new Set(),
  );
  const [isLogging, setIsLogging] = useState(false);
  const MAX_GRAPH_POINTS = 500;
  const [dataBuffer, setDataBuffer] = useState<DataBufferEntry[]>([]);

  // --- Topology Global State ---
  const [isLiveMonitoring, setIsLiveMonitoring] = useState(false);

  // --- Change Address Global State ---
  const [changeAddrState, setChangeAddrState] = useState<{
    currentAddress: number | "";
    newAddress: number | "";
    registerAddress: number | "";
    functionCode: 5 | 6 | 15 | 16;
    useScannedDevice: boolean;
  }>({
    currentAddress: 1,
    newAddress: 2,
    registerAddress: 0,
    functionCode: 6 as 5 | 6 | 15 | 16,
    useScannedDevice: false,
  });
  const [selectedSlaveId, setSelectedSlaveIdState] = useState(1);

  const setSelectedSlaveId = useCallback((slaveId: number) => {
    const next = Math.max(1, Math.min(247, Number(slaveId) || 1));
    setSelectedSlaveIdState(next);
    setChangeAddrState((prev) => ({
      ...prev,
      currentAddress: next,
    }));
  }, []);

  // --- Process Conflict Manager ---
  const [activeProcess, setActiveProcess] = useState<ActiveProcess>("none");
  const [pendingProcess, setPendingProcess] = useState<{
    name: ActiveProcess;
    callback: () => void;
    conflicting: ActiveProcess;
  } | null>(null);

  const requestStartProcess = useCallback(
    async (processName: ActiveProcess, startCallback: () => void) => {
      const status = await dashboardAPI.status();
      let current: ActiveProcess = "none";
      if (status.running) current = "read";
      else if (isLiveMonitoring) current = "topology";
      else if (isScanningRef.current) current = "scan";

      if (current !== "none" && current !== processName) {
        setPendingProcess({
          name: processName,
          callback: startCallback,
          conflicting: current,
        });
      } else {
        setActiveProcess(processName);
        startCallback();
      }
    },
    [isLiveMonitoring],
  );

  const confirmStartProcess = useCallback(async () => {
    if (pendingProcess) {
      if (pendingProcess.conflicting === "read") await dashboardAPI.stop();
      if (pendingProcess.conflicting === "topology") setIsLiveMonitoring(false);
      if (pendingProcess.conflicting === "scan") {
        setIsScanning(false);
        isScanningRef.current = false;
      }
      setActiveProcess(pendingProcess.name);
      pendingProcess.callback();
      setPendingProcess(null);
    }
  }, [pendingProcess]);

  const cancelStartProcess = useCallback(() => setPendingProcess(null), []);

  // --- Persistence (window-scoped) ---
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !hasLoaded.current) {
      const savedConnection = getWindowItem("modbus_connection");
      if (savedConnection) setConnection(JSON.parse(savedConnection));

      const savedDemoMode = getWindowItem("modbus_demo_mode");
      if (savedDemoMode) setDemoModeState(savedDemoMode === "true");

      const savedDemoDevices = getWindowItem("modbus_demo_scanned_devices");
      if (savedDemoDevices) {
        try {
          const parsed = JSON.parse(savedDemoDevices);
          if (Array.isArray(parsed)) setDemoScannedDevices(parsed);
        } catch {
          // ignore invalid saved demo state
        }
      }

      const savedSelectedSlaveId = getWindowItem("modbus_selected_slave_id");
      if (savedSelectedSlaveId) {
        const parsed = Number(savedSelectedSlaveId);
        if (!Number.isNaN(parsed)) setSelectedSlaveId(parsed);
      }

      const savedRanges = getWindowItem("modbus_read_ranges");
      if (savedRanges) setReadRanges(JSON.parse(savedRanges));

      const savedInterval = getWindowItem("modbus_refresh_interval");
      if (savedInterval) setRefreshInterval(Number(savedInterval));

      const savedTimeout = getWindowItem("modbus_read_timeout");
      if (savedTimeout) setReadTimeout(Number(savedTimeout));

      hasLoaded.current = true;
    }
  }, [setSelectedSlaveId]);

  useEffect(() => {
    if (hasLoaded.current) {
      setWindowItem("modbus_connection", JSON.stringify(connection));
    }
  }, [connection]);

  useEffect(() => {
    if (hasLoaded.current) {
      setWindowItem("modbus_demo_mode", demoMode ? "true" : "false");
    }
  }, [demoMode]);

  useEffect(() => {
    if (hasLoaded.current) {
      setWindowItem("modbus_selected_slave_id", selectedSlaveId.toString());
    }
  }, [selectedSlaveId]);

  useEffect(() => {
    if (hasLoaded.current) {
      setWindowItem(
        "modbus_demo_scanned_devices",
        JSON.stringify(demoScannedDevices),
      );
    }
  }, [demoScannedDevices]);

  useEffect(() => {
    if (hasLoaded.current) {
      setWindowItem("modbus_read_ranges", JSON.stringify(readRanges));
    }
  }, [readRanges]);

  useEffect(() => {
    if (hasLoaded.current) {
      setWindowItem("modbus_refresh_interval", refreshInterval.toString());
    }
  }, [refreshInterval]);

  useEffect(() => {
    if (hasLoaded.current) {
      setWindowItem("modbus_read_timeout", readTimeout.toString());
    }
  }, [readTimeout]);

  // --- Actions ---

  const setDemoMode = useCallback((enabled: boolean) => {
    if (enabled && demoScannedDevices.length > 0) {
      setSelectedSlaveId(demoScannedDevices[0].address);
      setScannedCount(demoScannedDevices.length);
      setHasScanned(true);
      setScanProgress(100);
      setScanError(null);
    }
    setDemoModeState(enabled);
  }, [demoScannedDevices, setSelectedSlaveId]);

  const toggleDemoMode = useCallback(() => {
    setDemoModeState((prev) => {
      const next = !prev;
      if (next && demoScannedDevices.length > 0) {
        setSelectedSlaveId(demoScannedDevices[0].address);
        setScannedCount(demoScannedDevices.length);
        setHasScanned(true);
        setScanProgress(100);
        setScanError(null);
      }
      return next;
    });
  }, [demoScannedDevices, setSelectedSlaveId]);

  // Scan Action
  const startScan = useCallback(async () => {
    requestStartProcess("scan", async () => {
      if (!demoMode && !isConnectionReady) {
        setScanError("Connection not configured");
        return;
      }
      if (isScanningRef.current) return;

      setIsScanning(true);
      isScanningRef.current = true;
      setScanError(null);
      setPreviousScannedDevices(demoMode ? demoScannedDevices : realScannedDevices);
      setScannedDevices([]);
      setHasScanned(true);
      setScanProgress(0);

      if (demoMode) {
        setDemoScannedDevices([]);
        setScannedCount(0);

        try {
          const startAddr = scanStartAddr === "" ? 1 : scanStartAddr;
          const endAddr = scanEndAddr === "" ? 10 : scanEndAddr;
          const devicesInRange = buildRandomDemoScan(startAddr, endAddr);
          const totalAddresses = Math.max(1, endAddr - startAddr + 1);
          const delay = 120;

          for (
            let address = Math.min(startAddr, endAddr);
            address <= Math.max(startAddr, endAddr);
            address += 1
          ) {
            if (!isScanningRef.current) return;
            await new Promise((resolve) => setTimeout(resolve, delay));
            if (!isScanningRef.current) return;

            const foundDevice = devicesInRange.find(
              (device) => device.address === address,
            );
            if (foundDevice) {
              setDemoScannedDevices((prev) => [...prev, foundDevice]);
            }

            const scanned = address - startAddr + 1;
            setScannedCount(scanned);
            setScanProgress(Math.round((scanned / totalAddresses) * 100));
          }

          setDemoScannedDevices(devicesInRange);
          if (devicesInRange.length > 0) {
            setSelectedSlaveId(devicesInRange[0].address);
          }
          setScannedCount(totalAddresses);
          setScanProgress(100);
          setScanHistory((prev) => [
            {
              id: Date.now(),
              timestamp: new Date(),
              startAddr,
              endAddr,
              devices: devicesInRange,
              scannedCount: totalAddresses,
            },
            ...prev,
          ]);
        } finally {
          setIsScanning(false);
          isScanningRef.current = false;
          setActiveProcess("none");
        }
        return;
      }

      // Setup progress listener
      modbusAPI.onScanProgress((progress) => {
        setScanProgress(progress);
      });

      // Setup real-time found device listener
      modbusAPI.onScanFound((device) => {
        setScannedDevices((prev) => [...prev, device]);
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
          startAddress: scanStartAddr === "" ? 1 : scanStartAddr,
          endAddress: scanEndAddr === "" ? 10 : scanEndAddr,
          timeout: scanTimeout === "" ? 500 : scanTimeout,
        });

        if (data.success && data.devices) {
          // Final reconciliation: use the complete list from backend
          setScannedDevices(data.devices);
          if (data.devices.length > 0) {
            setSelectedSlaveId(data.devices[0].address);
          }
          setScannedCount(data.scannedCount || 0);
          // Push to scan history
          setScanHistory((prev) => [
            {
              id: Date.now(),
              timestamp: new Date(),
              startAddr: scanStartAddr === "" ? 1 : scanStartAddr,
              endAddr: scanEndAddr === "" ? 10 : scanEndAddr,
              devices: data.devices || [],
              scannedCount: data.scannedCount || 0,
            },
            ...prev,
          ]);
        } else {
          setScanError(data.error || "Scan failed");
        }
      } catch (err: unknown) {
        setScanError((err as Error).message || "Connection failed");
      } finally {
        modbusAPI.removeScanProgress();
        modbusAPI.removeScanFound();
        setIsScanning(false);
        isScanningRef.current = false;
        setActiveProcess("none");
      }
    });
  }, [
    connection,
    isConnectionReady,
    scanStartAddr,
    scanEndAddr,
    scanTimeout,
    realScannedDevices,
    demoScannedDevices,
    demoMode,
    setSelectedSlaveId,
    requestStartProcess,
  ]);

  // Cancel Scan Action
  const cancelScan = useCallback(async () => {
    if (!isScanningRef.current) return;
    if (demoMode) {
      setIsScanning(false);
      isScanningRef.current = false;
      setActiveProcess("none");
      return;
    }
    await modbusAPI.scanCancel();
    modbusAPI.removeScanProgress();
    modbusAPI.removeScanFound();
    setIsScanning(false);
    isScanningRef.current = false;
    setActiveProcess("none");
  }, [demoMode]);

  // Read Action
  const handleRead = useCallback(async () => {
    if (!isConnectionReady) {
      setReadError("Connection not ready");
      return;
    }

    if (readRanges.length === 0) {
      setReadError("No read ranges configured");
      return;
    }

    if (isReadingRef.current) return;

    isReadingRef.current = true;
    setIsReading(true);

    if (!autoRefresh) {
      setReadError(null);
    }

    try {
      const requests = readRanges.map((range) => ({
        slaveAddress: range.slaveAddress,
        functionCode: range.functionCode,
        registerAddress: range.registerAddress,
        quantity: range.quantity,
      }));

      const data = demoMode
        ? {
            results: requests.map((request) => {
              const online = scannedDevices.some(
                (device) => device.address === request.slaveAddress,
              );
              return {
                success: online,
                data: online
                  ? buildDemoReadValues(
                      request.slaveAddress,
                      request.registerAddress,
                      request.quantity,
                      request.functionCode,
                    )
                  : [],
                error: online ? undefined : "Demo device not found",
              };
            }),
            error: undefined,
          }
        : await modbusAPI.readBatch({
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
        const mappedData = data.results.map(
          (res: { success: boolean; data?: number[] }, idx: number) => ({
            rangeId: readRanges[idx].id,
            data: res.success && res.data ? res.data : [],
          }),
        );

        setReadData(mappedData);
        const now = new Date();
        setLastUpdated(now);
        setReadError(null);

        // --- Analyzer Update ---
        const timestamp = now.getTime();
        const timeStr = now.toLocaleTimeString();
        const graphPoint: Record<string, unknown> = { timestamp, timeStr };
        const logEntries: LogEntry[] = [];
        const uiLogs: UILogEntry[] = [];
        const bufferEntries: DataBufferEntry[] = [];

        data.results.forEach(
          (res: { success: boolean; data?: number[] }, idx: number) => {
            if (res.success && res.data && res.data.length > 0) {
              const range = readRanges[idx];

              uiLogs.push({
                id: Date.now() + idx,
                timestamp: now,
                address: range.registerAddress,
                values: res.data,
                functionCode: range.functionCode,
                remark: range.remark,
              });

              res.data.forEach((val, valIdx) => {
                const uniqueId = `${range.slaveAddress}-${range.registerAddress + valIdx}`;

                if (selectedRegisters.has(uniqueId)) {
                  graphPoint[uniqueId] = val;
                }

                // Always buffer data for CSV export
                bufferEntries.push({
                  timestamp,
                  timeStr,
                  slaveId: range.slaveAddress,
                  address: range.registerAddress + valIdx,
                  value: val,
                  functionCode: range.functionCode,
                  remark: range.remark,
                });

                if (isLogging) {
                  logEntries.push({
                    timestamp,
                    slaveId: range.slaveAddress,
                    address: range.registerAddress + valIdx,
                    value: val,
                    fc: range.functionCode,
                  });
                }
              });
            }
          },
        );

        // Update Graph
        setGraphData((prev) => {
          const newData = [...prev, graphPoint];
          if (newData.length > MAX_GRAPH_POINTS)
            return newData.slice(newData.length - MAX_GRAPH_POINTS);
          return newData;
        });

        // Update Data Buffer
        setDataBuffer((prev) => [...prev, ...bufferEntries]);

        // Update Logs List
        setLogs((prev) => [...uiLogs, ...prev].slice(0, 200));

        // Write to CSV
        if (isLogging && logEntries.length > 0) {
          loggerAPI
            .log(logEntries)
            .catch((err) => console.error("Logger error:", err));
        }
      } else {
        setReadError(data.error || "Unknown error");
      }
    } catch (err: unknown) {
      setReadError((err as Error).message || "Connection failed");
    } finally {
      setIsReading(false);
      isReadingRef.current = false;
    }
  }, [
    connection,
    isConnectionReady,
    readRanges,
    readTimeout,
    autoRefresh,
    isLogging,
    selectedRegisters,
    MAX_GRAPH_POINTS,
    demoMode,
    scannedDevices,
  ]);

  // Write Action
  const handleWrite = useCallback(
    async (config: Partial<import("@/lib/electron-api").WriteConfig>) => {
      if (!isConnectionReady) {
        throw new Error("Connection not ready");
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
        ...config,
      };
      if (demoMode) {
        const slaveAddress = Number(config.slaveAddress || 1);
        const online = scannedDevices.some(
          (device) => device.address === slaveAddress,
        );
        return online
          ? { success: true, message: "Demo write completed" }
          : { success: false, error: "Demo device not found" };
      }

      return await modbusAPI.write(
        fullConfig as import("@/lib/electron-api").WriteConfig,
      );
    },
    [connection, isConnectionReady, demoMode, scannedDevices],
  );

  // --- Auto Refresh Effect ---
  useEffect(() => {
    if (autoRefresh) {
      if (autoRefreshTimerRef.current)
        clearInterval(autoRefreshTimerRef.current);
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
      if (autoRefreshTimerRef.current)
        clearInterval(autoRefreshTimerRef.current);
    };
  }, [autoRefresh, refreshInterval, handleRead]);

  const toggleAutoRefresh = () => {
    setAutoRefresh((prev) => !prev);
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
        setReadError(res.error || "Failed to start logging");
      }
    }
  };

  const clearLogs = () => setLogs([]);
  const clearGraph = () => setGraphData([]);
  const clearDataBuffer = () => setDataBuffer([]);

  const exportDataCSV = useCallback(() => {
    if (dataBuffer.length === 0) return;
    const csv = bufferToCSV(dataBuffer);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const filename = `modbus_log_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.csv`;
    downloadCSV(csv, filename);
  }, [dataBuffer]);

  // --- Scan Diff ---
  const scanDiff = (() => {
    if (previousScannedDevices.length === 0) return null;
    const prevAddrs = new Set(previousScannedDevices.map((d) => d.address));
    const currentDevices = demoMode ? demoScannedDevices : realScannedDevices;
    const currAddrs = new Set(currentDevices.map((d) => d.address));
    return {
      added: currentDevices.filter((d) => !prevAddrs.has(d.address)),
      removed: previousScannedDevices.filter((d) => !currAddrs.has(d.address)),
      unchanged: currentDevices.filter((d) => prevAddrs.has(d.address)),
    };
  })();

  return (
    <ModbusContext.Provider
      value={{
        demoMode,
        setDemoMode,
        toggleDemoMode,

        connection,
        setConnection,
        isConnectionReady,
        selectedSlaveId,
        setSelectedSlaveId,

        // Scan
        scannedDevices,
        setScannedDevices,
        previousScannedDevices,
        scanDiff,
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
        hasScanned: demoMode || hasScanned,
        startScan,
        cancelScan,

        scanHistory,
        clearScanHistory: () => setScanHistory([]),
        exportScanHistoryCSV: () => {
          if (scanHistory.length === 0) return;
          const rows: string[] = [
            "Scan #,Timestamp,Range,Address,Response (ms),Register[0],Diff Status",
          ];
          scanHistory.forEach((entry, idx) => {
            const scanNum = scanHistory.length - idx;
            const ts = entry.timestamp.toLocaleString();
            const range = `${entry.startAddr}-${entry.endAddr}`;
            if (entry.devices.length === 0) {
              rows.push(`${scanNum},"${ts}","${range}",-,-,-,-`);
            } else {
              entry.devices.forEach((d) => {
                rows.push(
                  `${scanNum},"${ts}","${range}",${d.address},${d.responseTime},${d.holdingRegisters?.[0] ?? ""},`,
                );
              });
            }
          });
          const csv = rows.join("\n");
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const now = new Date();
          const pad = (n: number) => String(n).padStart(2, "0");
          a.href = url;
          a.download = `scan_history_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },

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
        setReadData,
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
        setSelectedRegisters,
        toggleRegisterSelection,

        isLogging,
        toggleLogging,

        dataBuffer,
        clearDataBuffer,
        exportDataCSV,

        isLiveMonitoring,
        setIsLiveMonitoring,
        changeAddrState,
        setChangeAddrState,
        activeProcess,
        pendingProcess,
        requestStartProcess,
        confirmStartProcess,
        cancelStartProcess,
      }}
    >
      {children}

      {/* Global Process Conflict Dialog — rendered via Portal to escape parent overflow */}
      {pendingProcess &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(15, 23, 42, 0.5)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              animation: "fadeIn 200ms ease-out",
            }}
          >
            <div
              className="bg-white dark:bg-slate-800"
              style={{
                borderRadius: "1rem",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                width: "100%",
                maxWidth: "28rem",
                overflow: "hidden",
                animation: "scaleIn 200ms ease-out",
              }}
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-start gap-4">
                <div className="w-12 h-12 rounded-instrument-full bg-amber-100 dark:instrument-accent/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 instrument-accent dark:instrument-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Process Conflict
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    The system is currently running a background process (
                    <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                      {pendingProcess.conflicting}
                    </span>
                    ). Starting a new process (
                    <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                      {pendingProcess.name}
                    </span>
                    ) requires stopping the current one.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex gap-3 justify-end">
                <button
                  onClick={cancelStartProcess}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 instrument-input hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStartProcess}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-900 instrument-input hover:bg-slate-800 transition-colors"
                >
                  Stop & Switch Process
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ModbusContext.Provider>
  );
}

export function useModbus() {
  const context = useContext(ModbusContext);
  if (context === undefined) {
    throw new Error("useModbus must be used within a ModbusProvider");
  }
  return context;
}
