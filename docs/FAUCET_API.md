# Faucet REST API

Base URL: `http://localhost:3001`

## POST /faucet/claim
Claim testnet CC for a Canton party.

**Request**
```json
{ "partyId": "Alice::12345..." }
```

**Response 200**
```json
{ "success": true, "amount": 1000, "transactionId": "abc123" }
```

**Response 429 (rate-limited)**
```json
{ "success": false, "error": "rate_limit", "resetAt": "2026-04-06T00:00:00Z" }
```

## GET /faucet/status/:partyId
Check if a party can still claim today.

**Response**
```json
{ "canClaim": true, "claimedToday": 0, "limit": 1000 }
```
