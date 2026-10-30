"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Trip } from "@/lib/api";
import type { Live } from "@/lib/useLive";
import { KindIcon } from "../Icons";
import { Eyebrow, PriceChip, Spinner, rise } from "../ui";
import { LiveWheel } from "./LiveWheel";
import { ChainBadge, TxLink } from "./TxLink";

const hm = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;

/* ── Agent reasoning ───────────────────────────────────────── */

export function AgentPanel({ live }: { live: Live }) {
  const scroller = useRef<HTMLDivElement>(null);
  const { sources, fee, rules, pricing, quote, phase } = live;
  const running = phase === "researching";
  const visible = sources.filter(s => s.status !== "idle");
  const centre =
    phase === "intake" ? "Cover agent" : running ? (pricing ? "Pricing" : rules ? "Checking rules" : "Buying data") : quote ? "Quote ready" : "Cover agent";

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visible.length, rules, pricing, fee.status]);

  return (
    <>
      <LiveWheel sources={sources} centre={centre} running={running} />
      <div ref={scroller} className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:thin]">
        {phase === "intake" && fee.status === "idle" && (
          <p className="py-3 text-base text-faint">
            Tell the agent your flight. Once you pay the research fee, every data source it pays for appears here.
          </p>
        )}
        <AnimatePresence initial={false}>
          {fee.status !== "idle" && (
            <motion.div key="fee" {...rise} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b-[1.5px] border-hair py-[10px]">
              <KindIcon kind="payment" />
              <div>
                <div className="text-base font-bold">Research fee · x402 on Cardano</div>
                <div className="text-[15px] text-ink-2">
                  {fee.status === "pending" ? "Signed by Vasiliy's wallet, settling on preprod…" : fee.status === "paid" ? "Settled on Cardano preprod" : "Did not settle"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {fee.status === "pending" && <Spinner />}
                {fee.status === "paid" && fee.explorer && (
                  <a href={fee.explorer} target="_blank" rel="noopener noreferrer" className="font-mono text-[13px] font-medium text-ok-fg underline decoration-accent decoration-2 underline-offset-2">
                    paid ✓ ↗
                  </a>
                )}
              </div>
            </motion.div>
          )}
          {visible.map(s => (
            <motion.div
              key={s.id}
              layout
              {...rise}
              className={`grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b-[1.5px] border-hair py-[10px] ${s.status === "rejected" ? "opacity-50" : ""}`}
            >
              <KindIcon kind="data" />
              <div>
                <div className="text-base font-bold">
                  {s.label} <span className="font-normal text-muted">· {s.vendor}</span>
                  {s.live && <span className="ml-2 rounded bg-ok-bg px-1.5 py-0.5 font-mono text-[11px] text-ok-fg">LIVE DATA</span>}
                </div>
                <div className="text-[15px] leading-snug text-ink-2">{s.status === "active" ? "Buying…" : s.finding}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {s.status === "active" && <Spinner />}
                {s.status === "done" && s.price && <PriceChip>{s.price}</PriceChip>}
                {s.status === "done" && s.explorer && (
                  <a href={s.explorer} target="_blank" rel="noopener noreferrer" className="font-mono text-[12px] text-ok-fg underline decoration-accent decoration-2 underline-offset-2">
                    Base tx ↗
                  </a>
                )}
                {s.status === "rejected" && <span className="font-mono text-[13px] font-medium text-bad-fg">rejected</span>}
              </div>
            </motion.div>
          ))}
          {rules && (
            <motion.div key="rules" {...rise} className="mt-3 flex flex-col gap-2 rounded-xl bg-rule-bg px-4 py-3">
              <Eyebrow>Passenger rights checked</Eyebrow>
              {rules.rules.filter(r => r.applies).map(r => (
                <div key={r.id} className="text-[15px] leading-snug text-ink">
                  <strong>✓ {r.title}:</strong> {r.detail}
                </div>
              ))}
              <div className="text-[15px] leading-snug text-rule-fg">
                <strong>Gap:</strong> {rules.gap}
              </div>
            </motion.div>
          )}
          {pricing && (
            <motion.div key="pricing" {...rise} className="mt-3 rounded-xl bg-soft px-4 py-3 font-mono text-[15px]">
              {pricing.lines.map((l, i) => (
                <motion.div
                  key={l.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.12 }}
                  className={`flex justify-between gap-4 py-0.5 ${l.style === "sum" ? "border-t border-line pt-1 font-medium" : ""} ${l.style === "result" ? "text-lg font-medium" : ""}`}
                >
                  <span>{l.label}</span>
                  <span>{l.value}</span>
                </motion.div>
              ))}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: pricing.lines.length * 0.12 }} className="mt-2 rounded-md bg-accent px-2 py-1 text-center font-sans font-bold">
                {pricing.verdict}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ── My trips ──────────────────────────────────────────────── */

