/**
 * Payout keeper: watches FlightDelayCover on Base Sepolia and, for every
 * policy the contract settled as PaidOut, sends the payout from the cover
 * pool to the traveller's Cardano preprod address.
 *
 * This is the one trusted step in the demo: the contract decides, and this
 * keeper carries the decision across chains. It pays each policy once, and
 * the payout's metadata names the settlement transaction it carries out.
 *
 * The contract stores payouts with 6 decimals, the same as lovelace, so
 * 250e6 pays 250 tADA.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import { createPublicClient, http, isAddress, parseAbiItem } from "viem";
import { baseSepolia } from "viem/chains";
import { EXPLORER, formatAda, pay } from "./cardano.js";

config();

const coverAddress = process.env.COVER_ADDRESS;
const poolMnemonic = process.env.POOL_MNEMONIC;
if (!coverAddress || !isAddress(coverAddress) || !poolMnemonic) {
  console.error("Set COVER_ADDRESS (the FlightDelayCover address on Base Sepolia) and POOL_MNEMONIC in .env");
  process.exit(1);
}
const fromBlock = BigInt(process.env.COVER_FROM_BLOCK ?? 0);
const POLL_MS = 10_000;
const KEEPER_LOG = "keeper-log.json";
const PAID_OUT = 2;

const policySettled = parseAbiItem(
  "event PolicySettled(uint256 indexed policyId, uint8 status, uint256 delayMinutes, uint256 payoutAmount, string payoutAddress)",
);
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"),
});

interface Payout {
  policyId: string;
  delayMinutes: string;
  settlementTransaction: string;
  payoutTransaction: string;
  explorer: string;
  to: string;
  lovelace: string;
  paidAt: string;
}

const readLog = (): Payout[] => {
  try {
    return JSON.parse(readFileSync(KEEPER_LOG, "utf8")) as Payout[];
  } catch {
    return [];
  }
};

const payNewSettlements = async () => {
  const logs = await client.getLogs({ address: coverAddress, event: policySettled, fromBlock, toBlock: "latest" });
  for (const { args, transactionHash } of logs) {
    const { policyId, status, delayMinutes, payoutAmount, payoutAddress } = args;
    if (status !== PAID_OUT || policyId === undefined || !payoutAddress || !payoutAmount) continue;
    const payouts = readLog();
    if (payouts.some(payout => payout.policyId === policyId.toString())) continue;

    console.log(`Policy ${policyId} paid out (${delayMinutes} min late): sending ${formatAda(payoutAmount)} to ${payoutAddress}`);
    const payoutTransaction = await pay({
      mnemonic: poolMnemonic,
      to: payoutAddress,
      lovelace: payoutAmount,
      message: ["Sayonara Claims payout", `policy ${policyId}, ${delayMinutes} min late`, `settled on Base Sepolia`, transactionHash],
    });
    payouts.push({
      policyId: policyId.toString(),
      delayMinutes: String(delayMinutes),
      settlementTransaction: transactionHash,
      payoutTransaction,
      explorer: `${EXPLORER}/${payoutTransaction}`,
      to: payoutAddress,
      lovelace: payoutAmount.toString(),
      paidAt: new Date().toISOString(),
    });
    writeFileSync(KEEPER_LOG, `${JSON.stringify(payouts, null, 2)}\n`);
    console.log(`Payout sent: ${EXPLORER}/${payoutTransaction}`);
  }
};

console.log(`Keeper watching ${coverAddress} on Base Sepolia from block ${fromBlock}`);
for (;;) {
  await payNewSettlements().catch(error => console.error(`Keeper round failed: ${error}`));
  await new Promise(resolve => setTimeout(resolve, POLL_MS));
}
