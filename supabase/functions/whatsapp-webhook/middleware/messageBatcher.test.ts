import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { batchMessages } from './messageBatcher.ts';

type SessionRow = {
  pending_messages?: string[];
  pending_since?: string | null;
};

function createRpcError(message: string) {
  return { message };
}

function createSupabaseMock(options: {
  rpcError?: { message: string } | null;
  maybeSingleData?: SessionRow | null;
  singleSequence?: Array<SessionRow | null>;
  claimResponses?: Array<SessionRow | null>;
}) {
  const singleQueue = [...(options.singleSequence ?? [])];
  const claimQueue = [...(options.claimResponses ?? [])];

  const maybeSingle = vi.fn().mockResolvedValue({
    data: options.maybeSingleData ?? null,
    error: null,
  });

  const single = vi.fn().mockImplementation(async () => ({
    data: singleQueue.shift() ?? null,
    error: null,
  }));

  const claimSingle = vi.fn().mockImplementation(async () => ({
    data: claimQueue.shift() ?? null,
    error: null,
  }));

  const selectAfterUpdate = vi.fn(() => ({
    single: claimSingle,
  }));

  const secondEq = vi.fn(() => ({
    select: selectAfterUpdate,
    single: claimSingle,
  }));

  const firstEq = vi.fn(() => ({
    eq: secondEq,
    maybeSingle,
    single,
  }));

  const update = vi.fn(() => ({
    eq: firstEq,
    select: selectAfterUpdate,
    single: claimSingle,
  }));

  const select = vi.fn(() => ({
    eq: firstEq,
    maybeSingle,
    single,
  }));

  return {
    rpc: vi.fn().mockResolvedValue({ error: options.rpcError ?? null }),
    from: vi.fn(() => ({
      select,
      update,
    })),
    _mocks: {
      maybeSingle,
      single,
      claimSingle,
      update,
      firstEq,
      secondEq,
    },
  };
}

describe('messageBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns null when RPC fails but message already exists in pending buffer', async () => {
    const supabase = createSupabaseMock({
      rpcError: createRpcError('duplicate key'),
      maybeSingleData: { pending_messages: ['halo'] },
    });

    const result = await batchMessages(supabase as never, '6281111111111', 'halo');

    expect(result).toBeNull();
    expect(supabase.rpc).toHaveBeenCalledWith('append_pending_message', {
      p_phone: '6281111111111',
      p_message: 'halo',
    });
  });

  it('returns the single message when RPC fails and buffer does not contain it', async () => {
    const supabase = createSupabaseMock({
      rpcError: createRpcError('temporary failure'),
      maybeSingleData: { pending_messages: ['pesan lain'] },
    });

    const result = await batchMessages(supabase as never, '6281111111111', 'halo');

    expect(result).toEqual(['halo']);
  });

  it('collects a stable batch and clears the buffer via optimistic claim', async () => {
    const supabase = createSupabaseMock({
      singleSequence: [
        { pending_messages: ['halo', 'mau booking'], pending_since: 'ts-1' },
        { pending_messages: ['halo', 'mau booking'], pending_since: 'ts-1' },
      ],
      claimResponses: [{ pending_messages: [] }],
    });

    const promise = batchMessages(supabase as never, '6281111111111', 'halo');

    await vi.advanceTimersByTimeAsync(1500);
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;

    expect(result).toEqual(['halo', 'mau booking']);
    expect(supabase._mocks.update).toHaveBeenCalledWith({ pending_messages: [], pending_since: null });
    expect(supabase._mocks.secondEq).toHaveBeenCalledWith('pending_since', 'ts-1');
  });

  it('returns null when another invocation has already cleared the batch', async () => {
    const supabase = createSupabaseMock({
      singleSequence: [{ pending_messages: [], pending_since: 'ts-2' }],
      claimResponses: [],
    });

    const promise = batchMessages(supabase as never, '6281111111111', 'halo');

    await vi.advanceTimersByTimeAsync(1500);

    const result = await promise;

    expect(result).toBeNull();
  });

  it('returns null when optimistic claim loses to another invocation', async () => {
    const supabase = createSupabaseMock({
      singleSequence: [
        { pending_messages: ['halo'], pending_since: 'ts-3' },
        { pending_messages: ['halo'], pending_since: 'ts-3' },
      ],
      claimResponses: [null],
    });

    const promise = batchMessages(supabase as never, '6281111111111', 'halo');

    await vi.advanceTimersByTimeAsync(1500);
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;

    expect(result).toBeNull();
  });

  it('processes pending messages after max wait timeout', async () => {
    const supabase = createSupabaseMock({
      singleSequence: [
        { pending_messages: ['halo'], pending_since: 'ts-4' },
        { pending_messages: ['halo', 'mau booking'], pending_since: 'ts-4' },
        { pending_messages: ['halo', 'mau booking', 'besok ya'], pending_since: 'ts-4' },
        { pending_messages: ['halo', 'mau booking', 'besok ya', 'jam 2'], pending_since: 'ts-4' },
        { pending_messages: ['halo', 'mau booking', 'besok ya', 'jam 2', 'tolong dicek'], pending_since: 'ts-4' },
        { pending_messages: ['halo', 'mau booking', 'besok ya', 'jam 2', 'tolong dicek'], pending_since: 'ts-4' },
      ],
      claimResponses: [{ pending_messages: [] }],
    });

    const promise = batchMessages(supabase as never, '6281111111111', 'halo');

    await vi.advanceTimersByTimeAsync(1500);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;

    expect(result).toEqual(['halo', 'mau booking', 'besok ya', 'jam 2', 'tolong dicek']);
  });
});
