/**
 * Abstract AI provider interface supporting multiple backends.
 * Implements the Strategy pattern for interchangeable AI providers.
 */

import type { AIPrompt, AIResponse, AIStreamChunk, AIProviderConfig } from "../types";

/**
 * Base interface all AI providers must implement.
 */
export interface AIProvider {
  readonly name: string;
  readonly modelId: string;

  /**
   * Send a prompt and receive a complete response.
   */
  complete(prompt: AIPrompt): Promise<AIResponse>;

  /**
   * Send a prompt and receive a streaming response.
   */
  stream(prompt: AIPrompt): AsyncGenerator<AIStreamChunk>;

  /**
   * Check if the provider is available and configured.
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Factory function type for creating providers.
 */
export type AIProviderFactory = (config: AIProviderConfig) => AIProvider;

/**
 * Provider registry for managing multiple AI backends.
 */
export class AIProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProviderName: string | null = null;

  /**
   * Register a provider.
   */
  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
    if (!this.defaultProviderName) {
      this.defaultProviderName = provider.name;
    }
  }

  /**
   * Set the default provider.
   */
  setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider "${name}" not registered`);
    }
    this.defaultProviderName = name;
  }

  /**
   * Get a provider by name, or the default provider.
   */
  get(name?: string): AIProvider {
    const providerName = name || this.defaultProviderName;
    if (!providerName) {
      throw new Error("No provider registered");
    }
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider "${providerName}" not found`);
    }
    return provider;
  }

  /**
   * Get all registered provider names.
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get the first available provider (for fallback logic).
   */
  async getAvailable(): Promise<AIProvider | null> {
    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        return provider;
      }
    }
    return null;
  }
}
