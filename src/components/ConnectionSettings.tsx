import { useState, useEffect } from "react";
import { Usb, Globe, RefreshCw, AlertCircle } from "lucide-react";
import {
  SerialPortInfo,
  BAUD_RATES,
  DATA_BITS_OPTIONS,
  PARITY_OPTIONS,
  STOP_BITS_OPTIONS,
} from "@/types/modbus";
import { useModbus } from "@/context/ModbusContext";
import { serialAPI } from "@/lib/electron-api";

interface ConnectionSettingsProps {
  disabled?: boolean;
}

export default function ConnectionSettings({
  disabled,
}: ConnectionSettingsProps) {
  const { connection, setConnection } = useModbus();
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [portError, setPortError] = useState<string | null>(null);

  const fetchPorts = async () => {
    setLoadingPorts(true);
    setPortError(null);

    try {
      const data = await serialAPI.listPorts();

      if (data.success && data.ports) {
        setPorts(data.ports);
        if (
          data.ports.length > 0 &&
          !connection.port &&
          connection.type === "serial"
        ) {
          setConnection({ ...connection, port: data.ports[0].path });
        }
      } else {
        setPortError(data.error || "Failed to fetch ports");
      }
    } catch {
      setPortError("Failed to connect to server");
    } finally {
      setLoadingPorts(false);
    }
  };

  useEffect(() => {
    if (connection.type === "serial") {
      fetchPorts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.type]);

  return (
    <div className="instrument-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-app-text flex items-center gap-2">
          {connection.type === "serial" ? (
            <Usb className="w-5 h-5 text-instrument-accent" />
          ) : (
            <Globe className="w-5 h-5 text-instrument-accent" />
          )}
          Connection Settings
        </h2>

        <div className="flex items-center gap-2">
          <div className="flex rounded-instrument border border-app-border overflow-hidden">
            <button
              onClick={() => setConnection({ ...connection, type: "serial" })}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                connection.type === "serial"
                  ? "bg-instrument-accent text-white"
                  : "bg-app-surface text-app-muted hover:bg-app-muted/10"
              }`}
              disabled={disabled}
            >
              Serial
            </button>
            <button
              onClick={() => setConnection({ ...connection, type: "tcp" })}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                connection.type === "tcp"
                  ? "bg-instrument-accent text-white"
                  : "bg-app-surface text-app-muted hover:bg-app-muted/10"
              }`}
              disabled={disabled}
            >
              Modbus TCP
            </button>
          </div>

          {connection.type === "serial" && (
            <button
              onClick={fetchPorts}
              disabled={loadingPorts || disabled}
              className="p-2 rounded-instrument border border-app-border bg-app-surface hover:bg-app-muted/10 transition-colors disabled:opacity-50"
              title="Refresh ports"
            >
              <RefreshCw
                className={`w-4 h-4 text-app-muted ${loadingPorts ? "animate-spin" : ""}`}
              />
            </button>
          )}
        </div>
      </div>

      {portError && connection.type === "serial" && (
        <div className="mb-4 p-3 rounded-instrument bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600">{portError}</span>
        </div>
      )}

      {connection.type === "serial" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-app-muted mb-2">
              Serial Port
            </label>
            <select
              value={connection.port}
              onChange={(e) =>
                setConnection({ ...connection, port: e.target.value })
              }
              disabled={disabled}
              className="w-full instrument-input disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Port</option>
              {ports.map((port) => (
                <option key={port.path} value={port.path}>
                  {port.path}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-2">
              Baud Rate
            </label>
            <select
              value={connection.baudRate}
              onChange={(e) =>
                setConnection({
                  ...connection,
                  baudRate: Number(e.target.value),
                })
              }
              disabled={disabled}
              className="w-full instrument-input disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {BAUD_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-2">
              Data Bits
            </label>
            <select
              value={connection.dataBits}
              onChange={(e) =>
                setConnection({
                  ...connection,
                  dataBits: Number(e.target.value) as 7 | 8,
                })
              }
              disabled={disabled}
              className="w-full instrument-input disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {DATA_BITS_OPTIONS.map((bits) => (
                <option key={bits} value={bits}>
                  {bits}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-2">
              Parity
            </label>
            <select
              value={connection.parity}
              onChange={(e) =>
                setConnection({
                  ...connection,
                  parity: e.target.value as "none" | "even" | "odd",
                })
              }
              disabled={disabled}
              className="w-full instrument-input disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {PARITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-2">
              Stop Bits
            </label>
            <select
              value={connection.stopBits}
              onChange={(e) =>
                setConnection({
                  ...connection,
                  stopBits: Number(e.target.value) as 1 | 2,
                })
              }
              disabled={disabled}
              className="w-full instrument-input disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {STOP_BITS_OPTIONS.map((bits) => (
                <option key={bits} value={bits}>
                  {bits}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-app-muted mb-2">
              IP Address / Host
            </label>
            <input
              type="text"
              value={connection.tcpIp || ""}
              onChange={(e) =>
                setConnection({ ...connection, tcpIp: e.target.value })
              }
              placeholder="192.168.1.10"
              disabled={disabled}
              className="w-full instrument-input font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-app-muted mb-2">
              Port
            </label>
            <input
              type="number"
              min={1}
              max={65535}
              value={connection.tcpPort || 502}
              onChange={(e) =>
                setConnection({
                  ...connection,
                  tcpPort: Number(e.target.value),
                })
              }
              placeholder="502"
              disabled={disabled}
              className="w-full instrument-input font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      )}
    </div>
  );
}
