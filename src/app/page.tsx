const judgingMetrics = [
  {
    label: "Agentic Sophistication",
    weight: "30%",
    proof: "source reader → extractor → scorer → generator → critic",
  },
  {
    label: "Traction",
    weight: "30%",
    proof: "20+ seeded cards, validator actions, reward/trace counts",
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

const scores = [
  ["Market worthiness", 86],
  ["Resolution clarity", 91],
  ["Information asymmetry", 77],
  ["Ambiguity risk", 21],
];

const milestoneItems = [
  "Milestone 0: scaffold, plan, orchestration log, dashboard skeleton",
  "Milestone 1: domain model, 20 KR/JP/CN seed cards, scoring tests",
  "Milestone 2: generate-card API and deterministic agent pipeline",
  "Milestone 3: validator workflow and traction metrics",
  "Milestone 4: Arc trace + USDC reward adapters",
];

export default function Home() {
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

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
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
          <article className="rounded-3xl border border-white/10 bg-white/[0.055] p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-rose-400/15 px-3 py-1 text-sm font-semibold text-rose-200">
                KR Policy
              </span>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-200">
                Marketable: High
              </span>
              <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-sm font-semibold text-cyan-200">
                Trace ready
              </span>
            </div>
            <h2 className="mt-5 text-3xl font-semibold text-white">
              Will South Korea officially delay crypto taxation before Dec 31,
              2026?
            </h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-950/70 p-5">
                <p className="text-sm font-semibold text-slate-300">Resolution</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
                  <li>• Source: Ministry of Economy and Finance</li>
                  <li>• Backup: National Assembly bill status</li>
                  <li>• End date: 2026-12-31 23:59 KST</li>
                  <li>• Media reports alone do not count</li>
                </ul>
              </div>
              <div className="rounded-2xl bg-slate-950/70 p-5">
                <p className="text-sm font-semibold text-slate-300">Agent critic</p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  The phrase “reviewing” is not enough. The market should
                  resolve only on official enactment or announcement.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {scores.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 p-4">
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="mt-1 text-xs text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </article>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Settlement proof
              </p>
              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-300">Validator reward</dt>
                  <dd className="font-semibold text-white">0.05 testnet USDC</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-300">Reward status</dt>
                  <dd className="font-semibold text-emerald-200">Ready adapter</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-300">Arc trace</dt>
                  <dd className="font-semibold text-cyan-200">SHA-256 hash</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Build status
              </p>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                {milestoneItems.map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300" />
                    <span className={index === 0 ? "text-white" : "text-slate-400"}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
