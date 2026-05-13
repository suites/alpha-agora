import { MarketCardDemo } from "@/components/market-card-demo";
import {
  getDashboardMetrics,
  getFeaturedMarketCard,
  type MarketCard,
} from "@/lib/market-card";
import { listAllCardsPersisted } from "@/lib/market-store";

export const dynamic = "force-dynamic";

const judgingMetrics = [
  {
    label: "Agentic Sophistication",
    weight: "30%",
    proof: "source reader → extractor → scorer → generator → critic",
  },
  {
    label: "Traction",
    weight: "30%",
    proof: "persisted cards, validator actions, reward/trace counts",
  },
  {
    label: "Circle / Arc Usage",
    weight: "20%",
    proof: "USDC rewards and Arc reasoning trace commitments",
  },
  {
    label: "Innovation",
    weight: "20%",
    proof: "creates market candidates instead of another trading bot",
  },
];

const pipelineSteps = [
  "Non-English event",
  "Agent signal extraction",
  "Marketability scoring",
  "Resolution-ready card",
  "Human validation",
  "USDC reward",
  "Arc trace",
];

const milestoneItems = [
  "Milestone 0: scaffold, plan, orchestration log, dashboard skeleton",
  "Milestone 1: domain model, KR/JP/CN scoring tests",
  "Milestone 2: generate-card API and deterministic agent pipeline",
  "Milestone 3: validator workflow and traction metrics",
  "Milestone 4: Arc trace + USDC reward adapters",
  "Milestone 5: README, production readiness, final verification",
];

const submissionAssets = [
  "Production setup + env documentation",
  "Operational source-verification workflow",
  "24 passing test files / 80 passing tests",
  "Adapter boundaries ready for live Arc/Circle credentials",
];

