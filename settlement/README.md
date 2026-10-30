# Settlement: flight-delay policies settled by signed AeroDataBox data

`FlightDelayCover` settles a policy from the flight status that the
[AeroDataBox Airnode v2](https://airnode-aerodatabox.fly.dev/) signed. Built on the
[AirnodeHub hackathon starter](https://github.com/api3dao/airnodehub-hackathon-starter): its attestation, JSON and
timestamp libraries are copied unchanged into `contracts/`.

## How a policy settles

1. The insurer creates a policy for one flight on one departure date. The policy stores the hash of the request
   `flightStatusOnDate(number, date)` with a projection to `status`, `scheduledArrival` and `actualArrival`.
2. After the flight lands, anyone fetches the signed status (0.05 aUSD over x402) and calls `settle`.
3. The contract checks:
   - the signature recovers the AeroDataBox Airnode address (`0x83FE2E8F24E66520B1902C3507De4F471248f2Ec`);
   - the response answers this policy's request (the stored hash is part of the signed digest);
   - the response is at most `maxResponseAge` old and not from the future;
   - the flight status is `Arrived`, so an estimate cannot settle it;
   - the policy is still `Active`, so it settles once.
4. It computes the delay itself and marks the policy `PaidOut` (delay ≥ threshold) or `Expired`, emitting
   `PolicySettled`. A keeper watches this event and sends the payout on Cardano preprod.

## Setup

Needs [Foundry](https://getfoundry.sh) and Node.js 22.17 or later.

```sh
git submodule update --init --recursive
npm install
forge test
```

`.env` (git-ignored):

```sh
PRIVATE_KEY=0x...        # deployer and insurer, needs Base Sepolia ETH for gas
PAYER_PRIVATE_KEY=0x...  # pays the Airnode over x402, needs aUSD (no ETH)
RPC_URL=https://sepolia.base.org
COVER_ADDRESS=0x...      # after deploying
```

## Commands

| Command | What it does |
|---|---|
| `npm run flight -- balance` | ETH and aUSD of the wallet on Base Sepolia |
| `npm run flight -- mint-ausd [amount]` | Mints testnet aUSD from its faucet (max 10 per address; needs ETH for gas) |
| `npm run flight -- hash <flight> <date>` | Request hash a policy stores, without calling the Airnode |
| `npm run flight -- fetch <flight> <date> [--raw]` | Pays 0.05 aUSD, fetches the signed status, saves it to `responses/` |
| `npm run flight -- deploy [--max-age <seconds>]` | Deploys `FlightDelayCover` (default max response age: 2 hours) |
| `npm run flight -- create-policy <flight> <date> <minutes> <payout> <cardano address>` | Registers a policy |
| `npm run flight -- settle <policy id> <response.json>` | Submits a saved response. Not checked off-chain first, so an edited file reaches the contract |
| `npm run flight -- tamper <policy id> <response.json> --other <other flight.json>` | Tamper test without gas: the real response, then an edited value, a stale response, another flight's response and a wrong signer |

Flight numbers take a space or not (`"LH 2412"` or `LH2412`); the date is the departure date local to the departure
airport.

## Tamper test for judges

1. Take a saved response from `responses/` and edit any value, or change the timestamp.
2. `npm run flight -- settle <policy id> <edited.json>`: the contract reverts with `NotSignedByAirnode` or
   `ResponseTooOld`.
3. `forge test --match-test Tamper -vv` runs the same four cases against a local contract.
