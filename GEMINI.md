# GEMINI.md - ModScan Pro Development Context

## Project Overview
**ModScan Pro** is a professional-grade Modbus RTU/TCP diagnostic and configuration tool. It is designed for System Integrators (SIs) and engineers to scan, read, write, and manage Modbus devices with a modern, user-friendly interface.

- **Type:** Desktop Application (Electron + Next.js)
- **Primary Tech Stack:** Next.js 16 (React 19), Electron 40, TypeScript, Tailwind CSS.
- **Core Functionality:**
    - **Device Scanning:** Auto-discovery of Modbus RTU devices on RS485 networks.
    - **Read/Write Operations:** Supports standard Function Codes (FC01, FC02, FC03, FC04, FC05, FC06, FC15, FC16).
    - **Address Management:** Specialized utility to change Modbus Slave IDs.
    - **Licensing:** Node-locked licensing system using RSA-2048 signatures.
    - **Remote Access:** Built-in tunneling via `cloudflared` for remote monitoring/control.

## Architecture
The project follows a hybrid architecture to support both local desktop usage and remote web access:

1.  **Electron Main Process (`electron/`):**
    - Manages native capabilities: Serial Port, Modbus protocol (`modbus-serial`), Hardware ID retrieval (`node-machine-id`), and Tunneling (`cloudflared`).
    - **Unified Server:** Runs a local HTTP server (Port 3456) in the main process.
        - In **Production**: Serves static Next.js files and provides a REST API.
        - In **Development**: Proxies requests to the Next.js dev server (Port 3000) but still provides the REST API.
    - **IPC Handlers:** Modules in `electron/ipc/` handle communication between the frontend and native services.

2.  **Next.js Frontend (`src/`):**
    - **App Router:** Pages for Scan, Read, Write, License, and Remote settings.
    - **Electron Bridge (`src/lib/electron-api.ts`):** A wrapper that detects if the app is running in Electron.
        - If **Electron**: Uses `window.electronAPI` (IPC).
        - If **Web (Remote)**: Falls back to `fetch` calls to the local REST API.

3.  **Licensing System:**
    - Uses `node-machine-id` to generate a unique Hardware ID.
    - Keys are RSA-signed. Private key (`scripts/private_key.pem`) is for the vendor; Public key (`src/lib/public_key.pem`) is distributed with the app.

## Key Directories
- `electron/`: Electron main process, preload script, and IPC handler modules.
- `src/app/`: Next.js pages and layouts (Frontend).
- `src/lib/`: Shared utilities, API wrappers, and licensing logic.
- `src/components/`: Reusable UI components (Modbus connection settings, Navigation, Guards).
- `scripts/`: Development utilities (Keygen, Modbus simulator, TCP testers).
- `bin/`: Platform-specific `cloudflared` binaries.

## Development Workflow

### Prerequisites
- Node.js (v18+)
- USB-to-RS485 Converter (for RTU testing) or a Modbus TCP simulator.

### Commands
- **Install Dependencies:** `npm install`
- **Development (Electron + Next.js):** `npm run electron:dev`
    - Runs Next.js on port 3000 and starts Electron.
- **Development (Next.js only):** `npm run dev`
- **Production Build:** `npm run electron:build`
    - Generates installers in the `dist/` directory.
- **Linting:** `npm run lint`

## Development Conventions
- **Language:** TypeScript for both Frontend and Backend (where possible, though Electron main uses JS).
- **Styling:** Tailwind CSS with a focus on a "Modern Industrial" aesthetic (Slate/Gray tones).
- **Modbus Protocol:** Always use the `ModbusService` abstraction in `electron/ipc/modbus.js` to ensure consistency between IPC and API calls.
- **Localization:** Supports English and Thai via `LanguageContext`.
- **Safety:** License verification is enforced via `LicenseGuard` component; Remote access is restricted via `RemoteGuard`.

## Troubleshooting & Verification
- **Serial Port Issues:** Ensure the port is not held open by another application (e.g., Serial Monitor).
- **License Issues:** Check `scripts/private_key.pem` exists when generating keys; ensure `public_key.pem` is correctly bundled in production.
- **Build Errors:** If native modules (like `serialport`) fail, try `npm rebuild`.
