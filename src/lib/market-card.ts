export type Region = "KR" | "JP" | "CN";
export type SourceLanguage = "ko" | "ja" | "zh";
export type MarketCardStatus = "DRAFT" | "VALIDATING" | "APPROVED" | "REJECTED";
export type ValidationVerdict = "APPROVE" | "REJECT" | "NEEDS_EDIT";

export interface EventSource {
  id: string;
  title: string;
  url: string;
  language: SourceLanguage;
  region: Region;
  rawExcerpt: string;
  summaryEn: string;
  publishedAt: string;
  sourceName: string;
}

export interface ScoreInputs {
  resolutionClarity: number;
  tradingInterest: number;
  informationAsymmetry: number;
  novelty: number;
  sourceCredibility: number;
  ambiguityRisk: number;
}

export interface MarketScores extends ScoreInputs {
  final: number;
}

export interface ResolutionRules {
  endDate: string;
  timezone: string;
  sources: string[];
  edgeCases: string[];
}

export interface AgentDecision {
  agent: string;
  decision: string;
  rationale: string;
  confidence: number;
}

export interface Validation {
  validator: string;
  verdict: ValidationVerdict;
  comment: string;
  rewardUsdc: number;
  rewardTxHash?: string;
}

export interface TraceCommit {
  traceHash: string;
  arcTxHash?: string;
  arcNetwork?: string;
  committedAt?: string;
}

export interface MarketCard {
  id: string;
  source: EventSource;
  category: string;
  question: string;
  outcomes: ["Yes", "No"];
  resolution: ResolutionRules;
  scores: MarketScores;
  criticNotes: string[];
  agentDecisions: AgentDecision[];
  validations: Validation[];
  trace: TraceCommit;
  status: MarketCardStatus;
  createdAt: string;
}

export interface DashboardMetrics {
  generated: number;
  validated: number;
  rejected: number;
  rewardsPaidUsdc: number;
  arcTracesCommitted: number;
  averageFinalScore: number;
}

export function computeFinalScore(input: ScoreInputs): number {
  const raw =
    0.3 * input.resolutionClarity +
    0.25 * input.tradingInterest +
    0.2 * input.informationAsymmetry +
    0.15 * input.novelty +
    0.1 * input.sourceCredibility -
    0.2 * input.ambiguityRisk;

  return Math.min(100, Math.max(0, Math.round(raw)));
}

function scores(input: ScoreInputs): MarketScores {
  return { ...input, final: computeFinalScore(input) };
}

function trace(id: string, committed = true): TraceCommit {
  return {
    traceHash: `sample-trace-${id}`,
    arcTxHash: committed ? `sample-arc-proof-${id}` : undefined,
    committedAt: committed ? "2026-05-11T04:00:00.000Z" : undefined,
  };
}

