import { randomUUID } from "node:crypto";

import { Prisma } from "../generated/prisma/client";
import type { AgentDecision, MarketCard } from "./market-card";
import type { GenerateCardInput } from "./market-pipeline";
import { prisma } from "./prisma";

export type AgentRunStatus = "SUCCESS" | "FAILED" | "PENDING";
export type AgentStepStatus = AgentRunStatus | "UNCONFIGURED" | "RETRYABLE_FAILED";

export interface AgentStep {
  id: string;
  runId: string;
  sequence: number;
  nodeName: string;
  status: AgentStepStatus;
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

export async function createAgentRunForCard(args: { input: GenerateCardInput; card: MarketCard; provider: string }): Promise<AgentRun> {
  const now = new Date().toISOString();
  const runId = randomUUID();
  const steps = args.card.agentDecisions.map((decision, index) => ({
    ...buildStep(decision, index, args.input, args.card, now),
    runId,
  }));

  const run = await prisma.agentRun.create({
    data: {
      id: runId,
      cardId: args.card.id,
      provider: args.provider,
      status: "SUCCESS",
      inputJson: toPrismaJson(args.input),
      outputJson: toPrismaJson(buildRunOutput(args.card)),
      createdAt: new Date(now),
      completedAt: new Date(now),
      steps: {
        create: steps.map((step) => ({
          id: step.id,
          sequence: step.sequence,
          nodeName: step.nodeName,
          status: step.status,
          inputJson: toPrismaJson(step.input),
          outputJson: toPrismaJson(step.output),
          confidence: step.confidence,
          rationale: step.rationale,
          toolCalls: toPrismaJson(step.toolCalls),
          startedAt: new Date(step.startedAt),
          completedAt: new Date(step.completedAt),
        })),
      },
    },
    include: { steps: { orderBy: { sequence: "asc" } } },
  });

  return hydrateRun(run as PrismaRunWithSteps);
}

export async function listAgentRuns(limit = 20): Promise<AgentRun[]> {
  const rows = await prisma.agentRun.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { steps: { orderBy: { sequence: "asc" } } },
  });
  return rows.map((row) => hydrateRun(row as PrismaRunWithSteps));
}

export async function getAgentRun(runId: string): Promise<AgentRun | undefined> {
  const row = await prisma.agentRun.findUnique({
    where: { id: runId },
    include: { steps: { orderBy: { sequence: "asc" } } },
  });
  return row ? hydrateRun(row as PrismaRunWithSteps) : undefined;
}

export async function resetAgentRunStoreForTests(): Promise<void> {
  await prisma.agentStep.deleteMany();
  await prisma.agentRun.deleteMany();
}

function buildRunOutput(card: MarketCard): AgentRun["output"] {
  return {
    id: card.id,
    question: card.question,
    scores: card.scores,
    status: card.status,
  };
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

type PrismaRunWithSteps = {
  id: string;
  cardId: string;
  provider: string;
  status: string;
  inputJson: unknown;
  outputJson: unknown;
  createdAt: Date;
  completedAt: Date | null;
  steps: Array<{
    id: string;
    runId: string;
    sequence: number;
    nodeName: string;
    status: string;
    inputJson: unknown;
    outputJson: unknown;
    confidence: number;
    rationale: string;
    toolCalls: unknown;
    startedAt: Date;
    completedAt: Date | null;
  }>;
};

function hydrateRun(row: PrismaRunWithSteps): AgentRun {
  return {
    id: row.id,
    cardId: row.cardId,
    provider: row.provider,
    status: row.status as AgentRunStatus,
    input: row.inputJson as GenerateCardInput,
    output: row.outputJson as AgentRun["output"],
    createdAt: row.createdAt.toISOString(),
    completedAt: (row.completedAt ?? row.createdAt).toISOString(),
    steps: row.steps.map(hydrateStep),
  };
}

function hydrateStep(row: PrismaRunWithSteps["steps"][number]): AgentStep {
  return {
    id: row.id,
    runId: row.runId,
    sequence: row.sequence,
    nodeName: row.nodeName,
    status: row.status as AgentStepStatus,
    input: row.inputJson as Record<string, unknown>,
    output: row.outputJson as Record<string, unknown>,
    confidence: row.confidence,
    rationale: row.rationale,
    toolCalls: Array.isArray(row.toolCalls) ? (row.toolCalls as string[]) : [],
    startedAt: row.startedAt.toISOString(),
    completedAt: (row.completedAt ?? row.startedAt).toISOString(),
  };
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
