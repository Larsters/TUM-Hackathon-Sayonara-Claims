import { ARC, LockingScript, P2PKH, PrivateKey, Transaction } from '@bsv/sdk';

/** BSV network: "test" (default) or "main". */
export const NETWORK: 'test' | 'main' = process.env.BSV_NETWORK === 'main' ? 'main' : 'test';

/** Broadcaster recommended by the track. Set ARC_URL to use another ARC endpoint for the chosen network. */
export const ARC_URL = process.env.ARC_URL ?? 'https://arcade-v2-us-1.bsvblockchain.tech';

const WOC_API = `https://api.whatsonchain.com/v1/bsv/${NETWORK}`;

export const txLink = (txid: string) => `https://${NETWORK === 'test' ? 'test.' : ''}whatsonchain.com/tx/${txid}`;

export const addressOf = (key: PrivateKey) => key.toAddress(NETWORK === 'test' ? 'testnet' : 'mainnet');

export const wifOf = (key: PrivateKey) => (NETWORK === 'test' ? key.toWif([0xef]) : key.toWif());

type Utxo = { tx_hash: string; tx_pos: number; value: number };

const getUtxos = async (address: string): Promise<Utxo[]> => {
  const response = await fetch(`${WOC_API}/address/${address}/unspent`);
  if (!response.ok) throw new Error(`WhatsOnChain: HTTP ${response.status} for ${address}`);
  return (await response.json()) as Utxo[];
};

export const balanceOf = async (address: string) => (await getUtxos(address)).reduce((sum, utxo) => sum + utxo.value, 0);

/**
 * Pays `satoshis` to `to` from the coins of `key`, with change back to the same address, and broadcasts it.
 * The agent signs with its own key: nobody else holds its funds.
 */
export const pay = async (key: PrivateKey, to: string, satoshis: number, memo?: string): Promise<string> => {
  const from = addressOf(key);
  const utxos = await getUtxos(from);
  if (utxos.length === 0) throw new Error(`No coins at ${from}. Fund this address first.`);

  const tx = new Transaction();
  let total = 0;
  for (const utxo of utxos) {
    const response = await fetch(`${WOC_API}/tx/${utxo.tx_hash}/hex`);
    if (!response.ok) throw new Error(`WhatsOnChain: HTTP ${response.status} for tx ${utxo.tx_hash}`);
    tx.addInput({
      sourceTransaction: Transaction.fromHex((await response.text()).trim()),
      sourceOutputIndex: utxo.tx_pos,
      unlockingScriptTemplate: new P2PKH().unlock(key),
    });
    total += utxo.value;
    if (total >= satoshis + 1000) break;
  }
  if (total < satoshis) throw new Error(`Not enough coins at ${from}: ${total} sat, need ${satoshis} sat plus fee.`);

  tx.addOutput({ lockingScript: new P2PKH().lock(to), satoshis });
  if (memo) tx.addOutput({ lockingScript: opReturn(memo), satoshis: 0 });
  tx.addOutput({ lockingScript: new P2PKH().lock(from), change: true });

  await tx.fee();
  await tx.sign();
  const result = await tx.broadcast(new ARC(ARC_URL));
  if (result.status !== 'success') throw new Error(`Broadcast failed: ${JSON.stringify(result)}`);
  return tx.id('hex');
};

/** An OP_FALSE OP_RETURN output that records the policy terms on chain. */
const opReturn = (text: string) => {
  const data = Buffer.from(text, 'utf8');
  if (data.length > 75) throw new Error('Memo must be 75 bytes or less');
  return LockingScript.fromHex(`006a${data.length.toString(16).padStart(2, '0')}${data.toString('hex')}`);
};
