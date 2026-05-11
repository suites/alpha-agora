import { Prisma } from "../generated/prisma/client";
import { marketCards, type MarketCard } from "./market-card";
import { prisma } from "./prisma";

const generatedCards: MarketCard[] = [];

export function listGeneratedCards(): MarketCard[] {
  return [...generatedCards];
}

export function listAllCards(): MarketCard[] {
  return [...generatedCards, ...marketCards];
}

export function upsertGeneratedCard(card: MarketCard): MarketCard[] {
  const existingIndex = generatedCards.findIndex((generatedCard) => generatedCard.id === card.id);
  if (existingIndex >= 0) {
    generatedCards[existingIndex] = card;
  } else {
    generatedCards.unshift(card);
  }

  return listGeneratedCards();
}

export function findCard(cardId: string): MarketCard | undefined {
  return listAllCards().find((card) => card.id === cardId);
}

export function updateCard(card: MarketCard): MarketCard {
  const generatedIndex = generatedCards.findIndex((generatedCard) => generatedCard.id === card.id);
  if (generatedIndex >= 0) {
    generatedCards[generatedIndex] = card;
    return card;
  }

  const seedIndex = marketCards.findIndex((seedCard) => seedCard.id === card.id);
  if (seedIndex >= 0) {
    marketCards[seedIndex] = card;
    return card;
  }

  generatedCards.unshift(card);
  return card;
}

export async function listGeneratedCardsPersisted(): Promise<MarketCard[]> {
  const rows = await prisma.persistedMarketCard.findMany({
    where: { kind: "generated" },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) => row.cardJson as unknown as MarketCard);
}

export async function listAllCardsPersisted(): Promise<MarketCard[]> {
  return [...(await listGeneratedCardsPersisted()), ...marketCards];
}

export async function upsertGeneratedCardPersisted(card: MarketCard): Promise<MarketCard[]> {
  upsertGeneratedCard(card);
  await prisma.persistedMarketCard.upsert({
    where: { id: card.id },
    create: { id: card.id, kind: "generated", cardJson: toPrismaJson(card) },
    update: { kind: "generated", cardJson: toPrismaJson(card) },
  });
  return listGeneratedCardsPersisted();
}

export async function findCardPersisted(cardId: string): Promise<MarketCard | undefined> {
  const generated = await prisma.persistedMarketCard.findUnique({ where: { id: cardId } });
  if (generated) return generated.cardJson as unknown as MarketCard;
  return marketCards.find((card) => card.id === cardId);
}

export async function updateCardPersisted(card: MarketCard): Promise<MarketCard> {
  updateCard(card);
  if (card.id.startsWith("generated-")) {
    await prisma.persistedMarketCard.upsert({
      where: { id: card.id },
      create: { id: card.id, kind: "generated", cardJson: toPrismaJson(card) },
      update: { cardJson: toPrismaJson(card) },
    });
  }
  return card;
}

export async function resetGeneratedCardsForTests(): Promise<void> {
  generatedCards.splice(0, generatedCards.length);
  await prisma.persistedMarketCard.deleteMany({ where: { kind: "generated" } });
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
