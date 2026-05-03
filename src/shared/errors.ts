export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, code = 'app_error', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, message, 'bad_request', details);

export const unauthorized = (message = 'Unauthorized') =>
  new AppError(401, message, 'unauthorized');

export const forbidden = (message = 'Forbidden') =>
  new AppError(403, message, 'forbidden');

export const notFound = (message: string) =>
  new AppError(404, message, 'not_found');

export const conflict = (message: string, details?: unknown) =>
  new AppError(409, message, 'conflict', details);
