"use client";

import { AnimatePresence, motion } from "framer-motion";
import { script } from "@/demo/script";
import type { PanelId } from "@/demo/types";
import type { CalcLine, DemoState } from "@/lib/engine";
import { PlaneIcon } from "./Icons";
import { LogList, LogRow } from "./LogList";
import { SourceWheel } from "./SourceWheel";
import { Spinner, rise } from "./ui";

function PanelHead({ panel }: { panel: PanelId }) {
  const p = script.panels[panel];
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[26px] font-bold tracking-[-0.02em]">{p.title}</span>
      <span className="text-[15px] text-muted">{p.subtitle}</span>
    </div>
  );
}

/* ── Quote ──────────────────────────────────────────────────── */

function CalcCard({ lines, verdict }: { lines: CalcLine[]; verdict: string | null }) {
  return (
    <motion.div {...rise} className="shrink-0 rounded-[14px] bg-ink px-[18px] py-3 font-mono text-base text-[#F2F4F7]" aria-label="Pricing calculation">
      {lines.map((l) => (
        <motion.div
          key={l.label}
          {...rise}
          className={`flex justify-between gap-4 py-[3px] ${l.style ? "mt-1 border-t border-dashed border-[#475467] pt-[7px] font-medium" : ""} ${
            l.style === "result" && verdict ? "text-xl text-accent" : ""
          }`}
        >
          <span>{l.label}</span>
          <span>{l.value}</span>
        </motion.div>
      ))}
      {verdict && (
        <motion.div {...rise} className="mt-2 rounded-lg bg-accent px-3 py-2 font-sans font-bold text-ink">
          {verdict}
        </motion.div>
      )}
    </motion.div>
  );
}

export function QuotePanel({ state }: { state: DemoState }) {
  return (
    <>
      <PanelHead panel="quote" />
      <SourceWheel nodes={state.sources} />
      <LogList items={state.quoteLog} empty="Waiting for a request." />
      {state.calc && <CalcCard lines={state.calc} verdict={state.verdict} />}
    </>
  );
}

/* ── Flight ─────────────────────────────────────────────────── */

const P0 = [60, 220];
const P1 = [292, 20];
const P2 = [524, 236];
const ROUTE = `M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`;

function planeAt(p: number) {
  const q = 1 - p;
  const x = q * q * P0[0] + 2 * q * p * P1[0] + p * p * P2[0];
  const y = q * q * P0[1] + 2 * q * p * P1[1] + p * p * P2[1];
  const dx = 2 * q * (P1[0] - P0[0]) + 2 * p * (P2[0] - P1[0]);
  const dy = 2 * q * (P1[1] - P0[1]) + 2 * p * (P2[1] - P1[1]);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

export function FlightPanel({ state }: { state: DemoState }) {
  const { flight } = script;
  const f = state.flight;
  const plane = planeAt(f.progress);
  const stats = [
    { k: "UTC", v: f.clock },
    { k: "Progress", v: `${Math.round(f.progress * 100)}%` },
    { k: "Sched. arr.", v: flight.scheduledArrival },
    { k: "Actual arr.", v: f.landed ? flight.actualArrival : "—" },
  ];
  return (
    <>
      <PanelHead panel="flight" />
      <motion.div
        key={f.status}
        {...rise}
        className={`rounded-xl px-4 py-3 font-mono text-[22px] font-medium ${f.tone === "late" ? "bg-accent text-ink" : "bg-ink text-white"}`}
      >
        {f.status}
      </motion.div>
      <div className="relative h-[300px] shrink-0 overflow-hidden rounded-2xl bg-soft">
        <svg width="584" height="300" viewBox="0 0 584 300" className="absolute left-0 top-0" aria-hidden="true">
          <path d={ROUTE} fill="none" stroke="#D5DAE1" strokeWidth={3} strokeDasharray="6 8" />
          <path
            d={ROUTE}
            fill="none"
            stroke="rgb(var(--accent))"
            strokeWidth={4}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - f.progress * 100}
          />
          <circle cx={P0[0]} cy={P0[1]} r={8} fill="#101828" />
          <circle cx={P2[0]} cy={P2[1]} r={8} fill="#101828" />
        </svg>
        {[
          { a: flight.from, p: P0 },
          { a: flight.to, p: P2 },
        ].map(({ a, p }) => (
          <div key={a.code} className="absolute -translate-x-1/2 text-center font-mono text-[17px] font-medium" style={{ left: p[0], top: p[1] + 16 }}>
            {a.code}
            <small className="block font-sans text-[13px] text-muted">{a.city}</small>
          </div>
        ))}
        <div
          className="absolute grid h-[34px] w-[34px] place-items-center text-ink"
          style={{ left: plane.x, top: plane.y, transform: `translate(-50%,-50%) rotate(${plane.angle}deg)` }}
        >
          <PlaneIcon />
        </div>
      </div>
      <div className="grid grid-cols-4 border-t-2 border-dashed border-line pt-3">
        {stats.map((s, i) => (
          <div key={s.k} className={`px-3 ${i ? "border-l-[1.5px] border-hair" : ""}`}>
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{s.k}</div>
            <div className="mt-1 font-mono text-[22px] tabular-nums">{s.v}</div>
          </div>
        ))}
      </div>
      <div className="flex-1" />
    </>
  );
}

/* ── Settlement ─────────────────────────────────────────────── */

export function SettlementPanel({ state }: { state: DemoState }) {
  const s = state.settlement;
  return (
    <>
      <PanelHead panel="settlement" />
      <div>
        {s.log.map((item) => (
          <motion.div key={item.id} {...rise}>
            <LogRow item={item} />
          </motion.div>
        ))}
      </div>
      <div className="flex flex-col" aria-label="Contract checks">
        <AnimatePresence initial={false}>
          {s.checks.map((c) => (
            <motion.div key={c.text} {...rise} className="flex items-center gap-3 border-b-[1.5px] border-hair px-0.5 py-3 text-[17px]">
              {c.status === "running" ? (
                <Spinner label="checking" />
              ) : (
                <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-ok-bg font-bold text-ok-fg" aria-label="passed">
                  ✓
                </span>
              )}
              <span>{c.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {s.banner && (
        <motion.div {...rise} className="rounded-xl bg-accent px-4 py-3.5 text-xl font-bold text-ink">
          {s.banner}
        </motion.div>
      )}
      <div className="flex-1" />
    </>
  );
}

/* ── Tamper test ────────────────────────────────────────────── */

export function TamperPanel({ state }: { state: DemoState }) {
  const t = state.tamper;
  return (
    <>
      <PanelHead panel="tamper" />
      <div className="flex flex-col gap-2.5">
        {t.attempts.map((a) => (
          <motion.div
            key={a.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: 0,
              backgroundColor: a.status === "rejected" ? ["#FECDCA", "#F5F6F8"] : "#F5F6F8",
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border-[1.5px] px-4 py-3.5 ${
              a.status === "rejected" ? "border-bad-line" : "border-transparent"
            }`}
          >
            <div>
              <div className="text-lg font-bold">{a.title}</div>
              <div className="mt-0.5 text-[15px] text-ink-2">{a.detail}</div>
            </div>
            {a.status === "running" ? (
              <Spinner label="submitting" />
            ) : (
              <span className="font-mono font-medium text-bad-fg">✗ rejected</span>
            )}
          </motion.div>
        ))}
      </div>
      {t.banner && (
        <motion.div {...rise} className="rounded-[14px] bg-ink px-5 py-[18px] text-[21px] font-bold leading-snug text-white">
          {t.banner}
        </motion.div>
      )}
      <div className="flex-1" />
    </>
  );
}
