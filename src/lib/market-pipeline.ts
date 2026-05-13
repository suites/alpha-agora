import {
  computeFinalScore,
  type AgentDecision,
  type MarketCard,
  type MarketScores,
  type Region,
  type ResolutionRules,
  type SourceLanguage,
} from "./market-card";

export interface GenerateCardInput {
  sourceText: string;
  sourceUrl?: string;
  categoryHint?: string;
}

export interface RegionLanguageInference {
  region: Region;
  language: SourceLanguage;
  timezone: string;
}

export interface PipelineStructuredOutput {
  extractedEvent: {
    title: string;
    summaryEn: string;
    category: string;
    region: Region;
    language: SourceLanguage;
  };
  marketQuestion: string;
  resolution: ResolutionRules;
  scores: MarketScores;
  critique: string[];
}

export interface MarketCardGeneratorAdapter {
  generate(input: GenerateCardInput): MarketCard | Promise<MarketCard>;
}

const DEFAULT_END_DATE = "2026-12-31";
const DEFAULT_CREATED_AT = "2026-05-11T04:00:00.000Z";

const officialSourcesByRegion: Record<Region, string[]> = {
  KR: ["Relevant Korean ministry official announcements", "Official Gazette or National Assembly records"],
  JP: ["Relevant Japanese agency official announcements", "Cabinet or regulator publication records"],
  CN: ["Relevant Chinese ministry official announcements", "State Council or regulator publication records"],
};

export function inferRegionAndLanguage(sourceText: string): RegionLanguageInference {
  if (/[가-힣]/.test(sourceText)) {
    return { region: "KR", language: "ko", timezone: "Asia/Seoul" };
  }

  if (/[ぁ-んァ-ン]/.test(sourceText)) {
    return { region: "JP", language: "ja", timezone: "Asia/Tokyo" };
  }

  return { region: "CN", language: "zh", timezone: "Asia/Shanghai" };
}

export function generateMarketCardFromSource(input: GenerateCardInput): MarketCard {
  const normalizedText = normalizeSourceText(input.sourceText);
  const inference = inferRegionAndLanguage(normalizedText);
  const category = input.categoryHint?.trim() || inferCategory(normalizedText);
  const scores = scoreGeneratedCard(normalizedText, category);
  const structured: PipelineStructuredOutput = {
    extractedEvent: {
      title: buildSourceTitle(normalizedText, inference.region),
      summaryEn: summarizeToEnglish(normalizedText, category, inference.region),
      category,
      region: inference.region,
      language: inference.language,
    },
    marketQuestion: `Will ${buildQuestionSubject(normalizedText, category, inference.region)} before December 31, 2026?`,
    resolution: {
      endDate: DEFAULT_END_DATE,
      timezone: inference.timezone,
      sources: officialSourcesByRegion[inference.region],
      edgeCases: [
        "Media reports, rumors, or unnamed-source leaks alone do not count",
        "The outcome must be confirmed by an official source before the deadline",
        "If the official source is published after the deadline, the market resolves No",
      ],
    },
    scores,
    critique: [
      "Generated draft requires human validator review before reward settlement.",
      "Resolution wording intentionally depends on official sources, not press speculation.",
    ],
  };

  return generateMarketCardFromStructuredOutput(input, structured);
}

export function generateMarketCardFromStructuredOutput(
  input: GenerateCardInput,
  structured: PipelineStructuredOutput,
  options: { generatorName?: string } = {},
): MarketCard {
  const normalizedText = normalizeSourceText(input.sourceText);
  const category = structured.extractedEvent.category.trim() || input.categoryHint?.trim() || inferCategory(normalizedText);
  const id = `generated-${stableHash(`${input.sourceUrl ?? "manual"}:${normalizedText}`).slice(0, 12)}`;
  const resolution: ResolutionRules = structured.resolution;
  const decisions = buildAgentDecisions(structured.scores, options.generatorName);

  return {
    id,
    source: {
      id: `src-${id}`,
      title: structured.extractedEvent.title,
      url: input.sourceUrl?.trim() || "manual://operator-input",
      language: structured.extractedEvent.language,
      region: structured.extractedEvent.region,
      rawExcerpt: normalizedText,
      summaryEn: structured.extractedEvent.summaryEn,
      publishedAt: DEFAULT_CREATED_AT.slice(0, 10),
      sourceName: input.sourceUrl ? hostnameFromUrl(input.sourceUrl) : "Operator submitted source",
    },
    category,
    question: structured.marketQuestion,
    outcomes: ["Yes", "No"],
    resolution,
    scores: structured.scores,
    criticNotes: structured.critique,
    agentDecisions: decisions,
    validations: [],
    trace: {
      traceHash: `pending-trace-${stableHash(JSON.stringify({ id, normalizedText, scores: structured.scores })).slice(0, 16)}`,
    },
    status: "DRAFT",
    createdAt: DEFAULT_CREATED_AT,
  };
}

