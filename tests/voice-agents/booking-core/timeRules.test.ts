import { describe, expect, it } from 'vitest';
import { matchesTimePreference, parseTimePreference } from '../../../src/modules/voice-agents/booking-core/timeRules.js';

describe('timeRules', () => {
  it('parses common spoken preferences', () => {
    expect(parseTimePreference('afternoon')).toEqual({ min: 720, max: 1020 });
    expect(parseTimePreference('after 4 pm')).toEqual({ min: 960 });
    expect(parseTimePreference('before 11:30')).toEqual({ max: 690 });
  });

  it('checks whether a slot matches a preference', () => {
    expect(matchesTimePreference(960, parseTimePreference('after 4 pm'))).toBe(true);
    expect(matchesTimePreference(900, parseTimePreference('after 4 pm'))).toBe(false);
  });
});
