# Listing Desk memo — MoonLambo Yield Token (MLY)

**Verdict: REVIEW**

- Token contract: `0x000000000000000000000000000000000000dEaD` (ethereum, metrics at block 21000000)
- Entity screened: MoonLambo Financial Group
- Social account checked: @moonlamboyield_official
- Run: 2026-11-26T03:43:56.142Z · run_id `9a6dd624-b40b-41ff-8358-ff39cc08adfd` · network: Telegraph testnet (Ethereum Sepolia escrow, devnode)

## Why
- CODE_REVIEW_GENERAL: structured verdict field is negative (not terminal) — "verdict": "Request changes"
- SOCIAL: bot_score 0.8 with miner verdict "likely_human" — soft signal only (social miners score a bare handle string and contradict themselves across runs; quoted verbatim, cannot reject)
- SMART_CONTRACT_AUDIT_GENERAL: no critical/high finding in the returned answer
- ONCHAIN_METRIC_VERIFY_GENERAL: answered (factual read; no risk signal derived)
- SANCTIONS: no match reported (matched=false, match_score 0)

## Evidence per check

### SMART_CONTRACT_AUDIT_GENERAL — answered (5072 ms, billed $0.0000)

```json
{
  "value": "I am sorry, but I cannot audit the smart contract for the token \"MoonLambo Yield Token (MLY)\" deployed at `0x000000000000000000000000000000000000dEaD` on Ethereum. This address is the \"zero address,\" which is a special address that cannot hold or execute smart contracts. Therefore, no token contract is deployed there.\n\nTo provide an audit, I would need the correct contract address for the MoonLambo Yield Token (MLY)."
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

### CODE_REVIEW_GENERAL — answered (64152 ms, billed $0.0100)

```json
{
  "verdict": "Request changes",
  "findings": null,
  "summary": null
}
```

Provider/payment evidence (fulfillment):
```json
{
  "rail": "escrow",
  "billed_usd": 0.01,
  "authorized_usd": 0.26,
  "receipt": {
    "receipt_hash": "0x40bf63413bb74068038d7ac6896153ee3da0c21c730535abc8b2c96fd7f143cb",
    "rail": "escrow",
    "payer": "0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71",
    "miner": "6126",
    "intent": "CODE_REVIEW_GENERAL",
    "amount_uusdc": "10000",
    "epoch_id": 58,
    "settlement": "epoch",
    "chain": "telegraph",
    "timestamp": 1795664700
  }
}
```
- Receipt: `{"receipt_hash":"0x40bf63413bb74068038d7ac6896153ee3da0c21c730535abc8b2c96fd7f143cb","rail":"escrow","payer":"0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71","miner":"6126","intent":"CODE_REVIEW_GENERAL","amount_uusdc":"10000","epoch_id":58,"settlement":"epoch","chain":"telegraph","timestamp":1795664700}`

### ONCHAIN_METRIC_VERIFY_GENERAL — answered (26632 ms, billed $0.0100)

```json
{
  "balance_gwei": 12620102244847.045,
  "address": "0x000000000000000000000000000000000000dEaD",
  "block": "21000000",
  "chain": "ethereum",
  "tx_count": 158649
}
```

Provider/payment evidence (fulfillment):
```json
{
  "rail": "escrow",
  "billed_usd": 0.01,
  "authorized_usd": 0.26,
  "receipt": {
    "receipt_hash": "0x9ebc3e6082a34a8731f118aa9e785a5444be9886b0c92c29e63c63f09cb03938",
    "rail": "escrow",
    "payer": "0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71",
    "miner": "6126",
    "intent": "ONCHAIN_METRIC_VERIFY_GENERAL",
    "amount_uusdc": "10000",
    "epoch_id": 58,
    "settlement": "epoch",
    "chain": "telegraph",
    "timestamp": 1795664663
  }
}
```
- Receipt: `{"receipt_hash":"0x9ebc3e6082a34a8731f118aa9e785a5444be9886b0c92c29e63c63f09cb03938","rail":"escrow","payer":"0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71","miner":"6126","intent":"ONCHAIN_METRIC_VERIFY_GENERAL","amount_uusdc":"10000","epoch_id":58,"settlement":"epoch","chain":"telegraph","timestamp":1795664663}`

### SANCTIONS_SCREENING_MATCH_GENERAL — answered (28679 ms, billed $0.0100)

```json
{
  "name": "MoonLambo Financial Group",
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
    "receipt_hash": "0x4912946a6e613175041680e4ba8d6caf06374cf2b1701d673d77a4c20ef32223",
    "rail": "escrow",
    "payer": "0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71",
    "miner": "5298",
    "intent": "SANCTIONS_SCREENING_MATCH_GENERAL",
    "amount_uusdc": "10000",
    "epoch_id": 58,
    "settlement": "epoch",
    "chain": "telegraph",
    "timestamp": 1795664665
  }
}
```
- Receipt: `{"receipt_hash":"0x4912946a6e613175041680e4ba8d6caf06374cf2b1701d673d77a4c20ef32223","rail":"escrow","payer":"0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71","miner":"5298","intent":"SANCTIONS_SCREENING_MATCH_GENERAL","amount_uusdc":"10000","epoch_id":58,"settlement":"epoch","chain":"telegraph","timestamp":1795664665}`

### SOCIAL_BOT_DETECTION_GENERAL — answered (26680 ms, billed $0.0100)

```json
{
  "account": "@moonlamboyield_official",
  "verdict": "likely_human",
  "bot_score": 0.8,
  "signals": [
    "likely_human - the handle appears to be a straightforward, brand‑style username without the repetitive patterns, random characters, or overly promotional language typical of automated bot accounts."
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
    "receipt_hash": "0xf4c1de543fda07a621358c254c6db0f62067c713afdd2ded0503eaa1865a10c4",
    "rail": "escrow",
    "payer": "0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71",
    "miner": "6119",
    "intent": "SOCIAL_BOT_DETECTION_GENERAL",
    "amount_uusdc": "10000",
    "epoch_id": 58,
    "settlement": "epoch",
    "chain": "telegraph",
    "timestamp": 1795664663
  }
}
```
- Receipt: `{"receipt_hash":"0xf4c1de543fda07a621358c254c6db0f62067c713afdd2ded0503eaa1865a10c4","rail":"escrow","payer":"0x6ddb8ef55d9d2f4df5670f282de25dc2c64e4f71","miner":"6119","intent":"SOCIAL_BOT_DETECTION_GENERAL","amount_uusdc":"10000","epoch_id":58,"settlement":"epoch","chain":"telegraph","timestamp":1795664663}`

## Cost
- Total billed this run: **$0.0400** across 5 answered checks (testnet USDC; a refused ask is never billed).

_Generated by Listing Desk. Verdict heuristics are transparent and quote their evidence above; a human listings reviewer makes the final call._
