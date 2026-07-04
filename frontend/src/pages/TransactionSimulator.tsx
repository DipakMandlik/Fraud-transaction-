import { useQuery } from "@tanstack/react-query";
import { Play, Radio, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { CustomerNotification } from "@/components/simulator/CustomerNotification";
import { PaymentInterception } from "@/components/simulator/PaymentInterception";
import { PipelineFlow } from "@/components/simulator/PipelineFlow";
import { RuleExecutionPanel } from "@/components/simulator/RuleExecutionPanel";
import { Badge, riskTone, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RiskGauge } from "@/components/ui/RiskGauge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useNotifications } from "@/hooks/useNotifications";
import { demoApi, transactionsApi } from "@/lib/api";
import { cn, formatCurrency, titleCase } from "@/lib/utils";
import { PIPELINE_STAGES, type Transaction } from "@/types";

const RULE_ENGINE_STAGE = PIPELINE_STAGES.indexOf("Rule Engine");
const BEHAVIOR_STAGE = PIPELINE_STAGES.indexOf("Behavior Engine");
const RISK_STAGE = PIPELINE_STAGES.indexOf("Risk Engine");
const DECISION_STAGE = PIPELINE_STAGES.indexOf("Decision Engine");
const CORE_BANKING_STAGE = PIPELINE_STAGES.indexOf("Core Banking");
const COMPLETED_STAGE = PIPELINE_STAGES.indexOf("Completed");

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Phase = "idle" | "flowing" | "decision" | "intercepted" | "completed";

export default function TransactionSimulator() {
  const { enabled: demoMode, toggle: toggleDemoMode } = useDemoMode();
  const { onTransaction } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();

  const [txn, setTxn] = useState<Transaction | null>(null);
  const [stageIndex, setStageIndex] = useState(-1);
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);
  const [latencies, setLatencies] = useState<number[]>([]);
  const [revealedRuleCount, setRevealedRuleCount] = useState(0);
  const [riskCalculating, setRiskCalculating] = useState(false);
  const [interceptStep, setInterceptStep] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [caseSteps, setCaseSteps] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [autoPlayLive, setAutoPlayLive] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);

  const runToken = useRef(0);
  const isPlayingRef = useRef(false);
  const autoPlayLiveRef = useRef(autoPlayLive);
  autoPlayLiveRef.current = autoPlayLive;

  const scenariosQuery = useQuery({ queryKey: ["demo-scenarios"], queryFn: demoApi.scenarios });
  const recentQuery = useQuery({
    queryKey: ["transactions", "simulator-recent"],
    queryFn: () => transactionsApi.list({ page: 1, page_size: 8 }),
    refetchInterval: autoPlayLive ? false : 8000,
  });

  const speed = demoMode ? 1.5 : 1;

  const play = useCallback(
    async (transaction: Transaction) => {
      const myToken = ++runToken.current;
      const stillCurrent = () => runToken.current === myToken;
      isPlayingRef.current = true;

      setTxn(transaction);
      setStageIndex(-1);
      setStoppedAt(null);
      setLatencies([]);
      setRevealedRuleCount(0);
      setRiskCalculating(false);
      setInterceptStep(0);
      setShowNotification(false);
      setCaseSteps(0);
      setPhase("flowing");

      const isBlocked = transaction.status === "BLOCKED";
      const rules = transaction.rule_evaluations ?? [];

      for (let i = 0; i <= RULE_ENGINE_STAGE; i++) {
        if (!stillCurrent()) return;
        setStageIndex(i);
        setLatencies((prev) => [...prev, 8 + Math.random() * 55]);
        await wait(280 * speed);
      }

      for (let i = 0; i < rules.length; i++) {
        if (!stillCurrent()) return;
        setRevealedRuleCount(i + 1);
        await wait(140 * speed);
      }
      await wait(200 * speed);

      if (!stillCurrent()) return;
      setStageIndex(BEHAVIOR_STAGE);
      setLatencies((prev) => [...prev, 12 + Math.random() * 20]);
      await wait(320 * speed);

      if (!stillCurrent()) return;
      setStageIndex(RISK_STAGE);
      setRiskCalculating(true);
      await wait(450 * speed);
      if (!stillCurrent()) return;
      setRiskCalculating(false);
      setLatencies((prev) => [...prev, 5 + Math.random() * 15]);
      await wait(1300 * speed);

      if (!stillCurrent()) return;
      setStageIndex(DECISION_STAGE);
      setPhase("decision");
      await wait(600 * speed);

      if (isBlocked) {
        if (!stillCurrent()) return;
        setStoppedAt(DECISION_STAGE);
        await wait(300 * speed);
        setPhase("intercepted");
        for (let i = 1; i <= 4; i++) {
          if (!stillCurrent()) return;
          setInterceptStep(i);
          await wait(420 * speed);
        }
        await wait(400 * speed);
        if (!stillCurrent()) return;
        setShowNotification(true);
        await wait(500 * speed);
        for (let i = 1; i <= 3; i++) {
          if (!stillCurrent()) return;
          setCaseSteps(i);
          await wait(380 * speed);
        }
      } else {
        if (!stillCurrent()) return;
        setStageIndex(CORE_BANKING_STAGE);
        setLatencies((prev) => [...prev, 20 + Math.random() * 30]);
        await wait(400 * speed);
        if (!stillCurrent()) return;
        setStageIndex(COMPLETED_STAGE);
        setPhase("completed");
      }

      isPlayingRef.current = false;
    },
    [speed]
  );

  // Replay a specific transaction via ?replay=<id> (used by AlertDetail's Replay Incident button)
  useEffect(() => {
    const replayId = searchParams.get("replay");
    if (!replayId) return;
    transactionsApi.get(Number(replayId)).then((t) => play(t));
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("replay");
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-play mode: animate live transactions as they stream in over the WebSocket.
  useEffect(() => {
    const unsubscribe = onTransaction((incoming) => {
      if (!autoPlayLiveRef.current || isPlayingRef.current) return;
      play(incoming as Transaction);
    });
    return unsubscribe;
  }, [onTransaction, play]);

  async function handleTriggerScenario(code: string) {
    setTriggering(code);
    try {
      const result = await demoApi.trigger(code);
      const primary = result.transactions[result.transactions.length - 1];
      await play(primary);
      recentQuery.refetch();
    } finally {
      setTriggering(null);
    }
  }

  return (
    <AppLayout title="Transaction Simulator" subtitle="Watch a payment travel through the fraud detection architecture, live">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={autoPlayLive ? "primary" : "outline"}
            size="sm"
            onClick={() => setAutoPlayLive((prev) => !prev)}
          >
            <Radio className="h-4 w-4" />
            {autoPlayLive ? "Watching Live Feed" : "Watch Live Feed"}
          </Button>
          <Button variant={demoMode ? "success" : "outline"} size="sm" onClick={toggleDemoMode}>
            <Sparkles className="h-4 w-4" />
            Presentation Mode: {demoMode ? "On (20-30s cadence)" : "Off"}
          </Button>
        </div>
        {txn && (
          <Button variant="outline" size="sm" onClick={() => play(txn)}>
            <RotateCcw className="h-4 w-4" /> Replay This Transaction
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Incident Library</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {scenariosQuery.data?.map((scenario) => (
                  <button
                    key={scenario.code}
                    disabled={triggering !== null}
                    onClick={() => handleTriggerScenario(scenario.code)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border border-slate-200 p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:bg-primary-50 hover:shadow-card active:scale-[0.98]",
                      "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                    )}
                    title={scenario.description}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                      {triggering === scenario.code ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <Play className="h-3.5 w-3.5 text-primary" />
                      )}
                      {scenario.label}
                    </span>
                    <span className="line-clamp-2 text-[11px] text-slate-500">{scenario.description}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction Journey</CardTitle>
            </CardHeader>
            <CardContent>
              {!txn ? (
                <EmptyState
                  icon={Radio}
                  title="No transaction in flight"
                  description={'Select an incident from the library above, or enable "Watch Live Feed" to see the next real transaction travel through the pipeline.'}
                />
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <PipelineFlow activeIndex={stageIndex} stoppedAt={stoppedAt} latencies={latencies} />
                  <div className="flex flex-col items-center justify-center gap-3 border-t border-slate-100 pt-6 md:border-t-0 md:border-l md:pl-6 md:pt-0">
                    <RiskGauge score={txn.risk_score} calculating={riskCalculating} />
                    {phase === "decision" || phase === "intercepted" || phase === "completed" ? (
                      <div className="flex flex-col items-center gap-1.5 animate-fade-in">
                        <Badge tone={statusTone(txn.status)}>{titleCase(txn.status)}</Badge>
                        <p className="max-w-xs text-center text-xs text-slate-500">{txn.reason}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {txn && phase === "intercepted" && (
            <div className="space-y-6 animate-fade-in">
              <PaymentInterception transaction={txn} revealStep={interceptStep} />
              {showNotification && <CustomerNotification transaction={txn} />}
              {caseSteps > 0 && (
                <Card>
                  <CardContent className="space-y-2 py-5">
                    {["Alert Generated", "Fraud Team Notified", "Investigation Case Created"]
                      .slice(0, caseSteps)
                      .map((step) => (
                        <div key={step} className="flex animate-fade-in items-center gap-2 text-sm font-medium text-slate-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          {step}
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {txn && phase === "completed" && (
            <Card className="animate-fade-in border-success bg-success-light/40">
              <CardContent className="flex items-center gap-3 py-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success text-white">✓</span>
                <div>
                  <p className="font-semibold text-green-800">Transaction settled successfully</p>
                  <p className="text-xs text-green-700">{txn.transaction_ref} completed core banking settlement.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Rule Execution</CardTitle>
            </CardHeader>
            <CardContent>
              {!txn ? (
                <p className="py-8 text-center text-xs text-slate-400">Rules will execute here once a transaction starts.</p>
              ) : (
                <RuleExecutionPanel rules={txn.rule_evaluations ?? []} revealedCount={revealedRuleCount} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-0">
              {recentQuery.isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                recentQuery.data?.items.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => play(t)}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-all duration-150 hover:translate-x-0.5 hover:bg-slate-50"
                  >
                    <span className="truncate text-slate-700">{t.customer_name}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-xs text-slate-400">{formatCurrency(t.amount, t.currency)}</span>
                      <Badge tone={riskTone(t.risk_score)}>{t.risk_score.toFixed(0)}</Badge>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
