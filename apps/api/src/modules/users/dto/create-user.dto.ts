import { IsEmail, IsEnum, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'juan.perez@bnb.com.bo', description: 'Correo institucional del usuario' })
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  email!: string;

  @ApiProperty({ example: 'Juan Pérez Rodríguez', description: 'Nombre completo' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  fullName!: string;

  @ApiProperty({ example: 'Password123!', description: 'Contraseña inicial' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  @ApiProperty({ enum: Role, example: Role.ANALISTA, description: 'Rol asignado al usuario' })
  @IsEnum(Role, { message: 'El rol debe ser SOLICITANTE, ANALISTA, COORDINADOR o ADMINISTRADOR' })
  role!: Role;

  @ApiProperty({ example: 'Inteligencia de Negocios', description: 'Área o gerencia a la que pertenece' })
  @IsString({ message: 'El área debe ser una cadena de texto' })
  @MinLength(2, { message: 'El área debe tener al menos 2 caracteres' })
  area!: string;
}
