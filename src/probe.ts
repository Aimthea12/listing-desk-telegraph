// probe.ts — pre-flight coverage check: for each planned intent, confirm it
// exists on the node with live miners, and print the evidence. Run this
// before spending anything; an intent with no miners fails asks pre-payment,
// but knowing coverage up front shapes the memo's checks.
import { TelegraphClient } from "./client.ts";
import { LIVE_INTENTS } from "./intents.ts";

export interface CoverageRow {
  intent: string;
  exists: boolean;
  kind?: string;
  miners: number;
  topMiner?: string;
  priceUsd?: number;
}

export async function probeCoverage(client: TelegraphClient): Promise<CoverageRow[]> {
  const rows: CoverageRow[] = [];
  for (const intent of LIVE_INTENTS) {
    const [detail, minersRes] = await Promise.all([client.intent(intent), client.findMiners(intent)]);
    const d = (detail.data ?? {}) as { kind?: string; miners?: number };
    const m = (minersRes.data ?? {}) as {
      count?: number;
      miners?: { slug?: string; price_usd?: number }[];
    };
    rows.push({
      intent,
      exists: !detail.isError && typeof d === "object",
      kind: d.kind,
      miners: m.count ?? d.miners ?? 0,
      topMiner: m.miners?.[0]?.slug,
      priceUsd: m.miners?.[0]?.price_usd,
    });
  }
  return rows;
}

export function printCoverage(rows: CoverageRow[]) {
  for (const r of rows) {
    console.log(
      `${r.exists ? "OK " : "MISS"} ${r.intent} — miners: ${r.miners}` +
        (r.topMiner ? `, top: ${r.topMiner} @ $${r.priceUsd}` : "") +
        (r.kind ? `, kind: ${r.kind}` : ""),
    );
  }
  const live = rows.filter((r) => r.miners > 0).length;
  console.log(`\n${live}/${rows.length} intents have live miners.`);
}
