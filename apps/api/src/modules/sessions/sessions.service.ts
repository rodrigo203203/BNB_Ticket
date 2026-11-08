import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserSession, AuditAction } from '@bnb/shared';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserSessions(userId: string, currentSessionId?: string): Promise<UserSession[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        isValid: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      deviceInfo: s.deviceInfo,
      isValid: s.isValid,
      isCurrent: s.id === currentSessionId,
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      lastActivityAt: s.lastActivityAt.toISOString(),
    }));
  }

  async revokeSession(sessionId: string, userId: string, isAdmin = false): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    if (session.userId !== userId && !isAdmin) {
      throw new ForbiddenException('No tiene permisos para revocar esta sesión');
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isValid: false },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        userEmail: session.user.email,
        action: AuditAction.SESSION_REVOKED,
        details: `Sesión ${sessionId} revocada manualmente.`,
      },
    }).catch(() => {});
  }

  async revokeOtherSessions(userId: string, currentSessionId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        id: { not: currentSessionId },
        isValid: true,
      },
      data: { isValid: false },
    });

    return result.count;
  }
}
