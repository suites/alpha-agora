import type { GenerateCardInput, MarketCardGeneratorAdapter, PipelineStructuredOutput } from "./market-pipeline";
import { generateMarketCardFromStructuredOutput } from "./market-pipeline";
import type { MarketCard, MarketScores, Region, SourceLanguage } from "./market-card";
import { getProviderEnv, shouldUseGemini, type ProviderEnv } from "./provider-env";

interface AiModule {
  generateText: (options: {
    model: unknown;
    system: string;
    prompt: string;
    temperature?: number;
  }) => Promise<{ text: string }>;
}

interface GoogleModule {
  createGoogleGenerativeAI: (options: { apiKey: string }) => (modelId: string) => unknown;
}

export async function generateMarketCardWithGemini(
  input: GenerateCardInput,
  env: ProviderEnv = getProviderEnv(),
): Promise<MarketCard | undefined> {
  if (!shouldUseGemini(env) || !env.geminiApiKey) return undefined;

  const [{ generateText }, { createGoogleGenerativeAI }] = await Promise.all([
    importAiModule(),
    importGoogleModule(),
  ]);
  const google = createGoogleGenerativeAI({ apiKey: env.geminiApiKey });
  const { text } = await generateText({
    model: google(env.geminiModel),
    temperature: 0.2,
    system:
      "You turn local-language Asia market signals into deterministic binary prediction market drafts. Return only valid JSON.",
    prompt: buildPrompt(input),
  });
  const structured = parseGeminiOutput(text);

  return generateMarketCardFromStructuredOutput(input, structured, {
    generatorName: "GeminiMarketPipeline",
  });
}

export const geminiMarketCardGenerator: MarketCardGeneratorAdapter = {
  async generate(input) {
    const card = await generateMarketCardWithGemini(input);
    if (!card) {
      throw new Error("Gemini provider is not configured");
    }

    return card;
  },
};

async function importAiModule(): Promise<AiModule> {
  return import("ai") as Promise<AiModule>;
}

async function importGoogleModule(): Promise<GoogleModule> {
  return import("@ai-sdk/google") as Promise<GoogleModule>;
}

function buildPrompt(input: GenerateCardInput): string {
  return JSON.stringify({
    task: "Extract the marketable event and draft a binary prediction market card.",
    constraints: [
      "Use only regions KR, JP, or CN.",
      "Use only source languages ko, ja, or zh.",
      "Ground every extracted event, category, and question in the provided sourceText; do not invent unrelated policy topics.",
      "If categoryHint is empty, infer the category from sourceText only. Do not default to AI Policy unless the source is actually about AI policy, AI regulation, or AI guidance.",
      "For stock-market or company share-price articles, draft a market about the named securities and their next relevant trading-day outcome, not about government policy.",
      "Question must start with Will and end with a question mark.",
      "Resolution must include an ISO endDate, timezone, official sources, and edge cases.",
      "Scores must be integers from 0 to 100 and include ambiguityRisk where lower is better.",
      "Return exactly the JSON shape requested; no markdown.",
    ],
    outputShape: {
      extractedEvent: {
        title: "string",
        summaryEn: "string",
        category: "string",
        region: "KR|JP|CN",
        language: "ko|ja|zh",
      },
      marketQuestion: "string",
      resolution: {
        endDate: "YYYY-MM-DD",
        timezone: "IANA timezone",
        sources: ["official source"],
        edgeCases: ["edge case"],
      },
      scores: {
        resolutionClarity: "0-100 integer",
        tradingInterest: "0-100 integer",
        informationAsymmetry: "0-100 integer",
        novelty: "0-100 integer",
        sourceCredibility: "0-100 integer",
        ambiguityRisk: "0-100 integer",
        final: "0-100 integer",
      },
      critique: ["short validation note"],
    },
    sourceUrl: input.sourceUrl,
    categoryHint: input.categoryHint,
    sourceText: input.sourceText,
  });
}

function parseGeminiOutput(text: string): PipelineStructuredOutput {
  const parsed = JSON.parse(stripCodeFence(text)) as Partial<PipelineStructuredOutput>;
  const extractedEvent = parsed.extractedEvent;
  const resolution = parsed.resolution;
  const scores = parsed.scores;

  if (!extractedEvent || !resolution || !scores || typeof parsed.marketQuestion !== "string") {
    throw new Error("Gemini response did not include a complete market card");
  }

  return {
    extractedEvent: {
      title: stringOr(extractedEvent.title, "Local market signal"),
      summaryEn: stringOr(extractedEvent.summaryEn, "Local-language source signal."),
      category: stringOr(extractedEvent.category, "Local Policy"),
      region: regionOr(extractedEvent.region),
      language: languageOr(extractedEvent.language),
    },
    marketQuestion: normalizeQuestion(parsed.marketQuestion),
    resolution: {
      endDate: /^\d{4}-\d{2}-\d{2}$/.test(resolution.endDate) ? resolution.endDate : "2026-12-31",
      timezone: stringOr(resolution.timezone, "Asia/Seoul"),
      sources: nonEmptyStrings(resolution.sources, ["Relevant official source"]),
      edgeCases: nonEmptyStrings(resolution.edgeCases, ["Media reports alone do not count"]),
    },
    scores: normalizeScores(scores),
    critique: nonEmptyStrings(parsed.critique, ["Generated by Gemini; requires human validator review."]),
  };
}

function stripCodeFence(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
}

function normalizeQuestion(value: string): string {
  const trimmed = value.trim();
  return trimmed.endsWith("?") ? trimmed : `${trimmed}?`;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nonEmptyStrings(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim())
    : fallback;
}

function regionOr(value: unknown): Region {
  return value === "KR" || value === "JP" || value === "CN" ? value : "KR";
}

function languageOr(value: unknown): SourceLanguage {
  return value === "ko" || value === "ja" || value === "zh" ? value : "ko";
}

function normalizeScores(scores: Partial<MarketScores>): MarketScores {
  return {
    resolutionClarity: score(scores.resolutionClarity, 76),
    tradingInterest: score(scores.tradingInterest, 68),
    informationAsymmetry: score(scores.informationAsymmetry, 72),
    novelty: score(scores.novelty, 70),
    sourceCredibility: score(scores.sourceCredibility, 72),
    ambiguityRisk: score(scores.ambiguityRisk, 28),
    final: score(scores.final, 70),
  };
}

function score(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, Math.round(parsed))) : fallback;
}
