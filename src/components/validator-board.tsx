"use client";

import { useEffect, useState } from "react";

import { buildArcExplorerUrl } from "@/lib/arc-explorer";
import type { DashboardMetrics, MarketCard, ValidationVerdict } from "@/lib/market-card";
import type { ArcTraceReceipt, RewardReceipt } from "@/lib/settlement-adapters";
import type { ValidatorMetrics } from "@/lib/validation-workflow";

const defaultMetrics: ValidatorMetrics = {
  approved: 0,
  rejected: 0,
  needsEdit: 0,
  pending: 0,
  rewardsQueuedUsdc: 0,
};

const verdictStyles: Record<ValidationVerdict, string> = {
  APPROVE: "bg-emerald-300 text-slate-950 hover:bg-emerald-200",
  NEEDS_EDIT: "bg-amber-300 text-slate-950 hover:bg-amber-200",
  REJECT: "bg-rose-300 text-slate-950 hover:bg-rose-200",
};

function hasSettlementProof(card: MarketCard): boolean {
  return Boolean(card.trace.arcTxHash || card.validations.some((validation) => validation.rewardTxHash));
}

function computeDashboardMetricsFromCards(cards: MarketCard[]): DashboardMetrics {
  const validated = cards.filter((card) => card.validations.length > 0).length;
  const arcTracesCommitted = cards.filter((card) => card.trace.arcTxHash).length;
  const rewardsPaidUsdc = cards.reduce(
    (sum, card) => sum + card.validations.reduce((validationSum, validation) => validationSum + (validation.rewardTxHash ? validation.rewardUsdc : 0), 0),
    0,
  );
  const averageFinalScore = cards.length
    ? Math.round(cards.reduce((sum, card) => sum + card.scores.final, 0) / cards.length)
    : 0;

  return {
    generated: cards.length,
    validated,
    rejected: cards.filter((card) => card.status === "REJECTED").length,
    rewardsPaidUsdc: Number(rewardsPaidUsdc.toFixed(2)),
    arcTracesCommitted,
    averageFinalScore,
  };
}

interface SettlementResponse {
  card: MarketCard;
  traceReceipt: ArcTraceReceipt;
  rewardReceipts: RewardReceipt[];
}

interface SettlementPreflight {
  settlementPossible: boolean;
  providers: {
    arc: { configured: boolean; reason?: string };
    circle: { configured: boolean; reason?: string };
  };
}

interface ValidatorBoardProps {
  refreshToken?: number;
  selectedCardId?: string | null;
  onDashboardMetricsChange?: (metrics: DashboardMetrics) => void;
}

interface AuthSessionResponse {
  authenticated: boolean;
  session?: { email: string; name: string; picture?: string; provider: "google" };
}

