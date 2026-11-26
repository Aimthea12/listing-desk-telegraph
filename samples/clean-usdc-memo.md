# Listing Desk memo — USD Coin (USDC)

**Verdict: REVIEW**

- Token contract: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` (ethereum, metrics at block 21000000)
- Entity screened: Circle Internet Financial
- Social account checked: @circle
- Run: 2026-11-26T03:43:13.191Z · run_id `57e7db29-1c12-47f0-8cc3-baddcc87068f` · network: Telegraph testnet (Ethereum Sepolia escrow, devnode)

## Why
- SMART_CONTRACT_AUDIT_GENERAL: prose severity assertion (single uncorroborated hit — cannot reject alone): "…6eB48 (Ethereum Mainnet) **Contract Type:** ERC-20 Token **Critical/High Severity Findings:** 1. **Mint Authority:** * **Finding:** The USDC co…"
- SOCIAL: bot_score 0.8 with miner verdict "likely_bot" — soft signal only (social miners score a bare handle string and contradict themselves across runs; quoted verbatim, cannot reject)
- CODE_REVIEW_GENERAL: no critical/high finding in the returned answer
- ONCHAIN_METRIC_VERIFY_GENERAL: answered (factual read; no risk signal derived)
- SANCTIONS: no match reported (matched=false, match_score 0)

## Evidence per check

### SMART_CONTRACT_AUDIT_GENERAL — answered (6543 ms, billed $0.0000)

```json
{
  "value": "I cannot audit the smart contract for USD Coin (USDC) at the provided address in real-time. My capabilities do not include live interaction with blockchain networks or the execution of smart contract code. Therefore, I cannot perform a dynamic analysis or verify the current state of the contract's parameters.\n\nHowever, based on publicly available information and the known architecture of USDC, I can provide an audit report focusing on the aspects you requested.\n\n**Smart Contract Audit: USD Coin (USDC)**\n\n**Token Address:** 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 (Ethereum Mainnet)\n\n**Contract Type:** ERC-20 Token\n\n**Critical/High Severity Findings:**\n\n1.  **Mint Authority:**\n    *   **Finding:** The USDC contract has a `MinterRole` mechanism. This means that only addresses granted the \"minter\" role can mint new USDC tokens.\n    *   **Severity:** **High**. The ability to mint tokens is a critical function that directly impacts the total supply and value of the token. If the minting authority is compromised or misused, it could lead to inflation, devaluation, or malicious token generation.\n    *   **Mitigation/Context:** The minting authority for USDC is controlled by Circle, the issuer. This is a deliberate design choice to allow for the creation of new tokens to back fiat deposits. However, it introduces a centralization risk, as the trust is placed in Circle to manage this authority responsibly. Access to minting is typically restricted to a very small, highly secured set of addresses controlled by Circle.\n\n2.  **Ownership/Control:**\n    *   **Finding:** The USDC contract utilizes an `AccessControl` pattern, specifically for roles like `MINTER_ROLE` and `PAUSER_ROLE`. While there isn't a single \"owner\" in the traditional sense that can arbitrarily change all parameters, the addresses that can grant or revoke roles (like the `MINTER_ROLE`) hold significant control.\n    *   **Severity:** **High**. The entity or entities that control the roles, particularly the `MINTER_ROLE`, have the ultimate power over the token's supply.\n    *   **Mitigation/Context:** Similar to minting, the control over these roles is managed by Circle. This centralization is a key characteristic of stablecoins like USDC, where the issuer is responsible for maintaining the peg and managing the token's lifecycle.\n\n3.  **Transfer Restrictions:**\n    *   **Finding:** The USDC contract includes a `Pausable` mechanism. This means that designated addresses (those with the `PAUSER_ROLE`) can pause all token transfers.\n    *   **Severity:** **High**. The ability to pause transfers can be used to halt the"
}
```

Provider/payment evidence (fulfillment):
```json
{
  "rail": "escrow",
  "billed_usd": 0.26,
  "authorized_usd": 0.26
}
```

### CODE_REVIEW_GENERAL — answered (40757 ms, billed $0.0100)

```json
{
  "verdict": "Approve",
  "findings": [
    "The code is not correct as a complete ERC-20-style token, although the simplified transfer logic works for ordinary nonzero-value transfers."
  ],
  "summary": "The code is correct. It implements a simple fixed-supply token without any obvious security flaws. All arithmetic uses Solidity 0.8's built-in overflow checks, so under/overflow is prevented. The transfer function correctly checks balances, updates state, and emits the Transfer event. No unnecessary state variables or external calls are present, keeping the contract efficient. Overall the implementation is clear, concise, and safe for its intended purpose."
}
```

Provider/payment evidence (fulfillment):
```json
{
  "rail": "escrow",
  "billed_usd": 0.01,
  "authorized_usd": 0.26,
  "receipt": {
    "receipt_hash": "0x7bcf29f2f0a0d51e5c72158a8746239f533946fdb5a1477ddc362179e12e33bf",
    "rail": "escrow",
    "payer": "0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71",
    "miner": "6126",
    "intent": "CODE_REVIEW_GENERAL",
    "amount_uusdc": "10000",
    "epoch_id": 58,
    "settlement": "epoch",
    "chain": "telegraph",
    "timestamp": 1795664634
  }
}
```
- Receipt: `{"receipt_hash":"0x7bcf29f2f0a0d51e5c72158a8746239f533946fdb5a1477ddc362179e12e33bf","rail":"escrow","payer":"0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71","miner":"6126","intent":"CODE_REVIEW_GENERAL","amount_uusdc":"10000","epoch_id":58,"settlement":"epoch","chain":"telegraph","timestamp":1795664634}`

### ONCHAIN_METRIC_VERIFY_GENERAL — answered (29547 ms, billed $0.0100)

```json
{
  "balance_gwei": 0,
  "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "block": "21000000",
  "chain": "ethereum",
  "tx_count": 595460901
}
```

Provider/payment evidence (fulfillment):
```json
{
  "rail": "escrow",
  "billed_usd": 0.01,
  "authorized_usd": 0.26,
  "receipt": {
    "receipt_hash": "0xaf1acd6b0a7f4f23dbfc90454c36a6931cf1d227adecc111dabdf70ed192c278",
    "rail": "escrow",
    "payer": "0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71",
    "miner": "6126",
    "intent": "ONCHAIN_METRIC_VERIFY_GENERAL",
    "amount_uusdc": "10000",
    "epoch_id": 58,
    "settlement": "epoch",
    "chain": "telegraph",
    "timestamp": 1795664623
  }
}
```
- Receipt: `{"receipt_hash":"0xaf1acd6b0a7f4f23dbfc90454c36a6931cf1d227adecc111dabdf70ed192c278","rail":"escrow","payer":"0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71","miner":"6126","intent":"ONCHAIN_METRIC_VERIFY_GENERAL","amount_uusdc":"10000","epoch_id":58,"settlement":"epoch","chain":"telegraph","timestamp":1795664623}`

### SANCTIONS_SCREENING_MATCH_GENERAL — answered (28111 ms, billed $0.0100)

```json
{
  "name": "Circle Internet Financial",
  "matched": false,
  "matches": null,
  "lists": [
    "US OFAC SDN and non-SDN Consolidated lists (published 2026-11-09)",
    "UN Security Council Consolidated List (published 2026-11-12)",
    "EU Consolidated Financial Sanctions List (published 2026-10-23)",
    "UK Sanctions List (published 2026-11-10)"
  ],
  "match_score": 0
}
```

Provider/payment evidence (fulfillment):
```json
{
  "rail": "escrow",
  "billed_usd": 0.01,
  "authorized_usd": 0.26,
  "receipt": {
    "receipt_hash": "0x21a7d84ab9cc1fc0f48bda246246ef4fed61948afb87eee2d30ac4b3eed994cd",
    "rail": "escrow",
    "payer": "0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71",
    "miner": "5298",
    "intent": "SANCTIONS_SCREENING_MATCH_GENERAL",
    "amount_uusdc": "10000",
    "epoch_id": 58,
    "settlement": "epoch",
    "chain": "telegraph",
    "timestamp": 1795664622
  }
}
```
- Receipt: `{"receipt_hash":"0x21a7d84ab9cc1fc0f48bda246246ef4fed61948afb87eee2d30ac4b3eed994cd","rail":"escrow","payer":"0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71","miner":"5298","intent":"SANCTIONS_SCREENING_MATCH_GENERAL","amount_uusdc":"10000","epoch_id":58,"settlement":"epoch","chain":"telegraph","timestamp":1795664622}`

### SOCIAL_BOT_DETECTION_GENERAL — answered (24279 ms, billed $0.0100)

```json
{
  "account": "@circle",
  "verdict": "likely_bot",
  "bot_score": 0.8,
  "signals": [
    "likely_bot - the account's activity consists of a single, generic mention without any personal content or context, which is typical of automated or placeholder accounts."
  ]
}
```

Provider/payment evidence (fulfillment):
```json
{
  "rail": "escrow",
  "billed_usd": 0.01,
  "authorized_usd": 0.26,
  "receipt": {
    "receipt_hash": "0x2ddc8f8c812639cb70ffd992a90ec70bf8e269381f3a97ca536930e3217db27f",
    "rail": "escrow",
    "payer": "0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71",
    "miner": "6119",
    "intent": "SOCIAL_BOT_DETECTION_GENERAL",
    "amount_uusdc": "10000",
    "epoch_id": 58,
    "settlement": "epoch",
    "chain": "telegraph",
    "timestamp": 1795664618
  }
}
```
- Receipt: `{"receipt_hash":"0x2ddc8f8c812639cb70ffd992a90ec70bf8e269381f3a97ca536930e3217db27f","rail":"escrow","payer":"0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71","miner":"6119","intent":"SOCIAL_BOT_DETECTION_GENERAL","amount_uusdc":"10000","epoch_id":58,"settlement":"epoch","chain":"telegraph","timestamp":1795664618}`

## Cost
- Total billed this run: **$0.0400** across 5 answered checks (testnet USDC; a refused ask is never billed).

_Generated by Listing Desk. Verdict heuristics are transparent and quote their evidence above; a human listings reviewer makes the final call._
