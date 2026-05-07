import { describe, expect, it } from 'vitest';
import { AppError, normalizeError } from '../../src/shared/errors.js';

describe('normalizeError', () => {
  it('keeps existing AppError instances intact', () => {
    const error = new AppError(409, 'Already booked', 'conflict');

    expect(normalizeError(error)).toBe(error);
  });

  it('maps invalid JSON parser errors to a client error', () => {
    const error = Object.assign(new SyntaxError('Unexpected token }'), {
      status: 400,
      type: 'entity.parse.failed',
    });

    expect(normalizeError(error)).toMatchObject({
      statusCode: 400,
      code: 'invalid_json',
      message: 'Request body must be valid JSON',
    });
  });

  it('does not expose raw database errors', () => {
    const error = {
      code: 'PGRST000',
      message: 'connection failed with internal host details',
      details: 'raw database detail',
    };

    expect(normalizeError(error)).toMatchObject({
      statusCode: 500,
      code: 'database_error',
      message: 'Database request failed',
      details: { database_code: 'PGRST000' },
    });
  });

  it('maps duplicate database rows to conflict', () => {
    expect(normalizeError({ code: '23505', message: 'duplicate key value violates unique constraint' })).toMatchObject({
      statusCode: 409,
      code: 'conflict',
      message: 'A matching record already exists',
    });
  });
});
