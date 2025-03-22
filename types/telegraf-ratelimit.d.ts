declare module "telegraf-ratelimit" {
  import { Context, Middleware } from "telegraf";

  interface RateLimitOptions {
    /**
     * Time window in milliseconds (default: 1000ms).
     */
    window?: number;

    /**
     * Maximum number of messages allowed per user within the time window (default: 1).
     */
    limit?: number;

    /**
     * Function to generate a unique key for each user (default: uses `ctx.from.id`).
     */
    keyGenerator?: (ctx: Context) => string | number | undefined;

    /**
     * Callback function triggered when the rate limit is exceeded.
     */
    onLimitExceeded?: (ctx: Context, next: () => void) => void;
  }

  /**
   * Creates a rate-limiting middleware for Telegraf.
   * @param options Configuration options for the rate limiter.
   * @returns A Telegraf middleware function.
   */
  function rateLimit(options: RateLimitOptions): Middleware<Context>;

  export = rateLimit;
}
