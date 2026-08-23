import bcrypt from 'bcryptjs';
import { prisma } from '../database/prisma';
import { RoleType, ROLE_PERMISSIONS } from '../../shared/constants/roles';
import { AuthUser, LoginResponse } from '../../shared/types';
import { AuditService } from './audit.service';

interface SessionRecord {
  user: AuthUser;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

// In-memory active session tokens for desktop IPC security
const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

const activeSessions = new Map<string, SessionRecord>();
let cleanupIntervalTimer: NodeJS.Timeout | null = null;

export class AuthService {
  /**
   * Start periodic background timer to evict expired session tokens
   */
  static startSessionCleanupTimer(intervalMs: number = CLEANUP_INTERVAL_MS): void {
    if (cleanupIntervalTimer) return;
    cleanupIntervalTimer = setInterval(() => {
      AuthService.cleanExpiredSessions();
    }, intervalMs);

    if (cleanupIntervalTimer.unref) {
      cleanupIntervalTimer.unref();
    }
  }

  /**
   * Evict all expired session tokens from memory
   */
  static cleanExpiredSessions(): number {
    const now = new Date();
    let evictedCount = 0;
    for (const [token, record] of activeSessions.entries()) {
      if (record.expiresAt <= now) {
        activeSessions.delete(token);
        evictedCount++;
      }
    }
    return evictedCount;
  }

  static async login(username: string, passwordPlain: string, ipAddress?: string): Promise<LoginResponse> {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        doctor: true,
      },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid username or password, or account is disabled.');
    }

    const isValid = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isValid) {
      await AuditService.log({
        userId: user.id,
        userName: user.username,
        action: 'FAILED_LOGIN_ATTEMPT',
        entityType: 'User',
        entityId: user.id,
        reason: 'Incorrect password supplied',
        ipAddress,
      });
      throw new Error('Invalid username or password.');
    }

    // Extract roles and permissions
    const roles: RoleType[] = user.roles.map((r) => r.role.name as RoleType);
    const permissionSet = new Set<string>();

    for (const r of user.roles) {
      // Add standard permissions from role mapping
      const staticPerms = ROLE_PERMISSIONS[r.role.name as RoleType] || [];
      staticPerms.forEach((p) => permissionSet.add(p));

      // Also add any explicit DB permissions
      r.role.permissions.forEach((rp) => permissionSet.add(rp.permission.code));
    }

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      roles,
      permissions: Array.from(permissionSet),
      doctorId: user.doctorId,
    };

    // Generate random secure session token with expiration timestamp
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEFAULT_SESSION_TTL_MS);
    const token = `sess_${user.id}_${now.getTime()}_${Math.random().toString(36).substring(2)}`;

    activeSessions.set(token, {
      user: authUser,
      createdAt: now,
      expiresAt,
      lastActivityAt: now,
    });

    // Ensure periodic cleanup timer is running
    AuthService.startSessionCleanupTimer();

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now },
    });

    await AuditService.log({
      userId: user.id,
      userName: user.username,
      userRole: roles.join(','),
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress,
    });

    return { user: authUser, token };
  }

  static async logout(token: string): Promise<boolean> {
    const record = activeSessions.get(token);
    if (record) {
      await AuditService.log({
        userId: record.user.id,
        userName: record.user.username,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: record.user.id,
      });
      activeSessions.delete(token);
    }
    return true;
  }

  static getSession(token: string): AuthUser | null {
    if (!token) return null;
    const record = activeSessions.get(token);
    if (!record) return null;

    const now = new Date();
    if (record.expiresAt <= now) {
      activeSessions.delete(token);
      return null;
    }

    // Refresh sliding session activity & expiry
    record.lastActivityAt = now;
    record.expiresAt = new Date(now.getTime() + DEFAULT_SESSION_TTL_MS);
    return record.user;
  }

  static requirePermission(token: string, permissionCode: string): AuthUser {
    const user = AuthService.getSession(token);
    if (!user) {
      throw new Error('Authentication required or session expired. Please log in.');
    }
    if (!user.permissions.includes(permissionCode) && !user.roles.includes(RoleType.ADMINISTRATOR)) {
      throw new Error(`Forbidden: You do not have permission (${permissionCode}) to perform this action.`);
    }
    return user;
  }
}
