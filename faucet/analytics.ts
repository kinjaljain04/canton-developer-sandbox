import { promises as fs } from 'fs';
import path from 'path';

// --- Constants ---

// Defines the storage location for the faucet claim history.
// Using a simple JSON file is sufficient for a developer sandbox faucet.
const ANALYTICS_DB_PATH = process.env.ANALYTICS_DB_PATH || path.join(__dirname, '..', '..', 'data', 'faucet-claims.json');

// --- Type Definitions ---

/**
 * Represents a single faucet claim event, capturing all relevant details
 * for analytics and rate-limiting purposes.
 */
export interface ClaimEvent {
  /** The Canton Party ID that received the funds. */
  partyId: string;
  /** The IP address of the requester, used for rate limiting. */
  ipAddress: string;
  /** The ISO 8601 timestamp of when the claim event was recorded. */
  timestamp: string;
  /** The amount of Canton Coin (CC) requested. */
  amount: number;
  /** The transaction ID from the Canton ledger, if the claim was successful. */
  transactionId?: string;
  /** Indicates whether the faucet disbursement was successfully submitted to the ledger. */
  success: boolean;
  /** An optional error message if the claim failed. */
  errorMessage?: string;
}

// --- Private Data Store Functions ---

/**
 * Ensures the data directory exists before attempting to read/write the analytics file.
 */
const ensureDataDirectory = async (): Promise<void> => {
  try {
    await fs.mkdir(path.dirname(ANALYTICS_DB_PATH), { recursive: true });
  } catch (error) {
    // It's okay if the directory already exists.
    if (error.code !== 'EEXIST') {
      console.error(`[Analytics] Failed to create data directory at ${path.dirname(ANALYTICS_DB_PATH)}:`, error);
      throw error;
    }
  }
};

/**
 * Loads all claim events from the JSON database file.
 * If the file doesn't exist, it gracefully returns an empty array.
 * @returns A promise that resolves to an array of ClaimEvent objects.
 */
const loadAnalyticsData = async (): Promise<ClaimEvent[]> => {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(ANALYTICS_DB_PATH, 'utf-8');
    return JSON.parse(data) as ClaimEvent[];
  } catch (error) {
    // If the file doesn't exist, it's not an error; we just start with an empty list.
    if (error.code === 'ENOENT') {
      return [];
    }
    // For any other read/parse errors, log and re-throw.
    console.error('[Analytics] Failed to load analytics data:', error);
    throw error;
  }
};

/**
 * Saves the entire list of claim events to the JSON database file.
 * Note: This implementation is not atomic and not optimized for high-concurrency.
 * For a developer faucet with low traffic, this is an acceptable trade-off for simplicity.
 * @param claims - The array of ClaimEvent objects to save.
 */
const saveAnalyticsData = async (claims: ClaimEvent[]): Promise<void> => {
  try {
    await ensureDataDirectory();
    const data = JSON.stringify(claims, null, 2); // Pretty-print for easier inspection
    await fs.writeFile(ANALYTICS_DB_PATH, data, 'utf-8');
  } catch (error) {
    console.error('[Analytics] Failed to save analytics data:', error);
    throw error;
  }
};

// --- Public Analytics API ---

/**
 * Logs a new faucet claim event to the analytics store. This should be called
 * for both successful and failed attempts to maintain a complete record.
 * @param newClaim - The details of the claim event to log, excluding the timestamp which is added automatically.
 */
export const logClaim = async (
  newClaim: Omit<ClaimEvent, 'timestamp'>
): Promise<void> => {
  const claims = await loadAnalyticsData();
  const claimWithTimestamp: ClaimEvent = {
    ...newClaim,
    timestamp: new Date().toISOString(),
  };
  claims.push(claimWithTimestamp);
  await saveAnalyticsData(claims);
};

/**
 * Retrieves all claim events associated with a specific Party ID.
 * @param partyId - The Party ID to search for.
 * @returns A promise that resolves to an array of matching claim events.
 */
export const getClaimsByParty = async (partyId: string): Promise<ClaimEvent[]> => {
  const claims = await loadAnalyticsData();
  return claims.filter(claim => claim.partyId === partyId);
};

/**
 * Retrieves all claim events associated with a specific IP address.
 * @param ipAddress - The IP address to search for.
 * @returns A promise that resolves to an array of matching claim events.
 */
export const getClaimsByIp = async (ipAddress: string): Promise<ClaimEvent[]> => {
  const claims = await loadAnalyticsData();
  return claims.filter(claim => claim.ipAddress === ipAddress);
};

/**
 * Finds the most recent successful claim made from a specific IP address.
 * This is the primary function used for implementing time-based rate limiting
 * (e.g., allowing one claim per IP address per 24 hours).
 * @param ipAddress - The IP address to search for.
 * @returns A promise that resolves to the most recent successful ClaimEvent, or null if none exists.
 */
export const getMostRecentSuccessfulClaimByIp = async (
  ipAddress: string
): Promise<ClaimEvent | null> => {
  const claims = await getClaimsByIp(ipAddress);
  const successfulClaims = claims.filter(c => c.success);

  if (successfulClaims.length === 0) {
    return null;
  }

  // Sort by timestamp descending to find the most recent event.
  successfulClaims.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return successfulClaims[0];
};

/**
 * Calculates aggregate statistics about faucet usage, useful for a public dashboard.
 * @returns A promise that resolves to an object containing key faucet metrics.
 */
export const getFaucetStats = async () => {
  const allClaims = await loadAnalyticsData();
  const successfulClaims = allClaims.filter(c => c.success);

  const totalClaims = allClaims.length;
  const totalSuccessfulClaims = successfulClaims.length;
  const totalAmountDispensed = successfulClaims.reduce((sum, claim) => sum + claim.amount, 0);

  const uniqueParties = new Set(successfulClaims.map(c => c.partyId)).size;
  const uniqueIps = new Set(successfulClaims.map(c => c.ipAddress)).size;

  return {
    totalClaims,
    totalSuccessfulClaims,
    totalAmountDispensed,
    uniqueParties,
    uniqueIps,
  };
};