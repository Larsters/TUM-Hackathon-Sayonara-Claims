import type { TxKey } from "./types";

/**
 * Real transactions go here before the demo.
 * Replace each `hash` with the testnet transaction and check the explorer link opens.
 */
export const config = {
  transactions: {
    policy: {
      network: "Cardano preprod",
      hash: "a3f9e1c07b2d4f6a8e0c3b5d7f9a1c2e4b6d8f0a2c4e6b8d0f1a3c5e7b9dc21e",
      explorer: (hash: string) => `https://preprod.cardanoscan.io/transaction/${hash}`,
    },
    payout: {
      // The keeper sends the payout from the cover pool on Cardano, after FlightDelayCover settles on Base Sepolia.
      network: "Cardano preprod",
      hash: "7b1de4a09c3f5b2e8d6a1c4f7e0b9d2a5c8f3e6b1d4a7c0f9e2b5d8a1c4f6e03",
      explorer: (hash: string) => `https://preprod.cardanoscan.io/transaction/${hash}`,
    },
  } satisfies Record<TxKey, { network: string; hash: string; explorer: (hash: string) => string }>,

  /** Cover pool balance before the demo starts, in euros. */
  poolStart: 5000,

  /** End slide. Put logo files in /public and set `logo` to e.g. "/logos/cardano.svg". */
  sponsors: [
    { name: "Cardano", logo: "" },
    { name: "API3", logo: "" },
    { name: "TUM Blockchain Club", logo: "" },
  ],
  team: "[Team member names]",
  repo: "github.com/Larsters/TUM-Hackathon-Sayonara-Claims",
};
