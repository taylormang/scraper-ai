export interface RateLimiterConfig {
  requestsPerMinute: number;
}

export class RateLimiter {
  private requests: number[] = [];
  private readonly requestsPerMinute: number;

  constructor(config: RateLimiterConfig) {
    this.requestsPerMinute = config.requestsPerMinute;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute ago

    // Remove requests older than 1 minute
    this.requests = this.requests.filter(timestamp => timestamp > windowStart);

    // Check if we're at the limit
    if (this.requests.length >= this.requestsPerMinute) {
      // Calculate how long to wait until the oldest request expires
      const oldestRequest = this.requests[0];
      const waitTime = (oldestRequest + 60000) - now;

      if (waitTime > 0) {
        console.log(`⏳ Rate limit reached, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.waitIfNeeded(); // Recurse to check again
      }
    }

    // Record this request
    this.requests.push(now);
  }

  getCurrentUsage(): { used: number; limit: number; remaining: number } {
    const now = Date.now();
    const windowStart = now - 60000;

    // Clean up old requests
    this.requests = this.requests.filter(timestamp => timestamp > windowStart);

    return {
      used: this.requests.length,
      limit: this.requestsPerMinute,
      remaining: this.requestsPerMinute - this.requests.length
    };
  }

  reset(): void {
    this.requests = [];
  }
}