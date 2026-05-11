import { NextResponse } from "next/server";

import { type GenerateCardInput } from "../../../lib/market-pipeline";
import { listGeneratedCards, upsertGeneratedCard } from "../../../lib/market-store";
import { generateMarketCard } from "../../../lib/provider-integrations";

export async function GET() {
  return NextResponse.json({ generatedCards: listGeneratedCards() });
}

export async function POST(request: Request) {
  let payload: Partial<GenerateCardInput>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.sourceText || payload.sourceText.trim().length === 0) {
    return NextResponse.json({ error: "sourceText is required" }, { status: 400 });
  }

  let card;

  try {
    card = await generateMarketCard({
      sourceText: payload.sourceText,
      sourceUrl: payload.sourceUrl,
      categoryHint: payload.categoryHint,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate card" }, { status: 502 });
  }

  const generatedCards = upsertGeneratedCard(card);

  return NextResponse.json({ card, generatedCards }, { status: 201 });
}
