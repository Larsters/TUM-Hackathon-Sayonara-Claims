import 'dotenv/config';
import { PrivateKey } from '@bsv/sdk';
import { addressOf, balanceOf } from './chain.js';

const show = async (label: string, address?: string) => {
  if (!address) return console.log(`${label}: not set`);
  console.log(`${label}: ${address}  ${await balanceOf(address)} sat`);
};

await show('Agent', process.env.BSV_AGENT_WIF ? addressOf(PrivateKey.fromWif(process.env.BSV_AGENT_WIF)) : undefined);
await show('Pool ', process.env.BSV_POOL_ADDRESS);
