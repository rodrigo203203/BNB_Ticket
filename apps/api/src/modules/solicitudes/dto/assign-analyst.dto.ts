import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignAnalystDto {
  @ApiProperty({ example: '58d05d8c-f6df-4024-b3c8-cb54febf6fb5', description: 'ID del analista/encargado asignado' })
  @IsUUID('4', { message: 'El ID del analista debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del analista es obligatorio' })
  analystId!: string;

  @ApiPropertyOptional({ example: 'Asignado para análisis de datos y modelado preliminar', description: 'Nota de asignación' })
  @IsOptional()
  @IsString({ message: 'El comentario debe ser texto' })
  comment?: string;
}
