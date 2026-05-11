import { describe, expect, it } from "vitest";

import { marketCards } from "./market-card";
import {
  findCardPersisted,
  listAllCardsPersisted,
  listGeneratedCardsPersisted,
  resetGeneratedCardsForTests,
  updateCardPersisted,
  upsertGeneratedCardPersisted,
} from "./market-store";

const testCard = {
  ...marketCards[0],
  id: "generated-persisted-test",
  question: "Will the persisted Market Card survive a fresh store read?",
  status: "DRAFT" as const,
  validations: [],
};

describe("persistent market store", () => {
  it("round-trips generated Market Cards through PostgreSQL-backed storage", async () => {
    await resetGeneratedCardsForTests();

    const generated = await upsertGeneratedCardPersisted(testCard);
    expect(generated[0].id).toBe(testCard.id);

    const listed = await listGeneratedCardsPersisted();
    expect(listed.map((card) => card.id)).toContain(testCard.id);

    const found = await findCardPersisted(testCard.id);
    expect(found?.question).toBe(testCard.question);
  });

  it("persists card updates such as validation and settlement state", async () => {
    await resetGeneratedCardsForTests();
    await upsertGeneratedCardPersisted(testCard);

    await updateCardPersisted({
      ...testCard,
      status: "APPROVED",
      validations: [
        {
          validator: "PersistedValidator",
          verdict: "APPROVE",
          comment: "Persisted approval",
          rewardUsdc: 0.05,
          rewardTxHash: "circle-tx-id",
        },
      ],
      trace: { ...testCard.trace, arcTxHash: "0xabc", arcNetwork: "arc-testnet" },
    });

    const found = await findCardPersisted(testCard.id);
    expect(found?.status).toBe("APPROVED");
    expect(found?.validations[0]?.rewardTxHash).toBe("circle-tx-id");
    expect(found?.trace.arcNetwork).toBe("arc-testnet");
  });

  it("keeps seed cards available alongside persisted generated cards", async () => {
    await resetGeneratedCardsForTests();
    const allCards = await listAllCardsPersisted();
    expect(allCards.some((card) => card.id === marketCards[0].id)).toBe(true);
  });
});
