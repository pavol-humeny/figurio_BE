#!/bin/bash
# update-figurio.sh
# Script to SSH into server, update Figurio backend via git pull and restart PM2

# --- CONFIGURATION ---
SERVER_USER="root"
SERVER_HOST="139.59.143.44"
PROJECT_DIR="/var/www/figurio"
PM2_PROCESS_NAME="figurio-backend"   # meno procesu v PM2

# --- SCRIPT ---
echo "Connecting to server $SERVER_HOST as $SERVER_USER..."
ssh $SERVER_USER@$SERVER_HOST << EOF
    echo "Navigating to project directory: $PROJECT_DIR"
    cd $PROJECT_DIR || exit
    echo "Pulling latest changes from Git..."
    git pull
    echo "Restarting backend with PM2..."
    pm2 restart $PM2_PROCESS_NAME
    echo "Update and restart finished!"
EOF

echo "Done."
