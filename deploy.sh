#!/bin/bash
# manage-figurio.sh
# Script to deploy or manage Figurio backend via SSH and PM2

# --- CONFIGURATION ---
SERVER_USER="root"
SERVER_HOST="104.248.248.66"
PROJECT_DIR="/var/www/figurio"
PM2_PROCESS_NAME="figurio-backend"

# --- USAGE ---
usage() {
    echo "Usage: $0 [-d | -s | -k | -r | -c | --change-database-structure | --clear-database]"
    echo "  -d    Deploy (git pull + restart backend)"
    echo "  -s    Start backend (PM2)"
    echo "  -k    Stop backend (PM2)"
    echo "  -r    Restart backend (PM2)"
    echo "  -c    Create new PM2 process for backend"
    echo "  --change-database-structure    Update database structure"
    echo "  --clear-database               Delete all data from all tables"
    exit 1
}

if [ $# -eq 0 ]; then
    usage
fi

ACTION=$1

# --- SCRIPT ---
ssh $SERVER_USER@$SERVER_HOST << EOF
    cd $PROJECT_DIR || exit
    case "$ACTION" in
        -d)
            echo "Deploying latest version..."
            git pull
            pm2 restart $PM2_PROCESS_NAME --update-env
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
        -r)
            echo "Restarting backend..."
            pm2 restart $PM2_PROCESS_NAME --update-env
            echo "Backend restarted."
            ;;
        -c)
            echo "Creating new PM2 process..."
            pm2 start app.js --name $PM2_PROCESS_NAME --env production
            echo "PM2 process created."
            ;;
        --change-database-structure)
            echo "Updating database structure..."
            node initDb.js
            echo "Database update done."
            ;;
        --clear-database)
            echo "Clearing all tables..."
            node -e "
                const db = require('./services/db');
                (async () => {
                    try {
                        await db.query('SET FOREIGN_KEY_CHECKS = 0');
                        await db.query('TRUNCATE TABLE events');
                        await db.query('TRUNCATE TABLE visits');
                        await db.query('TRUNCATE TABLE users');
                        await db.query('SET FOREIGN_KEY_CHECKS = 1');
                        console.log('All tables cleared successfully.');
                        process.exit(0);
                    } catch (err) {
                        console.error('Error clearing database:', err);
                        process.exit(1);
                    }
                })();
            "
            ;;
        *)
            echo "Invalid option."
            exit 1
            ;;
    esac
EOF
