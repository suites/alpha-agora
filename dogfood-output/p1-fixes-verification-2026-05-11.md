# P1 Dogfood Fix Verification — 2026-05-11

## Fixed scope

Addressed the P1 issues found during user-perspective E2E dogfood:

1. Generate flow should update preview/validator/run console state.
2. Agent Run Console should hydrate from persisted runs after reload.
3. Validator cards should not accept contradictory verdicts after first final verdict.
4. Settlement should expose non-secret provider preflight before users click payout.

## Implementation summary

- `src/lib/market-agent-graph.ts`
  - Always persists the four visible LangGraph nodes: `SourceReaderAgent`, `MarketDraftAgent`, `CriticAgent`, `RevisionAgent`.
- `src/components/generated-card-workbench.tsx`
  - Hydrates latest generated card and matching `agentRun` from `GET /api/generate-card`.
  - Reload now shows the latest generated card plus Agent Run Console instead of an empty console.
- `src/app/api/validate-card/route.ts`
  - Rejects any new verdict once a card already has a final validation.
  - Rejects `NEEDS_EDIT` when the approval-oriented default comment is reused.
- `src/components/validator-board.tsx`
  - Disables APPROVE / NEEDS_EDIT / REJECT once a card has a final verdict.
  - Shows a clear “final validator verdict” lock message.
  - Fetches `GET /api/settle-card` and displays Arc/Circle provider preflight without secret values.
  - Disables settlement if preflight says the provider path is blocked.
- `src/lib/provider-env.ts`, `src/app/api/settle-card/route.ts`
  - Added non-secret provider preflight response.

## Verification

### Automated

```txt
pnpm test && pnpm build
```

Result:

```txt
12 test files passed
35 tests passed
Next.js build succeeded
```

### Browser dogfood

Generated card:

```txt
generated-d4988bb1
Will South Korea announce export management guidelines for core battery materials by October 31, 2026?
```

Observed:

- Preview updated after form submission.
- Agent Run Console showed persisted run `263d42c7-db6e-4521-8b1a-392da83078a8`.
- Console displayed 4 persisted steps:
  - `SourceReaderAgent`
  - `MarketDraftAgent`
  - `CriticAgent`
  - `RevisionAgent`
- Reload retained the generated card and Agent Run Console.
- After APPROVE, all verdict buttons were disabled.
- Contradictory `NEEDS_EDIT` API attempt returned `409` with `card validation already finalized`.
- Settlement button was disabled because preflight was blocked.
- Preflight showed:
  - Arc provider: `UNCONFIGURED`
  - Circle provider: `CONFIGURED`

No API keys, entity secrets, recovery file contents, connection strings, or private keys were printed.

## Remaining known limitation

Current local preflight blocks live settlement because `ARC_COMMITTER_PRIVATE_KEY` is missing/invalid in the active dev environment. This is now visible to the user before clicking settlement, rather than failing after click.