function StatusBadge({ status }: { status: MarketCard["status"] }) {
  const styles: Record<MarketCard["status"], string> = {
    APPROVED: "bg-emerald-400/15 text-emerald-200",
    VALIDATING: "bg-cyan-400/15 text-cyan-200",
    DRAFT: "bg-slate-400/15 text-slate-200",
    REJECTED: "bg-rose-400/15 text-rose-200",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

export default async function Home() {
  const persistedCards = await listAllCardsPersisted();
  const metrics = getDashboardMetrics(persistedCards);
  const featured = persistedCards.length > 0 ? getFeaturedMarketCard(persistedCards) : null;
  const visibleCards = persistedCards.slice(0, 9);

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-10 sm:px-8 lg:px-10">
        <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.28),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.18),_transparent_32%)]" />

        <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
              Agora Agents Hackathon
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              Alpha Agora turns local alpha into market-ready cards.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
              A Market Card Agent that converts Korean, Japanese, and Chinese
              events into resolution-ready prediction market proposals, then
              coordinates human validators with USDC rewards and Arc trace logs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#live-pipeline"
                className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
              >
                Try live pipeline
              </a>
              <a
                href="#validator-workflow"
                className="rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.1]"
              >
                Review validator flow
              </a>
            </div>
            <nav className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-300" aria-label="Demo sections">
              <a href="#live-metrics" className="rounded-full bg-white/[0.06] px-3 py-1 hover:text-white">Live metrics</a>
              <a href="#live-pipeline" className="rounded-full bg-white/[0.06] px-3 py-1 hover:text-white">Generate</a>
              <a href="#validator-workflow" className="rounded-full bg-white/[0.06] px-3 py-1 hover:text-white">Validate</a>
              <a href="#agent-run-console" className="rounded-full bg-white/[0.06] px-3 py-1 hover:text-white">Run console</a>
              <a href="#agent-workflow" className="rounded-full bg-white/[0.06] px-3 py-1 hover:text-white">Agent workflow</a>
              <a href="#generated-cards" className="rounded-full bg-white/[0.06] px-3 py-1 hover:text-white">Generated cards</a>
            </nav>
          </div>
          <div className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-5 text-sm text-cyan-100 md:w-72">
            <p className="font-semibold text-cyan-200">Core thesis</p>
            <p className="mt-2 leading-6">
              Not another AI trading bot. Alpha Agora creates the market cards
              that trading agents will trade on.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          {judgingMetrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-2xl border border-white/10 bg-white/[0.045] p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-white">{metric.label}</h2>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-bold text-emerald-200">
                  {metric.weight}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">{metric.proof}</p>
            </article>
          ))}
        </section>

        <MarketCardDemo initialMetrics={metrics} />

        <section id="agent-workflow" className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
                Agent workflow
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-white">
                From non-English source to Arc-committed reasoning trace
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-400">
              The MVP keeps infrastructure thin and focuses on a complete
              end-to-end workflow judges can inspect in one Market Card detail.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-7">
            {pipelineSteps.map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <span className="text-xs font-semibold text-cyan-300">
                  STEP {index + 1}
                </span>
                <p className="mt-3 text-sm font-medium text-white">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {featured ? (
          <article className="rounded-3xl border border-white/10 bg-white/[0.055] p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-rose-400/15 px-3 py-1 text-sm font-semibold text-rose-200">
                {featured.source.region} · {featured.category}
              </span>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-200">
                Final score {featured.scores.final}
              </span>
              <StatusBadge status={featured.status} />
            </div>
            <h2 className="mt-5 text-3xl font-semibold text-white">{featured.question}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Source: {featured.source.sourceName} · {featured.source.summaryEn}
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-950/70 p-5">
                <p className="text-sm font-semibold text-slate-300">Resolution</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
                  {featured.resolution.sources.slice(0, 2).map((source) => (
                    <li key={source}>• Source: {source}</li>
                  ))}
                  <li>
                    • End date: {featured.resolution.endDate} ({featured.resolution.timezone})
                  </li>
                  {featured.resolution.edgeCases.slice(0, 2).map((edgeCase) => (
                    <li key={edgeCase}>• {edgeCase}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-slate-950/70 p-5">
                <p className="text-sm font-semibold text-slate-300">Agent critic</p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {featured.criticNotes[0]}
                </p>
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-cyan-300">
                  {featured.agentDecisions[0]?.agent}: {featured.agentDecisions[0]?.decision}
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <ScorePill label="Resolution clarity" value={featured.scores.resolutionClarity} />
              <ScorePill label="Trading interest" value={featured.scores.tradingInterest} />
              <ScorePill label="Info asymmetry" value={featured.scores.informationAsymmetry} />
              <ScorePill label="Ambiguity risk" value={featured.scores.ambiguityRisk} />
            </div>
          </article>
          ) : (
            <article className="flex min-h-96 items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.035] p-6 text-center">
              <div>
                <h2 className="text-2xl font-semibold text-white">No persisted Market Cards yet</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                  Submit a reachable source URL in the live pipeline to create the first production card.
                </p>
              </div>
            </article>
          )}

          <aside className="space-y-6">
            <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Settlement proof
              </p>
              {featured ? (
                <dl className="mt-5 space-y-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-300">Validator reward</dt>
                    <dd className="font-semibold text-white">
                      {featured.validations[0]?.rewardUsdc.toFixed(2) ?? "0.00"} testnet USDC
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-300">Reward tx</dt>
                    <dd className="max-w-36 truncate font-semibold text-emerald-200">
                      {featured.validations[0]?.rewardTxHash ?? "pending"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-300">Arc trace</dt>
                    <dd className="max-w-36 truncate font-semibold text-cyan-200">
                      {featured.trace.arcTxHash ?? featured.trace.traceHash}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-5 text-sm leading-6 text-slate-300">
                  Settlement proof appears after a persisted card is validated and settled.
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Build status
              </p>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                {milestoneItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300" />
                    <span className="text-white">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>

        <section className="rounded-3xl border border-fuchsia-300/20 bg-fuchsia-300/[0.06] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-fuchsia-200">
                Submission readiness
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-white">
                Final assets are packaged for hackathon review
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-300">
              Operators can run the app, submit reachable source URLs, and inspect the full Market Card Agent workflow without secrets.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {submissionAssets.map((asset) => (
              <div key={asset} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <span className="text-lg text-fuchsia-200">✓</span>
                <p className="mt-3 text-sm font-semibold leading-6 text-white">{asset}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="generated-cards" className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
                Persisted Market Cards
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-white">
                Production cards ready for validator workflow
              </h2>
            </div>
            <p className="text-sm text-slate-400">
              Showing {visibleCards.length} of {persistedCards.length} cards
            </p>
          </div>
          {visibleCards.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {visibleCards.map((card) => (
              <article
                key={card.id}
                className="rounded-2xl border border-white/10 bg-slate-950/50 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-cyan-300">
                    {card.source.region} · {card.category}
                  </span>
                  <StatusBadge status={card.status} />
                </div>
                <h3 className="mt-4 line-clamp-3 text-base font-semibold leading-6 text-white">
                  {card.question}
                </h3>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                  {card.source.summaryEn}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
                  <span className="text-slate-400">Final score</span>
                  <span className="font-bold text-white">{card.scores.final}</span>
                </div>
              </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-white/15 text-center text-sm text-slate-400">
              No persisted cards in the database.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
