# EigenCover Agent: flight cover booked by an agent, paid out by signed data

TUM Blockchain & AI Hackathon, Munich, 30–31 October 2026. Submission deadline: Sat 31 Oct, 15:00.

A traveller hires the EigenCover agent, gets a price for flight-disruption cover, buys a policy,
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
circumstance". Even when EU261 does pay, it takes months. EigenCover pays her within minutes, and nobody files a claim.

| Time | Scene (frontend) | What is real |
|---|---|---|
| 0:00–0:15 | **Problem**: "Your flight is 3 hours late. The airline says: strike, extraordinary circumstances, no compensation." | slide |
| 0:15–0:35 | **Quote request**: Ana enters MUC → CMB, flight number and date. The agent asks two yes/no questions (checked bag? connecting flight?) | scripted dialogue |
| 0:35–1:00 | **Research wheel**: the agent pays sources via x402 (flight history, airport delay board, CMB weather, strike and news feed). Each node shows its price and whether it is signed. Two are rejected with a reason: "CustomWeather: US/Canada only, no data for CMB" and "unsigned source" | pricing hardcoded; x402 calls real if time allows |
| 1:00–1:15 | **Policy**: "€9 premium → €250 if you arrive ≥3h late, for any reason, including strikes and weather." Ana pays and the policy appears with its Cardano preprod transaction | **real** transaction |
| 1:15–1:35 | **Flight tracker**: plane on the MUC → CMB arc, lands +3h12m. A keeper fetches the signed AeroDataBox status, and the contract checks tick one by one: signer ✓ · this flight and date ✓ · fresh ✓ · not paid before ✓ | **real** signed response from a past flight, real contract check |
| 1:35–1:45 | **Payout**: Ana's wallet goes from 0 to €250, with the payout transaction. The pool widget shows €9 in and €250 out | **real** transaction |
| 1:45–2:05 | **Tamper test**: four forged responses are submitted and the contract rejects each one | **real**, API3 qualification |
| 2:05–2:20 | **Close**: the pricing engine sets premiums above expected payouts, so the pool earns across many policies | slide |

### Liquidity pool

Show one small "EigenCover pool" balance that changes (premium in, payout out). It answers "where does the
€250 come from?" in two seconds. Leave LP tokens, yields and the capital structure for the Q&A.

### Frontend

A single Next.js page with a scene stepper (arrow key or "Next" button). Booth judging is live, so the
presenter controls the pace. EigenCover brand: background `#0b0f19`, accent `#38bdf8`, Outfit + IBM Plex Mono
for hashes. Transaction hashes link to the preprod explorers. Every network result has a cached fallback, so
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

**EigenCover pricing engine:** in the real product, it computes the premium. In this demo the price is
hardcoded.

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

## Build order

1. API3 settlement contract and tamper tests: adapt `NodaryPriceConsumer` from the starter to flight status.
2. Masumi Coworker: one paid job on preprod, transaction hash saved.
3. Policy purchase and payout transactions on Cardano preprod.
4. Scripted demo flow tying the steps together.
5. Record the video, write the Devfolio description, make the repo public. Freeze by 13:30 on Saturday.

## Open questions

- Hackathon rule on prior code: can we reuse EigenCover's pricing engine? Ask the organisers.
- Masumi: can a Sokosumi task handle the back-and-forth of step 0:55, or should the dialogue live in our own UI?
- API3: which AeroDataBox field gives scheduled vs actual arrival time, and how do we read it through their projections?
- Which EVM testnet should the settlement contract use? Base Sepolia is where the starter pays for x402 calls.

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
