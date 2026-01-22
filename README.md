# Modbus Scanner & Configuration Tool

A comprehensive tool for scanning, configuring, and managing Modbus RTU devices. Designed for System Integrators (SIs) and engineers.

## Features

- **Device Scanning**: Quickly scan for Modbus devices across a range of addresses.
- **Read/Write Operations**: Support for all standard Modbus function codes (FC01, FC02, FC03, FC04, FC05, FC06, FC15, FC16).
- **Address Configuration**: Change Modbus Slave IDs easily.
- **Licensing System**: Secure, node-locked licensing system for commercial distribution.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- USB-to-RS485 Converter

### Installation

1.  Clone the repository:

    ```bash
    git clone <repository-url>
    cd modbus-scanner
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

    _Note: This includes `node-machine-id` which requires a rebuild of some native modules._

3.  Run the development server:

    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Licensing System

This application is protected by a hardware-locked licensing system.

### How it Works

1.  On first launch, the user will be redirected to the **Activation Page**.
2.  The application displays a unique **Machine ID**.
3.  The user sends this Machine ID to the vendor (You).
4.  The vendor generates a **License Key** and sends it back.
5.  The user enters the key to unlock the application.

### Generating License Keys (For Vendor)

You can generate license keys using the included script.

1.  Get the **Machine ID** from the customer (e.g., `595f44f4-78d2-4d76-8e43-8515e0a0d631`).
2.  Run the key generator script:
    ```bash
    node scripts/keygen.js <MACHINE_ID>
    ```
3.  Copy the generated key output and send it to the customer.

### Security Note

- The system uses RSA 2048-bit signatures.
- **Private Key**: Located at `scripts/private_key.pem`. **KEEP THIS SAFE AND SECRET.** Do not distribute it.
- **Public Key**: Located at `src/lib/public_key.pem`. This is distributed with the app to verify keys.

## Development

- **Frontend**: Next.js 14, Tailwind CSS, Lucide React
- **Backend / API**: Next.js API Routes
- **Modbus Protocol**: `modbus-serial`
- **Hardware ID**: `node-machine-id`

## License

[Your License Type]
