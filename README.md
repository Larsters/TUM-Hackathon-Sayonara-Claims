# Sayonara Claims: flight cover booked by an agent, paid out by signed data

TUM Blockchain & AI Hackathon, Munich, 30–31 October 2026. Submission deadline: Sat 31 Oct, 15:00.

A traveller hires our agent, gets a price for flight-disruption cover, buys a policy,
and is paid automatically when the flight arrives 3+ hours late. Nobody files a claim and no paperwork is involved.
The payout trigger is signed flight data, not the AI and not a person.

This is a **demo build**. The user journey is scripted and the scenario is fixed: one flight (Munich → Colombo), one 3h+ delay.
The parts the judges check are real: the Cardano payments, the API3 signature checks and the tamper test.

## Tracks we enter

| Track | Prize | What qualifies us |
|---|---|---|
| Cardano: Agentic Commerce | €6,000 | A paid job through Masumi escrow on Sokosumi (Cardano preprod), with the transaction hash saved |
| API3: Any API in your contract | €2,000 | A contract that settles the policy from a signed AirnodeHub flight-status response, and passes the tamper test |
| TUM Blockchain Club | audit credits | Judged automatically for every project |

## Demo (about 2 minutes)

The story: Ana flies Munich → Colombo. Her flight arrives 3h+ late because of an air-traffic-control strike.
Under EU261 the airline can refuse to compensate her, because a strike counts as an "extraordinary
circumstance". Even when EU261 does pay, it takes months. Our cover pays her within minutes, and nobody files a claim.

| Time | Scene (frontend) | What is real |
|---|---|---|
| 0:00–0:15 | **Problem**: "Your flight is 3 hours late. The airline says: strike, extraordinary circumstances, no compensation." | slide |
| 0:15–0:35 | **Quote request**: Ana enters MUC → CMB, flight number and date. The agent asks two yes/no questions (checked bag? connecting flight?) | scripted dialogue |
| 0:35–1:00 | **Research wheel**: the agent pays sources via x402 (flight history, airport delay board, CMB weather, strike and news feed). Each node shows its price and whether it is signed. Two are rejected with a reason: "CustomWeather: US/Canada only, no data for CMB" and "unsigned source" | pricing hardcoded; x402 calls real if time allows |
| 1:00–1:15 | **Policy**: "€19 premium → €250 if you arrive ≥3h late, for any reason, including strikes and weather." Ana pays and the policy appears with its Cardano preprod transaction | **real** transaction |
| 1:15–1:35 | **Flight tracker**: plane on the MUC → CMB arc, lands +3h12m. A keeper fetches the signed AeroDataBox status, and the contract checks tick one by one: signer ✓ · this flight and date ✓ · fresh ✓ · not paid before ✓ | **real** signed response from a past flight, real contract check |
| 1:35–1:45 | **Payout**: Ana's wallet goes from 0 to €250, with the payout transaction. The pool widget shows €19 in and €250 out | **real** transaction |
| 1:45–2:05 | **Tamper test**: four forged responses are submitted and the contract rejects each one | **real**, API3 qualification |
| 2:05–2:20 | **Close**: the pricing engine sets premiums above expected payouts, so the pool earns across many policies | slide |

### Liquidity pool

Show one small "cover pool" balance that changes (premium in, payout out). It answers "where does the
€250 come from?" in two seconds. Leave LP tokens, yields and the capital structure for the Q&A.

### Frontend

A single Next.js page with a scene stepper (arrow key or "Next" button). Booth judging is live, so the
presenter controls the pace. Own visual identity, not EigenCover's. The full build brief is in
[`docs/frontend-prompt.md`](docs/frontend-prompt.md). Transaction hashes link to the preprod explorers. Every network result has a cached fallback, so
the demo runs even if the Wi-Fi or a faucet fails.

Scenes: Problem → Quote chat → Research wheel → Policy card → Flight tracker + contract checks → Wallet payout →
Tamper test → Close.

### Hardcoded vs real

