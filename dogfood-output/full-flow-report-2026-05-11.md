# Alpha Agora Full-Flow Dogfood Report — 2026-05-11

## Scope

실제 사용자/해커톤 심사위원처럼 다음 플로우를 직접 수행했다.

1. 첫 화면/포지셔닝 이해
2. Live Agent Pipeline에서 한국어 원문 입력 → Market Card 생성
3. 생성 카드가 Validator Workflow로 이어지는지 확인
4. Validator 카드 선택
5. APPROVE → Commit trace + pay rewards
6. NEEDS_EDIT
7. REJECT
8. Dashboard metrics / Seed cards / Submission sections 확인
9. API 상태와 Circle ARC-TESTNET USDC 잔액 변화 검증

## Evidence

- First-screen annotated review screenshot: `/Users/fred/.hermes/cache/screenshots/browser_screenshot_9ec17fa8215b4a679b5a30721cc4c8f6.png`
- Post-validation/settlement screenshot: `/Users/fred/.hermes/cache/screenshots/browser_screenshot_ab513ca12e114c71b75585e87eeac9d6.png`

## Golden Path Result

### Input

```text
Source URL: https://example.com/seoul-autonomous-night-bus
Category hint: Transportation
Source excerpt: 서울시가 2026년 6월까지 심야 자율주행버스 운행 구간을 강남권으로 확대할지 여부를 다음 달 교통위원회 안건으로 상정할 예정이다.
```

### Generated Market Card

```text
Question: Will Seoul expand its autonomous night bus service to the Gangnam area by June 2026?
Status: DRAFT
Score: 70
Resolution: 2026-06-30 · Asia/Seoul
Sources: Seoul Metropolitan Government official announcements / MOLIT regulations
Trace draft: 0xtrace9699f33b...
```

### Settlement

After approving and clicking `Commit trace + pay rewards`, the UI showed a reward transaction.

```text
Reward tx: 45e4cf0d-92c5-5b97-9feb-fec57bbc2258
```

Circle balance changed again after this run:

```text
USDC / ARC-TESTNET: 39.998429873749657
```

This confirms the Circle reward transfer path is provider-backed enough to spend testnet balance.

## Validation State After Exploration

API `/api/validate-card` returned:

```json
{
  "approved": 13,
  "rejected": 1,
  "needsEdit": 1,
  "pending": 12,
  "rewardsQueuedUsdc": 0.11
}
```

Notable cards:

- `generated-4cd513f1` — autonomous night bus card
  - Status became `VALIDATING`
  - Contains both an `APPROVE` validation with reward tx and a later `NEEDS_EDIT` validation
- `kr-samsung-hbm4`
  - Status became `REJECTED`
  - REJECT flow works

## What Worked Well

1. **Core concept lands well for hackathon judges**
   - “Not another AI trading bot; creates market candidates” is strong.
   - The product has a clear upstream-market-supply angle.

2. **Generated card quality is demo-good**
   - Korean local event became a usable binary market question.
   - Deadline, timezone, resolution sources, score, and agent decisions appeared immediately.

3. **Validator actions are clear**
   - APPROVE / NEEDS_EDIT / REJECT are visually obvious.
   - Card statuses update and metrics reflect the state.

4. **Circle reward settlement now works**
   - Earlier insufficient balance blocker is gone after faucet funding.
   - Settlement returns a reward tx id and Circle balance decreases.

5. **No browser console errors observed**
   - Page load and tested interactions did not produce JS console errors.

## UX / Product Issues Found

### P1 — Generated card does not appear in Validator Workflow until refresh

After generating a new card, the right preview updates immediately, but the Human Validator Workflow list does not refresh live. The generated card was present in the API, but I had to reload the page before it appeared in the validator list.

**Impact:** This breaks the perceived end-to-end flow. A real user expects `Generate` → `Validate` to be continuous.

**Recommendation:** After successful generation, either:

- emit/update shared state consumed by `ValidatorBoard`, or
- add a `Refresh validator queue` button, or
- fetch `/api/validate-card` again after generation.

### P1 — Settled/approved card can be validated again into NEEDS_EDIT

I approved and settled the generated card, then was still able to apply `NEEDS_EDIT` to the same card. The card ended up with both:

- an APPROVE validation with reward tx
- a later NEEDS_EDIT validation

and final status became `VALIDATING`.

**Impact:** This can invalidate the meaning of a paid reward and settled trace. It creates confusing state: settled but no longer approved.

**Recommendation:** Add state guards:

- If a card has settled reward/trace, disable further verdict actions unless using an explicit `Reopen` flow.
- Or create a new revision/version for edits after settlement.

### P1 — Top dashboard metrics do not reflect live in-memory state

The top metrics stayed around:

```text
Generated cards: 20
Validated: 9
Arc traces: 9
Rewards: 0.41
```

while the validator workflow metrics showed updated values like approved/rejected/needs-edit. This suggests the top summary is based on static seed data, while ValidatorBoard uses API state.

**Impact:** Judges may see contradictory traction numbers.

**Recommendation:** Make top dashboard metrics fetch live store state too, or label them as seed baseline.

### P2 — First screen lacks a strong primary CTA

The hero explains the product well, but there is no direct `Start demo` / `Generate a card` button in the hero. The real action is lower on the page.

**Recommendation:** Add hero buttons:

- `Try live pipeline`
- `Review validator workflow`

### P2 — Too many internal terms without micro-explanations

Terms like `local alpha`, `resolution-ready`, `Arc trace`, `adapter boundary`, `trace commitment`, `seed cards` are useful for judges but heavy for first-time users.

**Recommendation:** Add short helper copy near each concept.

### P2 — Current selected validator card is not obvious enough

The selected card has styling, but in a dense list it could be clearer.

**Recommendation:** Add a `Selected` pill or stronger active border/background.

### P2 — Settlement panel only shows current selected card

After selecting a rejected card, the settlement panel shows pending values, while a separate `Settlement proof` area shows proof for another featured card. This can feel inconsistent.

**Recommendation:** For each selected card, show whether it is:

- not eligible
- approved, not settled
- settled with receipt
- rejected/needs edit

## Integration Reality Check

- Generation is currently deterministic/local adapter by default, not necessarily live LLM-backed.
- Arc trace is still mock/testnet-shaped: `arc-testnet-mock`.
- Circle reward settlement is live sandbox/testnet provider-backed and affects ARC-TESTNET USDC balance.
- Storage is in-memory, so state is demo-session only.

## Overall Feeling

The demo is much stronger now that Circle reward settlement actually moves testnet balance. The end-to-end story is credible:

> local Korean event → market card → human validation → reasoning trace → USDC reward

As a user, the concept feels differentiated and hackathon-appropriate. The main weakness is not backend capability anymore; it is **flow continuity and state clarity**. The app currently feels like a polished one-page hackathon dashboard plus working widgets, not yet a fully guided product workflow.

If we fix only two things before a demo video, fix these:

1. Generated card should instantly appear/select in Validator Workflow without reload.
2. Prevent post-settlement re-validation or introduce explicit card revisions.

After that, add a hero CTA and clearer live metrics. Then the demo should feel much more coherent.
