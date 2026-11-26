# Listing Desk — Reviewer Runbook

How to reproduce the Listing Desk from scratch and verify its evidence.
Everything below is the path that actually worked on 26 Nov 2026 — including
the two quirks that will otherwise waste your time (the `_GENERAL` intent
names and the ~15-minute escrow delivery lag).

- **Network:** Telegraph testnet — node `https://devnode.telegraphprotocol.com`,
  escrow on **Ethereum Sepolia**. No real money anywhere in this runbook.
- **Time needed:** ~20 minutes of setup + ~15 minutes of escrow lag + ~2 minutes per desk run.
- **Cost:** ~$0.07 of test USDC per full five-check run (node ledger figure).

---

## 1. Prerequisites

- Node.js 20+ (the desk has **zero runtime dependencies**; it runs on Node's
  type stripping — developed on Node 24).
- A terminal. No API keys, no Anjoman account required for the wallet path.

## 2. Get the code

```bash
git clone <this repository's URL> listing-desk
cd listing-desk
```

## 3. Create the Telegraph wallet (one time)

```bash
npx -y @telegraphprotocol/telegraph-protocol-mcp setup
```

This creates `~/.telegraph/wallet.json` (mode 0600 — the MCP server holds
the key and signs escrow authorizations itself; the desk never sees it) and
prints your wallet address. Ours is
`0x6dDb8Ef55D9D2f4dF5670F282DE25dC2c64E4f71`; yours will differ.

## 4. Fund the wallet — Sepolia ETH (gas)

You need a little Sepolia ETH (≈0.001 ETH is ample; we received 0.02) for
the mint + deposit transactions. Any public faucet works, e.g.:

- Google Cloud Web3 faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- pk910 PoW faucet: https://sepolia-faucet.pk910.de (browser CAPTCHA + mining)

Send it to the wallet address from step 3. Verify on
https://sepolia.etherscan.io/address/<your-address>.

## 5. Fund the wallet — test USDC

Telegraph's escrow accepts only Telegraph's own test USDC
(`0xcc194e1a843B658526D0D5C431f670028582Ae17` — **not** Circle's). Two ways:

- Claim at https://anjoman.ai/dashboard/faucet (one claim / 24 h, needs an
  Anjoman sign-in), **or**
- Call the token's permissionless `mint(address,uint256)` — anyone can.
  We minted 10 USDC with a short Node script that loads the MCP wallet key
  and sends the `mint` transaction via a public Sepolia RPC
  (our tx: `0x87a38e4bc634497d329357ef30acb84c33790d6eda4a20f6c379e75329e26e23`).

## 6. Deposit USDC into escrow

```bash
npx -y @telegraphprotocol/telegraph-protocol-mcp fund 5 --yes
npx -y @telegraphprotocol/telegraph-protocol-mcp status
```

Our deposit: approve tx `0x11f17858a20e078d0d9db46aa7fd778f62dacbf227009a20bc235c2a1f68afb2`,
`depositUSDC` tx `0x0f7e4d0175427d6b1a8293dda435fdedb550b0ee02f154e29d06fd9473fd9893`
(5,000,000 μUSDC into the escrow Diamond `0x72a70e949362670Bf8bceAd24eFC5b8f950aa08b`).

> **⚠️ Quirk — escrow delivery lag (~15 minutes).** After the deposit, the
> account view (`status`, `GET /v1/ledger/account/<address>`) shows the
> balance within ~2 minutes, but asks are still refused with
> `insufficient escrow for delivery: … balance=0 μUSDC` for roughly
> **15 more minutes** (the delivery/settlement ledger trails the account
> view by an epoch). **Do not debug your code** — wait and retry. A refused
> ask is never billed, so polling with one cheap ask every few minutes is
> free. Ours succeeded on the third poll.

## 7. Check live intent coverage (free)

```bash
npm run probe
```

Expect 5/5 live. **Use the `_GENERAL` intent names** — on devnode the
unsuffixed canonical names (`SMART_CONTRACT_AUDIT`, …) exist as schemas
with **zero miners**; the purchasable coverage is
`SMART_CONTRACT_AUDIT_GENERAL` (20 miners), `CODE_REVIEW_GENERAL` (18),
`ONCHAIN_METRIC_VERIFY_GENERAL` (46), `SANCTIONS_SCREENING_MATCH_GENERAL`
(31), `SOCIAL_BOT_DETECTION_GENERAL` (17) — all $0.01 per miner used.

## 8. Run the desk

```bash
npm run desk -- --fixture fixtures/clean-token.json    # USD Coin
npm run desk -- --fixture fixtures/risky-token.json    # synthetic rug-mechanics token
```

Each run fires the five asks in parallel (allow up to ~2 minutes; the code
review miner took ~64 s once), then writes a memo to `runs/`
(`memo-<timestamp>.md` + `.json`) and appends every attempt to
`ledger/receipts.jsonl`.

**Expected results (26 Nov 2026 runs; miner answers vary run to run):**

| Fixture | Expected | Our v2 result |
|---|---|---|
| `clean-token.json` (USD Coin) | must not REJECT | **REVIEW** — one prose red flag (audit miner's explicit "Severity: High" on USDC's minter role, quoted in the memo) + one soft social signal |
| `risky-token.json` (MoonLambo Yield) | must not LIST | **REVIEW** — code-review miner's structured verdict on the rug code: "Request changes" |

Verdict policy summary: sanctions match or a structured critical field
rejects alone; prose/soft signals can only force REVIEW unless red flags
corroborate across ≥ 2 different intents; any incomplete check forces
REVIEW. Full policy: README §"Verdict policy".

## 9. Failure cases (please try to break it)

```bash
npm run test:failure     # dead node: all checks error → verdict REVIEW, never LIST
```

Also: run a fixture **before** funding escrow — every ask is refused
pre-payment (`insufficient escrow for delivery`), $0.00 is billed, and the
memo degrades to REVIEW quoting the refusal.

## 10. Verify the money yourself

- Per-ask evidence: each memo section quotes the miner's answer verbatim
  plus its fulfillment/receipt (receipt hash, miner id, epoch).
- Authoritative totals: `GET https://devnode.telegraphprotocol.com/v1/ledger/account/<wallet-address>`
  — `unbilled` is what your asks actually cost. Ours: $0.18 after the first
  three runs, $0.32 after two more v2 runs ($0.14 for both), escrow
  spendable $4.68 of the $5 deposit.
- Note: the audit ask's wrapper carries no per-ask receipt (its miners are
  billed inside the epoch aggregate), so a memo's local cost line can read
  ~$0.02–0.03 less than the ledger. The ledger wins.
- On-chain: mint / approve / deposit transactions are on Sepolia Etherscan
  (hashes in steps 5–6).

## 11. Spending limits & safety

- MCP defaults: **$0.50 max per ask, $5/day cap** (test USDC). The desk
  inherits them; it cannot overspend the escrow.
- The wallet key never leaves `~/.telegraph/wallet.json` (0600). The desk
  drives the official MCP server over stdio and never handles the key.
- Repeating an identical ask within a minute returns the node's cached
  answer without a second charge.

## 12. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Every ask refused, `balance=0 μUSDC`, right after funding | Escrow delivery lag — wait ~15 min (step 6) |
| Asks to `SMART_CONTRACT_AUDIT` return nothing | Wrong name — use the `_GENERAL` names (step 7) |
| One check errors after ~60 s | A miner timed out; the ask is **not billed** and the memo degrades that check to REVIEW. Re-running usually completes it |
| `insufficient escrow` long after funding | Check `status` — escrow spendable may be exhausted; top up with `fund` |