export const deterministicMarketCardGenerator: MarketCardGeneratorAdapter = {
  generate: generateMarketCardFromSource,
};

function normalizeSourceText(sourceText: string): string {
  return sourceText.trim().replace(/\s+/g, " ");
}

function inferCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/반도체|半導体|芯片|chip|hbm|sk하이닉스|삼성전자|semiconductor/.test(lower)) return "Semiconductors";
  if (/crypto|token|가상자산|暗号資産|加密/.test(lower)) return "Crypto Policy";
  if (/인공지능|人工知能|人工智能|ai\s*(policy|guidance|regulation|법|기본법|규제|가이드라인)/.test(lower)) return "AI Policy";
  if (/日銀|boj|한국은행|央行|pboc|금리|国債|汇率/.test(lower)) return "Macro";
  if (/게임|ゲーム|游戏/.test(lower)) return "Gaming / Internet";
  if (/전기차|ev|자동차|新能源|電気自動車/.test(lower)) return "EV Policy";
  return "Local Policy";
}

function buildSourceTitle(text: string, region: Region): string {
  const prefix: Record<Region, string> = {
    KR: "Korean local signal",
    JP: "Japanese local signal",
    CN: "Chinese local signal",
  };
  return `${prefix[region]}: ${text.slice(0, 48)}${text.length > 48 ? "…" : ""}`;
}

function buildQuestionSubject(text: string, category: string, region: Region): string {
  const country = region === "KR" ? "South Korea" : region === "JP" ? "Japan" : "China";
  if (/sk하이닉스|삼성전자/i.test(text)) {
    return "SK Hynix and Samsung Electronics close higher on the next Korea Exchange trading day than their reported source-article prices";
  }
  if (/반도체|semiconductor/i.test(`${category} ${text}`)) {
    return `${country} officially confirm the reported semiconductor market event`;
  }
  if (/AI|인공지능|人工知能|人工智能/.test(`${category} ${text}`)) {
    return `${country} publish official AI policy guidance`;
  }
  if (/게임|ゲーム|游戏|Gaming/.test(`${category} ${text}`)) {
    return `${country} expand official online game approvals`;
  }
  if (/日銀|boj|국채|国債/.test(text.toLowerCase())) {
    return "the Bank of Japan change its official bond purchase schedule";
  }
  if (/금리|rate|央行|pboc/.test(text.toLowerCase())) {
    return `${country}'s central bank announce a major policy change`;
  }
  if (/crypto|가상자산|暗号資産|加密/.test(`${category} ${text}`.toLowerCase())) {
    return `${country} publish official crypto policy guidance`;
  }
  return `${country} officially confirm the reported ${category.toLowerCase()} event`;
}

function scoreGeneratedCard(text: string, category: string): MarketScores {
  const officialSignal = /정부|ministry|official|日銀|央行|国务院|국회|regulator|agency|공개|发布|発表/i.test(text);
  const numericSignal = /\d|말|before|까지|以上|至少/.test(text);
  const marketCategory = /Macro|Crypto|Semiconductors|EV|Gaming|AI/.test(category);

  const input = {
    resolutionClarity: 76 + (officialSignal ? 10 : 0) + (numericSignal ? 4 : 0),
    tradingInterest: 61 + (marketCategory ? 14 : 0),
    informationAsymmetry: 70 + (text.length > 35 ? 7 : 0),
    novelty: 69 + (category.includes("AI") || category.includes("Gaming") ? 8 : 0),
    sourceCredibility: 67 + (officialSignal ? 9 : 0),
    ambiguityRisk: 29 - (numericSignal ? 5 : 0),
  };

  return { ...input, final: computeFinalScore(input) };
}

function buildAgentDecisions(scores: MarketScores, extractorName = "EventExtractor"): AgentDecision[] {
  return [
    {
      agent: extractorName,
      decision: "EXTRACTED",
      rationale: "Detected a local-language event with region, category, and official-resolution path.",
      confidence: 0.82,
    },
    {
      agent: "QuestionGenerator",
      decision: "DRAFTED",
      rationale: "Converted the event into a binary Yes/No market question with a fixed deadline.",
      confidence: 0.78,
    },
    {
      agent: "ResolutionRulesAgent",
      decision: "DRAFTED",
      rationale: "Attached official source requirements and edge cases to reduce settlement ambiguity.",
      confidence: 0.76,
    },
    {
      agent: "CriticAgent",
      decision: scores.final >= 70 ? "READY_FOR_VALIDATION" : "NEEDS_REVIEW",
      rationale: `Final score ${scores.final}; human validator should confirm wording before approval.`,
      confidence: 0.73,
    },
  ];
}

function summarizeToEnglish(text: string, category: string, region: Region): string {
  const country = region === "KR" ? "South Korea" : region === "JP" ? "Japan" : "China";
  return `${country} source signal about ${category}: ${text.slice(0, 120)}${text.length > 120 ? "…" : ""}`;
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "Submitted source URL";
  }
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
