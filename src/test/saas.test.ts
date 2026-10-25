// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { profileUpdateFromEvent, verifySignature } from '../../supabase/functions/lemon-webhook/logic';
import { canCreateProject, canExport, hasFeature, monthKey, tierFromSubscription } from '../saas/plans';

describe('plans & entitlements', () => {
  it('free plan: 10 exports per month, 3 projects, no Pro features', () => {
    expect(canExport('free', { exportsThisMonth: 9, projects: 0 }, 1)).toEqual({ ok: true, remaining: 0 });
    expect(canExport('free', { exportsThisMonth: 10, projects: 0 }, 1).ok).toBe(false);
    expect(canExport('free', { exportsThisMonth: 8, projects: 0 }, 3).ok).toBe(false); // "download all pages" counts every page
    expect(canCreateProject('free', { exportsThisMonth: 0, projects: 2 }).ok).toBe(true);
    expect(canCreateProject('free', { exportsThisMonth: 0, projects: 3 }).ok).toBe(false);
    expect(hasFeature('free', 'aiText')).toBe(false);
  });
  it('pro plan is unlimited', () => {
    expect(canExport('pro', { exportsThisMonth: 5000, projects: 0 }, 20)).toEqual({ ok: true, remaining: null });
    expect(canCreateProject('pro', { exportsThisMonth: 0, projects: 999 }).ok).toBe(true);
    expect(hasFeature('pro', 'batchVariations')).toBe(true);
  });
  it('maps subscription status to a plan', () => {
    const now = new Date('2026-10-24T00:00:00Z');
    expect(tierFromSubscription('active', null, now)).toBe('pro');
    expect(tierFromSubscription('on_trial', null, now)).toBe('pro');
    expect(tierFromSubscription('past_due', null, now)).toBe('pro');
    expect(tierFromSubscription('cancelled', '2026-11-01T00:00:00Z', now)).toBe('pro'); // paid period still running
    expect(tierFromSubscription('cancelled', '2026-10-01T00:00:00Z', now)).toBe('free');
    expect(tierFromSubscription('expired', null, now)).toBe('free');
    expect(tierFromSubscription(null, null, now)).toBe('free');
    expect(monthKey(new Date('2026-01-31T23:59:59Z'))).toBe('2026-01');
  });
});

describe('Lemon Squeezy webhook', () => {
  const secret = 'whsec_test';
  const body = JSON.stringify({
    meta: { event_name: 'subscription_created', custom_data: { user_id: 'user-123' } },
    data: { id: '987', type: 'subscriptions', attributes: { status: 'active', renews_at: '2026-11-24T00:00:00Z', ends_at: null, customer_id: 55, urls: { customer_portal: 'https://store.lemonsqueezy.com/billing' } } },
  });
  const sig = createHmac('sha256', secret).update(body).digest('hex');

  it('accepts only correctly signed bodies', async () => {
    expect(await verifySignature(body, sig, secret)).toBe(true);
    expect(await verifySignature(body, sig.toUpperCase(), secret)).toBe(true);
    expect(await verifySignature(body + ' ', sig, secret)).toBe(false);
    expect(await verifySignature(body, sig, 'wrong')).toBe(false);
    expect(await verifySignature(body, null, secret)).toBe(false);
  });

  it('maps subscription events to profile updates and ignores the rest', () => {
    const u = profileUpdateFromEvent(JSON.parse(body))!;
    expect(u.userId).toBe('user-123');
    expect(u.patch).toEqual({
      plan_status: 'active',
      plan_renews_at: '2026-11-24T00:00:00Z',
      plan_ends_at: null,
      lemon_customer_id: '55',
      lemon_subscription_id: '987',
      customer_portal_url: 'https://store.lemonsqueezy.com/billing',
    });
    expect(profileUpdateFromEvent({ meta: { event_name: 'order_created' }, data: { type: 'orders' } })).toBeNull();
    expect(profileUpdateFromEvent({ meta: { event_name: 'subscription_payment_success' }, data: { type: 'subscription-invoices' } })).toBeNull();
  });
});

