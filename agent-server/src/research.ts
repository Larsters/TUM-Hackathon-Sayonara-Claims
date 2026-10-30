/**
 * The agent's research for one flight, streamed step by step to the frontend.
 *
 * Real: the research fee (x402 on Cardano preprod), the flight's schedule and
 * the departure board (AeroDataBox, bought over x402 on Base Sepolia).
 * Scripted for the demo: the other data sources' findings.
 * Deterministic: the jurisdiction check and the price. No language model
 * touches a number here.
 */
import { checkJurisdiction, type JurisdictionCheck } from "./jurisdiction.js";
import { lookUpBoard } from "./board.js";
import { BASESCAN, lookUpFlight } from "./evm.js";
import { eurToLovelace } from "./quote.js";

export type ResearchEvent =
  | { type: "fee"; status: "pending" | "paid" | "failed"; transaction?: string; explorer?: string; error?: string }
  | { type: "source"; id: string; status: "active" | "done" | "rejected"; finding?: string; price?: string; transaction?: string; explorer?: string; live?: boolean }
  | { type: "flight"; flight: FlightFacts }
  | { type: "rules"; check: JurisdictionCheck }
  | { type: "pricing"; lines: { label: string; value: string; style?: "sum" | "result" }[]; verdict: string }
  | { type: "quote"; quote: Quote }
  | { type: "error"; message: string }
  | { type: "done" };

