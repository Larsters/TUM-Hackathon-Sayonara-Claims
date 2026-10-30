/**
 * The live departure board at an airport, bought from AeroDataBox over x402
 * on Base Sepolia, reduced to the average delay of the last two hours.
 */
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { ExactEvmScheme } from "@x402/evm";
import { wrapFetchWithPayment, x402Client, x402HTTPClient } from "@x402/fetch";

const AERODATABOX_URL = "https://airnode-aerodatabox.fly.dev/";
const BASE_SEPOLIA = "eip155:84532" as const;
const AUSD_ADDRESS = "0xbeA34973e5f67F18F656A2C6070C64326C791808";

const minutesBetween = (from?: string, to?: string) =>
  from && to ? (Date.parse(to.replace(" ", "T")) - Date.parse(from.replace(" ", "T"))) / 60_000 : null;

export const lookUpBoard = async (iata: string) => {
  try {
    const client = new x402Client().setSpendControls({
      allowedAssets: [{ network: BASE_SEPOLIA, asset: AUSD_ADDRESS, maxAmountPerPayment: "1000000" }],
    });
    client.register(BASE_SEPOLIA, new ExactEvmScheme(privateKeyToAccount(process.env.BASE_PRIVATE_KEY as Hex)));
    const response = await wrapFetchWithPayment(fetch, client)(AERODATABOX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "airportSchedule",
        parameters: { codeType: "iata", code: iata, offsetMinutes: -120, durationMinutes: 120, direction: "Departure", withCancelled: false, withCodeshared: false },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const receipt = new x402HTTPClient(client).getPaymentSettleResponse(name => response.headers.get(name));
    if (!response.ok) return null;
    const { data } = (await response.json()) as { data: string };
    const departures = (JSON.parse(data).departures ?? []) as { movement?: Record<string, { utc?: string }> }[];
    const delays = departures
      .map(f => minutesBetween(f.movement?.scheduledTime?.utc, f.movement?.revisedTime?.utc))
      .filter((d): d is number => d !== null && d >= 0);
    if (delays.length === 0) return null;
    return {
      averageDelayMinutes: Math.round(delays.reduce((a, b) => a + b, 0) / delays.length),
      flights: delays.length,
      paymentTx: receipt?.transaction,
    };
  } catch {
    return null;
  }
};
