/** @jsxImportSource react */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Heart,
  CreditCard,
  MessageCircle,
} from "lucide-react";
import { i18n, type Language } from "../lib/i18n";

interface DownloadPopupProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export default function DownloadPopup({
  isOpen,
  onClose,
  lang,
}: DownloadPopupProps) {
  const t = i18n[lang];
  const [selectedTier, setSelectedTier] = useState(0);

  const stripeTiers = [
    {
      price: "$3",
      url: "https://buy.stripe.com/dRm3cobTBf1Nf989Uq5EY03",
      desc: t.popup_tier_1_desc,
    },
    {
      price: "$5",
      url: "https://buy.stripe.com/7sY3coe1J3j57GGeaG5EY07",
      desc: t.popup_tier_2_desc,
    },
    {
      price: "$10",
      url: "https://buy.stripe.com/14A4gs6zhcTF9OOd6C5EY04",
      desc: t.popup_tier_3_desc,
    },
    {
      price: "$20",
      url: "https://buy.stripe.com/dRm14g4r98Dp5yy8Qm5EY05",
      desc: t.popup_tier_4_desc,
    },
    {
      price: "$50",
      url: "https://buy.stripe.com/7sYaEQ2j1bPBf98d6C5EY06",
      desc: t.popup_tier_5_desc,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="relative w-full max-w-lg bg-main-bg border border-border-ui shadow-2xl field-texture overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Terminal titlebar */}
              <div className="terminal-titlebar bg-main-bg flex items-center justify-between px-4 py-3 border-b border-border-ui">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                  </div>
                  <span className="text-[10px] font-mono text-muted-text uppercase tracking-tight">
                    {t.popup_title}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-border-ui/20 transition-colors"
                  aria-label={lang === "th" ? "ปิด" : "Close"}
                >
                  <X className="w-4 h-4 text-muted-text" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                {/* Payment Section — PromptPay (TH) or Stripe (international) */}
                {lang === "th" ? (
                  <div className="border border-border-ui p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-rose-500" />
                      <h3 className="text-sm font-bold text-main-text uppercase tracking-wider">
                        {t.popup_donate_title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-text mb-4 leading-relaxed">
                      {t.popup_donate_desc}
                    </p>
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-full max-w-[480px] aspect-square border border-border-strong bg-white p-4">
                        <img
                          src="/promptpay-qr.jpg"
                          alt="PromptPay QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-[13px] font-mono text-muted-text uppercase tracking-widest">
                        {lang === "th"
                          ? "สแกน QR เพื่อบริจาคผ่านพร้อมเพย์"
                          : "Scan QR for PromptPay"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="border border-border-ui p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="w-4 h-4 text-violet-500" />
                      <h3 className="text-sm font-bold text-main-text uppercase tracking-wider">
                        {t.popup_donate_title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-text mb-4 leading-relaxed">
                      {t.popup_donate_desc}
                    </p>

                    {/* Tier Selector */}
                    <div className="space-y-2 mb-4">
                      {stripeTiers.map((tier, i) => (
                        <button
                          key={tier.price}
                          type="button"
                          onClick={() => setSelectedTier(i)}
                          className={`w-full text-left p-3 border transition-colors ${
                            selectedTier === i
                              ? "border-violet-500 bg-violet-500/10"
                              : "border-border-ui hover:border-border-strong"
                          }`}
                        >
                          <div className="flex items-baseline gap-1 mb-1">
                            <span className="text-base font-bold text-main-text">
                              {tier.price}
                            </span>
                            <span className="text-[10px] font-mono text-muted-text uppercase">
                              /mo
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-text leading-relaxed">
                            {tier.desc}
                          </p>
                        </button>
                      ))}
                    </div>

                    {/* Selected Tier CTA */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-mono text-violet-500 uppercase tracking-tight">
                        {t.popup_tier_selected}
                      </p>
                      <a
                        href={stripeTiers[selectedTier].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 h-10 bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        {t.popup_donate_btn} — {stripeTiers[selectedTier].price}/mo
                      </a>
                    </div>
                  </div>
                )}

                {/* Discord Section */}
                <div className="border border-border-ui p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-bold text-main-text uppercase tracking-wider">
                      {t.popup_discord_title}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-text mb-4 leading-relaxed">
                    {t.popup_discord_desc}
                  </p>
                  <a
                    href="https://discord.gg/kBD4uD2XtH"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 h-10 px-4 bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t.popup_discord_btn}
                  </a>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border-ui" />
                  <span className="text-[9px] font-mono text-muted-text/40 uppercase tracking-wider">
                    {t.popup_divider}
                  </span>
                  <div className="h-px flex-1 bg-border-ui" />
                </div>

                {/* Download Button */}
                <a
                  href="https://github.com/ThanabordeeN/ModScan-Pro/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="flex w-full items-center justify-center gap-2 h-12 bg-brand-emerald text-white dark:text-slate-950 font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
                >
                  <Download className="w-4 h-4" />
                  {t.popup_download}
                </a>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
