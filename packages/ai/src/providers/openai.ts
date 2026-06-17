/**
 * OpenAI provider implementation as fallback/alternative.
 * Supports GPT-4 and other OpenAI models via the Chat Completions API.
 */

import type { AIPrompt, AIResponse, AIStreamChunk, AIProviderConfig } from "../types";
import type { AIProvider } from "./base";

/**
 * Configuration specific to OpenAI.
 */
export interface OpenAIConfig extends AIProviderConfig {
  provider: "openai";
  apiKey: string;
  modelId: string;
  organizationId?: string;
  baseUrl?: string;
}

/**
 * OpenAI HTTP client interface for dependency injection.
 */
export interface OpenAIHttpClient {
  post(
    url: string,
    body: Record<string, unknown>,
    headers: Record<string, string>
  ): Promise<OpenAIChatResponse>;

  postStream(
    url: string,
    body: Record<string, unknown>,
    headers: Record<string, string>
  ): AsyncGenerator<OpenAIStreamEvent>;
}

export interface OpenAIChatResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export interface OpenAIStreamEvent {
  choices: Array<{
    delta: { content?: string };
    finish_reason: string | null;
  }>;
}

/**
 * OpenAI provider for AI model invocation.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly modelId: string;
  private config: OpenAIConfig;
  private httpClient: OpenAIHttpClient;

  constructor(config: OpenAIConfig, httpClient?: OpenAIHttpClient) {
    this.config = config;
    this.modelId = config.modelId;
    this.httpClient = httpClient || createDefaultHttpClient();
  }

  /**
   * Send a prompt and receive a complete response.
   */
  async complete(prompt: AIPrompt): Promise<AIResponse> {
    const url = `${this.config.baseUrl || "https://api.openai.com"}/v1/chat/completions`;
    const body = this.buildRequestBody(prompt);
    const headers = this.getHeaders();

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.httpClient.post(url, body, headers);
        return this.parseResponse(response);
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this.isRetryableError(lastError) && attempt < maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
        throw lastError;
      }
    }

    throw lastError || new Error("OpenAI invocation failed");
  }

  /**
   * Send a prompt and receive a streaming response.
   */
  async *stream(prompt: AIPrompt): AsyncGenerator<AIStreamChunk> {
    const url = `${this.config.baseUrl || "https://api.openai.com"}/v1/chat/completions`;
    const body = { ...this.buildRequestBody(prompt), stream: true };
    const headers = this.getHeaders();

    try {
      const events = this.httpClient.postStream(url, body, headers);

      for await (const event of events) {
        const choice = event.choices[0];
        if (choice) {
          yield {
            content: choice.delta.content || "",
            isComplete: choice.finish_reason != null,
          };
        }
      }
    } catch (error: unknown) {
      yield {
        content: "",
        isComplete: true,
        error: error instanceof Error ? error.message : "Stream error",
      };
    }
  }

  /**
   * Check if OpenAI is available by verifying config.
   */
  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey && this.config.apiKey.length > 0;
  }

  private buildRequestBody(prompt: AIPrompt): Record<string, unknown> {
    const messages = [
      { role: "system", content: prompt.system },
      ...prompt.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    return {
      model: this.config.modelId,
      messages,
      max_tokens: prompt.maxTokens || this.config.maxTokens,
      temperature: prompt.temperature ?? this.config.temperature,
      top_p: this.config.topP,
      stop: this.config.stopSequences,
    };
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.apiKey}`,
    };

    if (this.config.organizationId) {
      headers["OpenAI-Organization"] = this.config.organizationId;
    }

    return headers;
  }

  private parseResponse(response: OpenAIChatResponse): AIResponse {
    const choice = response.choices[0];

    return {
      content: choice?.message.content || "",
      usage: {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      model: response.model,
      finishReason: this.mapFinishReason(choice?.finish_reason),
    };
  }

  private mapFinishReason(reason: string | undefined): AIResponse["finishReason"] {
    switch (reason) {
      case "stop":
        return "complete";
      case "length":
        return "max_tokens";
      default:
        return "complete";
    }
  }

  private isRetryableError(error: Error): boolean {
    const retryableMessages = ["429", "500", "502", "503", "ECONNRESET", "ETIMEDOUT"];
    return retryableMessages.some((msg) => error.message.includes(msg));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Default HTTP client placeholder.
 * In production, use fetch or axios.
 */
function createDefaultHttpClient(): OpenAIHttpClient {
  return {
    post: async () => {
      throw new Error("OpenAI HTTP client not configured. Provide a custom httpClient.");
    },
    postStream: async function* () {
      throw new Error("OpenAI streaming HTTP client not configured.");
    },
  };
}
