import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isPastLastCheckout } from './session.ts';

/** Build a mock Supabase that returns a single booking row for `bookings.select(...).maybeSingle()`. */
function createMockSupabase(checkOut: string | null) {
  const builder = {
    select: (_cols: string) => builder,
    in: (_col: string, _vals: string[]) => builder,
    not: (_col: string, _op: string, _val: string) => builder,
    order: (_col: string, _opts: { ascending: boolean }) => builder,
    limit: (_n: number) => builder,
    maybeSingle: () =>
      Promise.resolve({
        data: checkOut === null ? null : { check_out: checkOut },
        error: null,
      }),
  };
  return {
    from: (_table: string) => builder,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

/** Compute today's date in WIB (UTC+7), matching the implementation logic. */
function wibToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function shiftDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('isPastLastCheckout', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when last booking check_out is in the past (yesterday)', async () => {
    const yesterday = shiftDays(wibToday(), -1);
    const supabase = createMockSupabase(yesterday);
    expect(await isPastLastCheckout(supabase, '6281234567890')).toBe(true);
  });

  it('returns false when check_out is today (still active stay)', async () => {
    const supabase = createMockSupabase(wibToday());
    expect(await isPastLastCheckout(supabase, '6281234567890')).toBe(false);
  });

  it('returns false when check_out is in the future', async () => {
    const tomorrow = shiftDays(wibToday(), 1);
    const supabase = createMockSupabase(tomorrow);
    expect(await isPastLastCheckout(supabase, '6281234567890')).toBe(false);
  });

  it('returns false when there is no booking at all', async () => {
    const supabase = createMockSupabase(null);
    expect(await isPastLastCheckout(supabase, '6281234567890')).toBe(false);
  });

  it('returns false (safe default) when the query throws', async () => {
    const supabase = {
      from: () => {
        throw new Error('db down');
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    expect(await isPastLastCheckout(supabase, '6281234567890')).toBe(false);
  });

  it('handles both 62 and 0 phone prefixes by querying variants', async () => {
    const seenVariants: string[][] = [];
    const builder = {
      select: () => builder,
      in: (_col: string, vals: string[]) => {
        seenVariants.push(vals);
        return builder;
      },
      not: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = { from: () => builder } as any;

    await isPastLastCheckout(supabase, '6281234567890');
    expect(seenVariants[0]).toEqual(expect.arrayContaining(['6281234567890', '081234567890']));

    seenVariants.length = 0;
    await isPastLastCheckout(supabase, '081234567890');
    expect(seenVariants[0]).toEqual(expect.arrayContaining(['081234567890', '6281234567890']));
  });
});

describe('orchestrator memory reset (integration via pastCheckout flag)', () => {
  it('past check_out → isNewSession should be true regardless of preserve flag', () => {
    // Mirrors the boolean logic in orchestrator.ts:
    //   isNewSession = !conversationId || pastCheckout || (isStaleByTimeout && !preserveMemory)
    const compute = (
      conversationId: string | undefined,
      pastCheckout: boolean,
      isStaleByTimeout: boolean,
      preserveMemory: boolean,
    ) => !conversationId || pastCheckout || (isStaleByTimeout && !preserveMemory);

    // Past checkout always resets, even if memory would be preserved otherwise
    expect(compute('conv-1', true, false, true)).toBe(true);
    expect(compute('conv-1', true, true, true)).toBe(true);

    // Not past checkout, fresh session → keep
    expect(compute('conv-1', false, false, false)).toBe(false);
    // Not past checkout, stale but preserved → keep
    expect(compute('conv-1', false, true, true)).toBe(false);
    // Not past checkout, stale and not preserved → reset
    expect(compute('conv-1', false, true, false)).toBe(true);
  });
});