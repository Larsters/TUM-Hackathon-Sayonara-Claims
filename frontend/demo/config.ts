import type { TxKey } from "./types";

const cardanoscan = (hash: string) => `https://preprod.cardanoscan.io/transaction/${hash}`;
const basescan = (hash: string) => `https://sepolia.basescan.org/tx/${hash}`;

/**
 * Real testnet transactions shown in the demo. Testnet amounts are scaled: on Cardano preprod 1 tADA stands for €5
 * (premium €19 = 3.8 tADA, payout €250 = 50 tADA), and the research fee is a flat 2 tADA.
 * `pending: true` marks a placeholder that still has to be replaced with a real transaction.
 */
export const config = {
  transactions: {
    research: {
      // x402 research fee, paid by Ana's agent to the cover pool (agent-server POST /demo/research)
      network: "Cardano preprod",
      hash: "72cd57f6293771fec3dbad4e171db00a776ca260f67feddb92fd1923c4519b6f",
      explorer: cardanoscan,
    },
    policy: {
      // Premium paid by Ana to the cover pool, policy terms in the metadata (agent-server POST /demo/buy-policy)
      network: "Cardano preprod",
      hash: "43a899e00f75a8903127b8311e5f2ef1ecc2695d31bb289ab695978c13a3942b",
      explorer: cardanoscan,
    },
    settlement: {
      // FlightDelayCover.settle with the signed AeroDataBox response (settlement/ npm run flight -- settle)
      network: "Base Sepolia",
      hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      explorer: basescan,
      pending: true,
    },
    payout: {
      // Payout from the cover pool, sent by the keeper after PolicySettled (agent-server npm run keeper)
      network: "Cardano preprod",
      hash: "0000000000000000000000000000000000000000000000000000000000000000",
      explorer: cardanoscan,
      pending: true,
    },
  } satisfies Record<TxKey, { network: string; hash: string; explorer: (hash: string) => string; pending?: boolean }>,

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
