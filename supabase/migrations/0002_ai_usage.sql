-- AI usage limits. Every AI request (text ideas, AI designs, Pinterest
-- research) costs Claude credits, so the server records each one here and
-- Postgres refuses calls beyond the plan's daily allowance.
-- Run after 0001_init.sql (SQL editor or `supabase db push`).

create table if not exists public.ai_events (
  id bigserial primary key,
  owner uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_events_owner_time on public.ai_events (owner, created_at);
alter table public.ai_events enable row level security;
create policy "ai events: read own" on public.ai_events for select using (auth.uid() = owner);
-- No insert policy: calls are only recorded through record_ai_use().

create or replace function public.ai_uses_today() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.ai_events
  where owner = auth.uid() and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'
$$;

-- Checks today's allowance (Free: 10, Pro: 150 AI requests a day) and records the call. Returns today's count.
create or replace function public.record_ai_use(kind text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  used integer;
  allowed integer;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if kind not in ('ai', 'ai-design', 'pin-research') then raise exception 'invalid kind'; end if;
  perform pg_advisory_xact_lock(hashtext('ai:' || auth.uid()::text));
  used := public.ai_uses_today();
  allowed := case when coalesce(public.current_plan(), 'free') = 'pro' then 150 else 10 end;
  if used >= allowed then
    raise exception 'ai_limit: % of % AI requests used today', used, allowed;
  end if;
  insert into public.ai_events (owner, kind) values (auth.uid(), kind);
  return used + 1;
end $$;

grant execute on function public.record_ai_use(text) to authenticated;
grant execute on function public.ai_uses_today() to authenticated;
