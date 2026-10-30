# Frontend brief: flight cover agent demo

Paste everything below the line into a coding or design agent (Claude Code, v0, Lovable).
Fill in `{{PRODUCT_NAME}}` first.

---

Build a single-page demo web app for **{{PRODUCT_NAME}}**, a hackathon project. An AI agent sells parametric
flight-delay cover: the traveller chats with the agent, the agent pays for data sources, checks regulations,
prices a policy and sells it. After the flight lands late, a smart contract pays the traveller automatically
from signed flight data. Nobody files a claim.

The demo is presented live at a judging booth and recorded as a video of at most 2.5 minutes. **Everything is
scripted.** There is no real LLM or backend in the first version. The presenter advances the demo with the
right arrow key or a "Next" button. Each step plays a short animation.

## Tech

- Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion for animation.
- All demo content in one typed file, `demo/script.ts`: chat messages, agent steps, sources, prices,
  transaction hashes. Changing the story must never require touching components.
- Transaction hashes and explorer URLs live in `demo/config.ts`. Leave placeholders. We fill them with real
  Cardano preprod and EVM testnet transactions before the demo.
- No network calls in the scripted mode. The page must run offline.
- Keyboard: → next step, ← previous step, R reset. A small step counter in a corner, hidden in "recording mode" (key H).
- Desktop only, designed for 1440×900 and a projector. No mobile layout needed.

## Visual direction

Choose an original visual identity. It must not look like a generic crypto dashboard or a ChatGPT clone.
Calm, trustworthy, a bit like a flight-information board: confident typography, one accent colour, a
monospace font for hashes, prices and data. Dark or light, whichever reads better on a projector. High contrast,
large text: judges stand a metre or two from the screen.

## Layout

Two columns, always visible:

- **Left (about 55%): the chat.** Looks like a modern AI chat: message bubbles, typing indicator, the input box
  at the bottom (it fills itself with scripted text, letter by letter, when the presenter presses Next).
  The agent can reply with rich cards inside the chat: quick-reply buttons (yes/no), a policy card,
  a payment card, a payout card.
- **Right (about 45%): "Agent reasoning".** A live log of what the agent does and decides, step by step.
  The judges must be able to see why the agent reaches its price. Every entry has an icon, a short title,
  a one-line detail, a status (running → done / rejected) and, where money is spent, a price chip.

At the top of the right panel, a compact **source wheel**: the agent in the centre, data sources on a ring
around it. When the agent pays a source, a small coin travels from the centre to the node along a line, and the
node lights up with its price and a "signed ✓" badge. Rejected sources fade out with a short reason. Below the
wheel, the step log.

## The script

Traveller: Ana. Flight: Munich (MUC) → Colombo (CMB), flight `XX 123`, 12 Nov, direct, about 7,800 km.

### Act 1: quote

1. Chat, Ana: "I'm flying Munich to Colombo on 12 Nov, XX 123. Can I get cover if it's badly delayed?"
2. Agent: "Sure. Researching this flight costs €0.50, paid per request. Okay?" A payment card with an
   "x402 · €0.50" chip and a "Pay" button. Ana pays. Right panel: `Research fee received · x402 · €0.50 ✓`.
3. Agent asks two quick-reply questions: "Checked bag?" (Yes) and "Is this a connecting trip?" (No).
4. Right panel runs through the research. The wheel and log animate one source at a time, about 1 second each:

| Step | Source | Price | Result shown in the log |
|---|---|---|---|
| Flight history | AeroDataBox | €0.04 | "XX 123 last 90 days: 4.1% arrived ≥3h late" ✓ |
| Airport delay board | AeroDataBox | €0.02 | "MUC departures today: average delay 22 min" ✓ |
| Aircraft rotation | OpenSky Network | €0.02 | "Inbound aircraft usually on time" ✓ |
| Weather on the route | WeatherAPI.com | €0.03 | "CMB: monsoon showers likely on 12 Nov" ✓ |
| Weather (second source) | CustomWeather | — | **rejected**: "US/Canada coverage only, no data for CMB" |
| Strike and news signals | news feed | €0.05 | "German ATC union in wage talks, no strike date announced" ✓ |
| Travel blog scraper | unknown | — | **rejected**: "unsigned source, cannot be verified" |

