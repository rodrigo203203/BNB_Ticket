import {
  Controller,
  Get,
  Delete,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserSummary, Role } from '@bnb/shared';

@ApiTags('Gestión de Sesiones Revocables')
@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lista las sesiones activas y dispositivos del usuario actual' })
  async getMySessions(@CurrentUser() user: UserSummary, @Req() req: Request) {
    const currentSessionId = (req as any).sessionId;
    return this.sessionsService.getUserSessions(user.id, currentSessionId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoca inmediatamente una sesión específica' })
  async revokeSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: UserSummary,
  ) {
    const isAdmin = user.role === Role.ADMINISTRADOR;
    await this.sessionsService.revokeSession(sessionId, user.id, isAdmin);
    return { message: 'Sesión revocada exitosamente' };
  }

  @Delete('me/others')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoca todas las demás sesiones activas excepto la actual' })
  async revokeOtherSessions(@CurrentUser() user: UserSummary, @Req() req: Request) {
    const currentSessionId = (req as any).sessionId;
    const count = await this.sessionsService.revokeOtherSessions(user.id, currentSessionId);
    return { message: `Se han cerrado ${count} sesiones adicionales` };
  }
}
