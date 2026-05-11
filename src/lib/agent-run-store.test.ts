import { beforeEach, describe, expect, it } from "vitest";

import { generateMarketCardFromSource } from "./market-pipeline";
import { createAgentRunForCard, listAgentRuns, resetAgentRunStoreForTests } from "./agent-run-store";

beforeEach(async () => {
  await resetAgentRunStoreForTests();
});

describe("agent run store", () => {
  it("persists an AgentRun and ordered AgentSteps for generated market cards", async () => {
    const input = {
      sourceText: "서울시가 2026년 7월까지 심야 자율주행 셔틀 확대 여부를 공식 위원회 안건으로 올릴 예정이다.",
      sourceUrl: "https://example.com/kr/agent-run-store",
      categoryHint: "Transportation",
    };
    const card = generateMarketCardFromSource(input);

    const run = await createAgentRunForCard({ input, card, provider: "deterministic" });

    expect(run.cardId).toBe(card.id);
    expect(run.status).toBe("SUCCESS");
    expect(run.steps.map((step) => step.sequence)).toEqual([1, 2, 3, 4]);
    expect(run.steps[0]).toMatchObject({
      runId: run.id,
      nodeName: "EventExtractor",
      status: "SUCCESS",
    });
    expect(run.steps[0].input).toMatchObject({ sourceUrl: input.sourceUrl });
    expect(run.steps[0].output).toMatchObject({ decision: "EXTRACTED" });
    expect(run.steps[0].confidence).toBeGreaterThan(0);
    expect(run.steps[0].rationale).toContain("Detected");

    const runs = await listAgentRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]).toEqual(run);
  });
});
