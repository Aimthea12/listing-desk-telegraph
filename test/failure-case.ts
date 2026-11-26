// failure-case.ts — the desk's "Break it" test (Rules §2): point the client
// at a dead node and verify the desk degrades explicitly — every check ends
// error/refused, the verdict is REVIEW (never LIST), and the memo states why.
// Run: npm run test:failure
import { TelegraphClient } from "../src/client.ts";
import { Ledger } from "../src/ledger.ts";
import { runDesk } from "../src/desk.ts";
import { renderMemo } from "../src/memo.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const fixture = JSON.parse(
  readFileSync(join(process.cwd(), "fixtures", "clean-token.json"), "utf8"),
);

const client = new TelegraphClient({ nodeUrl: "http://127.0.0.1:9" });
try {
  const ledger = new Ledger(join(process.cwd(), "ledger", "test-failure.jsonl"));
  const run = await runDesk(client, fixture, ledger);
  const memo = renderMemo(run);
  const statuses = run.results.map((r) => r.status);
  const ok =
    memo.verdict === "REVIEW" &&
    statuses.every((s) => s === "error" || s === "refused") &&
    memo.markdown.includes("check did not complete");
  console.log("statuses:", statuses.join(", "));
  console.log("verdict:", memo.verdict);
  console.log(ok ? "PASS: desk degraded explicitly, verdict REVIEW, no silent clearance" : "FAIL: degradation behavior wrong");
  process.exitCode = ok ? 0 : 1;
} finally {
  client.close();
}
