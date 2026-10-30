import type { DemoScript, Price } from "./types";

const x402 = (amount: string): Price => ({ rail: "x402", amount });

/**
 * The whole demo story. Each step is one press of → / Next.
 * `at` is in milliseconds from the moment the step starts.
 */
export const script: DemoScript = {
  product: {
    name: "Sayonara Claims",
    kana: "さようなら",
    tagline:
      "Flight-delay cover that pays itself. An AI agent prices and sells it. Signed flight data and a smart contract pay it out.",
  },
  hero: {
    title: ["Late flight?", "Say", "to claims."],
    highlight: "sayonara",
    text: "Ask the agent about your flight. If it lands late, signed flight data triggers the payout.",
  },
  traveller: { name: "Ana", initials: "ANA" },
  agent: { initials: "SC", inputPlaceholder: "Ask about your flight…" },
  flight: {
    number: "XX 123",
    from: { code: "MUC", city: "Munich" },
    to: { code: "CMB", city: "Colombo" },
    date: "12 Nov",
    distance: "about 7,800 km",
    scheduledArrival: "12:30",
    actualArrival: "15:42",
    clockStartUtc: "23:10",
    clockEndUtc: "10:12",
  },
  panels: {
    quote: { tab: "Quote", title: "Agent reasoning", subtitle: "Every source paid, every rule checked, every number shown." },
    flight: { tab: "Flight", title: "Flight · XX 123", subtitle: "Munich → Colombo · 12 Nov · about 7,800 km" },
    settlement: {
      tab: "Settlement",
      title: "Settlement",
      subtitle: "The contract and the signed data decide. The agent is not involved.",
    },
    tamper: { tab: "Tamper test", title: "Tamper test", subtitle: "Four forged responses, sent to the same contract." },
  },
  sources: [
    { id: "history", label: "Flight history", title: "Flight history", vendor: "AeroDataBox", price: x402("€0.04"), result: "XX 123 last 90 days: 4.1% arrived ≥3h late" },
    { id: "board", label: "MUC delay board", title: "Airport delay board", vendor: "AeroDataBox", price: x402("€0.02"), result: "MUC departures today: average delay 22 min" },
    { id: "rotation", label: "OpenSky", title: "Aircraft rotation", vendor: "OpenSky Network", price: x402("€0.02"), result: "Inbound aircraft usually on time" },
    { id: "weather", label: "WeatherAPI", title: "Weather on the route", vendor: "WeatherAPI.com", price: x402("€0.03"), result: "CMB: monsoon showers likely on 12 Nov" },
    { id: "weather2", label: "CustomWeather", title: "Weather (second source)", vendor: "CustomWeather", result: "US/Canada coverage only, no data for CMB", rejected: "US/Canada only" },
    { id: "news", label: "News feed", title: "Strike and news signals", vendor: "news feed", price: x402("€0.05"), result: "German ATC union in wage talks, no strike date announced" },
    { id: "blog", label: "Blog scraper", title: "Travel blog scraper", vendor: "unknown", result: "Unsigned source, cannot be verified", rejected: "unsigned" },
  ],
  timing: { typingMs: 500, wordMs: 75, charMs: 28, runMs: 700 },
  steps: [
    { id: "intro", label: "Ready", events: [] },

    /* ── Act 1: quote ─────────────────────────────────────────── */
    {
      id: "ask",
      label: "Ana asks",
      events: [{ at: 0, type: "type", text: "I'm flying Munich to Colombo on 12 Nov, XX 123. Can I get cover if it's badly delayed?" }],
    },
    {
      id: "fee",
      label: "Research fee",
      events: [
        { at: 0, type: "agent", text: "Sure. Researching this flight costs €0.50, paid per request. Okay?" },
        {
          at: 1800,
          type: "card",
          card: {
            id: "fee",
            variant: "payment",
            eyebrow: "Research fee · paid per request",
            text: "Flight research for XX 123",
            price: x402("€0.50"),
            buttons: [{ id: "pay", label: "Pay €0.50", pressedLabel: "Paid ✓", primary: true }],
            tx: "research",
          },
        },
      ],
    },
    {
      id: "pay",
      label: "Fee paid",
      events: [
        { at: 200, type: "press", card: "fee", button: "pay" },
        { at: 300, type: "log", panel: "quote", id: "fee", kind: "payment", title: "Research fee received", detail: "Paid by Ana before any data is bought", pending: "Waiting for payment…", price: x402("€0.50"), runMs: 500 },
      ],
    },
    {
      id: "questions",
      label: "Two questions",
      events: [
        { at: 0, type: "agent", text: "Two quick questions first." },
        { at: 1000, type: "card", card: { id: "bag", variant: "choice", text: "Checked bag?", buttons: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }] } },
        { at: 1800, type: "press", card: "bag", button: "yes" },
        { at: 2400, type: "card", card: { id: "connecting", variant: "choice", text: "Is this a connecting trip?", buttons: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }] } },
        { at: 3200, type: "press", card: "connecting", button: "no" },
        { at: 3800, type: "agent", text: "Thanks. Checking the data now." },
      ],
    },
    {
      id: "research",
      label: "Data sources",
      events: [
        { at: 400, type: "source", source: "history" },
        { at: 1500, type: "source", source: "board" },
        { at: 2600, type: "source", source: "rotation" },
        { at: 3700, type: "source", source: "weather" },
        { at: 4800, type: "source", source: "weather2" },
        { at: 5900, type: "source", source: "news" },
        { at: 7000, type: "source", source: "blog" },
        { at: 8000, type: "agent", text: "Done. 5 sources used, 2 rejected. Data cost €0.16." },
      ],
    },
    {
      id: "rules",
      label: "Regulation check",
      events: [
        { at: 200, type: "log", panel: "quote", id: "eu261", kind: "rule", title: "EU261 applies", detail: "Departure from the EU, over 3,500 km → the airline may owe up to €600 for 3h+ delays.", pending: "Checking regulation…", runMs: 600 },
        { at: 1300, type: "log", panel: "quote", id: "gap", kind: "rule", title: "Gap found", detail: "Airlines can refuse for “extraordinary circumstances” (strikes, weather, air traffic control).", pending: "Checking regulation…", runMs: 600 },
        { at: 2400, type: "log", panel: "quote", id: "design", kind: "rule", title: "Design", detail: "Cover pays for any cause, so it complements EU261 instead of duplicating it.", pending: "Checking regulation…", runMs: 600 },
        { at: 3500, type: "log", panel: "quote", id: "exclusion", kind: "rule", title: "Exclusion", detail: "Strikes already announced at purchase time are not covered.", pending: "Checking regulation…", runMs: 600 },
      ],
    },
    {
      id: "pricing",
      label: "Pricing",
      events: [
        { at: 300, type: "calc", label: "base probability (route history)", value: "4.1%" },
        { at: 1100, type: "calc", label: "+ weather signal", value: "+0.8%" },
        { at: 1900, type: "calc", label: "+ strike-talks signal", value: "+1.3%" },
        { at: 2700, type: "calc", label: "= P(arrival ≥ 3h late)", value: "6.2%", style: "sum" },
        { at: 3500, type: "calc", label: "expected payout  6.2% × €250", value: "€15.50" },
        { at: 4300, type: "calc", label: "margin", value: "+€3.50" },
        { at: 5100, type: "calc", label: "premium", value: "€19.00", style: "result" },
        { at: 6200, type: "verdict", text: "✓ premium > expected payout · profitable across many policies" },
      ],
    },
    {
      id: "policy",
      label: "Policy offer",
      events: [
        { at: 0, type: "agent", text: "Here is your cover." },
        {
          at: 1000,
          type: "card",
          card: {
            id: "policy",
            variant: "policy",
            eyebrow: "Delay cover · offer",
            premium: "€19",
            payout: "€250",
            text: "if you arrive 3h+ late, for any reason. Paid automatically. No claim to file.",
            stub: [
              { label: "Flight", lines: ["XX 123", "MUC → CMB", "12 NOV"] },
              { label: "Trigger", lines: ["≥ 180 min", "any cause"] },
            ],
            buttons: [
              { id: "buy", label: "Buy", primary: true },
              { id: "customise", label: "Customise" },
            ],
          },
        },
      ],
    },
    {
      id: "customise",
      label: "Customise",
      events: [
        { at: 300, type: "press", card: "policy", button: "customise" },
        { at: 600, type: "agent", text: "Would you rather have a lower threshold?" },
        {
          at: 2000,
          type: "card",
          card: {
            id: "threshold",
            variant: "choice",
            eyebrow: "Choose your threshold",
            text: "",
            buttons: [
              { id: "2h", label: "2h → €150 for €21" },
              { id: "3h", label: "Keep 3h → €250 for €19" },
            ],
          },
        },
        { at: 3200, type: "press", card: "threshold", button: "3h" },
      ],
    },
    {
      id: "buy",
      label: "Policy bought",
      events: [
        { at: 100, type: "user", text: "Keep 3h. Buy it." },
        { at: 300, type: "press", card: "policy", button: "buy" },
        { at: 800, type: "card", card: { id: "receipt", variant: "receipt", eyebrow: "Payment confirmed", title: "Policy #0042", text: "paid €19 · Cardano preprod", tx: "policy", stubLabel: "Policy", stubValue: "#0042" } },
        { at: 1000, type: "log", panel: "quote", id: "registered", kind: "chain", title: "Policy registered on-chain", detail: "Policy #0042 · Cardano preprod", pending: "Submitting transaction…", runMs: 800 },
        { at: 1800, type: "pool", delta: 19, label: "premium in", durationMs: 600 },
      ],
    },

    /* ── Act 2: the flight ────────────────────────────────────── */
    {
      id: "flight",
      label: "The flight",
      events: [
        { at: 0, type: "panel", panel: "flight" },
        { at: 0, type: "flightStatus", text: "Boarding · departure delayed", tone: "ground" },
        { at: 600, type: "flight", durationMs: 7000 },
        { at: 600, type: "flightStatus", text: "Departed 2h 40m late (ATC strike)", tone: "air" },
        { at: 7600, type: "flightStatus", text: "Landed: 3h 12m late", tone: "late" },
      ],
    },
    { id: "landed", label: "Landed late", events: [{ at: 100, type: "system", text: "Your flight landed 3h 12m late." }] },
    {
      id: "settle",
      label: "Settlement",
      events: [
        { at: 0, type: "panel", panel: "settlement" },
        { at: 200, type: "log", panel: "settlement", id: "keeper", kind: "oracle", title: "Keeper fetched signed flight status", detail: "AirnodeHub · AeroDataBox · XX 123 · 12 Nov", pending: "Fetching from AirnodeHub…", doneLabel: "signed ✓", runMs: 800 },
        { at: 1400, type: "check", text: "Signature from the expected data provider" },
        { at: 2200, type: "check", text: "Response is for XX 123 on 12 Nov" },
        { at: 3000, type: "check", text: "Response is fresh" },
        { at: 3800, type: "check", text: "Delay computed by the contract: 192 min ≥ 180 min" },
        { at: 4600, type: "check", text: "Policy not paid before" },
        { at: 5800, type: "banner", panel: "settlement", text: "Contract released €250 to Ana's wallet" },
      ],
    },
    {
      id: "payout",
      label: "Payout",
      events: [
        { at: 200, type: "card", card: { id: "payout", variant: "payout", eyebrow: "Payout · sent by the cover contract", headline: "€250 sent to your wallet", tx: "payout", walletLabel: "Ana's wallet" } },
        { at: 400, type: "wallet", amount: 250, durationMs: 2000 },
        { at: 400, type: "pool", delta: -250, label: "payout out", durationMs: 2000 },
        { at: 2800, type: "agent", text: "Nobody filed a claim. The flight data was the claim." },
      ],
    },

    /* ── Act 3: tamper test ───────────────────────────────────── */
    {
      id: "tamper",
      label: "Tamper test",
      events: [
        { at: 0, type: "panel", panel: "tamper" },
        { at: 400, type: "forged", title: "Edited value", detail: "Delay changed from 12 to 192 min → signature invalid" },
        { at: 1600, type: "forged", title: "Stale response", detail: "Older than allowed → rejected" },
        { at: 2800, type: "forged", title: "Different flight", detail: "Response is for XX 456 → rejected" },
        { at: 4000, type: "forged", title: "Wrong signer", detail: "Not the expected data provider → rejected" },
        { at: 5200, type: "banner", panel: "tamper", text: "Only real, signed, fresh data for this exact policy can trigger a payout." },
      ],
    },

    /* ── Close ─────────────────────────────────────────────────── */
    { id: "end", label: "Close", events: [{ at: 0, type: "end" }] },
  ],
  end: {
    title: "Sayonara Claims",
    text: "Flight-delay cover that pays itself. An AI agent prices and sells it. Signed flight data and a smart contract pay it out.",
    claimsFiled: "0",
  },
};
