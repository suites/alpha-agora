import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

import type { MarketCard } from "./market-card";
import { generateMarketCardFromSource, type GenerateCardInput } from "./market-pipeline";

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
    .addConditionalEdges("CriticAgent", routeAfterCritic, {
      revise: "RevisionAgent",
      done: END,
    })
    .addEdge("RevisionAgent", END)
    .compile();

  const result = await graph.invoke({ input });
  if (!result.card) {
    throw new Error("Market creation graph completed without a card");
  }

  return {
    card: result.card,
    runMode: "langgraph",
    nodeNames: result.nodeNames,
  };
}

function sourceReaderAgent(state: typeof MarketCreationState.State) {
  return {
    normalizedSource: state.input.sourceText.trim().replace(/\s+/g, " "),
    nodeNames: ["SourceReaderAgent"],
  };
}

function marketDraftAgent(state: typeof MarketCreationState.State) {
  return {
    card: generateMarketCardFromSource({
      ...state.input,
      sourceText: state.normalizedSource || state.input.sourceText,
    }),
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

function routeAfterCritic(state: typeof MarketCreationState.State): "revise" | "done" {
  const hasBlockingFinding = state.criticFindings.some((finding) => !finding.startsWith("Draft passed"));
  return hasBlockingFinding ? "revise" : "done";
}

function revisionAgent(state: typeof MarketCreationState.State) {
  if (!state.card) return { nodeNames: ["RevisionAgent"] };
  return {
    card: {
      ...state.card,
      criticNotes: [...state.card.criticNotes, ...state.criticFindings, "RevisionAgent reviewed critic findings before validator routing."],
    },
    nodeNames: ["RevisionAgent"],
  };
}
