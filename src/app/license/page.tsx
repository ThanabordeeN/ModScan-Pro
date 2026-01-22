'use client';

import { useState, useEffect } from 'react';
import { Key, Copy, Check, Lock, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LicensePage() {
  const router = useRouter();
  const [machineId, setMachineId] = useState<string>('');
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');

  useEffect(() => {
    checkStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/license');
      const data = await res.json();
      
      if (data.success) {
        setMachineId(data.machineId);
        if (data.valid) {
          setStatus('valid');
          setTimeout(() => router.push('/scan'), 2000); // Redirect if valid
        } else {
          setStatus('invalid');
        }
      } else {
        setError(data.error || 'Failed to check license status');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;

    setActivating(true);
    setError(null);

    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ licenseKey: licenseKey.trim() }),
      });

      const data = await res.json();

      if (data.success && data.valid) {
        setStatus('valid');
        setTimeout(() => router.push('/scan'), 1500);
      } else {
        setError(data.error || 'Activation failed');
      }
    } catch {
      setError('Connection error during activation');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
      </div>
    );
  }

  if (status === 'valid') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">License Activated</h1>
          <p className="text-slate-500 mb-6">Redirecting to application...</p>
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-100 mb-4">
            <Lock className="w-8 h-8 text-cyan-700" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Software Activation</h1>
          <p className="text-slate-600 mt-2">Please enter your license key to continue</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 space-y-6">
            
            {/* Machine ID Display */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Your Machine ID
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-200 break-all">
                  {machineId || 'Loading...'}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-white hover:shadow-sm hover:border-slate-300 border border-transparent transition-all text-slate-500 hover:text-cyan-600"
                  title="Copy Machine ID"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Send this ID to the vendor to receive your license key.
              </p>
            </div>

            {/* License Input */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                License Key
              </label>
              <textarea
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Paste your license key here..."
                className="w-full h-32 px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none font-mono text-xs"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}

            {/* Activate Button */}
            <button
              onClick={handleActivate}
              disabled={activating || !licenseKey.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium shadow-md hover:shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {activating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  Activate Software
                </>
              )}
            </button>
          </div>
          
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>ModScan Pro</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
