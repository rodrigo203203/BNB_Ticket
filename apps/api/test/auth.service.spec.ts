import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/modules/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { hashPassword } from '../src/common/utils/argon2.util';
import { Role } from '@bnb/shared';

describe('AuthService (Argon2id + Lockout + Sesiones)', () => {
  let authService: AuthService;
  let mockPrismaService: any;
  let mockJwtService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mocked_jwt_access_token'),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultVal: any) => {
        const config: Record<string, any> = {
          MAX_FAILED_LOGIN_ATTEMPTS: 5,
          LOCKOUT_DURATION_MINUTES: 15,
          SESSION_TTL_HOURS: 168,
          JWT_ACCESS_SECRET: 'test_secret_32_characters_long_key',
          JWT_ACCESS_EXPIRATION: '15m',
        };
        return config[key] ?? defaultVal;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('debe iniciar sesión exitosamente con credenciales válidas y generar sesión revocable', async () => {
    const rawPass = 'Password123!';
    const hashed = await hashPassword(rawPass);

    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 'user-uuid-1',
      email: 'solicitante@bnb.com.bo',
      fullName: 'Alejandro Torrico',
      passwordHash: hashed,
      role: Role.SOLICITANTE,
      area: 'Riesgos',
      isActive: true,
      isLocked: false,
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockPrismaService.session.create.mockResolvedValue({
      id: 'session-uuid-1',
      userId: 'user-uuid-1',
      isValid: true,
    });

    const result = await authService.login(
      { email: 'solicitante@bnb.com.bo', password: rawPass },
      { ipAddress: '127.0.0.1' },
    );

    expect(result.token).toBe('mocked_jwt_access_token');
    expect(result.response.user.email).toBe('solicitante@bnb.com.bo');
    expect(result.response.csrfToken).toBeDefined();
    expect(mockPrismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-uuid-1' },
        data: expect.objectContaining({ failedAttempts: 0, isLocked: false }),
      }),
    );
  });

  it('debe incrementar failedAttempts y rechazar en contraseña incorrecta', async () => {
    const rawPass = 'Password123!';
    const hashed = await hashPassword(rawPass);

    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 'user-uuid-1',
      email: 'solicitante@bnb.com.bo',
      passwordHash: hashed,
      role: Role.SOLICITANTE,
      area: 'Riesgos',
      isActive: true,
      isLocked: false,
      failedAttempts: 2,
    });

    await expect(
      authService.login(
        { email: 'solicitante@bnb.com.bo', password: 'WrongPassword!' },
        { ipAddress: '127.0.0.1' },
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockPrismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-uuid-1' },
        data: expect.objectContaining({ failedAttempts: 3, isLocked: false }),
      }),
    );
  });

  it('debe bloquear la cuenta temporalmente al alcanzar 5 intentos fallidos', async () => {
    const rawPass = 'Password123!';
    const hashed = await hashPassword(rawPass);

    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 'user-uuid-1',
      email: 'solicitante@bnb.com.bo',
      passwordHash: hashed,
      role: Role.SOLICITANTE,
      area: 'Riesgos',
      isActive: true,
      isLocked: false,
      failedAttempts: 4, // Intento 5 causará bloqueo
    });

    await expect(
      authService.login(
        { email: 'solicitante@bnb.com.bo', password: 'WrongPassword!' },
        { ipAddress: '127.0.0.1' },
      ),
    ).rejects.toThrow(/Cuenta bloqueada temporalmente por 15 minutos/);

    expect(mockPrismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-uuid-1' },
        data: expect.objectContaining({ failedAttempts: 5, isLocked: true }),
      }),
    );
  });
});
