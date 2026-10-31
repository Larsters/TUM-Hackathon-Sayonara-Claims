# Slide brief: Sayonara Claims (for Claude Design)

Paste this whole file into Claude Design. It holds the brand, the art direction, every slide's exact text, and the
speaker notes. Keep the wording; change the layout as much as you like.

## Context

- **Event:** TUM Blockchain & AI Hackathon, Munich, 31 October 2026. Booth pitches with a **2:30 hard stop**, then 2 minutes
  of judge questions. A live demo of about 60 seconds sits in the middle of the deck, so the slides get about 90 seconds.
- **Who watches:** one judge at a partner booth (Cardano or API3), standing, on a laptop screen at about 1 m distance.
  They read fast and they've seen 30 decks today.
- **Format:** 16:9, 1920 × 1080. Every slide must be readable in **3 seconds**: one idea, very large type, at most about
  20 words of body text. Detail goes into the speaker notes.

## The product, in one paragraph

Sayonara Claims is flight cover sold by an AI agent. You tell the agent your flight; it buys the data it needs, checks
your passenger rights, and prices a cover: **€19, and you get €250 if you arrive 3 hours late or more, for any cause.**
When the flight lands, a smart contract checks signed flight data from API3 (AeroDataBox) and the payout reaches your
wallet in minutes. Nobody files a claim. Payments run on Cardano (x402); the signed-data check runs on Base Sepolia.
The traveller in the story is **Vasiliy**.

## Brand

- **Name:** Sayonara Claims, with さようなら (Japanese "goodbye") as a small mono subtitle. The idea: say goodbye to
  claims.
- **Tagline (from the app):** "Late flight? Say *sayonara* to claims." The word *sayonara* sits on an orange block.
- **Colours** (from the app):
  - Ink `#101828`, secondary ink `#344054`, muted `#4A5565`
  - Ground (page background) `#E7EAEE`, soft `#F5F6F8`, white `#FFFFFF`, hairlines `#EAECF0` / `#D5DAE1`
  - **Accent orange `#FF5A1F`.** Use it sparingly, as the one loud thing per slide.
  - Accepted / paid green: `#D1FADF` background, `#05603A` text
  - Rejected red: `#FEE4E2` background, `#B42318` text
  - Rule blue: `#EAF0FF` background, `#1D4ED8` text
- **Fonts:** Instrument Sans (headlines 700, body 400–500) and DM Mono (numbers, hashes, labels, timestamps).
- **Recurring motifs:** the boarding-pass stub (fields FLIGHT / ROUTE / DATE / PASSENGER with dashed dividers), uppercase
  mono eyebrows with wide letter spacing, the departure-board look for times, and ✓ / ✕ badges.

## Art direction: avant-garde, but legible

- **Editorial, not corporate.** Think Swiss poster or airport signage meets a Japanese print: oversized type that is
  cropped by the slide edge, strong asymmetry, lots of empty space, a strict grid that one element breaks on purpose.
- **One giant number per slide** where it fits (`3h`, `€250`, `7h 08m`, `€0.05`, `1 / 4`), set huge in Instrument Sans
  700, the rest small.
- **Departure-board energy:** times and flight codes in DM Mono, maybe split-flap styling for the key number.
- **Japanese accents:** さようなら as a vertical strip on the edge of the title and closing slides; a hanko-style red
  circular stamp for "PAID" or "REJECTED".
- **No stock photos, no 3D blockchain cubes, no gradients-for-the-sake-of-it, no clip-art planes.** A single thin flight
  arc (MUC → somewhere) as a line drawing is fine.
- Light theme on the ground colour `#E7EAEE`, so it matches the app the judges will see in the demo. One dark slide
  (ink background) is allowed as the "risk" slide, to change the tempo.

## Slides

### 1. Problem

- Eyebrow: `LH 574 · MUC → CPT · ARRIVAL +3h 12m`
- Headline: **Your flight lands 3 hours late. Now file a claim.**
- Three small facts in mono, in a row:
  `EU261: €250–600, if you claim` · `"Extraordinary circumstances": strikes, weather, ATC` · `Weeks to months`
- Speaker notes: "Vasiliy's flight lands three hours late. EU261 might pay, but only if he files a claim, the airline can
  refuse over strikes or weather, and it takes months."

### 2. The offer

- Giant: **€19 → €250**
- Under it: **If you land 3h+ late. Any cause. Paid in minutes. No claim.**
- Small: `On top of EU261, not instead of it.`
- Visual: a stamp reading `PAID` over a boarding-pass stub.
- Speaker notes: "We sell cover that pays by itself. Here it is working." Then switch to the live demo.

### 3. (Demo cue)

