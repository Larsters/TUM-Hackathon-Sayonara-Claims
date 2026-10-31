import { PrivateKey } from '@bsv/sdk';
import { NETWORK, addressOf, wifOf } from './chain.js';

// Creates a key for the cover agent or the cover pool. Put the WIF in bsv/.env (git-ignored), fund the address.
const key = PrivateKey.fromRandom();
console.log(`Network:  ${NETWORK}`);
console.log(`WIF:      ${wifOf(key)}   (secret: goes in bsv/.env only)`);
console.log(`Address:  ${addressOf(key)}`);
