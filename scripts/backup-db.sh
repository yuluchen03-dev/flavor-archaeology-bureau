#!/bin/bash
# scripts/backup-db.sh

# 配置
BACKUP_DIR="./backups"
DB_PATH="./backend/data/flavor_archaeology.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.db"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
cp $DB_PATH $BACKUP_FILE

# 压缩备份
gzip $BACKUP_FILE

# 保留最近30天的备份
find $BACKUP_DIR -name "backup_*.db.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
