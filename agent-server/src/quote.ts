/**
 * The scripted research and quote for the demo flight. The agent's reasoning
 * is fixed; what is real is that the research is paid for over x402 on
 * Cardano preprod before it is returned.
 *
 * The quote is in euros. On Cardano preprod 1 tADA stands for €5, so the
 * €250 payout is 50 tADA and the €19 premium is 3.8 tADA. The research fee is
 * a flat 2 tADA, about the smallest payment Cardano allows.
 */
export const RESEARCH_FEE_LOVELACE = 2_000_000n;
export const EUR_PER_TADA = 5;
export const eurToLovelace = (eur: number) => BigInt(Math.round((eur / EUR_PER_TADA) * 1_000_000));

export const buildQuote = (flight: string, date: string) => {
  const probability = 0.041 + 0.008 + 0.013;
  const payout = 250;
  const expectedPayout = probability * payout;
  const premium = 19;
  return {
    flight,
    date,
    route: { from: "MUC", to: "CMB", distanceKm: 7800 },
    sources: [
      { name: "AeroDataBox", topic: "Flight history", priceUsd: 0.05, signed: true, accepted: true, finding: "Last 90 days: 4.1% arrived 3h+ late" },
      { name: "AeroDataBox", topic: "Airport delay board", priceUsd: 0.05, signed: true, accepted: true, finding: "MUC departures today: average delay 22 min" },
      { name: "OpenSky Network", topic: "Aircraft rotation", priceUsd: 0.02, signed: true, accepted: true, finding: "Inbound aircraft usually on time" },
      { name: "WeatherAPI.com", topic: "Weather on the route", priceUsd: 0.03, signed: true, accepted: true, finding: "CMB: monsoon showers likely" },
      { name: "CustomWeather", topic: "Weather, second source", priceUsd: 0, signed: true, accepted: false, finding: "US/Canada coverage only, no data for CMB" },
      { name: "News feed", topic: "Strike signals", priceUsd: 0.05, signed: true, accepted: true, finding: "German ATC union in wage talks, no strike date announced" },
      { name: "Travel blog scraper", topic: "Disruption rumours", priceUsd: 0, signed: false, accepted: false, finding: "Unsigned source, cannot be verified" },
    ],
    regulations: [
      "EU261 applies: departure from the EU, over 3,500 km, so the airline may owe up to €600 for a 3h+ delay",
      "Airlines can refuse for extraordinary circumstances: strikes, weather, air traffic control",
      "This cover pays for any cause, so it complements EU261 instead of duplicating it",
      "Strikes already announced at purchase time are excluded",
    ],
    pricing: {
      baseProbability: 0.041,
      weatherSignal: 0.008,
      strikeSignal: 0.013,
      probability,
      payout,
      expectedPayout,
      margin: premium - expectedPayout,
      premium,
      premiumExceedsExpectedPayout: premium > expectedPayout,
    },
    policy: {
      delayThresholdMinutes: 180,
      payoutEur: payout,
      premiumEur: premium,
      payoutLovelace: eurToLovelace(payout).toString(),
      premiumLovelace: eurToLovelace(premium).toString(),
    },
  };
};
