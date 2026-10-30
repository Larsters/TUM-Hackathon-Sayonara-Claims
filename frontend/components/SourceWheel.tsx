"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { SourceNode } from "@/lib/engine";
import { formatPrice } from "@/lib/format";

const W = 572;
const H = 260;
const CX = W / 2;
const CY = 130;
const RX = 205;
const RY = 90;

function position(i: number, n: number) {
  const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
  return { x: CX + RX * Math.cos(a), y: CY + RY * Math.sin(a) };
}

const spokeStyle: Record<SourceNode["status"], { stroke: string; width: number; dash?: string; opacity: number }> = {
  idle: { stroke: "#D5DAE1", width: 2, opacity: 1 },
  active: { stroke: "rgb(var(--accent))", width: 3, opacity: 1 },
  done: { stroke: "#101828", width: 2, opacity: 1 },
  rejected: { stroke: "#98A2B3", width: 2, dash: "5 5", opacity: 0.4 },
};

const nodeStyle: Record<SourceNode["status"], string> = {
  idle: "border-line opacity-55",
  active: "border-accent ring-4 ring-accent/25",
  done: "border-ink",
  rejected: "border-dashed border-line opacity-40",
};

/** The agent in the centre, data sources on a ring. Coins fly out when a source is paid. */
export function SourceWheel({ nodes }: { nodes: SourceNode[] }) {
  return (
    <div className="relative shrink-0 overflow-hidden rounded-2xl bg-soft" style={{ width: W, height: H }} aria-label="Data sources around the agent">
      <svg width={W} height={H} className="absolute inset-0" aria-hidden="true">
        {nodes.map((n, i) => {
          const p = position(i, nodes.length);
          const s = spokeStyle[n.status];
          return (
            <line
              key={n.source.id}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke={s.stroke}
              strokeWidth={s.width}
              strokeDasharray={s.dash}
              opacity={s.opacity}
              style={{ transition: "stroke .3s, opacity .3s" }}
            />
          );
        })}
      </svg>

      <AnimatePresence>
        {nodes.map((n, i) => {
          if (!n.paying) return null;
          const p = position(i, nodes.length);
          return (
            <motion.span
              key={`coin-${n.source.id}`}
              className="absolute z-[1] h-[18px] w-[18px] rounded-full border-2 border-ink bg-accent"
              style={{ left: CX - 9, top: CY - 9 }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: p.x - CX, y: p.y - CY, opacity: 0.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeIn" }}
            />
          );
        })}
      </AnimatePresence>

      <div
        className="absolute z-[2] grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink text-center text-sm font-bold leading-tight text-white"
        style={{ left: CX, top: CY, boxShadow: "0 0 0 6px rgb(var(--accent))" }}
      >
        Cover
        <br />
        agent
      </div>

      {nodes.map((n, i) => {
        const p = position(i, nodes.length);
        const { source } = n;
        const sub =
          n.status === "done"
            ? source.price && formatPrice(source.price)
            : n.status === "rejected"
              ? source.rejected
              : n.status === "active"
                ? source.rejected
                  ? "checking…"
                  : "paying…"
                : source.vendor;
        return (
          <div
            key={source.id}
            className={`absolute z-[2] min-w-[112px] -translate-x-1/2 -translate-y-1/2 rounded-[10px] border-[1.5px] bg-white px-2.5 py-1.5 text-center transition-all duration-300 ${nodeStyle[n.status]}`}
            style={{ left: p.x, top: p.y }}
          >
            <div className="whitespace-nowrap text-sm font-bold">{source.label}</div>
            <div className="whitespace-nowrap font-mono text-xs text-muted">{sub}</div>
            {n.status === "done" && <div className="font-mono text-xs font-medium text-ok-fg">signed ✓</div>}
            {n.status === "rejected" && <div className="font-mono text-xs font-medium text-bad-fg">rejected</div>}
          </div>
        );
      })}
    </div>
  );
}
