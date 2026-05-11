import { NextResponse } from "next/server";

import { getCircleTransactionStatus } from "../../../../lib/circle-provider";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const transactionId = url.searchParams.get("transactionId");
  if (!transactionId) {
    return NextResponse.json({ error: "transactionId is required" }, { status: 400 });
  }

  try {
    const status = await getCircleTransactionStatus(transactionId);
    if (!status) {
      return NextResponse.json({ transactionId, status: "UNCONFIGURED" });
    }

    return NextResponse.json({ transactionId, ...status });
  } catch (error) {
    return NextResponse.json(
      {
        transactionId,
        status: "PROVIDER_UNAVAILABLE",
        reason: error instanceof Error ? error.message : "Circle status lookup failed",
      },
      { status: 502 },
    );
  }
}
