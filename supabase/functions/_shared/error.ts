/**
 * Shared error handling utilities for Edge Functions
 */

import { corsHeaders } from './cors.ts';

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown
): Response {
  const body: ErrorResponse = { error: message };
  if (code) body.code = code;
  if (details) body.details = details;

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Common error responses
 */
export const ErrorResponses = {
  unauthorized: () => createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED'),
  forbidden: () => createErrorResponse('Forbidden', 403, 'FORBIDDEN'),
  notFound: (resource = 'Resource') => 
    createErrorResponse(`${resource} not found`, 404, 'NOT_FOUND'),
  badRequest: (message: string, details?: unknown) => 
    createErrorResponse(message, 400, 'BAD_REQUEST', details),
  internalError: (message = 'Internal server error') => 
    createErrorResponse(message, 500, 'INTERNAL_ERROR'),
  methodNotAllowed: (allowed: string[]) => 
    createErrorResponse(`Method not allowed. Use: ${allowed.join(', ')}`, 405, 'METHOD_NOT_ALLOWED'),
};

/**
 * Wrap a handler with error handling
 */
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      console.error('Unhandled error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return ErrorResponses.internalError(message);
    }
  };
}
