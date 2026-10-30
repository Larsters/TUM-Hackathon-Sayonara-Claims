/**
 * Base Sepolia side of the agent: buying signed AeroDataBox flight status
 * over x402 (paid in aUSD), and registering policies in FlightDelayCover.
 *
 * The request hash is derived exactly as settlement/src/airnode-v2.ts does,
 * so a policy registered here settles with responses fetched there.
 */
import { createWalletClient, http, isAddress, keccak256, parseAbi, parseEventLogs, publicActions, toHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { ExactEvmScheme } from "@x402/evm";
import { wrapFetchWithPayment, x402Client, x402HTTPClient } from "@x402/fetch";

export const BASESCAN = "https://sepolia.basescan.org/tx";
const AERODATABOX_URL = "https://airnode-aerodatabox.fly.dev/";
const BASE_SEPOLIA = "eip155:84532" as const;
const AUSD_ADDRESS = "0xbeA34973e5f67F18F656A2C6070C64326C791808";

const coverAbi = parseAbi([
  "function createPolicy(bytes32 requestHash, uint32 delayThresholdMinutes, uint256 payoutAmount, string payoutAddress) returns (uint256)",
  "event PolicyCreated(uint256 indexed policyId, bytes32 requestHash, uint32 delayThresholdMinutes, uint256 payoutAmount, string payoutAddress)",
]);

const ARRIVAL_PROJECTION = {
  status: "/0/status",
  scheduledArrival: "/0/arrival/scheduledTime/utc",
  actualArrival: "/0/arrival/revisedTime/utc",
};

// Code point order, as the Airnode and Solidity compare strings.
const compareUtf8 = (a: string, b: string) => Buffer.compare(Buffer.from(a), Buffer.from(b));
const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.entries(value)
    .sort(([a], [b]) => compareUtf8(a, b))
    .map(([key, nested]) => [key, canonicalize(nested)]);
};

const flightParameters = (flightNumber: string, dateLocal: string) => ({
  searchBy: "number",
  searchParam: flightNumber,
  dateLocal,
  dateLocalRole: "Departure",
});

/** The request a FlightDelayCover policy stores: flightStatusOnDate with the arrival projection. */
export const deriveFlightRequestHash = (flightNumber: string, dateLocal: string): Hex =>
  keccak256(
    toHex(
      JSON.stringify([
        "flightStatusOnDate",
        canonicalize(flightParameters(flightNumber, dateLocal)),
        canonicalize(ARRIVAL_PROJECTION),
      ]),
    ),
  );

const readKey = (): Hex => {
  const key = process.env.BASE_PRIVATE_KEY;
  if (!key?.startsWith("0x")) throw new Error("Set BASE_PRIVATE_KEY in .env (the Base Sepolia dev wallet)");
  return key as Hex;
};

export interface FlightLookup {
  flight: Record<string, unknown> | null;
  paymentTx?: string;
  error?: string;
}

/**
 * Buys the full AeroDataBox status of a flight (0.05 aUSD over x402) and
 * returns its first leg. Never throws: a failed lookup is part of the story.
 */
export const lookUpFlight = async (flightNumber: string, dateLocal: string): Promise<FlightLookup> => {
  try {
    const client = new x402Client().setSpendControls({
      allowedAssets: [{ network: BASE_SEPOLIA, asset: AUSD_ADDRESS, maxAmountPerPayment: "1000000" }],
    });
    client.register(BASE_SEPOLIA, new ExactEvmScheme(privateKeyToAccount(readKey())));
    const response = await wrapFetchWithPayment(fetch, client)(AERODATABOX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "flightStatusOnDate", parameters: flightParameters(flightNumber, dateLocal) }),
      signal: AbortSignal.timeout(45_000),
    });
    const receipt = new x402HTTPClient(client).getPaymentSettleResponse(name => response.headers.get(name));
    if (!response.ok) {
      return { flight: null, paymentTx: receipt?.transaction, error: `AeroDataBox answered ${response.status}` };
    }
    const signed = (await response.json()) as { data: string };
    const legs = JSON.parse(signed.data) as Record<string, unknown>[];
    return { flight: legs[0] ?? null, paymentTx: receipt?.transaction };
  } catch (error) {
    return { flight: null, error: String(error) };
  }
};

/** Registers the policy in FlightDelayCover, so the signed flight status can settle it. */
export const registerPolicy = async ({ flightNumber, dateLocal, thresholdMinutes, payoutLovelace, payoutAddress }: {
  flightNumber: string;
  dateLocal: string;
  thresholdMinutes: number;
  payoutLovelace: bigint;
  payoutAddress: string;
}) => {
  const coverAddress = process.env.COVER_ADDRESS;
  if (!coverAddress || !isAddress(coverAddress)) throw new Error("Set COVER_ADDRESS in .env");
  const client = createWalletClient({
    account: privateKeyToAccount(readKey()),
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"),
  }).extend(publicActions);
  const hash = await client.writeContract({
    address: coverAddress,
    abi: coverAbi,
    functionName: "createPolicy",
    // The contract stores payouts with 6 decimals, the same as lovelace.
    args: [deriveFlightRequestHash(flightNumber, dateLocal), thresholdMinutes, payoutLovelace, payoutAddress],
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  const [created] = parseEventLogs({ abi: coverAbi, eventName: "PolicyCreated", logs: receipt.logs });
  return { transaction: hash, policyId: created?.args.policyId?.toString() };
};
