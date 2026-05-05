import { assertDate } from '../../../shared/validation.js';
import type { AvailabilityRequest, AvailabilityResponse, ResourceRecord, SlotOption } from './booking.types.js';
import { BookingRepository } from './booking.repository.js';
import { AssignmentService } from './assignment.service.js';
import { buildAvailability, getAvailabilityDayOfWeek } from './availability.engine.js';

const SEARCH_DAYS_FOR_NEXT_PREFERRED_SLOT = 14;

export class AvailabilityService {
  constructor(
    private readonly repository = new BookingRepository(),
    private readonly assignment = new AssignmentService(),
  ) {}

  async checkAvailability(request: AvailabilityRequest): Promise<AvailabilityResponse> {
    assertDate(request.date);

    const service = await this.repository.findService(request.context, {
      serviceId: request.serviceId,
      serviceName: request.serviceName,
    });

    const preferredResource =
      request.resourceId || request.resourceName
        ? await this.repository.maybeFindResource(request.context, {
            resourceId: request.resourceId,
            resourceName: request.resourceName,
          })
        : undefined;

    if (preferredResource) {
      const qualified = await this.repository.isResourceQualified(request.context, preferredResource.id, service.id);
      if (!qualified) {
        const alternatives = await this.buildSlotsForDate(request, service, undefined);
        return {
          available: false,
          service: service.name,
          date: request.date,
          duration_minutes: service.duration_minutes,
          preferred_resource_available: false,
          preferred_resource_name: preferredResource.name,
          preferred_resource_next_available: null,
          same_day_alternatives: alternatives.slice(0, 5),
          slots: [],
          auto_assign_recommended: alternatives[0],
        };
      }

      const preferredSlots = await this.buildSlotsForDate(request, service, [preferredResource]);
      if (preferredSlots.length > 0) {
        return {
          available: true,
          service: service.name,
          date: request.date,
          duration_minutes: service.duration_minutes,
          preferred_resource_available: true,
          preferred_resource_name: preferredResource.name,
          slots: preferredSlots,
          auto_assign_recommended: preferredSlots[0],
        };
      }

      const alternatives = await this.buildSlotsForDate(request, service, undefined, preferredResource.id);
      const nextPreferred = await this.findNextAvailableForPreferredResource(request, service, preferredResource);

      return {
        available: alternatives.length > 0,
        service: service.name,
        date: request.date,
        duration_minutes: service.duration_minutes,
        preferred_resource_available: false,
        preferred_resource_name: preferredResource.name,
        preferred_resource_next_available: nextPreferred,
        same_day_alternatives: alternatives.slice(0, 5),
        slots: alternatives,
        auto_assign_recommended: alternatives[0],
      };
    }

    const slots = await this.buildSlotsForDate(request, service, undefined);
    const bookingCounts = await this.repository.countBookingsByResource(
      request.context,
      request.date,
      slots.map((slot) => slot.resource_id),
    );
    const recommended = this.assignment.chooseRecommendedSlot(slots, bookingCounts);

    return {
      available: slots.length > 0,
      service: service.name,
      date: request.date,
      duration_minutes: service.duration_minutes,
      slots,
      auto_assign_recommended: recommended,
    };
  }

  async getSlotsForBooking(request: AvailabilityRequest): Promise<SlotOption[]> {
    const response = await this.checkAvailability(request);
    return response.preferred_resource_available === false ? response.same_day_alternatives ?? [] : response.slots;
  }

  private async findNextAvailableForPreferredResource(
    request: AvailabilityRequest,
    service: { id: string; name: string; duration_minutes: number; price: number },
    resource: ResourceRecord,
  ) {
    let date = request.date;

    for (let index = 1; index <= SEARCH_DAYS_FOR_NEXT_PREFERRED_SLOT; index += 1) {
      date = addDays(date, 1);
      const slots = await this.buildSlotsForDate({ ...request, date, timePreference: undefined }, service, [resource]);
      if (slots.length > 0) return slots[0];
    }

    return null;
  }

  private async buildSlotsForDate(
    request: AvailabilityRequest,
    service: { id: string; name: string; duration_minutes: number; price: number },
    preferredResources?: ResourceRecord[],
    excludeResourceId?: string,
  ) {
    const dayOfWeek = getAvailabilityDayOfWeek(request.date, request.context);
    const resources = preferredResources ?? (await this.repository.listQualifiedResources(request.context, service.id));
    const filteredResources = excludeResourceId
      ? resources.filter((resource) => resource.id !== excludeResourceId)
      : resources;

    const resourceIds = filteredResources.map((resource) => resource.id);
    const [locationHours, resourceHours, bookings, blockedSlots] = await Promise.all([
      this.repository.getLocationHours(request.context, dayOfWeek),
      this.repository.getResourceHours(request.context, resourceIds, dayOfWeek),
      this.repository.getConfirmedBookings(request.context, request.date, resourceIds),
      this.repository.getBlockedSlots(request.context, request.date, resourceIds),
    ]);

    return buildAvailability({
      context: request.context,
      service,
      resources: filteredResources,
      date: request.date,
      locationHours,
      resourceHours,
      bookings,
      blockedSlots,
      timePreference: request.timePreference,
    });
  }
}

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
