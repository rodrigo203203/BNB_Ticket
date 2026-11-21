import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class UpdateFechaEntregaDto {
  @ApiProperty({
    example: '2026-12-15T00:00:00.000Z',
    description: 'Fecha de entrega comprometida por el analista (ISO 8601)',
  })
  @IsNotEmpty({ message: 'La fecha de entrega es obligatoria' })
  @IsDateString({}, { message: 'La fecha de entrega debe ser una fecha ISO válida' })
  fechaEntrega!: string;
}