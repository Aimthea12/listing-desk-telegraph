// ledger.ts — append-only JSONL ledger of every ask the desk attempts.
// One line per event; never rewritten, so a run's evidence trail survives
// crashes and can be handed to judges as-is (receipts, costs, refusals).
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface LedgerEntry {
  ts: string;
  run_id: string;
  kind: "run_start" | "ask" | "run_end";
  intent?: string;
  question?: string;
  params?: Record<string, unknown>;
  status?: string;
  cost_usd?: number;
  latency_ms?: number;
  fulfillment?: unknown;
  receipt?: unknown;
  error?: string;
  verdict?: string;
  total_cost_usd?: number;
}

export class Ledger {
  private path: string;
  constructor(path: string) {
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
  }
  append(entry: LedgerEntry) {
    appendFileSync(this.path, JSON.stringify(entry) + "\n", "utf8");
  }
}
