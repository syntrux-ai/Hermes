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

type ErrorLike = {
  status?: number;
  statusCode?: number;
  type?: string;
  code?: string;
  message?: string;
};

export const normalizeError = (err: unknown): AppError => {
  if (err instanceof AppError) return err;

  if (isJsonParseError(err)) {
    return new AppError(400, 'Request body must be valid JSON', 'invalid_json');
  }

  if (isPayloadTooLargeError(err)) {
    return new AppError(413, 'Request body is too large', 'payload_too_large');
  }

  if (isSupabaseNetworkError(err)) {
    return new AppError(503, 'Database is temporarily unavailable', 'database_unavailable');
  }

  if (isPostgrestError(err)) {
    return normalizePostgrestError(err);
  }

  return new AppError(500, 'Unexpected server error', 'internal_error');
};

const isJsonParseError = (err: unknown) => {
  const error = err as ErrorLike;
  return error?.type === 'entity.parse.failed' || (err instanceof SyntaxError && error?.status === 400);
};

const isPayloadTooLargeError = (err: unknown) => {
  const error = err as ErrorLike;
  return error?.type === 'entity.too.large' || error?.status === 413 || error?.statusCode === 413;
};

const isSupabaseNetworkError = (err: unknown) =>
  err instanceof TypeError && /fetch failed|network|terminated/i.test(err.message);

const isPostgrestError = (err: unknown): err is { code: string; message: string; details?: string; hint?: string } => {
  const error = err as ErrorLike;
  return typeof error?.code === 'string' && typeof error?.message === 'string';
};

const normalizePostgrestError = (error: { code: string; message: string; details?: string }) => {
  if (error.code === '23505') {
    return conflict('A matching record already exists', { database_code: error.code });
  }

  if (error.code === '23503') {
    return badRequest('Referenced record was not found', { database_code: error.code });
  }

  if (error.code === '23502' || error.code.startsWith('22')) {
    return badRequest('Request contains invalid data', { database_code: error.code });
  }

  if (error.code === '42501') {
    return new AppError(500, 'Database permissions are not configured correctly', 'database_error');
  }

  return new AppError(500, 'Database request failed', 'database_error', { database_code: error.code });
};
