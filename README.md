# Sayonara Claims: flight cover that pays out by itself

TUM Blockchain & AI Hackathon, Munich, 30–31 October 2026.

You tell an AI agent your flight. It buys the data it needs, checks your passenger rights and prices a cover:
**€19, and you get €250 if you arrive 3 hours late or more, for any reason.** When the flight lands, a contract
checks signed flight data from API3 and the payout reaches your wallet within minutes. Nobody files a claim.

**▶ Demo video: [youtu.be/8pGW6oVubb0](https://youtu.be/8pGW6oVubb0)** · Pitch deck: [`Sayonara Claims.pdf`](Sayonara%20Claims.pdf) ·
Devfolio: [sayonara-claims-0bf9](https://devfolio.co/projects/sayonara-claims-0bf9)

## At the hackathon

Built in 36 hours for the **Cardano** (agentic commerce, x402) and **API3** (authenticated data) tracks. What we shipped:

- **An AI agent that sells flight cover in a chat.** It researches the flight, checks EU261 rights and prices a single
  cover: €19 for €250 if you land 3h+ late, for any cause.
- **Real payments on Cardano preprod over x402.** The research fee, the premium and the payout are all on-chain
  transactions (see [Proof on chain](#proof-on-chain)).
- **Signed flight data from API3 AirnodeHub.** AeroDataBox flight status bought over x402 and checked by the
  `FlightDelayCover` contract on Base Sepolia, which pays only for a valid, fresh signature on the right request.
- **A real delayed flight settled end to end:** LH 501 (GIG → FRA, 29 Oct) landed 7h 08m late; the contract settled
  the policy as `PaidOut` and 50 tADA reached the traveller.
- **A tamper test in the app:** one real response is accepted, and four forgeries (an edited value, a stale response,
  another flight's response, a wrong signer) are rejected by the deployed contract.
- **A web app** (Next.js) with the chat, a research view, trips, transactions, wallets and the tamper test.

## The problem

When a flight arrives 3 hours late, EU261 may entitle you to €250–€600. But you have to claim it, the airline can
refuse by citing "extraordinary circumstances" (strikes, weather, air traffic control), and payment takes weeks or
months. Outside the EU the rules are weaker still. Travellers either chase claims for months or give up.

Sayonara Claims sits on top of EU261: it pays for any cause, automatically and immediately, and you can still claim
from the airline as well.

## How it works

```
Traveller ──chat──▶ Cover agent ──x402 (tADA, Cardano preprod)──▶ research fee to the cover pool
                        │
                        ├─x402 (aUSD, Base Sepolia)──▶ API3 AirnodeHub: AeroDataBox schedule + departure board, NASA EONET
                        ├─ jurisdiction check (EU261, Brazil ANAC 400, Montreal Convention)
                        └─ deterministic price ──▶ quote
Traveller buys ──premium (tADA, Cardano preprod)──▶ cover pool
Agent ──createPolicy──▶ FlightDelayCover (Base Sepolia): flight, date, threshold, payout address
Flight lands ──▶ keeper fetches the signed AeroDataBox status ──▶ FlightDelayCover.settle()
                    contract checks signer, request, freshness, "Arrived", computes the delay, settles once
PolicySettled(PaidOut) ──▶ keeper pays the traveller from the cover pool (tADA, Cardano preprod)
```

1. **Chat.** Vasiliy tells the agent his flight (for example "LH 574 from Munich on 12 November"). The language
   model (OpenAI `gpt-4.1-mini`) only talks. It never sets prices or decides payouts.
2. **Research fee, paid over x402 on Cardano.** The agent's research endpoint `POST /api/research` is behind an x402
   paywall: 2 tADA from the traveller's wallet to the cover pool, settled on Cardano preprod before the research
   result is released.
3. **Paid data.** The agent buys the flight's schedule and the origin's departure board from AeroDataBox, and natural
   events near the route from NASA EONET, through API3 AirnodeHub, paying each call over x402 in aUSD on Base Sepolia.
   The app shows each purchase with its price and transaction.
4. **Passenger rights.** A deterministic rules check (EU261, Brazil ANAC Resolution 400 and CDC Art. 14, the Montreal
   Convention) shows what the airline may owe and the gap the cover fills.
5. **Price.** Probability of a 3h+ arrival delay (base rate by distance, adjusted by the live signals) × €250 payout,
   plus a margin. The premium is always above the expected payout.
6. **Purchase.** The traveller's wallet pays the premium to the cover pool on Cardano preprod, and the agent
   registers the policy in `FlightDelayCover` on Base Sepolia.
7. **Settlement.** After landing, a keeper fetches the signed AeroDataBox flight status from AirnodeHub and submits it.
   The contract verifies it and decides. The trigger rule lives in the contract, not in the agent.
8. **Payout.** The keeper sees `PolicySettled(PaidOut)` and pays the traveller from the cover pool on Cardano preprod.

On testnet, 1 tADA stands for €5: premium 3.8 tADA (€19), payout 50 tADA (€250), research fee 2 tADA.

## Proof on chain

### A real delayed flight, settled end to end

LH 501, Rio de Janeiro → Frankfurt, departed 29 Oct 2026. Scheduled to arrive 05:55Z on 30 Oct, arrived 13:03Z:
**7 h 08 min late**. We insured it and settled it with its real signed AeroDataBox response. It is a replay, since the
policy was created after the flight had landed. The app shows it under *My trips*.

| Step | Chain | Transaction |
|---|---|---|
| Policy 1 registered (LH 501, ≥180 min, 50 tADA) | Base Sepolia | [0x254d0c8f…a628b](https://sepolia.basescan.org/tx/0x254d0c8fcff1093abbe1befef210cf0a7c52bdcedb2f6105dc06d3bbef4a628b) |
| Signed flight status bought from AirnodeHub (x402, 0.05 aUSD) | Base Sepolia | [0x9a6ec2b5…67bf5](https://sepolia.basescan.org/tx/0x9a6ec2b5add4f5001c0e52122a148fda981c13d504e95e82d3f80ff1b5d67bf5) |
| Policy 1 settled: PaidOut, 428 min late | Base Sepolia | [0xda8d73e8…f02f4fe](https://sepolia.basescan.org/tx/0xda8d73e8d276b9c7da9d5f23b57077a1cc93f76beb4172f229e9b718f602f4fe) |
| Payout €250 (50 tADA) to the traveller | Cardano preprod | [3a00133e…d6ceb92](https://preprod.cardanoscan.io/transaction/3a00133e35e764edbb0ede7127a87b8d27000ba59a1587868f721a725d6ceb92) |

### Cardano payments (preprod)

| Payment | Transaction |
|---|---|
| **Research fee, paid request over x402** (2 tADA, traveller → cover pool) | [cba8f2bb…45bcb43](https://preprod.cardanoscan.io/transaction/cba8f2bb6c198990a49274a4455f35fc70186d6e1498752efcfdb8ea445bcb43) |
| Premium for a policy (3.8 tADA, traveller → cover pool) | [a709afc4…0f03da3](https://preprod.cardanoscan.io/transaction/a709afc4f6bcebe1ff6f4fc5072ec6da52e15f9cf7689552c26be12be0f03da3) |
| Payout from the cover pool (50 tADA) | [3a00133e…d6ceb92](https://preprod.cardanoscan.io/transaction/3a00133e35e764edbb0ede7127a87b8d27000ba59a1587868f721a725d6ceb92) |

Cover pool: [`addr_test1qqmjn9…aperg`](https://preprod.cardanoscan.io/address/addr_test1qqmjn9gvslf6pcrhc7ncagjur4u2xuj46ataeqfkcx6hqejpp2es3m992vz0zzsjmy20sc80ehpmqhqv8pdnpa8sj34q4aperg).
Every research run adds another x402 payment to it; there are about 30 so far.

### Contract

`FlightDelayCover` on Base Sepolia:
[`0xade3e17961a471a522fcd935241c459a924e2e27`](https://sepolia.basescan.org/address/0xade3e17961a471a522fcd935241c459a924e2e27).

## Cardano track: Agentic Commerce

- **The job:** the agent researches a flight and prices cover for it. The traveller pays for that job per request
  over **x402 on Cardano preprod** (2 tADA), and gets back a quote and the research behind it.
- **Cardano tools:** `@x402/cardano` and `@x402/express` (exact scheme, paid route `POST /api/research`), the hosted
  x402 facilitator (with a local facilitator in `agent-server/src/facilitator.ts` as a fallback), Blockfrost for UTXOs
  and balances, Koios as a fallback, and the Evolution SDK (`@evolution-sdk/evolution`) for the wallets of the traveller, the cover pool and the keeper payouts.
- **The customer and their journey:** a traveller who wants certainty instead of an airline claim. Chat → pay the
  research fee → watch the agent buy data → quote → buy → land late → paid. All in one screen, with every payment
  linked to the explorer.
- **Real use:** the same paid endpoint can be called by other agents (a travel-booking agent buying cover for its
  user), and it can be listed on Masumi/Sokosumi so agents can hire it per job with escrow. That is our next step; it
  is not built yet. Premiums would go into a pool funded by liquidity providers, with exposure caps and reinsurance
  for correlated delays (a storm hits many flights at once).

## API3 track: authenticated data in the contract

- **What the data decides:** whether a policy pays out. `settle()` accepts a signed AeroDataBox `flightStatusOnDate`
  response from AirnodeHub, and the contract itself computes the delay from it. Without the signed response there
  is no settlement, and the product falls back to manual claims.
- **What the contract checks before acting:**
  1. Signer: the response recovers to the AeroDataBox Airnode, `0x83FE2E8F24E66520B1902C3507De4F471248f2Ec`.
  2. Intended request: the signature covers this policy's request hash (flight number + date + projection), so a
     response for any other flight or date recovers a different signer.
  3. Freshness: signed at most 2 hours before settlement, and not in the future.
  4. Content: status `Arrived`, then delay = actual − scheduled arrival, compared with the policy threshold.
  5. Once only: a policy that is no longer `Active` cannot be settled again.
- **Agent use of AirnodeHub:** besides settlement, the agent picks and pays AirnodeHub sources over x402 for every
  quote (AeroDataBox schedule and departure board, NASA EONET), over repeated runs.
- **Who relies on the data:** the traveller (gets paid), the cover pool and its liquidity providers (pay out), and
  the keeper (moves the money only after the contract approves).
- **What goes wrong if it is forged:** anyone could drain the pool by submitting a fake "arrived 5 h late" status,
  or the insurer could deny a valid claim with a fake "on time" status. The signature check stops both.
- **Data we wanted but could not find on AirnodeHub:** historical delay distributions per route and airline (for
  pricing), strike and ATC-restriction feeds, NOTAMs, and aircraft rotation. In the app these are marked as scripted.
- **Limits we state openly:** a signature proves AeroDataBox *said* the flight was late, not that it was. The keeper
  that pays out on Cardano is a trusted step; the roadmap is a Cardano validator that checks the signature itself.

### Tamper test

The tamper test shows that only an authentic, timely response for the right flight can trigger a payout. The contract
gets one valid response, which it accepts, then four forged ones, which it must reject:

| Case | What is submitted | Contract result |
|---|---|---|
| Valid | The real signed LH 501 response, on time | accepted: PaidOut, 428 min late |
| Edited value | The same response with the arrival time changed | reverts `NotSignedByAirnode` |
| Too old | The real response, after the 2 h window | reverts `ResponseTooOld` |
| Different request | A real signed response for another flight (LH 901) | reverts `NotSignedByAirnode` (the signature covers the request hash) |
| Wrong signer | The real data signed by another key | reverts `NotSignedByAirnode` |

**Three ways to run it:**

1. **In the app:** open the **Tamper test** tab and click *Run the tamper test*. Every case is a simulated call
   (`eth_call`) to the deployed contract on Base Sepolia, so its own checks decide, no gas is spent and policy 2
   stays active. Under *Try your own response* you can paste or edit any signed response and send it to the contract.
2. **From the command line** (see [`settlement/README.md`](settlement/README.md)):
   `npm run flight -- tamper 2 responses/LH501_2026-10-29.json --other responses/LH901_2026-10-30.json`, or edit a file
   in `settlement/responses/` and run `npm run flight -- settle 2 <file>`.
3. **Foundry:** `cd settlement && forge test --match-test Tamper -vv` runs the four cases against a local contract, with
   made-up responses and with the real signed LH 501 and LH 901 responses. 14/14 tests pass.

## Run it

Needs Node.js 22.17+, and Foundry for the contract.

```sh
cd agent-server && npm install && npm run server       # http://localhost:4021
cd frontend && npm install && npm run dev -- -p 3100   # http://localhost:3100
cd agent-server && npm run keeper                      # pays out policies that FlightDelayCover settles
cd settlement && npm install && forge test             # contract tests
```

Environment (all git-ignored):

- `.env` in the repo root: `OPENAI_API_KEY`.
- `agent-server/.env`: `FACILITATOR_URL`, `BLOCKFROST_PROJECT_ID`, `POOL_MNEMONIC` / `POOL_ADDRESS`, the traveller's
  wallet (`ANA_MNEMONIC` / `ANA_ADDRESS`), `COVER_ADDRESS`, `COVER_FROM_BLOCK`, `BASE_PRIVATE_KEY`.
- `settlement/.env`: see [`settlement/README.md`](settlement/README.md).

Test funds: [`docs/setup-and-support.md`](docs/setup-and-support.md). `/scripted` is an earlier, fully scripted version
of the app that runs offline.

## What is real and what is scripted

| Real | Scripted |
|---|---|
| Chat with the agent | Four research sources: aircraft rotation, route weather, NOTAMs, strike signals (no AirnodeHub listing yet) |
| x402 research fee, premium and payout on Cardano preprod | The travel-blog source, which the agent always rejects as unsigned |
| x402 data purchases from AirnodeHub on Base Sepolia | |
| Policy registration and settlement in `FlightDelayCover` | |
| The LH 501 delay and its signed response (a replay of a real flight) | |
| Tamper test against the deployed contract | |

The cover pool is a testnet wallet we control. The jurisdiction check and the price are deterministic code, not the
language model.

## Code

| Folder | What |
|---|---|
| [`settlement/`](settlement/) | `FlightDelayCover` (Solidity, Foundry), Airnode v2 signature verification, tamper tests, flight CLI |
| [`agent-server/`](agent-server/) | Express server: chat, x402-paid research, AirnodeHub calls, policy purchase, tamper-test API, payout keeper |
| [`frontend/`](frontend/) | Next.js app: chat, research wheel, My trips, Transactions, Tamper test, wallets |

## What comes next

- List the agent on Masumi/Sokosumi so other agents can hire it per job.
- A Cardano validator that verifies the Airnode signature, removing the trusted keeper.
- A liquidity pool with exposure caps and reinsurance for correlated delays.
- Historical delay data for pricing, once it is available as signed data.
