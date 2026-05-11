import { NextResponse } from "next/server";

import { generateMarketCardFromSource, type GenerateCardInput } from "../../../lib/market-pipeline";
import { listGeneratedCards, upsertGeneratedCard } from "../../../lib/market-store";

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

  const card = generateMarketCardFromSource({
    sourceText: payload.sourceText,
    sourceUrl: payload.sourceUrl,
    categoryHint: payload.categoryHint,
  });

  const generatedCards = upsertGeneratedCard(card);

  return NextResponse.json({ card, generatedCards }, { status: 201 });
}
