#!/bin/bash
# manage-figurio.sh
# Script to deploy or manage Figurio backend via SSH and PM2

# --- CONFIGURATION ---
SERVER_USER="root"
SERVER_HOST="139.59.143.44"
PROJECT_DIR="/var/www/figurio"
PM2_PROCESS_NAME="figurio-backend"

# --- USAGE ---
usage() {
    echo "Usage: $0 [-d | -s | -k | -u]"
    echo "  -d    Deploy (git pull + restart backend)"
    echo "  -s    Start backend (PM2)"
    echo "  -k    Stop backend (PM2)"
    echo "  -u    Update database structure"
    exit 1
}

if [ $# -eq 0 ]; then
    usage
fi

# --- SCRIPT ---
ssh $SERVER_USER@$SERVER_HOST << EOF
    cd $PROJECT_DIR || exit
    case "$1" in
        -d)
            echo "Deploying latest version..."
            git pull
            pm2 restart $PM2_PROCESS_NAME
            echo "Deployment done."
            ;;
        -s)
            echo "Starting backend..."
            pm2 start $PM2_PROCESS_NAME
            echo "Backend started."
            ;;
        -k)
            echo "Stopping backend..."
            pm2 stop $PM2_PROCESS_NAME
            echo "Backend stopped."
            ;;
        -u)
            echo "Updating database structure..."
            node initDb.js
            echo "Database update done."
            ;;
        *)
            echo "Invalid option."
            exit 1
            ;;
    esac
EOF
