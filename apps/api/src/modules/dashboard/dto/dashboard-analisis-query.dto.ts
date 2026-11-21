import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

/** Parámetros de consulta del panel de análisis operativo (Spark B2). */
export class DashboardAnalisisQueryDto {
  @ApiPropertyOptional({ enum: ['7d', '30d', '90d', 'custom'], default: '30d' })
  @IsOptional()
  @IsIn(['7d', '30d', '90d', 'custom'])
  period?: '7d' | '30d' | '90d' | 'custom';

  @ApiPropertyOptional({ description: 'Inicio inclusive (ISO); obligatorio con period=custom' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Fin inclusive (ISO); obligatorio con period=custom' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Filtro por área solicitante (requesterArea)' })
  @IsOptional()
  @IsString()
  area?: string;
}