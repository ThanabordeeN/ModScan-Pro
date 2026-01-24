'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, Loader2, CheckCircle2, XCircle, AlertTriangle, Info, Usb, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import ConnectionSettings from '@/components/ConnectionSettings';
import { useModbus } from '@/context/ModbusContext';
import { useLanguage } from '@/context/LanguageContext';
import type { SerialPortInfo } from '@/types/modbus';
import { FUNCTION_CODE_OPTIONS } from '@/types/modbus';

export default function ChangeAddressPage() {
  const { connection, setConnection, scannedDevices, isConnectionReady } = useModbus();
  const { t } = useLanguage();
  

  
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



  const handleChangeAddress = async () => {
    if (!isConnectionReady) {
      setResult({ success: false, message: t('change_id_err_port') });
      return;
    }

    if (currentAddress === newAddress) {
      setResult({ success: false, message: t('change_id_err_same') });
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
          type: connection.type,
          port: connection.port,
          baudRate: connection.baudRate,
          parity: connection.parity,
          stopBits: connection.stopBits,
          dataBits: connection.dataBits,
          tcpIp: connection.tcpIp,
          tcpPort: connection.tcpPort,
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
          message: t('change_id_success').replace('{old}', data.oldAddress).replace('{new}', data.newAddress),
        });
      } else {
        setResult({
          success: false,
          message: data.error || t('change_id_failed'),
        });
      }
    } catch {
      setResult({
        success: false,
        message: t('err_connect_failed'),
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
          <h1 className="text-2xl font-bold text-slate-900">{t('change_id_title')}</h1>
          <p className="text-sm text-slate-600">{t('change_id_subtitle')}</p>
        </div>
      </div>

      {/* Connection Settings */}
      <ConnectionSettings disabled={changing} />

      {/* Scanned Devices Selection */}
      {scannedDevices.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-emerald-500/30 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">{t('change_id_scanned_title')}</h2>
            <span className="text-sm text-slate-500">({scannedDevices.length} )</span>
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
          <p className="text-xs text-slate-500 mt-2">{t('change_id_click_to_select')}</p>
        </div>
      )}

      {scannedDevices.length === 0 && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium text-blue-800">{t('change_id_no_scanned')}</p>
              <p>{t('change_id_scan_hint')} <Link href="/scan" className="underline hover:text-blue-600">{t('change_id_scan_link')}</Link></p>
            </div>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 font-medium">{t('change_id_warning_title')}</p>
            <p className="text-sm text-amber-600 mt-1">
              {t('change_id_warning_desc')}
            </p>
          </div>
        </div>
      </div>

      {/* Address Change Settings */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('change_id_settings')}</h2>

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 mb-6">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-900 mb-2">{t('change_id_params_title')}</p>
              <ul className="space-y-1 list-disc list-inside text-xs">
                <li><strong>{t('change_id_param_current')}</strong></li>
                <li><strong>{t('change_id_param_new')}</strong></li>
                <li><strong>{t('change_id_param_register')}</strong></li>
                <li><strong>{t('change_id_param_fc')}</strong></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              {t('change_id_current')}
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
              {t('change_id_new')}
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
              {t('change_id_register')}
            </label>
            <input
              type="number"
              min={0}
              max={65535}
              value={registerAddress}
              onChange={(e) => setRegisterAddress(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <p className="text-xs text-slate-500 mt-1">{t('change_id_register_hint')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              {t('change_id_fc')}
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
          <p className="text-sm text-slate-600 mb-3">{t('change_id_summary')}</p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">{t('change_id_from')}</span>
              <span className="px-3 py-1 rounded-lg bg-slate-200 text-slate-900 font-mono font-bold">{currentAddress}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500">{t('change_id_to')}</span>
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
            disabled={changing || !isConnectionReady || currentAddress === newAddress}
            className="w-full py-3 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
          >
            <Settings className="w-5 h-5" />
            {t('change_id_btn')}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600 text-center">
                {t('change_id_confirm_title').replace('{from}', currentAddress.toString()).replace('{to}', newAddress.toString())}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-all"
              >
                {t('common_cancel')}
              </button>
              <button
                onClick={handleChangeAddress}
                disabled={changing}
                className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium transition-all flex items-center justify-center gap-2"
              >
                {changing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('change_id_changing')}
                  </>
                ) : (
                  t('change_id_confirm_btn')
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
