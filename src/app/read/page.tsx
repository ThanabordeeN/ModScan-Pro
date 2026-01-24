'use client';

import { useState, useEffect, useRef } from 'react';
import { BookOpen, Loader2, XCircle, RefreshCw, Usb, AlertCircle, CheckCircle2, Play, Square, Timer, Trash2, History, Plus, Minus } from 'lucide-react';
import { useModbus } from '@/context/ModbusContext';
import { useLanguage } from '@/context/LanguageContext';
import type { SerialPortInfo } from '@/types/modbus';
import { BAUD_RATES, PARITY_OPTIONS, STOP_BITS_OPTIONS, DATA_BITS_OPTIONS } from '@/types/modbus';

interface LogEntry {
  id: number;
  timestamp: Date;
  address: number;
  values: number[];
  functionCode: number;
}

interface ReadRange {
  id: string;
  slaveAddress: number;
  functionCode: 1 | 2 | 3 | 4;
  registerAddress: number;
  quantity: number;
}



export default function ReadPage() {
  const { connection, setConnection, scannedDevices } = useModbus();
  const { t } = useLanguage();

  const READ_FUNCTION_CODES = [
    { value: 1, label: 'FC01 - Read Coils', description: t('read_coils_desc') || 'Read Coil Status (0x)' },
    { value: 2, label: 'FC02 - Read Discrete Inputs', description: t('read_discrete_desc') || 'Read Discrete Input (1x)' },
    { value: 3, label: 'FC03 - Read Holding Registers', description: t('read_holding_desc') || 'Read Holding Register (4x)' },
    { value: 4, label: 'FC04 - Read Input Registers', description: t('read_input_desc') || 'Read Input Register (3x)' },
  ];
  
  // Port list
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [portError, setPortError] = useState<string | null>(null);
  
  // Read settings
  const [ranges, setRanges] = useState<ReadRange[]>([
    { id: 'default', slaveAddress: 1, functionCode: 3, registerAddress: 0, quantity: 10 }
  ]);
  const [timeout, setTimeout] = useState(1000);
  
  // Auto Read settings
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(1000);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isReadingRef = useRef(false);
  
  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Results
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readData, setReadData] = useState<{rangeId: string, data: number[]}[] | null>(null);

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

  // Reset data and error when ranges change
  useEffect(() => {
    setReadData(null);
    setError(null);
    stopAutoRefresh();
  }, [ranges]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => stopAutoRefresh();
  }, []);

  const handleRead = async () => {
    if (!connection.port) {
      setError(t('err_select_port'));
      return;
    }

    if (ranges.length === 0) {
      setError('กรุณาเพิ่มช่วงการอ่านอย่างน้อย 1 ช่วง');
      return;
    }

    if (isReadingRef.current) return;
    
    isReadingRef.current = true;
    setReading(true);
    
    if (!isAutoRefresh) {
      setError(null);
      setReadData(null);
    }

    try {
      const requests = ranges.map(range => ({
        slaveAddress: range.slaveAddress,
        functionCode: range.functionCode,
        registerAddress: range.registerAddress,
        quantity: range.quantity
      }));

      const response = await fetch('/api/modbus/read-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port: connection.port,
          baudRate: connection.baudRate,
          parity: connection.parity,
          stopBits: connection.stopBits,
          dataBits: connection.dataBits,
          requests,
          timeout,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Map results back to ranges
        const mappedData = data.results.map((res: any, idx: number) => ({
          rangeId: ranges[idx].id,
          data: res.success ? res.data : [] // Handle potential error per range
        }));

        setReadData(mappedData);
        const now = new Date();
        setLastUpdated(now);
        setError(null); 

        // Add to log (Flattened for now, or per range?)
        // Let's create multiple log entries or one combined? 
        // For simplicity, let's add one entry per range that got data
        const newLogs: LogEntry[] = [];
        data.results.forEach((res: any, idx: number) => {
          if (res.success && res.data.length > 0) {
            newLogs.push({
              id: Date.now() + idx, // offset id slightly
              timestamp: now,
              address: ranges[idx].registerAddress,
              values: res.data,
              functionCode: ranges[idx].functionCode
            });
          }
        });
        
        setLogs(prevLogs => {
          const combined = [...newLogs, ...prevLogs];
          return combined.slice(0, 200); // Increased limit
        });

      } else {
        setError(t('common_error')); // Simplified or can add specific translation
      }
    } catch {
      setError(t('err_connect_failed'));
    } finally {
      setReading(false);
      isReadingRef.current = false;
    }
  };

  const toggleAutoRefresh = () => {
    if (isAutoRefresh) {
      stopAutoRefresh();
    } else {
      startAutoRefresh();
    }
  };

  const startAutoRefresh = () => {
    if (!connection.port) {
      setError('กรุณาเลือก Serial Port ก่อน');
      return;
    }
    setIsAutoRefresh(true);
    handleRead(); 
  };

  const stopAutoRefresh = () => {
    setIsAutoRefresh(false);
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (isAutoRefresh) {
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
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [isAutoRefresh, refreshInterval, connection, ranges, timeout]);

  const addRange = () => {
    setRanges([...ranges, { 
      id: Date.now().toString(), 
      slaveAddress: 1, 
      functionCode: 3, 
      registerAddress: 0, 
      quantity: 10 
    }]);
  };

  const removeRange = (id: string) => {
    if (ranges.length > 1) {
      setRanges(ranges.filter(r => r.id !== id));
    }
  };

  const updateRange = (id: string, field: keyof ReadRange, value: any) => {
    setRanges(ranges.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('read_title')}</h1>
          <p className="text-sm text-slate-600">{t('read_subtitle')}</p>
        </div>
      </div>

      {/* Connection Settings */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Usb className="w-5 h-5 text-emerald-700" />
            {t('read_connection_settings')}
          </h2>
          <button
            onClick={fetchPorts}
            disabled={loadingPorts || isAutoRefresh}
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
          {/* ... Port Selections (Existing) ... */}
           <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-slate-600 mb-2">{t('common_port')}</label>
            <select
              value={connection.port}
              onChange={(e) => setConnection({ ...connection, port: e.target.value })}
              disabled={isAutoRefresh}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">{t('common_select_port')}</option>
              {ports.map((port) => (
                <option key={port.path} value={port.path}>{port.path}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">{t('common_rate')}</label>
            <select
              value={connection.baudRate}
              onChange={(e) => setConnection({ ...connection, baudRate: Number(e.target.value) })}
              disabled={isAutoRefresh}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:bg-slate-50 disabled:text-slate-500"
            >
              {BAUD_RATES.map((rate) => (
                <option key={rate} value={rate}>{rate}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">{t('common_data_bits')}</label>
            <select
              value={connection.dataBits}
              onChange={(e) => setConnection({ ...connection, dataBits: Number(e.target.value) as 7 | 8 })}
              disabled={isAutoRefresh}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:bg-slate-50 disabled:text-slate-500"
            >
              {DATA_BITS_OPTIONS.map((bits) => (
                <option key={bits} value={bits}>{bits}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">{t('common_parity')}</label>
            <select
              value={connection.parity}
              onChange={(e) => setConnection({ ...connection, parity: e.target.value as 'none' | 'even' | 'odd' })}
              disabled={isAutoRefresh}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:bg-slate-50 disabled:text-slate-500"
            >
              {PARITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">{t('common_stop_bits')}</label>
            <select
              value={connection.stopBits}
              onChange={(e) => setConnection({ ...connection, stopBits: Number(e.target.value) as 1 | 2 })}
              disabled={isAutoRefresh}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:bg-slate-50 disabled:text-slate-500"
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
            <span className="text-sm font-medium text-slate-900">{t('read_add_from_scan')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {scannedDevices.map((device) => (
              <button
                key={device.address}
                onClick={() => setRanges([...ranges, {
                  id: Date.now().toString(),
                  slaveAddress: device.address,
                  functionCode: 3,
                  registerAddress: 0,
                  quantity: 10
                }])}
                disabled={isAutoRefresh}
                className="px-3 py-1.5 rounded-lg font-mono text-sm bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-transparent transition-all flex items-center gap-2"
              >
                <Plus className="w-3 h-3" />
                ID: {device.address}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Read Ranges Configuration */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
           <h2 className="text-lg font-semibold text-slate-900">{t('read_ranges')}</h2>
           <button
             onClick={addRange}
             disabled={isAutoRefresh}
             className="text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
           >
             <Plus className="w-4 h-4" />
             {t('read_add_range')}
           </button>
        </div>
        
        <div className="space-y-4">
          {ranges.map((range, index) => (
            <div key={range.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200 relative group">
               <div className="absolute -left-2 top-4 w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 border border-white shadow-sm">
                 {index + 1}
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('read_function_code')}</label>
                    <select
                      value={range.functionCode}
                      onChange={(e) => updateRange(range.id, 'functionCode', Number(e.target.value))}
                      disabled={isAutoRefresh}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {READ_FUNCTION_CODES.map((fc) => (
                        <option key={fc.value} value={fc.value}>{fc.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('read_slave_id')}</label>
                    <input
                      type="number"
                      min={1}
                      max={247}
                      value={range.slaveAddress}
                      onChange={(e) => updateRange(range.id, 'slaveAddress', Number(e.target.value))}
                      disabled={isAutoRefresh}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('read_start_address')}</label>
                    <input
                      type="number"
                      min={0}
                      max={65535}
                      value={range.registerAddress}
                      onChange={(e) => updateRange(range.id, 'registerAddress', Number(e.target.value))}
                      disabled={isAutoRefresh}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('read_quantity')}</label>
                    <input
                      type="number"
                      min={1}
                      max={125}
                      value={range.quantity}
                      onChange={(e) => updateRange(range.id, 'quantity', Number(e.target.value))}
                      disabled={isAutoRefresh}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      onClick={() => removeRange(range.id)}
                      disabled={ranges.length === 1 || isAutoRefresh}
                      className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
               </div>
            </div>
          ))}
        </div>

        {/* Global Settings for Read */}
        <div className="mt-6 pt-4 border-t border-slate-100">
           <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:w-32">
                <label className="block text-sm font-medium text-slate-600 mb-2">{t('read_timeout')}</label>
                <input
                  type="number"
                  min={100}
                  max={10000}
                  step={100}
                  value={timeout}
                  onChange={(e) => setTimeout(Number(e.target.value))}
                  disabled={isAutoRefresh}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

               <div className="flex-1 w-full md:w-auto">
                <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  {t('read_interval')}
                </label>
                <input
                  type="number"
                  min={100}
                  max={60000}
                  step={100}
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  disabled={isAutoRefresh}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

               <div className="flex gap-2 w-full md:w-auto">
                 <button
                  onClick={handleRead}
                  disabled={reading || !connection.port || isAutoRefresh}
                  className="flex-1 md:flex-none py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 text-slate-700 font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {reading && !isAutoRefresh ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BookOpen className="w-4 h-4" />
                  )}
                  {t('read_once')}
                </button>

                <button
                  onClick={toggleAutoRefresh}
                  disabled={!connection.port && !isAutoRefresh}
                  className={`flex-1 md:flex-none py-2 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
                    isAutoRefresh 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-300 disabled:cursor-not-allowed'
                  }`}
                >
                  {isAutoRefresh ? (
                    <>
                      <Square className="w-4 h-4 fill-current" />
                      {t('read_stop_loop')}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      {t('read_start_loop')}
                    </>
                  )}
                </button>
              </div>
           </div>
        </div>
        
         {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600">{error}</span>
          </div>
        )}
      </div>

      {/* Results */}
      {readData && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">{t('read_results')}</h2>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                 {readData.reduce((acc, curr) => acc + curr.data.length, 0)} {t('read_total_values')}
              </span>
            </div>
            {lastUpdated && isAutoRefresh && (
               <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  {t('read_updated')}: {lastUpdated.toLocaleTimeString()}
               </div>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 mb-8 max-h-[500px] overflow-y-auto">
             <table className="w-full">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Address</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">ค่า (Dec)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Hex</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Binary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {readData.map((rangeResult, idx) => {
                    const rangeConfig = ranges.find(r => r.id === rangeResult.rangeId);
                    if (!rangeConfig || rangeResult.data.length === 0) return null;
                    const isCoil = rangeConfig.functionCode === 1 || rangeConfig.functionCode === 2;
                    
                    return rangeResult.data.map((value, valIdx) => (
                      <tr key={`${rangeResult.rangeId}-${valIdx}`} className="bg-white hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2">
                          <span className="font-mono text-sm text-slate-600">{rangeConfig.registerAddress + valIdx}</span>
                          <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-1 rounded">ID:{rangeConfig.slaveAddress}</span>
                        </td>
                         <td className="px-4 py-2">
                          {isCoil ? (
                            <span className={`inline-flex items-center gap-1.5 ${value ? 'text-emerald-600' : 'text-slate-400'}`}>
                              <span className={`w-2 h-2 rounded-full ${value ? 'bg-emerald-500' : 'bg-slate-300'} transition-colors duration-300`} />
                              {value ? 'ON (1)' : 'OFF (0)'}
                            </span>
                          ) : (
                            <span className="font-mono text-cyan-600 font-medium">{value}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                            {!isCoil && <span className="font-mono text-sm text-slate-500">0x{value.toString(16).toUpperCase().padStart(4, '0')}</span>}
                        </td>
                        <td className="px-4 py-2">
                            {!isCoil && <span className="font-mono text-xs text-slate-400">{value.toString(2).padStart(16, '0')}</span>}
                        </td>
                      </tr>
                    ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Log Table (Same as before) */}
      {logs.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
               <History className="w-5 h-5 text-slate-500" />
               {t('read_logs')}
            </h2>
             <button
                onClick={() => setLogs([])}
                className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
             >
                <Trash2 className="w-4 h-4" />
                {t('read_clear_logs')}
             </button>
          </div>
          
           <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[400px]">
            <table className="w-full">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr>
                   <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 whitespace-nowrap">เวลา</th>
                   <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 whitespace-nowrap">Address</th>
                   <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 whitespace-nowrap">FC</th>
                   <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 whitespace-nowrap w-full">ข้อมูล (Values)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap">
                       <span className="font-mono text-sm text-slate-600">{log.timestamp.toLocaleTimeString()}</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                       <span className="font-mono text-sm text-slate-600">{log.address} - {log.address + log.values.length - 1}</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                       <span className="text-sm text-slate-600">FC{log.functionCode}</span>
                    </td>
                    <td className="px-4 py-2">
                       <div className="flex flex-wrap gap-1">
                          {log.values.map((v, i) => (
                             <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-700">
                                {v}
                             </span>
                          ))}
                       </div>
                    </td>
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
