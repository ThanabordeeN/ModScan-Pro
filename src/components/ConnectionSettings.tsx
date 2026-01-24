import { useState, useEffect } from 'react';
import { Usb, Globe, RefreshCw, AlertCircle } from 'lucide-react';
import { SerialPortInfo, BAUD_RATES, DATA_BITS_OPTIONS, PARITY_OPTIONS, STOP_BITS_OPTIONS } from '@/types/modbus';
import { useModbus } from '@/context/ModbusContext';

interface ConnectionSettingsProps {
    disabled?: boolean;
}

export default function ConnectionSettings({ disabled }: ConnectionSettingsProps) {
    const { connection, setConnection} = useModbus();
    const [ports, setPorts] = useState<SerialPortInfo[]>([]);
    const [loadingPorts, setLoadingPorts] = useState(false);
    const [portError, setPortError] = useState<string | null>(null);

    const fetchPorts = async () => {
        setLoadingPorts(true);
        setPortError(null);

        try {
            const response = await fetch('/api/serial');
            const data = await response.json();

            if (data.success) {
                setPorts(data.ports);
                if (data.ports.length > 0 && !connection.port && connection.type === 'serial') {
                    setConnection({ ...connection, port: data.ports[0].path });
                }
            } else {
                setPortError(data.error || 'Failed to fetch ports');
            }
        } catch {
            setPortError('Failed to connect to server');
        } finally {
            setLoadingPorts(false);
        }
    };

    useEffect(() => {
        if (connection.type === 'serial') {
            fetchPorts();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connection.type]);

    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    {connection.type === 'serial' ? (
                        <Usb className="w-5 h-5 text-emerald-700" />
                    ) : (
                        <Globe className="w-5 h-5 text-emerald-700" />
                    )}
                    Connection Settings
                </h2>
                
                <div className="flex items-center gap-2">
                     <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                        <button
                            onClick={() => setConnection({ ...connection, type: 'serial' })}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                connection.type === 'serial'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                            disabled={disabled}
                        >
                            Serial
                        </button>
                        <button
                            onClick={() => setConnection({ ...connection, type: 'tcp' })}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                connection.type === 'tcp'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                            disabled={disabled}
                        >
                            Modbus TCP
                        </button>
                    </div>

                    {connection.type === 'serial' && (
                        <button
                            onClick={fetchPorts}
                            disabled={loadingPorts || disabled}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                            title="Refresh ports"
                        >
                            <RefreshCw className={`w-4 h-4 text-slate-600 ${loadingPorts ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>
            </div>

            {portError && connection.type === 'serial' && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-600">{portError}</span>
                </div>
            )}

            {connection.type === 'serial' ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-sm font-medium text-slate-600 mb-2">Serial Port</label>
                        <select
                            value={connection.port}
                            onChange={(e) => setConnection({ ...connection, port: e.target.value })}
                            disabled={disabled}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:bg-slate-50 disabled:text-slate-500"
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
                        <label className="block text-sm font-medium text-slate-600 mb-2">Baud Rate</label>
                        <select
                            value={connection.baudRate}
                            onChange={(e) => setConnection({ ...connection, baudRate: Number(e.target.value) })}
                            disabled={disabled}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:bg-slate-50 disabled:text-slate-500"
                        >
                            {BAUD_RATES.map((rate) => (
                                <option key={rate} value={rate}>{rate}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Data Bits</label>
                        <select
                            value={connection.dataBits}
                            onChange={(e) => setConnection({ ...connection, dataBits: Number(e.target.value) as 7 | 8 })}
                            disabled={disabled}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:bg-slate-50 disabled:text-slate-500"
                        >
                            {DATA_BITS_OPTIONS.map((bits) => (
                                <option key={bits} value={bits}>{bits}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Parity</label>
                        <select
                            value={connection.parity}
                            onChange={(e) => setConnection({ ...connection, parity: e.target.value as 'none' | 'even' | 'odd' })}
                            disabled={disabled}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:bg-slate-50 disabled:text-slate-500"
                        >
                            {PARITY_OPTIONS.map((p) => (
                                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Stop Bits</label>
                        <select
                            value={connection.stopBits}
                            onChange={(e) => setConnection({ ...connection, stopBits: Number(e.target.value) as 1 | 2 })}
                            disabled={disabled}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:bg-slate-50 disabled:text-slate-500"
                        >
                            {STOP_BITS_OPTIONS.map((bits) => (
                                <option key={bits} value={bits}>{bits}</option>
                            ))}
                        </select>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-600 mb-2">IP Address / Host</label>
                         <input
                            type="text"
                            value={connection.tcpIp || ''}
                            onChange={(e) => setConnection({ ...connection, tcpIp: e.target.value })}
                            placeholder="192.168.1.10"
                            disabled={disabled}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:bg-slate-50 disabled:text-slate-500 font-mono"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Port</label>
                         <input
                            type="number"
                            min={1}
                            max={65535}
                            value={connection.tcpPort || 502}
                            onChange={(e) => setConnection({ ...connection, tcpPort: Number(e.target.value) })}
                            placeholder="502"
                            disabled={disabled}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:bg-slate-50 disabled:text-slate-500 font-mono"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
