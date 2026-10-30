/**
 * Ana's past trips. LH 501 is real: it arrived 7h 08m late on 30 Oct 2026, and
 * we insured and settled it on testnet with its real signed AeroDataBox data
 * (a replay, since the policy was created after the flight had landed).
 */
import { readFileSync } from "node:fs";
import { checkJurisdiction } from "./jurisdiction.js";

const cardanoscan = (hash: string) => `https://preprod.cardanoscan.io/transaction/${hash}`;
const basescan = (hash: string) => `https://sepolia.basescan.org/tx/${hash}`;

const readKeeperPayout = (policyId: string) => {
  try {
    const log = JSON.parse(readFileSync("keeper-log.json", "utf8")) as { policyId: string; payoutTransaction: string }[];
    return log.find(entry => entry.policyId === policyId)?.payoutTransaction;
  } catch {
    return undefined;
  }
};

export const buildHistory = () => {
  const payout = readKeeperPayout("1") ?? "3a00133e35e764edbb0ede7127a87b8d27000ba59a1587868f721a725d6ceb92";
  return [
    {
      id: "lh501",
      replay: true,
      flight: {
        number: "LH 501",
        airline: "Lufthansa",
        aircraft: "Boeing 747 (D-ABYL)",
        date: "2026-10-29",
        from: { iata: "GIG", city: "Rio de Janeiro", country: "BR" },
        to: { iata: "FRA", city: "Frankfurt", country: "DE" },
        distanceKm: 9568,
        scheduledArrivalUtc: "2026-10-30 05:55Z",
        actualArrivalUtc: "2026-10-30 13:03Z",
      },
      delayMinutes: 428,
      policy: { id: "1", thresholdMinutes: 180, premiumEur: 19, payoutEur: 250, payoutTada: 50 },
      status: "PaidOut",
      jurisdiction: checkJurisdiction({ fromCountry: "BR", toCountry: "DE", airlineIata: "LH", distanceKm: 9568 }),
      checks: [
        "Signed by the AeroDataBox Airnode (0x83FE…f2Ec)",
        "Response is for LH 501 departing 29 Oct",
        "Response is fresh",
        "Flight status: Arrived",
        "Delay computed by the contract: 428 min ≥ 180 min",
        "Policy not paid before",
      ],
      transactions: [
        { kind: "Policy registered", chain: "Base Sepolia", hash: "0x254d0c8fcff1093abbe1befef210cf0a7c52bdcedb2f6105dc06d3bbef4a628b", explorer: basescan("0x254d0c8fcff1093abbe1befef210cf0a7c52bdcedb2f6105dc06d3bbef4a628b") },
        { kind: "Signed flight status bought (x402, 0.05 aUSD)", chain: "Base Sepolia", hash: "0x9a6ec2b5add4f5001c0e52122a148fda981c13d504e95e82d3f80ff1b5d67bf5", explorer: basescan("0x9a6ec2b5add4f5001c0e52122a148fda981c13d504e95e82d3f80ff1b5d67bf5") },
        { kind: "Policy settled: PaidOut, 428 min late", chain: "Base Sepolia", hash: "0xda8d73e8d276b9c7da9d5f23b57077a1cc93f76beb4172f229e9b718f602f4fe", explorer: basescan("0xda8d73e8d276b9c7da9d5f23b57077a1cc93f76beb4172f229e9b718f602f4fe") },
        { kind: "Payout €250 (50 tADA) to Ana", chain: "Cardano preprod", hash: payout, explorer: cardanoscan(payout) },
      ],
    },
  ];
};
