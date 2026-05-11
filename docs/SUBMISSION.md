# Alpha Agora Submission Narrative

## One-liner

Alpha Agora turns non-English local events into resolution-ready prediction market cards, coordinates human validator checks with USDC rewards, and commits the agent reasoning trace to an Arc-compatible registry adapter.

## Problem

Prediction market venues need a steady supply of clear, resolvable, interesting markets. Most market discovery workflows over-index on English news and miss local alpha from Korean, Japanese, and Chinese sources. Even when an event is found, the hard part is converting it into a resolution-ready market with edge cases, credible sources, validator review, and auditable reasoning.

## Solution

Alpha Agora is a Market Card Agent. It ingests local event text/URLs and produces a structured Market Card containing:

1. source summary and original excerpt
2. region/language inference
3. prediction market question
4. resolution source, deadline, timezone, and edge cases
5. marketability scores
6. agent decision trail
7. human validation verdict/comment/edit history
8. Arc reasoning trace hash and tx-like receipt
9. USDC validator reward receipt

The winning screen is the Market Card detail / validator board because it shows the full path from local source to validated, trace-committed market candidate.

## Why it is agentic

Alpha Agora is not a wrapper around a chat response. The pipeline makes structured intermediate decisions:

- detect source region/language
- infer likely market category
- score resolution clarity, trading interest, information asymmetry, novelty, credibility, and ambiguity risk
- generate a binary market question
- create resolution rules and edge cases
- preserve agent decisions for later trace commitment
- route candidate to human validator workflow
- settle approved validator rewards

The implementation is deterministic for demo reliability but has an explicit provider boundary for future LLM adapters.

## Circle / Arc usage story

Alpha Agora uses Circle/USDC and Arc as product primitives, not decorative integrations.

- Human validators earn USDC rewards for improving market quality
- Approved cards produce a reasoning trace JSON
- The trace is SHA-256 hashed
- The hash is committed through an Arc TraceRegistry adapter boundary
- Reward settlement attaches USDC tx-like receipts to validations

The current implementation uses testnet-compatible mock adapters because real credentials/RPC were not assumed. Replacing mocks with live integrations is isolated to `src/lib/settlement-adapters.ts`.

## Traction proof in the demo

- 20 seeded local-alpha Market Cards across Korea, Japan, and China
- Generated cards from live text input
- Validator actions and metrics
- Reward queue and settlement status
- Arc trace count and tx hash display
- Full test suite: 7 files, 24 tests

## Demo walkthrough

### 0. Start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

### 1. Positioning

Show the hero:

> Alpha Agora turns local alpha into market-ready cards.

Emphasize:

> This is not an AI trading bot. It creates the market candidates that trading agents will trade on.

### 2. Judging alignment

Point at the four cards:

- Agentic Sophistication: multi-step structured pipeline
- Traction: seed cards + validator actions + reward/trace counts
- Circle / Arc Usage: USDC rewards + Arc trace commitments
- Innovation: upstream market creation from non-English local alpha

### 3. Generate a card

Use this sample input:

```text
서울시가 2026년 6월까지 심야 자율주행버스 운행 구간을 강남권으로 확대할지 여부를 다음 달 교통위원회 안건으로 상정할 예정이다.
```

Optional URL:

```text
https://example.com/seoul-autonomous-night-bus
```

Category hint:

```text
Transportation
```

Click `Generate Market Card`.

Show:

- generated question
- source inference
- scoring breakdown
- agent decisions
- resolution rules
- draft trace hash

### 4. Validate the card

In Human validator workflow:

1. select the generated card
2. leave or edit validator comment
3. click `APPROVE`

Explain that validators can also reject or request edits, which changes card status and metrics.

### 5. Settle trace and reward

Click `Commit trace + pay rewards`.

Show:

- Trace hash
- Arc tx
- Arc network: `arc-testnet-mock`
- Reward tx

Explain that the mock output is intentionally tx-shaped and isolated behind an adapter boundary.

### 6. Close

Summarize:

> Alpha Agora creates prediction-market supply from underused local sources, makes every card auditable, and gives humans a reward loop to improve market quality.

## Screenshots / video checklist

- [ ] Hero + judging alignment cards
- [ ] Generation workbench before input
- [ ] Generated Market Card preview
- [ ] Validator board before approval
- [ ] Validator board after approval
- [ ] Settlement panel after trace/reward commit
- [ ] Terminal showing `pnpm test && pnpm lint && pnpm build`

## Submission copy

**Project name:** Alpha Agora

**Short description:** A Market Card Agent that converts Korean/Japanese/Chinese local events into resolution-ready prediction market candidates, routes them through human validation, rewards validators in USDC, and commits the reasoning trace to an Arc-compatible adapter.

**Long description:** Alpha Agora solves the upstream supply problem for prediction markets. Instead of trading on existing markets, it discovers and structures new market opportunities from non-English local sources. The agent pipeline produces a Market Card with question, scores, resolution rules, critic notes, and traceable decisions. A human validator workflow approves/rejects/edits cards, queues USDC rewards, and commits the reasoning trace through an Arc TraceRegistry adapter boundary. The demo includes 20 seeded local-alpha cards, live generation, validation, settlement receipts, dashboard metrics, and a tested Next.js implementation.

## Known limitations

- Persistence is in-memory for hackathon demo speed and reliability
- Arc/Circle integrations are mock/testnet-compatible adapters until live credentials/RPC are available
- LLM provider boundary exists, but default generation is deterministic to keep the demo stable
- Similar-market search is P1, not required for MVP

## Next integrations

1. Replace Arc mock with live TraceRegistry contract call
2. Replace USDC mock with Circle wallet / transfer flow
3. Add durable DB persistence
4. Add Polymarket similar-market lookup
5. Add export/share Market Card JSON
