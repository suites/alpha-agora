import { NextResponse } from "next/server";

import { fetchSourceExcerpt } from "../../../lib/source-fetcher";

export async function POST(request: Request) {
  let payload: { sourceUrl?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.sourceUrl || payload.sourceUrl.trim().length === 0) {
    return NextResponse.json({ error: "sourceUrl is required" }, { status: 400 });
  }

  try {
    return NextResponse.json(await fetchSourceExcerpt(payload.sourceUrl));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch source excerpt" },
      { status: 400 },
    );
  }
}
