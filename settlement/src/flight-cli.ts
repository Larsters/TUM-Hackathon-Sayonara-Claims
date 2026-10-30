import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import {
  BaseError,
  ContractFunctionRevertedError,
  createWalletClient,
  encodePacked,
  formatUnits,
  type Hex,
  http,
  isAddress,
  isHex,
  keccak256,
  parseAbi,
  parseEventLogs,
  parseUnits,
  publicActions,
  toHex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { type SignedResponse, verifySignedResponse } from './airnode-v2.ts';
import {
  AERODATABOX_AIRNODE_V2_ADDRESS,
  deriveFlightRequestHash,
  fetchSignedFlightStatus,
} from './aerodatabox.ts';
import { AUSD_ADDRESS, createPayingFetch, readPaymentSettlement } from './x402.ts';

const coverAbi = parseAbi([
  'constructor(address airnode, uint256 maxResponseAge)',
  'function createPolicy(bytes32 requestHash, uint32 delayThresholdMinutes, uint256 payoutAmount, string payoutAddress) returns (uint256)',
  'function settle(uint256 policyId, uint256 timestamp, bytes data, bytes signature) returns (uint8 status, uint256 delayMinutes)',
  'function maxResponseAge() view returns (uint256)',
  'event PolicyCreated(uint256 indexed policyId, bytes32 requestHash, uint32 delayThresholdMinutes, uint256 payoutAmount, string payoutAddress)',
  'event PolicySettled(uint256 indexed policyId, uint8 status, uint256 delayMinutes, uint256 payoutAmount, string payoutAddress)',
  'error NotInsurer()',
  'error PolicyNotActive(uint256 policyId)',
  'error ResponseTooOld(uint256 responseTimestamp)',
  'error ResponseFromTheFuture(uint256 responseTimestamp)',
  'error FlightNotLanded(string flightStatus)',
  'error NotSignedByAirnode(address signer)',
  'error ECDSAInvalidSignature()',
  'error ECDSAInvalidSignatureLength(uint256 length)',
  'error ECDSAInvalidSignatureS(bytes32 s)',
]);

const ausdAbi = parseAbi([
  'function mintFromFaucet(uint256 amount)',
  'function balanceOf(address account) view returns (uint256)',
  'function faucetMintedAmount(address account) view returns (uint256)',
]);

const STATUS_NAMES = ['None', 'Active', 'PaidOut', 'Expired'];
const EXPLORER = 'https://sepolia.basescan.org';

const readEnvironmentVariable = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env or in the environment`);
  return value;
};

const readPrivateKey = (name: string): Hex => {
  const value = readEnvironmentVariable(name);
  if (!isHex(value)) throw new Error(`${name} is not a 0x-prefixed hex string`);
  return value;
};

const readCoverAddress = () => {
  const address = readEnvironmentVariable('COVER_ADDRESS');
  if (!isAddress(address)) throw new Error('COVER_ADDRESS is not an address');
  return address;
};

const createClient = () =>
  createWalletClient({
    account: privateKeyToAccount(readPrivateKey('PRIVATE_KEY')),
    chain: baseSepolia,
    transport: http(readEnvironmentVariable('RPC_URL')),
  }).extend(publicActions);

// Pays for a priced operation in aUSD and prints the settlement of the payment to stderr.
const createScriptFetch = (): typeof fetch => {
  const payingFetch = createPayingFetch(readPrivateKey('PAYER_PRIVATE_KEY'));
  return async (input, init) => {
    const response = await payingFetch(input, init);
    const settlement = readPaymentSettlement(response);
    if (settlement) {
      console.error(
        settlement.success
          ? `x402 payment settled: ${EXPLORER}/tx/${settlement.transaction}`
          : `x402 payment did not settle: ${settlement.errorReason}`
      );
    }
    return response;
  };
};

// viem's error for a revert runs to hundreds of lines, so this names only the error that the contract reverted with.
const describeContractError = (error: unknown) => {
  const revertError =
    error instanceof BaseError && error.walk((cause) => cause instanceof ContractFunctionRevertedError);
  if (!(revertError instanceof ContractFunctionRevertedError) || !revertError.data) throw error;
  const { errorName, args = [] } = revertError.data;
  return `${errorName}(${args.join(', ')})`;
};

const readResponseFile = (path: string): SignedResponse => {
  const response = JSON.parse(readFileSync(path, 'utf8')) as Partial<SignedResponse>;
  if (typeof response.timestamp !== 'string' || typeof response.data !== 'string' || !isHex(response.signature)) {
    throw new Error(`${path} needs timestamp, data and signature as strings, as the fetch command saves them`);
  }
  return response as SignedResponse;
};

const settleArguments = (policyId: bigint, response: Pick<SignedResponse, 'timestamp' | 'data' | 'signature'>) =>
  [policyId, BigInt(response.timestamp), toHex(response.data), response.signature] as const;

const commands: Record<string, (args: string[], options: Record<string, string | boolean | undefined>) => Promise<void>> = {
  // Prints the request hash that a policy for this flight stores, without calling the Airnode.
  async hash([flightNumber, dateLocal]) {
    if (!flightNumber || !dateLocal) throw new Error('Usage: hash <flight number> <departure date, YYYY-MM-DD>');
    console.log(deriveFlightRequestHash(flightNumber, dateLocal));
  },

  // Fetches the signed status (0.05 aUSD), checks it off-chain and saves it under responses/.
  // --raw fetches the whole AeroDataBox response instead of the projection, to look at its fields.
  async fetch([flightNumber, dateLocal], { raw }) {
    if (!flightNumber || !dateLocal) throw new Error('Usage: fetch <flight number> <departure date> [--raw]');
    const response = await fetchSignedFlightStatus(flightNumber, dateLocal, createScriptFetch(), !raw);
    if (!raw) {
      await verifySignedResponse(
        response,
        AERODATABOX_AIRNODE_V2_ADDRESS,
        deriveFlightRequestHash(flightNumber, dateLocal)
      );
    }
    mkdirSync('responses', { recursive: true });
    const path = `responses/${flightNumber.replaceAll(' ', '')}_${dateLocal}${raw ? '.raw' : ''}.json`;
    writeFileSync(path, `${JSON.stringify(response, null, 2)}\n`);
    console.log(`Saved ${path}`);
    console.log(raw ? JSON.stringify(JSON.parse(response.data), null, 2).slice(0, 4000) : response.data);
  },

  async deploy(_args, { 'max-age': maxAge }) {
    const client = createClient();
    const artifact = JSON.parse(readFileSync('out/FlightDelayCover.sol/FlightDelayCover.json', 'utf8')) as {
      bytecode: { object: Hex };
    };
    const hash = await client.deployContract({
      abi: coverAbi,
      bytecode: artifact.bytecode.object,
      args: [AERODATABOX_AIRNODE_V2_ADDRESS, BigInt(typeof maxAge === 'string' ? maxAge : 7200)],
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log(`Deployed FlightDelayCover at ${receipt.contractAddress}`);
    console.log(`${EXPLORER}/address/${receipt.contractAddress}`);
    console.log('Set COVER_ADDRESS to this address in .env');
  },

  async 'create-policy'([flightNumber, dateLocal, thresholdMinutes, payout, payoutAddress]) {
    if (!flightNumber || !dateLocal || !thresholdMinutes || !payout || !payoutAddress) {
      throw new Error(
        'Usage: create-policy <flight number> <departure date> <threshold minutes> <payout, e.g. 250> <Cardano address>'
      );
    }
    const client = createClient();
    const hash = await client.writeContract({
      address: readCoverAddress(),
      abi: coverAbi,
      functionName: 'createPolicy',
      args: [
        deriveFlightRequestHash(flightNumber, dateLocal),
        Number(thresholdMinutes),
        parseUnits(payout, 6),
        payoutAddress,
      ],
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    const [created] = parseEventLogs({ abi: coverAbi, eventName: 'PolicyCreated', logs: receipt.logs });
    console.log(`Policy ${created?.args.policyId} for ${flightNumber} on ${dateLocal}: ${EXPLORER}/tx/${hash}`);
  },

  // Sends a saved response to the contract. The response is not checked off-chain first, so a judge can edit the
  // file and see the contract itself reject it.
  async settle([policyId, path]) {
    if (!policyId || !path) throw new Error('Usage: settle <policy id> <response.json>');
    const client = createClient();
    const args = settleArguments(BigInt(policyId), readResponseFile(path));
    const hash = await client
      .writeContract({ address: readCoverAddress(), abi: coverAbi, functionName: 'settle', args })
      .catch((error: unknown) => {
        throw new Error(`The contract rejected the response with ${describeContractError(error)}`);
      });
    const receipt = await client.waitForTransactionReceipt({ hash });
    const [settled] = parseEventLogs({ abi: coverAbi, eventName: 'PolicySettled', logs: receipt.logs });
    if (!settled) throw new Error(`Transaction ${hash} emitted no PolicySettled event`);
    const { status, delayMinutes, payoutAmount, payoutAddress } = settled.args;
    console.log(`Policy ${policyId}: ${STATUS_NAMES[status]}, ${delayMinutes} min late, ${EXPLORER}/tx/${hash}`);
    if (payoutAmount > 0n) console.log(`Payout due: ${formatUnits(payoutAmount, 6)} to ${payoutAddress}`);
  },

  // The API3 tamper test, against the deployed contract without spending gas: the real response first, then four
  // forged ones. --other is a real response for another flight, for the wrong-request case.
  async tamper([policyId, path], { other }) {
    if (!policyId || !path || typeof other !== 'string') {
      throw new Error('Usage: tamper <policy id> <response.json> --other <response for another flight.json>');
    }
    const client = createClient();
    const real = readResponseFile(path);
    const impostor = privateKeyToAccount(toHex(crypto.getRandomValues(new Uint8Array(32))));
    const impostorSignature = await impostor.signMessage({
      message: {
        raw: keccak256(
          encodePacked(['bytes32', 'uint256', 'bytes'], [real.requestHash, BigInt(real.timestamp), toHex(real.data)])
        ),
      },
    });
    const cases: [string, Pick<SignedResponse, 'timestamp' | 'data' | 'signature'>][] = [
      ['Real response', real],
      ['Edited value', { ...real, data: real.data.replace(/"actualArrival":"[^"]*"/, '"actualArrival":"2099-01-01 00:00Z"') }],
      // The real response, simulated at a time after it has expired
      ['Too old', real],
      ['Another flight', readResponseFile(other)],
      ['Wrong signer', { ...real, signature: impostorSignature }],
    ];
    const maxResponseAge = await client.readContract({
      address: readCoverAddress(),
      abi: coverAbi,
      functionName: 'maxResponseAge',
    });
    const expiredAt = BigInt(real.timestamp) + maxResponseAge + 1n;
    for (const [name, response] of cases) {
      const outcome = await client
        .simulateContract({
          address: readCoverAddress(),
          abi: coverAbi,
          functionName: 'settle',
          args: settleArguments(BigInt(policyId), response),
          ...(name === 'Too old' ? { blockOverrides: { time: expiredAt } } : {}),
        })
        .then(
          ({ result: [status, delayMinutes] }) => `accepted: ${STATUS_NAMES[status]}, ${delayMinutes} min late`,
          (error: unknown) => `rejected: ${describeContractError(error)}`
        );
      console.log(`${name.padEnd(16)} ${outcome}`);
    }
  },

  // Mints testnet aUSD from its faucet, up to its limit of 10 per address. Needs Base Sepolia ETH for gas.
  async 'mint-ausd'([amount = '10']) {
    const client = createClient();
    const hash = await client.writeContract({
      address: AUSD_ADDRESS,
      abi: ausdAbi,
      functionName: 'mintFromFaucet',
      args: [parseUnits(amount, 6)],
    });
    await client.waitForTransactionReceipt({ hash });
    console.log(`Minted ${amount} aUSD: ${EXPLORER}/tx/${hash}`);
  },

  async balance() {
    const client = createClient();
    const address = client.account.address;
    const [eth, ausd] = await Promise.all([
      client.getBalance({ address }),
      client.readContract({ address: AUSD_ADDRESS, abi: ausdAbi, functionName: 'balanceOf', args: [address] }),
    ]);
    console.log(`${address}: ${formatUnits(eth, 18)} ETH, ${formatUnits(ausd, 6)} aUSD (Base Sepolia)`);
  },
};

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { raw: { type: 'boolean' }, other: { type: 'string' }, 'max-age': { type: 'string' } },
});
const [commandName, ...commandArguments] = positionals;
const command = commandName ? commands[commandName] : undefined;
if (!command) throw new Error(`Commands: ${Object.keys(commands).join(', ')}`);
await command(commandArguments, values);
