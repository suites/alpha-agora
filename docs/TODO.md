# Alpha Agora TODO

> Durable task board. Update this after every meaningful progress change. In a new thread, read this file with `docs/HACKATHON_PLAN.md` and `git status` first.

## Current phase

Submission-ready MVP complete

## Status legend

- `[ ]` pending
- `[/]` in progress
- `[x]` done
- `[!]` blocked / needs decision

---

## Milestone 0 — Kickoff scaffold

- [x] Create Next.js repo under `/Users/fred/Projects/alpha-agora`
- [x] Initialize git repository via `create-next-app`
- [x] Create durable hackathon plan at `docs/HACKATHON_PLAN.md`
- [x] Create durable task board at `docs/TODO.md`
- [x] Create Notion orchestration log page/database for agent discussions and decisions
- [x] Replace default Next.js page with Alpha Agora landing/dashboard skeleton
- [x] Run lint/build verification
- [x] Commit kickoff scaffold
- [x] Report Milestone 0 completion to Fred

## Milestone 1 — Market Card domain model + seed demo

- [x] Define TypeScript domain types
- [x] Add scoring utility functions
- [x] Add 20 seed market cards across KR/JP/CN
- [x] Render Market Card list UI
- [x] Render Market Card detail UI
- [x] Add basic tests for scoring/model utilities
- [x] Commit Milestone 1

## Milestone 2 — Agent pipeline API

- [x] Define pipeline interfaces and structured output schemas
- [x] Implement deterministic local pipeline for demo reliability
- [x] Add `/api/generate-card` route
- [x] Add LLM adapter boundary
- [x] Wire input form to generation API
- [x] Persist generated cards
- [x] Commit Milestone 2

## Milestone 3 — Validator workflow

- [x] Add approve/reject/edit/comment actions
- [x] Persist validation state
- [x] Update dashboard metrics
- [x] Add validator board UI
- [x] Commit Milestone 3

## Milestone 4 — Trace and reward adapters

- [x] Add reasoning trace JSON builder
- [x] Add SHA-256 trace hashing
- [x] Add Arc TraceRegistry adapter boundary
- [x] Add mock/testnet trace commit receipt
- [x] Add USDC reward settlement adapter boundary
- [x] Add mock/testnet reward receipt
- [x] Display tx hashes/statuses in Market Card detail
- [x] Commit Milestone 4

## Milestone 5 — Submission readiness

- [x] README with setup/env/demo script
- [x] Submission narrative aligned to judging criteria
- [x] Seeded demo scenario walkthrough
- [x] Responsive polish
- [x] Final lint/build/test
- [x] Screenshots/video checklist
- [x] Final commit/tag

---

## Open decisions / questions

- [ ] Confirm whether real Arc/Circle credentials/RPC are available during implementation, or whether mock adapters should be used until final integration
- [ ] Decide final deployment target: Vercel, local demo, or other
- [ ] Decide whether to prioritize Polymarket similar-market search in P1

## Notion coordination

- Notion root page: `Agora Agents Hackathon` (`35d18e5e-6ce6-8084-b74c-f35d32b324b8`)
- Planning page: `Agora Alpha 2차 기획 - Market Card Agent 방향` (`35d18e5e-6ce6-81bb-9a38-dc4323fd6283`)
- Orchestration log: `Alpha Agora Orchestration Log` (`35d18e5e-6ce6-81e3-81af-f54a6945ee15`)
- Orchestration log URL: https://www.notion.so/Alpha-Agora-Orchestration-Log-35d18e5e6ce681e381aff54a6945ee15
- Rule: Notion orchestration log entries must be written in Korean for Fred's review.
