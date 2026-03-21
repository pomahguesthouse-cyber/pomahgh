/**
 * Shared AI Helper
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
 * Call AI via Lovable Gateway. Throws on non-retryable errors; returns { rateLimited: true } on 429.
 */
export async function callAI(
  apiKey: string,
  model: string,
  messages: AIMessage[],
  options: AICallOptions = {}
): Promise<{ rateLimited: false; data: AICallResult } | { rateLimited: true; data: null }> {
  const body: Record<string, unknown> = {
    model,
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
    console.error(`[aiProvider] Gateway error ${response.status} (model: ${model}):`, errorText);
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
  const body: Record<string, unknown> = {
    model,
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
