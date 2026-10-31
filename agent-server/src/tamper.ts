/**
 * The API3 tamper test, run against the deployed FlightDelayCover on Base Sepolia.
 *
 * Every case calls `settle` as a simulation (eth_call), so it spends no gas and leaves the policy untouched,
 * but the deployed contract's own checks decide each outcome. Judges can also submit their own response.
 */
import { readFileSync } from "node:fs";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  encodePacked,
  http,
  isAddress,
  isHex,
  keccak256,
  parseAbi,
  toHex,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const coverAbi = parseAbi([
  "function settle(uint256 policyId, uint256 timestamp, bytes data, bytes signature) returns (uint8 status, uint256 delayMinutes)",
  "function maxResponseAge() view returns (uint256)",
  "error NotSignedByAirnode(address signer)",
  "error PolicyNotActive(uint256 policyId)",
  "error ResponseTooOld(uint256 responseTimestamp)",
  "error ResponseFromTheFuture(uint256 responseTimestamp)",
  "error FlightNotLanded(string flightStatus)",
]);

const STATUS_NAMES = ["None", "Active", "PaidOut", "Expired"];
const RESPONSES = "../settlement/responses";
/** Policy 2 insures LH 501 (29 Oct, ≥180 min) and is kept active for the tamper test. */
export const TAMPER_POLICY_ID = "2";

export interface SignedResponse {
  timestamp: string;
  data: string;
  signature: Hex;
}

export interface TamperCase {
  id: string;
  name: string;
  what: string;
  expected: "accepted" | "rejected";
  outcome: "accepted" | "rejected";
  detail: string;
  passed: boolean;
  checkedAt: string;
  response: SignedResponse;
}

const coverAddress = () => {
  const address = process.env.COVER_ADDRESS;
  if (!address || !isAddress(address)) throw new Error("Set COVER_ADDRESS in .env");
  return address;
};

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"),
});

const readResponse = (file: string): SignedResponse => {
  const { timestamp, data, signature } = JSON.parse(readFileSync(`${RESPONSES}/${file}`, "utf8")) as SignedResponse;
  return { timestamp, data, signature };
};

export const parseResponse = (value: unknown): SignedResponse => {
  const r = value as Partial<SignedResponse>;
  if (!r || typeof r.timestamp !== "string" || !/^\d+$/.test(r.timestamp) || typeof r.data !== "string" || !isHex(r.signature)) {
    throw new Error("A response needs timestamp (digits), data (string) and signature (0x hex), as the Airnode signs them");
  }
  return { timestamp: r.timestamp, data: r.data, signature: r.signature };
};

const describeRevert = (error: unknown) => {
  const revert = error instanceof BaseError && error.walk(cause => cause instanceof ContractFunctionRevertedError);
  if (revert instanceof ContractFunctionRevertedError && revert.data) {
    const { errorName, args = [] } = revert.data;
    return `${errorName}(${args.map(String).join(", ")})`;
  }
  return error instanceof BaseError ? error.shortMessage : String(error);
};

/** Runs `settle` against the deployed contract as a simulation, at block time `at` (seconds). */
export const simulateSettle = async (policyId: string, response: SignedResponse, at: bigint) =>
  client
    .simulateContract({
      address: coverAddress(),
      abi: coverAbi,
      functionName: "settle",
      args: [BigInt(policyId), BigInt(response.timestamp), toHex(response.data), response.signature],
      blockOverrides: { time: at },
    })
    .then(
      ({ result: [status, delayMinutes] }) => ({ outcome: "accepted" as const, detail: `${STATUS_NAMES[status]}, ${delayMinutes} min late` }),
      (error: unknown) => ({ outcome: "rejected" as const, detail: describeRevert(error) }),
    );

const iso = (seconds: bigint) => new Date(Number(seconds) * 1000).toISOString().replace(".000Z", "Z");

/** The five required cases: one valid response, then four that must be rejected. */
export const runTamperTest = async (): Promise<{ policyId: string; contract: string; maxResponseAgeSeconds: number; cases: TamperCase[] }> => {
  const real = readResponse("LH501_2026-10-29.json");
  const other = readResponse("LH901_2026-10-30.json");
  const maxAge = await client.readContract({ address: coverAddress(), abi: coverAbi, functionName: "maxResponseAge" });
  const { requestHash } = JSON.parse(readFileSync(`${RESPONSES}/LH501_2026-10-29.json`, "utf8")) as { requestHash: Hex };
  const signedAt = BigInt(real.timestamp);
  // A timely check: ten minutes after the Airnode signed it, well inside the contract's window.
  const timely = signedAt + 600n;

  const impostor = privateKeyToAccount(generatePrivateKey());
  const impostorSignature = await impostor.signMessage({
    message: { raw: keccak256(encodePacked(["bytes32", "uint256", "bytes"], [requestHash, signedAt, toHex(real.data)])) },
  });

  const plan: (Omit<TamperCase, "outcome" | "detail" | "passed" | "checkedAt"> & { at: bigint })[] = [
    { id: "valid", name: "Real response, on time", what: "The signed AeroDataBox status of LH 501, unchanged", expected: "accepted", response: real, at: timely },
    {
      id: "edited",
      name: "One value edited",
      what: "The same response with the arrival time changed",
      expected: "rejected",
      response: { ...real, data: real.data.replace(/"actualArrival":"[^"]*"/, '"actualArrival":"2026-10-30 23:59Z"') },
      at: timely,
    },
    { id: "stale", name: "Too old", what: `The real response, checked after the contract's ${Number(maxAge) / 3600} h window`, expected: "rejected", response: real, at: signedAt + maxAge + 1n },
    { id: "request", name: "Different request", what: "A real signed response for another flight (LH 901)", expected: "rejected", response: other, at: BigInt(other.timestamp) + 600n },
    { id: "signer", name: "Wrong signer", what: "The real data, signed by a random key instead of the AeroDataBox Airnode", expected: "rejected", response: { ...real, signature: impostorSignature }, at: timely },
  ];

  const cases = await Promise.all(
    plan.map(async ({ at, ...c }) => {
      const result = await simulateSettle(TAMPER_POLICY_ID, c.response, at);
      return { ...c, ...result, passed: result.outcome === c.expected, checkedAt: iso(at) };
    }),
  );
  return { policyId: TAMPER_POLICY_ID, contract: coverAddress(), maxResponseAgeSeconds: Number(maxAge), cases };
};

/** A judge's own response. By default it is checked 10 minutes after its own timestamp, so only the signature,
 * the request and the content decide; pass `now` to check it at the current block time instead. */
export const checkSubmittedResponse = async (response: SignedResponse, policyId = TAMPER_POLICY_ID, now = false) => {
  const at = now ? BigInt(Math.floor(Date.now() / 1000)) : BigInt(response.timestamp) + 600n;
  return { ...(await simulateSettle(policyId, response, at)), checkedAt: iso(at), policyId };
};
