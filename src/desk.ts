// desk.ts — the orchestrator: plan the asks, fire them in parallel through
// the official MCP server, normalize whatever comes back (answer, refusal,
// timeout, garbage) into AskResult records, and write every attempt to the
// append-only ledger. The desk never throws on a failed ask: a failed check
// is itself evidence and is handed to the memo as such.
import { randomUUID } from "node:crypto";
import { TelegraphClient } from "./client.ts";
import { planAsks, type AskPlan, type DeskInput, type LiveIntent } from "./intents.ts";
import { Ledger } from "./ledger.ts";

export type AskStatus = "answered" | "refused" | "error" | "skipped";

export interface AskResult {
  intent: LiveIntent;
  question: string;
  params?: Record<string, unknown>;
  status: AskStatus;
  /** The miner answer (intent answer fields), when answered. */
  answer?: Record<string, unknown>;
  /** fulfillment block from the node: provenance + payments, when present. */
  fulfillment?: unknown;
  receipt?: unknown;
  /** Billed cost in USD (sum of fulfillment payment rows), when reported. */
  costUsd?: number;
  latencyMs: number;
  error?: string;
}

export interface DeskRun {
  runId: string;
  startedAt: string;
  input: DeskInput;
  block: number;
  results: AskResult[];
  totalCostUsd: number;
}

/** Latest mainnet block from a public RPC; falls back to a fixed recent block
 *  so a run stays reproducible even if the RPC is unreachable. */
export async function resolveBlock(input: DeskInput): Promise<number> {
  if (input.block) return input.block;
  try {
    const res = await fetch("https://ethereum-rpc.publicnode.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json()) as { result?: string };
    if (json.result) return parseInt(json.result, 16);
  } catch {
    /* fall through to the fixed block */
  }
  return 21_000_000;
}

function billedUsd(fulfillment: unknown): number | undefined {
  const rows = (fulfillment as { payments?: { amount_uusdc?: unknown }[] } | undefined)?.payments;
  if (!Array.isArray(rows) || rows.length === 0) return undefined;
  const total = rows.reduce((sum, p) => sum + (Number(p?.amount_uusdc) || 0), 0);
  return total / 1e6;
}

function normalize(plan: AskPlan, raw: unknown, isError: boolean, latencyMs: number): AskResult {
  const base: AskResult = {
    intent: plan.intent,
    question: plan.question,
    params: plan.params,
    status: "error",
    latencyMs,
  };
  if (typeof raw === "string") {
    const refused = /insufficient escrow|payment required/i.test(raw);
    return { ...base, status: refused ? "refused" : "error", error: raw.slice(0, 500) };
  }
  if (isError || raw === null || typeof raw !== "object") {
    // Tool-level failure object: surface the node's own reason (e.g. the 402
    // escrow refusal) instead of a JSON blob, and classify refusals as such.
    const obj = (raw ?? {}) as Record<string, unknown>;
    const text = JSON.stringify(raw) ?? "";
    const refused = /insufficient escrow|payment required/i.test(text);
    const reason =
      (typeof obj.reason === "string" && obj.reason) ||
      (typeof obj.hint === "string" && obj.hint) ||
      (typeof obj.error === "string" && obj.error) ||
      text.slice(0, 300);
    return { ...base, status: refused ? "refused" : "error", error: String(reason).slice(0, 500) };
  }
  const data = raw as Record<string, unknown>;
  // Two answer shapes: API-key mode returns fulfillment{payments,provenance};
  // wallet mode returns payment{billed_usd, receipt} + cost_usd at top level.
  const payment = data.payment as { billed_usd?: unknown; receipt?: unknown } | undefined;
  const fulfillment = data.fulfillment ?? data.payment;
  const answer = (data.answer as Record<string, unknown>) ?? data;
  return {
    ...base,
    status: "answered",
    answer: typeof answer === "object" && answer !== null ? (answer as Record<string, unknown>) : { value: answer },
    fulfillment,
    receipt: data.receipt ?? payment?.receipt,
    costUsd:
      billedUsd(data.fulfillment) ??
      (typeof data.cost_usd === "number" ? data.cost_usd : undefined) ??
      (typeof payment?.billed_usd === "number" ? payment.billed_usd : undefined),
  };
}

export async function runDesk(
  client: TelegraphClient,
  input: DeskInput,
  ledger: Ledger,
): Promise<DeskRun> {
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const block = await resolveBlock(input);
  ledger.append({ ts: startedAt, run_id: runId, kind: "run_start" });
  const plans = planAsks(input, block);

  const results = await Promise.all(
    plans.map(async (plan): Promise<AskResult> => {
      if (plan.requires && !input[plan.requires]) {
        const skipped: AskResult = {
          intent: plan.intent,
          question: plan.question,
          params: plan.params,
          status: "skipped",
          latencyMs: 0,
          error: `input field "${plan.requires}" not provided`,
        };
        ledger.append({
          ts: new Date().toISOString(), run_id: runId, kind: "ask",
          intent: plan.intent, status: "skipped", error: skipped.error,
        });
        return skipped;
      }
      const t0 = Date.now();
      try {
        const res = await client.ask(plan.intent, plan.question, plan.params);
        const result = normalize(plan, res.data, res.isError, Date.now() - t0);
        ledger.append({
          ts: new Date().toISOString(), run_id: runId, kind: "ask",
          intent: plan.intent, question: plan.question, params: plan.params,
          status: result.status, cost_usd: result.costUsd, latency_ms: result.latencyMs,
          fulfillment: result.fulfillment, receipt: result.receipt, error: result.error,
        });
        return result;
      } catch (e) {
        const result: AskResult = {
          intent: plan.intent, question: plan.question, params: plan.params,
          status: "error", latencyMs: Date.now() - t0,
          error: e instanceof Error ? e.message : String(e),
        };
        ledger.append({
          ts: new Date().toISOString(), run_id: runId, kind: "ask",
          intent: plan.intent, status: "error", latency_ms: result.latencyMs, error: result.error,
        });
        return result;
      }
    }),
  );

  const totalCostUsd = results.reduce((s, r) => s + (r.costUsd ?? 0), 0);
  return { runId, startedAt, input, block, results, totalCostUsd };
}
