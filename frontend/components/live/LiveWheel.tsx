"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { SourceState } from "@/lib/useLive";

const W = 572;
const H = 270;
const CX = W / 2;
const CY = 135;
const RX = 200;
const RY = 92;

function position(i: number, n: number) {
  const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
  return { x: CX + RX * Math.cos(a), y: CY + RY * Math.sin(a) };
}

const spoke: Record<SourceState["status"], { stroke: string; width: number; dash?: string; opacity: number }> = {
  idle: { stroke: "#D5DAE1", width: 2, opacity: 1 },
  active: { stroke: "rgb(var(--accent))", width: 3, opacity: 1 },
  done: { stroke: "#101828", width: 2, opacity: 1 },
  rejected: { stroke: "#98A2B3", width: 2, dash: "5 5", opacity: 0.4 },
};

const node: Record<SourceState["status"], string> = {
  idle: "border-line opacity-55",
  active: "border-accent",
  done: "border-ink",
  rejected: "border-dashed border-line opacity-45",
};

/** The agent in the centre and its data sources on a ring. Coins fly to each source the agent pays. */
export function LiveWheel({ sources, centre, running }: { sources: SourceState[]; centre: string; running: boolean }) {
  return (
    <div className="relative shrink-0 overflow-hidden rounded-2xl bg-soft" style={{ width: W, height: H }} aria-label="Data sources around the agent">
      <svg width={W} height={H} className="absolute inset-0" aria-hidden="true">
        <motion.ellipse
          cx={CX}
          cy={CY}
          rx={RX}
          ry={RY}
          fill="none"
          stroke={running ? "rgb(var(--accent))" : "#D5DAE1"}
          strokeWidth={1.5}
          strokeDasharray="4 10"
          opacity={running ? 0.7 : 0.6}
          animate={running ? { strokeDashoffset: [0, -140] } : { strokeDashoffset: 0 }}
          transition={running ? { repeat: Infinity, duration: 3, ease: "linear" } : { duration: 0.3 }}
        />
        {sources.map((s, i) => {
          const p = position(i, sources.length);
          const st = spoke[s.status];
          return (
            <line
              key={s.id}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke={st.stroke}
              strokeWidth={st.width}
              strokeDasharray={st.dash}
              opacity={st.opacity}
              style={{ transition: "stroke .3s, opacity .3s" }}
            />
          );
        })}
      </svg>

      {/* Coins travel along the spoke of the source being paid, again and again until it answers. */}
      {sources.map((s, i) => {
        if (s.status !== "active") return null;
        const p = position(i, sources.length);
        return [0, 0.45].map(delay => (
          <motion.span
            key={`${s.id}-${delay}`}
            className="absolute z-[1] h-[16px] w-[16px] rounded-full border-2 border-ink bg-accent"
            style={{ left: CX - 8, top: CY - 8 }}
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{ x: [0, p.x - CX], y: [0, p.y - CY], opacity: [1, 1, 0], scale: [1, 0.8] }}
            transition={{ repeat: Infinity, duration: 0.9, delay, ease: "easeIn" }}
          />
        ));
      })}

      <motion.div
        className="absolute z-[2] grid h-[86px] w-[86px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink px-2 text-center text-[13px] font-bold leading-tight text-white"
        style={{ left: CX, top: CY }}
        animate={
          running
            ? { boxShadow: ["0 0 0 6px rgb(255 90 31)", "0 0 0 14px rgb(255 90 31 / 0.25)", "0 0 0 6px rgb(255 90 31)"] }
            : { boxShadow: "0 0 0 6px rgb(255 90 31)" }
        }
        transition={running ? { repeat: Infinity, duration: 1.6 } : { duration: 0.3 }}
      >
        <AnimatePresence mode="wait">
          <motion.span key={centre} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            {centre}
          </motion.span>
        </AnimatePresence>
      </motion.div>

      {sources.map((s, i) => {
        const p = position(i, sources.length);
        const sub =
          s.status === "done" ? s.price : s.status === "rejected" ? "rejected" : s.status === "active" ? (s.id === "blog" ? "checking…" : "paying…") : s.vendor;
        return (
          <motion.div
            key={s.id}
            className={`absolute z-[2] min-w-[108px] rounded-[10px] border-[1.5px] bg-white px-2.5 py-1.5 text-center transition-colors duration-300 ${node[s.status]}`}
            // Framer owns the transform here, so it does the centring too
            style={{ left: p.x, top: p.y, x: "-50%", y: "-50%" }}
            animate={s.status === "active" ? { scale: [1, 1.07, 1], boxShadow: ["0 0 0 0 rgb(255 90 31 / .35)", "0 0 0 8px rgb(255 90 31 / 0)", "0 0 0 0 rgb(255 90 31 / 0)"] } : { scale: 1 }}
            transition={s.status === "active" ? { repeat: Infinity, duration: 1 } : { duration: 0.2 }}
          >
            <div className="whitespace-nowrap text-sm font-bold">{s.label}</div>
            <div className={`whitespace-nowrap font-mono text-xs ${s.status === "rejected" ? "text-bad-fg" : "text-muted"}`}>{sub}</div>
            <AnimatePresence>
              {s.status === "done" && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  className="font-mono text-xs font-medium text-ok-fg"
                >
                  {s.explorer ? (
                    <a href={s.explorer} target="_blank" rel="noopener noreferrer" className="underline decoration-accent decoration-2 underline-offset-2">
                      on-chain ✓
                    </a>
                  ) : (
                    "signed ✓"
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
