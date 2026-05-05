# ModScan Community

An open-source desktop Modbus RTU/TCP scanner, reader, writer, topology mapper, and diagnostic utility for technicians, system integrators, automation engineers, and developers.

## Features

- **Device Scanning** — Scan for Modbus devices across a range of slave addresses
- **Read/Write Operations** — Support for standard Modbus function codes: FC01, FC02, FC03, FC04, FC05, FC06, FC15, FC16
- **Dashboard Polling** — Monitor multiple registers across multiple devices in real time
- **Topology Mapping** — Visualize device topology on an RS-485 bus
- **Data Logging** — Export register values to CSV
- **Project Management** — Save and load device configurations and register aliases
- **Demo Mode** — Explore the UI without a physical device connected

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- USB-to-RS485 converter (for RTU) or network access (for TCP)

### Installation

```bash
git clone https://github.com/ThanabordeeN/modscan-pro.git
cd modscan-pro
npm install
```

### Run (web dev server)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run (Electron desktop app)

```bash
npm run electron:dev
```

### Build

```bash
npm run build
npm run electron:build
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, Lucide React |
| Desktop shell | Electron |
| Modbus protocol | `modbus-serial` |
| Tests | Jest, `@testing-library/react` |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines, branch naming, commit conventions, and architecture notes.

## Safety

ModScan can write to Modbus devices. Writing coils or registers may affect real equipment. See [SAFETY.md](./SAFETY.md) before use.

## Security

To report a vulnerability, see [SECURITY.md](./SECURITY.md).

## License

ModScan Community is licensed under the **GNU Affero General Public License v3.0 only (AGPL-3.0-only)**.

You may use, study, modify, and redistribute this software under the terms of the AGPLv3.

See [LICENSE](./LICENSE) for the full license text.

The **ModScan** name and **2edge** branding are trademarks and are not covered by AGPLv3. See [TRADEMARK.md](./TRADEMARK.md).

Copyright © 2026 2edge / Thanabordee N.
