"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ClipboardList,
  Download,
  MessageSquare,
  RefreshCw,
  Trash2,
  Info,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { diagnosticAPI } from "@/lib/electron-api";
import { isElectron } from "@/lib/electron-api";
import type { OperationalErrorLog, ActionLog, FeedbackCategory, AppInfo } from "@/types/diagnostic";

const SEVERITY_COLOR: Record<string, string> = {
  info: "text-blue-500",
  warning: "text-yellow-500",
  error: "text-red-500",
  critical: "text-red-700 font-bold",
};

const RISK_COLOR: Record<string, string> = {
  low: "text-green-500",
  medium: "text-yellow-500",
  high: "text-red-500",
};

const FEEDBACK_CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: "bug", label: "Bug / ข้อผิดพลาด" },
  { value: "device_not_found", label: "ไม่พบอุปกรณ์" },
  { value: "read_error", label: "อ่านค่าไม่ได้" },
  { value: "write_error", label: "เขียนค่าไม่ได้" },
  { value: "ui_issue", label: "ปัญหาหน้าจอ" },
  { value: "feature_request", label: "ขอฟีเจอร์ใหม่" },
  { value: "other", label: "อื่น ๆ" },
];

type Tab = "errors" | "actions" | "feedback" | "info";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function ErrorRow({ entry }: { entry: OperationalErrorLog }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-app-border rounded-instrument-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <span className={`text-xs font-semibold uppercase mt-0.5 w-16 flex-shrink-0 ${SEVERITY_COLOR[entry.severity] ?? "text-slate-500"}`}>
          {entry.severity}
        </span>
        <span className="text-xs text-app-muted w-20 flex-shrink-0">{timeAgo(entry.timestamp)}</span>
        <span className="text-xs text-slate-400 w-20 flex-shrink-0">{entry.module}</span>
        <span className="text-sm text-app-text flex-1">{entry.userMessage}</span>
        {open ? <ChevronDown className="w-4 h-4 text-app-muted flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-app-muted flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-app-border bg-slate-50 dark:bg-slate-900/50 space-y-2">
          <div className="text-xs text-app-muted mt-2">
            <span className="font-mono">{new Date(entry.timestamp).toISOString()}</span>
            {" · "}
            <span>{entry.action}</span>
          </div>
          {entry.rawError && (
            <pre className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2 overflow-x-auto whitespace-pre-wrap font-mono">
              {entry.rawError}
            </pre>
          )}
          {entry.context && Object.keys(entry.context).length > 0 && (
            <pre className="text-xs text-app-muted bg-app-bg rounded p-2 overflow-x-auto font-mono">
              {JSON.stringify(entry.context, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function ActionRow({ entry }: { entry: ActionLog }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-app-border last:border-0">
      <span className="text-xs text-app-muted w-20 flex-shrink-0">{timeAgo(entry.timestamp)}</span>
      <span className={`text-xs font-semibold w-14 flex-shrink-0 ${RISK_COLOR[entry.riskLevel] ?? "text-slate-500"}`}>
        {entry.riskLevel}
      </span>
      <span className="text-xs text-slate-400 w-20 flex-shrink-0">{entry.module}</span>
      <span className="text-sm text-app-text flex-1 font-mono">{entry.action}</span>
      <span className="text-xs text-app-muted flex-1 hidden md:block">{entry.description}</span>
      {entry.result && (
        <span className={`text-xs font-semibold ${entry.result === "success" ? "text-green-500" : entry.result === "failed" ? "text-red-500" : "text-slate-400"}`}>
          {entry.result}
        </span>
      )}
    </div>
  );
}

export default function DiagnosticsPage() {
  const [tab, setTab] = useState<Tab>("errors");
  const [errors, setErrors] = useState<OperationalErrorLog[]>([]);
  const [actions, setActions] = useState<ActionLog[]>([]);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("bug");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackIncludeDiag, setFeedbackIncludeDiag] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [errRes, actRes, infoRes] = await Promise.all([
      diagnosticAPI.getErrors(200),
      diagnosticAPI.getActions(200),
      diagnosticAPI.getInfo(),
    ]);
    if (errRes.success) setErrors(errRes.errors);
    if (actRes.success) setActions(actRes.actions);
    if (infoRes.success) setAppInfo(infoRes.info);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      diagnosticAPI.getErrors(200),
      diagnosticAPI.getActions(200),
      diagnosticAPI.getInfo(),
    ]).then(([errRes, actRes, infoRes]) => {
      if (!active) return;
      if (errRes.success) setErrors(errRes.errors);
      if (actRes.success) setActions(actRes.actions);
      if (infoRes.success) setAppInfo(infoRes.info);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function handleExportBundle() {
    setExporting(true);
    setExportMsg(null);
    const res = await diagnosticAPI.exportBundle();
    setExporting(false);
    if (res.cancelled) return;
    if (res.success) {
      setExportMsg(`Exported: ${res.filePath}`);
    } else {
      setExportMsg(`Error: ${res.error}`);
    }
  }

  async function handleClearErrors() {
    await diagnosticAPI.clearErrors();
    setErrors([]);
  }

  async function handleClearActions() {
    await diagnosticAPI.clearActions();
    setActions([]);
  }

  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;
    setSubmittingFeedback(true);
    setFeedbackMsg(null);
    const res = await diagnosticAPI.submitFeedback({
      category: feedbackCategory,
      userMessage: feedbackMessage,
      includeDiagnostics: feedbackIncludeDiag,
    });
    setSubmittingFeedback(false);
    if (res.cancelled) return;
    if (res.success) {
      setFeedbackMsg(`Saved to: ${res.filePath}`);
      setFeedbackMessage("");
    } else {
      setFeedbackMsg(`Error: ${res.error}`);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "errors", label: "Error Log", icon: AlertTriangle, count: errors.length },
    { id: "actions", label: "Action History", icon: ClipboardList, count: actions.length },
    { id: "feedback", label: "Feedback", icon: MessageSquare },
    { id: "info", label: "App Info", icon: Info },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Diagnostics</h1>
          <p className="text-sm text-app-muted mt-1">
            Error logs, action history, and diagnostic export tools
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-instrument-sm border border-app-border text-sm text-app-muted hover:text-app-text hover:border-slate-400 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {isElectron() && (
            <button
              onClick={handleExportBundle}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-instrument-sm bg-app-text text-app-surface text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Exporting…" : "Export Diagnostic Bundle"}
            </button>
          )}
        </div>
      </div>

      {exportMsg && (
        <div className={`text-sm px-4 py-2.5 rounded-instrument-sm border ${exportMsg.startsWith("Error") ? "border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20" : "border-green-300 text-green-700 bg-green-50 dark:bg-green-900/20"}`}>
          {exportMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-app-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? "border-app-text text-app-text"
                  : "border-transparent text-app-muted hover:text-app-text"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-app-muted">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error Log Tab */}
      {tab === "errors" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-app-muted">
              {errors.length === 0 ? "No errors recorded" : `${errors.length} error event(s)`}
            </p>
            {errors.length > 0 && (
              <button
                onClick={handleClearErrors}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
          {errors.length === 0 ? (
            <div className="text-center py-16 text-app-muted">
              <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No error events yet. Use the app to start collecting.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {errors.map((e) => (
                <ErrorRow key={e.id} entry={e} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action History Tab */}
      {tab === "actions" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-app-muted">
              {actions.length === 0 ? "No actions recorded" : `${actions.length} action(s)`}
            </p>
            {actions.length > 0 && (
              <button
                onClick={handleClearActions}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
          {actions.length === 0 ? (
            <div className="text-center py-16 text-app-muted">
              <ClipboardList className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No actions yet. Write operations and scans are logged here.</p>
            </div>
          ) : (
            <div className="border border-app-border rounded-instrument-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-app-border text-xs font-semibold text-app-muted uppercase tracking-wider">
                <span className="w-20">Time</span>
                <span className="w-14">Risk</span>
                <span className="w-20">Module</span>
                <span className="flex-1">Action</span>
                <span className="flex-1 hidden md:block">Description</span>
                <span className="w-14 text-right">Result</span>
              </div>
              {actions.map((a) => (
                <ActionRow key={a.id} entry={a} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feedback Tab */}
      {tab === "feedback" && (
        <div className="max-w-xl space-y-4">
          <p className="text-sm text-app-muted">
            Export a feedback report to share with the developer. Your report is saved locally — no data is sent automatically.
          </p>
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-app-text mb-1.5">Category</label>
              <select
                value={feedbackCategory}
                onChange={(e) => setFeedbackCategory(e.target.value as FeedbackCategory)}
                className="w-full px-3 py-2 rounded-instrument-sm border border-app-border bg-app-surface text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-instrument-accent/40"
              >
                {FEEDBACK_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text mb-1.5">Message</label>
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                rows={5}
                placeholder="Describe the issue or request..."
                className="w-full px-3 py-2 rounded-instrument-sm border border-app-border bg-app-surface text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-instrument-accent/40 resize-none"
              />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={feedbackIncludeDiag}
                onChange={(e) => setFeedbackIncludeDiag(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-app-text">Include diagnostic data (last 20 errors + actions)</span>
            </label>
            {feedbackMsg && (
              <div className={`text-sm px-4 py-2.5 rounded-instrument-sm border ${feedbackMsg.startsWith("Error") ? "border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20" : "border-green-300 text-green-700 bg-green-50 dark:bg-green-900/20"}`}>
                {feedbackMsg}
              </div>
            )}
            <button
              type="submit"
              disabled={submittingFeedback || !feedbackMessage.trim() || !isElectron()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-instrument-sm bg-app-text text-app-surface text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <MessageSquare className="w-4 h-4" />
              {submittingFeedback ? "Saving…" : "Export Feedback Report"}
            </button>
            {!isElectron() && (
              <p className="text-xs text-app-muted">Feedback export is only available in the desktop app.</p>
            )}
          </form>
        </div>
      )}

      {/* App Info Tab */}
      {tab === "info" && (
        <div className="max-w-lg space-y-3">
          {appInfo ? (
            <div className="border border-app-border rounded-instrument-sm overflow-hidden">
              {[
                { label: "App Version", value: appInfo.appVersion },
                { label: "OS", value: appInfo.os },
                { label: "Electron", value: appInfo.electronVersion },
                { label: "Node.js", value: appInfo.nodeVersion },
                { label: "Platform", value: appInfo.platform },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-4 px-4 py-3 border-b border-app-border last:border-0">
                  <span className="text-sm text-app-muted w-28 flex-shrink-0">{row.label}</span>
                  <span className="text-sm text-app-text font-mono">{row.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-app-muted">
              <Info className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">App info not available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
