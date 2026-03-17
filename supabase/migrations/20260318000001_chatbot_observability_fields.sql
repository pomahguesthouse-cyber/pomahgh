-- Chatbot observability and quality fields
-- Adds analytics columns for conversation/message quality tracking.

alter table if exists public.chat_conversations
  add column if not exists conversation_duration_seconds integer,
  add column if not exists fallback_count integer not null default 0,
  add column if not exists satisfaction_rating integer,
  add column if not exists last_user_message text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_conversations_satisfaction_rating_check'
  ) then
    alter table public.chat_conversations
      add constraint chat_conversations_satisfaction_rating_check
      check (satisfaction_rating is null or (satisfaction_rating >= 1 and satisfaction_rating <= 5));
  end if;
end $$;

alter table if exists public.chat_messages
  add column if not exists ai_response text,
  add column if not exists tool_calls_used text[],
  add column if not exists is_fallback boolean not null default false;

create index if not exists idx_chat_conversations_started_at
  on public.chat_conversations (started_at desc);

create index if not exists idx_chat_conversations_fallback_count
  on public.chat_conversations (fallback_count);

create index if not exists idx_chat_messages_is_fallback
  on public.chat_messages (is_fallback);
