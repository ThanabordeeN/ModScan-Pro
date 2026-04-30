# AGENTS.md — ModScan Pro

## Commands

| Task                     | Command                  |
| ------------------------ | ------------------------ |
| Dev (Next.js only)       | `npm run dev`            |
| Dev (Electron + Next.js) | `npm run electron:dev`   |
| Production build         | `npm run electron:build` |
| Pack (no installer)      | `npm run electron:pack`  |
| Test                     | `npm test`               |
| Lint                     | `npm run lint`           |

**Note:** `npm run electron:dev` runs Next.js on port 3000 and Electron on port 3456. The Electron main process proxies `/api/*` to itself and all other requests to the Next.js dev server.

## Architecture

**Hybrid Electron + Next.js.** The Electron main process (`electron/main.js`) is the single entrypoint. It:

1. Starts a unified HTTP server on port 3456
2. In **dev**: proxies to Next.js on port 3000, serves `/api/*` endpoints directly
3. In **prod**: serves static files from `out/` (Next.js static export)
4. Registers IPC handlers from `electron/ipc/*.js`

**Frontend** (`src/`) is a Next.js App Router app with `output: 'export'` in production. All hardware access goes through `src/lib/electron-api.ts`, which detects Electron vs web and routes to IPC or `fetch('/api/...')` accordingly.

### Key boundaries

| Path                              | Purpose                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `electron/main.js`                | Electron entrypoint, HTTP server, window management                                |
| `electron/preload.js`             | Exposes `window.electronAPI` with `windowId` from CLI args                         |
| `electron/ipc/modbus.js`          | `ModbusService` (shared logic) + `ModbusQueue` (sequential polling) + IPC handlers |
| `electron/ipc/serial.js`          | Serial port listing                                                                |
| `electron/ipc/tunnel.js`          | Cloudflare tunnel management                                                       |
| `electron/ipc/license.js`         | RSA license verification                                                           |
| `electron/ipc/logger.js`          | CSV logging to disk                                                                |
| `electron/ipc/project.js`         | Project file save/load via Electron `fs`                                           |
| `electron/ipc/update.js`          | Auto-update via `electron-updater`                                                 |
| `src/lib/electron-api.ts`         | Frontend API bridge — all IPC/fetch routing lives here                             |
| `src/lib/modbus.ts`               | Standalone Modbus utilities (used by tests, not by Electron IPC)                   |
| `src/lib/window-storage.ts`       | localStorage wrapper scoped per Electron window                                    |
| `src/context/ModbusContext.tsx`   | Central React context — scan, read, write, logging, process conflict manager       |
| `src/context/ProjectContext.tsx`  | Project state management                                                           |
| `src/context/LanguageContext.tsx` | Thai/English i18n                                                                  |

## Critical Gotchas

### Dual code paths for Modbus

- **Electron IPC** uses `electron/ipc/modbus.js` (`ModbusService`) — this is the production path
- **`src/lib/modbus.ts`** is a separate standalone implementation used only by tests and as reference
- Do NOT modify `src/lib/modbus.ts` expecting it to affect the Electron app. The real logic is in `electron/ipc/modbus.js`

### Multi-window state isolation

- Each Electron `BrowserWindow` gets a unique `windowId` via `--window-id=` CLI arg
- `preload.js` injects `windowId` into `window.electronAPI`
- `window-storage.ts` prefixes localStorage keys with `win_{windowId}_` to isolate state
- New windows opened with `?newWindow=true` start with clean state (no localStorage fallback)
- Dashboard queues (`dashboardQueues` Map) and scan abort flags are keyed by `windowId`
- When a window closes, `cleanupWindow(windowId)` in `main.js` stops its dashboard queue

### Next.js static export

- `next.config.mjs` sets `output: 'export'` in production — no SSR, no API routes
- All API calls must go through the Electron HTTP server (`/api/*` on port 3456)
- In dev, Next.js rewrites `/api/*` to `http://127.0.0.1:3456/api/*`
- `images.unoptimized: true` is required for static export

### Build artifacts

- `npm run build` → Next.js outputs to `out/`
- `npm run electron:build` → electron-builder packages from `out/` + `electron/` into `dist/`
- `electron-builder.yml` excludes `src/`, `.next/`, `*.ts`, `*.tsx` from the final bundle
- Native modules (`serialport`, `modbus-serial`) are `asarUnpack`ed

### Licensing

- Private key: `scripts/private_key.pem` — **never distribute**
- Public key: `src/lib/public_key.pem` — bundled as `extraResources` in production
- Key generation: `node scripts/keygen.js <MACHINE_ID>`
- `LicenseGuard` component blocks all app content until activated

### Testing

- Jest with `ts-jest`, `testEnvironment: 'node'`
- Test files: `**/*.test.ts` only (not `.test.tsx`)
- `@/` path alias maps to `<rootDir>/src/`
- Tests run against `src/lib/modbus.ts` and `src/lib/modbus-utils.ts`, NOT against Electron IPC
- `electron/ipc/modbus-queue.test.ts` tests the `ModbusQueue` class directly

### Scripts directory

- `scripts/keygen.js` — generate license keys from machine ID
- `scripts/generate-keys.js` — generate new RSA key pair
- `scripts/modbus-simulator.js` — local Modbus TCP simulator for testing
- `scripts/test-tcp.js` — TCP connectivity tester
- `scripts/private_key.pem` — RSA private key (keep secret)

### Process conflict manager

- `ModbusContext` tracks `activeProcess` ('none' | 'scan' | 'read' | 'topology')
- Starting a new process while another runs triggers a portal dialog asking to stop & switch
- Dashboard polling (`dashboardAPI.stop()`) must be called before switching away from read mode

### Remote/tunnel mode

- `localtunnel` + `cloudflared` binaries in `bin/` for remote access
- `RemoteGuard` component restricts functionality when accessed remotely
- Tunnel password verification uses `TunnelServiceManager` in `electron/ipc/tunnel.js`
- Remote API access goes through the HTTP server endpoints (not IPC)
