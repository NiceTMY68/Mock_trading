#!/bin/bash

# Database Backup Script
# This script creates a PostgreSQL backup and optionally uploads it to S3
# Usage: ./backup-database.sh [s3-bucket-name]

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-mock_trading}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
S3_BUCKET="${1:-}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql"
BACKUP_FILE_COMPRESSED="${BACKUP_FILE}.gz"

# Set PGPASSWORD if provided
if [ -n "$DB_PASS" ]; then
    export PGPASSWORD="$DB_PASS"
fi

echo "Starting database backup: ${DB_NAME} at $(date)"

# Create backup using pg_dump
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    --format=plain \
    --file="$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"
echo "Backup compressed: ${BACKUP_FILE_COMPRESSED}"

# Encrypt backup if encryption key is provided
if [ -n "$ENCRYPTION_KEY" ]; then
    BACKUP_FILE_ENCRYPTED="${BACKUP_FILE_COMPRESSED}.enc"
    echo "$ENCRYPTION_KEY" | openssl enc -aes-256-cbc -salt -in "$BACKUP_FILE_COMPRESSED" -out "$BACKUP_FILE_ENCRYPTED" -pass stdin
    rm "$BACKUP_FILE_COMPRESSED"
    BACKUP_FILE_FINAL="$BACKUP_FILE_ENCRYPTED"
    echo "Backup encrypted: ${BACKUP_FILE_ENCRYPTED}"
else
    BACKUP_FILE_FINAL="$BACKUP_FILE_COMPRESSED"
fi

# Upload to S3 if bucket is specified
if [ -n "$S3_BUCKET" ]; then
    if command -v aws &> /dev/null; then
        S3_KEY="backups/${DB_NAME}/$(basename $BACKUP_FILE_FINAL)"
        aws s3 cp "$BACKUP_FILE_FINAL" "s3://${S3_BUCKET}/${S3_KEY}"
        echo "Backup uploaded to S3: s3://${S3_BUCKET}/${S3_KEY}"
        
        # Optionally remove local backup after successful upload
        # rm "$BACKUP_FILE_FINAL"
    else
        echo "Warning: AWS CLI not found. Skipping S3 upload."
    fi
fi

# Clean up old backups (keep last 7 days)
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz*" -type f -mtime +7 -delete
echo "Cleaned up backups older than 7 days"

echo "Backup completed successfully at $(date)"
echo "Backup file: ${BACKUP_FILE_FINAL}"

