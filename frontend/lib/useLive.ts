"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  type CalcLine,
  type CoverOption,
  type FlightDraft,
  type FlightFacts,
  type JurisdictionCheck,
  type Purchase,
  type Quote,
  type ResearchEvent,
  type Trip,
  type TripTransaction,
  type Wallets,
} from "./api";

/**
 * The live demo: a real conversation with the agent (OpenAI), real research
 * streamed from the agent server, and real testnet transactions. The flow is
 * fixed (intake → research → quote → purchase); the model only talks.
 */

export type Phase = "intake" | "researching" | "quoted" | "buying" | "bought";
export type RightTab = "agent" | "trips" | "transactions";

export type LiveCard =
  | { kind: "fee"; flight: string; date: string }
  | { kind: "policy"; option: CoverOption; flight: FlightFacts }
  | { kind: "options"; options: CoverOption[] }
  | { kind: "receipt"; option: CoverOption; flight: FlightFacts; purchase: Purchase };

export type LiveMessage =
  | { id: string; kind: "user" | "agent"; text: string }
  | { id: string; kind: "typing" }
  | { id: string; kind: "system"; text: string; tone?: "ok" | "bad" }
  | { id: string; kind: "card"; card: LiveCard; done?: string };

export interface SourceState {
  id: string;
  label: string;
  vendor: string;
  status: "idle" | "active" | "done" | "rejected";
  finding?: string;
  price?: string;
  explorer?: string;
  live?: boolean;
}

export interface LiveTransaction extends TripTransaction {
  at: string;
  live: boolean;
}

const SOURCES: Omit<SourceState, "status">[] = [
  { id: "schedule", label: "Flight schedule", vendor: "AeroDataBox" },
  { id: "board", label: "Departure board", vendor: "AeroDataBox" },
  { id: "rotation", label: "Aircraft rotation", vendor: "OpenSky" },
  { id: "weather", label: "Route weather", vendor: "WeatherAPI.com" },
  { id: "weather2", label: "Weather #2", vendor: "CustomWeather" },
  { id: "news", label: "Strike signals", vendor: "News feed" },
  { id: "blog", label: "Travel blog", vendor: "Scraper" },
];

const freshSources = (): SourceState[] => SOURCES.map(s => ({ ...s, status: "idle" }));
let counter = 0;
const id = () => `m${++counter}`;
const now = () => new Date().toISOString();

