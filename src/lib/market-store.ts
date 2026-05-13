import { Prisma } from "../generated/prisma/client";
import { type MarketCard } from "./market-card";
import { prisma } from "./prisma";

export async function listGeneratedCardsPersisted(): Promise<MarketCard[]> {
  const rows = await prisma.persistedMarketCard.findMany({
    where: { kind: "generated" },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) => row.cardJson as unknown as MarketCard);
}

export async function listAllCardsPersisted(): Promise<MarketCard[]> {
  return listGeneratedCardsPersisted();
}

export async function upsertGeneratedCardPersisted(card: MarketCard): Promise<MarketCard[]> {
  await prisma.persistedMarketCard.upsert({
    where: { id: card.id },
    create: { id: card.id, kind: "generated", cardJson: toPrismaJson(card) },
    update: { kind: "generated", cardJson: toPrismaJson(card) },
  });
  return listGeneratedCardsPersisted();
}

export async function findCardPersisted(cardId: string): Promise<MarketCard | undefined> {
  const generated = await prisma.persistedMarketCard.findUnique({ where: { id: cardId } });
  if (generated?.kind !== "generated") return undefined;
  return generated.cardJson as unknown as MarketCard;
}

export async function updateCardPersisted(card: MarketCard): Promise<MarketCard> {
  await prisma.persistedMarketCard.upsert({
    where: { id: card.id },
    create: { id: card.id, kind: "generated", cardJson: toPrismaJson(card) },
    update: { kind: "generated", cardJson: toPrismaJson(card) },
  });
  return card;
}

export async function resetGeneratedCardsForTests(): Promise<void> {
  await prisma.persistedMarketCard.deleteMany({ where: { kind: "generated" } });
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
