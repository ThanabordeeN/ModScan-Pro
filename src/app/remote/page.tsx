"use client";

import { useState, useEffect } from "react";
import {
  Lock,
  Power,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Globe,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { tunnelAPI } from "@/lib/electron-api";

export default function RemotePage() {
  const { t } = useLanguage();

  const [isActive, setIsActive] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const [publicIP, setPublicIP] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
    checkPublicIP();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkPublicIP = async () => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      setPublicIP(data.ip);
    } catch {
      // Silently fail if public IP cannot be fetched
    }
  };

  const checkStatus = async () => {
    try {
      const data = await tunnelAPI.status();
      setIsActive(data.isActive);
      setUrl(data.url);
    } catch {
      console.error("Failed to check status");
    }
  };

  // ... (toggleTunnel and copyToClipboard function remain same)

  const toggleTunnel = async () => {
    setLoading(true);
    setError("");

    try {
      if (isActive) {
        // Stop
        await tunnelAPI.control("stop");
        setIsActive(false);
        setUrl(null);
        setPassword("");
      } else {
        // StarttoggleTunnel
        if (!password) {
          setError("Password is required");
          setLoading(false);
          return;
        }

        const data = await tunnelAPI.control("start", password);

        if (data.success && data.url) {
          setIsActive(true);
          setUrl(data.url);
        } else {
          setError(data.error || "Failed to start tunnel");
        }
      }
    } catch {
      setError("Connection failed");
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
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 instrument-panel bg-instrument-accent/5 border-instrument-accent/20 text-instrument-accent flex items-center justify-center">
          <Globe className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-app-text">
            {t("nav_remote")}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-app-muted">
              Securely access your Modbus network remotely
            </p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
              Powered by Cloudflare Tunnel
            </span>
          </div>
        </div>
      </div>

      {publicIP && (
        <div className="bg-amber-50 dark:instrument-accent/20 border border-amber-200 dark:border-amber-800 instrument-panel p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 instrument-accent dark:instrument-accent flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700 dark:text-slate-300">
            <p className="font-bold text-slate-900 dark:text-slate-100 mb-1">
              First Time Access Code
            </p>
            <p className="mb-2">
              If asked for a &quot;Tunnel Password&quot; when opening the link,
              enter this Public IP:
            </p>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-instrument font-mono font-bold text-amber-700 dark:instrument-accent">
                {publicIP}
              </code>
              <button
                onClick={copyIP}
                className="instrument-accent dark:instrument-accent hover:text-amber-800 dark:hover:text-amber-300 underline text-xs"
              >
                Copy IP
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="instrument-panel shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* ... (Rest of the UI) */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-instrument-full ${isActive ? "instrument-accent animate-pulse" : "bg-slate-300 dark:bg-slate-600"}`}
              />
              <span
                className={`font-medium ${isActive ? "instrument-accent dark:instrument-accent" : "text-slate-500 dark:text-slate-400"}`}
              >
                {isActive
                  ? "Online - Tunnel Active"
                  : "Offline - Tunnel Inactive"}
              </span>
            </div>

            {isActive && (
              <span className="px-3 py-1 rounded-instrument-full bg-emerald-50 dark:instrument-accent/20 instrument-accent dark:instrument-accent text-xs font-medium border instrument-accent dark:instrument-accent">
                Secure Connection
              </span>
            )}
          </div>

          {!isActive ? (
            <div className="max-w-md mx-auto py-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-instrument-full bg-slate-50 dark:bg-slate-700 mb-4">
                  <Lock className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Setup Access Password
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Create a password to protect your remote session.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Session Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white dark:bg-slate-800 w-full px-4 py-3 instrument-input border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:instrument-accent transition-all font-mono"
                    placeholder="Enter password..."
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    {error}
                  </p>
                )}

                <button
                  onClick={toggleTunnel}
                  disabled={loading || !password}
                  className="w-full py-3 px-4 instrument-input bg-instrument-accent hover:bg-instrument-accent/90 disabled:bg-slate-200 dark:disabled:bg-slate-600 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
                >
                  <Power className="w-5 h-5" />
                  {loading ? "Starting Tunnel..." : "Start Remote Access"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 instrument-panel p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
                Public Access URL
              </h3>

              <div className="flex items-center gap-2 mb-6">
                <div className="flex-1 bg-white dark:bg-slate-800 p-4 instrument-input border border-slate-200 dark:border-slate-700 font-mono instrument-accent dark:instrument-accent truncate">
                  {url}
                </div>
                <button
                  onClick={copyToClipboard}
                  className="p-4 instrument-input bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-all active:scale-95"
                  title="Copy URL"
                >
                  {copied ? (
                    <Check className="w-5 h-5 instrument-accent" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
                <a
                  href={url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 instrument-input bg-indigo-50 dark:instrument-accent/20 border instrument-accent dark:instrument-accent hover:instrument-accent dark:hover:instrument-accent/30 instrument-accent dark:instrument-accent transition-all"
                  title="Open URL"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={toggleTunnel}
                  disabled={loading}
                  className="px-6 py-2 instrument-input bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-medium transition-all flex items-center gap-2"
                >
                  <Power className="w-4 h-4" />
                  {loading ? "Stopping..." : "Stop & Close Tunnel"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 instrument-accent dark:instrument-accent flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                Security Notice
              </p>
              <p>
                Your local server is exposed to the internet. Access is
                protected by your session password. Do not share your URL or
                password with untrusted parties. The tunnel will automatically
                close if the server restarts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
