/**
 * Types for the scripted demo. The story lives in `demo/script.ts`,
 * transactions and links in `demo/config.ts`. Components only render.
 */

export type Rail = "x402";
export interface Price {
  rail: Rail;
  amount: string; // "€0.04"
}

export type PanelId = "quote" | "flight" | "settlement" | "tamper";
export type LogKind = "data" | "rule" | "payment" | "chain" | "oracle";
export type TxKey = "research" | "policy" | "settlement" | "payout";

/** A paid (or rejected) data source on the source wheel. */
export interface Source {
  id: string;
  label: string; // short name on the wheel
  title: string; // log title, e.g. "Flight history"
  vendor: string;
  price?: Price; // omitted for rejected sources
  result: string; // one-line result shown in the log
  rejected?: string; // short reason on the wheel; presence means "rejected"
}

export interface CardButton {
  id: string;
  label: string;
  primary?: boolean;
  /** Label once pressed, e.g. "Paid ✓". */
  pressedLabel?: string;
}

export type Card =
  | {
      id: string;
      variant: "payment";
      eyebrow: string;
      text: string;
      price: Price;
      buttons: CardButton[];
      /** Shown once the card's button is pressed. */
      tx?: TxKey;
    }
  | { id: string; variant: "choice"; eyebrow?: string; text: string; buttons: CardButton[] }
  | {
      id: string;
      variant: "policy";
      eyebrow: string;
      premium: string;
      payout: string;
      text: string;
      stub: { label: string; lines: string[] }[];
      buttons: CardButton[];
    }
  | {
      id: string;
      variant: "receipt";
      eyebrow: string;
      title: string;
      text: string;
      tx: TxKey;
      stubLabel: string;
      stubValue: string;
    }
  | { id: string; variant: "payout"; eyebrow: string; headline: string; tx: TxKey; walletLabel: string };

/**
 * Everything that can happen in a step. `at` is milliseconds after the
 * presenter pressed Next. Events with a duration (typing, running → done,
 * count-ups) animate over that duration.
 */
export type DemoEvent =
  | { at: number; type: "type"; text: string } // fills the input letter by letter, then sends it as the traveller
  | { at: number; type: "user"; text: string }
  | { at: number; type: "agent"; text: string } // typing indicator, then streams word by word
  | { at: number; type: "system"; text: string }
  | { at: number; type: "card"; card: Card }
  | { at: number; type: "press"; card: string; button: string }
  | { at: number; type: "panel"; panel: PanelId }
  | {
      at: number;
      type: "log";
      panel: "quote" | "settlement";
      id: string;
      kind: LogKind;
      title: string;
      detail: string;
      pending: string;
      price?: Price;
      outcome?: "done" | "rejected";
      doneLabel?: string;
      runMs?: number;
    }
  | { at: number; type: "source"; source: string; runMs?: number }
  | { at: number; type: "calc"; label: string; value: string; style?: "sum" | "result" }
  | { at: number; type: "verdict"; text: string }
  | { at: number; type: "pool"; delta: number; label: string; durationMs?: number }
  | { at: number; type: "wallet"; amount: number; durationMs?: number }
  | { at: number; type: "flight"; durationMs: number }
  | { at: number; type: "flightStatus"; text: string; tone: "ground" | "air" | "late" }
  | { at: number; type: "check"; text: string; runMs?: number }
  | { at: number; type: "forged"; title: string; detail: string; runMs?: number }
  | { at: number; type: "banner"; panel: "settlement" | "tamper"; text: string }
  | { at: number; type: "end" };

export interface Step {
  id: string;
  label: string; // shown next to the step counter
  events: DemoEvent[];
}

export interface Airport {
  code: string;
  city: string;
}

export interface DemoScript {
  product: { name: string; tagline: string; kana?: string };
  hero: { title: string[]; highlight: string; text: string };
  traveller: { name: string; initials: string };
  agent: { initials: string; inputPlaceholder: string };
  flight: {
    number: string;
    from: Airport;
    to: Airport;
    date: string;
    distance: string;
    scheduledArrival: string;
    actualArrival: string;
    clockStartUtc: string; // UTC clock when the plane leaves the gate
    clockEndUtc: string; // UTC clock on landing
  };
  panels: Record<PanelId, { tab: string; title: string; subtitle: string }>;
  sources: Source[];
  timing: { typingMs: number; wordMs: number; charMs: number; runMs: number };
  steps: Step[];
  end: { title: string; text: string; claimsFiled: string };
}
