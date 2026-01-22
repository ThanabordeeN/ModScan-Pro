'use client';

import { useState } from 'react';
import { Search, Loader2, CheckCircle2, XCircle, RefreshCw, Usb, AlertCircle } from 'lucide-react';
import { useModbus } from '@/context/ModbusContext';
import type { SerialPortInfo } from '@/types/modbus';
import { BAUD_RATES, PARITY_OPTIONS, STOP_BITS_OPTIONS, DATA_BITS_OPTIONS } from '@/types/modbus';
import { useEffect } from 'react';

export default function ScanPage() {
  const { connection, setConnection, scannedDevices, setScannedDevices } = useModbus();
  
  // Port list
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [portError, setPortError] = useState<string | null>(null);
  
  // Scan settings
  const [startAddress, setStartAddress] = useState(1);
  const [endAddress, setEndAddress] = useState(10);
  const [timeout, setTimeout] = useState(500);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [hasScanned, setHasScanned] = useState(false);

  const fetchPorts = async () => {
    setLoadingPorts(true);
    setPortError(null);
    
    try {
      const response = await fetch('/api/serial');
      const data = await response.json();
      
      if (data.success) {
        setPorts(data.ports);
        if (data.ports.length > 0 && !connection.port) {
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
    fetchPorts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScan = async () => {
    if (!connection.port) {
      setScanError('กรุณาเลือก Serial Port ก่อน');
      return;
    }

    setScanning(true);
    setScanError(null);
    setScannedDevices([]);
    setHasScanned(false);

    try {
      const response = await fetch('/api/modbus/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port: connection.port,
          baudRate: connection.baudRate,
          parity: connection.parity,
          stopBits: connection.stopBits,
          dataBits: connection.dataBits,
          startAddress,
          endAddress,
          timeout,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setScannedDevices(data.devices);
        setScannedCount(data.scannedCount);
        setHasScanned(true);
      } else {
        setScanError(data.error || 'การสแกนล้มเหลว');
      }
    } catch {
      setScanError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700">
          <Search className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">สแกนอุปกรณ์</h1>
          <p className="text-sm text-slate-600">ค้นหาอุปกรณ์ Modbus ในช่วง Address ที่กำหนด</p>
        </div>
      </div>

      {/* Connection Settings */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Usb className="w-5 h-5 text-cyan-700" />
            การตั้งค่าการเชื่อมต่อ
          </h2>
          <button
            onClick={fetchPorts}
            disabled={loadingPorts}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
            title="Refresh ports"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loadingPorts ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {portError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-600">{portError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-slate-600 mb-2">Serial Port</label>
            <select
              value={connection.port}
              onChange={(e) => setConnection({ ...connection, port: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">เลือก Port...</option>
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {STOP_BITS_OPTIONS.map((bits) => (
                <option key={bits} value={bits}>{bits}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scan Settings */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">ช่วง Address ที่ต้องการสแกน</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Start Address</label>
            <input
              type="number"
              min={1}
              max={247}
              value={startAddress}
              onChange={(e) => setStartAddress(Math.min(247, Math.max(1, Number(e.target.value))))}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">End Address</label>
            <input
              type="number"
              min={1}
              max={247}
              value={endAddress}
              onChange={(e) => setEndAddress(Math.min(247, Math.max(startAddress, Number(e.target.value))))}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Timeout (ms)</label>
            <input
              type="number"
              min={100}
              max={5000}
              step={100}
              value={timeout}
              onChange={(e) => setTimeout(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <button
          onClick={handleScan}
          disabled={scanning || !connection.port}
          className="w-full py-3 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
        >
          {scanning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              กำลังสแกน...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              เริ่มสแกน
            </>
          )}
        </button>

        {scanning && (
          <div className="mt-4">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {scanError && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600">{scanError}</span>
          </div>
        )}
      </div>

      {/* Results */}
      {hasScanned && !scanning && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">ผลการสแกน</h2>
            <span className="text-sm text-slate-500">
              พบ {scannedDevices.length} อุปกรณ์ จาก {scannedCount} Address
            </span>
          </div>

          {scannedDevices.length === 0 ? (
            <div className="p-8 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <XCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500">ไม่พบอุปกรณ์ในช่วง Address ที่กำหนด</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Address</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Response</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">สถานะ</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Register[0]</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {scannedDevices.map((device) => (
                    <tr key={device.address} className="bg-white hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold">
                          {device.address}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{device.responseTime}ms</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" />
                          ออนไลน์
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-mono">
                        {device.holdingRegisters?.[0] ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
