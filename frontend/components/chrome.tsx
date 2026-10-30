"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { config } from "@/demo/config";
import { script } from "@/demo/script";
import type { PanelId } from "@/demo/types";
import type { DemoState } from "@/lib/engine";
import { formatEur } from "@/lib/format";
import { rise } from "./ui";

/* ── Top bar: brand, boarding-pass stub, phase tabs ────────── */

const PHASES: PanelId[] = ["quote", "flight", "settlement", "tamper"];

export function TopBar({ state }: { state: DemoState }) {
  const { flight, traveller, product } = script;
  const current = state.end ? PHASES.length : PHASES.indexOf(state.panel);
  const stub = [
    { k: "Flight", v: flight.number },
    { k: "Route", v: `${flight.from.code} → ${flight.to.code}` },
    { k: "Date", v: flight.date.toUpperCase() },
    { k: "Passenger", v: traveller.initials },
  ];
  return (
    <header className="flex h-[84px] shrink-0 items-center gap-7 px-8">
      <div className="flex items-baseline gap-2.5 text-[26px] font-bold tracking-[-0.02em]">
        <span>{product.name}</span>
        {product.kana && <span className="font-mono text-sm font-medium tracking-wide text-muted">{product.kana}</span>}
      </div>
      <div className="flex overflow-hidden rounded-xl bg-white shadow-hair" aria-label={`Flight ${flight.number}, ${flight.from.city} to ${flight.to.city}, ${flight.date}`}>
        {stub.map((s, i) => (
          <div key={s.k} className={`flex flex-col justify-center px-4 py-2 ${i ? "border-l-2 border-dashed border-line" : ""}`}>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{s.k}</span>
            <span className="font-mono text-lg">{s.v}</span>
          </div>
        ))}
      </div>
      <nav className="ml-auto flex gap-[22px] self-stretch" aria-label="Demo phases">
        {PHASES.map((p, i) => (
          <span
            key={p}
            className={`flex items-center gap-2 border-b-4 text-base font-semibold transition-colors duration-300 ${
              i === current ? "border-accent text-ink" : i < current ? "border-transparent text-ink" : "border-transparent text-muted"
            }`}
          >
            <span className="font-mono text-[13px]">0{i + 1}</span>
            {script.panels[p].tab}
          </span>
        ))}
      </nav>
    </header>
  );
}

/* ── Cover pool ────────────────────────────────────────────── */

export function PoolWidget({ pool }: { pool: DemoState["pool"] }) {
  const tone = pool.delta && pool.delta > 0 ? "bg-ok-bg text-ok-fg" : "bg-bad-bg text-[#912018]";
  return (
    <div className="flex shrink-0 items-center gap-3.5 rounded-xl bg-soft px-4 py-3" aria-label="Cover pool">
      <span className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted">Cover pool</span>
      <AnimatePresence mode="wait">
        {pool.delta !== null && (
          <motion.span key={pool.label} {...rise} className={`rounded-md px-2 py-[3px] font-mono text-sm font-medium ${tone}`}>
            {pool.delta > 0 ? "+" : "−"}
            {formatEur(Math.abs(pool.delta))} {pool.label}
          </motion.span>
        )}
      </AnimatePresence>
      <span className="ml-auto font-mono text-xl font-medium tabular-nums">{formatEur(pool.balance)}</span>
    </div>
  );
}

/* ── Presenter controls ────────────────────────────────────── */

export function Hud({
  state,
  recording,
  onPrev,
  onNext,
  onReset,
  onToggle,
}: {
  state: DemoState;
  recording: boolean;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onToggle: () => void;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const btn = "min-h-8 rounded-full border-[1.5px] border-line bg-white px-3 text-sm font-semibold text-ink";
  return (
    <div className={`flex items-center gap-2.5 px-8 pb-3.5 pt-1 text-sm text-muted transition-opacity duration-300 ${recording ? "opacity-0 hover:opacity-100" : ""}`}>
      <span className="font-mono text-ink">
        {pad(state.stepIndex)} / {pad(state.stepCount - 1)}
      </span>
      <span>{state.stepLabel}</span>
      <span className="flex-1" />
      <button type="button" className={btn} onClick={onPrev}>
        ← Back
      </button>
      <button type="button" className={btn} onClick={onNext}>
        Next →
      </button>
      <button type="button" className={btn} onClick={onReset}>
        Reset
      </button>
      <button type="button" className={btn} onClick={onToggle}>
        {recording ? "Show (H)" : "Hide (H)"}
      </button>
    </div>
  );
}

/* ── End slide ─────────────────────────────────────────────── */

export function EndSlide() {
  const { end } = script;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="absolute inset-0 z-20 grid place-items-center bg-ground"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="grid w-[1120px] grid-cols-[minmax(0,1fr)_300px] overflow-hidden rounded-[28px] bg-white shadow-pass"
      >
        <div className="flex flex-col gap-[22px] px-[60px] py-14">
          <h1 className="text-[96px] font-bold leading-[0.95] tracking-[-0.045em]">{end.title}</h1>
          <p className="text-[26px] leading-snug text-ink-2">{end.text}</p>
          <div className="flex gap-3">
            {config.sponsors.map((s) => (
              <div key={s.name} className="grid h-16 min-w-[180px] place-items-center rounded-xl border-[1.5px] border-dashed border-[#98A2B3] px-4 text-lg font-bold">
                {s.logo ? <img src={s.logo} alt={s.name} className="max-h-10" /> : s.name}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-[18px] border-l-[3px] border-dashed border-line bg-accent px-9 py-14">
          {[
            { k: "Team", v: config.team },
            { k: "Repo", v: config.repo },
          ].map((r) => (
            <div key={r.k}>
              <div className="text-xs font-bold uppercase tracking-[0.1em]">{r.k}</div>
              <div className="break-words font-mono text-lg leading-snug">{r.v}</div>
            </div>
          ))}
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.1em]">Claims filed</div>
            <div className="font-mono text-[44px]">{end.claimsFiled}</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Stage: a fixed 1440×900 canvas scaled to fit any screen ── */

export function Stage({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1440, window.innerHeight / 900));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div className="grid h-screen w-screen place-items-center overflow-hidden bg-ground">
      <div style={{ width: 1440 * scale, height: 900 * scale }}>
        <div className="relative h-[900px] w-[1440px] origin-top-left overflow-hidden bg-ground" style={{ transform: `scale(${scale})` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
