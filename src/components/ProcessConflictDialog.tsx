"use client";

import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import type { ActiveProcess } from "@/context/ModbusContext";

interface ProcessConflictDialogProps {
  conflicting: ActiveProcess;
  incoming: ActiveProcess;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ProcessConflictDialog({
  conflicting,
  incoming,
  onConfirm,
  onCancel,
}: ProcessConflictDialogProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        animation: "fadeIn 200ms ease-out",
      }}
    >
      <div
        className="bg-white dark:bg-slate-800"
        style={{
          borderRadius: "1rem",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          width: "100%",
          maxWidth: "28rem",
          overflow: "hidden",
          animation: "scaleIn 200ms ease-out",
        }}
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="w-12 h-12 rounded-instrument-full bg-amber-100 dark:instrument-accent/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 instrument-accent dark:instrument-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              Process Conflict
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              The system is currently running a background process (
              <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                {conflicting}
              </span>
              ). Starting a new process (
              <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                {incoming}
              </span>
              ) requires stopping the current one.
            </p>
          </div>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 instrument-input hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 instrument-input hover:bg-slate-800 transition-colors"
          >
            Stop & Switch Process
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
