import { NextResponse } from "next/server";

import { getDashboardMetrics } from "../../../lib/market-card";
import { findCard, listAllCards, updateCard } from "../../../lib/market-store";
import { applyValidationAction, getValidatorMetrics } from "../../../lib/validation-workflow";
import type { ValidationVerdict } from "../../../lib/market-card";

interface ValidateCardPayload {
  cardId?: string;
  validator?: string;
  verdict?: ValidationVerdict;
  comment?: string;
  editedQuestion?: string;
}

const allowedVerdicts: ValidationVerdict[] = ["APPROVE", "REJECT", "NEEDS_EDIT"];

export async function GET() {
  const cards = listAllCards();
  return NextResponse.json({
    cards,
    metrics: getValidatorMetrics(cards),
    dashboardMetrics: getDashboardMetrics(cards),
  });
}

export async function POST(request: Request) {
  let payload: ValidateCardPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.cardId) {
    return NextResponse.json({ error: "cardId is required" }, { status: 400 });
  }

  if (!payload.verdict || !allowedVerdicts.includes(payload.verdict)) {
    return NextResponse.json({ error: "valid verdict is required" }, { status: 400 });
  }

  if (!payload.comment || payload.comment.trim().length === 0) {
    return NextResponse.json({ error: "comment is required" }, { status: 400 });
  }

  const card = findCard(payload.cardId);
  if (!card) {
    return NextResponse.json({ error: "card not found" }, { status: 404 });
  }

  if (card.trace.arcTxHash || card.validations.some((validation) => validation.rewardTxHash)) {
    return NextResponse.json(
      { error: "card already settled", message: "Create a revised Market Card instead of changing a settled proof." },
      { status: 409 },
    );
  }

  if (payload.verdict === "NEEDS_EDIT" && /approval|approved|clear enough/i.test(payload.comment.trim())) {
    return NextResponse.json(
      { error: "edit verdict requires edit-specific rationale" },
      { status: 400 },
    );
  }

  if (card.validations.length > 0) {
    return NextResponse.json(
      { error: "card validation already finalized", message: "Create a revised Market Card for a new verdict." },
      { status: 409 },
    );
  }

  const updatedCard = updateCard(
    applyValidationAction({
      card,
      validator: payload.validator ?? "AnonymousValidator",
      verdict: payload.verdict,
      comment: payload.comment,
      editedQuestion: payload.editedQuestion,
    }),
  );
  const cards = listAllCards();

  return NextResponse.json({
    card: updatedCard,
    cards,
    metrics: getValidatorMetrics(cards),
    dashboardMetrics: getDashboardMetrics(cards),
  });
}
