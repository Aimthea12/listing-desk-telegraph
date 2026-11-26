// cli.ts — Listing Desk command line.
//
//   node src/cli.ts probe
//   node src/cli.ts run --fixture fixtures/clean-token.json
//   node src/cli.ts run --input '{"tokenName":"…","contractAddress":"0x…"}'
//
// Env: TELEGRAPH_URL overrides the node (default https://devnode.telegraphprotocol.com);
// LISTING_DESK_LEDGER overrides the ledger path; LISTING_DESK_OUT the output dir.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TelegraphClient } from "./client.ts";
import { Ledger } from "./ledger.ts";
import { runDesk } from "./desk.ts";
import { renderMemo } from "./memo.ts";
import { printCoverage, probeCoverage } from "./probe.ts";
import type { DeskInput } from "./intents.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const cmd = process.argv[2];
  const client = new TelegraphClient({ nodeUrl: process.env.TELEGRAPH_URL });
  try {
    if (cmd === "probe") {
      printCoverage(await probeCoverage(client));
      return;
    }
    if (cmd === "run") {
      let input: DeskInput;
      const fixture = arg("--fixture");
      const inline = arg("--input");
      if (fixture) input = JSON.parse(readFileSync(fixture, "utf8")) as DeskInput;
      else if (inline) input = JSON.parse(inline) as DeskInput;
      else throw new Error("run needs --fixture <file> or --input '<json>'");
      if (!input.tokenName || !input.contractAddress) {
        throw new Error("input requires tokenName and contractAddress");
      }
      const ledgerPath = process.env.LISTING_DESK_LEDGER ?? join(process.cwd(), "ledger", "receipts.jsonl");
      const outDir = process.env.LISTING_DESK_OUT ?? join(process.cwd(), "runs");
      mkdirSync(outDir, { recursive: true });
      const run = await runDesk(client, input, new Ledger(ledgerPath));
      const memo = renderMemo(run);
      const stamp = run.startedAt.replace(/[:.]/g, "-");
      const mdPath = join(outDir, `memo-${stamp}.md`);
      const jsonPath = join(outDir, `memo-${stamp}.json`);
      writeFileSync(mdPath, memo.markdown);
      writeFileSync(jsonPath, JSON.stringify(memo.json, null, 2) + "\n");
      console.log(`Verdict: ${memo.verdict}  (total billed $${run.totalCostUsd.toFixed(4)})`);
      for (const r of run.results) console.log(`  ${r.intent}: ${r.status} (${r.latencyMs} ms)`);
      console.log(`Memo: ${mdPath}\nJSON: ${jsonPath}\nLedger: ${ledgerPath}`);
      return;
    }
    console.error("usage: probe | run --fixture <file> | run --input '<json>'");
    process.exitCode = 2;
  } finally {
    client.close();
  }
}

main().catch((e) => {
  console.error("FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
