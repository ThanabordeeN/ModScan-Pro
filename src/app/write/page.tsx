'use client';

import { useState, useEffect } from 'react';
import { PenLine, Loader2, XCircle, RefreshCw, Usb, AlertCircle, CheckCircle2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useModbus } from '@/context/ModbusContext';
import type { SerialPortInfo } from '@/types/modbus';
import { BAUD_RATES, PARITY_OPTIONS, STOP_BITS_OPTIONS, DATA_BITS_OPTIONS } from '@/types/modbus';

const WRITE_FUNCTION_CODES = [
  { value: 5, label: 'FC05 - Write Single Coil', description: 'เขียน Coil เดียว (ON/OFF)', type: 'single_coil' },
  { value: 6, label: 'FC06 - Write Single Register', description: 'เขียน Register เดียว (0-65535)', type: 'single_register' },
  { value: 15, label: 'FC15 - Write Multiple Coils', description: 'เขียนหลาย Coils พร้อมกัน', type: 'multiple_coils' },
  { value: 16, label: 'FC16 - Write Multiple Registers', description: 'เขียนหลาย Registers พร้อมกัน', type: 'multiple_registers' },
];

export default function WritePage() {
  const { connection, setConnection, scannedDevices } = useModbus();
  
  // Port list
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [portError, setPortError] = useState<string | null>(null);
  
  // Write settings
  const [slaveAddress, setSlaveAddress] = useState(1);
  const [functionCode, setFunctionCode] = useState<5 | 6 | 15 | 16>(6);
  const [address, setAddress] = useState(0);
  const [timeout, setTimeout] = useState(1000);
  
  // Values for different FCs
  const [singleCoilValue, setSingleCoilValue] = useState(false);
  const [singleRegisterValue, setSingleRegisterValue] = useState(0);
  const [multipleCoilValues, setMultipleCoilValues] = useState<boolean[]>([false]);
  const [multipleRegisterValues, setMultipleRegisterValues] = useState<number[]>([0]);
  
  // Results
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // Reset values and messages when function code changes
  useEffect(() => {
    setSingleCoilValue(false);
    setSingleRegisterValue(0);
    setMultipleCoilValues([false]);
    setMultipleRegisterValues([0]);
    setError(null);
    setSuccess(null);
  }, [functionCode]);

  const handleWrite = async () => {
    if (!connection.port) {
      setError('กรุณาเลือก Serial Port ก่อน');
      return;
    }

    setWriting(true);
    setError(null);
    setSuccess(null);

    const requestBody: Record<string, unknown> = {
      port: connection.port,
      baudRate: connection.baudRate,
      parity: connection.parity,
      stopBits: connection.stopBits,
      dataBits: connection.dataBits,
      slaveAddress,
      functionCode,
      address,
      timeout,
    };

    // Add FC-specific values
    switch (functionCode) {
      case 5:
        requestBody.coilValue = singleCoilValue;
        break;
      case 6:
        requestBody.value = singleRegisterValue;
        break;
      case 15:
        requestBody.coilValues = multipleCoilValues;
        break;
      case 16:
        requestBody.values = multipleRegisterValues;
        break;
    }

    try {
      const response = await fetch('/api/modbus/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'เขียนข้อมูลสำเร็จ!');
      } else {
        setError(data.error || 'การเขียนข้อมูลล้มเหลว');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
    } finally {
      setWriting(false);
    }
  };

  const addMultipleValue = () => {
    if (functionCode === 15) {
      setMultipleCoilValues([...multipleCoilValues, false]);
    } else if (functionCode === 16) {
      setMultipleRegisterValues([...multipleRegisterValues, 0]);
    }
  };

  const removeMultipleValue = (index: number) => {
    if (functionCode === 15) {
      setMultipleCoilValues(multipleCoilValues.filter((_, i) => i !== index));
    } else if (functionCode === 16) {
      setMultipleRegisterValues(multipleRegisterValues.filter((_, i) => i !== index));
    }
  };

  const currentFCInfo = WRITE_FUNCTION_CODES.find(fc => fc.value === functionCode);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700">
          <PenLine className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">เขียนข้อมูล</h1>
          <p className="text-sm text-slate-600">เขียนค่า Coils และ Registers ไปยังอุปกรณ์ Modbus</p>
        </div>
      </div>

      {/* Warning */}
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 font-medium">คำเตือน: การเขียนข้อมูลจะเปลี่ยนแปลงค่าในอุปกรณ์</p>
            <p className="text-sm text-amber-600 mt-1">โปรดตรวจสอบ Address และค่าที่ต้องการเขียนให้ถูกต้องก่อนกดยืนยัน</p>
          </div>
        </div>
      </div>

      {/* Connection Settings */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Usb className="w-5 h-5 text-purple-700" />
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
        <div className="bg-white rounded-xl p-4 border border-purple-500/30 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-slate-900">เลือกจากอุปกรณ์ที่สแกนได้:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {scannedDevices.map((device) => (
              <button
                key={device.address}
                onClick={() => setSlaveAddress(device.address)}
                className={`px-3 py-1.5 rounded-lg font-mono text-sm transition-all ${
                  slaveAddress === device.address
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ID: {device.address}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Write Settings */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">ตั้งค่าการเขียน</h2>
        
        {/* Function Code Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-600 mb-2">Function Code</label>
          <select
            value={functionCode.toString()}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && [5, 6, 15, 16].includes(val)) {
                setFunctionCode(val as 5 | 6 | 15 | 16);
              }
            }}
            className="w-full px-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            {WRITE_FUNCTION_CODES.map((fc) => (
              <option key={fc.value} value={fc.value.toString()}>
                {fc.label} - {fc.description}
              </option>
            ))}
          </select>
        </div>

        {/* Common Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Slave Address</label>
            <input
              type="number"
              min={1}
              max={247}
              value={slaveAddress}
              onChange={(e) => setSlaveAddress(Math.min(247, Math.max(1, Number(e.target.value))))}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              {functionCode === 5 || functionCode === 15 ? 'Coil Address' : 'Register Address'}
            </label>
            <input
              type="number"
              min={0}
              max={65535}
              value={address}
              onChange={(e) => setAddress(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>

        {/* Dynamic Value Input based on FC */}
        <div 
          key={functionCode} 
          className="p-4 rounded-lg bg-slate-50 border border-slate-200 mb-6 transition-all duration-300"
        >
          <h3 className="text-sm font-medium text-purple-700 mb-4">
            {currentFCInfo?.description}
          </h3>

          {/* FC05 - Single Coil */}
          {functionCode === 5 && (
            <div className="flex items-center gap-4">
              <span className="text-slate-600">ค่า Coil:</span>
              <button
                onClick={() => setSingleCoilValue(!singleCoilValue)}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  singleCoilValue
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {singleCoilValue ? 'ON (1)' : 'OFF (0)'}
              </button>
            </div>
          )}

          {/* FC06 - Single Register */}
          {functionCode === 6 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">ค่า (Decimal)</label>
                <input
                  type="number"
                  min={0}
                  max={65535}
                  value={singleRegisterValue}
                  onChange={(e) => setSingleRegisterValue(Math.min(65535, Math.max(0, Number(e.target.value))))}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Hex</label>
                <div className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-300 text-slate-600 font-mono">
                  0x{singleRegisterValue.toString(16).toUpperCase().padStart(4, '0')}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Binary</label>
                <div className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-300 text-slate-600 font-mono text-xs overflow-hidden">
                  {singleRegisterValue.toString(2).padStart(16, '0')}
                </div>
              </div>
            </div>
          )}

          {/* FC15 - Multiple Coils */}
          {functionCode === 15 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-600">Coils ({multipleCoilValues.length} ค่า)</span>
                <button
                  onClick={addMultipleValue}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors border border-purple-200"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่ม
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {multipleCoilValues.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newVals = [...multipleCoilValues];
                        newVals[idx] = !newVals[idx];
                        setMultipleCoilValues(newVals);
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg font-mono text-sm transition-all ${
                        val ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      [{address + idx}] {val ? 'ON' : 'OFF'}
                    </button>
                    {multipleCoilValues.length > 1 && (
                      <button
                        onClick={() => removeMultipleValue(idx)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FC16 - Multiple Registers */}
          {functionCode === 16 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-600">Registers ({multipleRegisterValues.length} ค่า)</span>
                <button
                  onClick={addMultipleValue}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors border border-purple-200"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่ม
                </button>
              </div>
              <div className="space-y-2">
                {multipleRegisterValues.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono text-sm w-16">[{address + idx}]</span>
                    <input
                      type="number"
                      min={0}
                      max={65535}
                      value={val}
                      onChange={(e) => {
                        const newVals = [...multipleRegisterValues];
                        newVals[idx] = Math.min(65535, Math.max(0, Number(e.target.value)));
                        setMultipleRegisterValues(newVals);
                      }}
                      className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono"
                    />
                    <span className="text-slate-500 font-mono text-xs w-16">
                      0x{val.toString(16).toUpperCase().padStart(4, '0')}
                    </span>
                    {multipleRegisterValues.length > 1 && (
                      <button
                        onClick={() => removeMultipleValue(idx)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleWrite}
          disabled={writing || !connection.port}
          className="w-full py-3 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
        >
          {writing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              กำลังเขียนข้อมูล...
            </>
          ) : (
            <>
              <PenLine className="w-5 h-5" />
              เขียนข้อมูล
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600">{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-emerald-600">{success}</span>
          </div>
        )}
      </div>
    </div>
  );
}
