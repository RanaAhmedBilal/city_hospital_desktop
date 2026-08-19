import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { AuditService } from './audit.service';

const execAsync = promisify(exec);

export class BackupService {
  private static backupDir = path.join(process.cwd(), 'backups');

  static getBackupDirectory(): string {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    return this.backupDir;
  }

  /**
   * Create an on-demand SQL dump backup of the PostgreSQL database
   */
  static async createBackup(authUserId: string): Promise<{ filename: string; sizeBytes: number; createdAt: string }> {
    const dir = this.getBackupDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `city_hospital_backup_${timestamp}.sql`;
    const targetFile = path.join(dir, filename);

    const cmd = `pg_dump -U postgres -h localhost -d city_hospital_db -f "${targetFile}"`;

    try {
      await execAsync(cmd, { env: { ...process.env, PGPASSWORD: 'root' } });
      const stats = fs.statSync(targetFile);

      await AuditService.log({
        userId: authUserId,
        action: 'DATABASE_BACKUP_CREATED',
        entityType: 'System',
        entityId: filename,
        newValue: { filename, sizeBytes: stats.size },
      });

      return {
        filename,
        sizeBytes: stats.size,
        createdAt: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error('Backup error:', err);
      throw new Error(`Database backup failed: ${err.message}`);
    }
  }

  /**
   * List all available backup archives
   */
  static async listBackups() {
    const dir = this.getBackupDirectory();
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql'));

    return files.map((filename) => {
      const fullPath = path.join(dir, filename);
      const stats = fs.statSync(fullPath);
      return {
        filename,
        sizeBytes: stats.size,
        createdAt: stats.birthtime.toISOString(),
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
