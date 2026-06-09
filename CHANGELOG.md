# Changelog

All notable changes to ModScan Pro Community are documented here.

---

## [v1.1.0] — 2026-06-09

### New Features
- **Register Diagnostics** — Per-register diagnostic panel with per-device latency tracking for faster fault isolation

### Bug Fixes
- **Float64 DCBA** — Corrected byte-order handling for DCBA float64 register reads
- **Polling Exception Propagation** — Polling exceptions now surface to the user instead of silently failing
- **Sponsor Page** — Restored PromptPay QR code and fixed default language to English

---

## [v1.0.0] — 2026-05-05

### Initial Release

- **Device Scanner** — Discover Modbus RTU/TCP devices across address range 1–247
- **Read Dashboard** — Real-time polling of Holding Registers, Input Registers, Coils, and Discrete Inputs (FC01–FC04)
- **Write Operations** — Write single/multiple Coils and Registers (FC05, FC06, FC15, FC16) with confirmation
- **Address Change Wizard** — Change device Slave ID with automatic verify and retry
- **Network Topology** — Visual map of discovered devices (ReactFlow)
- **Remote Access** — Cloudflare Quick Tunnel for remote session sharing
- **CSV Data Logger** — Log real-time register values to CSV
- **Project Manager** — Save and restore workspace configurations
- **Diagnostic System** — Structured error log, write audit trail, and diagnostic bundle export
- **Multi-window** — Independent workspaces per window
- **Demo Mode** — Simulated devices for UI exploration without hardware
- **Thai/English UI**
