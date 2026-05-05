import crypto from 'node:crypto';
import util from 'node:util';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();
  const requestId = req.header('x-vercel-id') ?? crypto.randomUUID();
  const providerAgentId =
    typeof req.body?.provider_agent_id === 'string'
      ? req.body.provider_agent_id
      : typeof req.body?.agent_id === 'string'
        ? req.body.agent_id
        : undefined;

  res.on('finish', () => {
    logger.info('http_request', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs: Date.now() - startedAt,
      providerAgentId,
      userAgent: req.header('user-agent'),
    });
  });

  next();
};

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    logger.warn('handled_request_error', {
      method: req.method,
      path: req.originalUrl,
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      details: util.inspect(err.details, { depth: 6, breakLength: 160 }),
    });

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  logger.error('unhandled_request_error', {
    method: req.method,
    path: req.originalUrl,
    error: serializeError(err),
  });
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
