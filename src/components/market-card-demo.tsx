"use client";

import { useCallback, useState } from "react";

import { AgentRunConsole } from "@/components/agent-run-console";
import { GeneratedCardWorkbench } from "@/components/generated-card-workbench";
import { ValidatorBoard } from "@/components/validator-board";
import type { AgentRun } from "@/lib/agent-run-store";
import type { DashboardMetrics, MarketCard } from "@/lib/market-card";

interface MarketCardDemoProps {
  initialMetrics: DashboardMetrics;
}

export function MarketCardDemo({ initialMetrics }: MarketCardDemoProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [latestAgentRun, setLatestAgentRun] = useState<AgentRun | null>(null);

  const handleCardGenerated = useCallback((card: MarketCard, agentRun?: AgentRun) => {
    setSelectedCardId(card.id);
    setLatestAgentRun(agentRun ?? null);
    setRefreshToken((token) => token + 1);
    window.setTimeout(() => {
      document.getElementById("agent-run-console")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, []);

  const handleDashboardMetricsChange = useCallback((nextMetrics: DashboardMetrics) => {
    setMetrics(nextMetrics);
  }, []);

  return (
    <>
      <section id="live-metrics" className="grid gap-4 md:grid-cols-5">
        <ScorePill label="Generated cards" value={metrics.generated} />
        <ScorePill label="Validated" value={metrics.validated} />
        <ScorePill label="Arc traces" value={metrics.arcTracesCommitted} />
        <ScorePill label="Avg final score" value={metrics.averageFinalScore} />
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
          <p className="text-2xl font-bold text-white">{metrics.rewardsPaidUsdc.toFixed(2)}</p>
          <p className="mt-1 text-xs text-emerald-200">live testnet USDC rewards</p>
        </div>
      </section>

      <GeneratedCardWorkbench onCardGenerated={handleCardGenerated} />

      <AgentRunConsole run={latestAgentRun} />

      <div id="validator-workflow" className="scroll-mt-6">
        <ValidatorBoard
          refreshToken={refreshToken}
          selectedCardId={selectedCardId}
          onDashboardMetricsChange={handleDashboardMetricsChange}
        />
      </div>
    </>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}
