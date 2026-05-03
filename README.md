# Hermes

Hermes is a communications middleware. The first implemented capability is voice-agent booking for nail salons through ElevenLabs server tools.

## Runtime Split

- ElevenLabs handles voice setup, conversation style, FAQs, service descriptions, and static knowledge.
- Hermes handles tenant/store routing, live availability, bookings, cancellations, reschedules, and audit logs.

## Public Voice Tool Endpoints

```txt
POST /api/voice-agents/tools/check-availability
POST /api/voice-agents/tools/create-booking
POST /api/voice-agents/tools/find-bookings
POST /api/voice-agents/tools/cancel-booking
POST /api/voice-agents/tools/reschedule-booking
```

Each request must include `provider_agent_id` so Hermes can resolve the organization, location, vertical, and webhook secret.

For ElevenLabs production tools, add this custom header to every Hermes server tool:

```txt
x-hermes-secret: <same value as voice_agents.webhook_secret>
```

For local Postman testing, `ELEVENLABS_SIGNATURE_REQUIRED=false` disables this requirement. In production, set it to `true`.

## Source Layout

Voice-agent behavior is grouped as one Hermes feature:

```txt
src/modules/voice-agents/
  voiceAgent.routes.ts
  voiceAgent.controller.ts
  toolRouter.ts
  audit.service.ts
  booking-core/
  tenants/
  verticals/
    nail-salon/
```

Platform-wide code stays outside the feature:

```txt
src/integrations/
src/shared/
src/config/
```

## Environment

Copy `.env.example` to `.env.local` and fill in:

```txt
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ELEVENLABS_WEBHOOK_TOLERANCE_SECONDS=300
ELEVENLABS_SIGNATURE_REQUIRED=true
DEFAULT_SLOT_INTERVAL_MINUTES=30
DEFAULT_SAME_DAY_BUFFER_MINUTES=60
```

## Database

Run the SQL files in `supabase/migrations` in order.

The seed creates one demo nail salon organization, one Bandra location, demo services, technicians, working hours, and a voice agent mapping:

```txt
provider_agent_id = agent_polish_bandra
```

## Postman Endpoint Testing

Import these files into Postman:

```txt
postman/hermes-voice-agents.postman_collection.json
postman/hermes-voice-agents.postman_environment.json
```

Before running the collection:

```txt
1. Create `.env.local` from `.env.example`.
2. Add Supabase URL and service role key.
3. Run all SQL migrations in `supabase/migrations` in order.
4. Start Hermes with `npm run dev`.
5. Select the `Hermes Local` Postman environment.
6. Run the collection in order.
```

The collection tests every public endpoint:

```txt
GET  /api/health
POST /api/voice-agents/tools/check-availability
POST /api/voice-agents/tools/create-booking
POST /api/voice-agents/tools/find-bookings
POST /api/voice-agents/tools/reschedule-booking
POST /api/voice-agents/tools/cancel-booking
```
