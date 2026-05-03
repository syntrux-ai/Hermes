export type TimePreference = {
  min?: number;
  max?: number;
};

const matchTime = (value: string) => {
  const match = value.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return undefined;

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase();

  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;

  return hour * 60 + minute;
};

export const parseTimePreference = (preference?: string): TimePreference => {
  if (!preference) return {};
  const value = preference.toLowerCase().trim();

  if (value.includes('morning')) return { min: 10 * 60, max: 12 * 60 };
  if (value.includes('afternoon')) return { min: 12 * 60, max: 17 * 60 };
  if (value.includes('evening')) return { min: 17 * 60 };

  if (value.includes('after')) {
    const time = matchTime(value);
    return time === undefined ? {} : { min: time };
  }

  if (value.includes('before')) {
    const time = matchTime(value);
    return time === undefined ? {} : { max: time };
  }

  const time = matchTime(value);
  return time === undefined ? {} : { min: time, max: time + 30 };
};

export const matchesTimePreference = (slotStartMinutes: number, preference: TimePreference) => {
  if (preference.min !== undefined && slotStartMinutes < preference.min) return false;
  if (preference.max !== undefined && slotStartMinutes > preference.max) return false;
  return true;
};
