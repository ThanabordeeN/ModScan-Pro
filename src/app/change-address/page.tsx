'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, Loader2, CheckCircle2, XCircle, AlertTriangle, Info, Usb, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { useModbus } from '@/context/ModbusContext';
import type { SerialPortInfo } from '@/types/modbus';
import { BAUD_RATES, PARITY_OPTIONS, STOP_BITS_OPTIONS, DATA_BITS_OPTIONS, FUNCTION_CODE_OPTIONS } from '@/types/modbus';

export default function ChangeAddressPage() {
  const { connection, setConnection, scannedDevices } = useModbus();
  
  // Port list
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [portError, setPortError] = useState<string | null>(null);
  
  // Address change settings
  const [currentAddress, setCurrentAddress] = useState(1);
  const [newAddress, setNewAddress] = useState(2);
  const [registerAddress, setRegisterAddress] = useState(0);
  const [functionCode, setFunctionCode] = useState<6 | 16>(6);
  
  // UI state
  const [changing, setChanging] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [useScannedDevice, setUseScannedDevice] = useState(false);

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

  const handleChangeAddress = async () => {
    if (!connection.port) {
      setResult({ success: false, message: 'กรุณาเลือก Serial Port ก่อน' });
      return;
    }

    if (currentAddress === newAddress) {
      setResult({ success: false, message: 'Address ใหม่ต้องแตกต่างจาก Address ปัจจุบัน' });
      return;
    }

    setChanging(true);
    setResult(null);
    setShowConfirm(false);

    try {
      const response = await fetch('/api/modbus/change-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port: connection.port,
          baudRate: connection.baudRate,
          parity: connection.parity,
          stopBits: connection.stopBits,
          dataBits: connection.dataBits,
          currentAddress,
          newAddress,
          registerAddress,
          functionCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: `เปลี่ยน Address สำเร็จ จาก ${data.oldAddress} เป็น ${data.newAddress}`,
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'ไม่สามารถเปลี่ยน Address ได้',
        });
      }
    } catch {
      setResult({
        success: false,
        message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์',
      });
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">เปลี่ยน Address</h1>
          <p className="text-sm text-slate-600">เปลี่ยน Slave ID ของอุปกรณ์ Modbus RTU</p>
        </div>
      </div>

      {/* Connection Settings */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Usb className="w-5 h-5 text-amber-600" />
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              {STOP_BITS_OPTIONS.map((bits) => (
                <option key={bits} value={bits}>{bits}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scanned Devices Selection */}
      {scannedDevices.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-emerald-500/30 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">อุปกรณ์ที่พบจากการสแกน</h2>
            <span className="text-sm text-slate-500">({scannedDevices.length} อุปกรณ์)</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {scannedDevices.map((device) => (
              <button
                key={device.address}
                onClick={() => {
                  setCurrentAddress(device.address);
                  setUseScannedDevice(true);
                }}
                className={`px-4 py-2 rounded-lg font-mono font-bold transition-all ${
                  currentAddress === device.address && useScannedDevice
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ID: {device.address}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">คลิกเพื่อเลือกอุปกรณ์ที่ต้องการเปลี่ยน Address</p>
        </div>
      )}

      {scannedDevices.length === 0 && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium text-blue-800">ยังไม่มีอุปกรณ์จากการสแกน</p>
              <p>คุณสามารถ <Link href="/scan" className="underline hover:text-blue-600">สแกนหาอุปกรณ์ก่อน</Link> หรือระบุ Address ด้วยตนเองด้านล่าง</p>
            </div>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 font-medium">คำเตือน: การดำเนินการนี้จะแก้ไขการตั้งค่าอุปกรณ์</p>
            <p className="text-sm text-amber-600 mt-1">
              โปรดตรวจสอบ Register Address จากคู่มืออุปกรณ์ การตั้งค่าผิดอาจทำให้ไม่สามารถสื่อสารกับอุปกรณ์ได้
            </p>
          </div>
        </div>
      </div>

      {/* Address Change Settings */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">ตั้งค่าการเปลี่ยน Address</h2>

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 mb-6">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-900 mb-2">พารามิเตอร์ที่จำเป็น:</p>
              <ul className="space-y-1 list-disc list-inside text-xs">
                <li><strong>Current Address:</strong> ID ปัจจุบันของอุปกรณ์ (ซื้อใหม่มักเป็น 1)</li>
                <li><strong>New Address:</strong> ID ใหม่ที่ต้องการ (1-247, ห้ามซ้ำกัน)</li>
                <li><strong>Register Address:</strong> ตำแหน่งที่เก็บ ID (ดูจากคู่มือ)</li>
                <li><strong>Function Code:</strong> FC6 สำหรับเขียนทีละ Register, FC16 สำหรับเขียนหลาย Register</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Current Address (ID ปัจจุบัน)
            </label>
            <input
              type="number"
              min={1}
              max={247}
              value={currentAddress}
              onChange={(e) => {
                setCurrentAddress(Math.min(247, Math.max(1, Number(e.target.value))));
                setUseScannedDevice(false);
              }}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              New Address (ID ใหม่)
            </label>
            <input
              type="number"
              min={1}
              max={247}
              value={newAddress}
              onChange={(e) => setNewAddress(Math.min(247, Math.max(1, Number(e.target.value))))}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Register Address
            </label>
            <input
              type="number"
              min={0}
              max={65535}
              value={registerAddress}
              onChange={(e) => setRegisterAddress(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <p className="text-xs text-slate-500 mt-1">ดูจากคู่มืออุปกรณ์ (เช่น 0, 100, 0x0064)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Function Code
            </label>
            <select
              value={functionCode}
              onChange={(e) => setFunctionCode(Number(e.target.value) as 6 | 16)}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              {FUNCTION_CODE_OPTIONS.map((fc) => (
                <option key={fc.value} value={fc.value}>{fc.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 mb-6">
          <p className="text-sm text-slate-600 mb-3">สรุปการดำเนินการ:</p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">เปลี่ยนจาก:</span>
              <span className="px-3 py-1 rounded-lg bg-slate-200 text-slate-900 font-mono font-bold">{currentAddress}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500">เป็น:</span>
              <span className="px-3 py-1 rounded-lg bg-cyan-50 border border-cyan-100 text-cyan-600 font-mono font-bold">{newAddress}</span>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 text-sm">Register: <span className="font-mono text-slate-700">{registerAddress}</span></span>
            <span className="text-slate-500 text-sm">FC: <span className="font-mono text-slate-700">{functionCode}</span></span>
          </div>
        </div>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={changing || !connection.port || currentAddress === newAddress}
            className="w-full py-3 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
          >
            <Settings className="w-5 h-5" />
            เปลี่ยน Address
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600 text-center">
                ยืนยันการเปลี่ยน Address จาก <strong>{currentAddress}</strong> เป็น <strong>{newAddress}</strong>?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleChangeAddress}
                disabled={changing}
                className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium transition-all flex items-center justify-center gap-2"
              >
                {changing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    กำลังเปลี่ยน...
                  </>
                ) : (
                  'ยืนยัน'
                )}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className={`mt-4 p-4 rounded-lg border flex items-center gap-3 ${
            result.success 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            {result.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span className={result.success ? 'text-emerald-700' : 'text-red-700'}>
              {result.message}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
