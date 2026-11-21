import { IsOptional, IsString, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

/** Filtros del Gantt (boceto 03): analistas, áreas y estados. */
export class GanttQueryDto {
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? String(value).split(',') : undefined))
  @IsArray()
  @IsString({ each: true })
  analystIds?: string[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? String(value).split(',') : undefined))
  @IsArray()
  @IsString({ each: true })
  areas?: string[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? String(value).split(',') : undefined))
  @IsArray()
  @IsString({ each: true })
  statuses?: string[];
}