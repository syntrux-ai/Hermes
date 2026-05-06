import { supabase } from '../../../integrations/supabase/supabase.client.js';
import type { Json } from '../../../integrations/supabase/supabase.types.js';
import { TtlCache } from '../../../shared/cache.js';
import { notFound } from '../../../shared/errors.js';
import { normalizePhone } from '../../../shared/phone.js';
import type { TenantContext } from '../tenants/tenant.types.js';
import type { BookingRecord, ResourceRecord, ServiceRecord } from './booking.types.js';

const serviceCache = new TtlCache<ServiceRecord>(5 * 60 * 1000);
const qualifiedResourcesCache = new TtlCache<ResourceRecord[]>(5 * 60 * 1000);
const locationHoursCache = new TtlCache<{ open_time: string | null; close_time: string | null; is_closed: boolean } | null>(
  60 * 1000,
);
const resourceHoursCache = new TtlCache<Array<{ resource_id: string; start_time: string; end_time: string }>>(60 * 1000);

export class BookingRepository {
  async findService(context: TenantContext, input: { serviceId?: string; serviceName?: string }): Promise<ServiceRecord> {
    const cacheKey = `${context.organizationId}:${context.locationId}:${input.serviceId ?? input.serviceName?.toLowerCase()}`;
    const cached = serviceCache.get(cacheKey);
    if (cached) return cached;

    if (input.serviceId) {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, duration_minutes, price, location_services!inner(location_id, active)')
        .eq('id', input.serviceId)
        .eq('organization_id', context.organizationId)
        .eq('active', true)
        .eq('location_services.location_id', context.locationId)
        .eq('location_services.active', true)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        serviceCache.set(cacheKey, data);
        return data;
      }
    }

    if (input.serviceName) {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, duration_minutes, price, location_services!inner(location_id, active)')
        .eq('organization_id', context.organizationId)
        .ilike('name', input.serviceName)
        .eq('active', true)
        .eq('location_services.location_id', context.locationId)
        .eq('location_services.active', true)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        serviceCache.set(cacheKey, data);
        return data;
      }

