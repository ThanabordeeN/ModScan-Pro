'use client';

import { useState, useEffect } from 'react';
import { 
  BookOpen, Loader2, XCircle, CheckCircle2, Play, Square, 
  Timer, Trash2, History, Plus, LineChart as ChartIcon, 
  FileSpreadsheet, PenLine, Settings2, Hash, Type, Info,
  ChevronDown, ChevronUp, Save
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ConnectionSettings from '@/components/ConnectionSettings';
import { useModbus } from '@/context/ModbusContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ReadRange, DataType } from '@/types/modbus';
import { registersToValue, formatValue, getRegisterCount, valueToRegisters } from '@/lib/modbus-utils';

export default function UnifiedPage() {
  const { 
    connection, scannedDevices, isConnectionReady,
    readRanges, setReadRanges,
    readTimeout, setReadTimeout,
    autoRefresh, toggleAutoRefresh, refreshInterval, setRefreshInterval, lastUpdated,
    readData, readError, isReading, readOnce,
    handleWrite,
    logs, setLogs, clearLogs,
    graphData, setGraphData, clearGraph,
    selectedRegisters, toggleRegisterSelection,
    isLogging, toggleLogging
  } = useModbus();
  const { t } = useLanguage();

  // Local state for inline writing
  const [writingId, setWritingId] = useState<string | null>(null);
  const [writeValue, setWriteValue] = useState<string>('0');
  const [isWriting, setIsWriting] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);

  const READ_FUNCTION_CODES = [
    { value: 1, label: 'FC01 - Read Coils', description: t('read_coils_desc') || 'Read Coil Status (0x)' },
    { value: 2, label: 'FC02 - Read Discrete Inputs', description: t('read_discrete_desc') || 'Read Discrete Input (1x)' },
    { value: 3, label: 'FC03 - Read Holding Registers', description: t('read_holding_desc') || 'Read Holding Register (4x)' },
    { value: 4, label: 'FC04 - Read Input Registers', description: t('read_input_desc') || 'Read Input Register (3x)' },
  ];

  const DATA_TYPES: { value: DataType; label: string }[] = [
    { value: 'uint16', label: 'UInt16 (1 Reg)' },
    { value: 'int16', label: 'Int16 (1 Reg)' },
    { value: 'uint32', label: 'UInt32 (2 Regs)' },
    { value: 'int32', label: 'Int32 (2 Regs)' },
    { value: 'float32', label: 'Float32 (2 Regs)' },
    { value: 'double64', label: 'Double64 (4 Regs)' },
    { value: 'coil', label: 'Coil' },
  ];

  // Colors for graph lines
  const LINE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const addRange = () => {
    setReadRanges([...readRanges, { 
      id: Date.now().toString(), 
      slaveAddress: 1, 
      functionCode: 3, 
      registerAddress: 0, 
      quantity: 10,
      dataType: 'uint16',
      remark: ''
    }]);
  };

  const removeRange = (id: string) => {
    if (readRanges.length > 1) {
      setReadRanges(readRanges.filter(r => r.id !== id));
    }
  };

  const updateRange = (id: string, field: keyof ReadRange, value: any) => {
    setReadRanges(readRanges.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  const onHandleInlineWrite = async (slaveId: number, address: number, type: DataType) => {
    setIsWriting(true);
    setWriteError(null);
    try {
      const regCount = getRegisterCount(type);
      let config: any = {
        slaveAddress: slaveId,
        address: address,
      };

      if (type === 'coil') {
        config.functionCode = 5;
        config.coilValue = writeValue === '1' || writeValue.toLowerCase() === 'true' || writeValue.toLowerCase() === 'on';
      } else if (regCount === 1) {
        config.functionCode = 6;
        config.value = Math.round(Number(writeValue));
      } else {
        // Multi-register write
        config.functionCode = 16;
        config.values = valueToRegisters(writeValue, type);
      }

      const res = await handleWrite(config);
      if (res.success) {
        setWritingId(null);
        if (!autoRefresh) await readOnce(); // Update immediately if not auto-refreshing
      } else {
        setWriteError(res.error || 'Write failed');
      }
    } catch (err: any) {
      setWriteError(err.message || 'Error');
    } finally {
      setIsWriting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
          <Settings2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Modbus All-in-One Dashboard</h1>
          <p className="text-sm text-slate-600">Read, Write and Monitor Modbus registers in a single view</p>
        </div>
      </div>

      {/* Connection Settings */}
      <ConnectionSettings disabled={isReading || autoRefresh} />

      {/* Read Ranges Configuration */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
           <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
             <Hash className="w-5 h-5 text-emerald-600" />
             {t('read_ranges')}
           </h2>
           <button
             onClick={addRange}
             disabled={autoRefresh}
             className="text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
           >
             <Plus className="w-4 h-4" />
             {t('read_add_range')}
           </button>
        </div>
        
        <div className="space-y-4">
          {readRanges.map((range, index) => (
            <div key={range.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200 relative group">
               <div className="absolute -left-2 top-4 w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 border border-white shadow-sm">
                 {index + 1}
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                       <Type className="w-3 h-3" /> FC
                    </label>
                    <select
                      value={range.functionCode}
                      onChange={(e) => updateRange(range.id, 'functionCode', Number(e.target.value))}
                      disabled={autoRefresh}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {READ_FUNCTION_CODES.map((fc) => (
                        <option key={fc.value} value={fc.value}>{fc.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Slave ID</label>
                    <input
                      type="number"
                      min={1}
                      max={247}
                      value={range.slaveAddress}
                      onChange={(e) => updateRange(range.id, 'slaveAddress', Number(e.target.value))}
                      disabled={autoRefresh}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Address</label>
                    <input
                      type="number"
                      min={0}
                      max={65535}
                      value={range.registerAddress}
                      onChange={(e) => updateRange(range.id, 'registerAddress', Number(e.target.value))}
                      disabled={autoRefresh}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Qty</label>
                    <input
                      type="number"
                      min={1}
                      max={125}
                      value={range.quantity}
                      onChange={(e) => updateRange(range.id, 'quantity', Number(e.target.value))}
                      disabled={autoRefresh}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Data Type</label>
                    <select
                      value={range.dataType || 'uint16'}
                      onChange={(e) => updateRange(range.id, 'dataType', e.target.value)}
                      disabled={autoRefresh}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {DATA_TYPES.map((dt) => (
                        <option key={dt.value} value={dt.value}>{dt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                       <Info className="w-3 h-3" /> Remark
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Temperature, Pressure"
                      value={range.remark || ''}
                      onChange={(e) => updateRange(range.id, 'remark', e.target.value)}
                      disabled={autoRefresh}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      onClick={() => removeRange(range.id)}
                      disabled={readRanges.length === 1 || autoRefresh}
                      className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
               </div>
            </div>
          ))}
        </div>

        {/* Global Controls */}
        <div className="mt-6 pt-4 border-t border-slate-100">
           <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:w-32">
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('read_timeout')} (ms)</label>
                <input
                  type="number"
                  min={100}
                  max={10000}
                  step={100}
                  value={readTimeout}
                  onChange={(e) => setReadTimeout(Number(e.target.value))}
                  disabled={autoRefresh}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

               <div className="flex-1 w-full md:w-auto">
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  {t('read_interval')} (ms)
                </label>
                <input
                  type="number"
                  min={100}
                  max={60000}
                  step={100}
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  disabled={autoRefresh}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

               <div className="flex gap-2 w-full md:w-auto">
                 <button
                  onClick={readOnce}
                  disabled={isReading || !isConnectionReady || autoRefresh}
                  className="flex-1 md:flex-none py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 text-slate-700 font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isReading && !autoRefresh ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BookOpen className="w-4 h-4" />
                  )}
                  {t('read_once')}
                </button>

                <button
                  onClick={toggleAutoRefresh}
                  disabled={!isConnectionReady && !autoRefresh}
                  className={`flex-1 md:flex-none py-2 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
                    autoRefresh 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-300'
                  }`}
                >
                  {autoRefresh ? (
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
        
         {readError && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600">{readError}</span>
          </div>
        )}
      </div>

      {/* Results Table */}
      {readData && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
             <h2 className="font-semibold text-slate-900 flex items-center gap-2">
               Live Monitor
               {lastUpdated && (
                  <span className="text-xs font-normal text-slate-500">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </span>
               )}
             </h2>
             <div className="flex gap-2">
                <button
                  onClick={toggleLogging}
                  className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                    isLogging 
                      ? 'bg-red-50 text-red-600 border border-red-200' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  {isLogging ? 'Logging...' : 'Log CSV'}
                </button>
             </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
             <table className="w-full text-sm">
               <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                 <tr className="text-slate-500 font-medium">
                   <th className="px-4 py-3 text-left w-10">G</th>
                   <th className="px-4 py-3 text-left">Address</th>
                   <th className="px-4 py-3 text-left">Remark</th>
                   <th className="px-4 py-3 text-left">Data Type</th>
                   <th className="px-4 py-3 text-left">Raw Value</th>
                   <th className="px-4 py-3 text-left font-bold text-slate-900">Converted Value</th>
                   <th className="px-4 py-3 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {readData.map((rangeResult) => {
                   const rangeConfig = readRanges.find(r => r.id === rangeResult.rangeId);
                   if (!rangeConfig || rangeResult.data.length === 0) return null;
                   
                   const isCoil = rangeConfig.functionCode === 1 || rangeConfig.functionCode === 2;
                   const regCount = getRegisterCount(rangeConfig.dataType || 'uint16');
                   
                   // Groups of registers based on data type size
                   const rows = [];
                   
                   // Add Header for this range
                   rows.push(
                     <tr key={`header-${rangeResult.rangeId}`} className="bg-slate-100/50">
                       <td colSpan={7} className="px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-200">
                          {rangeConfig.remark || 'Untitled Range'} (ID:{rangeConfig.slaveAddress} | Start:{rangeConfig.registerAddress} | FC:{rangeConfig.functionCode})
                       </td>
                     </tr>
                   );

                   for (let i = 0; i < rangeResult.data.length; i += regCount) {
                     const slice = rangeResult.data.slice(i, i + regCount);
                     if (slice.length < regCount) continue; // Incomplete data for this type
                     const addr = rangeConfig.registerAddress + i;
                     const uniqueId = `${rangeConfig.slaveAddress}-${addr}`;
                     const value = registersToValue(slice, rangeConfig.dataType || 'uint16');
                     const displayValue = formatValue(value, rangeConfig.dataType || 'uint16');
                     
                     rows.push(
                       <tr key={uniqueId} className={`hover:bg-slate-50/80 transition-colors ${selectedRegisters.has(uniqueId) ? 'bg-indigo-50/30' : ''}`}>
                         <td className="px-4 py-2">
                           <input 
                             type="checkbox" 
                             checked={selectedRegisters.has(uniqueId)}
                             onChange={() => toggleRegisterSelection(uniqueId)}
                             className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                           />
                         </td>
                         <td className="px-4 py-2 font-mono text-xs text-slate-500">
                           {addr}{regCount > 1 && `-${addr + regCount - 1}`}
                           <span className="ml-2 opacity-50">ID:{rangeConfig.slaveAddress}</span>
                         </td>
                         <td className="px-4 py-2 italic text-slate-400">
                           {rangeConfig.remark || '-'}
                         </td>
                         <td className="px-4 py-2">
                           <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 uppercase">
                             {rangeConfig.dataType || 'uint16'}
                           </span>
                         </td>
                         <td className="px-4 py-2 font-mono text-xs text-slate-400">
                           {slice.join(', ')}
                         </td>
                         <td className="px-4 py-2">
                           <span className={`font-mono font-bold text-lg ${isCoil ? (value ? 'text-emerald-600' : 'text-slate-400') : 'text-blue-600'}`}>
                             {displayValue}
                           </span>
                         </td>
                         <td className="px-4 py-2 text-right">
                           {writingId === uniqueId ? (
                              <div className="flex items-center justify-end gap-1 animate-in slide-in-from-right-2">
                                <input 
                                  autoFocus
                                  className="w-20 px-2 py-1 border border-emerald-500 rounded text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                  value={writeValue}
                                  onChange={(e) => setWriteValue(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && onHandleInlineWrite(rangeConfig.slaveAddress, addr, rangeConfig.dataType || 'uint16')}
                                />
                                <button 
                                  onClick={() => onHandleInlineWrite(rangeConfig.slaveAddress, addr, rangeConfig.dataType || 'uint16')}
                                  disabled={isWriting}
                                  className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {isWriting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                </button>
                                <button 
                                  onClick={() => setWritingId(null)}
                                  className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                           ) : (
                             <button 
                               onClick={() => {
                                 setWritingId(uniqueId);
                                 setWriteValue(String(value));
                               }}
                               className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                               title="Write Value"
                             >
                               <PenLine className="w-4 h-4" />
                             </button>
                           )}
                         </td>
                       </tr>
                     );
                   }
                   return rows;
                 })}
               </tbody>
             </table>
          </div>
          {writeError && (
             <div className="p-3 bg-red-50 text-red-600 text-xs border-t border-red-100 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> {writeError}
             </div>
          )}
        </div>
      )}

       {/* Graph Section */}
       {selectedRegisters.size > 0 && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
               <ChartIcon className="w-5 h-5 text-indigo-600" />
               Analyzer
             </h2>
             <button
               onClick={clearGraph}
               className="text-xs text-slate-400 hover:text-slate-600 underline"
             >
               Clear
             </button>
           </div>
           
           <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={graphData}>
                 <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                 <XAxis dataKey="timeStr" tick={{fontSize: 10}} />
                 <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} />
                 <Tooltip />
                 <Legend />
                 {Array.from(selectedRegisters).map((id, index) => {
                    const [slaveId, addr] = id.split('-');
                    return (
                      <Line 
                        key={id} 
                        type="monotone" 
                        dataKey={id} 
                        name={`Addr:${addr} (ID:${slaveId})`}
                        stroke={LINE_COLORS[index % LINE_COLORS.length]} 
                        dot={false}
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                    );
                 })}
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>
      )}

      {/* Logs Table */}
      {logs.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
               <History className="w-5 h-5 text-slate-500" />
               Log History
            </h2>
             <button onClick={clearLogs} className="text-xs text-red-600 hover:underline">
                Clear Logs
             </button>
          </div>
          
           <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                   <th className="px-4 py-2 text-left text-slate-500">Time</th>
                   <th className="px-4 py-2 text-left text-slate-500">Address</th>
                   <th className="px-4 py-2 text-left text-slate-500">Remark</th>
                   <th className="px-4 py-2 text-left text-slate-500">Values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2 font-mono text-slate-500">{log.timestamp.toLocaleTimeString()}</td>
                    <td className="px-4 py-2 font-mono">FC{log.functionCode} @ {log.address}</td>
                    <td className="px-4 py-2 italic text-slate-400">{log.remark || '-'}</td>
                    <td className="px-4 py-2">
                       <div className="flex gap-1 overflow-x-auto max-w-xs">
                          {log.values.map((v, i) => (
                             <span key={i} className="px-1 py-0.5 rounded bg-slate-100 text-slate-600">{v}</span>
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
