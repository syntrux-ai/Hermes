create table services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes int not null,
  price int not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_duration_check check (duration_minutes > 0),
  constraint services_price_check check (price >= 0),
  unique (organization_id, name)
);

create table service_aliases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  alias text not null,
  unique (organization_id, alias)
);

create table location_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  active boolean not null default true,
  unique (location_id, service_id)
);

create table resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  name text not null,
  role text not null default 'technician',
  speciality text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table resource_aliases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  resource_id uuid not null references resources(id) on delete cascade,
  alias text not null,
  unique (organization_id, alias)
);

create table resource_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  resource_id uuid not null references resources(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  unique (resource_id, service_id)
);

create table resource_hours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  resource_id uuid not null references resources(id) on delete cascade,
  day_of_week int not null,
  start_time time not null,
  end_time time not null,
  constraint resource_hours_day_check check (day_of_week between 0 and 6),
  constraint resource_hours_time_check check (start_time < end_time),
  unique (resource_id, location_id, day_of_week, start_time, end_time)
);

create table blocked_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  resource_id uuid references resources(id) on delete cascade,
  blocked_date date not null,
  start_time time not null,
  end_time time not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint blocked_slots_time_check check (start_time < end_time)
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  resource_id uuid not null references resources(id),
  service_id uuid not null references services(id),
  client_name text not null,
  client_phone text not null,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'confirmed',
  cancellation_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_status_check check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  constraint bookings_time_check check (start_time < end_time)
);

create table booking_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  booking_id uuid not null references bookings(id) on delete cascade,
  event_type text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now(),
  constraint booking_events_type_check check (event_type in ('created', 'cancelled', 'rescheduled', 'updated'))
);

create index idx_services_org on services(organization_id);
create index idx_service_aliases_org_alias on service_aliases(organization_id, lower(alias));
create index idx_location_services_location on location_services(location_id, active);
create index idx_resources_org_location on resources(organization_id, location_id, active);
create index idx_resource_aliases_org_alias on resource_aliases(organization_id, lower(alias));
create index idx_resource_services_service on resource_services(service_id);
create index idx_resource_hours_location_day on resource_hours(location_id, day_of_week);
create index idx_blocked_slots_lookup on blocked_slots(organization_id, location_id, blocked_date, resource_id);
create index idx_bookings_phone on bookings(organization_id, client_phone);
create index idx_bookings_date on bookings(organization_id, location_id, booking_date);
create index idx_bookings_resource_date on bookings(resource_id, booking_date, status);
create index idx_booking_events_booking on booking_events(booking_id, created_at desc);