- **Hardcoded:** route, flight, price, dialogue, research verdicts, the animation of the landing.
- **Real:** the Cardano payment and policy transaction, the payout transaction, the signed AirnodeHub
  response, the contract checks, the tamper test.
- **The delay comes from a real flight.** Pick a past flight (ideally MUC → CMB or similar) that really
  arrived 3h+ late, and fetch its signed AeroDataBox status. Say in the pitch that it is a replay of a real flight.

## What each piece does

**Cardano / Masumi / Sokosumi:** the commerce layer. The agent is a "Coworker" listed on Sokosumi,
the marketplace built on the Masumi standard. The traveller's payment for the job waits in escrow on
Cardano and is released when the agent delivers. If the agent fails, the buyer is refunded.

**x402:** pay per request over HTTP. This is how the agent pays for each piece of data it buys
during research.

**API3 / AirnodeHub:** the claim layer. See below.

**Pricing:** a simple, transparent model shown in the agent panel (probability × payout + margin). In this
demo the numbers are hardcoded. This project is separate from EigenCover and does not use its pricing engine.

## The role of API3

API3 answers one question: **did the insured event really happen, and can a contract trust the answer?**

AirnodeHub serves data from providers such as **AeroDataBox** (flight status). Every response is
**signed** by the provider's Airnode key. When the flight lands:

1. A keeper (a small script or agent) asks AirnodeHub for the status of flight XX123 on that date.
2. It receives the data (scheduled and actual arrival times) plus a signature, a request hash and a timestamp.
3. It submits all of this to our settlement contract.
4. The contract checks the signature against the expected Airnode signer, checks that the request
   hash matches *this* policy's flight and date, checks the timestamp for freshness, and confirms the
   policy has not been settled already.
5. The contract computes the delay itself (actual minus scheduled arrival) and compares it with the policy's
   threshold (180 minutes). The trigger rule lives in the contract, not in the agent.
6. Only if every check passes does the contract mark the policy as paid and release the payout.

Without API3, someone has to say "trust me, the flight was late", which brings back exactly the
claims process we are removing. With API3 the payout depends on data that cannot be edited without
breaking the signature. The tamper test demonstrates this.

The signature proves that AeroDataBox *said* the flight was late. It does not prove the
flight really was. That still depends on AeroDataBox being right, and API3 says so themselves.

API3 track rules we have to meet:
- The AirnodeHub data must be essential: removing it breaks settlement. Settlement is the core feature, so it is.
- Deploy a contract that verifies the signer, the intended request and freshness before it acts. A testnet is enough.
- Protect against duplicate execution: each policy can be settled only once.
- Pass the tamper test. These four responses must be rejected: an edited value, a stale response, a
  response to a different request, and a response from the wrong signer.
- Give judges a script so they can submit their own responses.
- In the Devfolio description, say who relies on the data, what goes wrong if it is forged, and
  which data we wanted but could not find on AirnodeHub (for example, historical delay distributions for pricing).

### Gap between the two chains

