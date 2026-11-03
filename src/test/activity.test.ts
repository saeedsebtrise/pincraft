import { beforeEach, describe, expect, it } from 'vitest';
import { dayLabel, filterEvents, logActivity, MAX_EVENTS, tracked, useActivity } from '../services/activity';
import { usagePeriod, formatBytes } from '../dashboard/usage';
import { windowError } from '../store/workspaceStore';

describe('activity log', () => {
  beforeEach(() => {
    useActivity.getState().useOwner('test-user');
    useActivity.getState().clear();
  });

  it('records events newest first and keeps the last 100', () => {
    for (let i = 0; i < MAX_EVENTS + 5; i++) logActivity({ area: 'Pins', outcome: 'completed', title: `Pin ${i}` });
    const events = useActivity.getState().events;
    expect(events).toHaveLength(MAX_EVENTS);
    expect(events[0].title).toBe(`Pin ${MAX_EVENTS + 4}`);
  });

  it('keeps each account’s log separate', () => {
    logActivity({ area: 'Account', outcome: 'completed', title: 'Signed in' });
    useActivity.getState().useOwner('someone-else');
    expect(useActivity.getState().events).toHaveLength(0);
    useActivity.getState().useOwner('test-user');
    expect(useActivity.getState().events).toHaveLength(1);
  });

  it('logs a failed event with the error, and a completed one on success', async () => {
    await expect(tracked({ area: 'AI', title: 'AI designs made', failTitle: 'AI designs failed' }, async () => Promise.reject(new Error('AI server offline')))).rejects.toThrow();
    await tracked({ area: 'AI', title: 'AI designs made', failTitle: 'AI designs failed' }, async () => 4, (n) => ({ detail: `${n} designs` }));
    const [ok, failed] = useActivity.getState().events;
    expect(ok).toMatchObject({ outcome: 'completed', detail: '4 designs' });
    expect(failed).toMatchObject({ outcome: 'failed', title: 'AI designs failed', detail: 'AI server offline' });
  });

  it('filters by outcome, area, search and time range', () => {
    const now = Date.now();
    logActivity({ area: 'Export', outcome: 'completed', title: 'Exported 3 Pins', at: now - 40 * 86_400_000 });
    logActivity({ area: 'Blog import', outcome: 'failed', title: 'Couldn’t read the blog post', detail: 'Site blocks readers' });
    logActivity({ area: 'Templates', outcome: 'update', title: 'Template saved' });
    const events = useActivity.getState().events;
    const f = (p: Partial<Parameters<typeof filterEvents>[1]>) => filterEvents(events, { outcome: 'all', area: 'all', days: 30, query: '', ...p }).map((e) => e.title);
    expect(f({})).toEqual(['Template saved', 'Couldn’t read the blog post']);
    expect(f({ days: 0 })).toHaveLength(3);
    expect(f({ outcome: 'failed' })).toEqual(['Couldn’t read the blog post']);
    expect(f({ area: 'Templates' })).toEqual(['Template saved']);
    expect(f({ query: 'blocks' })).toEqual(['Couldn’t read the blog post']);
    expect(dayLabel(now, now)).toBe('Today');
    expect(dayLabel(now - 86_400_000, now)).toBe('Yesterday');
  });
});

describe('usage and scheduling helpers', () => {
  it('covers the calendar month as the usage period', () => {
    const p = usagePeriod(new Date(Date.UTC(2026, 10, 3, 12)));
    expect(p.start.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('formats sizes and checks posting windows', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(windowError(8, 20)).toBeNull();
    expect(windowError(20, 8)).toMatch(/after/);
    expect(windowError(-1, 8)).toMatch(/start/);
    expect(windowError(8, 24)).toMatch(/end/);
  });
});
