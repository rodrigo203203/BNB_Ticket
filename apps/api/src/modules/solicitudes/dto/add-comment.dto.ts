import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCommentDto {
  @ApiProperty({ example: 'Se completó la fase de extracción; iniciando validación de calidad.', description: 'Contenido del comentario o avance' })
  @IsString({ message: 'El comentario debe ser texto' })
  @IsNotEmpty({ message: 'El comentario no puede estar vacío' })
  @MinLength(3, { message: 'El comentario debe tener al menos 3 caracteres' })
  @MaxLength(1000, { message: 'El comentario no puede superar los 1000 caracteres' })
  comment!: string;
}
