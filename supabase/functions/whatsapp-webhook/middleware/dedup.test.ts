import { describe, expect, it } from 'vitest';
import { __resetDedupCache, buildDedupKeys, checkDuplicate, extractMessageId } from './dedup.ts';

/** Minimal in-memory mock of the Supabase client surface used by checkDuplicate. */
function createMockSupabase() {
  const rows = new Map<string, { dedup_key: string; phone_number: string; expires_at: string }>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder = (_key: string): any => ({
    upsert: (
      row: { dedup_key: string; phone_number: string; expires_at: string },
      _opts: { onConflict: string; ignoreDuplicates: boolean },
    ) => ({
      select: (_cols: string) => {
        if (rows.has(row.dedup_key)) {
          return Promise.resolve({ data: [], error: null });
        }
        rows.set(row.dedup_key, row);
        return Promise.resolve({ data: [{ dedup_key: row.dedup_key }], error: null });
      },
    }),
    select: (_cols: string) => ({
      eq: (_col: string, val: string) => ({
        maybeSingle: () => Promise.resolve({ data: rows.get(val) ?? null, error: null }),
      }),
    }),
    update: (patch: { expires_at: string; phone_number: string }) => ({
      eq: (_col: string, val: string) => {
        const existing = rows.get(val);
        if (existing) rows.set(val, { ...existing, ...patch });
        return Promise.resolve({ data: null, error: null });
      },
    }),
  });

  return {
    from: (table: string) => builder(table),
    rpc: (_name: string) => Promise.resolve({ data: null, error: null }),
    _rows: rows,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('dedup middleware', () => {
  it('extractMessageId picks up common field names', () => {
    expect(extractMessageId({ id: 'abc' })).toBe('abc');
    expect(extractMessageId({ messageId: 'x1' })).toBe('x1');
    expect(extractMessageId({ message_id: 'x2' })).toBe('x2');
    expect(extractMessageId({ id: 12345 })).toBe('12345');
    expect(extractMessageId({ id: '  ' })).toBe(null);
    expect(extractMessageId({})).toBe(null);
    expect(extractMessageId(null)).toBe(null);
  });

  it('buildDedupKeys constructs id + text keys', () => {
    const keys = buildDedupKeys({ phone: '6281', messageId: 'abc', normalizedText: 'halo' });
    expect(keys).toHaveLength(2);
    expect(keys[0].key).toBe('mid:abc');
    expect(keys[0].reason).toBe('duplicate_message_id');
    expect(keys[1].reason).toBe('duplicate_identical_text');
    expect(keys[1].key.startsWith('txt:6281:')).toBe(true);
  });

  it('buildDedupKeys skips empty text', () => {
    const keys = buildDedupKeys({ phone: '6281', messageId: 'abc', normalizedText: '   ' });
    expect(keys).toHaveLength(1);
    expect(keys[0].reason).toBe('duplicate_message_id');
  });

  it('checkDuplicate flags repeated message_id (DB-backed)', async () => {
    __resetDedupCache();
    const supabase = createMockSupabase();
    const args = { phone: '6281234', messageId: 'abc-1', normalizedText: 'halo' };
    expect((await checkDuplicate(supabase, args)).skip).toBe(false);
    const second = await checkDuplicate(supabase, args);
    expect(second.skip).toBe(true);
    if (second.skip) expect(second.reason).toBe('duplicate_message_id');
  });

  it('checkDuplicate flags identical text within window (DB-backed)', async () => {
    __resetDedupCache();
    const supabase = createMockSupabase();
    const phone = '6285656313680';
    const text = 'hallo kak, izin tanya apakah di tanggal 17-18 bisa available?';
    expect(
      (await checkDuplicate(supabase, { phone, messageId: null, normalizedText: text })).skip,
    ).toBe(false);
    const dup = await checkDuplicate(supabase, { phone, messageId: 'different-id', normalizedText: text });
    expect(dup.skip).toBe(true);
    if (dup.skip) expect(dup.reason).toBe('duplicate_identical_text');
  });

  it('checkDuplicate allows different text from same phone', async () => {
    __resetDedupCache();
    const supabase = createMockSupabase();
    const phone = '6281';
    expect(
      (await checkDuplicate(supabase, { phone, messageId: null, normalizedText: 'halo' })).skip,
    ).toBe(false);
    expect(
      (await checkDuplicate(supabase, { phone, messageId: null, normalizedText: 'berapa harganya?' })).skip,
    ).toBe(false);
  });

  it('checkDuplicate ignores empty text', async () => {
    __resetDedupCache();
    const supabase = createMockSupabase();
    const phone = '6281';
    expect((await checkDuplicate(supabase, { phone, messageId: null, normalizedText: '' })).skip).toBe(false);
    expect((await checkDuplicate(supabase, { phone, messageId: null, normalizedText: '  ' })).skip).toBe(false);
  });

  it('checkDuplicate detects duplicate even when L1 cache is empty (cold-start scenario)', async () => {
    __resetDedupCache();
    const supabase = createMockSupabase();
    const args = { phone: '6281', messageId: 'cold-1', normalizedText: 'test' };
    const first = await checkDuplicate(supabase, args);
    expect(first.skip).toBe(false);

    __resetDedupCache();

    const second = await checkDuplicate(supabase, args);
    expect(second.skip).toBe(true);
    if (second.skip) expect(second.reason).toBe('duplicate_message_id');
  });
});
