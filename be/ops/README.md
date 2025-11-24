# Operations Scripts

This directory contains operational scripts for database backups and maintenance.

## Database Backup Scripts

### Linux/macOS: `backup-database.sh`

Creates a PostgreSQL backup, optionally compresses and encrypts it, and uploads to S3.

**Prerequisites:**
- `pg_dump` (PostgreSQL client tools)
- `gzip` (for compression)
- `openssl` (for encryption, optional)
- `aws` CLI (for S3 upload, optional)

**Usage:**
```bash
# Basic backup
./backup-database.sh

# Backup and upload to S3
./backup-database.sh my-s3-bucket

# With environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=mock_trading
export DB_USER=postgres
export DB_PASS=your_password
export ENCRYPTION_KEY=your_encryption_key
export S3_BUCKET=my-backup-bucket
./backup-database.sh
```

**Environment Variables:**
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name (default: mock_trading)
- `DB_USER` - Database user (default: postgres)
- `DB_PASS` - Database password
- `BACKUP_DIR` - Backup directory (default: /var/backups/postgresql)
- `ENCRYPTION_KEY` - Encryption key for backup (optional)
- `S3_BUCKET` - S3 bucket name (optional)

**Cron Example:**
```bash
# Daily backup at 3 AM
0 3 * * * /path/to/backup-database.sh my-s3-bucket >> /var/log/db-backup.log 2>&1
```

### Windows: `backup-database.ps1`

PowerShell script for Windows environments.

**Prerequisites:**
- PostgreSQL client tools (`pg_dump`)
- PowerShell 5.1+ or PowerShell Core
- `aws` CLI (for S3 upload, optional)

**Usage:**
```powershell
# Basic backup
.\backup-database.ps1

# Backup and upload to S3
.\backup-database.ps1 -S3Bucket "my-s3-bucket"

# With environment variables
$env:DB_HOST = "localhost"
$env:DB_PORT = "5432"
$env:DB_NAME = "mock_trading"
$env:DB_USER = "postgres"
$env:DB_PASS = "your_password"
$env:ENCRYPTION_KEY = "your_encryption_key"
.\backup-database.ps1
```

**Scheduled Task Example (Windows):**
```powershell
# Create scheduled task for daily backup at 3 AM
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\path\to\backup-database.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -TaskName "DatabaseBackup" -Action $action -Trigger $trigger
```

## Backup Strategy Recommendations

### 1. **Daily Full Backups**
- Run daily at off-peak hours (e.g., 2-3 AM)
- Keep last 7 days locally
- Upload to S3 with lifecycle policy:
  - Keep daily backups for 30 days
  - Keep weekly backups for 90 days
  - Keep monthly backups for 1 year

### 2. **Encryption**
- Always encrypt backups before uploading to S3
- Store encryption keys securely (e.g., AWS Secrets Manager, HashiCorp Vault)
- Use strong encryption keys (minimum 256 bits)

### 3. **S3 Lifecycle Policy**
```json
{
  "Rules": [
    {
      "Id": "BackupLifecycle",
      "Status": "Enabled",
      "Prefix": "backups/",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

### 4. **Backup Verification**
- Regularly test backup restoration
- Monitor backup success/failure
- Set up alerts for backup failures

### 5. **Point-in-Time Recovery (PITR)**
For critical production databases, consider:
- Continuous WAL archiving
- Point-in-time recovery setup
- Regular PITR testing

## Restore from Backup

### Linux/macOS:
```bash
# Decompress if needed
gunzip backup_file.sql.gz

# Decrypt if needed
openssl enc -aes-256-cbc -d -in backup_file.sql.gz.enc -out backup_file.sql.gz -pass pass:your_key

# Restore
psql -h localhost -U postgres -d mock_trading < backup_file.sql
```

### Windows:
```powershell
# Restore from backup
$env:PGPASSWORD = "your_password"
psql -h localhost -U postgres -d mock_trading -f backup_file.sql
```

## Monitoring and Alerts

Set up monitoring for:
- Backup success/failure
- Backup file size (detect anomalies)
- S3 upload success
- Disk space for backup directory
- Backup duration (detect performance issues)

## Security Best Practices

1. **Access Control:**
   - Restrict backup script execution to authorized users
   - Use least privilege principle for database user
   - Secure backup directory permissions

2. **Encryption:**
   - Encrypt backups at rest
   - Use TLS for S3 uploads
   - Rotate encryption keys regularly

3. **Key Management:**
   - Never hardcode credentials in scripts
   - Use environment variables or secret management systems
   - Rotate database passwords regularly

4. **Audit:**
   - Log all backup operations
   - Monitor access to backup files
   - Regular security audits

