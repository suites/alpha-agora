import { describe, expect, it } from "vitest";

import { buildArcExplorerUrl } from "./arc-explorer";

describe("Arc explorer links", () => {
  it("builds a transaction URL from configured explorer base URL", () => {
    expect(buildArcExplorerUrl("https://explorer.testnet.arc.network", "0xabc")).toBe(
      "https://explorer.testnet.arc.network/tx/0xabc",
    );
  });

  it("returns undefined when no transaction hash is available", () => {
    expect(buildArcExplorerUrl("https://explorer.testnet.arc.network", undefined)).toBeUndefined();
  });
});
