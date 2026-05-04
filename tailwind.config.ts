import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-ibm-plex-sans-thai)",
          "var(--font-ibm-plex-sans)",
          "Inter",
          "Noto Sans Thai",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-ibm-plex-mono)",
          "JetBrains Mono",
          "IBM Plex Mono",
          "ui-monospace",
          "monospace",
        ],
      },
      colors: {
        app: {
          bg: "var(--app-bg)",
          surface: "var(--surface-1)",
          muted: "var(--text-muted)",
          border: "var(--border-subtle)",
          text: "var(--text-primary)",
        },
        instrument: {
          accent: "var(--accent)",
          ok: "var(--ok)",
          warn: "var(--warn)",
          danger: "var(--danger)",
        },
      },
      borderRadius: {
        instrument: "var(--radius-md)",
        "instrument-sm": "var(--radius-sm)",
        "instrument-lg": "var(--radius-lg)",
      },
      boxShadow: {
        instrument: "var(--shadow-instrument)",
        panel: "var(--shadow-panel)",
      },
    },
  },
  plugins: [],
};

export default config;
