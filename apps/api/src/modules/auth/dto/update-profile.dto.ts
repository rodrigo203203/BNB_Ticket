import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Rodrigo Mendoza', description: 'Nombre completo institucional' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(3)
  @MaxLength(100)
  fullName!: string;

  @ApiPropertyOptional({ example: 'Analista Senior de Datos', description: 'Cargo funcional' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiProperty({ example: 'Ingeniería y Modelado de Datos', description: 'Área o gerencia' })
  @IsString()
  @IsNotEmpty({ message: 'El área es obligatoria' })
  @MinLength(2)
  @MaxLength(120)
  area!: string;
}
