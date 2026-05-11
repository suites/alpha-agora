# Alpha Agora Hackathon Execution Plan

> **For Hermes:** This is the durable orchestration source of truth. In any new thread, read this file and `docs/TODO.md` first, then continue from the current phase.

**Goal:** Build a submission-quality hackathon project that turns non-English local events into resolution-ready prediction market cards, coordinates human validation with USDC rewards, and commits agent reasoning traces on Arc.

**Core positioning:** Alpha Agora is not a prediction market venue and not an AI trading bot. It is an upstream Market Card Agent that generates listing candidates for prediction market venues.

**Project path:** `/Users/fred/Projects/alpha-agora`

**Planning source:** Notion page `Agora Alpha 2차 기획 - Market Card Agent 방향`.

**Orchestration log:** Notion page `Alpha Agora Orchestration Log` — https://www.notion.so/Alpha-Agora-Orchestration-Log-35d18e5e6ce681e381aff54a6945ee15

---

## Scoring alignment

| Hackathon criterion | Product proof we must show | MVP artifact |
| --- | --- | --- |
| Agentic Sophistication 30% | Agent makes structured decisions, not just chat/summary | Multi-step pipeline: source reader → event extractor → marketability scorer → question generator → resolution rules → critic |
| Traction 30% | Real usage traces, even if small | 20+ seeded market cards, validator actions, dashboard metrics, reward/trace counts |
| Circle tool usage 20% | USDC/Arc are part of workflow | testnet USDC reward/bounty flow, Arc trace hash commit, tx hash display |
| Innovation 20% | Creates markets upstream instead of trading them | Market Card format, local-alpha positioning, non-English source conversion |

---

## MVP definition

### P0 — must ship

1. URL/text input for Korean/Japanese/Chinese events.
2. Agent pipeline producing structured JSON for:
   - source summary
   - extracted event
   - marketability score
   - prediction market question
   - resolution source, end date, edge cases
   - critic notes and risk scores
3. Market Card list/detail UI.
4. Human validator actions: approve, reject, edit/comment.
5. Reasoning trace JSON and SHA-256 hash.
6. Arc TraceRegistry integration or testnet-compatible mock with clear adapter boundary until Arc credentials/RPC are ready.
7. USDC reward/bounty integration or testnet-compatible mock with clear adapter boundary until Circle credentials are ready.
8. Dashboard metrics: generated, validated, rejected, rewards paid, Arc traces committed.
9. Seed/demo dataset: at least 20 realistic local-alpha examples.
10. README with setup, env vars, demo script, and submission narrative.

### P1 — high leverage

- Polymarket similar market search/read API.
- Duplicate risk score.
- Agent decision log UI.
- Bounty deposit flow.
- Export/share Market Card JSON.

### Out of scope for hackathon MVP

- Actual automated trading.
- Own prediction market AMM.
- Complex oracle/resolution system.
- Full automatic Polymarket listing.
- Large-scale real-time crawling.
- Full agent builder marketplace.
- Automated liquidity provisioning.

---

## Architecture

Initial implementation should stay thin and demo-first.

- **Frontend:** Next.js App Router, React, Tailwind CSS.
- **Backend:** Next.js route handlers/server actions initially.
- **Storage:** Start with local JSON/in-memory seed data; graduate to Prisma + SQLite/Postgres once flows stabilize.
- **Agent pipeline:** TypeScript modules with deterministic structured outputs first; LLM adapter behind an interface.
- **Blockchain/payment:** Adapter interfaces with mock/testnet implementations. Keep `TraceRegistry` and `RewardSettlement` boundaries explicit.
- **Quality:** TypeScript strictness, ESLint, focused unit tests as soon as logic modules exist.

Rationale: end-to-end skeleton in first 1–2 work blocks is more important than perfect infrastructure. Add NestJS/BullMQ/Prisma only when needed.

---

## Milestones

### Milestone 0 — Kickoff scaffold

- Create Next.js repo under `~/Projects/alpha-agora`.
- Add durable plan and todo docs.
- Replace default page with Alpha Agora landing/dashboard skeleton.
- Commit initial scaffold.

### Milestone 1 — Market Card domain model + seed demo

- Define TypeScript types for EventSource, MarketCard, AgentDecision, Validation, Reward, TraceCommit.
- Add 20 seed Market Cards across KR/JP/CN.
- Render list/detail-ready static dashboard.
- Add scoring utilities and tests.

### Milestone 2 — Agent pipeline API

- Build `/api/generate-card` route that accepts URL/text and returns a Market Card. ✅
- Implement deterministic/local pipeline first. ✅
- Add LLM provider adapter using structured JSON if API keys are available. ✅ Adapter boundary added; live provider remains optional.
- Store generated cards. ✅ In-memory demo persistence for generated draft cards.

### Milestone 3 — Validator workflow

- Add validate/reject/edit/comment UI. ✅
- Persist validation state. ✅ In-memory shared store for demo; generated and seed cards can be validated.
- Update dashboard traction metrics. ✅ Validator board metrics show approved/rejected/needs-edit/pending/rewards queued.

### Milestone 4 — Trace and reward adapters

- Add `TraceRegistry` adapter: hash reasoning trace and return tx-like receipt. ✅ Reasoning trace JSON + SHA-256 trace hash implemented with Arc mock receipt.
- Add `RewardSettlement` adapter: USDC reward/bounty receipt. ✅ Mock Circle USDC settlement receipt attaches reward tx hashes to validations.
- Wire UI to show tx hashes and statuses. ✅ Validator board can settle approved cards and display trace hash, Arc tx, Arc network, and reward tx.
- Replace mock with real Arc/Circle integration when credentials/RPC are confirmed.

### Milestone 5 — Polish and submission readiness

- Demo script and seeded scenario. ✅ Added to `README.md` and `docs/SUBMISSION.md`.
- README and architecture docs. ✅ README now covers setup, env vars, API routes, architecture, verification, and demo flow.
- Basic responsive polish. ✅ Dashboard includes submission readiness assets and all milestone status items.
- Final lint/build/test. ✅ `pnpm test && pnpm lint && pnpm build` passes with 7 test files / 24 tests.
- Submission copy and screenshots/video checklist. ✅ Added to `docs/SUBMISSION.md`.

---

## Operating rules

1. Git is the project ledger. Commit after each coherent milestone/slice.
2. `docs/TODO.md` is the durable task board. Update it whenever status changes.
3. Notion orchestration logs must be written in Korean so Fred can review them mid-stream. Keep code identifiers, commands, and file paths in their original form.
4. If a new thread starts, first read `docs/HACKATHON_PLAN.md`, `docs/TODO.md`, and `git status`.
5. Use Codex for coding slices where feasible; Hermes verifies diffs/tests and creates commits.
6. Escalate to Fred when credentials, product tradeoffs, or hackathon requirement ambiguity blocks progress.
7. Do not let infrastructure scope creep hide the core demo: Market Card Detail is the winning screen.

---

## Immediate next tasks

See `docs/TODO.md`.
