-- Schema reference for the "operator-ai" database.
-- There is no migration tool in this project yet, so this file documents
-- the tables the backend expects and can be used to (re)create them.
-- Run manually, e.g.: psql -U postgres -d operator-ai -f src/db/schema.sql

create table if not exists users (
  id serial primary key,
  name varchar not null,
  email text not null unique,
  password text,
  google_id text,
  avatar text,
  refresh_token text,
  reset_code integer,
  google_access text,
  google_refresh text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- users existed before updated_at was added to the schema above; backfill it
-- for databases created from an older version of this file.
alter table if exists users add column if not exists updated_at timestamp default now();

create table if not exists notes (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  title varchar not null,
  content text not null default '',
  is_favorite boolean not null default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists tasks (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  title varchar not null,
  description text not null default '',
  priority varchar not null default 'medium',
  status varchar not null default 'pending',
  due_date timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists chat_sessions (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  title varchar,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists chat_messages (
  id serial primary key,
  session_id integer not null references chat_sessions(id) on delete cascade,
  role varchar not null,
  content text not null,
  created_at timestamp default now()
);

create table if not exists clients (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  name varchar not null,
  email text not null default '',
  phone text not null default '',
  company varchar not null default '',
  status varchar not null default 'lead',
  notes text not null default '',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists notifications (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  type varchar not null,
  title varchar not null,
  message text not null default '',
  is_read boolean not null default false,
  created_at timestamp default now()
);
