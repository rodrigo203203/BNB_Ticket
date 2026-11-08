import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserSummary } from '@bnb/shared';

@ApiTags('Autenticación y Seguridad')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicio de sesión seguro con Argon2id, cookie HttpOnly y protección contra fuerza bruta' })
  @SwaggerResponse({ status: 200, description: 'Sesión iniciada con éxito' })
  @SwaggerResponse({ status: 401, description: 'Credenciales inválidas o cuenta bloqueada temporalmente' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];

    const { token, response } = await this.authService.login(dto, { ipAddress, userAgent });

    const cookieName = this.configService.get<string>('COOKIE_NAME', 'bnb_session');
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const maxAge = response.expiresIn * 1000;

    // Cookie de sesión HttpOnly protegida contra robo XSS
    res.cookie(cookieName, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    // Cookie CSRF accesible para que Axios la lea y la envíe en cabecera X-CSRF-Token
    res.cookie('bnb_csrf_token', response.csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return response;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cierre de sesión seguro y revocación en base de datos' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = (req as any).sessionId;
    const user = (req as any).user;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];

    if (user?.id) {
      await this.authService.logout(sessionId, user.id, { ipAddress, userAgent });
    }

    const cookieName = this.configService.get<string>('COOKIE_NAME', 'bnb_session');
    res.clearCookie(cookieName, { path: '/' });
    res.clearCookie('bnb_csrf_token', { path: '/' });

    return { message: 'Sesión cerrada correctamente' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Obtiene el perfil y rol del usuario autenticado' })
  async getMe(@CurrentUser() user: UserSummary) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @ApiOperation({ summary: 'Cambiar la contraseña del usuario autenticado' })
  async changePassword(
    @CurrentUser() user: UserSummary,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
    return { message: 'Contraseña actualizada correctamente' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiOperation({ summary: 'Actualiza nombre, cargo y área del perfil del usuario autenticado' })
  async updateProfile(
    @CurrentUser() user: UserSummary,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiOperation({ summary: 'Sube o reemplaza la foto de perfil (JPEG, PNG o WebP, máx. 2 MB)' })
  async uploadAvatar(
    @CurrentUser() user: UserSummary,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.authService.uploadAvatar(user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('profile/avatar')
  @ApiOperation({ summary: 'Elimina la foto de perfil del usuario autenticado' })
  async deleteAvatar(@CurrentUser() user: UserSummary) {
    return this.authService.deleteAvatar(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile/avatar')
  @ApiOperation({ summary: 'Obtiene la foto de perfil del usuario autenticado' })
  async getMyAvatar(
    @CurrentUser() user: UserSummary,
    @Res() res: Response,
  ) {
    const avatar = await this.authService.getAvatarAbsolutePath(user.id);
    if (!avatar) {
      throw new NotFoundException('El usuario no tiene foto de perfil');
    }
    res.setHeader('Content-Type', avatar.mime);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.sendFile(avatar.filePath);
  }

  @Public()
  @Get('csrf')
  @ApiOperation({ summary: 'Obtiene un nuevo token CSRF' })
  async getCsrf(@Res({ passthrough: true }) res: Response) {
    const token = this.authService.generateCsrfToken();
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie('bnb_csrf_token', token, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400000,
    });

    return { csrfToken: token };
  }
}
