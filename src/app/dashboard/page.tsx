'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutGrid, Plus, Trash2, Play, Square, Timer, AlertCircle,
  CheckCircle2, Clock, Loader2, Settings2, Hash
} from 'lucide-react';
import ConnectionSettings from '@/components/ConnectionSettings';
import { useModbus } from '@/context/ModbusContext';
import { useLanguage } from '@/context/LanguageContext';
import { dashboardAPI, DashboardCardConfig, DashboardStatus, DashboardCardResult } from '@/lib/electron-api';

interface DashboardCard extends DashboardCardConfig {
  name: string;
}

const FC_LABELS: Record<number, string> = {
  1: 'FC01 - Coils',
  2: 'FC02 - Discrete Inputs',
  3: 'FC03 - Holding Registers',
  4: 'FC04 - Input Registers',
};

const INTERVAL_OPTIONS = [
  { value: 500, label: '500ms' },
  { value: 1000, label: '1s' },
  { value: 2000, label: '2s' },
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
];

export default function DashboardPage() {
  const { connection, isConnectionReady } = useModbus();
  const { t } = useLanguage();

  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [interval, setInterval_] = useState(1000);
  const [timeout, setTimeout_] = useState(1000);
  const [polling, setPolling] = useState(false);
  const [results, setResults] = useState<Record<string, DashboardCardResult>>({});
  const [error, setError] = useState<string | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persistence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard_cards');
      if (saved) {
        try { setCards(JSON.parse(saved)); } catch { /* ignore */ }
      }
      const savedInterval = localStorage.getItem('dashboard_interval');
      if (savedInterval) setInterval_(Number(savedInterval));
      const savedTimeout = localStorage.getItem('dashboard_timeout');
      if (savedTimeout) setTimeout_(Number(savedTimeout));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && cards.length > 0) {
      localStorage.setItem('dashboard_cards', JSON.stringify(cards));
    }
  }, [cards]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_interval', interval.toString());
    }
  }, [interval]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_timeout', timeout.toString());
    }
  }, [timeout]);

  // Poll status from backend
  const fetchStatus = useCallback(async () => {
    try {
      const status: DashboardStatus = await dashboardAPI.status();
      setResults(status.results || {});
      setPolling(status.running);
    } catch {
      // Status fetch failed
    }
  }, []);

  // Start/stop status polling
  useEffect(() => {
    if (polling) {
      // Poll status faster than the device interval so UI stays fresh
      const pollMs = Math.min(interval, 1000);
      statusTimerRef.current = setInterval(fetchStatus, pollMs);
      fetchStatus();
    } else {
      if (statusTimerRef.current) {
        clearInterval(statusTimerRef.current);
        statusTimerRef.current = null;
      }
    }
    return () => {
      if (statusTimerRef.current) {
        clearInterval(statusTimerRef.current);
      }
    };
  }, [polling, interval, fetchStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusTimerRef.current) {
        clearInterval(statusTimerRef.current);
      }
    };
  }, []);

  const addCard = () => {
    const newCard: DashboardCard = {
      cardId: Date.now().toString(),
      name: `Device ${cards.length + 1}`,
      slaveAddress: 1,
      functionCode: 3,
      registerAddress: 0,
      quantity: 10,
    };
    setCards(prev => [...prev, newCard]);
  };

  const removeCard = (cardId: string) => {
    setCards(prev => prev.filter(c => c.cardId !== cardId));
  };

  const updateCard = (cardId: string, field: keyof DashboardCard, value: string | number) => {
    setCards(prev => prev.map(c => c.cardId === cardId ? { ...c, [field]: value } : c));
  };

  const startPolling = async () => {
    if (!isConnectionReady) {
      setError(t('err_select_port'));
      return;
    }
    if (cards.length === 0) {
      setError(t('dashboard_no_cards'));
      return;
    }

    setError(null);

    const cardConfigs: DashboardCardConfig[] = cards.map(c => ({
      cardId: c.cardId,
      slaveAddress: c.slaveAddress,
      functionCode: c.functionCode,
      registerAddress: c.registerAddress,
      quantity: c.quantity,
    }));

    const res = await dashboardAPI.start({
      cards: cardConfigs,
      connectionConfig: {
        type: connection.type,
        port: connection.port,
        baudRate: connection.baudRate,
        parity: connection.parity,
        stopBits: connection.stopBits,
        dataBits: connection.dataBits,
        tcpIp: connection.tcpIp,
        tcpPort: connection.tcpPort,
      },
      interval,
      timeout,
    });

    if (res.success) {
      setPolling(true);
    } else {
      setError(res.error || 'Failed to start polling');
    }
  };

  const stopPolling = async () => {
    await dashboardAPI.stop();
    setPolling(false);
  };

  const updatePollingConfig = async () => {
    if (!polling) return;

    const cardConfigs: DashboardCardConfig[] = cards.map(c => ({
      cardId: c.cardId,
      slaveAddress: c.slaveAddress,
      functionCode: c.functionCode,
      registerAddress: c.registerAddress,
      quantity: c.quantity,
    }));

    await dashboardAPI.update({
      cards: cardConfigs,
      interval,
      timeout,
      connectionConfig: {
        type: connection.type,
        port: connection.port,
        baudRate: connection.baudRate,
        parity: connection.parity,
        stopBits: connection.stopBits,
        dataBits: connection.dataBits,
        tcpIp: connection.tcpIp,
        tcpPort: connection.tcpPort,
      },
    });
  };

  // When interval changes during active polling, update backend
  useEffect(() => {
    if (polling) {
      updatePollingConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, timeout]);

  const formatTime = (isoStr: string | null) => {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <LayoutGrid className="w-8 h-8" />
          {t('dashboard_title')}
        </h1>
        <p className="text-slate-500 mt-1">{t('dashboard_subtitle')}</p>
      </div>

      {/* Connection Settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <ConnectionSettings />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center gap-4">
          {/* Interval selector */}
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-slate-500" />
            <label className="text-sm font-medium text-slate-700">{t('dashboard_interval')}:</label>
            <select
              value={interval}
              onChange={(e) => setInterval_(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-slate-400"
            >
              {INTERVAL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Timeout */}
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-slate-500" />
            <label className="text-sm font-medium text-slate-700">Timeout:</label>
            <input
              type="number"
              value={timeout}
              onChange={(e) => setTimeout_(Math.max(100, Number(e.target.value)))}
              className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-slate-400"
              min={100}
              step={100}
            />
            <span className="text-xs text-slate-400">ms</span>
          </div>

          <div className="flex-1" />

          {/* Add card */}
          <button
            onClick={addCard}
            disabled={polling}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {t('dashboard_add_card')}
          </button>

          {/* Start / Stop */}
          {!polling ? (
            <button
              onClick={startPolling}
              disabled={!isConnectionReady || cards.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {t('dashboard_start_polling')}
            </button>
          ) : (
            <button
              onClick={stopPolling}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <Square className="w-4 h-4" />
              {t('dashboard_stop_polling')}
            </button>
          )}
        </div>

        {/* Status indicator */}
        {polling && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('dashboard_polling_active')}
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Card Grid */}
      {cards.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <LayoutGrid className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">{t('dashboard_no_cards')}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const result = results[card.cardId];
            return (
              <div
                key={card.cardId}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                {/* Card Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {result?.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : result?.error ? (
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-slate-200 shrink-0" />
                    )}
                    {polling ? (
                      <span className="text-sm font-semibold text-slate-800 truncate">{card.name}</span>
                    ) : (
                      <input
                        type="text"
                        value={card.name}
                        onChange={(e) => updateCard(card.cardId, 'name', e.target.value)}
                        className="text-sm font-semibold text-slate-800 bg-transparent border-none outline-none focus:ring-0 p-0 w-full min-w-0"
                        placeholder={t('dashboard_card_name')}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {result?.lastUpdated && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(result.lastUpdated)}
                      </span>
                    )}
                    {!polling && (
                      <button
                        onClick={() => removeCard(card.cardId)}
                        className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        title={t('dashboard_remove_card')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Config (editable when not polling) */}
                {!polling && (
                  <div className="px-4 py-3 border-b border-slate-100 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="text-xs text-slate-500 font-medium">Slave ID</label>
                      <input
                        type="number"
                        value={card.slaveAddress}
                        onChange={(e) => updateCard(card.cardId, 'slaveAddress', Number(e.target.value))}
                        className="w-full mt-1 px-2 py-1 rounded border border-slate-200 text-sm focus:ring-1 focus:ring-slate-400"
                        min={1}
                        max={247}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-medium">Function Code</label>
                      <select
                        value={card.functionCode}
                        onChange={(e) => updateCard(card.cardId, 'functionCode', Number(e.target.value) as 1 | 2 | 3 | 4)}
                        className="w-full mt-1 px-2 py-1 rounded border border-slate-200 text-sm focus:ring-1 focus:ring-slate-400 bg-white"
                      >
                        {Object.entries(FC_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-medium">Start Address</label>
                      <input
                        type="number"
                        value={card.registerAddress}
                        onChange={(e) => updateCard(card.cardId, 'registerAddress', Number(e.target.value))}
                        className="w-full mt-1 px-2 py-1 rounded border border-slate-200 text-sm focus:ring-1 focus:ring-slate-400"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-medium">Quantity</label>
                      <input
                        type="number"
                        value={card.quantity}
                        onChange={(e) => updateCard(card.cardId, 'quantity', Math.max(1, Number(e.target.value)))}
                        className="w-full mt-1 px-2 py-1 rounded border border-slate-200 text-sm focus:ring-1 focus:ring-slate-400"
                        min={1}
                        max={125}
                      />
                    </div>
                  </div>
                )}

                {/* Card Info (shown when polling) */}
                {polling && (
                  <div className="px-4 py-2 border-b border-slate-100 text-xs text-slate-500 flex flex-wrap gap-3">
                    <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> ID: {card.slaveAddress}</span>
                    <span>{FC_LABELS[card.functionCode]}</span>
                    <span>Addr: {card.registerAddress}</span>
                    <span>Qty: {card.quantity}</span>
                  </div>
                )}

                {/* Card Data */}
                <div className="px-4 py-3">
                  {result?.error && (
                    <div className="text-xs text-red-500 flex items-center gap-1 mb-2">
                      <AlertCircle className="w-3 h-3" />
                      {result.error}
                    </div>
                  )}

                  {result?.success && result.data ? (
                    <div className="grid grid-cols-5 gap-1">
                      {result.data.map((val, idx) => (
                        <div
                          key={idx}
                          className="text-center p-1.5 rounded bg-slate-50 border border-slate-100"
                        >
                          <div className="text-[10px] text-slate-400 leading-none mb-0.5">
                            {card.registerAddress + idx}
                          </div>
                          <div className="text-sm font-mono font-medium text-slate-800">
                            {val}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !result?.error ? (
                    <p className="text-xs text-slate-400 text-center py-2">{t('dashboard_no_data')}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
