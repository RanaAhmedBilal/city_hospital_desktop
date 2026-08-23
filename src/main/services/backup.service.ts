import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { promisify } from 'util';
import { AuditService } from './audit.service';

const execAsync = promisify(exec);

interface DbConnectionConfig {
  user: string;
  password: string;
  host: string;
  port: string;
  database: string;
}

export class BackupService {
  private static backupDir = path.join(process.cwd(), 'backups');

  static getBackupDirectory(): string {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    return this.backupDir;
  }

  /**
   * Dynamically parse connection parameters from DATABASE_URL
   */
  private static parseDatabaseUrl(): DbConnectionConfig {
    const urlString = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/city_hospital_db?schema=public';
    try {
      const parsed = new URL(urlString);
      return {
        user: parsed.username || 'postgres',
        password: parsed.password || '',
        host: parsed.hostname || 'localhost',
        port: parsed.port || '5432',
        database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'city_hospital_db',
      };
    } catch {
      return {
        user: 'postgres',
        password: '',
        host: 'localhost',
        port: '5432',
        database: 'city_hospital_db',
      };
    }
  }

  /**
   * Derive a 32-byte encryption key for AES-256-GCM
   */
  private static getEncryptionKey(): Buffer {
    const secret = process.env.BACKUP_ENCRYPTION_KEY || process.env.APP_SECRET || 'city_hospital_secure_backup_key_2026';
    return crypto.scryptSync(secret, 'city_hospital_backup_salt', 32);
  }

  /**
   * Encrypt a file using AES-256-GCM
   */
  private static async encryptFile(inputPath: string, outputPath: string): Promise<void> {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    // Write IV (12 bytes) first
    output.write(iv);

    await new Promise<void>((resolve, reject) => {
      input.on('error', reject);
      output.on('error', reject);
      output.on('finish', resolve);

      input.pipe(cipher).pipe(output);
    });

    // Append 16-byte Auth Tag
    const authTag = cipher.getAuthTag();
    fs.appendFileSync(outputPath, authTag);
  }

  /**
   * Create an on-demand encrypted SQL dump backup of the PostgreSQL database
   */
  static async createBackup(authUserId: string): Promise<{ filename: string; sizeBytes: number; createdAt: string; isEncrypted: boolean }> {
    const dir = this.getBackupDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tempFilename = `temp_${timestamp}.sql`;
    const encFilename = `city_hospital_backup_${timestamp}.sql.enc`;
    const tempFilePath = path.join(dir, tempFilename);
    const encFilePath = path.join(dir, encFilename);

    const dbConfig = this.parseDatabaseUrl();

    const cmd = `pg_dump -U "${dbConfig.user}" -h "${dbConfig.host}" -p "${dbConfig.port}" -d "${dbConfig.database}" -f "${tempFilePath}"`;

    const envVars = {
      ...process.env,
      PGPASSWORD: dbConfig.password,
    };

    try {
      await execAsync(cmd, { env: envVars });

      // Encrypt the SQL dump
      await this.encryptFile(tempFilePath, encFilePath);

      // Clean up raw unencrypted SQL dump file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      const stats = fs.statSync(encFilePath);

      await AuditService.log({
        userId: authUserId,
        action: 'DATABASE_BACKUP_CREATED',
        entityType: 'System',
        entityId: encFilename,
        newValue: { filename: encFilename, sizeBytes: stats.size, isEncrypted: true },
      });

      return {
        filename: encFilename,
        sizeBytes: stats.size,
        createdAt: new Date().toISOString(),
        isEncrypted: true,
      };
    } catch (err: any) {
      if (fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch {}
      }
      console.error('Backup error:', err);
      throw new Error(`Database backup failed: ${err.message}`);
    }
  }

  /**
   * List all available backup archives
   */
  static async listBackups() {
    const dir = this.getBackupDirectory();
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql') || f.endsWith('.sql.enc'));

    return files.map((filename) => {
      const fullPath = path.join(dir, filename);
      const stats = fs.statSync(fullPath);
      return {
        filename,
        sizeBytes: stats.size,
        createdAt: stats.birthtime.toISOString(),
        isEncrypted: filename.endsWith('.enc'),
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
