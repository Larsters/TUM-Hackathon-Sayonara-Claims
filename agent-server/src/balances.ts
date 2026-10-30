/** Prints the tADA balances of the demo wallets. */
import { config } from "dotenv";
import { balance, formatAda } from "./cardano.js";

config();

for (const name of ["POOL_ADDRESS", "ANA_ADDRESS"]) {
  const address = process.env[name];
  if (!address) continue;
  console.log(`${name.replace("_ADDRESS", "").padEnd(5)} ${address}  ${formatAda(await balance(address))}`);
}
