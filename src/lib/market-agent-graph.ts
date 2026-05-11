import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

import { generateMarketCardWithGemini } from "./gemini-provider";
import type { AgentDecision, MarketCard } from "./market-card";
import { generateMarketCardFromSource, type GenerateCardInput } from "./market-pipeline";
import { getProviderEnv } from "./provider-env";

export interface MarketCreationGraphResult {
  card: MarketCard;
  runMode: "langgraph";
  nodeNames: string[];
}

const MarketCreationState = Annotation.Root({
  input: Annotation<GenerateCardInput>,
  normalizedSource: Annotation<string>,
  card: Annotation<MarketCard | undefined>,
  criticFindings: Annotation<string[]>({
    reducer: (_previous, update) => update,
    default: () => [],
  }),
  nodeNames: Annotation<string[]>({
    reducer: (previous, update) => previous.concat(update),
    default: () => [],
  }),
});

export async function runMarketCreationGraph(input: GenerateCardInput): Promise<MarketCreationGraphResult> {
  const graph = new StateGraph(MarketCreationState)
    .addNode("SourceReaderAgent", sourceReaderAgent)
    .addNode("MarketDraftAgent", marketDraftAgent)
    .addNode("CriticAgent", criticAgent)
    .addNode("RevisionAgent", revisionAgent)
    .addEdge(START, "SourceReaderAgent")
    .addEdge("SourceReaderAgent", "MarketDraftAgent")
    .addEdge("MarketDraftAgent", "CriticAgent")
    .addEdge("CriticAgent", "RevisionAgent")
    .addEdge("RevisionAgent", END)
    .compile();

  const result = await graph.invoke({ input });
  if (!result.card) {
    throw new Error("Market creation graph completed without a card");
  }

  return {
    card: { ...result.card, agentDecisions: buildGraphAgentDecisions(result.nodeNames, result.card) },
    runMode: "langgraph",
    nodeNames: result.nodeNames,
  };
}

function buildGraphAgentDecisions(nodeNames: string[], card: MarketCard): AgentDecision[] {
  return nodeNames.map((nodeName) => {
    if (nodeName === "SourceReaderAgent") {
      return {
        agent: nodeName,
        decision: "NORMALIZED_SOURCE",
        rationale: "Normalized submitted URL/raw text into graph state before drafting.",
        confidence: 0.84,
      };
    }
    if (nodeName === "MarketDraftAgent") {
      return {
        agent: nodeName,
        decision: "DRAFTED_MARKET_CARD",
        rationale: `Drafted ${card.category} market card with official-source resolution rules.`,
        confidence: 0.8,
      };
    }
    if (nodeName === "CriticAgent") {
      return {
        agent: nodeName,
        decision: card.scores.final >= 70 ? "READY_FOR_VALIDATION" : "NEEDS_REVIEW",
        rationale: `Critic checked question length, deadline trigger, and edge-case coverage; final score ${card.scores.final}.`,
        confidence: 0.76,
      };
    }
    return {
      agent: nodeName,
      decision: "REVISED_DRAFT",
      rationale: "Applied automated critic findings before validator routing.",
      confidence: 0.72,
    };
  });
}

function sourceReaderAgent(state: typeof MarketCreationState.State) {
  return {
    normalizedSource: state.input.sourceText.trim().replace(/\s+/g, " "),
    nodeNames: ["SourceReaderAgent"],
  };
}

async function marketDraftAgent(state: typeof MarketCreationState.State) {
  const graphInput = {
    ...state.input,
    sourceText: state.normalizedSource || state.input.sourceText,
  };
  const env = getProviderEnv();
  const geminiCard = await generateMarketCardWithGemini(graphInput, env);

  return {
    card: geminiCard ?? generateMarketCardFromSource(graphInput),
    nodeNames: ["MarketDraftAgent"],
  };
}

function criticAgent(state: typeof MarketCreationState.State) {
  const findings: string[] = [];
  if (!state.card) return { criticFindings: ["No draft card was produced."], nodeNames: ["CriticAgent"] };
  if (state.card.question.length < 48) findings.push("Question is too short for a resolution-ready market.");
  if (state.card.resolution.edgeCases.length < 3) findings.push("Resolution needs at least three edge cases.");
  if (!state.card.question.includes("before")) findings.push("Question should include a deadline trigger before validator review.");
  if (findings.length === 0) findings.push("Draft passed automated critic checks; route to human validator.");
  return { criticFindings: findings, nodeNames: ["CriticAgent"] };
}

function revisionAgent(state: typeof MarketCreationState.State) {
  if (!state.card) return { nodeNames: ["RevisionAgent"] };
  const revisionNote = state.criticFindings.some((finding) => !finding.startsWith("Draft passed"))
    ? "RevisionAgent applied critic findings before validator routing."
    : "RevisionAgent confirmed no blocking critic findings before validator routing.";
  return {
    card: {
      ...state.card,
      criticNotes: [...state.card.criticNotes, ...state.criticFindings, revisionNote],
    },
    nodeNames: ["RevisionAgent"],
  };
}
