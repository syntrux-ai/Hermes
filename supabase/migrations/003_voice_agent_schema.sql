create table voice_agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  provider text not null default 'elevenlabs',
  provider_agent_id text not null,
  webhook_secret text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voice_agents_provider_check check (provider in ('elevenlabs')),
  unique (provider, provider_agent_id)
);

create table voice_tool_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  voice_agent_id uuid references voice_agents(id) on delete set null,
  provider text not null default 'elevenlabs',
  provider_agent_id text,
  tool_name text not null,
  request_payload jsonb,
  response_payload jsonb,
  success boolean not null,
  error_message text,
  latency_ms int,
  created_at timestamptz not null default now()
);

create index idx_voice_agents_provider_agent on voice_agents(provider, provider_agent_id, active);
create index idx_voice_tool_audit_lookup on voice_tool_audit_logs(provider_agent_id, tool_name, created_at desc);
