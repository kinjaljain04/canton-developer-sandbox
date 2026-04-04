import { createClient } from 'redis';
import * as dotenv from 'dotenv';

// Load environment variables from .env file if it exists
dotenv.config();

// --- Configuration ---
// The time window for rate limiting in seconds.
// Defaults to 86400 seconds (24 hours).
const RATE_LIMIT_WINDOW_SECONDS: number = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '86400', 10);

// The maximum number of requests allowed per identifier within the time window.
// Defaults to 1 request.
const MAX_REQUESTS_PER_WINDOW: number = parseInt(process.env.MAX_REQUESTS_PER_WINDOW || '1', 10);

// The Redis connection URL.
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// --- Redis Client Setup ---
export const redisClient = createClient({
  url: REDIS_URL
});

redisClient.on('error', (err) => console.error('[Faucet] Redis Client Error', err));
redisClient.on('connect', () => console.log('[Faucet] Connected to Redis server.'));
redisClient.on('reconnecting', () => console.log('[Faucet] Reconnecting to Redis server...'));
redisClient.on('ready', () => console.log('[Faucet] Redis client is ready.'));

// Asynchronously connect to Redis. The client will handle auto-reconnection.
redisClient.connect().catch(console.error);

export interface RateLimitStatus {
  /** True if the request is allowed, false otherwise. */
  isAllowed: boolean;
  /** The number of requests remaining in the current window. */
  remaining: number;
  /** The time in seconds until the rate limit window resets. 0 if the request is allowed. */
  retryAfter: number;
}

/**
 * Checks if a given identifier has exceeded the rate limit using Redis.
 * This implementation is atomic and robust against race conditions.
 *
 * @param identifier A unique string identifying the entity to be rate-limited (e.g., a user's Daml Party ID).
 * @returns A promise that resolves to an object with the rate limit status.
 */
export const checkRateLimit = async (identifier: string): Promise<RateLimitStatus> => {
  if (!redisClient.isReady) {
    console.error('[Faucet] Redis client is not ready. Denying request as a fail-safe.');
    // If we can't connect to our rate limit store, it's safer to deny requests
    // to prevent abuse during a system outage.
    return { isAllowed: false, remaining: 0, retryAfter: 60 };
  }

  const key = `faucet:rate_limit:${identifier}`;

  try {
    // Use a MULTI/EXEC transaction to ensure atomicity.
    const multi = redisClient.multi();
    
    // INCR will create the key with a value of 1 if it doesn't exist.
    multi.incr(key);
    // Get the current TTL of the key. It will be -1 if the key is new.
    multi.ttl(key);

    const results = await multi.exec();

    // Type guard to ensure results are in the expected format.
    if (results === null || results.length < 2 || typeof results[0] !== 'number' || typeof results[1] !== 'number') {
        throw new Error('Unexpected response from Redis transaction.');
    }

    const currentCount = results[0] as number;
    let ttl = results[1] as number;

    // If the key was just created, its TTL is -1. We must set the expiration.
    if (ttl === -1) {
      await redisClient.expire(key, RATE_LIMIT_WINDOW_SECONDS);
      ttl = RATE_LIMIT_WINDOW_SECONDS; // The TTL is now the full window.
    }

    const isAllowed = currentCount <= MAX_REQUESTS_PER_WINDOW;
    const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - currentCount);

    return {
      isAllowed,
      remaining,
      retryAfter: isAllowed ? 0 : ttl,
    };
  } catch (error) {
    console.error(`[Faucet] Error during Redis rate limit check for identifier "${identifier}":`, error);
    // Again, fail-safe by denying the request.
    return { isAllowed: false, remaining: 0, retryAfter: 60 };
  }
};

/**
 * Gracefully disconnects the Redis client.
 * This should be called on application shutdown to ensure all pending commands are sent.
 */
export const disconnectRedis = async (): Promise<void> => {
  if (redisClient.isReady) {
    console.log('[Faucet] Disconnecting from Redis server.');
    await redisClient.quit();
  }
};