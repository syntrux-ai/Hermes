import { describe, expect, it } from 'vitest';
import { assertDate, assertTime } from '../../src/shared/validation.js';

describe('validation', () => {
  it('accepts real ISO calendar dates', () => {
    expect(() => assertDate('2026-05-07')).not.toThrow();
    expect(() => assertDate('2028-02-29')).not.toThrow();
  });

  it('rejects impossible calendar dates', () => {
    expect(() => assertDate('2026-02-29')).toThrow('date must be YYYY-MM-DD');
    expect(() => assertDate('2026-13-01')).toThrow('date must be YYYY-MM-DD');
    expect(() => assertDate('2026-04-31')).toThrow('date must be YYYY-MM-DD');
  });

  it('accepts valid 24-hour HH:mm times', () => {
    expect(() => assertTime('00:00')).not.toThrow();
    expect(() => assertTime('23:59')).not.toThrow();
  });

  it('rejects impossible times', () => {
    expect(() => assertTime('24:00')).toThrow('time must be HH:mm');
    expect(() => assertTime('12:60')).toThrow('time must be HH:mm');
    expect(() => assertTime('9:30')).toThrow('time must be HH:mm');
  });
});
