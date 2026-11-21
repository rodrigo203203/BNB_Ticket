import {
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { esFechaRequeridaPosteriorAHoy } from '@bnb/shared';

/**
 * Decorador class-validator: fecha ISO estrictamente posterior a hoy (America/La_Paz).
 */
export function IsFechaRequeridaFutura(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFechaRequeridaFutura',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && esFechaRequeridaPosteriorAHoy(value);
        },
        defaultMessage() {
          return (
            'La fecha requerida debe ser posterior al día de hoy ' +
            '(día calendario en zona America/La_Paz; no se acepta hoy ni fechas pasadas)'
          );
        },
      },
    });
  };
}