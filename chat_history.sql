-- Uqoodi: chat history tables + RLS
-- شغّل هذا في Supabase SQL Editor مرة واحدة.

create table if not exists public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'محادثة جديدة',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.chat_sessions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('user','assistant','system')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists chat_sessions_user_updated_idx on public.chat_sessions(user_id, updated_at desc);
create index if not exists chat_messages_session_idx      on public.chat_messages(session_id, created_at asc);
create index if not exists chat_messages_content_idx      on public.chat_messages using gin (to_tsvector('simple', content));

-- الصلاحيات (Data API)
grant select, insert, update, delete on public.chat_sessions to authenticated;
grant select, insert, update, delete on public.chat_messages to authenticated;
grant all on public.chat_sessions to service_role;
grant all on public.chat_messages to service_role;

-- RLS: كل مستخدم يرى محادثاته فقط
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "sessions_own_select" on public.chat_sessions;
drop policy if exists "sessions_own_insert" on public.chat_sessions;
drop policy if exists "sessions_own_update" on public.chat_sessions;
drop policy if exists "sessions_own_delete" on public.chat_sessions;

create policy "sessions_own_select" on public.chat_sessions for select to authenticated using (auth.uid() = user_id);
create policy "sessions_own_insert" on public.chat_sessions for insert to authenticated with check (auth.uid() = user_id);
create policy "sessions_own_update" on public.chat_sessions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions_own_delete" on public.chat_sessions for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "messages_own_select" on public.chat_messages;
drop policy if exists "messages_own_insert" on public.chat_messages;
drop policy if exists "messages_own_delete" on public.chat_messages;

create policy "messages_own_select" on public.chat_messages for select to authenticated using (auth.uid() = user_id);
create policy "messages_own_insert" on public.chat_messages for insert to authenticated with check (auth.uid() = user_id);
create policy "messages_own_delete" on public.chat_messages for delete to authenticated using (auth.uid() = user_id);
