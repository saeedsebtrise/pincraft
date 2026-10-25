-- PinCraft SaaS schema.
-- Run in the Supabase SQL editor (or `supabase db push`). Every table is
-- private to its owner via row-level security; plan limits are enforced here
-- so a modified browser can't bypass them.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  -- Maintained only by the billing webhook (service role). Users can't write these.
  plan_status text,                 -- Lemon Squeezy status: active, on_trial, past_due, cancelled, expired, …
  plan_renews_at timestamptz,
  plan_ends_at timestamptz,
  lemon_customer_id text,
  lemon_subscription_id text,
  customer_portal_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);
-- Users may change their display name only; billing columns are protected by the trigger below.
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.protect_billing_columns() returns trigger
language plpgsql as $$
begin
  if auth.role() <> 'service_role' and (
    new.plan_status is distinct from old.plan_status or
    new.plan_renews_at is distinct from old.plan_renews_at or
    new.plan_ends_at is distinct from old.plan_ends_at or
    new.lemon_customer_id is distinct from old.lemon_customer_id or
    new.lemon_subscription_id is distinct from old.lemon_subscription_id or
    new.customer_portal_url is distinct from old.customer_portal_url
  ) then
    raise exception 'billing columns are managed by the billing webhook';
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_billing on public.profiles;
create trigger profiles_protect_billing before update on public.profiles
  for each row execute function public.protect_billing_columns();

-- Create a profile for every new user.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Plan for the current user (mirrors src/saas/plans.ts → tierFromSubscription).
create or replace function public.current_plan() returns text
language sql stable security definer set search_path = public as $$
  select case
    when p.plan_status in ('active', 'on_trial', 'past_due') then 'pro'
    when p.plan_status = 'cancelled' and p.plan_ends_at > now() then 'pro'
    else 'free'
  end
  from public.profiles p where p.id = auth.uid()
$$;

-- ---------------------------------------------------------------- projects
create table if not exists public.projects (
  id text primary key,
  owner uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null default 'Untitled Pin',
  data jsonb not null,
  thumbnail text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists projects_owner_updated on public.projects (owner, updated_at desc);
alter table public.projects enable row level security;
create policy "projects: own rows" on public.projects for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- Free plan: at most 3 projects (updates to existing projects are always allowed).
create or replace function public.enforce_project_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- BEFORE INSERT also fires for upserts that end up updating: let existing projects save.
  if exists (select 1 from public.projects where id = new.id) then
    return new;
  end if;
  if coalesce(public.current_plan(), 'free') = 'free'
     and (select count(*) from public.projects where owner = new.owner) >= 3 then
    raise exception 'project_limit: the Free plan includes 3 projects';
  end if;
  return new;
end $$;

drop trigger if exists projects_limit on public.projects;
create trigger projects_limit before insert on public.projects
  for each row execute function public.enforce_project_limit();

-- ------------------------------------------------- templates & brand kits
create table if not exists public.templates (
  id text primary key,
  owner uuid not null references auth.users (id) on delete cascade default auth.uid(),
  data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.templates enable row level security;
create policy "templates: own rows" on public.templates for all using (auth.uid() = owner) with check (auth.uid() = owner);

create table if not exists public.brand_kits (
  id text primary key,
  owner uuid not null references auth.users (id) on delete cascade default auth.uid(),
  data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.brand_kits enable row level security;
create policy "brand kits: own rows" on public.brand_kits for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- Saving templates is a Pro feature.
create or replace function public.enforce_pro_template() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Edits to templates saved while on Pro stay allowed after a downgrade.
  if exists (select 1 from public.templates where id = new.id) then
    return new;
  end if;
  if coalesce(public.current_plan(), 'free') = 'free' then
    raise exception 'pro_feature: saving templates requires Pro';
  end if;
  return new;
end $$;
drop trigger if exists templates_pro on public.templates;
create trigger templates_pro before insert on public.templates
  for each row execute function public.enforce_pro_template();

-- ---------------------------------------------------------------- images
create table if not exists public.assets (
  id text primary key,
  owner uuid not null references auth.users (id) on delete cascade default auth.uid(),
  meta jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.assets enable row level security;
create policy "assets: own rows" on public.assets for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- Private bucket; files live under "<user id>/<asset id>".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assets', 'assets', false, 31457280, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "asset files: read own" on storage.objects for select
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "asset files: insert own" on storage.objects for insert
  with check (bucket_id = 'assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "asset files: update own" on storage.objects for update
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "asset files: delete own" on storage.objects for delete
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------- exports
create table if not exists public.export_events (
  id bigserial primary key,
  owner uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists export_events_owner_time on public.export_events (owner, created_at);
alter table public.export_events enable row level security;
create policy "exports: read own" on public.export_events for select using (auth.uid() = owner);
-- No insert policy: exports are only recorded through record_export().

create or replace function public.exports_this_month() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.export_events
  where owner = auth.uid() and created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc'
$$;

-- Checks the monthly quota (Free: 10) and records the exports atomically. Returns the new monthly count.
create or replace function public.record_export(export_count integer default 1) returns integer
language plpgsql security definer set search_path = public as $$
declare
  used integer;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if export_count < 1 or export_count > 50 then raise exception 'invalid export count'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  used := public.exports_this_month();
  if coalesce(public.current_plan(), 'free') = 'free' and used + export_count > 10 then
    raise exception 'export_limit: % of 10 free exports used this month', used;
  end if;
  insert into public.export_events (owner) select auth.uid() from generate_series(1, export_count);
  return used + export_count;
end $$;

grant execute on function public.record_export(integer) to authenticated;
grant execute on function public.exports_this_month() to authenticated;
grant execute on function public.current_plan() to authenticated;
