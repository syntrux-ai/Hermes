import {
  generateSlotStarts,
  getCurrentLocalDateTime,
  getDayOfWeek,
  minutesToTime,
  subtractRanges,
  timeToMinutes,
  type TimeRange,
} from '../../../shared/time.js';
import type { TenantContext } from '../tenants/tenant.types.js';
import type { ResourceRecord, ServiceRecord, SlotOption } from './booking.types.js';
import { matchesTimePreference, parseTimePreference } from './timeRules.js';

type BusyRow = {
  resource_id: string | null;
  start_time: string;
  end_time: string;
};

type ResourceHourRow = {
  resource_id: string;
  start_time: string;
  end_time: string;
};

export type BuildAvailabilityInput = {
  context: TenantContext;
  service: ServiceRecord;
  resources: ResourceRecord[];
  date: string;
  locationHours: { open_time: string | null; close_time: string | null; is_closed: boolean } | null;
  resourceHours: ResourceHourRow[];
  bookings: BusyRow[];
  blockedSlots: BusyRow[];
  timePreference?: string;
};

export const buildAvailability = (input: BuildAvailabilityInput): SlotOption[] => {
  if (!input.locationHours || input.locationHours.is_closed) return [];
  if (!input.locationHours.open_time || !input.locationHours.close_time) return [];

  const preference = parseTimePreference(input.timePreference);
  const current = getCurrentLocalDateTime(input.context.timezone);
  const sameDayMinStart =
    current.date === input.date ? current.minutes + input.context.sameDayBufferMinutes : undefined;

  const locationRange: TimeRange = {
    start: timeToMinutes(input.locationHours.open_time),
    end: timeToMinutes(input.locationHours.close_time),
  };

  const resourceById = new Map(input.resources.map((resource) => [resource.id, resource]));
  const slots: SlotOption[] = [];

  for (const hour of input.resourceHours) {
    const resource = resourceById.get(hour.resource_id);
    if (!resource) continue;

    const workRange: TimeRange = {
      start: Math.max(timeToMinutes(hour.start_time), locationRange.start),
      end: Math.min(timeToMinutes(hour.end_time), locationRange.end),
    };

    if (workRange.start >= workRange.end) continue;

    const busyRanges = [...input.bookings, ...input.blockedSlots]
      .filter((busy) => busy.resource_id === null || busy.resource_id === resource.id)
      .map((busy) => ({
        start: timeToMinutes(busy.start_time),
        end: timeToMinutes(busy.end_time),
      }));

    const freeRanges = subtractRanges(workRange, busyRanges);
    const starts = generateSlotStarts(
      freeRanges,
      input.service.duration_minutes,
      input.context.slotIntervalMinutes,
    );

    for (const start of starts) {
      if (sameDayMinStart !== undefined && start < sameDayMinStart) continue;
      if (!matchesTimePreference(start, preference)) continue;

      slots.push({
        start_time: minutesToTime(start),
        end_time: minutesToTime(start + input.service.duration_minutes),
        resource_id: resource.id,
        resource_name: resource.name,
      });
    }
  }

  return slots.sort((a, b) => {
    const timeDiff = timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
    if (timeDiff !== 0) return timeDiff;
    return a.resource_name.localeCompare(b.resource_name);
  });
};

export const getAvailabilityDayOfWeek = (date: string, context: TenantContext) =>
  getDayOfWeek(date, context.timezone);
