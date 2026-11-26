// client.ts — a small typed MCP client that drives the OFFICIAL Telegraph MCP
// server (@telegraphprotocol/telegraph-protocol-mcp) over stdio.
//
// The server holds the wallet key (~/.telegraph/wallet.json) and signs escrow
// authorizations itself; this client never sees the key. Free tools
// (find_intents / intent / find_miners / account) need no funding. Paid asks
// go through telegraph_ask and are refused by the node pre-payment when the
// escrow is empty — callers must treat that refusal as data, not a crash.
import { spawn, type ChildProcess } from "node:child_process";

export interface ToolResult {
  isError: boolean;
  // Parsed JSON when the tool returned JSON text, otherwise the raw text.
  data: unknown;
}

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}

export class TelegraphClient {
  private proc: ChildProcess;
  private buf = "";
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private ready: Promise<void>;
  private stderr = "";

  constructor(opts: { nodeUrl?: string; extraEnv?: Record<string, string> } = {}) {
    const env: Record<string, string> = { ...process.env } as Record<string, string>;
    if (opts.nodeUrl) env.TELEGRAPH_URL = opts.nodeUrl;
    Object.assign(env, opts.extraEnv ?? {});
    this.proc = spawn("npx", ["-y", "@telegraphprotocol/telegraph-protocol-mcp"], {
      stdio: ["pipe", "pipe", "pipe"],
      env,
    });
    this.proc.stderr?.on("data", (d) => {
      this.stderr += d.toString();
    });
    this.proc.stdout?.on("data", (d) => this.onData(d.toString()));
    this.ready = this.init();
  }

  private onData(chunk: string) {
    this.buf += chunk;
    let idx: number;
    while ((idx = this.buf.indexOf("\n")) >= 0) {
      const line = this.buf.slice(0, idx).trim();
      this.buf = this.buf.slice(idx + 1);
      if (!line) continue;
      let msg: { id?: number; result?: unknown; error?: unknown };
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
        else p.resolve(msg.result);
      }
    }
  }

  private send(obj: unknown) {
    this.proc.stdin?.write(JSON.stringify(obj) + "\n");
  }

  private request(method: string, params: unknown, timeoutMs: number): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP request ${method} timed out after ${timeoutMs} ms`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.send({ jsonrpc: "2.0", id, method, params });
    });
  }

  private async init(): Promise<void> {
    await this.request(
      "initialize",
      {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "listing-desk", version: "0.1.0" },
      },
      60_000,
    );
    this.send({ jsonrpc: "2.0", method: "notifications/initialized" });
  }

  /** Call one MCP tool. Asks get a long timeout: judgment miners can be slow. */
  async callTool(name: string, args: Record<string, unknown> = {}, timeoutMs = 180_000): Promise<ToolResult> {
    await this.ready;
    const result = (await this.request("tools/call", { name, arguments: args }, timeoutMs)) as {
      content?: { type: string; text?: string }[];
      isError?: boolean;
    };
    const texts = (result.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "");
    const joined = texts.join("\n");
    try {
      return { isError: !!result.isError, data: JSON.parse(joined) };
    } catch {
      return { isError: !!result.isError, data: joined };
    }
  }

  findIntents(search?: string, limit = 200) {
    return this.callTool("telegraph_find_intents", search ? { search, limit } : { limit }, 60_000);
  }
  intent(intent: string) {
    return this.callTool("telegraph_intent", { intent }, 60_000);
  }
  findMiners(intent: string) {
    return this.callTool("telegraph_find_miners", { intent }, 60_000);
  }
  account() {
    return this.callTool("telegraph_account", {}, 60_000);
  }
  ask(intent: string, question: string, params?: Record<string, unknown>) {
    const args: Record<string, unknown> = { intent, question };
    if (params && Object.keys(params).length) args.params = params;
    return this.callTool("telegraph_ask", args, 240_000);
  }

  serverStderr(): string {
    return this.stderr;
  }

  close() {
    try {
      this.proc.stdin?.end();
      this.proc.kill("SIGTERM");
    } catch {
      /* already gone */
    }
  }
}
