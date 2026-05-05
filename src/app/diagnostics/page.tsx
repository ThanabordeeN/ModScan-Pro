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
  ExternalLink,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/i18n";
import { diagnosticAPI, isElectron } from "@/lib/electron-api";
import type {
  OperationalErrorLog,
  ActionLog,
  FeedbackCategory,
  AppInfo,
} from "@/types/diagnostic";

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
        <span
          className={`text-xs font-semibold uppercase mt-0.5 w-16 flex-shrink-0 ${SEVERITY_COLOR[entry.severity] ?? "text-slate-500"}`}
        >
          {entry.severity}
        </span>
        <span className="text-xs text-app-muted w-20 flex-shrink-0">
          {timeAgo(entry.timestamp)}
        </span>
        <span className="text-xs text-slate-400 w-20 flex-shrink-0">
          {entry.module}
        </span>
        <span className="text-sm text-app-text flex-1">{entry.userMessage}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-app-muted flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-app-muted flex-shrink-0" />
        )}
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

function ActionRow({
  entry,
  t,
}: {
  entry: ActionLog;
  t: (k: TranslationKey) => string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-app-border last:border-0">
      <span className="text-xs text-app-muted w-20 flex-shrink-0">
        {timeAgo(entry.timestamp)}
      </span>
      <span
        className={`text-xs font-semibold w-14 flex-shrink-0 ${RISK_COLOR[entry.riskLevel] ?? "text-slate-500"}`}
      >
        {entry.riskLevel}
      </span>
      <span className="text-xs text-slate-400 w-20 flex-shrink-0">
        {entry.module}
      </span>
      <span className="text-sm text-app-text flex-1 font-mono">
        {entry.action}
      </span>
      <span className="text-xs text-app-muted flex-1 hidden md:block">
        {entry.description}
      </span>
      {entry.result && (
        <span
          className={`text-xs font-semibold ${
            entry.result === "success"
              ? "text-green-500"
              : entry.result === "failed"
                ? "text-red-500"
                : "text-slate-400"
          }`}
        >
          {t(`diag_col_result`)} : {entry.result}
        </span>
      )}
    </div>
  );
}

