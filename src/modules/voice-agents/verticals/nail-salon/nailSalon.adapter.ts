import type { AvailabilityResponse, SlotOption } from '../../booking-core/booking.types.js';

export class NailSalonAdapter {
  formatAvailability(response: AvailabilityResponse) {
    const recommended = response.auto_assign_recommended;
    const alternatives =
      response.requested_time_available === false
        ? compactAlternatives(response.same_day_alternatives ?? [])
        : compactAlternatives(response.slots, recommended);
    const slots = response.requested_time_available === false ? alternatives : recommended ? [recommended, ...alternatives] : alternatives;

    return {
      available: response.available,
      service: response.service,
      date: response.date,
      duration_minutes: response.duration_minutes,
      requested_start_time: response.requested_start_time,
      requested_time_available: response.requested_time_available,
      preferred_resource_available: response.preferred_resource_available,
      preferred_resource_name: response.preferred_resource_name,
      preferred_resource_next_available: response.preferred_resource_next_available,
      same_day_alternatives: alternatives,
      slots,
      auto_assign_recommended: recommended,
      recommended,
      alternatives,
      resource_label: 'technician',
      message: buildAvailabilityMessage(response, recommended, alternatives),
    };
  }
}

const compactAlternatives = (slots: SlotOption[], recommended?: SlotOption) => {
  const seen = new Set<string>(recommended ? [recommended.start_time] : []);
  const alternatives: SlotOption[] = [];

  for (const slot of slots) {
    if (seen.has(slot.start_time)) continue;
    seen.add(slot.start_time);
    alternatives.push(slot);
    if (alternatives.length === 3) break;
  }

  return alternatives;
};

const buildAvailabilityMessage = (
  response: AvailabilityResponse,
  recommended?: SlotOption,
  alternatives: SlotOption[] = [],
) => {
  const serviceDate = `${response.service} on ${response.date}`;

  if (response.requested_start_time && response.requested_time_available && recommended) {
    return `${response.requested_start_time} is available for ${serviceDate} with ${recommended.resource_name}.`;
  }

  if (response.requested_start_time && response.requested_time_available === false) {
    if (alternatives.length > 0) {
      return `${response.requested_start_time} is not available for ${serviceDate}. The closest options are ${formatTimes(alternatives)}.`;
    }

    return `${response.requested_start_time} is not available for ${serviceDate}, and there are no nearby openings that day.`;
  }

  if (recommended) {
    const otherOptions = alternatives.length > 0 ? ` Other options are ${formatTimes(alternatives)}.` : '';
    return `${serviceDate} is available. The earliest option is ${recommended.start_time} with ${recommended.resource_name}.${otherOptions}`;
  }

  return `${serviceDate} is not available.`;
};

const formatTimes = (slots: SlotOption[]) => slots.map((slot) => slot.start_time).join(' or ');
