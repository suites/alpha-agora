import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCircleTransactionStatus, normalizeCircleTransactionState } from "./circle-provider";
import type { ProviderEnv } from "./provider-env";

const getTransaction = vi.fn();

vi.mock("@circle-fin/developer-controlled-wallets", () => ({
  initiateDeveloperControlledWalletsClient: vi.fn(() => ({
    getTransaction,
  })),
}));

const configuredCircleEnv: ProviderEnv = {
  mode: "demo",
  llmProvider: "demo",
  geminiApiKey: undefined,
  geminiModel: "gemini-2.5-flash",
  arcRpcUrl: undefined,
  arcChainId: 5042002,
  arcExplorerUrl: undefined,
  arcCommitterPrivateKey: undefined,
  rewardRecipientAddress: undefined,
  circleApiKey: "circle-api-key",
  circleEntitySecret: "a".repeat(64),
  circleWalletAddress: "0x53fe4a083b34e99a8f79382defb235f8a5f13c16",
  circleTokenAddress: "0x3600000000000000000000000000000000000000",
  circleRecipientAddress: "0x53fe4a083b34e99a8f79382defb235f8a5f13c16",
  circleBlockchain: "ARC-TESTNET",
  circleBaseUrl: "https://api.circle.com",
  circleEnv: "sandbox",
  maxRewardUsdc: 0.1,
  allowMainnetTransfers: false,
};

describe("Circle transaction status polling", () => {
  beforeEach(() => {
    getTransaction.mockReset();
  });

  it.each([
    ["CONFIRMED", "SUCCESS"],
    ["COMPLETE", "SUCCESS"],
    ["PENDING", "PENDING"],
    ["INITIATED", "PENDING"],
    ["FAILED", "FAILED"],
  ] as const)("maps Circle %s to provider status %s", (circleState, providerStatus) => {
    expect(normalizeCircleTransactionState(circleState)).toBe(providerStatus);
  });

  it("calls Circle getTransaction with the SDK input object and reads data.transaction", async () => {
    getTransaction.mockResolvedValueOnce({
      data: {
        transaction: {
          id: "circle-transaction-id",
          state: "COMPLETE",
          txHash: "0xabc123",
        },
      },
    });

    const status = await getCircleTransactionStatus("circle-transaction-id", configuredCircleEnv);

    expect(getTransaction).toHaveBeenCalledWith({ id: "circle-transaction-id" });
    expect(status).toEqual({
      id: "circle-transaction-id",
      status: "SUCCESS",
      txHash: "0xabc123",
      rawState: "COMPLETE",
    });
  });
});
