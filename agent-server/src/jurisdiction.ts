/**
 * Passenger-rights rules the agent checks before it designs cover. They are
 * simplified for the demo and are not legal advice. The point is the
 * mechanism: the rules are code, so the agent explains them and never makes
 * them up.
 */

const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU",
  "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // EU261 also applies in these
  "IS", "NO", "CH",
]);

// IATA codes of some EU-licensed airlines, enough for the demo
const EU_AIRLINES = new Set(["LH", "OS", "LX", "SN", "EW", "AF", "KL", "IB", "VY", "AZ", "TP", "SK", "AY", "EI", "FR", "U2", "W6", "DE", "4Y", "EN", "LO", "OK", "A3"]);

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

const eu261Band = (distanceKm: number) => (distanceKm <= 1500 ? 250 : distanceKm <= 3500 ? 400 : 600);

export const checkJurisdiction = ({ fromCountry, toCountry, airlineIata, distanceKm }: {
  fromCountry?: string;
  toCountry?: string;
  airlineIata?: string;
  distanceKm?: number;
}): JurisdictionCheck => {
  const from = fromCountry?.toUpperCase();
  const to = toCountry?.toUpperCase();
  const departsEu = from ? EU_COUNTRIES.has(from) : false;
  const arrivesEuOnEuCarrier = (to ? EU_COUNTRIES.has(to) : false) && (airlineIata ? EU_AIRLINES.has(airlineIata) : false);
  const eu261 = departsEu || arrivesEuOnEuCarrier;
  const band = distanceKm ? eu261Band(distanceKm) : 600;

  const rules: Rule[] = [
    {
      id: "eu261",
      title: "EU261 (Regulation 261/2004)",
      applies: eu261,
      detail: eu261
        ? `${departsEu ? "Departs from the EU" : "EU airline flying into the EU"}${distanceKm ? `, ${Math.round(distanceKm).toLocaleString("en-US")} km` : ""}: the airline may owe €${band} for an arrival 3h+ late`
        : "Does not apply: the flight neither departs from the EU nor is an EU airline flying into the EU",
    },
    {
      id: "anac400",
      title: "Brazil, ANAC Resolution 400",
      applies: from === "BR",
      detail:
        from === "BR"
          ? "Departs from Brazil: the airline must provide meals after 2h and a hotel after 4h of delay, but pays no fixed compensation"
          : "Does not apply: the flight does not depart from Brazil",
    },
    {
      id: "montreal",
      title: "Montreal Convention",
      applies: true,
      detail: "Applies to international flights, but only for damage you can prove, with receipts and a claim",
    },
  ];

  return {
    rules,
    airlineOwesEur: eu261 ? band : null,
    gap: eu261
      ? "Airlines can refuse EU261 for extraordinary circumstances: strikes, weather, air traffic control. Even when they pay, it takes months"
      : "No fixed compensation applies to this flight: without cover, a long delay costs you money",
    design: "This cover pays for any cause, within minutes and without a claim, so it complements the airline's obligations",
    exclusion: "Strikes or storms already announced when you buy are not covered",
  };
};
