"use client";

import { FormEvent, useEffect, useState } from "react";

import type { AgentRun } from "@/lib/agent-run-store";
import type { MarketCard } from "@/lib/market-card";

const sampleSource =
  "정부가 AI 기본법 시행령과 고영향 AI 기준을 6월 말까지 공개하는 방안을 검토하고 있다.";

interface GeneratedCardWorkbenchProps {
  onCardGenerated?: (card: MarketCard, agentRun?: AgentRun) => void;
}

export function GeneratedCardWorkbench({ onCardGenerated }: GeneratedCardWorkbenchProps) {
  const [sourceText, setSourceText] = useState(sampleSource);
  const [sourceUrl, setSourceUrl] = useState("https://example.com/kr/ai-basic-act-update");
  const [categoryHint, setCategoryHint] = useState("AI Policy");
  const [generatedCards, setGeneratedCards] = useState<MarketCard[]>([]);
  const [activeCard, setActiveCard] = useState<MarketCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/generate-card")
      .then((response) => response.json())
      .then((body: { generatedCards?: MarketCard[]; agentRuns?: AgentRun[] }) => {
        if (!isMounted) return;
        setGeneratedCards(body.generatedCards ?? []);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Could not load generated cards yet. Try submitting a source.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText, sourceUrl, categoryHint }),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to generate market card");
      }

      setActiveCard(body.card);
      setGeneratedCards(body.generatedCards ?? [body.card]);
      onCardGenerated?.(body.card, body.agentRun);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown generation error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const visibleCard = activeCard ?? generatedCards[0] ?? null;

  return (
    <section id="live-pipeline" className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.06] p-6 shadow-2xl shadow-cyan-950/20 scroll-mt-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Live agent pipeline
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            Generate a resolution-ready Market Card from local-language input
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            "Resolution-ready" means the card already includes the binary question, end date, official sources, and edge cases validators need.
          </p>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-400">
          LangGraph orchestrates source reading, drafting, critique, and revision; the draft node can use Gemini or deterministic fallback behind the same graph interface.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <label className="block text-sm font-semibold text-slate-200" htmlFor="source-url">
            Source URL
          </label>
          <input
            id="source-url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none ring-cyan-300/40 transition focus:ring-2"
            placeholder="https://local-news.example/article"
          />

          <label className="block text-sm font-semibold text-slate-200" htmlFor="category-hint">
            Category hint
          </label>
          <input
            id="category-hint"
            value={categoryHint}
            onChange={(event) => setCategoryHint(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none ring-cyan-300/40 transition focus:ring-2"
            placeholder="AI Policy, Macro, Crypto..."
          />

          <label className="block text-sm font-semibold text-slate-200" htmlFor="source-text">
            Local-language source excerpt
          </label>
          <textarea
            id="source-text"
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            rows={7}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none ring-cyan-300/40 transition focus:ring-2"
            placeholder="Paste Korean, Japanese, or Chinese source text..."
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isSubmitting ? "Generating..." : "Generate Market Card"}
          </button>
          {error ? <p className="text-sm text-rose-200">{error}</p> : null}
        </form>

        <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          {visibleCard ? (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-semibold text-cyan-200">
                  {visibleCard.source.region} · {visibleCard.source.language}
                </span>
                <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Score {visibleCard.scores.final}
                </span>
                <span className="rounded-full bg-slate-300/15 px-3 py-1 text-xs font-semibold text-slate-200">
                  {visibleCard.status}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-semibold leading-8 text-white">{visibleCard.question}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{visibleCard.source.summaryEn}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Resolution</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {visibleCard.resolution.endDate} · {visibleCard.resolution.timezone}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {visibleCard.resolution.sources.join(" / ")}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">Trace draft</p>
                  <p className="mt-2 truncate text-sm font-semibold text-emerald-100">
                    {visibleCard.trace.traceHash}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Arc commit remains pending until validator approval.</p>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                {visibleCard.agentDecisions.map((decision) => (
                  <div key={decision.agent} className="rounded-xl bg-white/[0.035] px-4 py-3 text-sm">
                    <span className="font-semibold text-white">{decision.agent}</span>
                    <span className="text-slate-400"> · {decision.decision} · {decision.rationale}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-white/15 text-center text-sm text-slate-400">
              Submit a source excerpt to generate the first draft card.
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
