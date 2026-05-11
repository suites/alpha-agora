import { describe, expect, it } from "vitest";

import { getProviderEnv, shouldUseArc, shouldUseCircle, shouldUseGemini } from "./provider-env";

describe("provider env", () => {
  it("keeps demo defaults safe when provider keys are missing", () => {
    const env = getProviderEnv({});

    expect(env.mode).toBe("demo");
    expect(env.geminiModel).toBe("gemini-2.5-flash");
    expect(env.arcChainId).toBe(5042002);
    expect(shouldUseGemini(env)).toBe(false);
    expect(shouldUseArc(env)).toBe(false);
    expect(shouldUseCircle(env)).toBe(false);
  });

  it("enables configured provider paths without exposing secrets", () => {
    const env = getProviderEnv({
      ALPHA_AGORA_MODE: "production",
      LLM_PROVIDER: "google",
      GOOGLE_GENERATIVE_AI_API_KEY: "google-key",
      GEMINI_MODEL: "gemini-2.5-pro",
      ARC_RPC_URL: "https://rpc.testnet.arc.network",
      ARC_COMMITTER_PRIVATE_KEY: `0x${"1".repeat(64)}`,
      ARC_USDC_ADDRESS: `0x${"2".repeat(40)}`,
      REWARD_RECIPIENT_ADDRESS: `0x${"3".repeat(40)}`,
      CIRCLE_API_KEY: "circle-key",
      CIRCLE_ENTITY_SECRET: "entity-secret",
      CIRCLE_WALLET_ID: "wallet-id",
      CIRCLE_USDC_TOKEN_ID: "token-id",
      CIRCLE_RECIPIENT_ADDRESS: `0x${"4".repeat(40)}`,
    });

    expect(env.mode).toBe("production");
    expect(env.geminiModel).toBe("gemini-2.5-pro");
    expect(shouldUseGemini(env)).toBe(true);
    expect(shouldUseArc(env)).toBe(true);
    expect(shouldUseCircle(env)).toBe(true);
  });
});