function approval(validator: string, rewardUsdc = 0.05): Validation {
  return {
    validator,
    verdict: "APPROVE",
    comment: "Resolution source and edge cases are clear enough for a market proposal.",
    rewardUsdc,
    rewardTxHash: `sample-usdc-reward-${validator.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
  };
}

function card(input: Omit<MarketCard, "outcomes" | "createdAt">): MarketCard {
  return {
    ...input,
    outcomes: ["Yes", "No"],
    createdAt: "2026-05-11T04:00:00.000Z",
  };
}

export const marketCards: MarketCard[] = [
  card({
    id: "kr-crypto-tax-delay",
    category: "Policy / Crypto",
    source: {
      id: "src-kr-crypto-tax",
      title: "South Korea reviews another virtual asset tax delay",
      url: "https://example.com/kr/crypto-tax-delay",
      language: "ko",
      region: "KR",
      sourceName: "Korean policy press",
      publishedAt: "2026-05-09",
      rawExcerpt: "정부가 2026년 가상자산 과세 유예 방안을 다시 검토하고 있다는 보도가 나왔다.",
      summaryEn: "South Korea may reconsider delaying virtual asset taxation.",
    },
    question: "Will South Korea officially delay crypto taxation before December 31, 2026?",
    resolution: {
      endDate: "2026-12-31",
      timezone: "Asia/Seoul",
      sources: ["Ministry of Economy and Finance", "National Assembly bill status", "Official Gazette"],
      edgeCases: ["Media reports alone do not count", "Draft bills alone do not count", "Official enactment or announcement is required"],
    },
    scores: scores({ resolutionClarity: 91, tradingInterest: 68, informationAsymmetry: 77, novelty: 72, sourceCredibility: 78, ambiguityRisk: 21 }),
    criticNotes: ["The word reviewing is insufficient; require official enactment or announcement."],
    agentDecisions: [
      { agent: "MarketabilityAgent", decision: "ACCEPT", rationale: "Clear policy event with crypto market impact.", confidence: 0.86 },
    ],
    validations: [approval("SeoulPolicyValidator")],
    trace: trace("001"),
    status: "APPROVED",
  }),
  card({
    id: "kr-bok-rate-cut",
    category: "Macro",
    source: { id: "src-kr-bok", title: "BOK board signals room for a cut", url: "https://example.com/kr/bok-cut", language: "ko", region: "KR", sourceName: "Korean financial news", publishedAt: "2026-05-08", rawExcerpt: "한국은행 금통위원 일부가 경기 둔화에 대응한 금리 인하 가능성을 시사했다.", summaryEn: "Some BOK monetary board members signaled possible rate cuts." },
    question: "Will the Bank of Korea cut its base rate before July 31, 2026?",
    resolution: { endDate: "2026-07-31", timezone: "Asia/Seoul", sources: ["Bank of Korea monetary policy decision"], edgeCases: ["Forward guidance does not count", "Only an announced base-rate reduction counts"] },
    scores: scores({ resolutionClarity: 95, tradingInterest: 82, informationAsymmetry: 62, novelty: 59, sourceCredibility: 88, ambiguityRisk: 12 }),
    criticNotes: ["Strong official resolution source; lower novelty because rate-cut markets are common."],
    agentDecisions: [{ agent: "ResolutionRulesAgent", decision: "ACCEPT", rationale: "BOK decisions are timestamped and official.", confidence: 0.92 }],
    validations: [approval("MacroValidatorKR")],
    trace: trace("002"),
    status: "APPROVED",
  }),
  card({
    id: "kr-samsung-hbm4",
    category: "Semiconductors",
    source: { id: "src-kr-hbm4", title: "Samsung HBM4 mass production schedule report", url: "https://example.com/kr/samsung-hbm4", language: "ko", region: "KR", sourceName: "Korean semiconductor outlet", publishedAt: "2026-05-07", rawExcerpt: "삼성전자가 HBM4 양산 시점을 앞당기는 방안을 검토 중이라는 업계 관측이 나왔다.", summaryEn: "Samsung may accelerate HBM4 mass production timing." },
    question: "Will Samsung Electronics announce HBM4 mass production before October 1, 2026?",
    resolution: { endDate: "2026-10-01", timezone: "Asia/Seoul", sources: ["Samsung Electronics official newsroom", "Earnings call transcript"], edgeCases: ["Supplier rumors do not count", "Pilot production does not count unless called mass production"] },
    scores: scores({ resolutionClarity: 84, tradingInterest: 87, informationAsymmetry: 73, novelty: 67, sourceCredibility: 70, ambiguityRisk: 25 }),
    criticNotes: ["Define mass production tightly to avoid pilot-run ambiguity."],
    agentDecisions: [{ agent: "QuestionGenerator", decision: "ACCEPT", rationale: "Semiconductor timing has global trading interest.", confidence: 0.8 }],
    validations: [],
    trace: trace("003", false),
    status: "VALIDATING",
  }),
  card({
    id: "kr-upbit-token-listing-rule",
    category: "Crypto Exchange",
    source: { id: "src-kr-upbit-rule", title: "Korean exchanges discuss stricter listing rules", url: "https://example.com/kr/exchange-listing", language: "ko", region: "KR", sourceName: "Digital asset industry press", publishedAt: "2026-05-06", rawExcerpt: "국내 주요 거래소들이 신규 상장 심사 기준 강화를 논의 중인 것으로 알려졌다.", summaryEn: "Major Korean exchanges may strengthen token listing standards." },
    question: "Will Upbit publish stricter token listing standards before September 30, 2026?",
    resolution: { endDate: "2026-09-30", timezone: "Asia/Seoul", sources: ["Upbit official notices", "DAXA official announcements"], edgeCases: ["Private discussions do not count", "General risk reminders do not count"] },
    scores: scores({ resolutionClarity: 80, tradingInterest: 75, informationAsymmetry: 76, novelty: 71, sourceCredibility: 67, ambiguityRisk: 28 }),
    criticNotes: ["Question names Upbit to avoid vague industry-wide resolution."],
    agentDecisions: [{ agent: "CriticAgent", decision: "NEEDS_VALIDATION", rationale: "Exchange-specific source required.", confidence: 0.72 }],
    validations: [],
    trace: trace("004", false),
    status: "VALIDATING",
  }),
  card({
    id: "kr-short-selling-ban",
    category: "Equities / Regulation",
    source: { id: "src-kr-shorts", title: "Regulator reviews short-selling restrictions", url: "https://example.com/kr/short-selling", language: "ko", region: "KR", sourceName: "Korean markets outlet", publishedAt: "2026-05-05", rawExcerpt: "금융당국이 공매도 제도 개선안 발표 시점을 조율하고 있다.", summaryEn: "Korean regulators are coordinating short-selling reform timing." },
    question: "Will South Korea announce new short-selling restrictions before August 31, 2026?",
    resolution: { endDate: "2026-08-31", timezone: "Asia/Seoul", sources: ["Financial Services Commission", "Financial Supervisory Service"], edgeCases: ["Consultation papers do not count unless restrictions are formally announced"] },
    scores: scores({ resolutionClarity: 82, tradingInterest: 78, informationAsymmetry: 68, novelty: 63, sourceCredibility: 82, ambiguityRisk: 24 }),
    criticNotes: ["Need to distinguish restrictions from routine enforcement guidance."],
    agentDecisions: [{ agent: "MarketabilityAgent", decision: "ACCEPT", rationale: "Local regulatory changes can move Korean equities.", confidence: 0.79 }],
    validations: [approval("KoreaEquityValidator", 0.03)],
    trace: trace("005"),
    status: "APPROVED",
  }),
  card({
    id: "kr-ai-basic-act-guidance",
    category: "AI Policy",
    source: { id: "src-kr-ai-act", title: "Korea prepares AI Basic Act enforcement guidance", url: "https://example.com/kr/ai-basic-act", language: "ko", region: "KR", sourceName: "Government technology briefing", publishedAt: "2026-05-04", rawExcerpt: "정부가 AI 기본법 시행령과 고영향 AI 기준을 상반기 중 공개할 전망이다.", summaryEn: "Korea may publish AI Basic Act enforcement guidance in H1." },
    question: "Will South Korea publish high-impact AI enforcement guidance before June 30, 2026?",
    resolution: { endDate: "2026-06-30", timezone: "Asia/Seoul", sources: ["Ministry of Science and ICT", "Official legislative notice portal"], edgeCases: ["Unofficial drafts do not count", "Guidance must address high-impact AI criteria"] },
    scores: scores({ resolutionClarity: 88, tradingInterest: 61, informationAsymmetry: 74, novelty: 80, sourceCredibility: 84, ambiguityRisk: 18 }),
    criticNotes: ["Good non-English policy alpha; trading interest may be niche but innovation is high."],
    agentDecisions: [{ agent: "EventExtractor", decision: "ACCEPT", rationale: "Specific date window and official source available.", confidence: 0.84 }],
    validations: [],
    trace: trace("006", false),
    status: "DRAFT",
  }),
  card({
    id: "jp-boj-ycc-language",
    category: "Macro",
    source: { id: "src-jp-boj-ycc", title: "BOJ officials debate bond purchase language", url: "https://example.com/jp/boj-ycc", language: "ja", region: "JP", sourceName: "Japanese macro press", publishedAt: "2026-05-09", rawExcerpt: "日銀内で国債買い入れ方針の表現見直しを求める声が出ている。", summaryEn: "BOJ officials are debating changes to bond purchase language." },
    question: "Will the Bank of Japan reduce scheduled JGB purchases before September 30, 2026?",
    resolution: { endDate: "2026-09-30", timezone: "Asia/Tokyo", sources: ["Bank of Japan official operation schedule"], edgeCases: ["Speech language alone does not count", "Temporary market operations do not count unless schedule is reduced"] },
    scores: scores({ resolutionClarity: 86, tradingInterest: 89, informationAsymmetry: 65, novelty: 62, sourceCredibility: 86, ambiguityRisk: 22 }),
    criticNotes: ["Use operation schedule rather than vague communication changes."],
    agentDecisions: [{ agent: "ResolutionRulesAgent", decision: "REWRITE", rationale: "Converted vague language debate into observable JGB purchase schedule event.", confidence: 0.81 }],
    validations: [approval("TokyoMacroValidator")],
    trace: trace("007"),
    status: "APPROVED",
  }),
  card({
    id: "jp-yen-intervention",
    category: "FX Policy",
    source: { id: "src-jp-yen", title: "Japan warns against rapid yen moves", url: "https://example.com/jp/yen-intervention", language: "ja", region: "JP", sourceName: "Japanese finance ministry beat", publishedAt: "2026-05-08", rawExcerpt: "財務省幹部が急速な円安への対応について強い警戒感を示した。", summaryEn: "A finance ministry official warned against rapid yen weakness." },
    question: "Will Japan conduct confirmed yen-buying intervention before August 31, 2026?",
    resolution: { endDate: "2026-08-31", timezone: "Asia/Tokyo", sources: ["Ministry of Finance intervention data", "Official MOF confirmation"], edgeCases: ["Verbal intervention does not count", "Rumored BOJ rate checks do not count"] },
    scores: scores({ resolutionClarity: 90, tradingInterest: 92, informationAsymmetry: 60, novelty: 58, sourceCredibility: 85, ambiguityRisk: 20 }),
    criticNotes: ["High trading interest, but similar global markets may exist."],
    agentDecisions: [{ agent: "MarketabilityAgent", decision: "ACCEPT", rationale: "FX intervention is binary after MOF confirmation.", confidence: 0.88 }],
    validations: [approval("FXValidatorJP")],
    trace: trace("008"),
    status: "APPROVED",
  }),
  card({
    id: "jp-liberal-democratic-leadership",
    category: "Politics",
    source: { id: "src-jp-ldp", title: "LDP faction discussions over leadership timing", url: "https://example.com/jp/ldp-leadership", language: "ja", region: "JP", sourceName: "Japanese political desk", publishedAt: "2026-05-07", rawExcerpt: "自民党内で総裁選前倒しを求める意見が一部から出ている。", summaryEn: "Some LDP members are calling for an earlier leadership election." },
    question: "Will Japan's LDP hold a leadership election before December 31, 2026?",
    resolution: { endDate: "2026-12-31", timezone: "Asia/Tokyo", sources: ["LDP official announcements", "Japanese election administration notices"], edgeCases: ["Informal faction requests do not count", "A scheduled election after the deadline does not count"] },
    scores: scores({ resolutionClarity: 79, tradingInterest: 70, informationAsymmetry: 69, novelty: 68, sourceCredibility: 72, ambiguityRisk: 27 }),
    criticNotes: ["Political timing is marketable but needs careful official-source wording."],
    agentDecisions: [{ agent: "QuestionGenerator", decision: "ACCEPT", rationale: "Clear institutional event can affect yen and equities.", confidence: 0.74 }],
    validations: [],
    trace: trace("009", false),
    status: "VALIDATING",
  }),
  card({
    id: "jp-nuclear-restart",
    category: "Energy",
    source: { id: "src-jp-nuclear", title: "Local assembly schedules vote on reactor restart", url: "https://example.com/jp/nuclear-restart", language: "ja", region: "JP", sourceName: "Regional Japanese newspaper", publishedAt: "2026-05-06", rawExcerpt: "地元議会が原発再稼働同意に関する採決日程を調整している。", summaryEn: "A local assembly is scheduling a vote on nuclear reactor restart consent." },
    question: "Will the Kashiwazaki-Kariwa nuclear plant receive local restart consent before November 30, 2026?",
    resolution: { endDate: "2026-11-30", timezone: "Asia/Tokyo", sources: ["Niigata prefecture announcements", "TEPCO official releases"], edgeCases: ["Committee discussion alone does not count", "Consent must come from the relevant local authority"] },
    scores: scores({ resolutionClarity: 76, tradingInterest: 73, informationAsymmetry: 78, novelty: 75, sourceCredibility: 69, ambiguityRisk: 34 }),
    criticNotes: ["Local consent definition must be validated by a Japan energy expert."],
    agentDecisions: [{ agent: "CriticAgent", decision: "NEEDS_VALIDATION", rationale: "Local authority chain can be ambiguous.", confidence: 0.7 }],
    validations: [],
    trace: trace("010", false),
    status: "VALIDATING",
  }),
  card({
    id: "jp-crypto-etf-review",
    category: "Crypto Regulation",
    source: { id: "src-jp-crypto-etf", title: "Japan FSA studies crypto ETF framework", url: "https://example.com/jp/crypto-etf", language: "ja", region: "JP", sourceName: "Japanese crypto policy outlet", publishedAt: "2026-05-05", rawExcerpt: "金融庁が暗号資産ETFに関する制度整理を進めている。", summaryEn: "Japan's FSA is studying a crypto ETF framework." },
    question: "Will Japan's FSA publish crypto ETF framework guidance before December 31, 2026?",
    resolution: { endDate: "2026-12-31", timezone: "Asia/Tokyo", sources: ["Financial Services Agency publications"], edgeCases: ["Industry proposals do not count", "Guidance must directly address crypto ETF treatment"] },
    scores: scores({ resolutionClarity: 82, tradingInterest: 84, informationAsymmetry: 74, novelty: 79, sourceCredibility: 76, ambiguityRisk: 26 }),
    criticNotes: ["Good local policy alpha for global crypto markets."],
    agentDecisions: [{ agent: "MarketabilityAgent", decision: "ACCEPT", rationale: "Non-English regulatory signal with crypto relevance.", confidence: 0.83 }],
    validations: [approval("JapanCryptoValidator", 0.04)],
    trace: trace("011"),
    status: "APPROVED",
  }),
  card({
    id: "jp-rapidus-subsidy",
    category: "Semiconductors",
    source: { id: "src-jp-rapidus", title: "Rapidus subsidy package enters final coordination", url: "https://example.com/jp/rapidus", language: "ja", region: "JP", sourceName: "Japanese industry press", publishedAt: "2026-05-04", rawExcerpt: "ラピダス支援策について政府内で追加補助金の最終調整が進む。", summaryEn: "Japan is coordinating an additional subsidy package for Rapidus." },
    question: "Will Japan approve an additional Rapidus subsidy package before September 30, 2026?",
    resolution: { endDate: "2026-09-30", timezone: "Asia/Tokyo", sources: ["METI official releases", "Cabinet budget documents"], edgeCases: ["Press leaks do not count", "Existing subsidy disbursement does not count unless additional funds are approved"] },
    scores: scores({ resolutionClarity: 83, tradingInterest: 69, informationAsymmetry: 72, novelty: 74, sourceCredibility: 77, ambiguityRisk: 23 }),
    criticNotes: ["Need distinguish new approval from existing program spend."],
    agentDecisions: [{ agent: "EventExtractor", decision: "ACCEPT", rationale: "Specific entity and official budget trail.", confidence: 0.78 }],
    validations: [],
    trace: trace("012", false),
    status: "DRAFT",
  }),
  card({
    id: "jp-stablecoin-bank-consortium",
    category: "Stablecoins",
    source: { id: "src-jp-stablecoin", title: "Japanese banks advance stablecoin pilot", url: "https://example.com/jp/stablecoin-bank", language: "ja", region: "JP", sourceName: "Japanese fintech media", publishedAt: "2026-05-03", rawExcerpt: "国内銀行連合がステーブルコイン実証の商用化時期を検討している。", summaryEn: "A Japanese bank consortium is studying commercialization of a stablecoin pilot." },
    question: "Will a Japanese bank consortium launch a commercial stablecoin service before December 31, 2026?",
    resolution: { endDate: "2026-12-31", timezone: "Asia/Tokyo", sources: ["Participating bank official releases", "FSA registration notices"], edgeCases: ["Pilot tests do not count", "Service must be commercially available to external users"] },
    scores: scores({ resolutionClarity: 74, tradingInterest: 66, informationAsymmetry: 82, novelty: 84, sourceCredibility: 70, ambiguityRisk: 35 }),
    criticNotes: ["High novelty but commercial launch definition needs validation."],
    agentDecisions: [{ agent: "CriticAgent", decision: "NEEDS_EDIT", rationale: "Define eligible consortium and commercial availability.", confidence: 0.69 }],
    validations: [],
    trace: trace("013", false),
    status: "VALIDATING",
  }),
  card({
    id: "cn-ev-subsidy-extension",
    category: "EV Policy",
    source: { id: "src-cn-ev-subsidy", title: "China weighs extension of EV purchase incentives", url: "https://example.com/cn/ev-subsidy", language: "zh", region: "CN", sourceName: "Chinese auto policy outlet", publishedAt: "2026-05-09", rawExcerpt: "有关部门正在研究新能源汽车购置支持政策的延续安排。", summaryEn: "Chinese authorities are studying extension arrangements for EV purchase support." },
    question: "Will China extend national EV purchase incentives before December 31, 2026?",
    resolution: { endDate: "2026-12-31", timezone: "Asia/Shanghai", sources: ["Ministry of Finance", "MIIT", "State Council policy releases"], edgeCases: ["Local subsidies alone do not count", "Rumored consultations do not count"] },
    scores: scores({ resolutionClarity: 81, tradingInterest: 88, informationAsymmetry: 79, novelty: 65, sourceCredibility: 74, ambiguityRisk: 29 }),
    criticNotes: ["National vs local incentive boundary must remain explicit."],
    agentDecisions: [{ agent: "MarketabilityAgent", decision: "ACCEPT", rationale: "EV subsidy policy has global auto and battery market relevance.", confidence: 0.84 }],
    validations: [approval("ChinaEVValidator")],
    trace: trace("014"),
    status: "APPROVED",
  }),
  card({
    id: "cn-property-support",
    category: "Property / Macro",
    source: { id: "src-cn-property", title: "Cities prepare property purchase easing measures", url: "https://example.com/cn/property-support", language: "zh", region: "CN", sourceName: "Chinese property news", publishedAt: "2026-05-08", rawExcerpt: "多个城市正在酝酿进一步优化住房限购和首付比例政策。", summaryEn: "Several cities are preparing further property purchase easing measures." },
    question: "Will China announce a national property support package before September 30, 2026?",
    resolution: { endDate: "2026-09-30", timezone: "Asia/Shanghai", sources: ["State Council", "PBOC", "Ministry of Housing and Urban-Rural Development"], edgeCases: ["City-level measures alone do not count", "Liquidity operations alone do not count unless framed as property support"] },
    scores: scores({ resolutionClarity: 73, tradingInterest: 90, informationAsymmetry: 70, novelty: 56, sourceCredibility: 72, ambiguityRisk: 39 }),
    criticNotes: ["National package is harder to define; keep critic warning visible."],
    agentDecisions: [{ agent: "CriticAgent", decision: "NEEDS_VALIDATION", rationale: "Package definition can become ambiguous.", confidence: 0.66 }],
    validations: [],
    trace: trace("015", false),
    status: "VALIDATING",
  }),
  card({
    id: "cn-chip-export-controls-response",
    category: "Semiconductors",
    source: { id: "src-cn-chip-response", title: "China industry groups discuss chip control response", url: "https://example.com/cn/chip-response", language: "zh", region: "CN", sourceName: "Chinese semiconductor media", publishedAt: "2026-05-07", rawExcerpt: "行业协会建议针对先进芯片出口限制采取进一步反制措施。", summaryEn: "Industry groups suggested further countermeasures against advanced chip export restrictions." },
    question: "Will China announce new semiconductor export-control countermeasures before October 31, 2026?",
    resolution: { endDate: "2026-10-31", timezone: "Asia/Shanghai", sources: ["Ministry of Commerce", "State Council tariff commission", "Customs announcements"], edgeCases: ["Industry association statements do not count", "Existing controls repeated without new measures do not count"] },
    scores: scores({ resolutionClarity: 78, tradingInterest: 86, informationAsymmetry: 76, novelty: 73, sourceCredibility: 71, ambiguityRisk: 31 }),
    criticNotes: ["Countermeasure must be new and official."],
    agentDecisions: [{ agent: "ResolutionRulesAgent", decision: "ACCEPT", rationale: "Official ministry sources can resolve the event.", confidence: 0.76 }],
    validations: [approval("ChinaSemiValidator", 0.04)],
    trace: trace("016"),
    status: "APPROVED",
  }),
  card({
    id: "cn-yuan-fixing-band",
    category: "FX Policy",
    source: { id: "src-cn-yuan", title: "PBOC commentary stresses yuan stability", url: "https://example.com/cn/yuan-stability", language: "zh", region: "CN", sourceName: "Chinese central bank commentary", publishedAt: "2026-05-06", rawExcerpt: "央行相关人士强调将坚决防范汇率超调风险。", summaryEn: "PBOC-linked commentary stressed preventing yuan overshooting risks." },
    question: "Will the PBOC set the USD/CNY fixing stronger than 7.00 before December 31, 2026?",
    resolution: { endDate: "2026-12-31", timezone: "Asia/Shanghai", sources: ["PBOC daily USD/CNY fixing data", "CFETS data"], edgeCases: ["Offshore CNH moves do not count", "Intraday spot moves do not count"] },
    scores: scores({ resolutionClarity: 94, tradingInterest: 80, informationAsymmetry: 55, novelty: 60, sourceCredibility: 91, ambiguityRisk: 10 }),
    criticNotes: ["Numeric threshold creates excellent resolution clarity."],
    agentDecisions: [{ agent: "QuestionGenerator", decision: "REWRITE", rationale: "Converted vague stability commentary into numeric fixing market.", confidence: 0.9 }],
    validations: [approval("FXValidatorCN")],
    trace: trace("017"),
    status: "APPROVED",
  }),
  card({
    id: "cn-gaming-approval-batch",
    category: "Gaming / Internet",
    source: { id: "src-cn-games", title: "China game approval batch expected to expand", url: "https://example.com/cn/game-approvals", language: "zh", region: "CN", sourceName: "Chinese internet industry media", publishedAt: "2026-05-05", rawExcerpt: "业内预计未来几批国产网络游戏版号数量或继续增加。", summaryEn: "Industry observers expect upcoming domestic game approval batches to expand." },
    question: "Will China approve at least 150 domestic online games in any monthly batch before December 31, 2026?",
    resolution: { endDate: "2026-12-31", timezone: "Asia/Shanghai", sources: ["National Press and Publication Administration approval lists"], edgeCases: ["Imported game approvals do not count", "Cumulative approvals across months do not count"] },
    scores: scores({ resolutionClarity: 92, tradingInterest: 62, informationAsymmetry: 69, novelty: 78, sourceCredibility: 89, ambiguityRisk: 12 }),
    criticNotes: ["Numeric threshold makes a local internet policy signal tradable."],
    agentDecisions: [{ agent: "QuestionGenerator", decision: "ACCEPT", rationale: "Clear official list and threshold.", confidence: 0.88 }],
    validations: [],
    trace: trace("018", false),
    status: "DRAFT",
  }),
  card({
    id: "cn-ant-ipo-revival",
    category: "Fintech",
    source: { id: "src-cn-ant", title: "Ant Group listing speculation resurfaces", url: "https://example.com/cn/ant-ipo", language: "zh", region: "CN", sourceName: "Chinese fintech media", publishedAt: "2026-05-04", rawExcerpt: "市场再度关注蚂蚁集团重启上市进程的可能性。", summaryEn: "Market attention returned to the possibility of Ant Group restarting its listing process." },
    question: "Will Ant Group file for a public listing before December 31, 2026?",
    resolution: { endDate: "2026-12-31", timezone: "Asia/Shanghai", sources: ["Shanghai Stock Exchange filings", "Hong Kong Stock Exchange filings", "Ant Group official announcements"], edgeCases: ["Media speculation does not count", "Internal restructuring does not count without an exchange filing"] },
    scores: scores({ resolutionClarity: 85, tradingInterest: 83, informationAsymmetry: 71, novelty: 66, sourceCredibility: 68, ambiguityRisk: 24 }),
    criticNotes: ["Filing event is cleaner than approval or listing completion."],
    agentDecisions: [{ agent: "ResolutionRulesAgent", decision: "REWRITE", rationale: "Filing is more observable than listing completion.", confidence: 0.82 }],
    validations: [],
    trace: trace("019", false),
    status: "VALIDATING",
  }),
  card({
    id: "cn-hydrogen-subsidy",
    category: "Energy Transition",
    source: { id: "src-cn-hydrogen", title: "Hydrogen city cluster support policy under review", url: "https://example.com/cn/hydrogen", language: "zh", region: "CN", sourceName: "Chinese energy policy outlet", publishedAt: "2026-05-03", rawExcerpt: "氢能示范城市群后续支持政策正在研究之中。", summaryEn: "Follow-up support policy for hydrogen demonstration city clusters is under study." },
    question: "Will China publish a new national hydrogen subsidy policy before November 30, 2026?",
    resolution: { endDate: "2026-11-30", timezone: "Asia/Shanghai", sources: ["National Development and Reform Commission", "Ministry of Finance", "National Energy Administration"], edgeCases: ["Provincial-only subsidies do not count", "Research plans without financial support do not count"] },
    scores: scores({ resolutionClarity: 77, tradingInterest: 58, informationAsymmetry: 80, novelty: 82, sourceCredibility: 73, ambiguityRisk: 32 }),
    criticNotes: ["High local information asymmetry; lower broad trading interest."],
    agentDecisions: [{ agent: "MarketabilityAgent", decision: "ACCEPT", rationale: "Policy has clean official sources and energy-sector relevance.", confidence: 0.75 }],
    validations: [],
    trace: trace("020", false),
    status: "DRAFT",
  }),
];

export function getDashboardMetrics(cards: MarketCard[]): DashboardMetrics {
  const generated = cards.length;
  const validated = cards.filter((card) => card.status === "APPROVED").length;
  const rejected = cards.filter((card) => card.status === "REJECTED").length;
  const rewardsPaidUsdc = cards.reduce(
    (sum, card) =>
      sum +
      card.validations.reduce(
        (validationSum, validation) => validationSum + (validation.rewardTxHash ? validation.rewardUsdc : 0),
        0,
      ),
    0,
  );
  const arcTracesCommitted = cards.filter((card) => Boolean(card.trace.arcTxHash)).length;
  const averageFinalScore = Math.round(
    cards.reduce((sum, card) => sum + card.scores.final, 0) / Math.max(cards.length, 1),
  );

  return {
    generated,
    validated,
    rejected,
    rewardsPaidUsdc: Number(rewardsPaidUsdc.toFixed(2)),
    arcTracesCommitted,
    averageFinalScore,
  };
}

export function getFeaturedMarketCard(cards: MarketCard[]): MarketCard {
  if (cards.length === 0) {
    throw new Error("Cannot select a featured market card from an empty list");
  }

  return [...cards].sort((a, b) => b.scores.final - a.scores.final)[0];
}
