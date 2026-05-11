import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const srcRoot = join(projectRoot, "src");

function collectRuntimeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const absolute = join(dir, entry);
    const stat = statSync(absolute);

    if (stat.isDirectory()) return collectRuntimeFiles(absolute);
    if (!/\.(ts|tsx)$/.test(entry)) return [];
    if (/\.test\.tsx?$/.test(entry)) return [];
    if (entry.endsWith(".d.ts")) return [];
    return [absolute];
  });
}

describe("runtime no-fake guard", () => {
  it("does not ship fake transaction hashes or mock settlement networks in runtime source", () => {
    const forbiddenPatterns = [
      "arc-testnet-mock",
      "circle-usdc-testnet-mock",
      "0xarc${",
      "0xusdc${",
      "mock Arc adapter",
      "mock USDC adapter",
    ];

    const violations = collectRuntimeFiles(srcRoot).flatMap((file) => {
      const content = readFileSync(file, "utf8");
      return forbiddenPatterns
        .filter((pattern) => content.includes(pattern))
        .map((pattern) => `${relative(projectRoot, file)} contains ${pattern}`);
    });

    expect(violations).toEqual([]);
  });
});
