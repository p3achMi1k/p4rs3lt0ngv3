create table if not exists openai_turns (
  id text primary key,
  user_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  response_id text,
  created_at timestamptz not null
);

create index if not exists openai_turns_user_created_idx
  on openai_turns (user_id, created_at);
