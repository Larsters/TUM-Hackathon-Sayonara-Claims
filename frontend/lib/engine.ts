import type { Card, DemoEvent, DemoScript, LogKind, PanelId, Price, Source } from "@/demo/types";

/**
 * Turns (script, step, elapsed ms) into everything the screen shows.
 * Pure and deterministic: going back a step is just rendering an earlier state.
 */

export type Status = "running" | "done" | "rejected";

export type Message =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "system"; text: string }
  | { id: string; kind: "agent"; text: string; typing: boolean }
  | { id: string; kind: "card"; card: Card; pressed?: string };

export interface LogItem {
  id: string;
  kind: LogKind;
  title: string;
  detail: string;
  price?: Price;
  status: Status;
  doneLabel: string;
}

export interface SourceNode {
  source: Source;
  status: "idle" | "active" | "done" | "rejected";
  paying: boolean; // coin in flight
}

export interface CalcLine {
  label: string;
  value: string;
  style?: "sum" | "result";
}

export interface DemoState {
  stepIndex: number;
  stepCount: number;
  stepLabel: string;
  input: string;
  messages: Message[];
  panel: PanelId;
  sources: SourceNode[];
  quoteLog: LogItem[];
  calc: CalcLine[] | null;
  verdict: string | null;
  pool: { balance: number; delta: number | null; label: string | null };
  wallet: number;
  flight: { progress: number; status: string; tone: "ground" | "air" | "late"; clock: string; landed: boolean };
  settlement: { log: LogItem[]; checks: { text: string; status: Status }[]; banner: string | null };
  tamper: { attempts: { title: string; detail: string; status: Status }[]; banner: string | null };
  end: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const fromMinutes = (mins: number) => {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** How long an event keeps animating after it starts. */
function eventLength(e: DemoEvent, s: DemoScript): number {
  const t = s.timing;
  switch (e.type) {
    case "type":
      return e.text.length * t.charMs + 300;
    case "agent":
      return t.typingMs + e.text.split(" ").length * t.wordMs;
    case "log":
    case "source":
    case "check":
    case "forged":
      return e.runMs ?? t.runMs;
    case "pool":
    case "wallet":
      return e.durationMs ?? 0;
    case "flight":
      return e.durationMs;
    default:
      return 0;
  }
}

export function stepDuration(s: DemoScript, index: number): number {
  const step = s.steps[index];
  if (!step) return 0;
  return step.events.reduce((max, e) => Math.max(max, e.at + eventLength(e, s)), 0);
}

export function deriveState(s: DemoScript, stepIndex: number, elapsed: number, poolStart = 0): DemoState {
  const t = s.timing;
  const state: DemoState = {
    stepIndex,
    stepCount: s.steps.length,
    stepLabel: s.steps[stepIndex]?.label ?? "",
    input: "",
    messages: [],
    panel: "quote",
    sources: s.sources.map((source) => ({ source, status: "idle", paying: false })),
    quoteLog: [],
    calc: null,
    verdict: null,
    pool: { balance: 0, delta: null, label: null },
    wallet: 0,
    flight: { progress: 0, status: "", tone: "ground", clock: s.flight.clockStartUtc, landed: false },
    settlement: { log: [], checks: [], banner: null },
    tamper: { attempts: [], banner: null },
    end: false,
  };

  let poolDelta = 0;
  let uid = 0;

  for (let i = 0; i <= stepIndex && i < s.steps.length; i++) {
    const now = i < stepIndex ? Infinity : elapsed;
    for (const e of s.steps[i].events) {
      if (e.at > now) continue;
      const local = now - e.at;
      const id = `${i}-${uid++}`;

      switch (e.type) {
        case "type": {
          const chars = Math.floor(local / t.charMs);
          if (chars < e.text.length) state.input = e.text.slice(0, Math.max(1, chars));
          else if (local >= e.text.length * t.charMs + 300) {
            state.input = "";
            state.messages.push({ id, kind: "user", text: e.text });
          } else state.input = e.text;
          break;
        }
        case "user":
          state.messages.push({ id, kind: "user", text: e.text });
          break;
        case "system":
          state.messages.push({ id, kind: "system", text: e.text });
          break;
        case "agent": {
          const typing = local < t.typingMs;
          const words = e.text.split(" ");
          const shown = typing ? 0 : clamp(Math.floor((local - t.typingMs) / t.wordMs) + 1, 1, words.length);
          state.messages.push({ id, kind: "agent", typing, text: words.slice(0, shown).join(" ") });
          break;
        }
        case "card":
          state.messages.push({ id: e.card.id, kind: "card", card: e.card });
          break;
        case "press": {
          const msg = state.messages.find((m) => m.kind === "card" && m.card.id === e.card);
          if (msg && msg.kind === "card") msg.pressed = e.button;
          break;
        }
        case "panel":
          state.panel = e.panel;
          break;
        case "log": {
          const run = e.runMs ?? t.runMs;
          const done = local >= run;
          const item: LogItem = {
            id: e.id,
            kind: e.kind,
            title: e.title,
            detail: done ? e.detail : e.pending,
            price: e.price,
            status: done ? e.outcome ?? "done" : "running",
            doneLabel: e.doneLabel ?? "done ✓",
          };
          (e.panel === "quote" ? state.quoteLog : state.settlement.log).push(item);
          break;
        }
        case "source": {
          const node = state.sources.find((n) => n.source.id === e.source);
          if (!node) break;
          const run = e.runMs ?? t.runMs;
          const done = local >= run;
          const rejected = Boolean(node.source.rejected);
          node.status = done ? (rejected ? "rejected" : "done") : "active";
          node.paying = !done && !rejected;
          state.quoteLog.push({
            id: `src-${node.source.id}`,
            kind: "data",
            title: `${node.source.title} · ${node.source.vendor}`,
            detail: done ? node.source.result : `${rejected ? "Checking" : "Paying"} ${node.source.vendor}…`,
            price: node.source.price,
            status: done ? (rejected ? "rejected" : "done") : "running",
            doneLabel: "done ✓",
          });
          break;
        }
        case "calc":
          state.calc = [...(state.calc ?? []), { label: e.label, value: e.value, style: e.style }];
          break;
        case "verdict":
          state.verdict = e.text;
          break;
        case "pool": {
          const p = e.durationMs ? clamp(local / e.durationMs, 0, 1) : 1;
          poolDelta += e.delta * p;
          state.pool.delta = e.delta;
          state.pool.label = e.label;
          break;
        }
        case "wallet": {
          const p = e.durationMs ? clamp(local / e.durationMs, 0, 1) : 1;
          state.wallet = e.amount * p;
          break;
        }
        case "flight": {
          const p = clamp(local / e.durationMs, 0, 1);
          const start = toMinutes(s.flight.clockStartUtc);
          let end = toMinutes(s.flight.clockEndUtc);
          if (end < start) end += 1440;
          state.flight.progress = p;
          state.flight.clock = fromMinutes(start + (end - start) * p);
          state.flight.landed = p >= 1;
          break;
        }
        case "flightStatus":
          state.flight.status = e.text;
          state.flight.tone = e.tone;
          break;
        case "check": {
          const done = local >= (e.runMs ?? t.runMs);
          state.settlement.checks.push({ text: e.text, status: done ? "done" : "running" });
          break;
        }
        case "forged": {
          const done = local >= (e.runMs ?? t.runMs);
          state.tamper.attempts.push({ title: e.title, detail: e.detail, status: done ? "rejected" : "running" });
          break;
        }
        case "banner":
          if (e.panel === "settlement") state.settlement.banner = e.text;
          else state.tamper.banner = e.text;
          break;
        case "end":
          state.end = true;
          break;
      }
    }
  }

  state.pool.balance = poolStart + poolDelta;
  return state;
}
