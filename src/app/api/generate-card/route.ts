import { NextResponse } from "next/server";

import { createAgentRunForCard, listAgentRuns } from "../../../lib/agent-run-store";
import { type GenerateCardInput } from "../../../lib/market-pipeline";
import { listGeneratedCardsPersisted, upsertGeneratedCardPersisted } from "../../../lib/market-store";
import { generateMarketCard } from "../../../lib/provider-integrations";
import { assertLocalLanguageSourceText, fetchSourceExcerpt, type SourceExcerpt } from "../../../lib/source-fetcher";

export async function GET() {
  return NextResponse.json({ generatedCards: await listGeneratedCardsPersisted(), agentRuns: await listAgentRuns() });
}

export async function POST(request: Request) {
  let payload: Partial<GenerateCardInput>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.sourceUrl || payload.sourceUrl.trim().length === 0) {
    return NextResponse.json({ error: "sourceUrl is required" }, { status: 400 });
  }

  let fetchedSource: SourceExcerpt;

  try {
    fetchedSource = await fetchSourceExcerpt(payload.sourceUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch sourceUrl" },
      { status: 400 },
    );
  }
  let sourceText: string;
  try {
    sourceText = validateReviewedSourceText(payload.sourceText, fetchedSource.sourceText);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid sourceText" },
      { status: 400 },
    );
  }
  const sourceUrl = fetchedSource.sourceUrl;

  let card;

  try {
    card = await generateMarketCard({
      sourceText,
      sourceUrl,
      categoryHint: payload.categoryHint,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate card" }, { status: 502 });
  }

  try {
    const generatedCards = await upsertGeneratedCardPersisted(card);
    const agentRun = await createAgentRunForCard({
      input: {
        sourceText,
        sourceUrl,
        categoryHint: payload.categoryHint,
      },
      card,
      provider: card.agentDecisions[0]?.agent ?? "unknown",
    });

    return NextResponse.json({ card, generatedCards, agentRun }, { status: 201 });
  } catch (error) {
    console.error("Failed to persist generated market card", error);
    return NextResponse.json({ error: "Failed to persist generated card" }, { status: 502 });
  }
}

function validateReviewedSourceText(reviewedSourceText: string | undefined, fetchedSourceText: string): string {
  const trimmedReviewedSourceText = reviewedSourceText?.trim();
  if (!trimmedReviewedSourceText) return fetchedSourceText;

  assertLocalLanguageSourceText(trimmedReviewedSourceText);

  const normalizedReviewed = normalizeExcerptForComparison(trimmedReviewedSourceText);
  const normalizedFetched = normalizeExcerptForComparison(fetchedSourceText);
  if (normalizedReviewed.length < 20 || !normalizedFetched.includes(normalizedReviewed)) {
    throw new Error("sourceText must be derived from the fetched source excerpt");
  }

  return trimmedReviewedSourceText;
}

function normalizeExcerptForComparison(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