- A near-empty slide: `LIVE DEMO` in mono, plus the app URL `localhost:3100`. Only shown if the switch to the app needs a
  beat.

### 4a. Proof: Cardano booth

- Eyebrow: `CARDANO PREPROD · x402`
- Headline: **Every step was a real payment.**
- Three rows, mono, each with a short hash and a ✓:
  - `Research fee · x402 · 2 tADA` `cba8f2bb…45bcb43`
  - `Premium · 3.8 tADA` `a709afc4…0f03da3`
  - `Payout · 50 tADA` `3a00133e…d6ceb92`
- Footer: `@x402/cardano · Blockfrost · Evolution SDK`
- Speaker notes: "Every step Vasiliy took was a real payment on Cardano preprod. Any other agent can call the same paid
  endpoint and buy cover for its user."

### 4b. Proof: API3 booth

- Eyebrow: `API3 AIRNODEHUB · AERODATABOX · BASE SEPOLIA`
- Headline: **No valid signature, no payout.**
- Left: the real event. `LH 501 · GIG → FRA · landed 7h 08m late`, with `PolicySettled: PaidOut` in green.
- Right: the tamper test as five rows of ✓ / ✕:
  - ✓ `Real response, on time` accepted
  - ✕ `One value edited` rejected
  - ✕ `Too old (over 2 h)` rejected
  - ✕ `Another flight's response` rejected
  - ✕ `Signed by another key` rejected
- Footer: `FlightDelayCover 0xade3…2e27`
- Speaker notes: "The contract only pays if the flight data is signed by AeroDataBox's key, is about this exact flight,
  and is fresh. It computes the delay itself, so neither we nor the AI decide payouts. If anyone could fake the data,
  they could drain the pool. Here are four forgeries, all rejected."

### 5. Why others failed, why we won't

- Headline: **The tech worked. Distribution didn't.**
- Three compact columns:
  - `AXA fizzy · 2017–2019`: automatic payouts on Ethereum, about 11,000 policies, closed over low demand and weak
    distribution.
  - `Etherisc FlightDelay`: automatic payouts, minimal adoption.
  - `Traditional travel cover`: claims handling eats the premium; payouts take weeks.
- Then a bold bar with the accent colour: **Us: sold by an agent at the moment of booking · signed data instead of a
  claims department.**
- Speaker notes: "Automatic flight payouts were built before, by AXA and Etherisc. They died on distribution, not on
  technology. Our agent sells cover inside the booking, other agents can buy it over x402, and the oracle replaces the
  claims department: one signed response, about five cents, settles every policy on a flight."

### 6. Risks we know (dark slide)

- Headline: **One fault. A whole country late.**
- The real event, in mono: `16 OCT 2026 · ENAV data-network fault · Italian airspace at 50% capacity · 192 cancellations ·
  ~31% of departures on time by 10:00 GMT`
- Then three rows "risk → answer":
  - `Correlated events` → `Caps per airspace and day · aggregate limit per event · reinsurance`
  - `Buying after the news` → `The agent sees the strike or storm and stops selling`
  - `Trusted keeper` → `A Cardano validator that checks the signature itself`
- Speaker notes: "One fault can delay a whole country. Every policy counts against a cap per airspace and day, so our
  worst day is capped by design, and reinsurance covers the tail."

### 7. Close

- Giant: **Sayonara, claims.** (with さようなら vertical)
- Small, next steps: `List on Masumi for agent-to-agent hiring · Licensed carrier for the risk · Cancellation cover`
- Team names and the repo URL: `github.com/Larsters/TUM-Hackathon-Sayonara-Claims`

## Backup slides (only opened during questions)

- **B1. Oracle vs claims department:** "A claims process costs tens of euros per claim. One signed response settles
  every policy on a flight: €0.05 on the testnet, against a €19 premium."
- **B2. Pricing:** `P(arrival 3h+ late) × €250 + margin` → `6.2% × €250 = €15.50 < €19`. "Pricing isn't our edge. We say
  so."
- **B3. Architecture:** Traveller → agent (x402 on Cardano) → AirnodeHub data (x402 on Base) → quote → premium to the
  pool → policy in FlightDelayCover → signed status → settle → payout on Cardano.
- **B4. Who carries the risk:** "We are the agent and the automation. A licensed insurer holds the risk and the capital
  and pays us commission. Later, an on-chain LP pool can supply capacity."
- **B5. Aegis vs us:** Aegis (Cardano mainnet) covers crypto price moves with an on-chain pool. We take parametric cover
  to a real-world travel risk, sold by an agent.

## Order per booth

- Cardano: 1 → 2 → demo → 4a → 5 → 6 → 7
- API3: 1 → 2 → demo → 4b → 5 → 6 → 7
