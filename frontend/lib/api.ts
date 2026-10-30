/** Client for the agent server (agent-server/). */

export const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:4021";

export interface FlightDraft {
  number: string | null;
  date: string | null;
  from: string | null;
  to: string | null;
}

export type AgentAction = "none" | "offer_research" | "offer_policy" | "show_options" | "confirm_purchase";

export interface AgentTurn {
  reply: string;
  flight: FlightDraft;
  action: AgentAction;
}

export interface Place {
  iata?: string;
  city?: string;
  country?: string;
  scheduledLocal?: string;
}

export interface FlightFacts {
  number: string;
  date: string;
  airline?: string;
  airlineIata?: string;
  aircraft?: string;
  from: Place;
  to: Place;
  distanceKm?: number;
  status?: string;
}

export interface Rule {
  id: string;
  title: string;
  applies: boolean;
  detail: string;
}

export interface JurisdictionCheck {
  rules: Rule[];
  airlineOwesEur: number | null;
  gap: string;
  design: string;
  exclusion: string;
}

export interface CoverOption {
  id: "standard" | "lower";
  thresholdMinutes: number;
  payoutEur: number;
  premiumEur: number;
  payoutLovelace: string;
  premiumLovelace: string;
}

export interface Quote {
  flight: FlightFacts;
  probability: number;
  options: CoverOption[];
  jurisdiction: JurisdictionCheck;
}

export interface CalcLine {
  label: string;
  value: string;
  style?: "sum" | "result";
}

export type ResearchEvent =
  | { type: "fee"; status: "pending" | "paid" | "failed"; transaction?: string; explorer?: string; error?: string }
  | { type: "source"; id: string; status: "active" | "done" | "rejected"; finding?: string; price?: string; transaction?: string; explorer?: string; live?: boolean }
  | { type: "flight"; flight: FlightFacts }
  | { type: "rules"; check: JurisdictionCheck }
  | { type: "pricing"; lines: CalcLine[]; verdict: string }
  | { type: "quote"; quote: Quote }
  | { type: "error"; message: string }
  | { type: "done" };

export interface Purchase {
  premium: { transaction: string; explorer: string };
  registration: { transaction: string; explorer: string; policyId?: string };
}

export interface Wallets {
  eurPerTada: number;
  traveller: { name: string; address: string; display: string; eur: number };
  pool: { address: string; display: string; eur: number };
}

export interface TripTransaction {
  kind: string;
  chain: string;
  hash: string;
  explorer: string;
}

export interface Trip {
  id: string;
  replay?: boolean;
  flight: FlightFacts & { scheduledArrivalUtc?: string; actualArrivalUtc?: string };
  delayMinutes?: number;
  policy: { id?: string; thresholdMinutes: number; premiumEur: number; payoutEur: number };
  status: "Active" | "PaidOut" | "Expired";
  jurisdiction: JurisdictionCheck;
  checks?: string[];
  transactions: TripTransaction[];
}

const post = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${AGENT_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? `HTTP ${response.status}`);
  return json as T;
};

const get = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${AGENT_URL}${path}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
};

export const api = {
  chat: (messages: { role: "user" | "assistant"; content: string }[], context: Record<string, unknown>) =>
    post<AgentTurn>("/api/chat", { messages, context }),
  buyPolicy: (flight: string, date: string, option: CoverOption) => post<Purchase>("/demo/buy-policy", { flight, date, option }),
  wallets: () => get<Wallets>("/demo/wallets"),
  history: () => get<Trip[]>("/demo/history"),

  /**
   * Reads the server-sent research events as they arrive. If the stream breaks, it fetches the rest of the run from
   * the server, which keeps every run's events, so the quote still arrives.
   */
  async research(body: { flight: string; date: string; from?: string | null; to?: string | null }, onEvent: (event: ResearchEvent) => void) {
    let runId: string | null = null;
    let next = 0;
    let finished = false;
    const deliver = (event: ResearchEvent & { index?: number; runId?: string }) => {
      if (event.index !== undefined) {
        if (event.index < next) return;
        next = event.index + 1;
      }
      if (event.type === ("run" as string)) runId = event.runId ?? null;
      if (event.type === "done") finished = true;
      onEvent(event);
    };
    try {
      const response = await fetch(`${AGENT_URL}/demo/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok || !response.body) throw new Error(`Research failed with HTTP ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.trim();
          if (line.startsWith("data: ")) deliver(JSON.parse(line.slice(6)));
        }
      }
    } catch (error) {
      if (!runId) throw error;
    }
    // The stream ended early: catch up from the stored run until it is done.
    for (let attempt = 0; !finished && runId && attempt < 120; attempt++) {
      try {
        const run = await get<{ events: (ResearchEvent & { index: number })[]; done: boolean }>(`/demo/research/${runId}`);
        run.events.forEach(deliver);
        if (run.done) break;
      } catch {
        /* the server is busy or restarting; try again */
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  },
};
