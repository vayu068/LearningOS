/**
 * AWS Bedrock AI provider implementation.
 * Supports Claude models via the Bedrock Runtime API.
 */

import type { AIPrompt, AIResponse, AIStreamChunk, AIProviderConfig } from "../types";
import type { AIProvider } from "./base";

/**
 * Configuration specific to AWS Bedrock.
 */
export interface BedrockConfig extends AIProviderConfig {
  provider: "bedrock";
  region: string;
  modelId: string;
}

/**
 * AWS Bedrock provider for AI model invocation.
 * Uses the Bedrock Runtime API to invoke Claude and other models.
 */
export class BedrockProvider implements AIProvider {
  readonly name = "bedrock";
  readonly modelId: string;
  private config: BedrockConfig;
  private client: BedrockRuntimeClient | null = null;

  constructor(config: BedrockConfig) {
    this.config = config;
    this.modelId = config.modelId;
  }

  /**
   * Send a prompt and receive a complete response.
   */
  async complete(prompt: AIPrompt): Promise<AIResponse> {
    const client = this.getClient();
    const requestBody = this.buildRequestBody(prompt);

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await client.invokeModel({
          modelId: this.config.modelId,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify(requestBody),
        });

        return this.parseResponse(response.body);
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this.isRetryableError(lastError) && attempt < maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
        throw lastError;
      }
    }

    throw lastError || new Error("Bedrock invocation failed");
  }

  /**
   * Send a prompt and receive a streaming response.
   */
  async *stream(prompt: AIPrompt): AsyncGenerator<AIStreamChunk> {
    const client = this.getClient();
    const requestBody = this.buildRequestBody(prompt);

    try {
      const response = await client.invokeModelWithResponseStream({
        modelId: this.config.modelId,
        contentType: "application/json",
        body: JSON.stringify(requestBody),
      });

      if (response.body) {
        for await (const event of response.body) {
          if (event.chunk?.bytes) {
            const decoded = new TextDecoder().decode(event.chunk.bytes);
            const parsed = JSON.parse(decoded);

            yield {
              content: parsed.completion || parsed.delta?.text || "",
              isComplete: parsed.stop_reason != null,
            };
          }
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
   * Check if Bedrock is available.
   */
  async isAvailable(): Promise<boolean> {
    try {
      return this.config.region != null && this.config.region.length > 0;
    } catch {
      return false;
    }
  }

  private getClient(): BedrockRuntimeClient {
    if (!this.client) {
      this.client = createBedrockRuntimeClient({
        region: this.config.region,
      });
    }
    return this.client;
  }

  private buildRequestBody(prompt: AIPrompt): Record<string, unknown> {
    const messages = prompt.messages.map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }));

    return {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: prompt.maxTokens || this.config.maxTokens,
      temperature: prompt.temperature ?? this.config.temperature,
      top_p: this.config.topP,
      system: prompt.system,
      messages,
      stop_sequences: this.config.stopSequences,
    };
  }

  private parseResponse(body: Uint8Array | string): AIResponse {
    const decoded = typeof body === "string" ? body : new TextDecoder().decode(body);
    const parsed = JSON.parse(decoded);

    return {
      content: parsed.content?.[0]?.text || parsed.completion || "",
      usage: {
        inputTokens: parsed.usage?.input_tokens || 0,
        outputTokens: parsed.usage?.output_tokens || 0,
        totalTokens: (parsed.usage?.input_tokens || 0) + (parsed.usage?.output_tokens || 0),
      },
      model: this.config.modelId,
      finishReason: this.mapFinishReason(parsed.stop_reason),
    };
  }

  private mapFinishReason(reason: string | undefined): AIResponse["finishReason"] {
    switch (reason) {
      case "end_turn":
        return "complete";
      case "max_tokens":
        return "max_tokens";
      case "stop_sequence":
        return "stop_sequence";
      default:
        return "complete";
    }
  }

  private isRetryableError(error: Error): boolean {
    const retryableMessages = [
      "ThrottlingException",
      "ServiceUnavailableException",
      "ModelTimeoutException",
      "ECONNRESET",
      "ETIMEDOUT",
    ];
    return retryableMessages.some((msg) => error.message.includes(msg));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Minimal Bedrock Runtime client interface for dependency injection.
 * In production, use @aws-sdk/client-bedrock-runtime.
 */
export interface BedrockRuntimeClient {
  invokeModel(params: {
    modelId: string;
    contentType: string;
    accept?: string;
    body: string;
  }): Promise<{ body: Uint8Array | string }>;

  invokeModelWithResponseStream(params: {
    modelId: string;
    contentType: string;
    body: string;
  }): Promise<{
    body: AsyncIterable<{ chunk?: { bytes?: Uint8Array } }> | null;
  }>;
}

/**
 * Factory function to create a Bedrock Runtime client.
 * Can be replaced with a mock for testing.
 */
export function createBedrockRuntimeClient(config: { region: string }): BedrockRuntimeClient {
  // This would use @aws-sdk/client-bedrock-runtime in production.
  // The interface above allows easy mocking for tests.
  return {
    invokeModel: async () => {
      throw new Error(
        `Bedrock client not initialized. Configure AWS SDK with region: ${config.region}`
      );
    },
    invokeModelWithResponseStream: async () => {
      throw new Error(
        `Bedrock streaming client not initialized. Configure AWS SDK with region: ${config.region}`
      );
    },
  };
}
