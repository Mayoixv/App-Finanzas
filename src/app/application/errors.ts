export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} no encontrado`);
    this.name = 'NotFoundError';
  }
}
