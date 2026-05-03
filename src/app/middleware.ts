import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  logger.error('Unhandled request error', err);
  res.status(500).json({
    error: {
      code: 'internal_error',
      message: 'Unexpected server error',
      details: process.env.NODE_ENV === 'production' ? undefined : serializeError(err),
    },
  });
};

const serializeError = (err: unknown) => {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }

  return err;
};
