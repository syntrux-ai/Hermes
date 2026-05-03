export type TimeRange = {
  start: number;
  end: number;
};

export const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const addMinutesToTime = (time: string, minutes: number) =>
  minutesToTime(timeToMinutes(time) + minutes);

export const rangesOverlap = (a: TimeRange, b: TimeRange) => a.start < b.end && b.start < a.end;

export const subtractRanges = (base: TimeRange, busyRanges: TimeRange[]): TimeRange[] => {
  const sorted = busyRanges
    .filter((busy) => rangesOverlap(base, busy))
    .sort((a, b) => a.start - b.start);

  let free: TimeRange[] = [base];

  for (const busy of sorted) {
    free = free.flatMap((range) => {
      if (!rangesOverlap(range, busy)) return [range];

      const next: TimeRange[] = [];
      if (busy.start > range.start) next.push({ start: range.start, end: Math.min(busy.start, range.end) });
      if (busy.end < range.end) next.push({ start: Math.max(busy.end, range.start), end: range.end });
      return next;
    });
  }

  return free;
};

export const generateSlotStarts = (freeRanges: TimeRange[], durationMinutes: number, intervalMinutes: number) => {
  const slots: number[] = [];

  for (const range of freeRanges) {
    const alignedStart = Math.ceil(range.start / intervalMinutes) * intervalMinutes;
    for (let start = alignedStart; start + durationMinutes <= range.end; start += intervalMinutes) {
      slots.push(start);
    }
  }

  return slots;
};

export const getDayOfWeek = (date: string, timezone: string) => {
  const localNoonUtc = new Date(`${date}T12:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: timezone,
  }).format(localNoonUtc);

  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
};

export const getCurrentLocalDateTime = (timezone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
};
