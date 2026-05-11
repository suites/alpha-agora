-- Persist generated market cards so demo state survives Next.js/server restarts.
CREATE TABLE IF NOT EXISTS "market_cards" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'generated',
    "cardJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_cards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "market_cards_kind_idx" ON "market_cards"("kind");
CREATE INDEX IF NOT EXISTS "market_cards_updatedAt_idx" ON "market_cards"("updatedAt");
