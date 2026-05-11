import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import type { AgentDecision, MarketCard } from "./market-card";
import type { GenerateCardInput } from "./market-pipeline";

type SqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
  };
  close(): void;
};

type DatabaseSyncConstructor = new (path: string) => SqliteDatabase;

export type AgentRunStatus = "SUCCESS" | "FAILED" | "PENDING";

export interface AgentStep {
  id: string;
  runId: string;
  sequence: number;
  nodeName: string;
  status: AgentRunStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  confidence: number;
  rationale: string;
  toolCalls: string[];
  startedAt: string;
  completedAt: string;
}

export interface AgentRun {
  id: string;
  cardId: string;
  provider: string;
  status: AgentRunStatus;
  input: GenerateCardInput;
  output: Pick<MarketCard, "id" | "question" | "scores" | "status">;
  createdAt: string;
  completedAt: string;
  steps: AgentStep[];
}

let databasePathOverride: string | undefined;
const require = createRequire(__filename);

export function createAgentRunForCard(args: { input: GenerateCardInput; card: MarketCard; provider: string }): AgentRun {
  const now = new Date().toISOString();
  const run: AgentRun = {
    id: randomUUID(),
    cardId: args.card.id,
    provider: args.provider,
    status: "SUCCESS",
    input: args.input,
    output: {
      id: args.card.id,
      question: args.card.question,
      scores: args.card.scores,
      status: args.card.status,
    },
    createdAt: now,
    completedAt: now,
    steps: args.card.agentDecisions.map((decision, index) => buildStep(decision, index, args.input, args.card, now)),
  };
  run.steps = run.steps.map((step) => ({ ...step, runId: run.id }));

  withDatabase((db) => {
    db.prepare(
      `INSERT INTO agent_runs (id, card_id, provider, status, input_json, output_json, created_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(run.id, run.cardId, run.provider, run.status, JSON.stringify(run.input), JSON.stringify(run.output), run.createdAt, run.completedAt);

    const insertStep = db.prepare(
      `INSERT INTO agent_steps
       (id, run_id, sequence, node_name, status, input_json, output_json, confidence, rationale, tool_calls_json, started_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const step of run.steps) {
      insertStep.run(
        step.id,
        step.runId,
        step.sequence,
        step.nodeName,
        step.status,
        JSON.stringify(step.input),
        JSON.stringify(step.output),
        step.confidence,
        step.rationale,
        JSON.stringify(step.toolCalls),
        step.startedAt,
        step.completedAt,
      );
    }
  });

  return run;
}

export function listAgentRuns(limit = 20): AgentRun[] {
  return withDatabase((db) => {
    const rows = db.prepare(`SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT ?`).all(limit);
    return rows.map((row) => hydrateRun(db, row));
  });
}

export function getAgentRun(runId: string): AgentRun | undefined {
  return withDatabase((db) => {
    const row = db.prepare(`SELECT * FROM agent_runs WHERE id = ?`).get(runId);
    return row ? hydrateRun(db, row) : undefined;
  });
}

export function setAgentRunDatabasePathForTests(path: string): void {
  databasePathOverride = path;
}

export function resetAgentRunStoreForTests(): void {
  const path = getDatabasePath();
  if (existsSync(path)) rmSync(path, { force: true });
}

function buildStep(
  decision: AgentDecision,
  index: number,
  input: GenerateCardInput,
  card: MarketCard,
  timestamp: string,
): AgentStep {
  return {
    id: randomUUID(),
    runId: "pending",
    sequence: index + 1,
    nodeName: decision.agent,
    status: "SUCCESS",
    input: index === 0 ? { sourceUrl: input.sourceUrl, sourceTextLength: input.sourceText.length, categoryHint: input.categoryHint } : { cardId: card.id },
    output: {
      decision: decision.decision,
      cardId: card.id,
      question: card.question,
      finalScore: card.scores.final,
    },
    confidence: decision.confidence,
    rationale: decision.rationale,
    toolCalls: [],
    startedAt: timestamp,
    completedAt: timestamp,
  };
}

function hydrateRun(db: SqliteDatabase, row: Record<string, unknown>): AgentRun {
  const runId = String(row.id);
  const steps = db.prepare(`SELECT * FROM agent_steps WHERE run_id = ? ORDER BY sequence ASC`).all(runId).map(hydrateStep);
  return {
    id: runId,
    cardId: String(row.card_id),
    provider: String(row.provider),
    status: row.status as AgentRunStatus,
    input: JSON.parse(String(row.input_json)) as GenerateCardInput,
    output: JSON.parse(String(row.output_json)) as AgentRun["output"],
    createdAt: String(row.created_at),
    completedAt: String(row.completed_at),
    steps,
  };
}

function hydrateStep(row: Record<string, unknown>): AgentStep {
  return {
    id: String(row.id),
    runId: String(row.run_id),
    sequence: Number(row.sequence),
    nodeName: String(row.node_name),
    status: row.status as AgentRunStatus,
    input: JSON.parse(String(row.input_json)) as Record<string, unknown>,
    output: JSON.parse(String(row.output_json)) as Record<string, unknown>,
    confidence: Number(row.confidence),
    rationale: String(row.rationale),
    toolCalls: JSON.parse(String(row.tool_calls_json)) as string[],
    startedAt: String(row.started_at),
    completedAt: String(row.completed_at),
  };
}

function withDatabase<T>(callback: (db: SqliteDatabase) => T): T {
  const path = getDatabasePath();
  mkdirSync(dirname(path), { recursive: true });
  const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: DatabaseSyncConstructor };
  const db = new DatabaseSync(path);
  try {
    migrate(db);
    return callback(db);
  } finally {
    db.close();
  }
}

function migrate(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      input_json TEXT NOT NULL,
      output_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      completed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_steps (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      node_name TEXT NOT NULL,
      status TEXT NOT NULL,
      input_json TEXT NOT NULL,
      output_json TEXT NOT NULL,
      confidence REAL NOT NULL,
      rationale TEXT NOT NULL,
      tool_calls_json TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      FOREIGN KEY(run_id) REFERENCES agent_runs(id)
    );

    CREATE INDEX IF NOT EXISTS idx_agent_steps_run_id_sequence ON agent_steps(run_id, sequence);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_card_id ON agent_runs(card_id);
  `);
}

function getDatabasePath(): string {
  if (databasePathOverride) return databasePathOverride;
  if (process.env.ALPHA_AGORA_DB_PATH) return process.env.ALPHA_AGORA_DB_PATH;
  if (process.env.VITEST || process.env.VITEST_WORKER_ID) {
    return join(tmpdir(), "alpha-agora-agent-runs", `agent-runs-${process.pid}-${process.env.VITEST_WORKER_ID ?? "0"}.sqlite`);
  }
  return join(process.cwd(), ".alpha-agora", "agent-runs.sqlite");
}
