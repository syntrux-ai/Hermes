import { timeToMinutes } from '../../../shared/time.js';
import type { SlotOption } from './booking.types.js';

export class AssignmentService {
  chooseRecommendedSlot(slots: SlotOption[], bookingCounts: Record<string, number>, requestedStartTime?: string) {
    const candidates = requestedStartTime
      ? slots.filter((slot) => slot.start_time === requestedStartTime)
      : slots;

    return [...candidates].sort((a, b) => {
      const timeDiff = timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
      if (timeDiff !== 0) return timeDiff;

      const loadDiff = (bookingCounts[a.resource_id] ?? 0) - (bookingCounts[b.resource_id] ?? 0);
      if (loadDiff !== 0) return loadDiff;

      return a.resource_id.localeCompare(b.resource_id);
    })[0];
  }
}
