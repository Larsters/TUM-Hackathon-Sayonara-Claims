"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useLive, type RightTab } from "@/lib/useLive";
import { Stage } from "../chrome";
import { LiveChat } from "./LiveChat";
import { AgentPanel, TransactionsPanel, TripsPanel, WalletStrip } from "./LivePanels";

export function LiveApp() {
  const live = useLive();
  const flight = live.facts ?? live.quote?.flight;
  const stub = [
    { k: "Flight", v: flight?.number ?? live.draft.number ?? "—" },
    { k: "Route", v: flight ? `${flight.from.iata ?? "?"} → ${flight.to.iata ?? "?"}` : live.draft.from ? `${live.draft.from} → ${live.draft.to ?? "?"}` : "—" },
    { k: "Date", v: flight?.date ?? live.draft.date ?? "—" },
    { k: "Passenger", v: "ANA K." },
  ];
  const tabs: { id: RightTab; label: string; count?: number }[] = [
    { id: "agent", label: "Agent" },
    { id: "trips", label: "My trips", count: live.trips.length },
    { id: "transactions", label: "Transactions", count: live.transactions.length },
  ];

  return (
    <Stage>
      <div className="flex h-full flex-col">
        <header className="flex h-[84px] shrink-0 items-center gap-6 px-8">
          <div className="flex items-baseline gap-2.5 text-[26px] font-bold tracking-[-0.02em]">
            <span>Sayonara Claims</span>
            <span className="font-mono text-sm font-medium tracking-wide text-muted">さようなら</span>
          </div>
          <div className="flex overflow-hidden rounded-xl bg-white shadow-hair">
            {stub.map((s, i) => (
              <div key={s.k} className={`flex flex-col justify-center px-4 py-2 ${i ? "border-l-2 border-dashed border-line" : ""}`}>
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{s.k}</span>
                <AnimatePresence mode="wait">
                  <motion.span key={s.v} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-lg">
                    {s.v}
                  </motion.span>
                </AnimatePresence>
              </div>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-[13px] font-semibold">
            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${live.offline ? "bg-bad-bg text-bad-fg" : "bg-ok-bg text-ok-deep"}`}>
              <span className={`h-2 w-2 rounded-full ${live.offline ? "bg-bad-line" : "animate-pulse bg-ok-line"}`} />
              {live.offline ? "Agent offline" : "Agent online"}
            </span>
            <span className="rounded-full bg-rule-bg px-3 py-1.5 text-rule-fg">Cardano preprod</span>
            <span className="rounded-full bg-pay-bg px-3 py-1.5 text-pay-fg">Base Sepolia · API3</span>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[55fr_45fr]">
          <LiveChat live={live} />
          <aside aria-label="Agent, trips and transactions" className="mb-6 mr-6 flex min-h-0 flex-col gap-3 rounded-[22px] bg-white px-[26px] py-[18px] shadow-hair">
            <nav className="flex shrink-0 gap-1 rounded-xl bg-soft p-1">
              {tabs.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => live.setTab(t.id)}
                  className={`relative flex-1 rounded-lg px-3 py-2 text-[15px] font-bold transition-colors ${live.tab === t.id ? "text-ink" : "text-muted hover:text-ink"}`}
                >
                  {live.tab === t.id && <motion.span layoutId="tab" className="absolute inset-0 rounded-lg bg-white shadow-hair" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                  <span className="relative">
                    {t.label}
                    {t.count ? <span className="ml-1.5 rounded-full bg-ink px-1.5 py-0.5 font-mono text-[11px] text-white">{t.count}</span> : null}
                  </span>
                </button>
              ))}
            </nav>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={live.tab}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="flex min-h-0 flex-1 flex-col gap-3"
              >
                {live.tab === "agent" && <AgentPanel live={live} />}
                {live.tab === "trips" && <TripsPanel live={live} />}
                {live.tab === "transactions" && <TransactionsPanel live={live} />}
              </motion.div>
            </AnimatePresence>
            <WalletStrip live={live} />
          </aside>
        </div>
      </div>
    </Stage>
  );
}
