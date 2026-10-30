/** Paid calls to AirnodeHub listings: x402 in aUSD on Base Sepolia, from the agent's dev wallet. */
import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ExactEvmScheme } from "@x402/evm";
import { wrapFetchWithPayment, x402Client, x402HTTPClient } from "@x402/fetch";

const BASE_SEPOLIA = "eip155:84532" as const;
const AUSD_ADDRESS = "0xbeA34973e5f67F18F656A2C6070C64326C791808";

/** Performs `operation` on the Airnode at `url`. Returns the signed data as parsed JSON and the payment transaction. */
export const callAirnode = async (url: string, operation: string, parameters: Record<string, unknown>) => {
  const client = new x402Client().setSpendControls({
    allowedAssets: [{ network: BASE_SEPOLIA, asset: AUSD_ADDRESS, maxAmountPerPayment: "1000000" }],
  });
  client.register(BASE_SEPOLIA, new ExactEvmScheme(privateKeyToAccount(process.env.BASE_PRIVATE_KEY as Hex)));
  const response = await wrapFetchWithPayment(fetch, client)(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, parameters }),
    signal: AbortSignal.timeout(45_000),
  });
  const paymentTx = new x402HTTPClient(client).getPaymentSettleResponse(name => response.headers.get(name))?.transaction;
  if (!response.ok) return { data: null, paymentTx, error: `HTTP ${response.status}` };
  const { data } = (await response.json()) as { data: string };
  return { data: JSON.parse(data) as unknown, paymentTx };
};