describe('database schema (migration run on Postgres)', () => {
  let db: PGlite;
  const ALICE = '11111111-1111-1111-1111-111111111111';
  const BOB = '22222222-2222-2222-2222-222222222222';
  const as = async (uid: string | null, role = 'authenticated') => {
    await db.query(`select set_config('test.uid', $1, false), set_config('test.role', $2, false)`, [uid ?? '', role]);
  };
  const err = async (sql: string, params: unknown[] = []) => {
    try {
      await db.query(sql, params);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  };

  beforeAll(async () => {
    db = new PGlite();
    // Minimal stand-ins for Supabase's auth & storage schemas.
    await db.exec(`
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('test.role', true), ''), 'authenticated') $$;
      create schema storage;
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects (id bigserial primary key, bucket_id text, name text);
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
    `);
    await db.exec(readFileSync(resolve(__dirname, '../../supabase/migrations/0001_init.sql'), 'utf8'));
    await db.query(`insert into auth.users values ($1, 'alice@example.com', '{"display_name":"Alice"}'), ($2, 'bob@example.com', '{}')`, [ALICE, BOB]);
  });

  it('creates a profile for each new user', async () => {
    const r = await db.query<{ id: string; display_name: string }>('select id, display_name from public.profiles order by display_name');
    expect(r.rows.map((x) => x.display_name)).toEqual(['Alice', 'bob']);
  });

  it('limits Free users to 10 exports a month, recorded atomically', async () => {
    await as(ALICE);
    const first = await db.query<{ record_export: number }>('select public.record_export(8)');
    expect(first.rows[0].record_export).toBe(8);
    expect(await err('select public.record_export(3)')).toMatch(/export_limit/);
    const ok = await db.query<{ record_export: number }>('select public.record_export(2)');
    expect(ok.rows[0].record_export).toBe(10);
    expect(await err('select public.record_export(1)')).toMatch(/export_limit/);
    const used = await db.query<{ exports_this_month: number }>('select public.exports_this_month()');
    expect(used.rows[0].exports_this_month).toBe(10);
  });

  it('limits Free users to 3 projects but always lets existing ones save', async () => {
    await as(ALICE);
    for (const id of ['p1', 'p2', 'p3']) await db.query(`insert into public.projects (id, owner, data) values ($1, $2, '{}')`, [id, ALICE]);
    expect(await err(`insert into public.projects (id, owner, data) values ('p4', $1, '{}')`, [ALICE])).toMatch(/project_limit/);
    // The client saves with an upsert — must succeed for an existing project even at the limit.
    expect(
      await err(`insert into public.projects (id, owner, data, name) values ('p2', $1, '{"x":1}', 'Renamed') on conflict (id) do update set data = excluded.data, name = excluded.name`, [ALICE]),
    ).toBeNull();
    // Other users are unaffected.
    await as(BOB);
    expect(await err(`insert into public.projects (id, owner, data) values ('b1', $1, '{}')`, [BOB])).toBeNull();
  });

  it('lets only the billing webhook change plan columns, and Pro lifts the limits', async () => {
    await as(ALICE);
    expect(await err(`update public.profiles set plan_status = 'active' where id = $1`, [ALICE])).toMatch(/billing columns/);
    expect(await err(`update public.profiles set display_name = 'Alice B' where id = $1`, [ALICE])).toBeNull();

    await as(null, 'service_role');
    expect(await err(`update public.profiles set plan_status = 'active', lemon_subscription_id = '987' where id = $1`, [ALICE])).toBeNull();

    await as(ALICE);
    const plan = await db.query<{ current_plan: string }>('select public.current_plan()');
    expect(plan.rows[0].current_plan).toBe('pro');
    expect(await err('select public.record_export(25)')).toBeNull();
    expect(await err(`insert into public.projects (id, owner, data) values ('p4', $1, '{}')`, [ALICE])).toBeNull();
    expect(await err(`insert into public.templates (id, owner, data) values ('t1', $1, '{}')`, [ALICE])).toBeNull();
  });

  it('keeps Pro until a cancelled subscription ends, then reverts to Free', async () => {
    await as(null, 'service_role');
    await db.query(`update public.profiles set plan_status = 'cancelled', plan_ends_at = now() + interval '5 days' where id = $1`, [ALICE]);
    await as(ALICE);
    expect((await db.query<{ current_plan: string }>('select public.current_plan()')).rows[0].current_plan).toBe('pro');
    await as(null, 'service_role');
    await db.query(`update public.profiles set plan_ends_at = now() - interval '1 day' where id = $1`, [ALICE]);
    await as(ALICE);
    expect((await db.query<{ current_plan: string }>('select public.current_plan()')).rows[0].current_plan).toBe('free');
    expect(await err(`insert into public.templates (id, owner, data) values ('t2', $1, '{}')`, [ALICE])).toMatch(/pro_feature/);
    // Templates saved while on Pro can still be edited after the downgrade.
    expect(await err(`insert into public.templates (id, owner, data) values ('t1', $1, '{"v":2}') on conflict (id) do update set data = excluded.data`, [ALICE])).toBeNull();
  });

  it('enables row-level security on every user table', async () => {
    const r = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname`,
    );
    expect(r.rows.every((x) => x.relrowsecurity)).toBe(true);
    expect(r.rows.map((x) => x.relname)).toEqual(['assets', 'brand_kits', 'export_events', 'profiles', 'projects', 'templates']);
  });
});
