create extension if not exists pgcrypto;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vertical text not null default 'nail_salon',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_status_check check (status in ('active', 'inactive')),
  constraint organizations_vertical_check check (vertical in ('nail_salon'))
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  timezone text not null default 'Asia/Kolkata',
  active boolean not null default true,
  slot_interval_minutes int not null default 30,
  same_day_buffer_minutes int not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_slot_interval_check check (slot_interval_minutes > 0),
  constraint locations_same_day_buffer_check check (same_day_buffer_minutes >= 0)
);

create table location_hours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  day_of_week int not null,
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  constraint location_hours_day_check check (day_of_week between 0 and 6),
  constraint location_hours_time_check check (
    is_closed = true or (open_time is not null and close_time is not null and open_time < close_time)
  ),
  unique (location_id, day_of_week)
);

create index idx_locations_org on locations(organization_id);
create index idx_location_hours_location_day on location_hours(location_id, day_of_week);
