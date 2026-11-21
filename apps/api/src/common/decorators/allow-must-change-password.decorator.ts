import { SetMetadata } from '@nestjs/common';

/** Permite la ruta cuando el usuario tiene mustChangePassword activo. */
export const ALLOW_MUST_CHANGE_PASSWORD_KEY = 'allowMustChangePassword';
export const AllowMustChangePassword = () => SetMetadata(ALLOW_MUST_CHANGE_PASSWORD_KEY, true);