5. **Regulation check** (no payment; a different icon, "rules" not "data"):
   - "EU261 applies: departure from the EU, over 3,500 km → the airline may owe up to €600 for 3h+ delays."
   - "Gap found: airlines can refuse for 'extraordinary circumstances' (strikes, weather, air traffic control)."
   - "Design: cover pays for **any** cause, so it complements EU261 instead of duplicating it."
   - "Exclusion: strikes already announced at purchase time are not covered." (shows the agent is honest
     about adverse selection)
6. **Pricing**, shown as a small calculation in the right panel, each line appearing in turn:
   ```
   base probability (route history)      4.1%
   + weather signal                      +0.8%
   + strike-talks signal                 +1.3%
   = P(arrival ≥ 3h late)                6.2%
   expected payout   6.2% × €250       = €15.50
   margin                                +€3.50
   premium                               €19.00   ✓ premium > expected payout
   ```
   The last line highlights in the accent colour: the business stays profitable across many policies.
7. Chat: the agent shows a **policy card**: "€19 → €250 if you arrive 3h+ late, for any reason. Paid
   automatically. No claim to file." Buttons: "Buy" and "Customise". Ana clicks "Customise" once.
   The agent asks: "Would you rather have a lower threshold?" Options: "2h → €150 for €21" or
   "keep 3h → €250 for €19". Ana keeps 3h and buys.
8. **Payment card** in the chat: "Policy #0042 · paid €19 · Cardano preprod" with a shortened transaction
   hash that links to the explorer. Right panel: `Policy registered on-chain ✓`. A small "Cover pool"
   widget shows its balance going up by €19.

### Act 2: the flight

9. The right panel switches to **Flight**: a simple map line from MUC to CMB, a plane moving along it,
   a clock running fast. Status changes: "Departed 2h 40m late (ATC strike)" → "Landed: 3h 12m late".
10. Chat, system message: "Your flight landed 3h 12m late."
11. Right panel, **Settlement**: a keeper fetches the signed flight status from AirnodeHub (AeroDataBox).
    The contract's checks tick one by one:
    - Signature from the expected data provider ✓
    - Response is for XX 123 on 12 Nov ✓
    - Response is fresh ✓
    - Delay computed by the contract: 192 min ≥ 180 min ✓
    - Policy not paid before ✓
12. Chat, **payout card**: "€250 sent to your wallet" with the payout transaction hash. Ana's wallet balance
    counts up from €0 to €250. The cover pool widget shows €250 going out.
    Agent: "Nobody filed a claim. The flight data was the claim."

### Act 3: tamper test

13. Right panel, **Tamper test**: four forged responses are submitted to the contract, one after another.
    Each one flashes red with its reason:
    - "Edited value: delay changed from 12 to 192 min → signature invalid ✗"
    - "Stale response: older than allowed → rejected ✗"
    - "Different flight: response is for XX 456 → rejected ✗"
    - "Wrong signer: not the expected data provider → rejected ✗"
    Closing line in the panel: "Only real, signed, fresh data for this exact policy can trigger a payout."

### Close

14. A full-screen end slide: product name, a one-line description, the three sponsor logos
    (Cardano, API3, TUM Blockchain Club), team names and the repo URL.

## Details that matter

- Agent messages stream in word by word. Log entries appear with a short "running" spinner before "done".
- Prices are always shown with their payment rail: "x402 · €0.04".
- Rejected sources stay visible but faded, with the reason. Rejections are part of the story, not errors.
- Hashes are monospace and shortened (`a3f9…c21e`), with a copy button and an explorer link.
- Never show the agent deciding the payout. The agent prices and sells. The contract and the signed data
  decide the payout. The UI copy must keep this distinction.
- Leave a 1-second pause between automatic steps so a presenter can talk over them.

## Deliverable

A runnable Next.js project (`npm install && npm run dev`), with the scripted demo working end to end,
and a README explaining how to edit `demo/script.ts` and `demo/config.ts`.
