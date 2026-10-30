# EigenCover Agent: flight cover booked by an agent, paid out by signed data

TUM Blockchain & AI Hackathon, Munich, 30–31 October 2026. Submission deadline: Sat 31 Oct, 15:00.

A traveller hires the EigenCover agent, gets a price for flight-disruption cover, buys a policy,
and is paid automatically when the flight is cancelled. Nobody files a claim and no paperwork is involved.
The payout trigger is signed flight data, not the AI and not a person.

This is a **demo build**. The user journey is scripted and the scenario is fixed: one flight, one cancellation.
The parts the judges check are real: the Cardano payments, the API3 signature checks and the tamper test.

## Tracks we enter

| Track | Prize | What qualifies us |
|---|---|---|
| Cardano: Agentic Commerce | €6,000 | A paid job through Masumi escrow on Sokosumi (Cardano preprod), with the transaction hash saved |
| API3: Any API in your contract | €2,000 | A contract that settles the policy from a signed AirnodeHub flight-status response, and passes the tamper test |
| TUM Blockchain Club | audit credits | Judged automatically for every project |

## Demo (about 2 minutes)

| Time | What the viewer sees | What is actually running |
|---|---|---|
| 0:00–0:15 | The problem: a traveller's flight is cancelled, the claim takes weeks, and half the time nobody pays | slide |
| 0:15–0:35 | The traveller hires the EigenCover agent on Sokosumi: "MUC → JFK, flight XX123, 12 Nov" | **real**: Masumi job, payment locked in escrow on Cardano preprod |
| 0:35–0:55 | The agent buys data for its research (weather, airport delays, events) and shows what it paid for | scripted output, paid x402 calls optional |
| 0:55–1:15 | The agent offers a policy ("€X premium, €200 payout if the flight is cancelled"). The traveller asks for a change and the agent adjusts the cover | **hardcoded** price and dialogue |
| 1:15–1:30 | The traveller buys the policy, and the purchase transaction is shown on the Cardano preprod explorer | **real** transaction |
| 1:30–1:50 | "The flight is cancelled." A keeper submits the signed flight status, the contract verifies it, and the payout appears in the traveller's wallet | **real** signed response and contract check (see the API3 section) |
| 1:50–2:10 | Tamper test: an edited response, a stale one, the wrong flight and the wrong signer are all rejected | **real**, required by API3 |
| 2:10–2:30 | Roadmap and business case: travel agents embed the cover, and EigenCover's pricing engine prices it | slide |

API3 asks for the tamper test in the video and Cardano asks for the business case, so the video can run up
to the 2.5-minute limit.

### Hardcoded vs real

- **Hardcoded:** the route, the price, the agent's dialogue, the research summary and the "flight cancelled" moment.
- **Real:** the Masumi escrow payment, the policy purchase transaction, the payout transaction, the signed
  AirnodeHub response, the contract checks and the tamper test.
- **The cancellation should come from a real flight.** Find a flight that was actually cancelled
  recently and fetch its signed AeroDataBox status. That response is real data with a real signature,
  so the API3 part stays honest even though the journey is scripted. The demo presents it as "the
  flight is cancelled". Say in the pitch that the cancellation is a replay of a real one.

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
**signed** by the provider's Airnode key. When the flight is cancelled:

1. A keeper (a small script or agent) asks AirnodeHub for the status of flight XX123 on that date.
2. It receives the data ("status: Cancelled") plus a signature, a request hash and a timestamp.
3. It submits all of this to our settlement contract.
4. The contract checks the signature against the expected Airnode signer, checks that the request
   hash matches *this* policy's flight and date, checks the timestamp for freshness, and confirms the
   policy has not been settled already.
5. Only if every check passes does the contract mark the policy as paid and release the payout.

Without API3, someone has to say "trust me, the flight was cancelled", which brings back exactly the
claims process we are removing. With API3 the payout depends on data that cannot be edited without
breaking the signature. The tamper test demonstrates this.

The signature proves that AeroDataBox *said* the flight was cancelled. It does not prove the
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
- API3: which AeroDataBox field gives cancellation status, and how do we read it through their projections?
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
