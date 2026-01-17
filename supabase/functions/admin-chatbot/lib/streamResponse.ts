// ============= SSE STREAMING RESPONSE =============

import { corsHeaders } from "./constants.ts";

export interface StreamContext {
  encoder: TextEncoder;
  controller: ReadableStreamDefaultController;
}

/**
 * Send a text chunk to the stream
 */
export function sendTextChunk(ctx: StreamContext, content: string): void {
  ctx.controller.enqueue(ctx.encoder.encode(content));
}

/**
 * Send an error event to the stream (proper SSE format)
 */
export function sendErrorEvent(ctx: StreamContext, message: string): void {
  const errorPayload = JSON.stringify({ type: 'error', message });
  ctx.controller.enqueue(ctx.encoder.encode(`event: error\ndata: ${errorPayload}\n\n`));
}

/**
 * Send completion event
 */
export function sendDoneEvent(ctx: StreamContext): void {
  ctx.controller.enqueue(ctx.encoder.encode('event: done\ndata: {}\n\n'));
}

/**
 * Create SSE stream with proper error handling
 */
export function createSSEStream(
  processRequest: (ctx: StreamContext) => Promise<string>
): ReadableStream {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      const ctx: StreamContext = { encoder, controller };
      
      try {
        await processRequest(ctx);
        controller.close();
      } catch (error: any) {
        console.error("Stream error:", error);
        // Send error as plain text for backward compatibility
        controller.enqueue(encoder.encode(`Error: ${error.message}`));
        controller.close();
      }
    }
  });
}

/**
 * Create SSE Response with proper headers
 */
export function createSSEResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}

/**
 * Create JSON error response
 */
export function createErrorResponse(message: string, status: number = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
