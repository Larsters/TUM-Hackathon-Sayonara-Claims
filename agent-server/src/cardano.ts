/**
 * Plain Cardano preprod payments for the demo: the traveller's premium to the
 * cover pool, and the pool's payout to the traveller. Uses Koios, which needs
 * no API key; set BLOCKFROST_PROJECT_ID to use Blockfrost instead.
 */
import { Address, Assets, Client, preprod } from "@evolution-sdk/evolution";

export const NETWORK = "cardano:preprod" as const;
export const EXPLORER = "https://preprod.cardanoscan.io/transaction";
const KOIOS_BASE_URL = process.env.KOIOS_BASE_URL ?? "https://preprod.koios.rest/api/v1";
const BLOCKFROST_BASE_URL = process.env.BLOCKFROST_BASE_URL ?? "https://cardano-preprod.blockfrost.io/api/v0";

// The provider config that @x402/cardano's signers take.
export const providerConfig = () => {
  const projectId = process.env.BLOCKFROST_PROJECT_ID;
  return projectId
    ? { blockfrost: { baseUrl: BLOCKFROST_BASE_URL, projectId } }
    : { koios: { baseUrl: KOIOS_BASE_URL } };
};

const signingClient = (mnemonic: string) => {
  const projectId = process.env.BLOCKFROST_PROJECT_ID;
  const assembly = Client.make(preprod);
  const client = projectId
    ? assembly.withBlockfrost({ baseUrl: BLOCKFROST_BASE_URL, projectId })
    : assembly.withKoios({ baseUrl: KOIOS_BASE_URL });
  return client.withSeed({ mnemonic: mnemonic.trim().replace(/\s+/g, " ").toLowerCase() });
};

const payOnce = async ({ mnemonic, to, lovelace, message }: {
  mnemonic: string;
  to: string;
  lovelace: bigint;
  message: string[];
}) => {
  const client = signingClient(mnemonic);
  const signBuilder = await client
    .newTx()
    .payToAddress({ address: Address.fromBech32(to), assets: Assets.fromLovelace(lovelace) })
    // CIP-20 limits each string to 64 bytes, so the message is a list of lines.
    .attachMetadata({ label: 674n, metadata: new Map([["msg", message.map(line => line.slice(0, 64))]]) })
    .build({ changeAddress: await client.address() });
  const submitBuilder = await signBuilder.sign();
  const hash = await submitBuilder.submit();
  return typeof hash === "string" ? hash : Buffer.from(hash.hash).toString("hex");
};

/**
 * Sends `lovelace` from the wallet of `mnemonic` to `to`, with `message` as
 * CIP-20 metadata (label 674), and returns the transaction hash. Right after
 * another payment from the same wallet the provider can still list spent
 * UTXOs and the submission fails, so it retries a few times.
 */
export const pay = async (params: Parameters<typeof payOnce>[0]) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await payOnce(params);
    } catch (error) {
      if (attempt >= 4) throw error;
      console.error(`Payment attempt ${attempt} failed, retrying in 10 s: ${String(error).slice(0, 200)}`);
      await new Promise(resolve => setTimeout(resolve, 10_000));
    }
  }
};

/** Lovelace held by `address`, read from Koios. */
export const balance = async (address: string) => {
  const response = await fetch(`${KOIOS_BASE_URL}/address_info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ _addresses: [address] }),
  });
  if (!response.ok) throw new Error(`Koios address_info failed: ${response.status}`);
  const [info] = (await response.json()) as { balance: string }[];
  return BigInt(info?.balance ?? 0);
};

export const formatAda = (lovelace: bigint) => `${(Number(lovelace) / 1_000_000).toFixed(2)} tADA`;
