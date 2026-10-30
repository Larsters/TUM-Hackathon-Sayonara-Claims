/** Moves test ADA from the cover pool to the traveller's wallet (Vasiliy), so only the pool needs the faucet. */
import { config } from "dotenv";
import { EXPLORER, pay } from "./cardano.js";

config();

const amount = Number(process.argv[2] ?? 20);
const hash = await pay({
  mnemonic: process.env.POOL_MNEMONIC!,
  to: process.env.ANA_ADDRESS!,
  lovelace: BigInt(amount * 1_000_000),
  message: ["Sayonara Claims: travel funds for Vasiliy"],
});
console.log(`Sent ${amount} tADA to Vasiliy: ${EXPLORER}/${hash}`);
