# Alpha Agora Full Judging Compliance Implementation Plan

> **For Hermes:** Execute autonomously in milestone mode. Keep the Notion log page updated after each stage, use TDD for production behavior changes, verify with `npm test && npm run build`, and commit after each coherent stage.

**Goal:** Turn Alpha Agora into a fake-free, agentic market-creation demo that satisfies Agora Agents Hackathon judging criteria: visible agent decisions, real Arc provenance, real USDC validator rewards, live traction, and clear innovation.

**Architecture:** Keep the current Next.js app, but harden the runtime boundary first: explicit provider statuses, canonical trace hashing, no fake transaction success in product code, and seed/live traction separation. Then add durable AgentRun/AgentStep state, agent graph execution, critic/revision, safety critic, real Arc/Circle settlement UX, traction dashboard, and listing-ready export.

**Tech Stack:** Next.js 16, TypeScript, Vitest, Circle Developer-Controlled Wallets, viem/Arc RPC, optional `@langchain/langgraph` or internal graph runner, durable DB to be selected in Stage 2.

---

## Build Quality Rules

1. Do not create fake transaction hashes in runtime code.
2. Do not count seed/sample data as live traction.
3. Every external provider result must have status: `SUCCESS`, `PENDING`, `FAILED`, `UNCONFIGURED`, `RETRYABLE_FAILED`, `PROVIDER_UNAVAILABLE`, or `RAW_TEXT_REQUIRED`.
4. All future AgentStep outputs must persist `runId`, `nodeName`, `input`, `output`, `confidence`, `rationale`, and `toolCalls`.
5. A settled validation cannot be edited or settled again.
6. Reward transfers must be idempotent.
7. Trace hash must be computed from canonical JSON.
8. If LLM structured output fails validation, retry once with a repair prompt, then mark the step as failed.
9. The demo path must work from raw text input even if URL extraction fails.
10. Live traction metrics must only count real user actions and real provider results.

---

## Stage 1: Runtime no-fake guard + provider status foundation

**Objective:** Remove product-runtime fake settlement success and introduce reusable provider statuses/canonical trace hashing.

**Files:**
- Create: `src/lib/provider-status.ts`
- Create: `src/lib/canonical-json.ts`
- Create: `src/lib/runtime-guards.test.ts`
- Modify: `src/lib/settlement-adapters.ts`
- Modify: `src/lib/settlement-adapters.test.ts`
- Modify: `src/app/api/settle-card/route.test.ts`

**TDD tasks:**
1. Test `canonicalJson()` sorts object keys and keeps array order.
2. Test `hashReasoningTrace()` uses canonical JSON, independent of object insertion order.
3. Test product settlement without Arc/Circle providers returns explicit `UNCONFIGURED`/throws, not mock tx.
4. Test production source files do not contain `arc-testnet-mock`, `circle-usdc-testnet-mock`, `0xarc${...fake}`, or `0xusdc${...fake}` outside tests/fixtures.

**Verification:**
- `npm test -- src/lib/settlement-adapters.test.ts src/lib/runtime-guards.test.ts`
- `npm test && npm run build`

**Commit:** `refactor: remove fake runtime settlement path`

---

## Stage 2: Durable AgentRun / AgentStep / AuditEvent

**Objective:** Replace in-memory-only agent traces with durable run/step/audit records so agentic decisions and traction survive reloads.

**Files:**
- Create DB schema/repository after choosing Prisma/Drizzle/lightweight JSON DB.
- Modify generation/validation/settlement routes to record audit events.
- Add tests for persisted AgentStep ordering.

**Acceptance:**
- AgentRun persists after server restart or repository reload.
- Every generated card has at least one AgentRun and ordered AgentStep list.
- Audit events separate sample/seed from live.

---

## Stage 3: Agent graph + critic/revision + safety critic

**Objective:** Show real agentic behavior: node timeline, structured outputs, critic findings, automatic revision, and route decision.

**Acceptance:**
- Raw text input triggers graph execution.
- Demo source produces at least one critic finding and before/after revision.
- Safety critic rejects unsafe/unverifiable market proposals.
- UI Agent Run Console shows node input/output/confidence/rationale/tool calls.

---

## Stage 4: Real Arc trace commit

**Objective:** Make Arc provenance a real provider-backed product feature.

**Acceptance:**
- No fake tx hash is generated.
- Real Arc tx hash is returned when configured.
- Provider unconfigured/failure states are displayed as such.
- Trace hash is canonical and explorer/RPC-verifiable.

---

## Stage 5: Circle reward status + live traction dashboard

**Objective:** Make USDC validator rewards and traction numbers trustworthy.

**Acceptance:**
- Circle transfer uses existing ARC-TESTNET config and UUID-v4 idempotency keys.
- Transfer status is tracked as pending/confirmed/failed.
- Live traction counts only live user actions and real provider results.
- Seed cards are shown under sample dataset only.

---

## Stage 6: Listing-ready export + rejected gallery

**Objective:** Strengthen market-creation innovation and safety narrative.

**Acceptance:**
- Market card exports listing-ready JSON.
- Rejected gallery shows safety critic reasons.
- Public/shareable card URL is available if time permits.

---

## Demo spine

```txt
Local source
→ Agent graph
→ Critic/revision
→ Verified Market Card
→ Validator approval
→ USDC validator reward
→ Arc provenance
→ Live traction dashboard
```
