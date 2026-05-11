import { generateMarketCardWithGemini } from "./gemini-provider";
import { runMarketCreationGraph } from "./market-agent-graph";
import { type GenerateCardInput } from "./market-pipeline";
import type { MarketCard } from "./market-card";
import { getProviderEnv } from "./provider-env";

export async function generateMarketCard(input: GenerateCardInput): Promise<MarketCard> {
  const env = getProviderEnv();

  if (env.mode === "production" && (env.llmProvider === "gemini" || env.llmProvider === "google") && !env.geminiApiKey) {
    throw new Error("Gemini is selected but GEMINI_API_KEY is not configured");
  }

  const geminiCard = await generateMarketCardWithGemini(input, env);
  if (geminiCard) return geminiCard;

  const graphResult = await runMarketCreationGraph(input);
  return graphResult.card;
}
