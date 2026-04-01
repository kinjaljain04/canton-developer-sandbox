import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// --- Configuration ---
const LEDGER_HOST = process.env.LEDGER_HOST || 'localhost';
const LEDGER_PORT = process.env.LEDGER_PORT || 7575;
const FAUCET_OPERATOR_PARTY = process.env.FAUCET_OPERATOR_PARTY;
const FAUCET_OPERATOR_TOKEN = process.env.FAUCET_OPERATOR_TOKEN;

// --- Daml Constants ---
// Assumes a Daml model with `module Coin { template Coin ... }`
const COIN_TEMPLATE_ID = 'Coin:Coin';
const CURRENCY_SYMBOL = 'CC'; // Canton Coin

// --- Pre-flight Checks ---
if (!FAUCET_OPERATOR_PARTY || !FAUCET_OPERATOR_TOKEN) {
  const errorMessage = "FATAL: FAUCET_OPERATOR_PARTY and FAUCET_OPERATOR_TOKEN must be set in environment variables.";
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// --- Ledger API Client ---
const ledgerClient: AxiosInstance = axios.create({
  baseURL: `http://${LEDGER_HOST}:${LEDGER_PORT}`,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${FAUCET_OPERATOR_TOKEN}`,
  },
});

// --- Type Definitions ---
/**
 * Represents the payload of a Coin contract on the ledger.
 */
interface Coin {
  issuer: string;
  owner: string;
  currency: string;
  amount: string; // Decimals are sent as strings in the JSON API
}

/**
 * Represents a full active contract fetched from the JSON API.
 */
interface ActiveContract {
  contractId: string;
  templateId: string;
  payload: Coin;
}

// --- Public Functions ---

/**
 * Transfers a specified amount of currency from the faucet to a recipient party.
 * It finds a suitable coin contract held by the faucet and exercises the 'Send' choice.
 *
 * @param {string} recipientParty The party ID of the recipient.
 * @param {string} amount The amount to transfer (e.g., "100.0").
 * @returns {Promise<any>} The result of the exercise command from the JSON API.
 */
export const transferCoins = async (recipientParty: string, amount: string): Promise<any> => {
  console.log(`Initiating transfer of ${amount} ${CURRENCY_SYMBOL} to party: ${recipientParty}`);

  // 1. Find a single coin contract large enough to cover the transfer.
  const spendableContract = await findSpendableCoin(parseFloat(amount));

  if (!spendableContract) {
    const errorMsg = `Insufficient funds. Faucet has no single coin contract >= ${amount} ${CURRENCY_SYMBOL}.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  console.log(`Found spendable coin ${spendableContract.contractId} with amount ${spendableContract.payload.amount}`);

  // 2. Exercise the 'Send' choice to atomically split and transfer the funds.
  try {
    const exercisePayload = {
      templateId: COIN_TEMPLATE_ID,
      contractId: spendableContract.contractId,
      choice: 'Send',
      argument: {
        recipient: recipientParty,
        sendAmount: amount,
      },
    };

    const response = await ledgerClient.post('/v1/exercise', exercisePayload);
    const result = response.data.result;
    console.log(`Successfully exercised 'Send'. Transaction ID: ${result.transactionId}`);
    return result;

  } catch (error) {
    const errorDetails = error.response?.data?.errors?.join(', ') || 'Unknown ledger error';
    console.error("Error exercising 'Send' choice:", errorDetails);
    throw new Error(`Ledger command failed: ${errorDetails}`);
  }
};

/**
 * Fetches the total balance of the faucet operator by summing all its Coin contracts.
 *
 * @returns {Promise<string>} The total balance as a formatted string.
 */
export const getFaucetBalance = async (): Promise<string> => {
  try {
    const contracts = await queryAllFaucetCoins();
    const totalBalance = contracts.reduce((sum, contract) => {
      return sum + parseFloat(contract.payload.amount);
    }, 0.0);

    return totalBalance.toFixed(4);
  } catch (error) {
    console.error("Error fetching faucet balance:", error.message);
    throw new Error("Could not fetch faucet balance from the ledger.");
  }
};


// --- Helper Functions ---

/**
 * Queries the ledger for all CC coin contracts owned by the faucet operator.
 *
 * @returns {Promise<ActiveContract[]>} An array of active coin contracts.
 */
const queryAllFaucetCoins = async (): Promise<ActiveContract[]> => {
    try {
        const response = await ledgerClient.post('/v1/query', {
            templateIds: [COIN_TEMPLATE_ID],
            query: {
                owner: FAUCET_OPERATOR_PARTY,
                currency: CURRENCY_SYMBOL,
            },
        });
        return response.data.result || [];
    } catch (error) {
        const errorDetails = error.response?.data?.errors?.join(', ') || error.message;
        console.error("Error querying ledger for faucet coins:", errorDetails);
        throw new Error("Could not connect to the ledger to query coins.");
    }
}

/**
 * Finds a single coin contract with a balance sufficient to cover the requested amount.
 * It prefers larger contracts to smaller ones to reduce fragmentation.
 *
 * @param {number} requiredAmount The amount needed for the transfer.
 * @returns {Promise<ActiveContract | null>} A suitable contract or null if none is found.
 */
const findSpendableCoin = async (requiredAmount: number): Promise<ActiveContract | null> => {
  const allCoins = await queryAllFaucetCoins();

  const suitableCoins = allCoins.filter(contract =>
    parseFloat(contract.payload.amount) >= requiredAmount
  );

  if (suitableCoins.length === 0) {
    return null;
  }

  // Sort by amount descending to use the largest available coin first.
  // This is a simple strategy to avoid creating many small "change" contracts.
  suitableCoins.sort((a, b) => parseFloat(b.payload.amount) - parseFloat(a.payload.amount));

  return suitableCoins[0];
};