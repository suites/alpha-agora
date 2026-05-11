import { runMarketCreationGraph } from "./market-agent-graph";
import { type GenerateCardInput } from "./market-pipeline";
import type { MarketCard } from "./market-card";

export async function generateMarketCard(input: GenerateCardInput): Promise<MarketCard> {
  const graphResult = await runMarketCreationGraph(input);
  return graphResult.card;
}
