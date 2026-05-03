import type { AvailabilityResponse } from '../../booking-core/booking.types.js';

export class NailSalonAdapter {
  formatAvailability(response: AvailabilityResponse) {
    return {
      ...response,
      resource_label: 'technician',
    };
  }
}
