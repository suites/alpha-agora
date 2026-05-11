import { NextResponse } from "next/server";

import { findCardPersisted, updateCardPersisted } from "../../../lib/market-store";
import { getProviderPreflight } from "../../../lib/provider-env";
import { isProviderExecutionError } from "../../../lib/provider-status";
import { settleValidatedCardWithProviders } from "../../../lib/settlement-adapters";

interface SettleCardPayload {
  cardId?: string;
}

export async function GET() {
  return NextResponse.json(getProviderPreflight());
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

  const card = await findCardPersisted(payload.cardId);
  if (!card) {
    return NextResponse.json({ error: "card not found" }, { status: 404 });
  }

  if (card.status !== "APPROVED") {
    return NextResponse.json({ error: "card must be approved before settlement" }, { status: 409 });
  }

  let result;

  try {
    result = await settleValidatedCardWithProviders(card);
  } catch (error) {
    if (isProviderExecutionError(error)) {
      return NextResponse.json(
        {
          error: error.message,
          providerStatus: error.providerStatus,
          provider: error.provider,
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to settle card" }, { status: 502 });
  }

  await updateCardPersisted(result.card);

  return NextResponse.json(result);
}
