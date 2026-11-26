// intents.ts — the five Exchange (Mission 01, Route 1) intents the Listing
// Desk buys, and how a desk input maps to each ask.
//
// IMPORTANT (probe finding, 26 Nov 2026): the unsuffixed canonical names
// (SMART_CONTRACT_AUDIT, CODE_REVIEW, ...) exist as schemas on devnode but
// have ZERO miners. The live, purchasable coverage is under the `_GENERAL`
// names listed in the node's own catalogue. All asks use the live names.
export const LIVE_INTENTS = [
  "SMART_CONTRACT_AUDIT_GENERAL",
  "CODE_REVIEW_GENERAL",
  "ONCHAIN_METRIC_VERIFY_GENERAL",
  "SANCTIONS_SCREENING_MATCH_GENERAL",
  "SOCIAL_BOT_DETECTION_GENERAL",
] as const;

export type LiveIntent = (typeof LIVE_INTENTS)[number];

export interface DeskInput {
  /** Display name of the token/project asking for a listing. */
  tokenName: string;
  /** Token contract address (on `chain`). */
  contractAddress: string;
  /** Chain the contract lives on, for the metric verify intent. */
  chain?: "ethereum" | "polygon" | "arbitrum";
  /** Legal entity / team name to screen against sanctions lists. */
  entityName?: string;
  /** Treasury or team wallet to read on-chain metrics for (defaults to the contract). */
  treasuryWallet?: string;
  /** Project social account handle for bot detection. */
  socialHandle?: string;
  /** Source excerpt of the token contract (or a link) for CODE_REVIEW. */
  codeSnippet?: string;
  /** Block to read metrics at (defaults to latest, resolved by the desk). */
  block?: number;
}

export interface AskPlan {
  intent: LiveIntent;
  question: string;
  params?: Record<string, unknown>;
  /** Why this ask might be skipped for a given input (missing field). */
  requires?: keyof DeskInput;
}

/** Build the ask plan for an input. Asks whose required input is missing are
 *  still returned (with `requires` set) so the desk can record them as
 *  skipped-with-reason instead of silently dropping a check. */
export function planAsks(input: DeskInput, block: number): AskPlan[] {
  const chain = input.chain ?? "ethereum";
  const metricAddress = input.treasuryWallet ?? input.contractAddress;
  return [
    {
      intent: "SMART_CONTRACT_AUDIT_GENERAL",
      question:
        `Audit the smart contract for the token "${input.tokenName}" deployed at ` +
        `${input.contractAddress} on ${chain}. Report any critical or high-severity ` +
        `findings (mint authority, ownership, transfer restrictions, upgradeability) ` +
        `and an overall risk verdict.`,
    },
    {
      intent: "CODE_REVIEW_GENERAL",
      question: `Review this token contract code for a listing decision. Flag security and centralization risks.`,
      params: input.codeSnippet ? { code: input.codeSnippet } : undefined,
      requires: "codeSnippet",
    },
    {
      intent: "ONCHAIN_METRIC_VERIFY_GENERAL",
      question:
        `Verify the native balance of address ${metricAddress} on ${chain} at block ${block}.`,
      params: { address: metricAddress, block, chain, metric: "balance" },
    },
    {
      intent: "SANCTIONS_SCREENING_MATCH_GENERAL",
      question: `Screen the entity "${input.entityName ?? ""}" against sanctions lists (e.g. OFAC SDN).`,
      params: input.entityName ? { name: input.entityName } : undefined,
      requires: "entityName",
    },
    {
      intent: "SOCIAL_BOT_DETECTION_GENERAL",
      question: `Assess whether the social account ${input.socialHandle ?? ""} is automated/bot-operated.`,
      params: input.socialHandle ? { account: input.socialHandle } : undefined,
      requires: "socialHandle",
    },
  ];
}
