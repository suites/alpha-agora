-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('SUCCESS', 'PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "AgentStepStatus" AS ENUM ('SUCCESS', 'PENDING', 'FAILED', 'UNCONFIGURED', 'RETRYABLE_FAILED');

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" UUID NOT NULL,
    "cardId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'SUCCESS',
    "inputJson" JSONB NOT NULL,
    "outputJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_steps" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "nodeName" TEXT NOT NULL,
    "status" "AgentStepStatus" NOT NULL DEFAULT 'SUCCESS',
    "inputJson" JSONB NOT NULL,
    "outputJson" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT NOT NULL,
    "toolCalls" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "agent_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_runs_cardId_idx" ON "agent_runs"("cardId");

-- CreateIndex
CREATE INDEX "agent_runs_createdAt_idx" ON "agent_runs"("createdAt");

-- CreateIndex
CREATE INDEX "agent_steps_nodeName_idx" ON "agent_steps"("nodeName");

-- CreateIndex
CREATE UNIQUE INDEX "agent_steps_runId_sequence_key" ON "agent_steps"("runId", "sequence");

-- AddForeignKey
ALTER TABLE "agent_steps" ADD CONSTRAINT "agent_steps_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
