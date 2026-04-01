import express, { Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { Ledger, CreateCommand } from '@daml/ledger';
import { v4 as uuidv4 } from 'uuid';

// --- Configuration ---
// Load configuration from environment variables for production-readiness.
const PORT = process.env.PORT || 8080;
const JSON_API_URL = process.env.JSON_API_URL || 'http://localhost:7575';
const LEDGER_ID = process.env.LEDGER_ID || 'canton-developer-sandbox';
const FAUCET_OPERATOR_PARTY_ID = process.env.FAUCET_OPERATOR_PARTY_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const COIN_TEMPLATE_ID = process.env.COIN_TEMPLATE_ID; // e.g., "PACKAGE_ID:Fungible.Asset:Asset"
const DISPENSE_AMOUNT = process.env.DISPENSE_AMOUNT || '1000.00';
const COIN_CURRENCY_SYMBOL = process.env.COIN_CURRENCY_SYMBOL || 'CC';


// --- Pre-flight Sanity Checks ---
// Fail fast if the server is not configured correctly.
if (!FAUCET_OPERATOR_PARTY_ID) {
  throw new Error("FATAL: Missing required environment variable: FAUCET_OPERATOR_PARTY_ID");
}
if (!JWT_SECRET) {
  throw new Error("FATAL: Missing required environment variable: JWT_SECRET");
}
if (!COIN_TEMPLATE_ID) {
  throw new Error("FATAL: Missing required environment variable: COIN_TEMPLATE_ID");
}

console.log("Canton Faucet Server starting with configuration:");
console.log(`  - Listening on Port:    ${PORT}`);
console.log(`  - JSON API URL:         ${JSON_API_URL}`);
console.log(`  - Ledger ID:            ${LEDGER_ID}`);
console.log(`  - Faucet Operator:      ${FAUCET_OPERATOR_PARTY_ID}`);
console.log(`  - Coin Template:        ${COIN_TEMPLATE_ID}`);
console.log(`  - Dispense Amount:      ${DISPENSE_AMOUNT} ${COIN_CURRENCY_SYMBOL}`);


// --- Helper Functions ---

/**
 * Generates a Daml JWT for a given party, required for authenticating with the JSON API.
 * @param partyId The party ID to include in the token's payload.
 * @returns A signed JWT string.
 */
const generateDamlJwt = (partyId: string): string => {
  const payload = {
    "https://daml.com/ledger-api": {
      "ledgerId": LEDGER_ID,
      "applicationId": `canton-faucet-${uuidv4()}`, // Unique ID for traceability
      "actAs": [partyId]
    }
  };
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
};


// --- Express App Setup ---
const app = express();
app.use(cors()); // Enable CORS for browser-based requests
app.use(express.json()); // Middleware to parse JSON request bodies


// --- API Routes ---

/**
 * Health check endpoint to verify the server is running.
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Main faucet endpoint to dispense testnet coins.
 * Accepts a POST request with a JSON body containing the recipient's `partyId`.
 */
app.post('/dispense', async (req: Request, res: Response) => {
  const { partyId } = req.body;

  if (!partyId || typeof partyId !== 'string' || partyId.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid "partyId" in request body.' });
  }

  console.log(`[${new Date().toISOString()}] Received dispense request for party: ${partyId}`);

  try {
    // 1. Generate a token for the faucet operator to act on the ledger.
    const faucetToken = generateDamlJwt(FAUCET_OPERATOR_PARTY_ID!);

    // 2. Connect to the Daml Ledger's JSON API.
    const ledger = new Ledger({ token: faucetToken, httpBaseUrl: JSON_API_URL });

    // 3. Define the command to create the coin contract.
    // This payload structure assumes a generic fungible asset Daml model like:
    // template Asset with issuer: Party; owner: Party; quantity: Decimal; id: Id ...
    // template Id with signatories: [Party]; label: Text; ...
    const createCommand: CreateCommand = {
      templateId: COIN_TEMPLATE_ID!,
      payload: {
        issuer: FAUCET_OPERATOR_PARTY_ID,
        owner: partyId,
        quantity: DISPENSE_AMOUNT,
        // The `id` field is often a nested record in standard fungible asset models.
        id: {
            signatories: [FAUCET_OPERATOR_PARTY_ID],
            label: COIN_CURRENCY_SYMBOL,
            observers: []
        }
      }
    };

    // 4. Execute the create command against the ledger.
    console.log(`  -> Submitting create command for ${DISPENSE_AMOUNT} ${COIN_CURRENCY_SYMBOL} to ${partyId}...`);
    const createEvent = await ledger.create(createCommand);
    console.log(`  -> Successfully created contract ${createEvent.contractId} in transaction ${createEvent.transactionId}.`);

    // 5. Respond to the client with success.
    res.status(200).json({
      message: `Successfully dispensed ${DISPENSE_AMOUNT} ${COIN_CURRENCY_SYMBOL} to ${partyId}.`,
      transactionId: createEvent.transactionId,
      contractId: createEvent.contractId,
    });

  } catch (error) {
    console.error(`[ERROR] Failed dispense operation for ${partyId}:`, error);

    // Provide a structured error response.
    let errorMessage = 'An internal server error occurred while contacting the ledger.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }

    res.status(500).json({
      error: 'Failed to dispense coins.',
      details: errorMessage,
    });
  }
});


// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Canton Faucet Server is running and listening on http://localhost:${PORT}`);
});