      const alias = await supabase
        .from('service_aliases')
        .select('services!inner(id, name, duration_minutes, price, active, location_services!inner(location_id, active))')
        .eq('organization_id', context.organizationId)
        .ilike('alias', input.serviceName)
        .eq('services.active', true)
        .eq('services.location_services.location_id', context.locationId)
        .eq('services.location_services.active', true)
        .maybeSingle();
      if (alias.error) throw alias.error;
      if (alias.data) {
        const service = unwrapRelation(alias.data.services);
        serviceCache.set(cacheKey, service);
        return service;
      }
    }

    throw notFound('Service was not found for this store');
  }

  async findResource(
    context: TenantContext,
    input: { resourceId?: string; resourceName?: string },
  ): Promise<ResourceRecord> {
    if (input.resourceId) {
      const { data, error } = await supabase
        .from('resources')
        .select('id, name, role, speciality')
        .eq('id', input.resourceId)
        .eq('organization_id', context.organizationId)
        .eq('location_id', context.locationId)
        .eq('active', true)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;
    }

    if (input.resourceName) {
      const { data, error } = await supabase
        .from('resources')
        .select('id, name, role, speciality')
        .eq('organization_id', context.organizationId)
        .eq('location_id', context.locationId)
        .eq('active', true)
        .ilike('name', input.resourceName)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;

      const alias = await supabase
        .from('resource_aliases')
        .select('resources!inner(id, name, role, speciality, active, location_id)')
        .eq('organization_id', context.organizationId)
        .ilike('alias', input.resourceName)
        .eq('resources.location_id', context.locationId)
        .eq('resources.active', true)
        .maybeSingle();
      if (alias.error) throw alias.error;
      if (alias.data) return unwrapRelation(alias.data.resources);
    }

    throw notFound('Resource was not found for this store');
  }

  async listQualifiedResources(context: TenantContext, serviceId: string): Promise<ResourceRecord[]> {
    const cacheKey = `${context.organizationId}:${context.locationId}:${serviceId}`;
    const cached = qualifiedResourcesCache.get(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('resource_services')
      .select('resources!inner(id, name, role, speciality, active, location_id)')
      .eq('organization_id', context.organizationId)
      .eq('service_id', serviceId)
      .eq('resources.location_id', context.locationId)
      .eq('resources.active', true);

    if (error) throw error;

    if (data && data.length > 0) {
      const resources = data.map((row: { resources: ResourceRecord | ResourceRecord[] }) => unwrapRelation(row.resources));
      qualifiedResourcesCache.set(cacheKey, resources);
      return resources;
    }

    const fallback = await supabase
      .from('resources')
      .select('id, name, role, speciality')
      .eq('organization_id', context.organizationId)
      .eq('location_id', context.locationId)
      .eq('active', true);

    if (fallback.error) throw fallback.error;
    const resources = fallback.data ?? [];
    qualifiedResourcesCache.set(cacheKey, resources);
    return resources;
  }

  async isResourceQualified(context: TenantContext, resourceId: string, serviceId: string) {
    const { data, error } = await supabase
      .from('resource_services')
      .select('id')
      .eq('organization_id', context.organizationId)
      .eq('resource_id', resourceId)
      .eq('service_id', serviceId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  }

  async getLocationHours(context: TenantContext, dayOfWeek: number) {
    const cacheKey = `${context.locationId}:${dayOfWeek}`;
    const cached = locationHoursCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const { data, error } = await supabase
      .from('location_hours')
      .select('open_time, close_time, is_closed')
      .eq('location_id', context.locationId)
      .eq('day_of_week', dayOfWeek)
      .maybeSingle();

    if (error) throw error;
    locationHoursCache.set(cacheKey, data);
    return data;
  }

  async getResourceHours(context: TenantContext, resourceIds: string[], dayOfWeek: number) {
    if (resourceIds.length === 0) return [];
    const cacheKey = `${context.locationId}:${dayOfWeek}:${[...resourceIds].sort().join(',')}`;
    const cached = resourceHoursCache.get(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('resource_hours')
      .select('resource_id, start_time, end_time')
      .eq('organization_id', context.organizationId)
      .eq('location_id', context.locationId)
      .eq('day_of_week', dayOfWeek)
      .in('resource_id', resourceIds);

    if (error) throw error;
    const hours = data ?? [];
    resourceHoursCache.set(cacheKey, hours);
    return hours;
  }

  async getConfirmedBookings(context: TenantContext, date: string, resourceIds: string[]) {
    if (resourceIds.length === 0) return [];
    const { data, error } = await supabase
      .from('bookings')
      .select('id, resource_id, service_id, start_time, end_time')
      .eq('organization_id', context.organizationId)
      .eq('location_id', context.locationId)
      .eq('booking_date', date)
      .eq('status', 'confirmed')
      .in('resource_id', resourceIds);

    if (error) throw error;
    return data ?? [];
  }

  async getBlockedSlots(context: TenantContext, date: string, resourceIds: string[]) {
    if (resourceIds.length === 0) return [];
    const { data, error } = await supabase
      .from('blocked_slots')
      .select('resource_id, start_time, end_time')
      .eq('organization_id', context.organizationId)
      .eq('location_id', context.locationId)
      .eq('blocked_date', date)
      .or(`resource_id.is.null,resource_id.in.(${resourceIds.join(',')})`);

    if (error) throw error;
    return data ?? [];
  }

  async countBookingsByResource(context: TenantContext, date: string, resourceIds: string[]) {
    const bookings = await this.getConfirmedBookings(context, date, resourceIds);
    return bookings.reduce<Record<string, number>>((counts, booking: { resource_id: string }) => {
      counts[booking.resource_id] = (counts[booking.resource_id] ?? 0) + 1;
      return counts;
    }, {});
  }

  async insertBooking(input: {
    context: TenantContext;
    resourceId: string;
    serviceId: string;
    clientName: string;
    clientPhone: string;
    date: string;
    startTime: string;
    endTime: string;
    notes?: string;
  }): Promise<BookingRecord> {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        organization_id: input.context.organizationId,
        location_id: input.context.locationId,
        resource_id: input.resourceId,
        service_id: input.serviceId,
        client_name: input.clientName,
        client_phone: normalizePhone(input.clientPhone),
        booking_date: input.date,
        start_time: input.startTime,
        end_time: input.endTime,
        notes: input.notes,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async findBookingsByPhone(context: TenantContext, clientPhone: string, status: string) {
    let query = supabase
      .from('bookings')
      .select('*, services!inner(name), resources!inner(name)')
      .eq('organization_id', context.organizationId)
      .eq('location_id', context.locationId)
      .eq('client_phone', normalizePhone(clientPhone))
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async findRecentBookingsByPhone(context: TenantContext, clientPhone: string, limit = 5) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, services!inner(name), resources!inner(name)')
      .eq('organization_id', context.organizationId)
      .eq('location_id', context.locationId)
      .eq('client_phone', normalizePhone(clientPhone))
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  }

  async findBookingById(context: TenantContext, bookingId: string): Promise<BookingRecord & { services: ServiceRecord; resources: ResourceRecord }> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, services!inner(id, name, duration_minutes, price), resources!inner(id, name, role, speciality)')
      .eq('id', bookingId)
      .eq('organization_id', context.organizationId)
      .eq('location_id', context.locationId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw notFound('Booking was not found');
    return data;
  }

  async updateBooking(bookingId: string, values: Partial<BookingRecord>) {
    const { data, error } = await supabase
      .from('bookings')
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async insertBookingEvent(input: {
    context: TenantContext;
    bookingId: string;
    eventType: 'created' | 'cancelled' | 'rescheduled' | 'updated';
    oldValues?: Json;
    newValues?: Json;
  }) {
    const { error } = await supabase.from('booking_events').insert({
      organization_id: input.context.organizationId,
      location_id: input.context.locationId,
      booking_id: input.bookingId,
      event_type: input.eventType,
      old_values: input.oldValues,
      new_values: input.newValues,
    });

    if (error) throw error;
  }
}

const unwrapRelation = <T>(value: T | T[]): T => (Array.isArray(value) ? value[0] : value);
