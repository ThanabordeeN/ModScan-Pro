"use client";

import { useState, useEffect } from "react";
import {
  PenLine,
  Loader2,
  XCircle,
  CheckCircle2,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import ConnectionSettings from "@/components/ConnectionSettings";
import { useModbus } from "@/context/ModbusContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProject } from "@/context/ProjectContext";
import { modbusAPI } from "@/lib/electron-api";

export default function WritePage() {
  const { connection, scannedDevices, isConnectionReady } = useModbus();
  const { t } = useLanguage();
  const { getDeviceDisplayName } = useProject();

  const WRITE_FUNCTION_CODES = [
    {
      value: 5,
      label: "FC05 - Write Single Coil",
      description: t("write_fc5_desc"),
      type: "single_coil",
    },
    {
      value: 6,
      label: "FC06 - Write Single Register",
      description: t("write_fc6_desc"),
      type: "single_register",
    },
    {
      value: 15,
      label: "FC15 - Write Multiple Coils",
      description: t("write_fc15_desc"),
      type: "multiple_coils",
    },
    {
      value: 16,
      label: "FC16 - Write Multiple Registers",
      description: t("write_fc16_desc"),
      type: "multiple_registers",
    },
  ];

  // Write settings
  const [slaveAddress, setSlaveAddress] = useState(1);
  const [functionCode, setFunctionCode] = useState<5 | 6 | 15 | 16>(6);
  const [address, setAddress] = useState(0);
  const [timeout, setTimeout] = useState(1000);

  // Values for different FCs
  const [singleCoilValue, setSingleCoilValue] = useState(false);
  const [singleRegisterValue, setSingleRegisterValue] = useState(0);
  const [multipleCoilValues, setMultipleCoilValues] = useState<boolean[]>([
    false,
  ]);
  const [multipleRegisterValues, setMultipleRegisterValues] = useState<
    number[]
  >([0]);

  // Results
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    if (!isConnectionReady) {
      setError(t("write_err_port"));
      return;
    }

    setWriting(true);
    setError(null);
    setSuccess(null);

    const requestBody: {
      type?: "serial" | "tcp";
      port?: string;
      baudRate?: number;
      parity?: "none" | "even" | "odd";
      stopBits?: 1 | 2;
      dataBits?: 7 | 8;
      tcpIp?: string;
      tcpPort?: number;
      slaveAddress: number;
      functionCode: 5 | 6 | 15 | 16;
      address: number;
      timeout?: number;
      coilValue?: boolean;
      value?: number;
      coilValues?: boolean[];
      values?: number[];
    } = {
      type: connection.type,
      port: connection.port,
      baudRate: connection.baudRate,
      parity: connection.parity,
      stopBits: connection.stopBits,
      dataBits: connection.dataBits,
      tcpIp: connection.tcpIp,
      tcpPort: connection.tcpPort,
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
      const data = await modbusAPI.write(requestBody);

      if (data.success) {
        setSuccess(t("write_success"));
      } else {
        setError(data.error || t("write_failed"));
      }
    } catch {
      setError(t("err_connect_failed"));
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
      setMultipleRegisterValues(
        multipleRegisterValues.filter((_, i) => i !== index),
      );
    }
  };

  const currentFCInfo = WRITE_FUNCTION_CODES.find(
    (fc) => fc.value === functionCode,
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 instrument-panel bg-instrument-accent/5 border-instrument-accent/20 text-instrument-accent flex items-center justify-center">
          <PenLine className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-app-text">
            {t("write_title")}
          </h1>
          <p className="text-sm text-app-muted">{t("write_subtitle")}</p>
        </div>
      </div>

      {/* Warning */}
      <div className="p-4 instrument-panel bg-instrument-accent/5 border-instrument-accent/20">
        <div className="flex items-start gap-2">
          <div className="p-1 instrument-panel bg-instrument-accent/5 border-instrument-accent/20 text-instrument-accent flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm text-app-text font-medium">
              {t("write_warning_title")}
            </p>
            <p className="text-sm text-app-muted mt-1">
              {t("write_warning_desc")}
            </p>
          </div>
        </div>
      </div>

      {/* Connection Settings */}
      <ConnectionSettings disabled={writing} />

      {/* Scanned Devices Quick Select */}
      {scannedDevices.length > 0 && (
        <div className="instrument-panel p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1 instrument-panel bg-instrument-accent/5 border-instrument-accent/20 text-instrument-accent">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-app-text">
              {t("write_select_scanned")}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {scannedDevices.map((device) => (
              <button
                key={device.address}
                onClick={() => setSlaveAddress(device.address)}
                className={`px-3 py-1.5 instrument-input font-mono text-sm transition-all ${
                  slaveAddress === device.address
                    ? "instrument-accent text-white shadow-sm"
                    : "instrument-button"
                }`}
              >
                ID: {device.address}
                {getDeviceDisplayName(device.address) !==
                  `ID:${device.address}` && (
                  <> — {getDeviceDisplayName(device.address)}</>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Write Settings */}
      <div className="instrument-panel p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {t("write_settings")}
        </h2>

        {/* Function Code Selection */}
        <div className="mb-6">
          <label className="instrument-label mb-2">
            {t("write_function_code")}
          </label>
          <select
            value={functionCode.toString()}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && [5, 6, 15, 16].includes(val)) {
                setFunctionCode(val as 5 | 6 | 15 | 16);
              }
            }}
            className="w-full px-4 py-3 instrument-input bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
            <label className="instrument-label mb-2">
              {t("write_slave_address")}
            </label>
            <input
              type="number"
              min={1}
              max={247}
              value={slaveAddress}
              onChange={(e) =>
                setSlaveAddress(
                  Math.min(247, Math.max(1, Number(e.target.value))),
                )
              }
              className="w-full px-3 py-2 instrument-input bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div>
            <label className="instrument-label mb-2">
              {functionCode === 5 || functionCode === 15
                ? t("write_coil_address")
                : t("write_register_address")}
            </label>
            <input
              type="number"
              min={0}
              max={65535}
              value={address}
              onChange={(e) => setAddress(Number(e.target.value))}
              className="w-full px-3 py-2 instrument-input bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div>
            <label className="instrument-label mb-2">
              {t("write_timeout")}
            </label>
            <input
              type="number"
              min={100}
              max={10000}
              step={100}
              value={timeout}
              onChange={(e) => setTimeout(Number(e.target.value))}
              className="w-full px-3 py-2 instrument-input bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>

        {/* Dynamic Value Input based on FC */}
        <div
          key={functionCode}
          className="p-4 instrument-input bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 mb-6 transition-all duration-300"
        >
          <h3 className="text-sm font-medium instrument-accent dark:instrument-accent mb-4">
            {currentFCInfo?.description}
          </h3>

          {/* FC05 - Single Coil */}
          {functionCode === 5 && (
            <div className="flex items-center gap-4">
              <span className="text-slate-600 dark:text-slate-400">
                {t("write_value_coil")}
              </span>
              <button
                onClick={() => setSingleCoilValue(!singleCoilValue)}
                className={`px-6 py-3 instrument-input font-medium transition-all ${
                  singleCoilValue
                    ? "instrument-accent text-white shadow-sm"
                    : "bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-500"
                }`}
              >
                {singleCoilValue ? "ON (1)" : "OFF (0)"}
              </button>
            </div>
          )}

          {/* FC06 - Single Register */}
          {functionCode === 6 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="instrument-label mb-2">
                  {t("write_value_dec")}
                </label>
                <input
                  type="number"
                  min={0}
                  max={65535}
                  value={singleRegisterValue}
                  onChange={(e) =>
                    setSingleRegisterValue(
                      Math.min(65535, Math.max(0, Number(e.target.value))),
                    )
                  }
                  className="w-full px-3 py-2 instrument-input bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="instrument-label mb-2">
                  {t("write_value_hex")}
                </label>
                <div className="px-3 py-2 instrument-input bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-mono">
                  0x
                  {singleRegisterValue
                    .toString(16)
                    .toUpperCase()
                    .padStart(4, "0")}
                </div>
              </div>
              <div>
                <label className="instrument-label mb-2">
                  {t("write_value_bin")}
                </label>
                <div className="px-3 py-2 instrument-input bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-mono text-xs overflow-hidden">
                  {singleRegisterValue.toString(2).padStart(16, "0")}
                </div>
              </div>
            </div>
          )}

          {/* FC15 - Multiple Coils */}
          {functionCode === 15 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-600 dark:text-slate-400">
                  Coils ({multipleCoilValues.length} ค่า)
                </span>
                <button
                  onClick={addMultipleValue}
                  className="flex items-center gap-1 px-3 py-1.5 instrument-input bg-purple-50 dark:instrument-accent/20 instrument-accent dark:instrument-accent hover:instrument-accent dark:hover:instrument-accent/50 transition-colors border instrument-accent dark:instrument-accent"
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
                      className={`flex-1 px-3 py-2 instrument-input font-mono text-sm transition-all ${
                        val
                          ? "instrument-accent text-white shadow-sm"
                          : "bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-500"
                      }`}
                    >
                      [{address + idx}] {val ? "ON" : "OFF"}
                    </button>
                    {multipleCoilValues.length > 1 && (
                      <button
                        onClick={() => removeMultipleValue(idx)}
                        className="p-1.5 instrument-input bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/50 border border-red-100 dark:border-red-700"
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
                <span className="text-slate-600 dark:text-slate-400">
                  Registers ({multipleRegisterValues.length} ค่า)
                </span>
                <button
                  onClick={addMultipleValue}
                  className="flex items-center gap-1 px-3 py-1.5 instrument-input bg-purple-50 dark:instrument-accent/20 instrument-accent dark:instrument-accent hover:instrument-accent dark:hover:instrument-accent/50 transition-colors border instrument-accent dark:instrument-accent"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่ม
                </button>
              </div>
              <div className="space-y-2">
                {multipleRegisterValues.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-sm w-16">
                      [{address + idx}]
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={65535}
                      value={val}
                      onChange={(e) => {
                        const newVals = [...multipleRegisterValues];
                        newVals[idx] = Math.min(
                          65535,
                          Math.max(0, Number(e.target.value)),
                        );
                        setMultipleRegisterValues(newVals);
                      }}
                      className="flex-1 px-3 py-2 instrument-input bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono"
                    />
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-xs w-16">
                      0x{val.toString(16).toUpperCase().padStart(4, "0")}
                    </span>
                    {multipleRegisterValues.length > 1 && (
                      <button
                        onClick={() => removeMultipleValue(idx)}
                        className="p-1.5 instrument-input bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/50 border border-red-100 dark:border-red-700"
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
          disabled={writing || !isConnectionReady}
          className="w-full py-3 px-4 instrument-input bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
        >
          {writing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t("write_writing")}
            </>
          ) : (
            <>
              <PenLine className="w-5 h-5" />
              {t("write_btn")}
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 instrument-input bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-600 dark:text-red-400">{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 p-4 instrument-input bg-emerald-50 dark:instrument-accent/20 border instrument-accent dark:instrument-accent flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 instrument-accent dark:instrument-accent" />
            <span className="instrument-accent dark:instrument-accent">
              {success}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
