# Realistic User Fixture Performance Verification — 2026-05-12

## Scope

Added automated coverage for realistic user-like Market Card Agent inputs across Korean, Japanese, and Chinese sources. The fixtures model mobile copy/paste, community/analyst chatter, policy watchers, macro traders, game industry users, crypto operators, and EV/semiconductor observers.

## Fixture coverage

- 12 generation fixtures total
- Regions/languages:
  - KR / ko: 4
  - JP / ja: 4
  - CN / zh: 4
- Categories:
  - AI Policy
  - Macro
  - Semiconductors
  - EV Policy
  - Gaming / Internet
  - Crypto Policy
- Edge cases:
  - Messy whitespace from mobile/news copy-paste
  - Local-language text with explicit category hints
  - Rumor/chatter inputs converted to official-source resolution rules
  - Duplicate normalized input semantics check

## Automated assertions

`src/lib/user-fixture-performance.test.ts` verifies each fixture produces a card with:

- Unique deterministic card ID
- Expected region/language/category
- Binary `Will ... before ...?` question format
- At least 2 official resolution sources
- At least 3 edge cases
- Minimum final score appropriate for the fixture
- Pending Arc trace hash
- Full LangGraph node trace:
  - `SourceReaderAgent`
  - `MarketDraftAgent`
  - `CriticAgent`
  - `RevisionAgent`

## Performance budget

Demo deterministic path budget enforced in test:

- Single fixture generation: `< 300ms`
- Average fixture generation: `< 125ms`

Observed targeted run:

```txt
pnpm test src/lib/user-fixture-performance.test.ts
✓ src/lib/user-fixture-performance.test.ts (2 tests) 33ms
Duration 390ms including Vitest startup/import overhead
```

Observed full verification:

```txt
pnpm test && pnpm lint && pnpm build
Test Files 17 passed (17)
Tests 50 passed (50)
Vitest duration 2.56s
ESLint passed
Next production build passed
```

## Browser smoke

- `http://localhost:3000/` rendered successfully
- Browser console after navigation: 0 console messages, 0 JS errors

## Notes

- Tests force `LLM_PROVIDER=demo` and clear Gemini API env inside the test so the performance budget measures the deterministic demo path, not network-dependent LLM latency.
- The fixture suite is reusable as a regression corpus when enabling real Gemini quality tests later.
