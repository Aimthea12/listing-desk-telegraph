# Listing Desk

An autonomous token-listing risk memo agent, built for the **Telegraph Protocol
Hackathon Season II — Apps & Agents track, Mission 01 (Exchange), Route 1**.

Give it a candidate token and it autonomously **buys ranked intelligence**
through Telegraph — contract audit, code review, on-chain metric verification,
sanctions screening, social bot detection — then emits a **LIST / REVIEW /
REJECT** memo where every finding cites its provider evidence and receipt,
with a total cost line. A check that fails or is refused **degrades the memo
explicitly** (verdict REVIEW): the desk never silently clears a token.

## Quick start

```bash
# prerequisites: Node 20+, the official Telegraph MCP wallet set up + funded (below)
npm run probe                                   # check live intent coverage (free)
npm run desk -- --fixture fixtures/clean-token.json
npm run desk -- --fixture fixtures/risky-token.json
npm run test:failure                            # dead-node degradation test
```

Outputs land in `runs/` (memo `.md` + `.json` per run); every ask attempt is
appended to `ledger/receipts.jsonl` (append-only evidence trail).

## Setup (one time)

1. **Wallet** — the desk drives the official MCP server, which holds its own
   wallet and signs escrow authorizations itself:
   ```bash
   npx -y @telegraphprotocol/telegraph-protocol-mcp setup
   ```
2. **Fund it (testnet)** — you need a little Sepolia ETH for gas plus test USDC:
   - Sepolia ETH: any public faucet (e.g. the Google Cloud Web3 faucet or the
     pk910 PoW faucet) sent to the wallet address `setup` printed.
   - Test USDC (Telegraph's own test token, `0xcc194e1a843B658526D0D5C431f670028582Ae17`):
     claim at https://anjoman.ai/dashboard/faucet (one claim / 24 h) **or** call
     its permissionless `mint(address,uint256)` — anyone can.
   - Move USDC into escrow: `npx -y @telegraphprotocol/telegraph-protocol-mcp fund`
3. **Spending limits** — the MCP defaults cap asks at **$0.50 per ask / $5 per
   day** of test USDC; each intent used costs ~$0.01. A refused ask is never billed.

## How it works

```
input (token contract + entity + handle + code excerpt)
  └─ plan: five Telegraph intents, fired in parallel via the official MCP server
       SMART_CONTRACT_AUDIT_GENERAL · CODE_REVIEW_GENERAL · ONCHAIN_METRIC_VERIFY_GENERAL
       SANCTIONS_SCREENING_MATCH_GENERAL · SOCIAL_BOT_DETECTION_GENERAL
  └─ normalize: answer + fulfillment (provider provenance, payments) or refusal/error
  └─ verdict: signal-based policy (below) → LIST / REVIEW / REJECT
  └─ memo (Markdown + JSON) + append-only receipts ledger
```

## Verdict policy (v2)

The desk never turns one keyword into a verdict. Every answered check is
classified into **signals**, and the verdict is a function of the signals:

| Signal | What triggers it | Effect |
|---|---|---|
| **Hard** | Sanctions screening reports `matched === true` | **REJECT** on its own |
| **Structured critical** | A structured field in a miner answer: terminal-negative `verdict` (reject / fail / unsafe / do-not-list), `severity: "critical"`, or a findings[] entry with severity "critical" | **REJECT** on its own |
| **Red flag** (≤ 1 per intent) | A prose severity *assertion* in an audit/code-review answer (e.g. "Severity: High", "critical vulnerability" — the memo quotes the matched snippet verbatim); a structured severity of "high"; a negative-but-not-terminal structured verdict (e.g. "Request changes") | **REJECT** only when red flags come from **≥ 2 different intents**; alone it forces REVIEW |
| **Soft** | Social bot-detection output (any bot_score ≥ 0.8 or bot verdict); a sanctions answer with no explicit match flag | Forces **REVIEW**, never REJECT |
| **Incomplete** | A check that was refused, errored, or skipped | Forces **REVIEW**, never LIST |

**LIST** requires every check answered and zero signals of any kind.

Why social is soft-only: the live social miners evaluate a bare handle
string and are not self-consistent — the same handle ("@circle") scored
bot_score 0.8 with verdict "likely_human" in one run and "likely_bot" in
the next. That output is quoted in the memo as evidence, but it is not
allowed to reject anything.

Why v2 exists (lesson from the first funded runs): v1 scanned the whole
answer JSON for the bare words "critical"/"high", so an audit miner's
prose section header ("Critical/High Severity Findings") rejected USD
Coin. Under v2 the same evidence yields REVIEW for USDC (one prose red
flag: the miner's explicit "Severity: High" on USDC's minter role — a
real centralization consideration, quoted in the memo), and the
rug-mechanics fixture is held at REVIEW by the code-review miner's
structured "Request changes" verdict on its code. Every signal in a memo
quotes the raw miner evidence it came from, so a human reviewer can
override the desk.

**Intent names matter:** on the live node the purchasable coverage sits under
the `_GENERAL` names (from the node's own catalogue). The unsuffixed canonical
names exist as schemas but currently have zero miners; asks to them cannot be
fulfilled. Verified by probe on 26 Nov 2026 (the full probe report, with raw
node evidence, is in the hackathon submission evidence pack).

**Reviewers:** the step-by-step reproduction guide — wallet setup, faucets,
mint, escrow funding, the ~15-minute escrow delivery lag, failure cases, and
how to verify the money yourself — is in [RUNBOOK.md](RUNBOOK.md). Sample
outputs from the funded 26 Nov 2026 runs are in `samples/`.

## Sample run

Input: `fixtures/clean-token.json` (USD Coin — expected LIST once funded) and
`fixtures/risky-token.json` (a synthetic rug-mechanics token — expected
REVIEW/REJECT). Expected result per run: five check sections with provider
evidence, a verdict with reasons, and a cost line (≤ ~$0.05 of test USDC for
five answered checks). Known failure case: with an empty escrow every ask is
refused pre-payment by the node (`insufficient escrow for delivery`) and the
memo degrades to REVIEW quoting the refusal — try it before funding.

## Costs

Testnet only for Season II evidence: ~$0.01 per miner whose answer is used,
$0.26 budget hold per ask (released except billed rows), $5/day MCP cap.

## Limitations (honest)

- All five intents are *judgment* kind and not yet ranked on the node; the
  node picks the answering miner. Answers are evidence, not ground truth —
  the memo's signal-based verdict policy (see "Verdict policy" above) is
  transparent, and every signal quotes the raw miner evidence it came
  from, so a human reviewer can override the desk.
- The audit ask's wrapper carries no per-ask receipt (its two miners are
  billed inside the epoch aggregate), so a memo's cost line can understate
  the node-ledger total by ~$0.02–0.03 per run; the node's ledger
  (`GET /v1/ledger/account/<address>`) is authoritative.
- `ONCHAIN_METRIC_VERIFY` verifies a native balance / tx count at a block;
  it does not measure holder concentration (no live intent does yet).
- Adoption evidence is limited to what a 5-day hackathon allows; the desk is
  reproducible by design (fixtures + runbook + failure test) so reviewers and
  other developers can run it themselves.

## Reuse disclosure

Built on the official `@telegraphprotocol/telegraph-protocol-mcp` server
(MIT) as the payment/signing layer, driven over stdio; flow patterns informed
by the official `telegraph-examples` repo (MIT). All Listing Desk code in this
repo is original. Network: Telegraph testnet — Ethereum Sepolia escrow via
devnode (`https://devnode.telegraphprotocol.com`).
