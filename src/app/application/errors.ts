import { spanish, TextParams } from './text';

/**
 * Errores que se le muestran a la persona. Llevan la clave del texto (errors.* en es.json) para que la interfaz los
 * traduzca; `message` queda en español para registros y pruebas.
 */
export class AppError extends Error {
  constructor(
    readonly key: string,
    readonly params?: TextParams,
  ) {
    super(spanish(key, params));
  }
}

export class ValidationError extends AppError {
  constructor(key: string, params?: TextParams) {
    super(`errors.${key}`, params);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(what: string) {
    super(`errors.notFound.${what}`);
    this.name = 'NotFoundError';
  }
}
