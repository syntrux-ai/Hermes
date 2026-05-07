import crypto from 'node:crypto';
import util from 'node:util';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, normalizeError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';

type RequestWithId = Parameters<RequestHandler>[0] & { requestId?: string };

export const assignRequestId: RequestHandler = (req, res, next) => {
  const requestId = req.header('x-request-id') ?? req.header('x-vercel-id') ?? crypto.randomUUID();
  (req as RequestWithId).requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
};

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();
  const requestId = (req as RequestWithId).requestId ?? crypto.randomUUID();
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
  next(new AppError(404, `Route not found: ${req.method} ${req.path}`, 'route_not_found'));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = (req as RequestWithId).requestId;
  const appError = normalizeError(err);
  const logLevel = appError.statusCode >= 500 ? 'error' : 'warn';

  logger[logLevel]('request_error', {
    requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode: appError.statusCode,
    code: appError.code,
    message: appError.message,
    details: util.inspect(appError.details, { depth: 6, breakLength: 160 }),
    cause: err instanceof AppError ? undefined : serializeError(err),
  });

  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
      request_id: requestId,
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
