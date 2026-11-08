import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { RequestStatus } from '@bnb/shared';

export class UpdateSolicitudStatusDto {
  @ApiProperty({
    enum: RequestStatus,
    example: RequestStatus.EN_ANALISIS,
    description: 'Nuevo estado de la solicitud',
  })
  @IsEnum(RequestStatus, { message: 'Estado no válido' })
  @IsNotEmpty({ message: 'El nuevo estado es obligatorio' })
  status!: RequestStatus;

  @ApiPropertyOptional({
    example: 'Se inicia la fase de revisión y modelado en Databricks.',
    description: 'Comentario explicativo o bitácora del cambio de estado',
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({
    example: 'd9b2d63d-a238-4e12-88d3-5fa8c973a912',
    description: 'ID del analista asignado (solo Coordinador o Admin)',
  })
  @IsOptional()
  @IsString()
  assignedAnalystId?: string;

  @ApiPropertyOptional({
    example: 16,
    description: 'Estimación de horas de trabajo',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedHours?: number;
}
