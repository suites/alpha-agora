import type { Region, SourceLanguage } from "../lib/market-card";
import type { GenerateCardInput } from "../lib/market-pipeline";

export interface RealisticUserGenerationFixture {
  id: string;
  persona: string;
  input: GenerateCardInput;
  expected: {
    region: Region;
    language: SourceLanguage;
    category: string;
    minFinalScore: number;
  };
}

export const realisticUserGenerationFixtures: RealisticUserGenerationFixture[] = [
  {
    id: "kr-ai-policy-messy-paste",
    persona: "Korean policy watcher pasting mobile-news text with messy whitespace",
    input: {
      sourceUrl: "https://example.com/kr/ai-basic-act-guidance-user",
      categoryHint: "AI Policy",
      sourceText:
        "  정부가   AI 기본법 시행령과 고영향 AI 기준을\n\n6월 말까지 공개하는 방안을 검토하고 있다.   관계 부처는 공식 설명자료를 준비 중이다. ",
    },
    expected: { region: "KR", language: "ko", category: "AI Policy", minFinalScore: 68 },
  },
  {
    id: "kr-bok-rate-community-rumor",
    persona: "Retail macro trader turning a Korean community rumor into a checkable central-bank market",
    input: {
      sourceUrl: "https://example.com/kr/bok-rate-cut-signal",
      categoryHint: "Macro",
      sourceText: "한국은행 금통위원들이 7월 회의 전까지 금리 인하 필요성을 공식적으로 언급할 수 있다는 관측이 나왔다.",
    },
    expected: { region: "KR", language: "ko", category: "Macro", minFinalScore: 66 },
  },
  {
    id: "kr-hbm-supply-chain",
    persona: "Semiconductor analyst tracking Korean supply-chain chatter",
    input: {
      sourceUrl: "https://example.com/kr/hbm4-supply-chain",
      categoryHint: "Semiconductors",
      sourceText: "반도체 업계에서는 삼성전자가 HBM4 양산 일정을 10월 이전으로 앞당기는 방안을 주요 고객사와 논의 중이라고 보고 있다.",
    },
    expected: { region: "KR", language: "ko", category: "Semiconductors", minFinalScore: 66 },
  },
  {
    id: "kr-ev-subsidy-local-notice",
    persona: "EV buyer watching Korean subsidy notice boards",
    input: {
      sourceUrl: "https://example.com/kr/ev-subsidy-budget",
      categoryHint: "EV Policy",
      sourceText: "환경부와 지자체가 전기차 보조금 추가 예산을 하반기 전에 공개할 수 있다는 보도자료 초안을 검토 중이다.",
    },
    expected: { region: "KR", language: "ko", category: "EV Policy", minFinalScore: 68 },
  },
  {
    id: "jp-boj-bond-purchase",
    persona: "Japanese macro watcher reading BOJ operations coverage",
    input: {
      sourceUrl: "https://example.com/jp/boj-jgb-operations",
      categoryHint: "Macro",
      sourceText: "日銀が国債買い入れ予定額の減額を9月末までに発表する可能性が市場関係者の間で意識されている。",
    },
    expected: { region: "JP", language: "ja", category: "Macro", minFinalScore: 66 },
  },
  {
    id: "jp-ai-guideline-ministry",
    persona: "Japanese AI operator tracking ministry safety guidelines",
    input: {
      sourceUrl: "https://example.com/jp/ai-safety-guidelines",
      categoryHint: "AI Policy",
      sourceText: "政府は生成AIの安全性に関する新たな指針を年内に発表する方向で調整している。",
    },
    expected: { region: "JP", language: "ja", category: "AI Policy", minFinalScore: 68 },
  },
  {
    id: "jp-game-platform-rule",
    persona: "Game industry PM watching Japanese platform regulation chatter",
    input: {
      sourceUrl: "https://example.com/jp/game-platform-rule",
      categoryHint: "Gaming / Internet",
      sourceText: "ゲーム配信プラットフォームの課金表示ルールについて、消費者庁が追加指針を発表する可能性がある。",
    },
    expected: { region: "JP", language: "ja", category: "Gaming / Internet", minFinalScore: 68 },
  },
  {
    id: "jp-crypto-stablecoin",
    persona: "Crypto operator following Japan stablecoin regulatory updates",
    input: {
      sourceUrl: "https://example.com/jp/stablecoin-guidance",
      categoryHint: "Crypto Policy",
      sourceText: "金融庁が暗号資産とステーブルコインの販売ルールについて追加ガイドラインを年内に公表するとの見方が出ている。",
    },
    expected: { region: "JP", language: "ja", category: "Crypto Policy", minFinalScore: 66 },
  },
  {
    id: "cn-game-approval-batch",
    persona: "Chinese gaming analyst monitoring approval batches",
    input: {
      sourceUrl: "https://example.com/cn/game-approval-batch",
      categoryHint: "Gaming / Internet",
      sourceText: "业内预计未来几批国产网络游戏版号数量或继续增加，监管部门可能在年底前发布更多审批名单。",
    },
    expected: { region: "CN", language: "zh", category: "Gaming / Internet", minFinalScore: 68 },
  },
  {
    id: "cn-pboc-liquidity",
    persona: "China macro trader watching PBOC liquidity signals",
    input: {
      sourceUrl: "https://example.com/cn/pboc-liquidity-tool",
      categoryHint: "Macro",
      sourceText: "市场人士认为央行可能在四季度前宣布新的流动性支持工具，以稳定中小银行融资环境。",
    },
    expected: { region: "CN", language: "zh", category: "Macro", minFinalScore: 66 },
  },
  {
    id: "cn-ai-model-filing",
    persona: "Founder tracking Chinese generative AI model filing requirements",
    input: {
      sourceUrl: "https://example.com/cn/ai-model-filing",
      categoryHint: "AI Policy",
      sourceText: "监管机构可能在年底前发布生成式人工智能模型备案的新要求，涉及高影响应用的安全评估。",
    },
    expected: { region: "CN", language: "zh", category: "AI Policy", minFinalScore: 68 },
  },
  {
    id: "cn-ev-subsidy-extension",
    persona: "EV supply-chain operator watching China subsidy headlines",
    input: {
      sourceUrl: "https://example.com/cn/ev-subsidy-extension",
      categoryHint: "EV Policy",
      sourceText: "多地讨论新能源车消费补贴延长期限，相关部门可能在年底前发布正式通知。",
    },
    expected: { region: "CN", language: "zh", category: "EV Policy", minFinalScore: 66 },
  },
];
