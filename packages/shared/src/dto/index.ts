import { RequestCategory, RequestPriority, RequestStatus } from '../enums/index.js';

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface CreateSolicitudRequestDto {
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
  requesterArea?: string;
  justification?: string;
}

export interface UpdateSolicitudStatusRequestDto {
  status: RequestStatus;
  comment?: string;
  assignedAnalystId?: string;
  estimatedHours?: number;
}

export interface RevokeSessionRequestDto {
  sessionId: string;
}

export interface QuerySolicitudesDto {
  status?: RequestStatus;
  priority?: RequestPriority;
  category?: RequestCategory;
  assignedToMe?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserRequestDto {
  email: string;
  fullName: string;
  password: string;
  role: string;
  area: string;
}

export interface UpdateUserStatusRequestDto {
  isActive?: boolean;
  isLocked?: boolean;
}

export interface ChangePasswordRequestDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequestDto {
  fullName: string;
  jobTitle?: string;
  area: string;
}

export interface AssignAnalystRequestDto {
  analystId: string;
  comment?: string;
}

export interface AddCommentRequestDto {
  comment: string;
}
