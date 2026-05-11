import { describe, expect, it } from "vitest";

import { marketCards } from "./market-card";
import { applyValidationAction, getValidatorMetrics, type ValidationActionInput } from "./validation-workflow";

const baseCard = marketCards.find((card) => card.status === "VALIDATING") ?? marketCards[0];

describe("validation workflow", () => {
  it("approves a market card and appends validator reward metadata", () => {
    const input: ValidationActionInput = {
      card: baseCard,
      validator: "HackathonValidator",
      verdict: "APPROVE",
      comment: "Question and resolution source are clear enough for demo approval.",
      editedQuestion: `${baseCard.question} `,
    };

    const approved = applyValidationAction(input);

    expect(approved.status).toBe("APPROVED");
    expect(approved.question).toBe(baseCard.question);
    expect(approved.validations.at(-1)).toMatchObject({
      validator: "HackathonValidator",
      verdict: "APPROVE",
      rewardUsdc: 0.05,
    });
    expect(approved.agentDecisions.at(-1)).toMatchObject({
      agent: "HumanValidator",
      decision: "APPROVE",
    });
  });

  it("rejects a card without assigning a validator reward", () => {
    const rejected = applyValidationAction({
      card: baseCard,
      validator: "RiskValidator",
      verdict: "REJECT",
      comment: "Resolution still depends too heavily on unofficial reporting.",
    });

    expect(rejected.status).toBe("REJECTED");
    expect(rejected.validations.at(-1)).toMatchObject({
      verdict: "REJECT",
      rewardUsdc: 0,
    });
  });

  it("keeps cards in validation when validator requests edits", () => {
    const edited = applyValidationAction({
      card: baseCard,
      validator: "RulesValidator",
      verdict: "NEEDS_EDIT",
      comment: "Narrow the resolution source to a single official publication.",
      editedQuestion: "Will the official agency publish the narrowed rule before December 31, 2026?",
    });

    expect(edited.status).toBe("VALIDATING");
    expect(edited.question).toBe("Will the official agency publish the narrowed rule before December 31, 2026?");
    expect(edited.validations.at(-1)?.rewardUsdc).toBe(0.01);
  });

  it("summarizes validator board metrics", () => {
    const approved = applyValidationAction({
      card: baseCard,
      validator: "HackathonValidator",
      verdict: "APPROVE",
      comment: "Clear enough.",
    });
    const rejected = applyValidationAction({
      card: marketCards[0],
      validator: "RiskValidator",
      verdict: "REJECT",
      comment: "Too ambiguous.",
    });

    expect(getValidatorMetrics([approved, rejected])).toEqual({
      approved: 1,
      rejected: 1,
      needsEdit: 0,
      pending: 0,
      rewardsQueuedUsdc: 0.05,
    });
  });
});
