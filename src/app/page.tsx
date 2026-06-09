"use client";

import Link from "next/link";
import {
  Search,
  Globe,
  Settings,
  ArrowRight,
  Zap,
  PenLine,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function Home() {
  const { t } = useLanguage();
  const features = [
    {
      href: "/read",
      icon: Globe,
      title: "Unified Dashboard",
      description:
        "Combine Read and Write operations in a single persistent view with multi-monitoring support.",
      color: "emerald",
      tags: ["FC01-04", "FC05-06", "Real-time"],
    },
    {
      href: "/dashboard",
      icon: LayoutGrid,
      title: t("nav_dashboard"),
      description: t("dashboard_subtitle"),
      color: "violet",
      tags: ["Multi-Device", "Card View", "Sequential Polling"],
    },
    {
      href: "/scan",
      icon: Search,
      title: t("nav_scan"),
      description: t("home_scan_desc"),
      color: "cyan",
      tags: ["Discovery"],
    },
    {
      href: "/change-address",
      icon: Settings,
      title: t("nav_change_id"),
      description: t("home_change_id_desc"),
      color: "amber",
      tags: ["Config"],
    },
    {
      href: "/remote",
      icon: PenLine,
      title: t("nav_remote"),
      description:
        "Access and control your Modbus devices remotely via secure tunnel.",
      color: "purple",
      tags: ["Remote"],
    },
  ];

  return (
    <div className="py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-block p-6 instrument-panel-strong mb-8 animate-in zoom-in duration-500">
          <img src="/logo.png" alt="ModScan Pro" className="w-24 h-24" />
        </div>
        <h1 className="text-5xl font-bold text-app-text mb-2 tracking-tight">
          {t("home_title")}{" "}
          <span className="text-instrument-accent">Community</span>
        </h1>
        <div className="mb-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-instrument-full text-xs font-medium bg-instrument-ok/10 text-instrument-ok border border-instrument-ok/20">
            Open Source Edition
          </span>
        </div>
        <p className="text-lg text-app-muted max-w-xl mx-auto">
          Experience the most advanced open-source Modbus management suite with
          real-time monitoring and control.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-instrument-full bg-app-muted/10 text-xs font-medium text-app-muted">
          <span>2edge.co</span>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <Link
              key={feature.href}
              href={feature.href}
              className={`group block p-5 instrument-panel hover:border-instrument-accent transition-all duration-300 hover:shadow-panel`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-3 instrument-panel bg-instrument-accent/5 border-instrument-accent/20 text-instrument-accent group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-app-text mb-1 flex items-center gap-2">
                    {feature.title}
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-app-muted" />
                  </h2>
                  <p className="text-app-muted text-sm mb-2">
                    {feature.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {feature.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-instrument bg-app-muted/10 text-xs text-app-muted border border-app-border"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* What's New */}
      <div className="mt-6 p-5 instrument-panel max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-instrument-accent" />
            <h3 className="text-sm font-semibold text-app-text">{t("whats_new_title")}</h3>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-instrument font-mono bg-instrument-accent/10 text-instrument-accent border border-instrument-accent/20">
            v1.1.0
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-instrument-ok" />
            <div>
              <p className="text-sm font-medium text-app-text">{t("whats_new_diag_title")}</p>
              <p className="text-xs text-app-muted leading-relaxed">{t("whats_new_diag_desc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" />
            <div>
              <p className="text-sm font-medium text-app-text">{t("whats_new_float_title")}</p>
              <p className="text-xs text-app-muted leading-relaxed">{t("whats_new_float_desc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" />
            <div>
              <p className="text-sm font-medium text-app-text">{t("whats_new_exception_title")}</p>
              <p className="text-xs text-app-muted leading-relaxed">{t("whats_new_exception_desc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" />
            <div>
              <p className="text-sm font-medium text-app-text">{t("whats_new_sponsor_title")}</p>
              <p className="text-xs text-app-muted leading-relaxed">{t("whats_new_sponsor_desc")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="mt-6 p-5 instrument-panel max-w-4xl mx-auto">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-app-text mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-app-text mb-1">
              Persistent Workspace
            </h3>
            <p className="text-sm text-app-muted">
              Your settings, read ranges, and dashboard layout are automatically
              saved. Switching between pages no longer loses your
              configurations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
