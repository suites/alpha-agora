import { NextResponse } from "next/server";

import { findCard, updateCard } from "../../../lib/market-store";
import { settleValidatedCard } from "../../../lib/settlement-adapters";

interface SettleCardPayload {
  cardId?: string;
}

export async function POST(request: Request) {
  let payload: SettleCardPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.cardId) {
    return NextResponse.json({ error: "cardId is required" }, { status: 400 });
  }

  const card = findCard(payload.cardId);
  if (!card) {
    return NextResponse.json({ error: "card not found" }, { status: 404 });
  }

  if (card.status !== "APPROVED") {
    return NextResponse.json({ error: "card must be approved before settlement" }, { status: 409 });
  }

  const result = settleValidatedCard(card);
  updateCard(result.card);

  return NextResponse.json(result);
}
