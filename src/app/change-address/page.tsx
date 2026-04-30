'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, XCircle, AlertTriangle, Info, Activity, Send, Loader2, ArrowLeftRight
} from 'lucide-react';
import ConnectionSettings from '@/components/ConnectionSettings';
import { useModbus } from '@/context/ModbusContext';
import { useLanguage } from '@/context/LanguageContext';
import { modbusAPI, type WriteConfig } from '@/lib/electron-api';
import { parseModbusAddress, h, combineBytes, buildFrameSegments } from '@/lib/modbus-write-utils';

type FCMode = 'fc05' | 'fc06' | 'fc15' | 'fc16';
type Endianness = 'big' | 'little';
type InputMode = 'combined' | 'split';

interface LogEntry {
  id: number;
  ts: string;
  fc: string;
  slave: number;
  addr: number;
  status: string;
}

export default function ChangeAddressPage() {
  const { connection, scannedDevices, isConnectionReady, changeAddrState, setChangeAddrState } = useModbus();
  const { t } = useLanguage();

  const { currentAddress } = changeAddrState;

  // ─── Global inputs ───
  const [slaveId, setSlaveId] = useState<number>(1);
  const [startAddrRaw, setStartAddrRaw] = useState<string>('0');
  const [quantity, setQuantity] = useState<number>(4);

  // ─── FC Tab ───
  const [fc, setFc] = useState<FCMode>('fc06');

  // ─── FC05 ───
  const [coilState, setCoilState] = useState<0 | 1>(1);

  // ─── FC06 ───
  const [val06, setVal06] = useState<number>(0);
  const [inputMode06, setInputMode06] = useState<InputMode>('combined');
  const [hi06, setHi06] = useState<number>(0);
  const [lo06, setLo06] = useState<number>(0);

  // ─── FC15 / FC16 arrays ───
  const [coilArr, setCoilArr] = useState<number[]>([1, 1, 0, 1]);
  const [regArr, setRegArr] = useState<number[]>([100, 200, 300, 400]);
  const [regSplitMode, setRegSplitMode] = useState<InputMode>('combined');
  const [regHiArr, setRegHiArr] = useState<number[]>([0, 0, 0, 0]);
  const [regLoArr, setRegLoArr] = useState<number[]>([100, 200, 300, 400]);

  // ─── Endianness ───
  const [endianness, setEndianness] = useState<Endianness>('big');

  // ─── UI state ───
  const [changing, setChanging] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [, setConnectionStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');

  // Parsed address (live)
  const parsedAddr = useMemo(() => parseModbusAddress(startAddrRaw), [startAddrRaw]);

  // Sync slaveId from global currentAddress
  useEffect(() => {
    if (currentAddress !== '' && currentAddress !== undefined) {
      setSlaveId(Number(currentAddress));
    }
  }, [currentAddress]);

  // Check connection status
  useEffect(() => {
    if (!isConnectionReady || !slaveId) { setConnectionStatus('unknown'); return; }
    let cancelled = false;
    const check = async () => {
      try {
        const res = await modbusAPI.read({
          type: connection.type, port: connection.port, baudRate: connection.baudRate,
          parity: connection.parity, stopBits: connection.stopBits, dataBits: connection.dataBits,
          tcpIp: connection.tcpIp, tcpPort: connection.tcpPort,
          slaveAddress: slaveId, functionCode: 3, registerAddress: 0, quantity: 1, timeout: 500,
        });
        if (!cancelled) setConnectionStatus(res.success ? 'online' : 'offline');
      } catch { if (!cancelled) setConnectionStatus('offline'); }
    };
    check();
    return () => { cancelled = true; };
  }, [slaveId, isConnectionReady, connection]);

  // Rebuild multi arrays when quantity changes
  useEffect(() => {
    const q = Math.max(1, Math.min(64, quantity || 1));
    setCoilArr(prev => {
      const next = [...prev];
      while (next.length < q) next.push(0);
      return next.slice(0, q);
    });
    setRegArr(prev => {
      const next = [...prev];
      while (next.length < q) next.push(0);
      return next.slice(0, q);
    });
    setRegHiArr(prev => {
      const next = [...prev];
      while (next.length < q) next.push(0);
      return next.slice(0, q);
    });
    setRegLoArr(prev => {
      const next = [...prev];
      while (next.length < q) next.push(0);
      return next.slice(0, q);
    });
  }, [quantity, fc]);

  // Sync combined value when split changes (FC06)
  useEffect(() => {
    if (inputMode06 === 'split') {
      const combined = combineBytes(hi06, lo06, endianness);
      setVal06(combined);
    }
  }, [hi06, lo06, inputMode06, endianness]);

  // Sync split values when combined changes (FC06)
  useEffect(() => {
    if (inputMode06 === 'combined') {
      const v = Math.max(0, Math.min(65535, val06));
      if (endianness === 'big') {
        setHi06((v >> 8) & 0xFF);
        setLo06(v & 0xFF);
      } else {
        setHi06(v & 0xFF);
        setLo06((v >> 8) & 0xFF);
      }
    }
  }, [val06, inputMode06, endianness]);

  // Sync FC16 split arrays
  useEffect(() => {
    if (regSplitMode === 'split') {
      setRegArr(regHiArr.map((hi, i) => combineBytes(hi, regLoArr[i], endianness)));
    }
  }, [regHiArr, regLoArr, regSplitMode, endianness]);

  useEffect(() => {
    if (regSplitMode === 'combined') {
      setRegHiArr(regArr.map(v => endianness === 'big' ? (v >> 8) & 0xFF : v & 0xFF));
      setRegLoArr(regArr.map(v => endianness === 'big' ? v & 0xFF : (v >> 8) & 0xFF));
    }
  }, [regArr, regSplitMode, endianness]);

  const toggleCoil = (index: number) => {
    setCoilArr(prev => {
      const next = [...prev];
      next[index] = next[index] ? 0 : 1;
      return next;
    });
  };

  const updateReg = (index: number, value: number) => {
    setRegArr(prev => {
      const next = [...prev];
      next[index] = Math.max(0, Math.min(65535, value || 0));
      return next;
    });
  };

  const updateRegHi = (index: number, value: number) => {
    setRegHiArr(prev => {
      const next = [...prev];
      next[index] = Math.max(0, Math.min(255, value || 0));
      return next;
    });
  };

  const updateRegLo = (index: number, value: number) => {
    setRegLoArr(prev => {
      const next = [...prev];
      next[index] = Math.max(0, Math.min(255, value || 0));
      return next;
    });
  };

  // ─── Frame segments for colored display ───
  const frameSegments = useMemo(() => {
    const slave = Math.max(1, Math.min(247, slaveId || 1));
    const addr = Math.max(0, Math.min(65535, parsedAddr.raw));
    return buildFrameSegments(fc, slave, addr, val06, coilState, coilArr, regArr, endianness);
  }, [fc, slaveId, parsedAddr.raw, val06, coilState, coilArr, regArr, endianness]);

  // ─── Execute write ───
  const handleSend = useCallback(async () => {
    if (!isConnectionReady) {
      setResult({ success: false, message: t('change_id_err_port') });
      return;
    }

    setChanging(true);
    setResult(null);

    const slave = Math.max(1, Math.min(247, slaveId || 1));
    const addr = Math.max(0, Math.min(65535, parsedAddr.raw));
    const ts = new Date().toLocaleTimeString();

    const reqBody = {
      type: connection.type, port: connection.port, baudRate: connection.baudRate,
      parity: connection.parity, stopBits: connection.stopBits, dataBits: connection.dataBits,
      tcpIp: connection.tcpIp, tcpPort: connection.tcpPort,
      slaveAddress: slave, functionCode: fc === 'fc05' ? 5 : fc === 'fc06' ? 6 : fc === 'fc15' ? 15 : 16,
      address: addr, timeout: 1000,
    } as WriteConfig;

    if (fc === 'fc05') reqBody.coilValue = coilState === 1;
    if (fc === 'fc06') reqBody.value = Math.max(0, Math.min(65535, val06 || 0));
    if (fc === 'fc15') reqBody.coilValues = coilArr.map(v => v === 1);
    if (fc === 'fc16') reqBody.values = regArr;

    try {
      const data = await modbusAPI.write(reqBody);

      const entry: LogEntry = {
        id: Date.now(),
        ts,
        fc: fc.toUpperCase(),
        slave,
        addr,
        status: data.success ? 'OK' : 'ERR',
      };
      setLogs(prev => [entry, ...prev].slice(0, 50));

      if (data.success) {
        const d = data as typeof data & { message?: string };
        setResult({ success: true, message: d.message || t('change_id_success') });
      } else {
        setResult({ success: false, message: data.error || t('change_id_failed') });
      }
    } catch {
      setLogs(prev => [{ id: Date.now(), ts, fc: fc.toUpperCase(), slave, addr, status: 'ERR' }, ...prev].slice(0, 50));
      setResult({ success: false, message: t('err_connect_failed') });
    } finally {
      setChanging(false);
    }
  }, [fc, slaveId, parsedAddr.raw, coilState, val06, coilArr, regArr, connection, isConnectionReady, t]);

  const tabActive = (mode: FCMode) =>
    fc === mode
      ? 'border-[2px] border-[#185FA5] dark:border-blue-500 bg-[#E6F1FB] dark:bg-blue-900/30'
      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50';

  const tabTextPrimary = (mode: FCMode) => fc === mode ? 'text-[#0C447C] dark:text-blue-300' : 'text-slate-900 dark:text-slate-100';
  const tabTextSecondary = (mode: FCMode) => fc === mode ? 'text-[#185FA5] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('change_id_title')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('change_id_subtitle')}</p>
        </div>
      </div>

      <ConnectionSettings disabled={changing} />

      {/* Warning */}
      <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">{t('change_id_warning_title')}</p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">{t('change_id_warning_desc')}</p>
          </div>
        </div>
      </div>

      {/* ─── Scanned Devices ─── */}
      {scannedDevices.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('change_id_scanned_title')}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">({scannedDevices.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {scannedDevices.map((device) => (
              <button
                key={device.address}
                onClick={() => {
                  setSlaveId(device.address);
                  setChangeAddrState(prev => ({ ...prev, currentAddress: device.address, useScannedDevice: true }));
                }}
                className={`px-3 py-1.5 rounded-lg font-mono text-sm transition-all ${
                  slaveId === device.address
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                ID {device.address}
              </button>
            ))}
          </div>
        </div>
      )}

      {scannedDevices.length === 0 && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium text-blue-800 dark:text-blue-300">{t('change_id_no_scanned')}</p>
              <p>{t('change_id_scan_hint')} <Link href="/scan" className="underline hover:text-blue-600 dark:hover:text-blue-400">{t('change_id_scan_link')}</Link></p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Layout: Left Tabs + Right Panel ─── */}
      <div className="flex gap-4">
        {/* ─── Left: FC Tabs (Vertical) ─── */}
        <div className="flex flex-col gap-2 w-44 flex-shrink-0">
          {[
            { mode: 'fc05' as FCMode, code: 'FC05', desc: 'Write single coil' },
            { mode: 'fc06' as FCMode, code: 'FC06', desc: 'Write single register' },
            { mode: 'fc15' as FCMode, code: 'FC15', desc: 'Write multiple coils' },
            { mode: 'fc16' as FCMode, code: 'FC16', desc: 'Write multiple registers' },
          ].map((tab) => (
            <button
              key={tab.mode}
              onClick={() => setFc(tab.mode)}
              className={`cursor-pointer rounded-xl py-3 px-3 text-left transition-all ${tabActive(tab.mode)}`}
            >
              <div className={`text-base font-medium ${tabTextPrimary(tab.mode)}`}>{tab.code}</div>
              <div className={`text-[10px] mt-0.5 leading-tight ${tabTextSecondary(tab.mode)}`}>{tab.desc}</div>
            </button>
          ))}
        </div>

        {/* ─── Right: Main Panel ─── */}
        <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
          {/* ─── Endianness Toggle (inside panel header) ─── */}
          <div className="flex items-center justify-end gap-2 mb-4">
            <span className="text-xs text-slate-500 dark:text-slate-400">Endianness:</span>
            <button
              onClick={() => setEndianness(endianness === 'big' ? 'little' : 'big')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
            >
              <ArrowLeftRight className="w-3 h-3" />
              {endianness === 'big' ? 'Big-Endian (Standard)' : 'Little-Endian (Swapped)'}
            </button>
          </div>

        {/* Common fields */}
        <div className="grid grid-cols-[80px_1fr_1fr] gap-3 mb-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Slave ID</label>
            <input
              type="number" min={1} max={247} value={slaveId}
              onChange={(e) => setSlaveId(Math.max(1, Math.min(247, Number(e.target.value) || 1)))}
              className="bg-white dark:bg-slate-800 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Start address</label>
            <input
              type="text" value={startAddrRaw}
              onChange={(e) => setStartAddrRaw(e.target.value)}
              placeholder="0, 2000, 0x07D0, 40001, 42001..."
              className="bg-white dark:bg-slate-800 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {parsedAddr.notation} → frame address = <span className="font-mono text-slate-600 dark:text-slate-400">{parsedAddr.raw}</span>
            </p>
          </div>
          <div className={fc === 'fc05' || fc === 'fc06' ? 'invisible' : ''}>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Quantity</label>
            <input
              type="number" min={1} max={64} value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(64, Number(e.target.value) || 1)))}
              className="bg-white dark:bg-slate-800 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40"
            />
          </div>
        </div>

        {/* ─── FC05 Value ─── */}
        {fc === 'fc05' && (
          <div className="mb-4">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">Coil state</label>
            <div className="flex gap-3">
              <button
                onClick={() => setCoilState(1)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  coilState === 1
                    ? 'border-2 border-[#185FA5] dark:border-blue-500 bg-[#E6F1FB] dark:bg-blue-900/30 text-[#0C447C] dark:text-blue-300'
                    : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                ON
              </button>
              <button
                onClick={() => setCoilState(0)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  coilState === 0
                    ? 'border-2 border-[#185FA5] dark:border-blue-500 bg-[#E6F1FB] dark:bg-blue-900/30 text-[#0C447C] dark:text-blue-300'
                    : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                OFF
              </button>
            </div>
          </div>
        )}

        {/* ─── FC06 Value ─── */}
        {fc === 'fc06' && (
          <div className="mb-4 space-y-3">
            {/* Input Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Input mode:</span>
              <button
                onClick={() => setInputMode06('combined')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  inputMode06 === 'combined'
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Combined (0-65535)
              </button>
              <button
                onClick={() => setInputMode06('split')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  inputMode06 === 'split'
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Split High/Low Byte
              </button>
            </div>

            {inputMode06 === 'combined' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Value (0–65535)</label>
                  <input
                    type="number" min={0} max={65535} value={val06}
                    onChange={(e) => setVal06(Math.max(0, Math.min(65535, Number(e.target.value) || 0)))}
                    className="bg-white dark:bg-slate-800 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Preview</label>
                  <div className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-mono text-sm">
                    0x{h(val06, 4)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">High Byte (0-255)</label>
                  <input
                    type="number" min={0} max={255} value={hi06}
                    onChange={(e) => setHi06(Math.max(0, Math.min(255, Number(e.target.value) || 0)))}
                    className={`bg-white dark:bg-slate-800 w-full px-3 py-2 rounded-lg border text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40 ${
                      hi06 > 255 ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                  {hi06 > 255 && <p className="text-[10px] text-red-500 dark:text-red-400 mt-1">Must be 0-255</p>}
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Low Byte (0-255)</label>
                  <input
                    type="number" min={0} max={255} value={lo06}
                    onChange={(e) => setLo06(Math.max(0, Math.min(255, Number(e.target.value) || 0)))}
                    className={`bg-white dark:bg-slate-800 w-full px-3 py-2 rounded-lg border text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40 ${
                      lo06 > 255 ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                  {lo06 > 255 && <p className="text-[10px] text-red-500 dark:text-red-400 mt-1">Must be 0-255</p>}
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Combined</label>
                  <div className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-mono text-sm">
                    {endianness === 'big' ? `${h(hi06)} ${h(lo06)}` : `${h(lo06)} ${h(hi06)}`} → 0x{h(val06, 4)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── FC15 Value ─── */}
        {fc === 'fc15' && (
          <div className="mb-4">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">Coil values (tap to toggle)</label>
            <div className="flex flex-wrap gap-2">
              {coilArr.map((v, i) => (
                <button
                  key={i}
                  onClick={() => toggleCoil(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    v
                      ? 'border-2 border-[#185FA5] dark:border-blue-500 bg-[#E6F1FB] dark:bg-blue-900/30 text-[#0C447C] dark:text-blue-300'
                      : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {parsedAddr.raw + i}: {v ? 'ON' : 'OFF'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── FC16 Value ─── */}
        {fc === 'fc16' && (
          <div className="mb-4 space-y-3">
            {/* Input Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Input mode:</span>
              <button
                onClick={() => setRegSplitMode('combined')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  regSplitMode === 'combined'
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Combined (0-65535)
              </button>
              <button
                onClick={() => setRegSplitMode('split')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  regSplitMode === 'split'
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Split High/Low Byte
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {regArr.map((v, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono min-w-[60px]">Addr {parsedAddr.raw + i}</span>
                  {regSplitMode === 'combined' ? (
                    <>
                      <input
                        type="number" min={0} max={65535} value={v}
                        onChange={(e) => updateReg(i, Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40"
                      />
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-mono w-16">0x{h(v, 4)}</span>
                    </>
                  ) : (
                    <>
                      <input
                        type="number" min={0} max={255} value={regHiArr[i]}
                        onChange={(e) => updateRegHi(i, Number(e.target.value))}
                        className={`bg-white dark:bg-slate-800 w-20 px-2 py-2 rounded-lg border text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40 text-xs ${
                          regHiArr[i] > 255 ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600'
                        }`}
                        placeholder="Hi"
                      />
                      <input
                        type="number" min={0} max={255} value={regLoArr[i]}
                        onChange={(e) => updateRegLo(i, Number(e.target.value))}
                        className={`bg-white dark:bg-slate-800 w-20 px-2 py-2 rounded-lg border text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40 text-xs ${
                          regLoArr[i] > 255 ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600'
                        }`}
                        placeholder="Lo"
                      />
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-mono w-20">
                        0x{h(regArr[i], 4)}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Colored Frame Monitor ─── */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Raw Frame Monitor (hex)</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">
              {endianness === 'big' ? 'Big-Endian' : 'Little-Endian'} | CRC-16
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {frameSegments.map((seg, idx) => (
              <div key={idx} className="flex items-center">
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-mono ${seg.color}`}>
                  <span className="text-[9px] opacity-60 font-sans">{seg.label}</span>
                  <span>{seg.bytes.map(b => h(b)).join(' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Send Button ─── */}
        <button
          onClick={handleSend}
          disabled={changing || !isConnectionReady}
          className="w-full py-3 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {changing ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
          ) : (
            <><Send className="w-4 h-4" />Send write</>
          )}
        </button>

        {/* ─── Result ─── */}
        {result && (
          <div className={`mt-4 p-3 rounded-lg border flex items-center gap-3 ${
            result.success ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            {result.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            )}
            <span className={result.success ? 'text-emerald-700 dark:text-emerald-300 text-sm' : 'text-red-700 dark:text-red-300 text-sm'}>
              {result.message}
            </span>
          </div>
        )}
      </div>
      </div>

      {/* ─── Log Panel ─── */}
      {logs.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Log</div>
          <div className="flex flex-col gap-2">
            {logs.map((entry) => (
              <div
                key={entry.id}
                className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 text-xs"
              >
                <span className="text-slate-400 dark:text-slate-500">{entry.ts}</span>
                <code className="font-mono text-slate-700 dark:text-slate-300">
                  {entry.fc}  Slave {entry.slave}  Addr {entry.addr}
                </code>
                <span className={entry.status === 'OK' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                  {entry.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}