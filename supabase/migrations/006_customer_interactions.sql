create table customer_interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  voice_agent_id uuid references voice_agents(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,

  source text not null default 'elevenlabs',
  channel text not null default 'voice',
  provider text not null default 'elevenlabs',
  provider_agent_id text,
  provider_conversation_id text,
  provider_call_id text,

  customer_name text,
  customer_phone text,
  is_existing_customer boolean,

  interaction_type text,
  intent text,
  outcome text,
  status text not null default 'received',

  booking_status text,
  service_name text,
  technician_name text,
  appointment_date date,
  start_time time,
  end_time time,
  old_appointment_date date,
  old_start_time time,
  new_appointment_date date,
  new_start_time time,
  cancellation_reason text,

  call_started_at timestamptz,
  call_ended_at timestamptz,
  call_duration_seconds int,
  call_transfer boolean,
  complaint_detected boolean,

  summary text,
  transcript text,
  recording_url text,
  user_sentiment text,
  analysis jsonb,
  raw_post_call_payload jsonb not null,

  bigin_lead_id text,
  bigin_contact_id text,
  bigin_deal_id text,
  bigin_sync_status text not null default 'pending',
  bigin_synced_at timestamptz,
  bigin_sync_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_customer_interactions_org_created on customer_interactions(organization_id, created_at desc);
create index idx_customer_interactions_customer_phone on customer_interactions(organization_id, customer_phone, created_at desc);
create index idx_customer_interactions_booking on customer_interactions(booking_id);
create index idx_customer_interactions_provider_conversation on customer_interactions(provider_conversation_id);
create index idx_customer_interactions_intent_outcome on customer_interactions(intent, outcome);
