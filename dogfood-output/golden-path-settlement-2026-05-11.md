# Golden Path Settlement Verification — 2026-05-11

## Scenario

Executed the full Alpha Agora demo path after funding the Arc committer wallet:

1. Generate Market Card
2. Persist AgentRun trace
3. Validator APPROVE
4. Commit reasoning trace to Arc Testnet
5. Settle validator reward via Circle Wallets sandbox
6. Verify provider state, balances, and UI/API output

## Result

Status: success

Generated card:

```txt
cardId: generated-4ce6087
question: Will the Ministry of Trade, Industry and Energy revise the advanced semiconductor equipment export control guidelines by November 30, 2026?
status: APPROVED
```

Agent run:

```txt
runId: 72f34f43-1356-42df-a5c3-ab3dce8df8ae
steps:
- SourceReaderAgent
- MarketDraftAgent
- CriticAgent
- RevisionAgent
```

Arc trace receipt:

```txt
network: arc-testnet
status: SUCCESS
traceHash: 0xbd951891da971e7929973f52ac14b840a622e2163ed506b2c2de8a27d51243c7
txHash: 0x435448b5961e6e20cb95940c01267f8162135ef885f5078a61064ba69156a10b
```

Arc RPC verification:

```txt
transaction status: 0x1
blockNumber: 0x27cd265
gasUsed: 0x6798
committer balance after settlement: 19.999469573479998985
```

Circle reward receipt:

```txt
network: circle-wallets-sandbox
status: SUCCESS
validator: HackathonValidator
amountUsdc: 0.05
txHash: 068db8a9-2398-5a46-a47d-837b670f4c3d
```

Circle balance after settlement:

```txt
USDC / ARC-TESTNET: 39.997978373749657
```

## Fix discovered during verification

The backend settlement result returned the correct `traceReceipt.network = arc-testnet`, but the persisted card trace did not copy the network field. The UI could fall back to seed-card wording after reload.

Patched:

- `src/lib/market-card.ts` — added optional `trace.arcNetwork`
- `src/lib/settlement-adapters.ts` — persists `arcNetwork: traceReceipt.network`
- `src/app/api/settle-card/route.test.ts` — isolates the unconfigured-provider test from live local env values

Verification after patch:

```txt
pnpm test && pnpm build
12 test files passed
35 tests passed
Next.js build succeeded
```

## Secrets

No API keys, entity secrets, private keys, recovery file contents, or database connection strings were written to this report.