function TripCard({ trip, open, onToggle }: { trip: Trip; open: boolean; onToggle: () => void }) {
  const { flight, policy } = trip;
  const status =
    trip.status === "PaidOut"
      ? { text: `Paid out €${policy.payoutEur}`, cls: "bg-ok-bg text-ok-deep" }
      : trip.status === "Active"
        ? { text: "Active · waiting for landing", cls: "bg-accent/20 text-ink" }
        : { text: "Expired, on time", cls: "bg-soft text-muted" };
  return (
    <motion.div layout {...rise} className="shrink-0 overflow-hidden rounded-2xl border-[1.5px] border-hair bg-white">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-lg font-bold">
            {flight.number} · {flight.from.iata} → {flight.to.iata}
            {trip.replay && <span className="rounded bg-soft px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted">REPLAY OF A REAL FLIGHT</span>}
          </div>
          <div className="text-[15px] text-ink-2">
            {flight.from.city} → {flight.to.city} · {flight.date}
            {trip.delayMinutes ? ` · landed ${hm(trip.delayMinutes)} late` : ""}
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${status.cls}`}>{status.text}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t-[1.5px] border-hair">
            <div className="flex flex-col gap-3 px-4 py-3">
              {trip.flight.scheduledArrivalUtc && trip.flight.actualArrivalUtc && trip.delayMinutes && (
                <div>
                  <Eyebrow>Arrival</Eyebrow>
                  <div className="mt-1 flex items-center gap-2 font-mono text-[15px]">
                    <span>scheduled {trip.flight.scheduledArrivalUtc}</span>
                    <span className="h-1.5 flex-1 rounded bg-gradient-to-r from-ink to-accent" />
                    <span className="font-medium text-bad-fg">landed {trip.flight.actualArrivalUtc}</span>
                  </div>
                </div>
              )}
              {trip.checks && (
                <div>
                  <Eyebrow>Contract checks · FlightDelayCover</Eyebrow>
                  {trip.checks.map(c => (
                    <div key={c} className="flex items-center gap-2 py-0.5 text-[15px]">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-ok-bg text-xs font-bold text-ok-fg">✓</span>
                      {c}
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-xl bg-rule-bg px-3 py-2.5">
                <Eyebrow>Jurisdiction check</Eyebrow>
                {trip.jurisdiction.rules.filter(r => r.applies).map(r => (
                  <div key={r.id} className="mt-1 text-[14px] leading-snug text-ink">
                    <strong>✓ {r.title}:</strong> {r.detail}
                  </div>
                ))}
                {trip.status === "PaidOut" && trip.jurisdiction.airlineOwesEur && (
                  <div className="mt-2 text-[14px] leading-snug text-rule-fg">
                    <strong>Entitled from the airline:</strong> up to €{trip.jurisdiction.airlineOwesEur} under EU261, by claim, unless the
                    airline cites extraordinary circumstances. <strong>Sayonara Claims paid €{policy.payoutEur} within minutes</strong>, with no claim
                    filed.
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Eyebrow>Transactions</Eyebrow>
                {trip.transactions.map(tx => (
                  <div key={tx.hash} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-[14px]">
                      <ChainBadge chain={tx.chain} />
                      <span>{tx.kind}</span>
                    </div>
                    <TxLink hash={tx.hash} explorer={tx.explorer} compact />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function TripsPanel({ live }: { live: Live }) {
  const [open, setOpen] = useState<string | null>("lh501");
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-width:thin]">
      {live.offline && <p className="text-base text-bad-fg">Agent server offline: start it with `npm run server` in agent-server/.</p>}
      {live.trips.map(trip => (
        <TripCard key={trip.id} trip={trip} open={open === trip.id} onToggle={() => setOpen(open === trip.id ? null : trip.id)} />
      ))}
    </div>
  );
}

/* ── Transactions ──────────────────────────────────────────── */

export function TransactionsPanel({ live }: { live: Live }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:thin]">
      <AnimatePresence initial={false}>
        {live.transactions.map(tx => (
          <motion.div key={tx.hash} layout {...rise} className="flex flex-col gap-1.5 border-b-[1.5px] border-hair py-2.5">
            <div className="flex items-center gap-2 text-[15px]">
              <ChainBadge chain={tx.chain} />
              <span className="flex-1 font-semibold">{tx.kind}</span>
              {tx.live && <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[11px] font-bold">THIS SESSION</span>}
            </div>
            <TxLink hash={tx.hash} explorer={tx.explorer} compact />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── Wallets ───────────────────────────────────────────────── */

export function WalletStrip({ live }: { live: Live }) {
  const w = live.wallets;
  const eur = (n: number) => `€${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const items = [
    { k: "Vasiliy's wallet", v: w?.traveller.display, e: w && eur(w.traveller.eur), href: w && `https://preprod.cardanoscan.io/address/${w.traveller.address}` },
    { k: "Cover pool", v: w?.pool.display, e: w && eur(w.pool.eur), href: w && `https://preprod.cardanoscan.io/address/${w.pool.address}` },
  ];
  return (
    <div className="grid shrink-0 grid-cols-2 gap-2.5">
      {items.map(i => (
        <a key={i.k} href={i.href ?? undefined} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-soft px-4 py-2.5 hover:bg-hair">
          <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{i.k}</span>
          <span className="ml-auto text-right">
            <AnimatePresence mode="wait">
              <motion.span key={i.v ?? "…"} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="block font-mono text-lg font-medium tabular-nums">
                {i.v ?? "…"}
              </motion.span>
            </AnimatePresence>
            <span className="block font-mono text-[12px] text-muted">{i.e ? `≈ ${i.e}` : "Cardano preprod"}</span>
          </span>
        </a>
      ))}
    </div>
  );
}
