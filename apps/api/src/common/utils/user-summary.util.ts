import { Role, UserSummary } from '@bnb/shared';

export const AVATAR_API_PATH = '/auth/profile/avatar';

type UserRecord = {
  id: string;
  email: string;
  fullName: string;
  jobTitle?: string | null;
  avatarPath?: string | null;
  role: string;
  area: string;
  isActive: boolean;
  isLocked: boolean;
  failedAttempts: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function mapUserToSummary(user: UserRecord): UserSummary {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    jobTitle: user.jobTitle ?? null,
    avatarUrl: user.avatarPath ? AVATAR_API_PATH : null,
    role: user.role as Role,
    area: user.area,
    isActive: user.isActive,
    isLocked: user.isLocked,
    failedAttempts: user.failedAttempts,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
