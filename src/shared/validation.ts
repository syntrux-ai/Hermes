import { badRequest } from './errors.js';

export const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw badRequest(`${field} is required`);
  }

  return value.trim();
};

export const optionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return undefined;
  return value.trim();
};

export const assertDate = (value: string, field = 'date') => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw badRequest(`${field} must be YYYY-MM-DD`);
  }
};

export const assertTime = (value: string, field = 'time') => {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw badRequest(`${field} must be HH:mm`);
  }
};
