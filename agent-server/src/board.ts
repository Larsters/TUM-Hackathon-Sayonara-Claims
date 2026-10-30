/**
 * Live data the agent buys from AirnodeHub besides the flight itself: the
 * departure board at the origin (AeroDataBox) and natural events near the
 * route (NASA EONET). Both are paid over x402 in aUSD on Base Sepolia.
 */
import { callAirnode } from "./airnode.js";

const minutesBetween = (from?: string, to?: string) =>
  from && to ? (Date.parse(to.replace(" ", "T")) - Date.parse(from.replace(" ", "T"))) / 60_000 : null;

/** Average departure delay at the airport over the last two hours. */
export const lookUpBoard = async (iata: string) => {
  try {
    const { data, paymentTx } = await callAirnode("https://airnode-aerodatabox.fly.dev/", "airportSchedule", {
      codeType: "iata", code: iata, offsetMinutes: -120, durationMinutes: 120, direction: "Departure", withCancelled: false, withCodeshared: false,
    });
    const departures = ((data as { departures?: unknown[] } | null)?.departures ?? []) as { movement?: Record<string, { utc?: string }> }[];
    const delays = departures
      .map(f => minutesBetween(f.movement?.scheduledTime?.utc, f.movement?.revisedTime?.utc))
      .filter((d): d is number => d !== null && d >= 0);
    if (delays.length === 0) return null;
    return { averageDelayMinutes: Math.round(delays.reduce((a, b) => a + b, 0) / delays.length), flights: delays.length, paymentTx };
  } catch {
    return null;
  }
};

export interface Point {
  lat: number;
  lon: number;
}

/** Open storms, volcanic eruptions and wildfires of the last two weeks inside the box around both airports. */
export const lookUpNaturalEvents = async (from: Point, to: Point) => {
  try {
    const pad = 5;
    const west = Math.max(-180, Math.min(from.lon, to.lon) - pad);
    const east = Math.min(180, Math.max(from.lon, to.lon) + pad);
    const north = Math.min(90, Math.max(from.lat, to.lat) + pad);
    const south = Math.max(-90, Math.min(from.lat, to.lat) - pad);
    const { data, paymentTx } = await callAirnode("https://airnode-eonet.fly.dev/", "getEvents", {
      category: "severeStorms,volcanoes,wildfires", status: "open", days: 14, limit: 50, bbox: `${west},${north},${east},${south}`,
    });
    const events = ((data as { events?: unknown[] } | null)?.events ?? []) as { title?: string; categories?: { id?: string }[] }[];
    const count = (id: string) => events.filter(e => e.categories?.some(c => c.id === id)).length;
    return { total: events.length, storms: count("severeStorms"), volcanoes: count("volcanoes"), wildfires: count("wildfires"), first: events[0]?.title, paymentTx };
  } catch {
    return null;
  }
};
