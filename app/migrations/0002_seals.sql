create table if not exists seals (
  id text primary key,
  user_id text not null,
  direction text not null,
  script_id text not null,
  script_name text not null,
  options_json text not null default '{}',
  original text not null,
  result text not null,
  created_at timestamptz not null default now()
);

create index if not exists seals_user_created_idx on seals (user_id, created_at desc);
