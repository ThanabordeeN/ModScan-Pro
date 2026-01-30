'use client';

import { BookOpen, Loader2, XCircle, CheckCircle2, Play, Square, Timer, Trash2, History, Plus, LineChart as ChartIcon, FileSpreadsheet } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ConnectionSettings from '@/components/ConnectionSettings';
import { useModbus } from '@/context/ModbusContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ReadRange } from '@/types/modbus';

export default function ReadPage() {
  const { 
    connection, scannedDevices, isConnectionReady,
    readRanges, setReadRanges,
    readTimeout, setReadTimeout,
    autoRefresh, toggleAutoRefresh, refreshInterval, setRefreshInterval, lastUpdated,
    readData, readError, isReading, readOnce,
    logs, setLogs, clearLogs,
    graphData, setGraphData, clearGraph,
    selectedRegisters, toggleRegisterSelection,
    isLogging, toggleLogging
  } = useModbus();
  const { t } = useLanguage();

  const READ_FUNCTION_CODES = [
    { value: 1, label: 'FC01 - Read Coils', description: t('read_coils_desc') || 'Read Coil Status (0x)' },
    { value: 2, label: 'FC02 - Read Discrete Inputs', description: t('read_discrete_desc') || 'Read Discrete Input (1x)' },
    { value: 3, label: 'FC03 - Read Holding Registers', description: t('read_holding_desc') || 'Read Holding Register (4x)' },
    { value: 4, label: 'FC04 - Read Input Registers', description: t('read_input_desc') || 'Read Input Register (3x)' },
  ];

  // Colors for graph lines
  const LINE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const addRange = () => {
    setReadRanges([...readRanges, { 
      id: Date.now().toString(), 
      slaveAddress: 1, 
      functionCode: 3, 
      registerAddress: 0, 
      quantity: 10 
    }]);
  };

  const removeRange = (id: string) => {
    if (readRanges.length > 1) {
      setReadRanges(readRanges.filter(r => r.id !== id));
    }
  };

  const updateRange = (id: string, field: keyof ReadRange, value: string | number | boolean) => {
    setReadRanges(readRanges.map(r => {
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
      <ConnectionSettings disabled={isReading || autoRefresh} />

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
                onClick={() => setReadRanges([...readRanges, {
                  id: Date.now().toString(),
                  slaveAddress: device.address,
                  functionCode: 3,
                  registerAddress: 0,
                  quantity: 10
                }])}
                disabled={autoRefresh}
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
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('read_function_code')}</label>
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

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('read_slave_id')}</label>
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

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('read_start_address')}</label>
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

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t('read_quantity')}</label>
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
                  value={readTimeout}
                  onChange={(e) => setReadTimeout(Number(e.target.value))}
                  disabled={autoRefresh}
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
                  disabled={autoRefresh}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:bg-slate-50 disabled:text-slate-500"
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
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-300 disabled:cursor-not-allowed'
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

      {/* Analyzer Graph Section */}
      {selectedRegisters.size > 0 && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
               <ChartIcon className="w-5 h-5 text-indigo-600" />
               Real-time Analysis
             </h2>
             <button
               onClick={clearGraph}
               className="text-xs text-slate-500 hover:text-slate-700 underline"
             >
               Clear Graph
             </button>
           </div>
           
           <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={graphData}>
                 <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                 <XAxis 
                   dataKey="timeStr" 
                   tick={{fontSize: 10}} 
                   interval="preserveStartEnd"
                 />
                 <YAxis domain={['auto', 'auto']} />
                 <Tooltip 
                   contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                 />
                 <Legend />
                 {Array.from(selectedRegisters).map((id, index) => {
                    const [slaveId, addr] = id.split('-');
                    return (
                      <Line 
                        key={id} 
                        type="monotone" 
                        dataKey={id} 
                        name={`ID:${slaveId} Addr:${addr}`}
                        stroke={LINE_COLORS[index % LINE_COLORS.length]} 
                        dot={false}
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                        isAnimationActive={false} // Better performance
                      />
                    );
                 })}
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>
      )}

      {/* Logging Control */}
      <div className="flex justify-end mb-2">
         <button
            onClick={toggleLogging}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-sm ${
               isLogging 
                 ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                 : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'
            }`}
         >
            <FileSpreadsheet className="w-4 h-4" />
            {isLogging ? 'Stop Logging & Save CSV' : 'Start Logging to CSV'}
            {isLogging && <span className="animate-pulse w-2 h-2 rounded-full bg-red-500 ml-1"></span>}
         </button>
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
            {lastUpdated && autoRefresh && (
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 w-10">Graph</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Address</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">ค่า (Dec)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Hex</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Binary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {readData.map((rangeResult) => {
                    const rangeConfig = readRanges.find(r => r.id === rangeResult.rangeId);
                    if (!rangeConfig || rangeResult.data.length === 0) return null;
                    const isCoil = rangeConfig.functionCode === 1 || rangeConfig.functionCode === 2;
                    
                    return rangeResult.data.map((value, valIdx) => {
                      const uniqueId = `${rangeConfig.slaveAddress}-${rangeConfig.registerAddress + valIdx}`;
                      const isSelected = selectedRegisters.has(uniqueId);
                      
                      return (
                      <tr key={`${rangeResult.rangeId}-${valIdx}`} className={`transition-colors ${isSelected ? 'bg-indigo-50/50' : 'bg-white hover:bg-slate-50'}`}>
                        <td className="px-4 py-2">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleRegisterSelection(uniqueId)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
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
                      );
                    });
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Log Table */}
      {logs.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
               <History className="w-5 h-5 text-slate-500" />
               {t('read_logs')}
            </h2>
             <button
                onClick={clearLogs}
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
