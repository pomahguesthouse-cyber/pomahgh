/**
 * Unified Tracing Context for multi-agent AI system.
 *
 * Provides a correlation ID (trace_id) that propagates across all
 * edge function calls in a single request chain:
 *   WhatsApp webhook → orchestrator → chatbot → chatbot-tools
 *
 * Usage:
 *   // At entry point (webhook, chatbot):
 *   const trace = createTrace(req, 'whatsapp-webhook');
 *
 *   // Pass to downstream calls via header:
 *   fetch(url, { headers: { ...trace.headers() } });
 *
 *   // Structured logging:
 *   trace.info('Processing message', { phone });
 *   trace.error('Tool failed', error);
 *   trace.span('callAI', async () => { ... });
 */

const TRACE_HEADER = 'X-Trace-Id';
const PARENT_SPAN_HEADER = 'X-Parent-Span-Id';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  functionName: string;
  startTime: number;

  /** Get headers to propagate trace to downstream calls */
  headers(): Record<string, string>;

  /** Log info with trace context */
  info(message: string, data?: unknown): void;

  /** Log warning with trace context */
  warn(message: string, data?: unknown): void;

  /** Log error with trace context */
  error(message: string, err?: unknown): void;

  /** Create a timed span for an operation */
  span<T>(operation: string, fn: () => Promise<T>): Promise<T>;

  /** Get summary for response metadata */
  summary(): TraceSummary;
}

export interface TraceSummary {
  trace_id: string;
  function: string;
  total_duration_ms: number;
  spans: SpanRecord[];
}

interface SpanRecord {
  operation: string;
  duration_ms: number;
  success: boolean;
  error?: string;
}

/**
 * Create a trace context from an incoming request.
 * Reuses trace_id from upstream if present, otherwise generates a new one.
 */
export function createTrace(req: Request, functionName: string): TraceContext {
  const incomingTraceId = req.headers.get(TRACE_HEADER);
  const parentSpanId = req.headers.get(PARENT_SPAN_HEADER);

  const traceId = incomingTraceId || crypto.randomUUID();
  const spanId = crypto.randomUUID().slice(0, 8);
  const startTime = performance.now();
  const spans: SpanRecord[] = [];

  const formatEntry = (level: string, message: string, data?: unknown) => {
    const entry: Record<string, unknown> = {
      level,
      message,
      timestamp: new Date().toISOString(),
      trace_id: traceId,
      span_id: spanId,
      function: functionName,
    };
    if (parentSpanId) entry.parent_span_id = parentSpanId;
    if (data !== undefined) entry.data = data;
    return JSON.stringify(entry);
  };

  const ctx: TraceContext = {
    traceId,
    spanId,
    parentSpanId: parentSpanId || null,
    functionName,
    startTime,

    headers() {
      return {
        [TRACE_HEADER]: traceId,
        [PARENT_SPAN_HEADER]: spanId,
      };
    },

    info(message: string, data?: unknown) {
      console.log(formatEntry('info', message, data));
    },

    warn(message: string, data?: unknown) {
      console.warn(formatEntry('warn', message, data));
    },

    error(message: string, err?: unknown) {
      const errorData = err instanceof Error
        ? { name: err.name, message: err.message }
        : err;
      console.error(formatEntry('error', message, errorData));
    },

    async span<T>(operation: string, fn: () => Promise<T>): Promise<T> {
      const spanStart = performance.now();
      try {
        const result = await fn();
        const duration_ms = Math.round(performance.now() - spanStart);
        spans.push({ operation, duration_ms, success: true });
        console.log(formatEntry('info', `${operation} completed`, { duration_ms }));
        return result;
      } catch (err) {
        const duration_ms = Math.round(performance.now() - spanStart);
        const errMsg = err instanceof Error ? err.message : String(err);
        spans.push({ operation, duration_ms, success: false, error: errMsg });
        console.error(formatEntry('error', `${operation} failed`, { duration_ms, error: errMsg }));
        throw err;
      }
    },

    summary(): TraceSummary {
      return {
        trace_id: traceId,
        function: functionName,
        total_duration_ms: Math.round(performance.now() - startTime),
        spans,
      };
    },
  };

  ctx.info(`Trace started`, { parent_span_id: parentSpanId || 'root' });
  return ctx;
}
