import bcrypt from 'bcryptjs';
import { prisma } from '../database/prisma';
import { RoleType, ROLE_PERMISSIONS } from '../../shared/constants/roles';
import { AuthUser, LoginResponse } from '../../shared/types';
import { AuditService } from './audit.service';

// In-memory active session tokens for desktop IPC security
const activeSessions = new Map<string, AuthUser>();

export class AuthService {
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

    // Generate random secure session token
    const token = `sess_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    activeSessions.set(token, authUser);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
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
    const session = activeSessions.get(token);
    if (session) {
      await AuditService.log({
        userId: session.id,
        userName: session.username,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: session.id,
      });
      activeSessions.delete(token);
    }
    return true;
  }

  static getSession(token: string): AuthUser | null {
    return activeSessions.get(token) || null;
  }

  static requirePermission(token: string, permissionCode: string): AuthUser {
    const user = activeSessions.get(token);
    if (!user) {
      throw new Error('Authentication required. Please log in.');
    }
    if (!user.permissions.includes(permissionCode) && !user.roles.includes(RoleType.ADMINISTRATOR)) {
      throw new Error(`Forbidden: You do not have permission (${permissionCode}) to perform this action.`);
    }
    return user;
  }
}
