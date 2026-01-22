#!/bin/bash

# Ensure we are in the project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "Current Directory: $(pwd)"

# Clean previous build
rm -rf dist
mkdir -p dist

echo "Building ModScan Pro (Service)..."
npm run build

if [ $? -ne 0 ]; then
    echo "=========================================="
    echo "BUILD FAILED. Please check errors above."
    echo "=========================================="
    exit 1
fi

echo "Packaging for Service Deployment..."

# Copy Standalone build
if [ -d ".next/standalone" ]; then
    cp -r .next/standalone/* dist/
else
    echo "Error: .next/standalone not found. Did the build succeed with output: standalone?"
    exit 1
fi

# Copy static assets (Required for standalone)
mkdir -p dist/.next/static
if [ -d ".next/static" ]; then
    cp -r .next/static/* dist/.next/static/
fi

if [ -d "public" ]; then
    cp -r public dist/
fi

# Copy Scripts
cp scripts/install-linux.sh dist/
cp scripts/install-windows.bat dist/
cp scripts/keygen.js dist/
cp scripts/setup.iss dist/

# Create a README for the package
cat > dist/README.txt << EOL
ModScan Pro - Service Deployment Package
========================================

Usage:

Linux:
1.  Run 'chmod +x install-linux.sh'
2.  Run './install-linux.sh'
3.  Service will start automatically on port 3000.

Windows (Installer):
1.  Download 'nssm.exe' (https://nssm.cc/) and place it in this folder.
2.  Install 'Inno Setup' (https://jrsoftware.org/isdl.php).
3.  Right-click 'setup.iss' -> Compile.
4.  You will get a professional 'ModScanPro_Setup.exe'.

Windows (Manual Script):
1.  Right-click 'install-windows.bat' and Run as Administrator.
2.  Follow instructions.

NOTE:
If you have issues with Serial Port, you may need to run:
npm install --production
inside this folder to rebuild native modules for your specific OS.
EOL

echo "Build Complete! Files are in 'dist/' folder."