export interface FlightFacts {
  number: string;
  date: string;
  airline?: string;
  airlineIata?: string;
  aircraft?: string;
  from: { iata?: string; city?: string; country?: string; scheduledLocal?: string };
  to: { iata?: string; city?: string; country?: string; scheduledLocal?: string };
  distanceKm?: number;
  status?: string;
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

export const SOURCES = [
  { id: "schedule", label: "Flight schedule", vendor: "AeroDataBox", price: "x402 · 0.05 aUSD" },
  { id: "board", label: "Departure board", vendor: "AeroDataBox", price: "x402 · 0.05 aUSD" },
  { id: "rotation", label: "Aircraft rotation", vendor: "OpenSky", price: "x402 · €0.02" },
  { id: "weather", label: "Route weather", vendor: "WeatherAPI.com", price: "x402 · €0.03" },
  { id: "weather2", label: "Weather #2", vendor: "CustomWeather", price: "x402 · €0.03" },
  { id: "news", label: "Strike signals", vendor: "News feed", price: "x402 · €0.05" },
  { id: "blog", label: "Travel blog", vendor: "Scraper", price: "" },
] as const;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const leg = (value: unknown) => (value ?? {}) as Record<string, any>;
const localTime = (time?: string) => time?.slice(0, 16).replace("T", " ");

const factsFrom = (number: string, date: string, data: Record<string, unknown> | null, hint: { from?: string; to?: string }): FlightFacts => {
  const d = leg(data);
  return {
    number: d.number ?? number,
    date,
    airline: d.airline?.name,
    airlineIata: d.airline?.iata,
    aircraft: d.aircraft?.model,
    from: {
      iata: d.departure?.airport?.iata ?? hint.from,
      city: d.departure?.airport?.municipalityName ?? d.departure?.airport?.shortName,
      country: d.departure?.airport?.countryCode,
      scheduledLocal: localTime(d.departure?.scheduledTime?.local),
    },
    to: {
      iata: d.arrival?.airport?.iata ?? hint.to,
      city: d.arrival?.airport?.municipalityName ?? d.arrival?.airport?.shortName,
      country: d.arrival?.airport?.countryCode,
      scheduledLocal: localTime(d.arrival?.scheduledTime?.local),
    },
    distanceKm: d.greatCircleDistance?.km,
    status: d.status,
  };
};

export const runResearch = async (
  { flight, date, from, to }: { flight: string; date: string; from?: string; to?: string },
  send: (event: ResearchEvent) => void,
  payFee: () => Promise<string | undefined>,
) => {
  // The fee settles on Cardano in 20–60 s. The agent starts buying data once the payment is signed, and waits for
  // settlement before it hands over the quote.
  send({ type: "fee", status: "pending" });
  const fee = payFee().then(
    transaction => {
      send({ type: "fee", status: "paid", transaction, explorer: `https://preprod.cardanoscan.io/transaction/${transaction}` });
      return true;
    },
    error => {
      send({ type: "fee", status: "failed", error: String(error) });
      return false;
    },
  );

  // 1. The flight itself: real, paid over x402
  send({ type: "source", id: "schedule", status: "active" });
  const lookup = await lookUpFlight(flight, date);
  const facts = factsFrom(flight, date, lookup.flight, { from, to });
  const paid = lookup.paymentTx ? { transaction: lookup.paymentTx, explorer: `${BASESCAN}/${lookup.paymentTx}` } : {};
  if (lookup.flight) {
    send({
      type: "source", id: "schedule", status: "done", live: true, price: "x402 · 0.05 aUSD", ...paid,
      finding: `${facts.number} · ${facts.from.iata} → ${facts.to.iata}${facts.aircraft ? ` · ${facts.aircraft}` : ""}${facts.from.scheduledLocal ? ` · departs ${facts.from.scheduledLocal.slice(11)}` : ""}`,
    });
  } else {
    send({ type: "source", id: "schedule", status: "rejected", live: true, ...paid, finding: `No schedule found for ${flight} on ${date}` });
  }
  send({ type: "flight", flight: facts });

  // 2. Live departure board at the origin: real, paid over x402
  send({ type: "source", id: "board", status: "active" });
  const board = facts.from.iata ? await lookUpBoard(facts.from.iata) : null;
  const boardDelay = board?.averageDelayMinutes ?? null;
  if (board && boardDelay !== null) {
    send({
      type: "source", id: "board", status: "done", live: true, price: "x402 · 0.05 aUSD",
      ...(board.paymentTx ? { transaction: board.paymentTx, explorer: `${BASESCAN}/${board.paymentTx}` } : {}),
      finding: `${facts.from.iata} departures, last 2h: average delay ${boardDelay} min (${board.flights} flights)`,
    });
  } else {
    send({ type: "source", id: "board", status: "rejected", live: true, finding: "Departure board unavailable right now" });
  }

  // 3–7. The other sources, scripted for the demo
  const city = facts.to.city ?? facts.to.iata ?? "the destination";
  const northAmerica = facts.to.country === "US" || facts.to.country === "CA";
  const germanDeparture = facts.from.country === "DE";
  const scripted: { id: string; ok: boolean; finding: string; price?: string }[] = [
    { id: "rotation", ok: true, price: "x402 · €0.02", finding: "Inbound aircraft usually on time on this rotation" },
    { id: "weather", ok: true, price: "x402 · €0.03", finding: `${city}: showers possible on arrival day` },
    northAmerica
      ? { id: "weather2", ok: true, price: "x402 · €0.03", finding: `${city}: second forecast agrees` }
      : { id: "weather2", ok: false, finding: `US/Canada coverage only, no data for ${city}` },
    {
      id: "news", ok: true, price: "x402 · €0.05",
      finding: germanDeparture ? "German ATC union in wage talks, no strike date announced" : "No industrial action announced on this route",
    },
    { id: "blog", ok: false, finding: "Unsigned source, cannot be verified" },
  ];
  for (const source of scripted) {
    send({ type: "source", id: source.id, status: "active" });
    await wait(900);
    send({ type: "source", id: source.id, status: source.ok ? "done" : "rejected", finding: source.finding, price: source.price });
  }

  // Rules
  const jurisdiction = checkJurisdiction({
    fromCountry: facts.from.country,
    toCountry: facts.to.country,
    airlineIata: facts.airlineIata,
    distanceKm: facts.distanceKm,
  });
  await wait(500);
  send({ type: "rules", check: jurisdiction });

  // Price: probability of a 3h+ late arrival, times the payout, plus a margin
  const km = facts.distanceKm ?? 8000;
  const base = km > 3500 ? 0.041 : km > 1500 ? 0.034 : 0.025;
  const boardSignal = boardDelay !== null && boardDelay > 20 ? 0.005 : 0;
  const weatherSignal = 0.008;
  const strikeSignal = germanDeparture ? 0.013 : 0.004;
  const probability = base + boardSignal + weatherSignal + strikeSignal;
  const premiumFor = (p: number, payout: number) => Math.ceil(p * payout * 1.22);
  const standard: CoverOption = {
    id: "standard", thresholdMinutes: 180, payoutEur: 250, premiumEur: premiumFor(probability, 250),
    payoutLovelace: eurToLovelace(250).toString(), premiumLovelace: eurToLovelace(premiumFor(probability, 250)).toString(),
  };
  // A 2h threshold is hit about 1.35 times as often
  const lower: CoverOption = {
    id: "lower", thresholdMinutes: 120, payoutEur: 150, premiumEur: premiumFor(probability * 1.35, 150),
    payoutLovelace: eurToLovelace(150).toString(), premiumLovelace: eurToLovelace(premiumFor(probability * 1.35, 150)).toString(),
  };
  const pct = (p: number) => `${(p * 100).toFixed(1)}%`;
  const expected = probability * standard.payoutEur;
  await wait(400);
  send({
    type: "pricing",
    lines: [
      { label: `base rate (${km > 3500 ? "long" : km > 1500 ? "medium" : "short"} haul)`, value: pct(base) },
      { label: "+ departure board signal", value: `+${pct(boardSignal)}` },
      { label: "+ weather signal", value: `+${pct(weatherSignal)}` },
      { label: "+ strike signal", value: `+${pct(strikeSignal)}` },
      { label: "= P(arrival 3h+ late)", value: pct(probability), style: "sum" },
      { label: `expected payout ${pct(probability)} × €${standard.payoutEur}`, value: `€${expected.toFixed(2)}` },
      { label: "margin", value: `+€${(standard.premiumEur - expected).toFixed(2)}` },
      { label: "premium", value: `€${standard.premiumEur.toFixed(2)}`, style: "result" },
    ],
    verdict: "premium > expected payout ✓",
  });

  const feePaid = await fee;
  send({ type: "quote", quote: { flight: facts, probability, options: [standard, lower], jurisdiction } });
  if (!feePaid) send({ type: "error", message: "The research fee did not settle on Cardano; the quote is shown anyway for the demo." });
  send({ type: "done" });
};
