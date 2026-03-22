create table if not exists interact_messages (
  id uuid primary key default gen_random_uuid(),
  agent_target text not null check (agent_target in ('fletcher', 'sawyer')),
  element_context text not null,
  user_message text not null,
  status text not null default 'pending' check (status in ('pending', 'processed')),
  created_at timestamp without time zone not null default now(),
  processed_at timestamp without time zone
);

create index if not exists interact_messages_status_created_at_idx
  on interact_messages (status, created_at);

create index if not exists interact_messages_agent_target_idx
  on interact_messages (agent_target, status, created_at);
