import type { TenantContext } from '../tenants/tenant.types.js';

export type ServiceRecord = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
};

export type ResourceRecord = {
  id: string;
  name: string;
  role: string;
  speciality?: string | null;
};

export type BookingRecord = {
  id: string;
  organization_id: string;
  location_id: string;
  resource_id: string;
  service_id: string;
  client_name: string;
  client_phone: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  cancellation_reason?: string | null;
  notes?: string | null;
};

export type AvailabilityRequest = {
  context: TenantContext;
  serviceId?: string;
  serviceName?: string;
  date: string;
  timePreference?: string;
  resourceId?: string;
  resourceName?: string;
};

export type SlotOption = {
  start_time: string;
  end_time: string;
  resource_id: string;
  resource_name: string;
};

export type AvailabilityResponse = {
  available: boolean;
  service: string;
  date: string;
  duration_minutes: number;
  preferred_resource_available?: boolean;
  preferred_resource_name?: string;
  preferred_resource_next_available?: SlotOption | null;
  same_day_alternatives?: SlotOption[];
  slots: SlotOption[];
  auto_assign_recommended?: SlotOption;
};

export type CreateBookingInput = {
  context: TenantContext;
  clientName: string;
  clientPhone: string;
  serviceId?: string;
  serviceName?: string;
  date: string;
  startTime: string;
  resourceId?: string;
  resourceName?: string;
  notes?: string;
};

export type RescheduleInput = {
  context: TenantContext;
  bookingId: string;
  clientPhone: string;
  newDate: string;
  newStartTime: string;
  resourceId?: string;
  resourceName?: string;
};
