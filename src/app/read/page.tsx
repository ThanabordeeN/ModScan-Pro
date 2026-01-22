'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Loader2, XCircle, RefreshCw, Usb, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useModbus } from '@/context/ModbusContext';
import type { SerialPortInfo } from '@/types/modbus';
import { BAUD_RATES, PARITY_OPTIONS, STOP_BITS_OPTIONS, DATA_BITS_OPTIONS } from '@/types/modbus';

const READ_FUNCTION_CODES = [
  { value: 1, label: 'FC01 - Read Coils', description: 'อ่าน Coil Status (0x)' },
  { value: 2, label: 'FC02 - Read Discrete Inputs', description: 'อ่าน Discrete Input (1x)' },
  { value: 3, label: 'FC03 - Read Holding Registers', description: 'อ่าน Holding Register (4x)' },
  { value: 4, label: 'FC04 - Read Input Registers', description: 'อ่าน Input Register (3x)' },
];

export default function ReadPage() {
  const { connection, setConnection, scannedDevices } = useModbus();
  
  // Port list
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [portError, setPortError] = useState<string | null>(null);
  
  // Read settings
  const [slaveAddress, setSlaveAddress] = useState(1);
  const [functionCode, setFunctionCode] = useState<1 | 2 | 3 | 4>(3);
  const [registerAddress, setRegisterAddress] = useState(0);
  const [quantity, setQuantity] = useState(10);
  const [timeout, setTimeout] = useState(1000);
  
  // Results
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readData, setReadData] = useState<number[] | null>(null);

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

  // Reset data and error when function code changes
  useEffect(() => {
    setReadData(null);
    setError(null);
  }, [functionCode]);

  const handleRead = async () => {
    if (!connection.port) {
      setError('กรุณาเลือก Serial Port ก่อน');
      return;
    }

    setReading(true);
    setError(null);
    setReadData(null);

    try {
      const response = await fetch('/api/modbus/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port: connection.port,
          baudRate: connection.baudRate,
          parity: connection.parity,
          stopBits: connection.stopBits,
          dataBits: connection.dataBits,
          slaveAddress,
          functionCode,
          registerAddress,
          quantity,
          timeout,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setReadData(data.data);
      } else {
        setError(data.error || 'การอ่านข้อมูลล้มเหลว');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
    } finally {
      setReading(false);
    }
  };

  const isCoilFunction = functionCode === 1 || functionCode === 2;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">อ่านข้อมูล</h1>
          <p className="text-sm text-slate-600">อ่านค่า Registers และ Coils จากอุปกรณ์ Modbus</p>
        </div>
      </div>

      {/* Connection Settings */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Usb className="w-5 h-5 text-emerald-700" />
            การตั้งค่าการเชื่อมต่อ
          </h2>
          <button
            onClick={fetchPorts}
            disabled={loadingPorts}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">เลือก Port...</option>
              {ports.map((port) => (
                <option key={port.path} value={port.path}>{port.path}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Baud Rate</label>
            <select
              value={connection.baudRate}
              onChange={(e) => setConnection({ ...connection, baudRate: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {STOP_BITS_OPTIONS.map((bits) => (
                <option key={bits} value={bits}>{bits}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scanned Devices Quick Select */}
      {scannedDevices.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-emerald-500/30 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-slate-900">เลือกจากอุปกรณ์ที่สแกนได้:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {scannedDevices.map((device) => (
              <button
                key={device.address}
                onClick={() => setSlaveAddress(device.address)}
                className={`px-3 py-1.5 rounded-lg font-mono text-sm transition-all ${
                  slaveAddress === device.address
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ID: {device.address}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Read Settings */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">ตั้งค่าการอ่าน</h2>
        
        {/* Function Code Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-600 mb-2">Function Code</label>
          <select
            value={functionCode.toString()}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && [1, 2, 3, 4].includes(val)) {
                setFunctionCode(val as 1 | 2 | 3 | 4);
              }
            }}
            className="w-full px-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {READ_FUNCTION_CODES.map((fc) => (
              <option key={fc.value} value={fc.value.toString()}>
                {fc.label} - {fc.description}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Slave Address</label>
            <input
              type="number"
              min={1}
              max={247}
              value={slaveAddress}
              onChange={(e) => setSlaveAddress(Math.min(247, Math.max(1, Number(e.target.value))))}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Start Address</label>
            <input
              type="number"
              min={0}
              max={65535}
              value={registerAddress}
              onChange={(e) => setRegisterAddress(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Quantity</label>
            <input
              type="number"
              min={1}
              max={125}
              value={quantity}
              onChange={(e) => setQuantity(Math.min(125, Math.max(1, Number(e.target.value))))}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Timeout (ms)</label>
            <input
              type="number"
              min={100}
              max={10000}
              step={100}
              value={timeout}
              onChange={(e) => setTimeout(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        <button
          onClick={handleRead}
          disabled={reading || !connection.port}
          className="w-full py-3 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
        >
          {reading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              กำลังอ่านข้อมูล...
            </>
          ) : (
            <>
              <BookOpen className="w-5 h-5" />
              อ่านข้อมูล
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600">{error}</span>
          </div>
        )}
      </div>

      {/* Results */}
      {readData && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">ผลการอ่าน</h2>
            <span className="text-sm text-slate-500">
              {readData.length} ค่า (Address {registerAddress} - {registerAddress + readData.length - 1})
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Address</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">
                    {isCoilFunction ? 'สถานะ' : 'ค่า (Dec)'}
                  </th>
                  {!isCoilFunction && (
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Hex</th>
                  )}
                  {!isCoilFunction && (
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Binary</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {readData.map((value, index) => (
                  <tr key={index} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <span className="font-mono text-sm text-slate-600">{registerAddress + index}</span>
                    </td>
                    <td className="px-4 py-2">
                      {isCoilFunction ? (
                        <span className={`inline-flex items-center gap-1.5 ${value ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span className={`w-2 h-2 rounded-full ${value ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          {value ? 'ON (1)' : 'OFF (0)'}
                        </span>
                      ) : (
                        <span className="font-mono text-cyan-600 font-medium">{value}</span>
                      )}
                    </td>
                    {!isCoilFunction && (
                      <td className="px-4 py-2">
                        <span className="font-mono text-sm text-slate-500">0x{value.toString(16).toUpperCase().padStart(4, '0')}</span>
                      </td>
                    )}
                    {!isCoilFunction && (
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs text-slate-400">{value.toString(2).padStart(16, '0')}</span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
