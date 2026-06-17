/**
 * Type-safe API client with automatic tenant header injection,
 * retry logic, and offline queue support.
 */

export interface ApiClientConfig {
  baseUrl?: string;
  tenantId?: string;
  authToken?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: string;
  headers: Record<string, string>;
  timestamp: number;
}

class ApiClient {
  private config: Required<ApiClientConfig>;
  private offlineQueue: QueuedRequest[] = [];

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || "/api",
      tenantId: config.tenantId || "",
      authToken: config.authToken || "",
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
    };
  }

  setTenantId(tenantId: string): void {
    this.config.tenantId = tenantId;
  }

  setAuthToken(token: string): void {
    this.config.authToken = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.tenantId) {
      headers["X-Tenant-ID"] = this.config.tenantId;
    }
    if (this.config.authToken) {
      headers["Authorization"] = `Bearer ${this.config.authToken}`;
    }
    return headers;
  }

  private isOnline(): boolean {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries: number = this.config.maxRetries
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);
      if (response.status >= 500 && retries > 0) {
        await this.sleep(this.config.retryDelay);
        return this.fetchWithRetry(url, options, retries - 1);
      }
      return response;
    } catch (error) {
      if (retries > 0 && this.isOnline()) {
        await this.sleep(this.config.retryDelay);
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  private queueRequest(url: string, method: string, body?: string): void {
    const request: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url,
      method,
      body,
      headers: this.getHeaders(),
      timestamp: Date.now(),
    };
    this.offlineQueue.push(request);
    // Persist to localStorage
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("api_offline_queue", JSON.stringify(this.offlineQueue));
    }
  }

  async syncOfflineQueue(): Promise<void> {
    if (!this.isOnline() || this.offlineQueue.length === 0) return;

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const request of queue) {
      try {
        await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });
      } catch {
        // Re-queue failed requests
        this.offlineQueue.push(request);
      }
    }

    if (typeof localStorage !== "undefined") {
      localStorage.setItem("api_offline_queue", JSON.stringify(this.offlineQueue));
    }
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${path}`;
    try {
      const response = await this.fetchWithRetry(url, {
        method: "GET",
        headers: this.getHeaders(),
      });
      const data = await response.json();
      return { data, error: null, status: response.status };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      };
    }
  }

  async post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${path}`;
    const bodyStr = JSON.stringify(body);

    if (!this.isOnline()) {
      this.queueRequest(url, "POST", bodyStr);
      return { data: null, error: "Request queued for offline sync", status: 0 };
    }

    try {
      const response = await this.fetchWithRetry(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: bodyStr,
      });
      const data = await response.json();
      return { data, error: null, status: response.status };
    } catch (error) {
      this.queueRequest(url, "POST", bodyStr);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      };
    }
  }

  async put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${path}`;
    const bodyStr = JSON.stringify(body);

    if (!this.isOnline()) {
      this.queueRequest(url, "PUT", bodyStr);
      return { data: null, error: "Request queued for offline sync", status: 0 };
    }

    try {
      const response = await this.fetchWithRetry(url, {
        method: "PUT",
        headers: this.getHeaders(),
        body: bodyStr,
      });
      const data = await response.json();
      return { data, error: null, status: response.status };
    } catch (error) {
      this.queueRequest(url, "PUT", bodyStr);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      };
    }
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${path}`;
    try {
      const response = await this.fetchWithRetry(url, {
        method: "DELETE",
        headers: this.getHeaders(),
      });
      const data = await response.json();
      return { data, error: null, status: response.status };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      };
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing or custom instances
export { ApiClient };
