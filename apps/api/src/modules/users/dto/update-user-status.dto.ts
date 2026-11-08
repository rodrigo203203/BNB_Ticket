import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiPropertyOptional({ example: true, description: 'Estado activo o inactivo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Estado bloqueado o desbloqueado' })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;
}

