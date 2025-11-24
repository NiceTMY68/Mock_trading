# Database Backup Script for Windows PowerShell
# This script creates a PostgreSQL backup and optionally uploads it to S3
# Usage: .\backup-database.ps1 [-S3Bucket "bucket-name"]

param(
    [string]$S3Bucket = $env:S3_BUCKET,
    [string]$EncryptionKey = $env:ENCRYPTION_KEY
)

# Configuration
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "mock_trading" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DB_PASS = $env:DB_PASS
$BACKUP_DIR = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { "C:\backups\postgresql" }

# Create backup directory if it doesn't exist
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}

# Generate backup filename with timestamp
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = Join-Path $BACKUP_DIR "${DB_NAME}_${TIMESTAMP}.sql"
$BACKUP_FILE_COMPRESSED = "${BACKUP_FILE}.gz"

Write-Host "Starting database backup: ${DB_NAME} at $(Get-Date)"

# Set PGPASSWORD environment variable
if ($DB_PASS) {
    $env:PGPASSWORD = $DB_PASS
}

# Create backup using pg_dump
$pgDumpArgs = @(
    "-h", $DB_HOST
    "-p", $DB_PORT
    "-U", $DB_USER
    "-d", $DB_NAME
    "--no-owner"
    "--no-acl"
    "--format=plain"
    "-f", $BACKUP_FILE
)

& pg_dump $pgDumpArgs

if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_dump failed with exit code $LASTEXITCODE"
    exit 1
}

# Compress backup using 7-Zip or PowerShell compression
if (Get-Command Compress-Archive -ErrorAction SilentlyContinue) {
    Compress-Archive -Path $BACKUP_FILE -DestinationPath "${BACKUP_FILE}.zip" -Force
    Remove-Item $BACKUP_FILE
    $BACKUP_FILE_COMPRESSED = "${BACKUP_FILE}.zip"
    Write-Host "Backup compressed: ${BACKUP_FILE_COMPRESSED}"
} else {
    Write-Warning "Compression not available. Using uncompressed backup."
    $BACKUP_FILE_COMPRESSED = $BACKUP_FILE
}

# Encrypt backup if encryption key is provided
$BACKUP_FILE_FINAL = $BACKUP_FILE_COMPRESSED
if ($EncryptionKey) {
    # Note: Encryption requires additional tools or libraries
    # This is a placeholder - implement encryption as needed
    Write-Host "Encryption not implemented in PowerShell script. Use external tool or implement encryption."
}

# Upload to S3 if bucket is specified
if ($S3Bucket) {
    if (Get-Command aws -ErrorAction SilentlyContinue) {
        $S3_KEY = "backups/${DB_NAME}/$(Split-Path -Leaf $BACKUP_FILE_FINAL)"
        aws s3 cp $BACKUP_FILE_FINAL "s3://${S3Bucket}/${S3_KEY}"
        Write-Host "Backup uploaded to S3: s3://${S3Bucket}/${S3_KEY}"
    } else {
        Write-Warning "AWS CLI not found. Skipping S3 upload."
    }
}

# Clean up old backups (keep last 7 days)
$cutoffDate = (Get-Date).AddDays(-7)
Get-ChildItem -Path $BACKUP_DIR -Filter "${DB_NAME}_*" | 
    Where-Object { $_.LastWriteTime -lt $cutoffDate } | 
    Remove-Item -Force
Write-Host "Cleaned up backups older than 7 days"

Write-Host "Backup completed successfully at $(Get-Date)"
Write-Host "Backup file: ${BACKUP_FILE_FINAL}"

