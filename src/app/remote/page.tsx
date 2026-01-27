'use client';

import { useState, useEffect } from 'react';
import { Lock, Power, Copy, Check, ExternalLink, ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { tunnelAPI } from '@/lib/electron-api';

export default function RemotePage() {
  const { } = useLanguage();

  const [isActive, setIsActive] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const [publicIP, setPublicIP] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
    checkPublicIP();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkPublicIP = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      setPublicIP(data.ip);
    } catch {
      console.error('Failed to fetch public IP');
    }
  };

  const checkStatus = async () => {
    try {
      const data = await tunnelAPI.status();
      setIsActive(data.isActive);
      setUrl(data.url);
    } catch {
      console.error('Failed to check status');
    }
  };

  // ... (toggleTunnel and copyToClipboard function remain same)

  const toggleTunnel = async () => {
    setLoading(true);
    setError('');

    try {
      if (isActive) {
        // Stop
        await tunnelAPI.control('stop');
        setIsActive(false);
        setUrl(null);
        setPassword('');
      } else {
        // StarttoggleTunnel
        if (!password) {
          setError('Password is required');
          setLoading(false);
          return;
        }

        const data = await tunnelAPI.control('start', password);

        if (data.success && data.url) {
          setIsActive(true);
          setUrl(data.url);
        } else {
          setError(data.error || 'Failed to start tunnel');
        }
      }
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const copyIP = () => {
    if (publicIP) {
      navigator.clipboard.writeText(publicIP);
      // Optional: show toast
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ... (Header remains same) */}

      {publicIP && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700">
            <p className="font-bold text-slate-900 mb-1">First Time Access Code</p>
            <p className="mb-2">If asked for a &quot;Tunnel Password&quot; when opening the link, enter this Public IP:</p>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 bg-white border border-amber-200 rounded font-mono font-bold text-amber-700">
                {publicIP}
              </code>
              <button onClick={copyIP} className="text-amber-600 hover:text-amber-800 underline text-xs">
                Copy IP
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* ... (Rest of the UI) */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className={`font-medium ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                {isActive ? 'Online - Tunnel Active' : 'Offline - Tunnel Inactive'}
              </span>
            </div>

            {isActive && (
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-100">
                Secure Connection
              </span>
            )}
          </div>

          {!isActive ? (
            <div className="max-w-md mx-auto py-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                  <Lock className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Setup Access Password</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Create a password to protect your remote session.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Session Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                    placeholder="Enter password..."
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    {error}
                  </p>
                )}

                <button
                  onClick={toggleTunnel}
                  disabled={loading || !password}
                  className="w-full py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
                >
                  <Power className="w-5 h-5" />
                  {loading ? 'Starting Tunnel...' : 'Start Remote Access'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Public Access URL</h3>

              <div className="flex items-center gap-2 mb-6">
                <div className="flex-1 bg-white p-4 rounded-lg border border-slate-200 font-mono text-indigo-600 truncate">
                  {url}
                </div>
                <button
                  onClick={copyToClipboard}
                  className="p-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all active:scale-95"
                  title="Copy URL"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                </button>
                <a
                  href={url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 transition-all"
                  title="Open URL"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={toggleTunnel}
                  disabled={loading}
                  className="px-6 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-medium transition-all flex items-center gap-2"
                >
                  <Power className="w-4 h-4" />
                  {loading ? 'Stopping...' : 'Stop & Close Tunnel'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600">
              <p className="font-semibold text-slate-800 mb-1">Security Notice</p>
              <p>Your local server is exposed to the internet. Access is protected by your session password. Do not share your URL or password with untrusted parties. The tunnel will automatically close if the server restarts.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
