# Alpha Agora — Market Card Agent

Alpha Agora is a production-oriented Market Card Agent that turns reachable non-English source URLs into resolution-ready prediction market cards.

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
| Traction 30% | Persisted Supabase/Postgres cards only, validator workflow, dashboard metrics, settlement counts |
| Circle / Arc Usage 20% | USDC reward adapter boundary and Arc TraceRegistry adapter boundary with testnet-compatible mock receipts |
| Innovation 20% | Creates prediction-market-ready supply from non-English local alpha instead of building another trading bot |

## Current features

- Production URL-only source intake: `/api/source-excerpt` fetches and extracts a local-language excerpt before card generation
- `/api/generate-card` requires a reachable `sourceUrl`, validates the URL again before generation, and persists cards to PostgreSQL
- Dashboard and validator board read only persisted Supabase/Postgres data; seed/fixture cards are not exposed in the product UI
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
- Prisma-backed PostgreSQL persistence for generated cards and agent runs

## Architecture

```text
Reachable non-English source URL
  → /api/source-excerpt
      validate public http/https URL
      fetch HTML/plain text with timeout and size limits
      extract local-language excerpt for operator review
  → /api/generate-card
      revalidate reachable source URL
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

The Arc/Circle integrations can run in production when their credentials are configured. If provider credentials are intentionally omitted, the adapter boundary can return deterministic/testnet-compatible receipts for local development only.

## Setup

```bash
pnpm install
cp .env.sample .env.local
pnpm dev
```

Open http://localhost:3000.

Alpha Agora uses `.env.local` as the single local environment file for both the Next.js app and Prisma CLI config. Do not create a separate `.env`; production values should live in the deployment platform environment variable settings, not in committed files.

For Vercel + Supabase, the app can use the integration-provided Postgres env vars directly:

- Runtime: `DATABASE_URL`, then `POSTGRES_PRISMA_URL`, then `POSTGRES_URL_NON_POOLING`, then `POSTGRES_URL`
- Prisma migrations: `DIRECT_URL`, then `POSTGRES_URL_NON_POOLING`, then `DATABASE_URL`, then `POSTGRES_PRISMA_URL`, then `POSTGRES_URL`

This follows the Prisma/Supabase guide's pooled runtime URL + direct migration URL pattern. On Vercel, `POSTGRES_PRISMA_URL` maps to the pooled/runtime URL and `POSTGRES_URL_NON_POOLING` maps to the direct migration URL.

When Vercel's Supabase integration provides runtime URLs with `sslmode=require`, the app removes that query parameter before handing the URL to `pg` and configures `ssl: { rejectUnauthorized: false }` for the Prisma runtime adapter. This keeps TLS encryption enabled while avoiding `self-signed certificate in certificate chain` failures from strict CA verification in the `@prisma/adapter-pg` / `pg` runtime path.

Vercel builds run `prisma migrate deploy` before `prisma generate` / `next build` whenever `VERCEL=1` and one of those database URL env vars is present. This keeps generated card persistence from deploying before the `market_cards`, `agent_runs`, and `agent_steps` tables exist. Local builds skip the deploy step so `pnpm build` remains usable without a running database.

After connecting Supabase in Vercel, you can also run migrations manually against Supabase with:

```bash
pnpm db:deploy
```

## Verification

```bash
pnpm test
pnpm lint
pnpm build
```

Expected current baseline:

- 24 test files passing
- 80 tests passing
- ESLint passing
- Next build passing
- Dynamic routes: `/`, `/api/source-excerpt`, `/api/generate-card`, `/api/validate-card`, `/api/settle-card`, `/api/auth/google`

## Production smoke test

1. Open the dashboard
2. In **Source URL**, paste a reachable Korean/Japanese/Chinese article URL
3. Click `Fetch source excerpt`
4. Review/edit the enabled **Local-language source excerpt** textarea
5. Click `Generate Market Card`
6. Refresh the page and confirm the persisted card still appears
7. In **Human validator workflow**, sign in with Google, approve/reject/needs-edit the persisted card, then settle when providers are configured

The product does not expose seed cards in the dashboard. Empty Supabase/Postgres storage shows an empty state until real generated cards are persisted.

## API routes

### `POST /api/source-excerpt`

```json
{
  "sourceUrl": "https://publisher.example/local-source"
}
```

Fetches a public `http`/`https` URL, rejects local/private/internal targets, limits response size/time, extracts readable text from HTML/plain text, and returns an editable local-language excerpt.

### `POST /api/generate-card`

```json
{
  "sourceUrl": "https://publisher.example/local-source",
  "sourceText": "Optional reviewed local-language excerpt returned by /api/source-excerpt...",
  "categoryHint": "Elections"
}
```

`sourceUrl` is required and must be reachable. `sourceText` is accepted only after URL validation; if omitted, the server uses the fetched excerpt.

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

Local development uses `.env.local` only. Start from the committed template:

```bash
cp .env.sample .env.local
```

Vercel/production should use dashboard environment variables instead of checked-in env files. The Supabase integration-provided `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` values are supported without adding a separate `DATABASE_URL`. Configure real provider credentials for production settlement/OAuth flows; omitted provider credentials should be treated as local-development only.

Google validator identity is available through `/api/auth/google`. Configure these values in Vercel for real OAuth:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTH_SECRET=
```

Set the Google OAuth redirect URI to `https://<deployment-host>/api/auth/google?action=callback`. The OAuth flow sets and verifies a short-lived CSRF `state` cookie before exchanging the Google callback code.

Real integrations can use:

```bash
LLM_PROVIDER=gemini
GEMINI_API_KEY=

ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
ARC_COMMITTER_PRIVATE_KEY=
REWARD_RECIPIENT_ADDRESS=

CIRCLE_ENV=sandbox
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_BLOCKCHAIN=ARC-TESTNET
CIRCLE_WALLET_ADDRESS=
CIRCLE_TOKEN_ADDRESS=0x3600000000000000000000000000000000000000
CIRCLE_RECIPIENT_ADDRESS=
```

Circle Developer-Controlled Wallet transfers follow the official Arc Testnet guide shape: `walletAddress` + `blockchain` + `tokenAddress`. Do not commit real secrets.

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
