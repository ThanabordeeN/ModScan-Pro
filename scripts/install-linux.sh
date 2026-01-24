#!/bin/bash

APP_DIR=$(pwd)
SERVICE_NAME="modscan"
PORT=3000

echo "Installing ModScan Pro Service..."
echo "Directory: $APP_DIR"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: 'npm' is not installed. Please install Node.js first."
    exit 1
fi

# Rebuild native modules for this system
echo "Rebuilding native modules (serialport) for this system..."
npm install --production --no-save

# Create Systemd Service File
# Determine correct NODE path for systemd
# We resolve the absolute path of the current node binary to avoid symlink/path issues
CURRENT_NODE=$(which node)
REAL_NODE_PATH=$(readlink -f "$CURRENT_NODE")

echo "Node found at: $CURRENT_NODE"
echo "Resolved Absolute Path: $REAL_NODE_PATH"

# Copy Node binary to local directory to avoid permission/SELinux issues
cp "$REAL_NODE_PATH" "$APP_DIR/node"
chmod +x "$APP_DIR/node"

# Attempt to set SELinux context (ignore failure if SELinux is disabled or chcon missing)
if command -v chcon &> /dev/null; then
    chcon -t bin_t "$APP_DIR/node" || echo "Warning: Failed to set SELinux context. This might be fine if SELinux is disabled."
fi

echo "Node binary bundled at: $APP_DIR/node"

# Create Systemd Service File
cat > /tmp/$SERVICE_NAME.service << EOL

[Unit]
Description=ModScan Pro Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=$APP_DIR/node $APP_DIR/server.js
Restart=on-failure
Environment=PORT=$PORT
Environment=NODE_ENV=production
# Add PATH to ensure other binaries are found
Environment=PATH=/usr/bin:/usr/local/bin

[Install]
WantedBy=multi-user.target
EOL

# Move to systemd and enable
sudo mv /tmp/$SERVICE_NAME.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl start $SERVICE_NAME

echo "-----------------------------------"
echo "Service Installed & Started!"
echo "Check status: sudo systemctl status $SERVICE_NAME"
echo "View logs:    sudo journalctl -u $SERVICE_NAME -f"
echo "Access App:   http://localhost:$PORT"
echo "-----------------------------------"
