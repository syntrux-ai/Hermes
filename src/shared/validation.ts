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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !isRealDate(value)) {
    throw badRequest(`${field} must be YYYY-MM-DD`);
  }
};

export const assertTime = (value: string, field = 'time') => {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  const hours = match ? Number(match[1]) : Number.NaN;
  const minutes = match ? Number(match[2]) : Number.NaN;

  if (!match || hours > 23 || minutes > 59) {
    throw badRequest(`${field} must be HH:mm`);
  }
};

const isRealDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
