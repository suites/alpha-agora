# Alpha Agora — Market Card Agent

Alpha Agora is a submission-ready Agora Agents Hackathon project that turns non-English local alpha into resolution-ready prediction market cards.

It is **not** a prediction market venue and **not** an AI trading bot. It is an upstream Market Card Agent that helps prediction market teams discover, score, validate, and trace new market candidates from Korean, Japanese, and Chinese sources.

## Why this matters

Prediction markets need more high-quality local events than English-only feeds can provide. Alpha Agora converts regional event signals into a structured Market Card:

- source summary and original excerpt
- marketability scores
- prediction market question
- resolution source, deadline, timezone, and edge cases
- agent decision trail
- human validator verdict/comments
- Arc-compatible reasoning trace hash
- USDC validator reward receipt

## Hackathon judging alignment

| Criterion | Alpha Agora proof |
| --- | --- |
| Agentic Sophistication 30% | Deterministic multi-step pipeline: source reader → region/language inference → marketability scorer → question generator → resolution rule builder → critic/trace |
| Traction 30% | 20 seeded KR/JP/CN market cards, generated cards, validator workflow, dashboard metrics, settlement counts |
| Circle / Arc Usage 20% | USDC reward adapter boundary and Arc TraceRegistry adapter boundary with testnet-compatible mock receipts |
| Innovation 20% | Creates prediction-market-ready supply from non-English local alpha instead of building another trading bot |

## Current features

- Market Card domain model with 20 realistic seed cards
- `/api/generate-card` deterministic agent pipeline for source text/URL input
- Live generation workbench in the dashboard
- Human validator board for approve/reject/needs-edit/comment/edit-question actions
- `/api/validate-card` validation state workflow
- Reasoning trace JSON builder and SHA-256 trace hash
- `/api/settle-card` Arc trace commit + USDC reward settlement flow
- UI display for trace hash, Arc tx hash, Arc network, and reward tx hash
- Vitest coverage for domain scoring, generation, validation, settlement, and API routes

## Tech stack

- Next.js App Router 16
- React 19
- TypeScript
- Tailwind CSS
- Vitest
- In-memory demo persistence for hackathon reliability

## Architecture

```text
Non-English event/source
  → market-pipeline.ts
      infer region/language
      generate market question
      score marketability
      build resolution rules
      draft trace hash
  → /api/generate-card
  → ValidatorBoard
      approve / reject / needs edit
      comment / edit question
  → /api/validate-card
  → settlement-adapters.ts
      reasoning trace JSON
      SHA-256 trace hash
      Arc TraceRegistry adapter boundary
      USDC reward settlement adapter boundary
  → /api/settle-card
```

The current Arc/Circle implementations are intentionally mock/testnet-compatible adapter boundaries so the demo works without secrets. Real RPC/provider integration can replace `commitTraceToArc` and `settleValidatorRewards` without changing the product flow.

## Setup

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Verification

```bash
pnpm test
pnpm lint
pnpm build
```

Expected current baseline:

- 7 test files passing
- 24 tests passing
- ESLint passing
- Next build passing
- Dynamic routes: `/api/generate-card`, `/api/validate-card`, `/api/settle-card`

## Demo script

1. Open the dashboard
2. Show the top judging cards: Agentic Sophistication, Traction, Circle/Arc Usage, Innovation
3. In **Generate Market Card**, paste a Korean/Japanese/Chinese local event excerpt and click `Generate Market Card`
4. Show the generated card preview, agent decisions, resolution rules, and draft trace hash
5. In **Human validator workflow**, select a draft/validating card
6. Click `APPROVE` with a validator comment
7. Click `Commit trace + pay rewards`
8. Point out:
   - SHA-256 reasoning trace hash
   - mock Arc tx hash
   - `arc-testnet-mock` network
   - mock USDC reward tx hash
9. Explain that real Arc/Circle providers plug into the existing adapter boundary

## API routes

### `POST /api/generate-card`

```json
{
  "sourceText": "Local non-English event excerpt...",
  "sourceUrl": "https://example.com/local-source",
  "categoryHint": "Elections"
}
```

### `POST /api/validate-card`

```json
{
  "cardId": "card-id",
  "validator": "HackathonValidator",
  "verdict": "APPROVE",
  "comment": "Resolution source and deadline are clear.",
  "editedQuestion": "Optional edited question"
}
```

`verdict` can be `APPROVE`, `REJECT`, or `NEEDS_EDIT`.

### `POST /api/settle-card`

```json
{
  "cardId": "approved-card-id"
}
```

Returns the updated card, reasoning trace JSON, Arc trace receipt, and USDC reward receipts.

## Environment variables

No credentials are required for the current demo.

Future real integrations can use:

```bash
ARC_RPC_URL=
ARC_TRACE_REGISTRY_ADDRESS=
CIRCLE_API_KEY=
USDC_REWARD_WALLET=
```

Do not commit real secrets.

## Project docs

- `docs/HACKATHON_PLAN.md` — durable execution plan
- `docs/TODO.md` — milestone checklist
- `docs/SUBMISSION.md` — final submission narrative and walkthrough

## Important implementation files

- `src/lib/market-card.ts`
- `src/lib/market-pipeline.ts`
- `src/lib/validation-workflow.ts`
- `src/lib/settlement-adapters.ts`
- `src/lib/market-store.ts`
- `src/app/api/generate-card/route.ts`
- `src/app/api/validate-card/route.ts`
- `src/app/api/settle-card/route.ts`
- `src/components/generated-card-workbench.tsx`
- `src/components/validator-board.tsx`
