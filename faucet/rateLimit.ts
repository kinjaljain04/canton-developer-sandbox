/**
 * In-memory rate limiter for the Canton faucet.
 *
 * This simple implementation tracks the last claim time for each address.
 * It enforces a limit of one claim per address within a 24-hour window.
 *
 * NOTE: Since this is an in-memory store, the rate limit data will be reset
 * every time the faucet server restarts. For a production-grade faucet, a
 * persistent data store like Redis or a database would be more appropriate.
 */

// A Map to store the timestamp of the last successful claim for each address.
// Key: address (string), Value: Date object of the last claim.
const claimTimestamps = new Map<string, Date>();

// The rate limit period in milliseconds (24 hours).
const RATE_LIMIT_PERIOD_MS = 24 * 60 * 60 * 1000;

/**
 * Checks if a given address is allowed to claim funds based on the rate limit.
 * If the claim is allowed, it records the current time as the new last claim time.
 *
 * @param address The blockchain address requesting funds.
 * @returns An object indicating if the claim is allowed and when the next claim is possible.
 */
export const checkRateLimit = (
  address: string
): { allowed: boolean; nextClaimAvailableAt?: Date } => {
  const now = new Date();
  const lastClaimTime = claimTimestamps.get(address);

  if (!lastClaimTime) {
    // This is the first time this address is claiming. The claim is allowed.
    claimTimestamps.set(address, now);
    return { allowed: true };
  }

  const timeSinceLastClaim = now.getTime() - lastClaimTime.getTime();
  const nextClaimAvailableAt = new Date(lastClaimTime.getTime() + RATE_LIMIT_PERIOD_MS);

  if (timeSinceLastClaim < RATE_LIMIT_PERIOD_MS) {
    // It has been less than 24 hours since the last claim. The claim is denied.
    console.log(
      `Rate limit hit for address: ${address}. Next claim is available at ${nextClaimAvailableAt.toISOString()}`
    );
    return { allowed: false, nextClaimAvailableAt };
  }

  // It has been more than 24 hours. The claim is allowed.
  // Update the timestamp to the current time.
  claimTimestamps.set(address, now);
  return { allowed: true };
};

/**
 * For testing purposes: allows clearing the rate limit records.
 */
export const clearRateLimitRecords = (): void => {
  claimTimestamps.clear();
};