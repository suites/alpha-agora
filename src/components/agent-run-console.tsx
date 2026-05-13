import type { AgentRun } from "@/lib/agent-run-store";

interface AgentRunConsoleProps {
  run: AgentRun | null;
}

export function AgentRunConsole({ run }: AgentRunConsoleProps) {
  return (
    <section id="agent-run-console" className="rounded-3xl border border-violet-300/20 bg-violet-300/[0.06] p-6 shadow-2xl shadow-violet-950/20 scroll-mt-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-300">Agent Run Console</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Every market card keeps its decision trace</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Each node output is shown instead of hiding the agent behind a single generated answer: input, output, confidence, rationale, and tool calls are persisted per run.
          </p>
        </div>
        {run ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Run ID</p>
            <p className="mt-1 max-w-64 truncate font-mono text-violet-100">{run.id}</p>
          </div>
        ) : null}
      </div>

      {run ? (
        <div className="space-y-3">
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <ConsoleStat label="Status" value={run.status} />
            <ConsoleStat label="Provider" value={run.provider} />
            <ConsoleStat label="Steps persisted" value={String(run.steps.length)} />
          </div>
          <ol className="space-y-3">
            {run.steps.map((step) => (
              <li key={step.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-violet-300/15 px-3 py-1 text-xs font-bold text-violet-100">
                    {step.sequence}. {step.nodeName}
                  </span>
                  <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                    {step.status}
                  </span>
                  <span className="rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-semibold text-cyan-200">
                    confidence {(step.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{step.rationale}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <JsonPreview label="input" value={step.input} />
                  <JsonPreview label="output" value={step.output} />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  toolCalls: {step.toolCalls.length > 0 ? step.toolCalls.join(", ") : "none"}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
          Generate a market card to persist and inspect the latest agent run.
        </div>
      )}
    </section>
  );
}

function ConsoleStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function JsonPreview({ label, value }: { label: string; value: Record<string, unknown> }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