export function useLive() {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [phase, setPhase] = useState<Phase>("intake");
  const [tab, setTab] = useState<RightTab>("agent");
  const [draft, setDraft] = useState<FlightDraft>({ number: null, date: null, from: null, to: null });
  const [facts, setFacts] = useState<FlightFacts | null>(null);
  const [sources, setSources] = useState<SourceState[]>(freshSources);
  const [fee, setFee] = useState<{ status: "idle" | "pending" | "paid" | "failed"; explorer?: string }>({ status: "idle" });
  const [rules, setRules] = useState<JurisdictionCheck | null>(null);
  const [pricing, setPricing] = useState<{ lines: CalcLine[]; verdict: string } | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [policy, setPolicy] = useState<{ option: CoverOption; purchase: Purchase } | null>(null);
  const [transactions, setTransactions] = useState<LiveTransaction[]>([]);
  const [history, setHistory] = useState<Trip[]>([]);
  const [wallets, setWallets] = useState<Wallets | null>(null);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);

  // The conversation as the model sees it: only the words, not the cards.
  const transcript = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const state = useRef({ phase, draft, quote, policy });
  state.current = { phase, draft, quote, policy };

  const push = useCallback((m: LiveMessage) => setMessages(list => [...list.filter(x => x.kind !== "typing"), m]), []);
  const markCard = useCallback((kind: LiveCard["kind"], done: string) => {
    setMessages(list => list.map(m => (m.kind === "card" && m.card.kind === kind && !m.done ? { ...m, done } : m)));
  }, []);
  const addTx = useCallback((tx: TripTransaction) => setTransactions(list => [{ ...tx, at: now(), live: true }, ...list]), []);

  const refreshWallets = useCallback(() => {
    api.wallets().then(setWallets, () => undefined);
  }, []);

  useEffect(() => {
    api.history().then(
      trips => {
        setHistory(trips);
        setOffline(false);
      },
      () => setOffline(true),
    );
    refreshWallets();
    const timer = setInterval(refreshWallets, 15_000);
    return () => clearInterval(timer);
  }, [refreshWallets]);

  const context = (extra: Record<string, unknown> = {}) => {
    const { phase, draft, quote, policy } = state.current;
    return {
      phase,
      flight: draft,
      quote: quote && {
        flight: quote.flight,
        probability: quote.probability,
        options: quote.options.map(({ id, thresholdMinutes, payoutEur, premiumEur }) => ({ id, thresholdMinutes, payoutEur, premiumEur })),
        jurisdiction: quote.jurisdiction,
      },
      policy: policy && { ...policy.option, policyId: policy.purchase.registration.policyId },
      ...extra,
    };
  };

  /** One turn with the model. Returns its action so the caller decides which card follows. */
  const agentTurn = useCallback(async (extra: Record<string, unknown> = {}) => {
    setMessages(list => [...list, { id: id(), kind: "typing" }]);
    try {
      const turn = await api.chat(transcript.current, context(extra));
      transcript.current.push({ role: "assistant", content: turn.reply });
      push({ id: id(), kind: "agent", text: turn.reply });
      return turn;
    } catch (error) {
      push({ id: id(), kind: "system", tone: "bad", text: `Agent unavailable: ${String(error).slice(0, 120)}` });
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push]);

  const startResearch = useCallback(async () => {
    const { draft } = state.current;
    if (!draft.number || !draft.date || state.current.phase !== "intake") return;
    markCard("fee", "Paid ✓");
    setPhase("researching");
    setTab("agent");
    setSources(freshSources());
    setFee({ status: "pending" });
    setRules(null);
    setPricing(null);
    setQuote(null);
    let received: Quote | null = null;
    const onEvent = (e: ResearchEvent) => {
      switch (e.type) {
        case "fee":
          setFee({ status: e.status, explorer: e.explorer });
          if (e.status === "paid" && e.transaction && e.explorer) {
            addTx({ kind: "Research fee · x402 · 2 tADA", chain: "Cardano preprod", hash: e.transaction, explorer: e.explorer });
          }
          break;
        case "source": {
          setSources(list => list.map(s => (s.id === e.id ? { ...s, status: e.status, finding: e.finding ?? s.finding, price: e.price ?? s.price, explorer: e.explorer ?? s.explorer, live: e.live ?? s.live } : s)));
          if (e.transaction && e.explorer && e.status !== "active") {
            const source = SOURCES.find(s => s.id === e.id);
            addTx({ kind: `${source?.vendor} ${source?.label.toLowerCase()} · x402 · 0.05 aUSD`, chain: "Base Sepolia", hash: e.transaction, explorer: e.explorer });
          }
          break;
        }
        case "flight":
          setFacts(e.flight);
          break;
        case "rules":
          setRules(e.check);
          break;
        case "pricing":
          setPricing({ lines: e.lines, verdict: e.verdict });
          break;
        case "quote":
          received = e.quote;
          setQuote(e.quote);
          break;
        case "error":
          push({ id: id(), kind: "system", tone: "bad", text: e.message });
          break;
      }
    };
    try {
      await api.research({ flight: draft.number, date: draft.date, from: draft.from, to: draft.to }, onEvent);
    } catch (error) {
      push({ id: id(), kind: "system", tone: "bad", text: `Research failed: ${String(error).slice(0, 120)}` });
      setPhase("intake");
      return;
    }
    refreshWallets();
    const finalQuote = received as Quote | null;
    if (!finalQuote) {
      setPhase("intake");
      return;
    }
    setPhase("quoted");
    state.current.phase = "quoted";
    state.current.quote = finalQuote;
    await agentTurn({ event: "quote_ready" });
    const standard = finalQuote.options.find(o => o.id === "standard");
    if (standard) push({ id: id(), kind: "card", card: { kind: "policy", option: standard, flight: finalQuote.flight } });
  }, [addTx, agentTurn, markCard, push, refreshWallets]);

  const buy = useCallback(async (option: CoverOption) => {
    const { quote } = state.current;
    if (!quote || state.current.phase !== "quoted") return;
    setPhase("buying");
    markCard("policy", "Buying…");
    markCard("options", option.id === "lower" ? "2h option chosen" : "3h option chosen");
    setMessages(list => [...list, { id: id(), kind: "typing" }]);
    try {
      const purchase = await api.buyPolicy(quote.flight.number, quote.flight.date, option);
      setMessages(list => list.map(m => (m.kind === "card" && m.card.kind === "policy" ? { ...m, done: "Bought ✓" } : m)));
      push({ id: id(), kind: "card", card: { kind: "receipt", option, flight: quote.flight, purchase } });
      addTx({ kind: `Premium €${option.premiumEur} · ${(Number(option.premiumLovelace) / 1e6).toFixed(1)} tADA`, chain: "Cardano preprod", hash: purchase.premium.transaction, explorer: purchase.premium.explorer });
      addTx({ kind: `Policy #${purchase.registration.policyId ?? "?"} registered in FlightDelayCover`, chain: "Base Sepolia", hash: purchase.registration.transaction, explorer: purchase.registration.explorer });
      setPolicy({ option, purchase });
      setPhase("bought");
      state.current.phase = "bought";
      state.current.policy = { option, purchase };
      refreshWallets();
      transcript.current.push({ role: "user", content: `I bought the ${option.thresholdMinutes / 60}h cover.` });
      await agentTurn({ event: "policy_bought" });
    } catch (error) {
      push({ id: id(), kind: "system", tone: "bad", text: `Purchase failed: ${String(error).slice(0, 160)}` });
      setPhase("quoted");
    }
  }, [addTx, agentTurn, markCard, push, refreshWallets]);

  const showOptions = useCallback(() => {
    const { quote } = state.current;
    if (!quote) return;
    markCard("policy", "Customising");
    push({ id: id(), kind: "card", card: { kind: "options", options: quote.options } });
  }, [markCard, push]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    push({ id: id(), kind: "user", text: trimmed });
    transcript.current.push({ role: "user", content: trimmed });
    const turn = await agentTurn();
    if (turn) {
      const { phase, draft } = state.current;
      const next = {
        number: turn.flight.number ?? draft.number,
        date: turn.flight.date ?? draft.date,
        from: turn.flight.from ?? draft.from,
        to: turn.flight.to ?? draft.to,
      };
      if (phase === "intake") {
        setDraft(next);
        state.current.draft = next;
        if (turn.action === "offer_research" && next.number && next.date) {
          push({ id: id(), kind: "card", card: { kind: "fee", flight: next.number, date: next.date } });
        }
      } else if (phase === "quoted") {
        const quote = state.current.quote;
        if (turn.action === "show_options") showOptions();
        if (turn.action === "confirm_purchase" && quote) void buy(quote.options[0]);
      }
    }
    setBusy(false);
  }, [agentTurn, busy, buy, push, showOptions]);

  const activeTrips: Trip[] =
    policy && quote
      ? [
          {
            id: "active",
            flight: quote.flight,
            policy: { id: policy.purchase.registration.policyId, thresholdMinutes: policy.option.thresholdMinutes, premiumEur: policy.option.premiumEur, payoutEur: policy.option.payoutEur },
            status: "Active",
            jurisdiction: quote.jurisdiction,
            transactions: [
              { kind: "Premium paid", chain: "Cardano preprod", hash: policy.purchase.premium.transaction, explorer: policy.purchase.premium.explorer },
              { kind: "Policy registered", chain: "Base Sepolia", hash: policy.purchase.registration.transaction, explorer: policy.purchase.registration.explorer },
            ],
          },
        ]
      : [];

  const allTransactions: LiveTransaction[] = [
    ...transactions,
    ...history.flatMap(trip => trip.transactions.map(tx => ({ ...tx, kind: `${trip.flight.number}: ${tx.kind}`, at: "", live: false }))),
  ];

  return {
    messages, phase, tab, setTab, draft, facts, sources, fee, rules, pricing, quote, policy,
    transactions: allTransactions, trips: [...activeTrips, ...history], wallets, busy, offline,
    send, startResearch, buy, showOptions,
  };
}

export type Live = ReturnType<typeof useLive>;