export function ValidatorBoard({ refreshToken = 0, selectedCardId: requestedSelectedCardId, onDashboardMetricsChange }: ValidatorBoardProps) {
  const [cards, setCards] = useState<MarketCard[]>([]);
  const [metrics, setMetrics] = useState<ValidatorMetrics>(defaultMetrics);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [comment, setComment] = useState("Official source and deadline are clear enough for validator approval.");
  const [editedQuestion, setEditedQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<SettlementResponse | null>(null);
  const [preflight, setPreflight] = useState<SettlementPreflight | null>(null);
  const [auth, setAuth] = useState<AuthSessionResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/validate-card")
      .then((response) => response.json())
      .then((body: { cards?: MarketCard[]; metrics?: ValidatorMetrics; dashboardMetrics?: DashboardMetrics }) => {
        if (!isMounted) return;
        const boardCards = body.cards ?? [];
        setCards(boardCards);
        setMetrics(body.metrics ?? defaultMetrics);
        if (body.dashboardMetrics) onDashboardMetricsChange?.(body.dashboardMetrics);
        setSelectedCardId((currentSelectedCardId) => {
          const requestedCard = requestedSelectedCardId
            ? boardCards.find((card) => card.id === requestedSelectedCardId)
            : null;
          if (requestedCard) return requestedCard.id;
          if (currentSelectedCardId && boardCards.some((card) => card.id === currentSelectedCardId)) {
            return currentSelectedCardId;
          }
          return boardCards.find((card) => card.status !== "APPROVED")?.id ?? boardCards[0]?.id ?? null;
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Could not load validator board.");
      });

    return () => {
      isMounted = false;
    };
  }, [refreshToken, requestedSelectedCardId, onDashboardMetricsChange]);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/settle-card")
      .then((response) => response.json())
      .then((body: SettlementPreflight) => {
        if (!isMounted) return;
        setPreflight(body);
      })
      .catch(() => {
        if (!isMounted) return;
        setPreflight({
          settlementPossible: false,
          providers: {
            arc: { configured: false, reason: "preflight unavailable" },
            circle: { configured: false, reason: "preflight unavailable" },
          },
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/google?action=session")
      .then((response) => response.json())
      .then((body: AuthSessionResponse) => {
        if (isMounted) setAuth(body);
      })
      .catch(() => {
        if (isMounted) setAuth({ authenticated: false });
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? cards[0] ?? null;
  const selectedCardIsSettled = selectedCard ? hasSettlementProof(selectedCard) : false;
  const selectedCardIsFinalized = selectedCard ? selectedCard.validations.length > 0 : false;
  const settlementBlockedByPreflight = preflight ? !preflight.settlementPossible : false;
  const selectedCardSettlement = settlement?.card.id === selectedCard?.id ? settlement : null;
  const arcTxHash = selectedCardSettlement?.traceReceipt.txHash ?? selectedCard?.trace.arcTxHash;
  const arcExplorerUrl = buildArcExplorerUrl(process.env.NEXT_PUBLIC_ARC_EXPLORER_URL ?? "https://testnet.arcscan.app", arcTxHash);

  async function submitVerdict(verdict: ValidationVerdict) {
    if (!selectedCard) return;
    const verdictComment = commentForVerdict(verdict, comment);

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/validate-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: selectedCard.id,
          validator: auth?.session?.name ?? "HackathonValidator",
          verdict,
          comment: verdictComment,
          editedQuestion: editedQuestion || undefined,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Validation failed");
      }

      setCards(body.cards ?? []);
      setMetrics(body.metrics ?? defaultMetrics);
      if (body.dashboardMetrics) onDashboardMetricsChange?.(body.dashboardMetrics);
      setSelectedCardId(body.card.id);
      setSettlement(null);
      setEditedQuestion("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown validation error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function settleCard() {
    if (!selectedCard) return;

    setIsSettling(true);
    setError(null);

    try {
      const response = await fetch("/api/settle-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: selectedCard.id }),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Settlement failed");
      }

      setSettlement(body as SettlementResponse);
      setCards((currentCards) => currentCards.map((card) => (card.id === body.card.id ? body.card : card)));
      onDashboardMetricsChange?.(computeDashboardMetricsFromCards(cards.map((card) => (card.id === body.card.id ? body.card : card))));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown settlement error");
    } finally {
      setIsSettling(false);
    }
  }

  return (
    <section className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.06] p-6 shadow-2xl shadow-emerald-950/20">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
            Human validator workflow
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            Approve, reject, or request edits before reward settlement
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            {auth?.authenticated ? (
              <>
                <span className="rounded-full border border-emerald-300/30 bg-emerald-300/[0.08] px-3 py-1 text-emerald-100">
                  Google validator: {auth.session?.name}
                </span>
                <a className="text-slate-400 underline decoration-slate-500 underline-offset-4" href="/api/auth/google?action=logout">
                  Sign out
                </a>
              </>
            ) : (
              <a className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 font-semibold text-white hover:bg-white/[0.09]" href="/api/auth/google">
                Sign in with Google for validator identity
              </a>
            )}
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2 text-center text-xs sm:min-w-[560px]">
          <Metric label="Approved" value={metrics.approved} />
          <Metric label="Rejected" value={metrics.rejected} />
          <Metric label="Needs edit" value={metrics.needsEdit} />
          <Metric label="Pending" value={metrics.pending} />
          <Metric label="USDC queued" value={metrics.rewardsQueuedUsdc.toFixed(2)} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          {cards.slice(0, 12).map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedCardId(card.id)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                selectedCard?.id === card.id
                  ? "border-emerald-300/60 bg-emerald-300/10"
                  : "border-white/10 bg-white/[0.035] hover:bg-white/[0.07]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-emerald-200">
                  {card.source.region} · {card.category}
                </span>
                <span className="rounded-full bg-slate-300/15 px-2 py-1 text-[11px] font-semibold text-slate-200">
                  {card.status}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-white">{card.question}</p>
            </button>
          ))}
        </div>

        <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          {selectedCard ? (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-semibold text-cyan-200">
                  Score {selectedCard.scores.final}
                </span>
                <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                  {selectedCard.validations.length} validations
                </span>
                <span className="rounded-full bg-slate-300/15 px-3 py-1 text-xs font-semibold text-slate-200">
                  {selectedCard.status}
                </span>
                {selectedCardIsSettled ? (
                  <span className="rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-semibold text-cyan-100">
                    Settled proof locked
                  </span>
                ) : null}
              </div>
              <h3 className="mt-4 text-2xl font-semibold leading-8 text-white">{selectedCard.question}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{selectedCard.source.summaryEn}</p>

              <label className="mt-5 block text-sm font-semibold text-slate-200" htmlFor="validator-comment">
                Validator comment
              </label>
              <textarea
                id="validator-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none ring-emerald-300/40 transition focus:ring-2"
              />

              <label className="mt-4 block text-sm font-semibold text-slate-200" htmlFor="edited-question">
                Optional edited question
              </label>
              <input
                id="edited-question"
                value={editedQuestion}
                onChange={(event) => setEditedQuestion(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none ring-emerald-300/40 transition focus:ring-2"
                placeholder={selectedCard.question}
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {(["APPROVE", "NEEDS_EDIT", "REJECT"] as ValidationVerdict[]).map((verdict) => (
                  <button
                    key={verdict}
                    type="button"
                    disabled={isSubmitting || selectedCardIsSettled || selectedCardIsFinalized}
                    onClick={() => submitVerdict(verdict)}
                    className={`rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:bg-slate-500 ${verdictStyles[verdict]}`}
                  >
                    {verdict}
                  </button>
                ))}
              </div>
              {selectedCardIsSettled ? (
                <p className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-3 text-sm leading-6 text-cyan-100">
                  This card already has settlement proof. Create a revised card for changes instead of overwriting validator history.
                </p>
              ) : selectedCardIsFinalized ? (
                <p className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 text-sm leading-6 text-emerald-100">
                  This card already has a final validator verdict. Create a revised card for contradictory approval/edit/reject changes.
                </p>
              ) : null}
              {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}

              <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                      Arc trace + USDC settlement
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      Commit reasoning trace to the Arc adapter and settle queued validator rewards.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSettling || selectedCard.status !== "APPROVED" || selectedCardIsSettled || settlementBlockedByPreflight}
                    onClick={settleCard}
                    className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                  >
                    {isSettling ? "Settling..." : "Commit trace + pay rewards"}
                  </button>
                </div>
                <div className="mt-4 grid gap-3 text-xs md:grid-cols-2">
                  <ReceiptLine label="Arc provider" value={preflight ? `${preflight.providers.arc.configured ? "CONFIGURED" : "UNCONFIGURED"}${preflight.providers.arc.reason ? ` · ${preflight.providers.arc.reason}` : ""}` : "checking..."} />
                  <ReceiptLine label="Circle provider" value={preflight ? `${preflight.providers.circle.configured ? "CONFIGURED" : "UNCONFIGURED"}${preflight.providers.circle.reason ? ` · ${preflight.providers.circle.reason}` : ""}` : "checking..."} />
                  <ReceiptLine label="Trace hash" value={selectedCardSettlement?.traceReceipt.traceHash ?? selectedCard.trace.traceHash} />
                  <ReceiptLine label="Arc tx" value={arcTxHash} href={arcExplorerUrl} />
                  <ReceiptLine label="Arc network" value={selectedCardSettlement?.traceReceipt.network ?? selectedCard.trace.arcNetwork} />
                  <ReceiptLine
                    label="Reward tx"
                    value={selectedCardSettlement?.rewardReceipts[0]?.txHash ?? selectedCard.validations.find((validation) => validation.rewardTxHash)?.rewardTxHash}
                  />
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {selectedCard.validations.slice(-3).map((validation, index) => (
                  <div key={`${validation.validator}-${index}`} className="rounded-xl bg-white/[0.035] px-4 py-3 text-sm">
                    <span className="font-semibold text-white">{validation.validator}</span>
                    <span className="text-slate-400"> · {validation.verdict} · {validation.comment}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-white/15 text-center text-sm text-slate-400">
              Generate a card or select a seed card to validate.
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

function commentForVerdict(verdict: ValidationVerdict, currentComment: string): string {
  const trimmed = currentComment.trim();
  const defaultApproval = "Official source and deadline are clear enough for validator approval.";
  if (verdict === "NEEDS_EDIT" && (!trimmed || trimmed === defaultApproval)) {
    return "Needs a sharper resolution source, deadline, or edge-case wording before approval.";
  }
  if (verdict === "REJECT" && (!trimmed || trimmed === defaultApproval)) {
    return "Rejected because the card is not resolution-ready enough for this market workflow.";
  }
  return trimmed;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
      <p className="font-bold text-white">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{label}</p>
    </div>
  );
}

function ReceiptLine({ label, value, href }: { label: string; value?: string; href?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2">
      <p className="font-semibold text-slate-400">{label}</p>
      {href && value ? (
        <a className="mt-1 block break-all font-mono text-[11px] text-cyan-100 underline decoration-cyan-300/40 underline-offset-4 hover:text-cyan-50" href={href} target="_blank" rel="noreferrer">
          {value}
        </a>
      ) : (
        <p className="mt-1 break-all font-mono text-[11px] text-cyan-100">{value ?? "pending"}</p>
      )}
    </div>
  );
}
