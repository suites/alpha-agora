# Alpha Agora User-perspective E2E Dogfood — 2026-05-11

## Scope

User-facing golden path as a first-time judge/user:

1. Open landing page
2. Generate a new Market Card from Korean source text
3. Inspect Agent Run Console / LangGraph trace
4. Select generated card in Validator workflow
5. Approve the card
6. Attempt Arc trace + USDC settlement
7. Try Needs Edit path
8. Cross-check API/provider state

## Evidence

- Initial page screenshot: MEDIA:/Users/fred/.hermes/cache/screenshots/browser_screenshot_e973b5b874e24bc2b1729955f8986db0.png
- Validator conflict screenshot: MEDIA:/Users/fred/.hermes/cache/screenshots/browser_screenshot_bc0143aa40cc4b34816ca774aaf32f01.png

## What worked well

- Landing page clearly explains the product thesis: Alpha Agora creates market-ready cards instead of being another trading bot.
- Judging weights are directly mapped to product evidence.
- LangGraph copy is understandable: source reading → drafting → critique → revision.
- Direct API generation succeeded and persisted an AgentRun with four steps:
  - SourceReaderAgent
  - MarketDraftAgent
  - CriticAgent
  - RevisionAgent
- Reloading the page showed the newly generated card in the live pipeline and validator list.
- Validator approve action worked and enabled settlement.
- Needs Edit action worked and updated metrics.
- No browser console JavaScript errors were observed during the tested interactions.

## Findings

### P0/P1 — Browser form submit did not update UI during the first live click path

When using the visible form and clicking Generate Market Card, the UI did not update the generated card or Agent Run Console in-session. Calling the same `/api/generate-card` endpoint from the browser context succeeded with HTTP 201 and returned a valid card + AgentRun.

Impact: a judge may click Generate and think nothing happened.

Expected: visible form submit updates the card preview, Agent Run Console, validator list, and metrics immediately.

Actual: direct endpoint worked, but the UI remained on the previous generated card until reload/direct API path.

### P1 — Agent Run Console is empty on reload even though latest AgentRun exists

After reload, the latest generated card is visible, but Agent Run Console still says “Generate a market card to persist and inspect the latest agent run.” `/api/generate-card` returns agentRuns, but the component only sets generatedCards and does not hydrate latestAgentRun from initial GET.

Impact: the proof UI for agent sophistication is hidden unless generation succeeds in the current React session.

Expected: show latest AgentRun by default, or select the run associated with the visible card.

### P1 — Settlement failed as provider unconfigured

Attempting “Commit trace + pay rewards” returned a visible provider error: `settlement provider unconfigured`.

Cross-check: `.env.local` has Circle keys/addresses, but `ARC_COMMITTER_PRIVATE_KEY` does not match the expected 0x + 64 hex format, so `shouldUseArc` returns false and settlement stops before Circle reward transfer.

Impact: judge-facing full Circle/Arc path is blocked locally.

Expected: either valid Arc config enables settlement, or UI clearly shows Arc provider preflight status before the user reaches settlement.

### P1 — Conflicting validator actions are allowed on the same card

I approved the generated card, attempted settlement, then clicked Needs Edit. The same card ended with two validations:

- APPROVE, reward 0.05
- NEEDS_EDIT, reward 0.01

UI status became VALIDATING with `0.06 USDC queued`.

Impact: state becomes ambiguous and settlement reward math is questionable.

Expected: after an approval creates a queued reward, either lock verdict changes until revision/versioning, or mark the card as a validation conflict and block settlement.

### P2 — Needs Edit reused approval rationale

The default validator comment “Official source and deadline are clear enough for validator approval.” was used for both APPROVE and NEEDS_EDIT.

Impact: audit log becomes self-contradictory.

Expected: Needs Edit should require an edit-specific reason, or default text should change by verdict.

### P2 — Metrics wording mixes card state and action state

Top validator counters show Approved / Rejected / Needs edit / Pending, while one card can accumulate multiple validation actions and remain VALIDATING.

Impact: user cannot tell whether counts represent cards, actions, or latest state.

Expected: either count latest card states only, or relabel as validator actions.

## Cross-check results

- `/api/generate-card`: generatedCards=2, agentRuns=3 in current local runtime.
- Latest API AgentRun steps: SourceReaderAgent → MarketDraftAgent → CriticAgent → RevisionAgent.
- `/api/validate-card` for generated card showed status VALIDATING, validations `[APPROVE:0.05, NEEDS_EDIT:0.01]`, pending trace hash.
- `.env.local` provider presence check: Circle config present, Arc private key format invalid, so settlement provider is effectively unconfigured.

## Recommendation priority

1. Fix visible form submit / state propagation and show inline loading/success/error states.
2. Hydrate Agent Run Console from latest GET response on page load.
3. Add provider preflight panel: Arc configured? Circle configured? settlement possible?
4. Enforce verdict state machine: DRAFT → APPROVED / NEEDS_EDIT / REJECTED; prevent contradictory same-card mutations unless creating a new revision.
5. Make Needs Edit/Rejection comments verdict-specific and required.
