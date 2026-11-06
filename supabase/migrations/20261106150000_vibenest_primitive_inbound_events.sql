-- Store verified Primitive inbound events for the VibeNest Agent bridge.
-- Event IDs are stable across Primitive webhook retries; the unique key makes delivery idempotent.
create table if not exists public.vibenest_agent_mail_events (
  id bigint generated always as identity primary key,
  event_id text not null unique,
  event_type text not null,
  email_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_note text,
  constraint vibenest_agent_mail_events_event_id_length
    check (char_length(event_id) between 1 and 200)
);

create index if not exists vibenest_agent_mail_events_pending_idx
  on public.vibenest_agent_mail_events(received_at asc)
  where processed_at is null;

alter table public.vibenest_agent_mail_events enable row level security;
revoke all on public.vibenest_agent_mail_events from anon, authenticated;
grant all on public.vibenest_agent_mail_events to service_role;
