import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { RequestCategory, RequestPriority } from '@bnb/shared';

export class CreateSolicitudDto {
  @ApiProperty({
    example: 'Extracción de base de clientes morosos microcréditos 2025',
    description: 'Título descriptivo y conciso de la solicitud',
  })
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título de la solicitud es obligatorio' })
  @MinLength(5, { message: 'El título debe tener al menos 5 caracteres' })
  @MaxLength(200, { message: 'El título no puede superar los 200 caracteres' })
  title!: string;

  @ApiProperty({
    example: 'Se necesita dataset en formato CSV con campos de saldo, días de mora y garantías.',
    description: 'Descripción detallada del requerimiento analítico o técnico',
  })
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MinLength(10, { message: 'La descripción debe tener al menos 10 caracteres' })
  description!: string;

  @ApiProperty({
    enum: RequestCategory,
    example: RequestCategory.EXTRACCION_DATOS,
    description: 'Categoría técnica del requerimiento',
  })
  @IsEnum(RequestCategory, { message: 'Categoría no válida' })
  category!: RequestCategory;

  @ApiPropertyOptional({
    enum: RequestPriority,
    example: RequestPriority.MEDIA,
    default: RequestPriority.MEDIA,
    description: 'Prioridad solicitada',
  })
  @IsOptional()
  @IsEnum(RequestPriority, { message: 'Prioridad no válida' })
  priority?: RequestPriority;

  @ApiPropertyOptional({
    example: 'Requerido para la auditoría trimestral de riesgos crediticios.',
    description: 'Justificación del requerimiento',
  })
  @IsOptional()
  @IsString()
  justification?: string;
}
