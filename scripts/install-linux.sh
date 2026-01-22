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
cat > /tmp/$SERVICE_NAME.service << EOL
[Unit]
Description=ModScan Pro Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=$(which node) $APP_DIR/server.js
Restart=on-failure
Environment=PORT=$PORT
Environment=NODE_ENV=production

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
