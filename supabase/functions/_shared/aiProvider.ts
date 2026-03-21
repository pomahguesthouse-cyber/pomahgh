/**
 * Shared AI Provider Helper
 * Wraps calls to Lovable Gateway (ai.gateway.lovable.dev)
 * which supports multiple providers by model name prefix:
 *   google/...     → Google Gemini
 *   openai/...     → OpenAI GPT
 *   anthropic/...  → Anthropic Claude
 */

export const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface AIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: unknown[];
  name?: string;
}

export interface AICallOptions {
  temperature?: number;
  max_tokens?: number;
  tools?: unknown[];
  tool_choice?: unknown;
  stream?: boolean;
}

export interface AICallResult {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason?: string;
    delta?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Map of user-friendly model names to gateway model IDs
 */
export const AI_MODELS: Record<string, { id: string; displayName: string; provider: string; tier: string }> = {
  "google/gemini-2.5-flash": {
    id: "google/gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    provider: "Google",
    tier: "fast",
  },
  "google/gemini-2.5-pro": {
    id: "google/gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    provider: "Google",
    tier: "smart",
  },
  "openai/gpt-4o-mini": {
    id: "openai/gpt-4o-mini",
    displayName: "GPT-4o Mini",
    provider: "OpenAI",
    tier: "fast",
  },
  "openai/gpt-4o": {
    id: "openai/gpt-4o",
    displayName: "GPT-4o",
    provider: "OpenAI",
    tier: "smart",
  },
  "anthropic/claude-3-5-haiku": {
    id: "anthropic/claude-3-5-haiku",
    displayName: "Claude 3.5 Haiku",
    provider: "Anthropic",
    tier: "fast",
  },
  "anthropic/claude-3-5-sonnet": {
    id: "anthropic/claude-3-5-sonnet",
    displayName: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    tier: "smart",
  },
};

export const DEFAULT_MODEL = "google/gemini-2.5-flash";

/**
 * Call AI via Lovable Gateway with any supported provider model.
 * Throws on non-retryable errors; returns { rateLimited: true } on 429.
 */
export async function callAI(
  apiKey: string,
  model: string,
  messages: AIMessage[],
  options: AICallOptions = {}
): Promise<{ rateLimited: false; data: AICallResult } | { rateLimited: true; data: null }> {
  // Validate model, fall back to default if unknown
  const resolvedModel = AI_MODELS[model]?.id ?? DEFAULT_MODEL;

  const body: Record<string, unknown> = {
    model: resolvedModel,
    messages,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.max_tokens ?? 700,
  };

  if (options.tools) {
    body.tools = options.tools;
    body.tool_choice = options.tool_choice ?? "auto";
  }

  if (options.stream) {
    body.stream = true;
  }

  const response = await fetch(LOVABLE_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 429) {
      return { rateLimited: true, data: null };
    }
    const errorText = await response.text();
    console.error(`[aiProvider] Gateway error ${response.status} (model: ${resolvedModel}):`, errorText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json() as AICallResult;
  return { rateLimited: false, data };
}

/**
 * Streaming call — returns the raw Response for SSE passthrough.
 */
export async function callAIStream(
  apiKey: string,
  model: string,
  messages: AIMessage[],
  options: Omit<AICallOptions, "stream"> = {}
): Promise<{ rateLimited: false; response: Response } | { rateLimited: true }> {
  const resolvedModel = AI_MODELS[model]?.id ?? DEFAULT_MODEL;

  const body: Record<string, unknown> = {
    model: resolvedModel,
    messages,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.max_tokens ?? 700,
    stream: true,
  };

  if (options.tools) {
    body.tools = options.tools;
    body.tool_choice = options.tool_choice ?? "auto";
  }

  const response = await fetch(LOVABLE_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 429) return { rateLimited: true };
    const errorText = await response.text();
    console.error(`[aiProvider] Stream gateway error ${response.status}:`, errorText);
    throw new Error(`AI gateway stream error: ${response.status}`);
  }

  return { rateLimited: false, response };
}