export default function DiagnosticsPage() {
  const { t } = useLanguage();

  const [tab, setTab] = useState<Tab>("errors");
  const [errors, setErrors] = useState<OperationalErrorLog[]>([]);
  const [actions, setActions] = useState<ActionLog[]>([]);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const [feedbackCategory, setFeedbackCategory] =
    useState<FeedbackCategory>("bug");
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
    return () => {
      active = false;
    };
  }, []);

  async function handleExportBundle() {
    setExporting(true);
    setExportMsg(null);
    const res = await diagnosticAPI.exportBundle();
    setExporting(false);
    if (res.cancelled) return;
    setExportMsg(
      res.success
        ? `${t("diag_export_success")} ${res.filePath}`
        : `${t("diag_export_error")} ${res.error}`,
    );
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
      setFeedbackMsg(`${t("diag_export_success")} ${res.filePath}`);
      setFeedbackMessage("");
    } else {
      setFeedbackMsg(`${t("diag_export_error")} ${res.error}`);
    }
  }

  const feedbackCategories: { value: FeedbackCategory; labelKey: TranslationKey }[] = [
    { value: "bug", labelKey: "diag_feedback_cat_bug" },
    { value: "device_not_found", labelKey: "diag_feedback_cat_device" },
    { value: "read_error", labelKey: "diag_feedback_cat_read" },
    { value: "write_error", labelKey: "diag_feedback_cat_write" },
    { value: "ui_issue", labelKey: "diag_feedback_cat_ui" },
    { value: "feature_request", labelKey: "diag_feedback_cat_feature" },
    { value: "other", labelKey: "diag_feedback_cat_other" },
  ];

  const tabs: { id: Tab; labelKey: TranslationKey; icon: React.ElementType; count?: number }[] = [
    { id: "errors", labelKey: "diag_tab_errors", icon: AlertTriangle, count: errors.length },
    { id: "actions", labelKey: "diag_tab_actions", icon: ClipboardList, count: actions.length },
    { id: "feedback", labelKey: "diag_tab_feedback", icon: MessageSquare },
    { id: "info", labelKey: "diag_tab_info", icon: Info },
  ];

  const infoRows: { labelKey: TranslationKey; value: string }[] = appInfo
    ? [
        { labelKey: "diag_info_version", value: appInfo.appVersion },
        { labelKey: "diag_info_os", value: appInfo.os },
        { labelKey: "diag_info_electron", value: appInfo.electronVersion },
        { labelKey: "diag_info_node", value: appInfo.nodeVersion },
        { labelKey: "diag_info_platform", value: appInfo.platform },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">{t("diag_title")}</h1>
          <p className="text-sm text-app-muted mt-1">{t("diag_subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-instrument-sm border border-app-border text-sm text-app-muted hover:text-app-text hover:border-slate-400 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {t("diag_refresh")}
          </button>
          {isElectron() && (
            <button
              onClick={handleExportBundle}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-instrument-sm bg-app-text text-app-surface text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" />
              {exporting ? t("diag_exporting") : t("diag_export_bundle")}
            </button>
          )}
        </div>
      </div>

      {exportMsg && (
        <div
          className={`text-sm px-4 py-2.5 rounded-instrument-sm border ${
            exportMsg.startsWith(t("diag_export_error"))
              ? "border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20"
              : "border-green-300 text-green-700 bg-green-50 dark:bg-green-900/20"
          }`}
        >
          {exportMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-app-border">
        {tabs.map((tab_item) => {
          const Icon = tab_item.icon;
          return (
            <button
              key={tab_item.id}
              onClick={() => setTab(tab_item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === tab_item.id
                  ? "border-app-text text-app-text"
                  : "border-transparent text-app-muted hover:text-app-text"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(tab_item.labelKey)}
              {tab_item.count !== undefined && tab_item.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-app-muted">
                  {tab_item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error Log */}
      {tab === "errors" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-app-muted">
              {errors.length === 0
                ? t("diag_errors_none")
                : t("diag_errors_count").replace("{n}", String(errors.length))}
            </p>
            {errors.length > 0 && (
              <button
                onClick={handleClearErrors}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("diag_clear")}
              </button>
            )}
          </div>
          {errors.length === 0 ? (
            <div className="text-center py-16 text-app-muted">
              <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t("diag_errors_empty")}</p>
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

      {/* Action History */}
      {tab === "actions" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-app-muted">
              {actions.length === 0
                ? t("diag_actions_none")
                : t("diag_actions_count").replace("{n}", String(actions.length))}
            </p>
            {actions.length > 0 && (
              <button
                onClick={handleClearActions}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("diag_clear")}
              </button>
            )}
          </div>
          {actions.length === 0 ? (
            <div className="text-center py-16 text-app-muted">
              <ClipboardList className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t("diag_actions_empty")}</p>
            </div>
          ) : (
            <div className="border border-app-border rounded-instrument-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-app-border text-xs font-semibold text-app-muted uppercase tracking-wider">
                <span className="w-20">{t("diag_col_time")}</span>
                <span className="w-14">{t("diag_col_risk")}</span>
                <span className="w-20">{t("diag_col_module")}</span>
                <span className="flex-1">{t("diag_col_action")}</span>
                <span className="flex-1 hidden md:block">{t("diag_col_desc")}</span>
                <span className="w-20 text-right">{t("diag_col_result")}</span>
              </div>
              {actions.map((a) => (
                <ActionRow key={a.id} entry={a} t={t} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feedback */}
      {tab === "feedback" && (
        <div className="max-w-xl space-y-4">
          <p className="text-sm text-app-muted">{t("diag_feedback_desc")}</p>
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-app-text mb-1.5">
                {t("diag_feedback_category")}
              </label>
              <select
                value={feedbackCategory}
                onChange={(e) =>
                  setFeedbackCategory(e.target.value as FeedbackCategory)
                }
                className="w-full px-3 py-2 rounded-instrument-sm border border-app-border bg-app-surface text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-instrument-accent/40"
              >
                {feedbackCategories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {t(c.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text mb-1.5">
                {t("diag_feedback_message")}
              </label>
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                rows={5}
                placeholder={t("diag_feedback_message_placeholder")}
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
              <span className="text-sm text-app-text">
                {t("diag_feedback_include_diag")}
              </span>
            </label>

            {feedbackMsg && (
              <div
                className={`text-sm px-4 py-2.5 rounded-instrument-sm border ${
                  feedbackMsg.startsWith(t("diag_export_error"))
                    ? "border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20"
                    : "border-green-300 text-green-700 bg-green-50 dark:bg-green-900/20"
                }`}
              >
                {feedbackMsg}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={
                  submittingFeedback ||
                  !feedbackMessage.trim() ||
                  !isElectron()
                }
                className="flex items-center gap-2 px-4 py-2.5 rounded-instrument-sm bg-app-text text-app-surface text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 w-fit"
              >
                <Download className="w-4 h-4" />
                {submittingFeedback
                  ? t("diag_feedback_exporting")
                  : t("diag_feedback_export_btn")}
              </button>

              {isElectron() ? (
                <p className="text-sm text-app-muted flex items-center gap-1.5">
                  {t("diag_feedback_discord_hint")}{" "}
                  <a
                    href="https://discord.gg/kBD4uD2XtH"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-500 hover:text-indigo-600 font-medium inline-flex items-center gap-1"
                  >
                    {t("diag_feedback_discord_link")}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              ) : (
                <p className="text-xs text-app-muted">
                  {t("diag_feedback_web_only")}
                </p>
              )}
            </div>
          </form>
        </div>
      )}

      {/* App Info */}
      {tab === "info" && (
        <div className="max-w-lg space-y-3">
          {appInfo ? (
            <div className="border border-app-border rounded-instrument-sm overflow-hidden">
              {infoRows.map((row) => (
                <div
                  key={row.labelKey}
                  className="flex items-center gap-4 px-4 py-3 border-b border-app-border last:border-0"
                >
                  <span className="text-sm text-app-muted w-28 flex-shrink-0">
                    {t(row.labelKey)}
                  </span>
                  <span className="text-sm text-app-text font-mono">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-app-muted">
              <Info className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t("diag_info_unavailable")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
