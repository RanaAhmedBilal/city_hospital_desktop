import { prisma } from '../database/prisma';

export interface CreateAuditLogParams {
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
  reason?: string | null;
  ipAddress?: string | null;
}

export class AuditService {
  static async log(params: CreateAuditLogParams, tx?: any) {
    const db = tx || prisma;
    try {
      await db.auditLog.create({
        data: {
          userId: params.userId || null,
          userName: params.userName || 'System',
          userRole: params.userRole || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId || null,
          oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
          newValue: params.newValue ? JSON.stringify(params.newValue) : null,
          reason: params.reason || null,
          ipAddress: params.ipAddress || '127.0.0.1',
        },
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }

  static async getLogs(filters: {
    entityType?: string;
    entityId?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.userId) where.userId = filters.userId;
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = new Date(filters.startDate);
      if (filters.endDate) where.timestamp.lte = new Date(filters.endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
        include: {
          user: {
            select: {
              fullName: true,
              username: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}
