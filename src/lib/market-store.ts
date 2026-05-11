import { marketCards, type MarketCard } from "./market-card";

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

export function resetGeneratedCardsForTests(): void {
  generatedCards.splice(0, generatedCards.length);
}
