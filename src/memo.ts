// memo.ts — verdict logic + memo rendering.
//
// Verdict policy (v2, refined 26 Nov 2026 after the first funded runs —
// see README "Verdict policy" for the full rationale). The desk classifies
// every answered check into signals; the verdict is a function of signals,
// never of a single keyword:
//
//   HARD signal (REJECT on its own)
//     - sanctions screening reports matched === true.
//   STRUCTURED CRITICAL signal (REJECT on its own)
//     - a structured field in a miner answer: a terminal-negative `verdict`
//       field (reject / fail / unsafe / do-not-list), a `severity` field
//       equal to "critical", or a findings[] entry whose `severity` field
//       is "critical".
//   RED-FLAG signal (at most one per intent; REJECT only when red flags
//   come from >= 2 DIFFERENT intents)
//     - a prose severity assertion in an audit / code-review answer
//       (e.g. "Severity: High", "critical vulnerability") — the memo quotes
//       the matched snippet verbatim;
//     - a structured `severity` / findings severity of "high";
//     - a structured code-review `verdict` that is negative but not
//       terminal (e.g. "Request changes").
//   SOFT signal (forces REVIEW, never REJECT)
//     - social bot detection output, in full: the live miners score a bare
//       handle string and contradict themselves run-to-run (the same
//       handle scored 0.8 with verdicts "likely_human" AND "likely_bot"
//       in different runs), so a social signal is quoted as soft evidence
//       and can never contribute to a REJECT;
//     - a sanctions answer with no explicit match flag.
//   INCOMPLETE (forces REVIEW, never LIST)
//     - any check refused / errored / skipped.
//
//   LIST — every check answered and zero signals of any kind.
//
// Why v2: v1 scanned the whole answer JSON for the bare words "critical" /
// "high", so one audit miner's prose section header ("Critical/High
// Severity Findings") plus a social miner scoring a bare handle string
// REJECTED USD Coin. Prose is evidence, not a verdict: a single prose hit
// is now one red-flag signal that must be corroborated by an independent
// intent before it can reject anything.
import type { AskResult, DeskRun } from "./desk.ts";

export type Verdict = "LIST" | "REVIEW" | "REJECT";

export interface Memo {
  verdict: Verdict;
  reasons: string[];
  markdown: string;
  json: Record<string, unknown>;
}

type SignalKind = "hard" | "structured-critical" | "red" | "soft" | "incomplete";

interface Signal {
  intent: string;
  kind: SignalKind;
  detail: string;
}

/** All human-readable string content of an answer, for the prose scan. */
function proseText(answer: Record<string, unknown>): string {
  const parts: string[] = [];
  const walk = (v: unknown, depth: number): void => {
    if (typeof v === "string") parts.push(v);
    else if (Array.isArray(v) && depth < 3) v.forEach((x) => walk(x, depth + 1));
    else if (v && typeof v === "object" && depth < 3)
      Object.values(v as Record<string, unknown>).forEach((x) => walk(x, depth + 1));
  };
  walk(answer, 0);
  return parts.join("\n");
}