The API3 starter verifies signatures in a **Solidity** (EVM) contract, while the payout should reach the
traveller's **Cardano** wallet. For the demo, the keeper pays out on Cardano only after the EVM contract
has approved the claim. This bridge is a trusted step, and we say so in the pitch.
Roadmap: an Aiken validator on Cardano that verifies the oracle signature itself (to be confirmed with
the Cardano Foundation that Plutus V3's secp256k1 and keccak builtins make this practical).

## What we build (and what we don't)

Our own frontend **is** the demo: the traveller-facing app with the chat and the agent-reasoning panel
(brief: [`docs/frontend-prompt.md`](docs/frontend-prompt.md)). Sokosumi is a marketplace where people or agents
hire an agent for a task and get a text result back. It cannot show our reasoning panel, the policy, the flight or
the payout, so it cannot replace our UI. Cardano only requires that real payments go through Cardano preprod,
through x402 **or** Masumi, and x402 is the quicker route.

| # | Piece | Real or scripted | Needed for |
|---|---|---|---|
| 1 | Frontend: chat + agent reasoning panel, scripted, reads tx hashes from config | scripted UI, real links | the demo |
| 2 | **Settlement contract** (Solidity, Foundry, Base Sepolia): stores the policy (flight, date, threshold), verifies the signed AeroDataBox response (signer, request hash, freshness), computes the delay, settles once, emits `Settled` | **real** | API3 (pass/fail) |
| 3 | **Tamper test**: Foundry tests plus a script judges can run with their own responses | **real** | API3 (pass/fail) |
| 4 | **Signed response from a real delayed flight**, fetched once and cached as a file | **real** | API3 |
| 5 | **Research fee via x402 on Cardano preprod** (x402-next template, Blockfrost key): the traveller pays €0.50 before the agent researches | **real** | Cardano (qualifying payment) |
| 6 | **Policy purchase**: the traveller's wallet sends the premium to the cover pool address on preprod | **real** | Cardano |
| 7 | **Payout keeper**: a script watches the `Settled` event and sends the payout from the pool to the traveller on preprod | **real**, trusted step (said in the pitch) | Cardano + API3 story |
| 8 | Optional: the same agent listed as a Sokosumi Coworker, one paid job through Masumi escrow | real | Cardano bonus ("agents hiring agents", escrow) |

The pool is a demo wallet we control (custodial). Say so in the pitch; the roadmap is an on-chain validator.

## Code

| Folder | What | Status |
|---|---|---|
| [`settlement/`](settlement/) | `FlightDelayCover` contract (Base Sepolia), tamper tests, flight CLI (fetch signed AeroDataBox status, deploy, create policy, settle, tamper) | Deployed; real policy settled from signed LH 501 data (428 min late); 14/14 tests pass |
| [`agent-server/`](agent-server/) | x402-paid research on Cardano preprod, policy purchase, payout keeper | Research fee (x402), premium and keeper payout confirmed on Cardano preprod |
| [`frontend/`](frontend/) | Scripted demo UI (Next.js), brief in [`docs/frontend-prompt.md`](docs/frontend-prompt.md) | builds; shows the four real transactions (research fee, policy, settlement, payout) |

## Build order

1. **Now:** ask Matej (API3 booth) whether `flightStatusOnDate` returns already-landed flights with actual arrival
   times. Then fetch and save a signed response for a real flight that arrived 3h+ late.
2. Settlement contract + tamper tests (adapt the starter's `NodaryPriceConsumer`). Deploy to Base Sepolia.
3. x402 research-fee payment on Cardano preprod; save the transaction hash.
4. Policy purchase and payout keeper on preprod; save both hashes.
5. Put all hashes into the frontend config; rehearse the scripted run.
6. Optional: Sokosumi Coworker.
7. Freeze by 13:30 Saturday. Record the video, write the Devfolio description, check the repo is public.

## Open questions

- API3: does `flightStatusOnDate` return landed flights with actual arrival times, and which fields hold
  scheduled and actual arrival (read through their projections)?
- Masumi: does a paid job through our own Masumi node, outside Sokosumi, count? (Asked by another team, no answer yet.)

Test funds, accounts and who to ask: [`docs/setup-and-support.md`](docs/setup-and-support.md).

## Links

- Track rules: https://hackathon.tum-blockchain.com/prizes
- Masumi agent guide: https://www.masumi.network/tum-hackathon/agent-guide.md
- Masumi starter: https://github.com/masumi-network/tum-hackathon-quickstart
- Cardano x402: https://developers.cardano.org/x402/
- Masumi dispenser (test ADA and tUSDM): https://dispenser.masumi.network/
- API3 starter: https://github.com/api3dao/airnodehub-hackathon-starter
- API3 hackathon docs: https://api3dao.github.io/airnodehub-hackathon/docs/
- Recommended integrations (AeroDataBox, CustomWeather): https://api3dao.github.io/airnodehub-hackathon/docs/integrations
- AirnodeHub MCP: https://airnodehub.api3.org/mcp