/** A short verbatim quote around a regex match, whitespace-collapsed. */
function quoteAround(text: string, m: RegExpMatchArray): string {
  const idx = m.index ?? 0;
  const start = Math.max(0, idx - 70);
  const end = Math.min(text.length, idx + (m[0]?.length ?? 0) + 70);
  const snip = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${snip}${end < text.length ? "…" : ""}`;
}

// Prose severity *assertions* (not bare keywords): "Severity: High",
// "Critical/High severity", "high-severity", "critical vulnerability", …
const PROSE_SEVERITY: RegExp[] = [
  /severity\s*(?:is|:|=)?\s*(critical|high)\b/i,
  /\b(critical|high)[\s/-]+severity\b/i,
  /\b(critical|high)-severity\b/i,
  /\bcritical\b[^.!?\n]{0,60}\b(finding|vulnerabilit\w*|issue|flaw|risk|bug)\b/i,
  /\bhigh\b[^.!?\n]{0,60}\b(finding|vulnerabilit\w*|issue|flaw|risk)\b/i,
];

const TERMINAL_NEGATIVE_VERDICT = /reject|fail|unsafe|do not list|not approved/i;
const NEGATIVE_VERDICT = /request changes|changes requested|caution|concern|needs work|revise/i;

/** Signals from one audit / code-review answer. */
function codeSignals(r: AskResult): { signals: Signal[]; cleanNote?: string } {
  const a = r.answer ?? {};
  const signals: Signal[] = [];

  // — structured fields first (the answer object itself, or a nested
  //   object under `value` when the miner wraps its payload) —
  const objs: Record<string, unknown>[] = [a];
  if (a.value && typeof a.value === "object" && !Array.isArray(a.value))
    objs.push(a.value as Record<string, unknown>);
  for (const o of objs) {
    const verdict = typeof o.verdict === "string" ? o.verdict : undefined;
    if (verdict && TERMINAL_NEGATIVE_VERDICT.test(verdict)) {
      signals.push({
        intent: r.intent, kind: "structured-critical",
        detail: `${r.intent}: structured verdict field is terminal-negative — "verdict": "${verdict}"`,
      });
    } else if (verdict && NEGATIVE_VERDICT.test(verdict)) {
      signals.push({
        intent: r.intent, kind: "red",
        detail: `${r.intent}: structured verdict field is negative (not terminal) — "verdict": "${verdict}"`,
      });
    }
    const sev = typeof o.severity === "string" ? o.severity.toLowerCase() : undefined;
    if (sev === "critical") {
      signals.push({
        intent: r.intent, kind: "structured-critical",
        detail: `${r.intent}: structured "severity": "critical" field in the answer`,
      });
    } else if (sev === "high") {
      signals.push({
        intent: r.intent, kind: "red",
        detail: `${r.intent}: structured "severity": "high" field in the answer`,
      });
    }
    if (Array.isArray(o.findings)) {
      for (const f of o.findings) {
        if (!f || typeof f !== "object") continue;
        const fo = f as Record<string, unknown>;
        const fs = typeof fo.severity === "string" ? fo.severity.toLowerCase()
          : typeof fo.level === "string" ? fo.level.toLowerCase() : undefined;
        if (fs === "critical") {
          signals.push({
            intent: r.intent, kind: "structured-critical",
            detail: `${r.intent}: findings[] entry with structured severity "critical": ${JSON.stringify(fo).slice(0, 200)}`,
          });
        } else if (fs === "high") {
          signals.push({
            intent: r.intent, kind: "red",
            detail: `${r.intent}: findings[] entry with structured severity "high": ${JSON.stringify(fo).slice(0, 200)}`,
          });
        }
      }
    }
  }

  // — prose scan (only if no structured signal already fired for this
  //   intent; a prose hit is worth at most one red flag per intent) —
  if (!signals.some((s) => s.intent === r.intent)) {
    const text = proseText(a);
    for (const re of PROSE_SEVERITY) {
      const m = text.match(re);
      if (m) {
        signals.push({
          intent: r.intent, kind: "red",
          detail: `${r.intent}: prose severity assertion (single uncorroborated hit — cannot reject alone): "${quoteAround(text, m)}"`,
        });
        break;
      }
    }
  }

  if (signals.length === 0) {
    return { signals, cleanNote: `${r.intent}: no critical/high finding in the returned answer` };
  }
  return { signals };
}

export function decide(run: DeskRun): { verdict: Verdict; reasons: string[]; signals: Signal[] } {
  const reasons: string[] = [];
  const signals: Signal[] = [];

  for (const r of run.results) {
    if (r.status !== "answered") {
      signals.push({
        intent: r.intent, kind: "incomplete",
        detail: `${r.intent}: check did not complete (${r.status}${r.error ? ` — ${r.error}` : ""})`,
      });
      continue;
    }
    if (r.intent === "SANCTIONS_SCREENING_MATCH_GENERAL") {
      if (r.answer?.matched === true) {
        signals.push({
          intent: r.intent, kind: "hard",
          detail: `SANCTIONS: entity matched a sanctions list (match_score ${String(r.answer?.match_score ?? "?")}) — hard reject`,
        });
      } else if (r.answer?.matched === false) {
        reasons.push(`SANCTIONS: no match reported (matched=false, match_score ${String(r.answer?.match_score ?? "?")})`);
      } else {
        signals.push({
          intent: r.intent, kind: "soft",
          detail: `SANCTIONS: answer carried no explicit matched flag — cannot treat as a clear screen`,
        });
      }
      continue;
    }
    if (r.intent === "SMART_CONTRACT_AUDIT_GENERAL" || r.intent === "CODE_REVIEW_GENERAL") {
      const { signals: s, cleanNote } = codeSignals(r);
      signals.push(...s);
      if (cleanNote) reasons.push(cleanNote);
      continue;
    }
    if (r.intent === "SOCIAL_BOT_DETECTION_GENERAL") {
      // Soft-only by policy: the live social miners evaluate a bare handle
      // string and are not self-consistent (same handle, bot_score 0.8,
      // verdicts "likely_human" and "likely_bot" in different runs). The
      // signal is quoted verbatim and can force REVIEW, never REJECT.
      const score = Number(r.answer?.bot_score);
      const verdictStr = typeof r.answer?.verdict === "string" ? r.answer.verdict : "";
      const saysBot = /bot/i.test(verdictStr) && !/human/i.test(verdictStr);
      if ((Number.isFinite(score) && score >= 0.8) || saysBot) {
        signals.push({
          intent: r.intent, kind: "soft",
          detail: `SOCIAL: bot_score ${Number.isFinite(score) ? score : "n/a"} with miner verdict "${verdictStr || "?"}" — soft signal only (social miners score a bare handle string and contradict themselves across runs; quoted verbatim, cannot reject)`,
        });
      } else {
        reasons.push(`SOCIAL: no bot signal (verdict "${verdictStr || "?"}", bot_score ${Number.isFinite(score) ? score : "n/a"})`);
      }
      continue;
    }
    // Remaining intents (metric verify) are factual reads: answered is enough.
    reasons.push(`${r.intent}: answered (factual read; no risk signal derived)`);
  }

  const hard = signals.filter((s) => s.kind === "hard");
  const structuredCritical = signals.filter((s) => s.kind === "structured-critical");
  const redIntents = [...new Set(signals.filter((s) => s.kind === "red").map((s) => s.intent))];
  const anySignal = signals.length > 0;

  let verdict: Verdict;
  if (hard.length > 0 || structuredCritical.length > 0) {
    verdict = "REJECT";
  } else if (redIntents.length >= 2) {
    verdict = "REJECT";
    reasons.push(`REJECT rule: independent red-flag signals from ${redIntents.length} different intents (${redIntents.join(", ")})`);
  } else {
    verdict = anySignal ? "REVIEW" : "LIST";
  }

  // Signal details lead the "Why" list, clean notes follow.
  const ordered = [...signals.map((s) => s.detail), ...reasons];
  return { verdict, reasons: ordered, signals };
}

function fmtUsd(n: number | undefined): string {
  return n === undefined ? "n/a" : `$${n.toFixed(4)}`;
}

export function renderMemo(run: DeskRun): Memo {
  const { verdict, reasons, signals } = decide(run);
  const lines: string[] = [];
  lines.push(`# Listing Desk memo — ${run.input.tokenName}`);
  lines.push("");
  lines.push(`**Verdict: ${verdict}**`);
  lines.push("");
  lines.push(`- Token contract: \`${run.input.contractAddress}\` (${run.input.chain ?? "ethereum"}, metrics at block ${run.block})`);
  if (run.input.entityName) lines.push(`- Entity screened: ${run.input.entityName}`);
  if (run.input.socialHandle) lines.push(`- Social account checked: ${run.input.socialHandle}`);
  lines.push(`- Run: ${run.startedAt} · run_id \`${run.runId}\` · network: Telegraph testnet (Ethereum Sepolia escrow, devnode)`);
  lines.push("");
  lines.push(`## Why`);
  for (const reason of reasons) lines.push(`- ${reason}`);
  lines.push("");
  lines.push(`## Evidence per check`);
  for (const r of run.results) {
    lines.push("");
    lines.push(`### ${r.intent} — ${r.status} (${r.latencyMs} ms, billed ${fmtUsd(r.costUsd)})`);
    if (r.error) lines.push(`- Note: ${r.error}`);
    if (r.answer) {
      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify(r.answer, null, 2).slice(0, 4000));
      lines.push("```");
    }
    if (r.fulfillment) {
      lines.push("");
      lines.push(`Provider/payment evidence (fulfillment):`);
      lines.push("```json");
      lines.push(JSON.stringify(r.fulfillment, null, 2).slice(0, 4000));
      lines.push("```");
    }
    if (r.receipt) lines.push(`- Receipt: \`${JSON.stringify(r.receipt).slice(0, 500)}\``);
  }
  lines.push("");
  lines.push(`## Cost`);
  lines.push(`- Total billed this run: **$${run.totalCostUsd.toFixed(4)}** across ${run.results.filter((r) => r.status === "answered").length} answered checks (testnet USDC; a refused ask is never billed).`);
  lines.push("");
  lines.push(`_Generated by Listing Desk. Verdict heuristics are transparent and quote their evidence above; a human listings reviewer makes the final call._`);

  const json: Record<string, unknown> = {
    run_id: run.runId,
    started_at: run.startedAt,
    input: run.input,
    block: run.block,
    verdict,
    verdict_policy: "v2 (signals: hard / structured-critical reject alone; red flags need >= 2 intents; soft + incomplete force REVIEW)",
    reasons,
    signals: signals.map((s) => ({ intent: s.intent, kind: s.kind, detail: s.detail })),
    total_cost_usd: run.totalCostUsd,
    checks: run.results.map((r) => ({
      intent: r.intent,
      status: r.status,
      latency_ms: r.latencyMs,
      cost_usd: r.costUsd ?? null,
      error: r.error ?? null,
      answer: r.answer ?? null,
      fulfillment: r.fulfillment ?? null,
      receipt: r.receipt ?? null,
    })),
  };
  return { verdict, reasons, markdown: lines.join("\n") + "\n", json };
}
